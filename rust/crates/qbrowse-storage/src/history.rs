use crate::history_extractors::{extract_rich_history_meta, is_junk_history_url};
use anyhow::{Context, Result};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use url::Url;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub id: i64,
    pub url: String,
    pub title: String,
    pub display_title: String,
    pub domain: String,
    pub space_id: String,
    pub search_query: String,
    pub visit_count: i64,
    pub first_visit_ms: i64,
    pub last_visit_ms: i64,
    pub score: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyHistoryItem {
    url: Option<String>,
    title: Option<String>,
    space_id: Option<String>,
    visit_count: Option<i64>,
    last_visit: Option<i64>,
    last_visit_ms: Option<i64>,
    first_visit: Option<i64>,
    first_visit_ms: Option<i64>,
}

pub fn init_history_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dedupe_key TEXT NOT NULL,
            space_id TEXT NOT NULL DEFAULT 'default',
            url TEXT NOT NULL,
            title TEXT NOT NULL,
            display_title TEXT NOT NULL,
            domain TEXT NOT NULL,
            search_query TEXT NOT NULL DEFAULT '',
            visit_count INTEGER NOT NULL DEFAULT 1,
            first_visit_ms INTEGER NOT NULL,
            last_visit_ms INTEGER NOT NULL,
            UNIQUE(dedupe_key, space_id)
        );

        CREATE INDEX IF NOT EXISTS idx_history_space_last ON history(space_id, last_visit_ms DESC);
        CREATE INDEX IF NOT EXISTS idx_history_last ON history(last_visit_ms DESC);

        CREATE VIRTUAL TABLE IF NOT EXISTS history_fts USING fts5(
            title,
            url,
            domain,
            search_query,
            content='history',
            content_rowid='id',
            tokenize='unicode61'
        );

        CREATE TRIGGER IF NOT EXISTS history_ai AFTER INSERT ON history BEGIN
            INSERT INTO history_fts(rowid, title, url, domain, search_query)
            VALUES (new.id, new.display_title, new.url, new.domain, new.search_query);
        END;

        CREATE TRIGGER IF NOT EXISTS history_ad AFTER DELETE ON history BEGIN
            INSERT INTO history_fts(history_fts, rowid, title, url, domain, search_query)
            VALUES ('delete', old.id, old.display_title, old.url, old.domain, old.search_query);
        END;

        CREATE TRIGGER IF NOT EXISTS history_au AFTER UPDATE ON history BEGIN
            INSERT INTO history_fts(history_fts, rowid, title, url, domain, search_query)
            VALUES ('delete', old.id, old.display_title, old.url, old.domain, old.search_query);
            INSERT INTO history_fts(rowid, title, url, domain, search_query)
            VALUES (new.id, new.display_title, new.url, new.domain, new.search_query);
        END;
        "#,
    )
    .context("Failed to initialize history schema")?;
    Ok(())
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub fn should_reject_history_write(url: &str, space_id: &str) -> bool {
    let sp = space_id.trim().to_lowercase();
    if sp == "ghost" || sp == "tor" {
        return true;
    }
    if is_junk_history_url(url) {
        return true;
    }
    if let Ok(u) = Url::parse(url.trim()) {
        if let Some(host) = u.host_str() {
            let lower_host = host.to_lowercase();
            if lower_host == "onion" || lower_host.ends_with(".onion") {
                return true;
            }
        }
    }
    false
}

fn compute_frecency(visit_count: i64, last_visit_ms: i64, ref_now_ms: i64) -> f64 {
    let age_ms = (ref_now_ms - last_visit_ms).max(0) as f64;
    let age_days = age_ms / 86_400_000.0;
    let recency_decay = (-age_days / 30.0).exp();
    (visit_count.max(1) as f64) * recency_decay
}

fn build_fts_query(raw: &str) -> Option<String> {
    let tokens: Vec<String> = raw
        .split_whitespace()
        .filter_map(|tok| {
            let cleaned: String = tok
                .chars()
                .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
                .collect();
            if cleaned.is_empty() {
                None
            } else {
                Some(format!("\"{cleaned}\"*"))
            }
        })
        .collect();

    if tokens.is_empty() {
        None
    } else {
        Some(tokens.join(" AND "))
    }
}

fn row_to_entry(row: &rusqlite::Row<'_>, ref_now_ms: i64) -> rusqlite::Result<HistoryEntry> {
    let id: i64 = row.get(0)?;
    let url: String = row.get(1)?;
    let title: String = row.get(2)?;
    let display_title: String = row.get(3)?;
    let domain: String = row.get(4)?;
    let space_id: String = row.get(5)?;
    let search_query: String = row.get(6)?;
    let visit_count: i64 = row.get(7)?;
    let first_visit_ms: i64 = row.get(8)?;
    let last_visit_ms: i64 = row.get(9)?;
    let score = compute_frecency(visit_count, last_visit_ms, ref_now_ms);
    Ok(HistoryEntry {
        id,
        url,
        title,
        display_title,
        domain,
        space_id,
        search_query,
        visit_count,
        first_visit_ms,
        last_visit_ms,
        score,
    })
}

pub fn record_visit(
    conn: &Connection,
    url: &str,
    title: &str,
    space_id: &str,
    timestamp_ms: i64,
) -> Result<Option<HistoryEntry>> {
    let sp = if space_id.trim().is_empty() {
        "default"
    } else {
        space_id.trim()
    };
    if should_reject_history_write(url, sp) {
        return Ok(None);
    }

    let ts = if timestamp_ms > 0 {
        timestamp_ms
    } else {
        now_ms()
    };
    let meta = extract_rich_history_meta(url, title);
    if meta.dedupe_key.is_empty() {
        return Ok(None);
    }

    conn.execute(
        r#"
        INSERT INTO history (
            dedupe_key, space_id, url, title, display_title, domain, search_query,
            visit_count, first_visit_ms, last_visit_ms
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?8)
        ON CONFLICT(dedupe_key, space_id) DO UPDATE SET
            url = excluded.url,
            title = CASE WHEN length(trim(excluded.title)) > 0 THEN excluded.title ELSE history.title END,
            display_title = CASE
                WHEN length(trim(excluded.display_title)) > 0 AND excluded.display_title NOT LIKE 'http%'
                THEN excluded.display_title
                ELSE history.display_title
            END,
            domain = excluded.domain,
            search_query = CASE WHEN length(excluded.search_query) > 0 THEN excluded.search_query ELSE history.search_query END,
            visit_count = history.visit_count + 1,
            first_visit_ms = MIN(history.first_visit_ms, excluded.first_visit_ms),
            last_visit_ms = MAX(history.last_visit_ms, excluded.last_visit_ms)
        "#,
        params![
            meta.dedupe_key,
            sp,
            meta.clean_url,
            title.trim(),
            meta.display_title,
            meta.domain,
            meta.search_query,
            ts
        ],
    )
    .context("Failed to upsert history visit")?;

    let ref_now = now_ms().max(ts);
    let entry = conn
        .query_row(
            r#"
            SELECT id, url, title, display_title, domain, space_id, search_query,
                   visit_count, first_visit_ms, last_visit_ms
            FROM history
            WHERE dedupe_key = ?1 AND space_id = ?2
            "#,
            params![meta.dedupe_key, sp],
            |row| row_to_entry(row, ref_now),
        )
        .optional()?;

    Ok(entry)
}

pub fn search_history(
    conn: &Connection,
    query: &str,
    limit: usize,
    space_id_opt: Option<&str>,
) -> Result<Vec<HistoryEntry>> {
    let cap = if limit == 0 { 50 } else { limit } as i64;
    let ref_now = now_ms();
    let fts_query = build_fts_query(query);

    let mut entries = Vec::new();
    match (fts_query, space_id_opt.filter(|s| !s.trim().is_empty())) {
        (Some(fq), Some(sp)) => {
            let mut stmt = conn.prepare(
                r#"
                SELECT h.id, h.url, h.title, h.display_title, h.domain, h.space_id, h.search_query,
                       h.visit_count, h.first_visit_ms, h.last_visit_ms
                FROM history_fts f
                JOIN history h ON h.id = f.rowid
                WHERE history_fts MATCH ?1 AND h.space_id = ?2
                LIMIT ?3
                "#,
            )?;
            let rows = stmt.query_map(params![fq, sp, cap * 4], |r| row_to_entry(r, ref_now))?;
            for item in rows {
                entries.push(item?);
            }
        }
        (Some(fq), None) => {
            let mut stmt = conn.prepare(
                r#"
                SELECT h.id, h.url, h.title, h.display_title, h.domain, h.space_id, h.search_query,
                       h.visit_count, h.first_visit_ms, h.last_visit_ms
                FROM history_fts f
                JOIN history h ON h.id = f.rowid
                WHERE history_fts MATCH ?1
                LIMIT ?2
                "#,
            )?;
            let rows = stmt.query_map(params![fq, cap * 4], |r| row_to_entry(r, ref_now))?;
            for item in rows {
                entries.push(item?);
            }
        }
        (None, Some(sp)) => {
            let mut stmt = conn.prepare(
                r#"
                SELECT id, url, title, display_title, domain, space_id, search_query,
                       visit_count, first_visit_ms, last_visit_ms
                FROM history
                WHERE space_id = ?1
                ORDER BY last_visit_ms DESC
                LIMIT ?2
                "#,
            )?;
            let rows = stmt.query_map(params![sp, cap * 4], |r| row_to_entry(r, ref_now))?;
            for item in rows {
                entries.push(item?);
            }
        }
        (None, None) => {
            let mut stmt = conn.prepare(
                r#"
                SELECT id, url, title, display_title, domain, space_id, search_query,
                       visit_count, first_visit_ms, last_visit_ms
                FROM history
                ORDER BY last_visit_ms DESC
                LIMIT ?1
                "#,
            )?;
            let rows = stmt.query_map(params![cap * 4], |r| row_to_entry(r, ref_now))?;
            for item in rows {
                entries.push(item?);
            }
        }
    }

    entries.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| b.last_visit_ms.cmp(&a.last_visit_ms))
    });
    entries.truncate(cap as usize);
    Ok(entries)
}

pub fn list_history(
    conn: &Connection,
    offset: usize,
    limit: usize,
    space_id_opt: Option<&str>,
    search_opt: Option<&str>,
) -> Result<Vec<HistoryEntry>> {
    let cap = if limit == 0 { 100 } else { limit } as i64;
    let off = offset as i64;
    let ref_now = now_ms();
    let fts_query = search_opt.and_then(build_fts_query);
    let sp_opt = space_id_opt.filter(|s| !s.trim().is_empty());

    let mut entries = Vec::new();
    match (fts_query, sp_opt) {
        (Some(fq), Some(sp)) => {
            let mut stmt = conn.prepare(
                r#"
                SELECT h.id, h.url, h.title, h.display_title, h.domain, h.space_id, h.search_query,
                       h.visit_count, h.first_visit_ms, h.last_visit_ms
                FROM history_fts f
                JOIN history h ON h.id = f.rowid
                WHERE history_fts MATCH ?1 AND h.space_id = ?2
                ORDER BY h.last_visit_ms DESC
                LIMIT ?3 OFFSET ?4
                "#,
            )?;
            let rows = stmt.query_map(params![fq, sp, cap, off], |r| row_to_entry(r, ref_now))?;
            for item in rows {
                entries.push(item?);
            }
        }
        (Some(fq), None) => {
            let mut stmt = conn.prepare(
                r#"
                SELECT h.id, h.url, h.title, h.display_title, h.domain, h.space_id, h.search_query,
                       h.visit_count, h.first_visit_ms, h.last_visit_ms
                FROM history_fts f
                JOIN history h ON h.id = f.rowid
                WHERE history_fts MATCH ?1
                ORDER BY h.last_visit_ms DESC
                LIMIT ?2 OFFSET ?3
                "#,
            )?;
            let rows = stmt.query_map(params![fq, cap, off], |r| row_to_entry(r, ref_now))?;
            for item in rows {
                entries.push(item?);
            }
        }
        (None, Some(sp)) => {
            let mut stmt = conn.prepare(
                r#"
                SELECT id, url, title, display_title, domain, space_id, search_query,
                       visit_count, first_visit_ms, last_visit_ms
                FROM history
                WHERE space_id = ?1
                ORDER BY last_visit_ms DESC
                LIMIT ?2 OFFSET ?3
                "#,
            )?;
            let rows = stmt.query_map(params![sp, cap, off], |r| row_to_entry(r, ref_now))?;
            for item in rows {
                entries.push(item?);
            }
        }
        (None, None) => {
            let mut stmt = conn.prepare(
                r#"
                SELECT id, url, title, display_title, domain, space_id, search_query,
                       visit_count, first_visit_ms, last_visit_ms
                FROM history
                ORDER BY last_visit_ms DESC
                LIMIT ?1 OFFSET ?2
                "#,
            )?;
            let rows = stmt.query_map(params![cap, off], |r| row_to_entry(r, ref_now))?;
            for item in rows {
                entries.push(item?);
            }
        }
    }

    Ok(entries)
}

pub fn delete_history_item(conn: &Connection, id: i64) -> Result<bool> {
    let changed = conn.execute("DELETE FROM history WHERE id = ?1", params![id])?;
    Ok(changed > 0)
}

pub fn delete_history_range(
    conn: &Connection,
    from_ms: i64,
    to_ms: i64,
    space_id_opt: Option<&str>,
) -> Result<usize> {
    let changed = match space_id_opt.filter(|s| !s.trim().is_empty()) {
        Some(sp) => conn.execute(
            "DELETE FROM history WHERE last_visit_ms >= ?1 AND last_visit_ms <= ?2 AND space_id = ?3",
            params![from_ms, to_ms, sp],
        )?,
        None => conn.execute(
            "DELETE FROM history WHERE last_visit_ms >= ?1 AND last_visit_ms <= ?2",
            params![from_ms, to_ms],
        )?,
    };
    Ok(changed)
}

pub fn clear_history(conn: &Connection, space_id_opt: Option<&str>) -> Result<usize> {
    let changed = match space_id_opt.filter(|s| !s.trim().is_empty()) {
        Some(sp) => conn.execute("DELETE FROM history WHERE space_id = ?1", params![sp])?,
        None => conn.execute("DELETE FROM history", [])?,
    };
    Ok(changed)
}

pub fn import_legacy_history(conn: &mut Connection, json_items: &str) -> Result<usize> {
    let items: Vec<LegacyHistoryItem> =
        serde_json::from_str(json_items).context("Failed to parse legacy history JSON")?;

    let tx = conn.transaction()?;
    let mut imported = 0usize;
    let fallback_now = now_ms();

    for item in items {
        let Some(url) = item.url.as_deref().map(str::trim).filter(|s| !s.is_empty()) else {
            continue;
        };
        let sp = item
            .space_id
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .unwrap_or("default");
        if should_reject_history_write(url, sp) {
            continue;
        }

        let title = item.title.as_deref().unwrap_or("").trim();
        let meta = extract_rich_history_meta(url, title);
        if meta.dedupe_key.is_empty() {
            continue;
        }

        let last_ms = item
            .last_visit_ms
            .or(item.last_visit)
            .filter(|&v| v > 0)
            .unwrap_or(fallback_now);
        let first_ms = item
            .first_visit_ms
            .or(item.first_visit)
            .filter(|&v| v > 0)
            .unwrap_or(last_ms);
        let visits = item.visit_count.unwrap_or(1).max(1);

        let changed = tx.execute(
            r#"
            INSERT INTO history (
                dedupe_key, space_id, url, title, display_title, domain, search_query,
                visit_count, first_visit_ms, last_visit_ms
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            ON CONFLICT(dedupe_key, space_id) DO UPDATE SET
                visit_count = MAX(history.visit_count, excluded.visit_count),
                first_visit_ms = MIN(history.first_visit_ms, excluded.first_visit_ms),
                last_visit_ms = MAX(history.last_visit_ms, excluded.last_visit_ms)
            "#,
            params![
                meta.dedupe_key,
                sp,
                meta.clean_url,
                title,
                meta.display_title,
                meta.domain,
                meta.search_query,
                visits,
                first_ms,
                last_ms
            ],
        )?;
        if changed > 0 {
            imported += 1;
        }
    }

    tx.commit()?;
    Ok(imported)
}

use crate::history_extractors::strip_tracking_params;
use anyhow::{Context, Result};
use dashmap::DashMap;
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn init_settings_and_annotations_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS settings_kv (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS annotations (
            normalized_url TEXT NOT NULL,
            space_id TEXT NOT NULL DEFAULT 'default',
            data_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (normalized_url, space_id)
        );
        "#,
    )
    .context("Failed to initialize settings_kv and annotations schema")?;
    Ok(())
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub fn load_settings_cache(conn: &Connection, cache: &DashMap<String, String>) -> Result<()> {
    let mut stmt = conn.prepare("SELECT key, value FROM settings_kv")?;
    let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))?;
    for row in rows {
        let (k, v) = row?;
        cache.insert(k, v);
    }
    Ok(())
}

pub fn set_setting(
    conn: &Connection,
    cache: &DashMap<String, String>,
    key: &str,
    value: &str,
) -> Result<()> {
    let ts = now_ms();
    conn.execute(
        r#"
        INSERT INTO settings_kv (key, value, updated_at)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
        "#,
        params![key, value, ts],
    )?;
    cache.insert(key.to_string(), value.to_string());
    Ok(())
}

pub fn bulk_set_settings(
    conn: &mut Connection,
    cache: &DashMap<String, String>,
    entries: &HashMap<String, String>,
) -> Result<usize> {
    let ts = now_ms();
    let tx = conn.transaction()?;
    let mut count = 0usize;
    for (k, v) in entries {
        tx.execute(
            r#"
            INSERT INTO settings_kv (key, value, updated_at)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            "#,
            params![k, v, ts],
        )?;
        count += 1;
    }
    tx.commit()?;
    for (k, v) in entries {
        cache.insert(k.clone(), v.clone());
    }
    Ok(count)
}

pub fn normalize_annotation_url(raw_url: &str) -> String {
    let stripped = strip_tracking_params(raw_url);
    stripped.trim_end_matches('#').to_string()
}

pub fn get_annotations(
    conn: &Connection,
    url: &str,
    space_id: &str,
) -> Result<Option<String>> {
    let norm = normalize_annotation_url(url);
    let sp = if space_id.trim().is_empty() {
        "default"
    } else {
        space_id.trim()
    };
    let res = conn
        .query_row(
            "SELECT data_json FROM annotations WHERE normalized_url = ?1 AND space_id = ?2",
            params![norm, sp],
            |r| r.get::<_, String>(0),
        )
        .optional()?;
    Ok(res)
}

pub fn save_annotations(
    conn: &Connection,
    url: &str,
    space_id: &str,
    data_json: &str,
) -> Result<()> {
    let norm = normalize_annotation_url(url);
    let sp = if space_id.trim().is_empty() {
        "default"
    } else {
        space_id.trim()
    };
    let ts = now_ms();
    conn.execute(
        r#"
        INSERT INTO annotations (normalized_url, space_id, data_json, updated_at)
        VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(normalized_url, space_id) DO UPDATE SET
            data_json = excluded.data_json,
            updated_at = excluded.updated_at
        "#,
        params![norm, sp, data_json, ts],
    )?;
    Ok(())
}

pub fn delete_annotation(conn: &Connection, url: &str, space_id: &str) -> Result<bool> {
    let norm = normalize_annotation_url(url);
    let sp = if space_id.trim().is_empty() {
        "default"
    } else {
        space_id.trim()
    };
    let changed = conn.execute(
        "DELETE FROM annotations WHERE normalized_url = ?1 AND space_id = ?2",
        params![norm, sp],
    )?;
    Ok(changed > 0)
}

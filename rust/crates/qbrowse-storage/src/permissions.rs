use anyhow::{Context, Result};
use dashmap::DashMap;
use once_cell::sync::Lazy;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashSet;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use url::Url;

static AUTO_ALLOW_PERMISSIONS: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    [
        "fullscreen",
        "clipboard-sanitized-write",
        "mediaKeySystem",
        "screen-wake-lock",
        "storage-access",
        "top-level-storage-access",
        "keyboardLock",
        "publickey-credentials-get",
        "publickey-credentials-create",
    ]
    .into_iter()
    .collect()
});

static DEFAULT_DENY_PERMISSIONS: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    ["midiSysex", "midi", "pointerLock", "openExternal"]
        .into_iter()
        .collect()
});

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SitePermissionEntry {
    pub partition_key: String,
    pub origin: String,
    pub permission: String,
    pub decision: String,
    pub updated_at: i64,
}

pub fn init_permissions_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS site_permissions (
            partition_key TEXT NOT NULL,
            origin TEXT NOT NULL,
            permission TEXT NOT NULL,
            decision TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (partition_key, origin, permission)
        );
        CREATE INDEX IF NOT EXISTS idx_site_permissions_partition_origin
            ON site_permissions(partition_key, origin);
        "#,
    )
    .context("Failed to initialize site_permissions schema")?;
    Ok(())
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub fn is_partition_ephemeral(partition_key: &str) -> bool {
    let p = partition_key.trim().to_lowercase();
    p == "ghost"
        || p == "tor"
        || (!p.is_empty() && p != "default" && !p.starts_with("persist:"))
}

pub fn normalize_partition_key(partition_key: &str) -> String {
    let trimmed = partition_key.trim();
    if trimmed.is_empty() {
        "default".to_string()
    } else {
        trimmed.to_string()
    }
}

/// Extracts a canonical origin string matching `extractOrigin` in `electron/permissionEngine.cjs`.
pub fn extract_origin(input: &str) -> String {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let lower = trimmed.to_lowercase();
    if lower == "about:blank"
        || lower.starts_with("about:")
        || lower.starts_with("javascript:")
        || lower.starts_with("data:")
        || lower.starts_with("blob:")
    {
        return String::new();
    }
    if lower.starts_with("file://") {
        return "file://".to_string();
    }

    let candidate = if trimmed.contains("://") {
        trimmed.to_string()
    } else {
        format!("https://{trimmed}")
    };
    let Ok(parsed) = Url::parse(&candidate) else {
        return String::new();
    };
    match parsed.scheme() {
        "http" | "https" => {
            if parsed.host_str().unwrap_or("").is_empty() {
                String::new()
            } else {
                parsed.origin().ascii_serialization().to_lowercase()
            }
        }
        "file" => "file://".to_string(),
        _ => {
            let origin = parsed.origin().ascii_serialization();
            if origin.is_empty() || origin == "null" {
                String::new()
            } else {
                origin.to_lowercase()
            }
        }
    }
}

pub fn normalize_permission_key(permission: &str) -> String {
    let trimmed = permission.trim();
    match trimmed {
        "clipboard" => "clipboard-read".to_string(),
        "audioCapture" => "microphone".to_string(),
        "videoCapture" => "camera".to_string(),
        "midiSysex" => "midi".to_string(),
        other => other.to_string(),
    }
}

/// Migrates a legacy `site-permissions.json` (or `permissions.json`) into `site_permissions`
/// under the `"default"` partition if present on disk.
pub fn migrate_permissions_json_file(conn: &mut Connection, json_path: &Path) -> Result<usize> {
    if !json_path.exists() {
        return Ok(0);
    }
    let raw = std::fs::read_to_string(json_path)
        .with_context(|| format!("Failed to read {}", json_path.display()))?;
    let parsed: Value = serde_json::from_str(&raw)
        .with_context(|| format!("Failed to parse {}", json_path.display()))?;
    let Some(root_obj) = parsed.as_object() else {
        return Ok(0);
    };

    let ts = now_ms();
    let tx = conn.transaction()?;
    let mut count = 0usize;

    for (raw_origin, raw_rules) in root_obj {
        let origin = extract_origin(raw_origin);
        let Some(rules) = raw_rules.as_object() else {
            continue;
        };
        if origin.is_empty() {
            continue;
        }
        for (raw_key, raw_val) in rules {
            let Some(decision) = raw_val.as_str() else {
                continue;
            };
            if decision != "allow" && decision != "block" {
                continue;
            }
            let keys: Vec<String> = if raw_key == "media" {
                vec!["camera".to_string(), "microphone".to_string()]
            } else {
                let norm = normalize_permission_key(raw_key);
                if norm.is_empty() {
                    continue;
                }
                vec![norm]
            };

            for k in keys {
                tx.execute(
                    r#"
                    INSERT OR IGNORE INTO site_permissions (partition_key, origin, permission, decision, updated_at)
                    VALUES ('default', ?1, ?2, ?3, ?4)
                    "#,
                    params![origin, k, decision, ts],
                )?;
                count += 1;
            }
        }
    }

    tx.commit()?;
    Ok(count)
}

pub fn check_permission(
    conn: &Connection,
    ephemeral: &DashMap<(String, String, String), String>,
    partition_key: &str,
    origin_or_url: &str,
    permission: &str,
) -> bool {
    let raw_perm = permission.trim();
    if raw_perm.is_empty() {
        return false;
    }

    let norm_perm = normalize_permission_key(raw_perm);
    let origin = extract_origin(origin_or_url);
    if origin.is_empty() {
        return false;
    }

    let part = normalize_partition_key(partition_key);
    let is_ephem = is_partition_ephemeral(&part);

    let lookup_decision = |perm_key: &str| -> Option<String> {
        if is_ephem {
            ephemeral
                .get(&(part.clone(), origin.clone(), perm_key.to_string()))
                .map(|v| v.value().clone())
        } else {
            conn.query_row(
                "SELECT decision FROM site_permissions WHERE partition_key = ?1 AND origin = ?2 AND permission = ?3",
                params![part, origin, perm_key],
                |r| r.get::<_, String>(0),
            )
            .optional()
            .ok()
            .flatten()
        }
    };

    if raw_perm == "media" {
        let cam = lookup_decision("camera").as_deref() == Some("allow");
        let mic = lookup_decision("microphone").as_deref() == Some("allow");
        return cam || mic;
    }

    if let Some(dec) = lookup_decision(&norm_perm) {
        return dec == "allow";
    }

    // Explicit default-deny permissions (midiSysex, pointerLock, openExternal)
    if DEFAULT_DENY_PERMISSIONS.contains(raw_perm) || DEFAULT_DENY_PERMISSIONS.contains(norm_perm.as_str()) {
        return false;
    }

    if AUTO_ALLOW_PERMISSIONS.contains(raw_perm) || AUTO_ALLOW_PERMISSIONS.contains(norm_perm.as_str()) {
        return true;
    }

    false
}

pub fn set_permission(
    conn: &Connection,
    ephemeral: &DashMap<(String, String, String), String>,
    partition_key: &str,
    origin_or_url: &str,
    permission: &str,
    decision: &str,
) -> Result<bool> {
    let origin = extract_origin(origin_or_url);
    if origin.is_empty() || permission.trim().is_empty() {
        return Ok(false);
    }

    let normalized_val = match decision.trim() {
        "allow" => "allow",
        "block" => "block",
        _ => "ask",
    };

    let keys: Vec<String> = if permission.trim() == "media" {
        vec!["camera".to_string(), "microphone".to_string()]
    } else {
        let k = normalize_permission_key(permission);
        if k.is_empty() {
            return Ok(false);
        }
        vec![k]
    };

    let part = normalize_partition_key(partition_key);
    let is_ephem = is_partition_ephemeral(&part);

    if is_ephem {
        // Ephemeral partitions (ghost, tor, etc.) are NEVER persisted to SQLite
        for k in keys {
            let map_key = (part.clone(), origin.clone(), k);
            if normalized_val == "ask" {
                ephemeral.remove(&map_key);
            } else {
                ephemeral.insert(map_key, normalized_val.to_string());
            }
        }
        return Ok(true);
    }

    let ts = now_ms();
    for k in keys {
        if normalized_val == "ask" {
            conn.execute(
                "DELETE FROM site_permissions WHERE partition_key = ?1 AND origin = ?2 AND permission = ?3",
                params![part, origin, k],
            )?;
        } else {
            conn.execute(
                r#"
                INSERT INTO site_permissions (partition_key, origin, permission, decision, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5)
                ON CONFLICT(partition_key, origin, permission) DO UPDATE SET
                    decision = excluded.decision,
                    updated_at = excluded.updated_at
                "#,
                params![part, origin, k, normalized_val, ts],
            )?;
        }
    }

    Ok(true)
}

pub fn list_permissions(
    conn: &Connection,
    ephemeral: &DashMap<(String, String, String), String>,
    partition_key: &str,
    origin_opt: Option<&str>,
) -> Result<Vec<SitePermissionEntry>> {
    let part = normalize_partition_key(partition_key);
    let origin_filter = origin_opt
        .map(extract_origin)
        .filter(|s| !s.is_empty());

    if is_partition_ephemeral(&part) {
        let mut out = Vec::new();
        for entry in ephemeral.iter() {
            let (p, o, perm) = entry.key();
            if p != &part {
                continue;
            }
            if let Some(ref target_o) = origin_filter {
                if o != target_o {
                    continue;
                }
            }
            out.push(SitePermissionEntry {
                partition_key: p.clone(),
                origin: o.clone(),
                permission: perm.clone(),
                decision: entry.value().clone(),
                updated_at: 0,
            });
        }
        out.sort_by(|a, b| a.origin.cmp(&b.origin).then_with(|| a.permission.cmp(&b.permission)));
        return Ok(out);
    }

    let mut out = Vec::new();
    match origin_filter {
        Some(orig) => {
            let mut stmt = conn.prepare(
                "SELECT partition_key, origin, permission, decision, updated_at FROM site_permissions WHERE partition_key = ?1 AND origin = ?2 ORDER BY permission ASC",
            )?;
            let rows = stmt.query_map(params![part, orig], |r| {
                Ok(SitePermissionEntry {
                    partition_key: r.get(0)?,
                    origin: r.get(1)?,
                    permission: r.get(2)?,
                    decision: r.get(3)?,
                    updated_at: r.get(4)?,
                })
            })?;
            for r in rows {
                out.push(r?);
            }
        }
        None => {
            let mut stmt = conn.prepare(
                "SELECT partition_key, origin, permission, decision, updated_at FROM site_permissions WHERE partition_key = ?1 ORDER BY origin ASC, permission ASC",
            )?;
            let rows = stmt.query_map(params![part], |r| {
                Ok(SitePermissionEntry {
                    partition_key: r.get(0)?,
                    origin: r.get(1)?,
                    permission: r.get(2)?,
                    decision: r.get(3)?,
                    updated_at: r.get(4)?,
                })
            })?;
            for r in rows {
                out.push(r?);
            }
        }
    }
    Ok(out)
}

pub fn reset_origin(
    conn: &Connection,
    ephemeral: &DashMap<(String, String, String), String>,
    partition_key: &str,
    origin_or_url: &str,
) -> Result<bool> {
    let origin = extract_origin(origin_or_url);
    if origin.is_empty() {
        return Ok(false);
    }
    let part = normalize_partition_key(partition_key);
    if is_partition_ephemeral(&part) {
        let mut removed = false;
        ephemeral.retain(|(p, o, _), _| {
            let keep = !(p == &part && o == &origin);
            if !keep {
                removed = true;
            }
            keep
        });
        return Ok(removed);
    }

    let changed = conn.execute(
        "DELETE FROM site_permissions WHERE partition_key = ?1 AND origin = ?2",
        params![part, origin],
    )?;
    Ok(changed > 0)
}

pub fn clear_partition(
    conn: &Connection,
    ephemeral: &DashMap<(String, String, String), String>,
    partition_key: &str,
) -> Result<usize> {
    let part = normalize_partition_key(partition_key);
    if is_partition_ephemeral(&part) {
        let mut count = 0usize;
        ephemeral.retain(|(p, _, _), _| {
            let keep = p != &part;
            if !keep {
                count += 1;
            }
            keep
        });
        return Ok(count);
    }

    let changed = conn.execute(
        "DELETE FROM site_permissions WHERE partition_key = ?1",
        params![part],
    )?;
    Ok(changed)
}

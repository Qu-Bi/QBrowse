use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use url::Url;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedVaultItem {
    pub title: String,
    pub username: String,
    pub password: String,
    pub url: String,
    pub notes: String,
    pub totp_secret: Option<String>,
    pub item_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultImportResult {
    pub items: Vec<ImportedVaultItem>,
    pub source_name: String,
    pub total_parsed: usize,
    pub duplicates_removed: usize,
}

fn normalize_origin_for_dedup(raw_url: &str) -> String {
    let trimmed = raw_url.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    if let Ok(parsed) = Url::parse(trimmed) {
        if let Some(host) = parsed.host_str() {
            return format!(
                "{}://{}{}",
                parsed.scheme().to_ascii_lowercase(),
                host.to_ascii_lowercase(),
                parsed
                    .port()
                    .map(|p| format!(":{p}"))
                    .unwrap_or_default()
            );
        }
    }
    trimmed.to_ascii_lowercase()
}

fn str_field(v: &serde_json::Value, keys: &[&str]) -> String {
    for k in keys {
        if let Some(s) = v.get(*k).and_then(|val| val.as_str()) {
            if !s.is_empty() {
                return s.to_string();
            }
        }
    }
    String::new()
}

fn opt_str_field(v: &serde_json::Value, keys: &[&str]) -> Option<String> {
    for k in keys {
        if let Some(s) = v.get(*k).and_then(|val| val.as_str()) {
            if !s.trim().is_empty() {
                return Some(s.trim().to_string());
            }
        }
    }
    None
}

fn parse_json_vault(text: &str) -> Result<(Vec<ImportedVaultItem>, String)> {
    let json: serde_json::Value = serde_json::from_str(text)?;
    let mut parsed = Vec::new();
    let mut source_name = "JSON Export".to_string();

    if let Some(items) = json.get("items").and_then(|v| v.as_array()) {
        if json.get("qvault_version").is_some() {
            source_name = "QVault Backup".to_string();
            for item in items {
                parsed.push(ImportedVaultItem {
                    title: str_field(item, &["title", "name"]),
                    username: str_field(item, &["username", "user"]),
                    password: str_field(item, &["password", "pass"]),
                    url: str_field(item, &["url", "uri"]),
                    notes: str_field(item, &["notes", "note"]),
                    totp_secret: opt_str_field(item, &["totpSecret", "totp"]),
                    item_type: opt_str_field(item, &["type", "itemType"])
                        .unwrap_or_else(|| "login".to_string()),
                });
            }
        } else {
            source_name = "Bitwarden".to_string();
            for item in items {
                let login = item.get("login").unwrap_or(&serde_json::Value::Null);
                let first_uri = login
                    .get("uris")
                    .and_then(|u| u.as_array())
                    .and_then(|arr| arr.first())
                    .and_then(|u| u.get("uri"))
                    .and_then(|u| u.as_str())
                    .unwrap_or("")
                    .to_string();
                let title = opt_str_field(item, &["name"])
                    .unwrap_or_else(|| {
                        if first_uri.is_empty() {
                            "Untitled".to_string()
                        } else {
                            first_uri.clone()
                        }
                    });
                let item_type = if item.get("type").and_then(|t| t.as_i64()) == Some(3) {
                    "card".to_string()
                } else {
                    "login".to_string()
                };
                parsed.push(ImportedVaultItem {
                    title,
                    username: str_field(login, &["username"]),
                    password: str_field(login, &["password"]),
                    url: first_uri,
                    notes: str_field(item, &["notes"]),
                    totp_secret: opt_str_field(login, &["totp"]),
                    item_type,
                });
            }
        }
    } else if let Some(vaults) = json.get("vaults").and_then(|v| v.as_array()) {
        source_name = "Proton Pass".to_string();
        for vault in vaults {
            if let Some(items) = vault.get("items").and_then(|v| v.as_array()) {
                for item in items {
                    let data = item.get("data").unwrap_or(&serde_json::Value::Null);
                    let content = data.get("content").unwrap_or(&serde_json::Value::Null);
                    let metadata = data.get("metadata").unwrap_or(&serde_json::Value::Null);
                    let first_url = content
                        .get("urls")
                        .and_then(|u| u.as_array())
                        .and_then(|arr| arr.first())
                        .and_then(|u| u.as_str())
                        .unwrap_or("")
                        .to_string();
                    let title = opt_str_field(metadata, &["name"])
                        .or_else(|| opt_str_field(item, &["name"]))
                        .unwrap_or_else(|| "Untitled".to_string());
                    parsed.push(ImportedVaultItem {
                        title,
                        username: str_field(content, &["username"]),
                        password: str_field(content, &["password"]),
                        url: first_url,
                        notes: str_field(metadata, &["note"]),
                        totp_secret: opt_str_field(content, &["totpUri", "totp"]),
                        item_type: "login".to_string(),
                    });
                }
            }
        }
    } else if let Some(arr) = json.as_array() {
        for item in arr {
            parsed.push(ImportedVaultItem {
                title: opt_str_field(item, &["title", "name"])
                    .unwrap_or_else(|| "Untitled".to_string()),
                username: str_field(item, &["username", "user", "login"]),
                password: str_field(item, &["password", "pass"]),
                url: str_field(item, &["url", "uri", "website"]),
                notes: str_field(item, &["notes", "note"]),
                totp_secret: opt_str_field(item, &["totpSecret", "totp", "otp"]),
                item_type: opt_str_field(item, &["type"]).unwrap_or_else(|| "login".to_string()),
            });
        }
    }

    Ok((parsed, source_name))
}

fn find_col(headers: &[String], candidates: &[&str]) -> Option<usize> {
    headers
        .iter()
        .position(|h| candidates.iter().any(|c| h == c))
}

fn parse_csv_vault(text: &str) -> (Vec<ImportedVaultItem>, String) {
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .from_reader(text.as_bytes());

    let headers: Vec<String> = match reader.headers() {
        Ok(h) => h.iter().map(|s| s.trim().to_ascii_lowercase()).collect(),
        Err(_) => return (Vec::new(), "CSV".to_string()),
    };

    let col_title = find_col(&headers, &["name", "title", "folder_name"]);
    let col_url = find_col(&headers, &["url", "uri", "login_uri", "website"]);
    let col_user = find_col(&headers, &["username", "login_username", "user", "email", "login"]);
    let col_pass = find_col(&headers, &["password", "login_password", "pass"]);
    let col_note = find_col(&headers, &["note", "notes", "comment"]);
    let col_totp = find_col(
        &headers,
        &["totp", "login_totp", "otp", "otpauth", "2fa", "authenticator"],
    );

    let source_name = if headers.iter().any(|h| h == "login_username" || h == "login_password") {
        "Bitwarden".to_string()
    } else if headers.iter().any(|h| h == "otpauth") && headers.iter().any(|h| h == "title") {
        "Apple Passwords".to_string()
    } else if headers.iter().any(|h| h == "http_realm" || h == "httprealm" || h == "formactionorigin") {
        "Firefox".to_string()
    } else if headers.iter().any(|h| h == "url")
        && headers.iter().any(|h| h == "username")
        && headers.iter().any(|h| h == "note")
    {
        "Proton Pass".to_string()
    } else if headers.iter().any(|h| h == "website") && headers.iter().any(|h| h == "title") {
        "1Password".to_string()
    } else if headers.iter().any(|h| h == "url")
        && headers.iter().any(|h| h == "username")
        && headers.iter().any(|h| h == "password")
    {
        "Chrome/Browser".to_string()
    } else {
        "CSV".to_string()
    };

    let mut parsed = Vec::new();
    for record in reader.records().flatten() {
        if record.len() < 2 {
            continue;
        }
        let get = |idx: Option<usize>| -> String {
            idx.and_then(|i| record.get(i))
                .map(|s| s.trim().to_string())
                .unwrap_or_default()
        };
        let u = get(col_user);
        let p = get(col_pass);
        let t = get(col_title);
        let url = get(col_url);
        let note = get(col_note);
        let totp = get(col_totp);

        if !p.is_empty() || !u.is_empty() || !t.is_empty() || !totp.is_empty() {
            let title = if !t.is_empty() {
                t
            } else if !url.is_empty() {
                url.clone()
            } else if !u.is_empty() {
                u.clone()
            } else {
                "Untitled".to_string()
            };
            parsed.push(ImportedVaultItem {
                title,
                username: u,
                password: p,
                url,
                notes: note,
                totp_secret: if totp.is_empty() { None } else { Some(totp) },
                item_type: "login".to_string(),
            });
        }
    }

    (parsed, source_name)
}

/// Stream-parse CSV or JSON vault exports (Bitwarden, Proton Pass, 1Password, Chrome/Edge/Brave/Firefox,
/// Apple Passwords, QVault Backup) and deduplicate by `(origin, username, password)`.
pub fn import_vault_data(content: &str, filename: &str) -> VaultImportResult {
    let trimmed = content.trim();
    let is_json = filename.to_ascii_lowercase().ends_with(".json")
        || trimmed.starts_with('{')
        || trimmed.starts_with('[');

    let (parsed, source_name) = if is_json {
        parse_json_vault(content).unwrap_or_else(|_| (Vec::new(), "File".to_string()))
    } else {
        parse_csv_vault(content)
    };

    let total_parsed = parsed.len();
    let mut seen = HashSet::with_capacity(total_parsed);
    let mut deduped = Vec::with_capacity(total_parsed);

    for item in parsed {
        let key = (
            normalize_origin_for_dedup(&item.url),
            item.username.clone(),
            item.password.clone(),
        );
        if seen.insert(key) {
            deduped.push(item);
        }
    }

    let duplicates_removed = total_parsed - deduped.len();
    VaultImportResult {
        items: deduped,
        source_name,
        total_parsed,
        duplicates_removed,
    }
}

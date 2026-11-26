use anyhow::{anyhow, bail, ensure, Context, Result};
use base64::Engine as _;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

static STAGING_COUNTER: AtomicU64 = AtomicU64::new(1);

pub fn ping() -> &'static str {
    "qbrowse-extensions"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionMetadata {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub manifest_version: u32,
    pub permissions: Vec<String>,
    pub host_permissions: Vec<String>,
    pub optional_permissions: Vec<String>,
    pub popup_path: Option<String>,
    pub options_page: Option<String>,
    pub has_background: bool,
    pub path: String,
    pub icon_data_url: Option<String>,
}

/// Convert a 16-byte binary CRX ID to Chrome's 32-character `[a-p]{32}` ID.
pub fn bytes_to_crx_id(bytes16: &[u8]) -> Result<String> {
    ensure!(
        bytes16.len() >= 16,
        "Expected at least 16 bytes for CRX ID, got {}",
        bytes16.len()
    );
    let mut out = String::with_capacity(32);
    for &b in &bytes16[..16] {
        let hi = (b >> 4) & 0x0f;
        let lo = b & 0x0f;
        out.push((b'a' + hi) as char);
        out.push((b'a' + lo) as char);
    }
    Ok(out)
}

pub fn is_valid_crx_id(ext_id: &str) -> bool {
    ext_id.len() == 32 && ext_id.bytes().all(|b| (b'a'..=b'p').contains(&b))
}

fn read_varint(buf: &[u8], pos: &mut usize) -> Result<u64> {
    let mut val: u64 = 0;
    let mut shift = 0u32;
    for _ in 0..10 {
        if *pos >= buf.len() {
            bail!("Unexpected EOF while reading protobuf varint");
        }
        let byte = buf[*pos];
        *pos += 1;
        val |= ((byte & 0x7f) as u64) << shift;
        if (byte & 0x80) == 0 {
            return Ok(val);
        }
        shift += 7;
    }
    bail!("Protobuf varint exceeded 10 bytes");
}

fn skip_pb_field(buf: &[u8], pos: &mut usize, wire_type: u64) -> Result<()> {
    match wire_type {
        0 => {
            read_varint(buf, pos)?;
        }
        1 => {
            ensure!(*pos + 8 <= buf.len(), "Unexpected EOF skipping 64-bit field");
            *pos += 8;
        }
        2 => {
            let len = read_varint(buf, pos)? as usize;
            let end = pos
                .checked_add(len)
                .ok_or_else(|| anyhow!("Protobuf length overflow"))?;
            ensure!(end <= buf.len(), "Unexpected EOF skipping length-delimited field");
            *pos = end;
        }
        5 => {
            ensure!(*pos + 4 <= buf.len(), "Unexpected EOF skipping 32-bit field");
            *pos += 4;
        }
        other => bail!("Unsupported protobuf wire type: {}", other),
    }
    Ok(())
}

fn read_pb_bytes<'a>(buf: &'a [u8], pos: &mut usize) -> Result<&'a [u8]> {
    let len = read_varint(buf, pos)? as usize;
    let end = pos
        .checked_add(len)
        .ok_or_else(|| anyhow!("Protobuf length overflow"))?;
    ensure!(end <= buf.len(), "Unexpected EOF reading length-delimited field");
    let slice = &buf[*pos..end];
    *pos = end;
    Ok(slice)
}

/// Extract `crx_id` (field 1) from CRX3 `SignedData`.
fn decode_signed_header_data(data: &[u8]) -> Result<Option<String>> {
    let mut pos = 0;
    while pos < data.len() {
        let tag = read_varint(data, &mut pos)?;
        let field_num = tag >> 3;
        let wire_type = tag & 0x07;
        if field_num == 1 && wire_type == 2 {
            let crx_id_bytes = read_pb_bytes(data, &mut pos)?;
            if crx_id_bytes.len() == 16 {
                return Ok(Some(bytes_to_crx_id(crx_id_bytes)?));
            }
        } else {
            skip_pb_field(data, &mut pos, wire_type)?;
        }
    }
    Ok(None)
}

/// Extract `public_key` (field 1) from CRX3 `AsymmetricKeyProof` and hash to CRX ID.
fn decode_asymmetric_key_proof_id(data: &[u8]) -> Result<Option<String>> {
    let mut pos = 0;
    while pos < data.len() {
        let tag = read_varint(data, &mut pos)?;
        let field_num = tag >> 3;
        let wire_type = tag & 0x07;
        if field_num == 1 && wire_type == 2 {
            let pubkey = read_pb_bytes(data, &mut pos)?;
            if !pubkey.is_empty() {
                let hash = Sha256::digest(pubkey);
                return Ok(Some(bytes_to_crx_id(&hash[..16])?));
            }
        } else {
            skip_pb_field(data, &mut pos, wire_type)?;
        }
    }
    Ok(None)
}

/// Decode CRX3 `CrxFileHeader` protobuf bytes to derive the extension ID.
fn decode_crx3_header_id(header_bytes: &[u8]) -> Result<Option<String>> {
    let mut pos = 0;
    let mut signed_id: Option<String> = None;
    let mut key_ids: Vec<String> = Vec::new();

    while pos < header_bytes.len() {
        let tag = read_varint(header_bytes, &mut pos)?;
        let field_num = tag >> 3;
        let wire_type = tag & 0x07;
        match (field_num, wire_type) {
            (10000, 2) => {
                let signed_data = read_pb_bytes(header_bytes, &mut pos)?;
                if let Some(id) = decode_signed_header_data(signed_data)? {
                    signed_id = Some(id);
                }
            }
            (2, 2) | (3, 2) => {
                let proof = read_pb_bytes(header_bytes, &mut pos)?;
                if let Some(id) = decode_asymmetric_key_proof_id(proof)? {
                    key_ids.push(id);
                }
            }
            _ => {
                skip_pb_field(header_bytes, &mut pos, wire_type)?;
            }
        }
    }

    if let Some(id) = signed_id {
        return Ok(Some(id));
    }
    Ok(key_ids.into_iter().next())
}

/// Parse CRX3, CRX2, or raw ZIP payload, returning `(derived_id, zip_start_offset)`.
pub fn parse_crx_payload(bytes: &[u8], expected_id: Option<&str>) -> Result<(Option<String>, usize)> {
    if bytes.starts_with(b"PK\x03\x04") {
        return Ok((None, 0));
    }

    ensure!(
        bytes.len() >= 12 && &bytes[0..4] == b"Cr24",
        "Invalid CRX payload: missing Cr24 or ZIP magic"
    );

    let version = u32::from_le_bytes(bytes[4..8].try_into().unwrap());
    let (derived_id, zip_offset) = match version {
        3 => {
            let header_len = u32::from_le_bytes(bytes[8..12].try_into().unwrap()) as usize;
            let zip_offset = 12usize
                .checked_add(header_len)
                .ok_or_else(|| anyhow!("CRX3 header length overflow"))?;
            ensure!(
                zip_offset <= bytes.len(),
                "CRX3 header length ({}) exceeds payload size ({})",
                header_len,
                bytes.len()
            );
            let header_bytes = &bytes[12..zip_offset];
            let id = decode_crx3_header_id(header_bytes)?;
            (id, zip_offset)
        }
        2 => {
            ensure!(bytes.len() >= 16, "Truncated CRX2 header");
            let pubkey_len = u32::from_le_bytes(bytes[8..12].try_into().unwrap()) as usize;
            let sig_len = u32::from_le_bytes(bytes[12..16].try_into().unwrap()) as usize;
            let zip_offset = 16usize
                .checked_add(pubkey_len)
                .and_then(|v| v.checked_add(sig_len))
                .ok_or_else(|| anyhow!("CRX2 header length overflow"))?;
            ensure!(
                zip_offset <= bytes.len(),
                "CRX2 header exceeds payload size"
            );
            let id = if pubkey_len > 0 {
                let hash = Sha256::digest(&bytes[16..16 + pubkey_len]);
                Some(bytes_to_crx_id(&hash[..16])?)
            } else {
                None
            };
            (id, zip_offset)
        }
        other => bail!("Unsupported CRX version: {}", other),
    };

    if let (Some(expected), Some(actual)) = (expected_id, derived_id.as_deref()) {
        ensure!(
            expected == actual,
            "CRX ID mismatch: expected {}, got {}",
            expected,
            actual
        );
    }

    ensure!(
        bytes[zip_offset..].starts_with(b"PK\x03\x04"),
        "CRX payload does not contain a valid ZIP archive at offset {}",
        zip_offset
    );

    Ok((derived_id, zip_offset))
}

/// Safely extract a ZIP buffer into `dest_dir` with Zip-Slip and symlink protection.
pub fn extract_zip_safely(zip_bytes: &[u8], dest_dir: &Path) -> Result<()> {
    fs::create_dir_all(dest_dir)
        .with_context(|| format!("Failed to create extraction dir {}", dest_dir.display()))?;
    let canonical_dest = fs::canonicalize(dest_dir)?;

    let mut archive = zip::ZipArchive::new(Cursor::new(zip_bytes))
        .context("Failed to open ZIP archive")?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)?;
        if entry.is_symlink() {
            bail!("Refusing to extract symlink entry: {}", entry.name());
        }

        let enclosed = entry
            .enclosed_name()
            .ok_or_else(|| anyhow!("Unsafe ZIP entry path (Zip-Slip rejected): {}", entry.name()))?;

        let out_path = canonical_dest.join(enclosed);

        if entry.is_dir() {
            fs::create_dir_all(&out_path)?;
            let canonical_out = fs::canonicalize(&out_path)?;
            ensure!(
                canonical_out.starts_with(&canonical_dest),
                "Directory entry escaped destination: {}",
                entry.name()
            );
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent)?;
                let canonical_parent = fs::canonicalize(parent)?;
                ensure!(
                    canonical_parent.starts_with(&canonical_dest),
                    "File parent escaped destination: {}",
                    entry.name()
                );
            }
            let mut out_file = fs::File::create(&out_path)
                .with_context(|| format!("Failed to create extracted file {}", out_path.display()))?;
            std::io::copy(&mut entry, &mut out_file)?;
        }
    }

    Ok(())
}

fn strip_utf8_bom(s: &str) -> &str {
    s.strip_prefix('\u{FEFF}').unwrap_or(s)
}

fn normalize_path_string(path: &Path) -> String {
    let s = path.to_string_lossy();
    if let Some(stripped) = s.strip_prefix(r"\\?\UNC\") {
        format!(r"\\{}", stripped)
    } else if let Some(stripped) = s.strip_prefix(r"\\?\") {
        stripped.to_string()
    } else {
        s.into_owned()
    }
}

fn load_locale_messages(dir_path: &Path, default_locale: Option<&str>) -> HashMap<String, String> {
    let mut candidates: Vec<String> = Vec::new();
    if let Some(loc) = default_locale {
        if !loc.is_empty() {
            candidates.push(loc.to_string());
        }
    }
    for fallback in ["en", "en_US"] {
        if !candidates.iter().any(|c| c.eq_ignore_ascii_case(fallback)) {
            candidates.push(fallback.to_string());
        }
    }

    let mut messages = HashMap::new();
    // Load fallbacks first, then default_locale so default_locale takes precedence.
    for loc in candidates.into_iter().rev() {
        let msg_path = dir_path.join("_locales").join(&loc).join("messages.json");
        if let Ok(raw) = fs::read_to_string(&msg_path) {
            if let Ok(serde_json::Value::Object(map)) =
                serde_json::from_str::<serde_json::Value>(strip_utf8_bom(&raw))
            {
                for (k, v) in map {
                    if let Some(msg) = v.get("message").and_then(|m| m.as_str()) {
                        messages.insert(k.to_lowercase(), msg.to_string());
                    }
                }
            }
        }
    }
    messages
}

fn resolve_i18n_string(input: &str, messages: &HashMap<String, String>) -> String {
    if !input.contains("__MSG_") || messages.is_empty() {
        return input.to_string();
    }
    let mut out = String::with_capacity(input.len());
    let mut rest = input;
    while let Some(start) = rest.find("__MSG_") {
        out.push_str(&rest[..start]);
        let after_prefix = &rest[start + 6..];
        if let Some(end) = after_prefix.find("__") {
            let key = &after_prefix[..end];
            if let Some(val) = messages.get(&key.to_lowercase()) {
                out.push_str(val);
            } else {
                out.push_str("__MSG_");
                out.push_str(key);
                out.push_str("__");
            }
            rest = &after_prefix[end + 2..];
        } else {
            out.push_str(&rest[start..]);
            rest = "";
            break;
        }
    }
    out.push_str(rest);
    out
}

fn extract_string_array(val: Option<&serde_json::Value>) -> Vec<String> {
    val.and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|item| item.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default()
}

fn non_empty_str(val: Option<&serde_json::Value>) -> Option<String> {
    val.and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(String::from)
}

fn collect_icon_candidates(val: Option<&serde_json::Value>, out: &mut Vec<(u32, String)>) {
    let Some(v) = val else { return };
    match v {
        serde_json::Value::String(s) => {
            if !s.trim().is_empty() {
                out.push((0, s.trim().to_string()));
            }
        }
        serde_json::Value::Object(map) => {
            for (k, path_val) in map {
                if let Some(p) = path_val.as_str().map(str::trim).filter(|s| !s.is_empty()) {
                    let size = k.parse::<u32>().unwrap_or(0);
                    out.push((size, p.to_string()));
                }
            }
        }
        _ => {}
    }
}

fn icon_size_rank(size: u32) -> u32 {
    match size {
        128 => 1000,
        64 => 900,
        48 => 800,
        32 => 700,
        96 => 650,
        256 => 600,
        16 => 500,
        0 => 100,
        other => 200 + other.min(300),
    }
}

fn mime_for_icon_path(rel_path: &str) -> Option<&'static str> {
    let lower = rel_path.to_ascii_lowercase();
    if lower.ends_with(".png") {
        Some("image/png")
    } else if lower.ends_with(".svg") {
        Some("image/svg+xml")
    } else if lower.ends_with(".webp") {
        Some("image/webp")
    } else if lower.ends_with(".ico") {
        Some("image/x-icon")
    } else if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
        Some("image/jpeg")
    } else {
        None
    }
}

fn load_best_icon_data_url(canonical_dir: &Path, manifest: &serde_json::Value) -> Option<String> {
    let mut candidates: Vec<(u32, String)> = Vec::new();
    collect_icon_candidates(
        manifest.get("action").and_then(|a| a.get("default_icon")),
        &mut candidates,
    );
    collect_icon_candidates(
        manifest
            .get("browser_action")
            .and_then(|a| a.get("default_icon")),
        &mut candidates,
    );
    collect_icon_candidates(manifest.get("icons"), &mut candidates);

    candidates.sort_by(|a, b| icon_size_rank(b.0).cmp(&icon_size_rank(a.0)));

    for (_, rel) in candidates {
        let Some(mime) = mime_for_icon_path(&rel) else {
            continue;
        };
        let clean_rel = rel.trim_start_matches('/');
        let joined = canonical_dir.join(clean_rel);
        let Ok(canonical_icon) = fs::canonicalize(&joined) else {
            continue;
        };
        if !canonical_icon.starts_with(canonical_dir) {
            continue;
        }
        if let Ok(bytes) = fs::read(&canonical_icon) {
            let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
            return Some(format!("data:{};base64,{}", mime, b64));
        }
    }
    None
}

/// Inspect an unpacked extension directory and return structured metadata.
pub fn inspect_extension_dir(
    dir_path: &Path,
    explicit_id: Option<&str>,
) -> Result<ExtensionMetadata> {
    let canonical_dir = fs::canonicalize(dir_path)
        .with_context(|| format!("Extension directory not found: {}", dir_path.display()))?;
    let normalized_path = normalize_path_string(&canonical_dir);

    let manifest_path = canonical_dir.join("manifest.json");
    let manifest_raw = fs::read_to_string(&manifest_path)
        .with_context(|| format!("Failed to read {}", manifest_path.display()))?;
    let manifest: serde_json::Value = serde_json::from_str(strip_utf8_bom(&manifest_raw))
        .with_context(|| format!("Invalid JSON in {}", manifest_path.display()))?;

    let default_locale = manifest.get("default_locale").and_then(|v| v.as_str());
    let messages = load_locale_messages(&canonical_dir, default_locale);

    let raw_name = non_empty_str(manifest.get("name")).unwrap_or_default();
    let raw_desc = non_empty_str(manifest.get("description")).unwrap_or_default();
    let name = resolve_i18n_string(&raw_name, &messages);
    let description = resolve_i18n_string(&raw_desc, &messages);
    let version = non_empty_str(manifest.get("version")).unwrap_or_else(|| "0.0.0".to_string());
    let manifest_version = manifest
        .get("manifest_version")
        .and_then(|v| v.as_u64())
        .unwrap_or(2) as u32;

    let permissions = extract_string_array(manifest.get("permissions"));
    let host_permissions = extract_string_array(manifest.get("host_permissions"));
    let optional_permissions = extract_string_array(manifest.get("optional_permissions"));

    let popup_path = non_empty_str(manifest.get("action").and_then(|a| a.get("default_popup")))
        .or_else(|| {
            non_empty_str(
                manifest
                    .get("browser_action")
                    .and_then(|a| a.get("default_popup")),
            )
        })
        .or_else(|| {
            non_empty_str(
                manifest
                    .get("page_action")
                    .and_then(|a| a.get("default_popup")),
            )
        });

    let options_page = non_empty_str(manifest.get("options_ui").and_then(|o| o.get("page")))
        .or_else(|| non_empty_str(manifest.get("options_page")));

    let has_background = match manifest.get("background") {
        Some(serde_json::Value::Object(obj)) => !obj.is_empty(),
        Some(serde_json::Value::Bool(b)) => *b,
        _ => false,
    };

    let id = match explicit_id {
        Some(eid) => eid.to_string(),
        None => {
            let hash = Sha256::digest(normalized_path.as_bytes());
            bytes_to_crx_id(&hash[..16])?
        }
    };

    let icon_data_url = load_best_icon_data_url(&canonical_dir, &manifest);

    Ok(ExtensionMetadata {
        id,
        name,
        description,
        version,
        manifest_version,
        permissions,
        host_permissions,
        optional_permissions,
        popup_path,
        options_page,
        has_background,
        path: normalized_path,
        icon_data_url,
    })
}

fn sanitize_version_component(version: &str) -> Result<String> {
    let trimmed = version.trim();
    ensure!(
        !trimmed.is_empty()
            && !trimmed.contains("..")
            && !trimmed.contains('/')
            && !trimmed.contains('\\'),
        "Unsafe extension version string: {}",
        version
    );
    Ok(trimmed.to_string())
}

/// Download a Chrome Web Store CRX, verify its ID, safely unpack it, and return metadata.
pub async fn download_and_unpack_cws(
    ext_id: &str,
    chrome_version: &str,
    dest_root: &Path,
) -> Result<ExtensionMetadata> {
    ensure!(
        is_valid_crx_id(ext_id),
        "Invalid Chrome Web Store extension ID: {}",
        ext_id
    );

    let url = format!(
        "https://clients2.google.com/service/update2/crx?response=redirect&prodversion={}&acceptformat=crx2,crx3&x=id%3D{}%26uc",
        chrome_version, ext_id
    );
    let user_agent = format!(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{} Safari/537.36",
        chrome_version
    );

    let client = reqwest::Client::builder()
        .user_agent(user_agent)
        .build()
        .context("Failed to construct HTTP client")?;

    let resp = client
        .get(&url)
        .send()
        .await
        .with_context(|| format!("Failed to request CRX from {}", url))?;

    ensure!(
        resp.status().is_success(),
        "CWS download failed with HTTP {}",
        resp.status()
    );

    let bytes = resp.bytes().await?.to_vec();
    let (_, zip_offset) = parse_crx_payload(&bytes, Some(ext_id))?;

    let dest_root_buf = dest_root.to_path_buf();
    let ext_id_owned = ext_id.to_string();

    tokio::task::spawn_blocking(move || -> Result<ExtensionMetadata> {
        fs::create_dir_all(&dest_root_buf)?;
        let seq = STAGING_COUNTER.fetch_add(1, Ordering::Relaxed);
        let staging_dir = dest_root_buf.join(format!(
            ".staging-{}-{}-{}",
            ext_id_owned,
            std::process::id(),
            seq
        ));
        if staging_dir.exists() {
            let _ = fs::remove_dir_all(&staging_dir);
        }

        let unpack_res = (|| -> Result<PathBuf> {
            extract_zip_safely(&bytes[zip_offset..], &staging_dir)?;
            let staged_meta = inspect_extension_dir(&staging_dir, Some(&ext_id_owned))?;
            let safe_version = sanitize_version_component(&staged_meta.version)?;

            let ext_dir = dest_root_buf.join(&ext_id_owned);
            fs::create_dir_all(&ext_dir)?;
            let final_dir = ext_dir.join(&safe_version);
            if final_dir.exists() {
                fs::remove_dir_all(&final_dir)?;
            }
            fs::rename(&staging_dir, &final_dir)?;
            Ok(final_dir)
        })();

        match unpack_res {
            Ok(final_dir) => inspect_extension_dir(&final_dir, Some(&ext_id_owned)),
            Err(e) => {
                let _ = fs::remove_dir_all(&staging_dir);
                Err(e)
            }
        }
    })
    .await?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn encode_varint(mut v: u64, out: &mut Vec<u8>) {
        loop {
            let mut byte = (v & 0x7f) as u8;
            v >>= 7;
            if v != 0 {
                byte |= 0x80;
            }
            out.push(byte);
            if v == 0 {
                break;
            }
        }
    }

    fn encode_pb_bytes(field_num: u64, data: &[u8], out: &mut Vec<u8>) {
        encode_varint((field_num << 3) | 2, out);
        encode_varint(data.len() as u64, out);
        out.extend_from_slice(data);
    }

    fn build_synthetic_crx3(crx_id_bytes: &[u8; 16], zip_bytes: &[u8]) -> Vec<u8> {
        let mut signed_data = Vec::new();
        encode_pb_bytes(1, crx_id_bytes, &mut signed_data);

        let mut header = Vec::new();
        encode_pb_bytes(10000, &signed_data, &mut header);

        let mut crx = Vec::new();
        crx.extend_from_slice(b"Cr24");
        crx.extend_from_slice(&3u32.to_le_bytes());
        crx.extend_from_slice(&(header.len() as u32).to_le_bytes());
        crx.extend_from_slice(&header);
        crx.extend_from_slice(zip_bytes);
        crx
    }

    #[test]
    fn test_crx_id_nibble_encoding() {
        let bytes = [
            0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54,
            0x32, 0x10,
        ];
        let id = bytes_to_crx_id(&bytes).unwrap();
        assert_eq!(id, "abcdefghijklmnopponmlkjihgfedcba");
        assert!(is_valid_crx_id(&id));
    }

    #[test]
    fn test_synthetic_crx3_parse_unpack_i18n_and_icon() {
        // Build a synthetic ZIP with BOM manifest.json, _locales/en/messages.json, and 1x1 PNG icon
        let mut zip_buf = Vec::new();
        {
            let mut zw = zip::ZipWriter::new(Cursor::new(&mut zip_buf));
            let opts = zip::write::SimpleFileOptions::default();

            zw.start_file("manifest.json", opts).unwrap();
            let manifest = "\u{FEFF}{\
                \"manifest_version\": 3,\
                \"name\": \"__MSG_extName__\",\
                \"description\": \"__MSG_extDesc__\",\
                \"version\": \"1.2.3\",\
                \"default_locale\": \"en\",\
                \"permissions\": [\"storage\", \"tabs\"],\
                \"host_permissions\": [\"https://*/*\"],\
                \"optional_permissions\": [\"alarms\"],\
                \"action\": { \"default_popup\": \"popup.html\", \"default_icon\": { \"48\": \"icon48.png\" } },\
                \"options_ui\": { \"page\": \"options.html\" },\
                \"background\": { \"service_worker\": \"bg.js\" }\
            }";
            zw.write_all(manifest.as_bytes()).unwrap();

            zw.start_file("_locales/en/messages.json", opts).unwrap();
            zw.write_all(
                br#"{
                    "extname": { "message": "QBrowse Test Ext" },
                    "EXTDESC": { "message": "Resolves i18n keys" }
                }"#,
            )
            .unwrap();

            zw.start_file("icon48.png", opts).unwrap();
            zw.write_all(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
                .unwrap();

            zw.finish().unwrap();
        }

        let raw_id = [0xaa; 16];
        let expected_id = bytes_to_crx_id(&raw_id).unwrap(); // "k".repeat(32)
        let crx_bytes = build_synthetic_crx3(&raw_id, &zip_buf);

        let (derived_id, zip_offset) =
            parse_crx_payload(&crx_bytes, Some(&expected_id)).unwrap();
        assert_eq!(derived_id.as_deref(), Some(expected_id.as_str()));

        let temp_dir = std::env::temp_dir().join(format!(
            "qbrowse_ext_test_{}_{}",
            std::process::id(),
            STAGING_COUNTER.fetch_add(1, Ordering::Relaxed)
        ));
        extract_zip_safely(&crx_bytes[zip_offset..], &temp_dir).unwrap();

        let meta = inspect_extension_dir(&temp_dir, Some(&expected_id)).unwrap();
        assert_eq!(meta.id, expected_id);
        assert_eq!(meta.name, "QBrowse Test Ext");
        assert_eq!(meta.description, "Resolves i18n keys");
        assert_eq!(meta.version, "1.2.3");
        assert_eq!(meta.manifest_version, 3);
        assert_eq!(meta.permissions, vec!["storage", "tabs"]);
        assert_eq!(meta.host_permissions, vec!["https://*/*"]);
        assert_eq!(meta.optional_permissions, vec!["alarms"]);
        assert_eq!(meta.popup_path.as_deref(), Some("popup.html"));
        assert_eq!(meta.options_page.as_deref(), Some("options.html"));
        assert!(meta.has_background);
        assert!(!meta.path.starts_with(r"\\?\"));
        assert!(meta
            .icon_data_url
            .as_deref()
            .unwrap_or("")
            .starts_with("data:image/png;base64,"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_zip_slip_rejection() {
        let mut zip_buf = Vec::new();
        {
            let mut zw = zip::ZipWriter::new(Cursor::new(&mut zip_buf));
            let opts = zip::write::SimpleFileOptions::default();
            zw.start_file("../../evil.txt", opts).unwrap();
            zw.write_all(b"pwned").unwrap();
            zw.finish().unwrap();
        }

        let temp_dir = std::env::temp_dir().join(format!(
            "qbrowse_zipslip_test_{}_{}",
            std::process::id(),
            STAGING_COUNTER.fetch_add(1, Ordering::Relaxed)
        ));
        let res = extract_zip_safely(&zip_buf, &temp_dir);
        assert!(res.is_err(), "Zip-Slip path should be rejected");
        let _ = fs::remove_dir_all(&temp_dir);
    }
}

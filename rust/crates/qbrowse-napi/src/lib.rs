use napi::bindgen_prelude::*;
use napi_derive::napi;
use once_cell::sync::Lazy;
use parking_lot::{Mutex, RwLock};
use serde_json::Value;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

static STORAGE: Lazy<RwLock<Option<Arc<qbrowse_storage::StorageEngine>>>> =
    Lazy::new(|| RwLock::new(None));
static SHIELD: Lazy<Arc<qbrowse_shield::ShieldEngine>> =
    Lazy::new(|| Arc::new(qbrowse_shield::ShieldEngine::new()));
static VAULT_SESSION: Lazy<Mutex<qbrowse_vault::VaultSession>> =
    Lazy::new(|| Mutex::new(qbrowse_vault::VaultSession::new()));
static AI_DOWNLOAD_PROGRESS: Lazy<Arc<dashmap::DashMap<String, qbrowse_ai::DownloadProgress>>> =
    Lazy::new(|| Arc::new(dashmap::DashMap::new()));
static AI_DOWNLOAD_CANCELS: Lazy<dashmap::DashMap<String, Arc<AtomicBool>>> =
    Lazy::new(|| dashmap::DashMap::new());

fn to_napi_err(err: impl std::fmt::Display) -> Error {
    Error::from_reason(err.to_string())
}

fn get_storage() -> Result<Arc<qbrowse_storage::StorageEngine>> {
    STORAGE
        .read()
        .as_ref()
        .cloned()
        .ok_or_else(|| Error::from_reason("StorageEngine not initialized. Call storageInit first."))
}

#[napi]
pub fn version() -> String {
    format!(
        "qbrowse-core {} ({})",
        env!("CARGO_PKG_VERSION"),
        [
            qbrowse_storage::ping(),
            qbrowse_sync::ping(),
            "qbrowse-shield",
            "qbrowse-reader",
            "qbrowse-github",
            qbrowse_vault::ping(),
            qbrowse_media::ping(),
            qbrowse_sys::ping(),
            qbrowse_ai::ping(),
            qbrowse_tor::ping(),
            qbrowse_extensions::ping(),
        ]
        .join(", ")
    )
}

// ==================== STORAGE & HISTORY & PERMISSIONS & BANGS ====================

#[napi]
pub fn storage_init(db_path: String, legacy_permissions_json: Option<String>) -> Result<bool> {
    let legacy_path = legacy_permissions_json.as_deref().map(Path::new);
    let engine = qbrowse_storage::StorageEngine::open(&db_path, legacy_path).map_err(to_napi_err)?;
    *STORAGE.write() = Some(Arc::new(engine));
    Ok(true)
}

#[napi]
pub fn storage_record_visit(
    url: String,
    title: String,
    space_id: String,
    timestamp_ms: Option<f64>,
) -> Result<Option<Value>> {
    let engine = get_storage()?;
    let ts = timestamp_ms.map(|v| v as i64).unwrap_or_else(|| chrono::Utc::now().timestamp_millis());
    let entry = engine
        .record_visit(&url, &title, &space_id, ts)
        .map_err(to_napi_err)?;
    entry
        .map(|e| serde_json::to_value(e).map_err(to_napi_err))
        .transpose()
}

#[napi]
pub fn storage_search_history(
    query: String,
    limit: Option<u32>,
    space_id: Option<String>,
) -> Result<Value> {
    let engine = get_storage()?;
    let items = engine
        .search_history(&query, limit.unwrap_or(20) as usize, space_id.as_deref())
        .map_err(to_napi_err)?;
    serde_json::to_value(items).map_err(to_napi_err)
}

#[napi]
pub fn storage_list_history(
    offset: Option<u32>,
    limit: Option<u32>,
    space_id: Option<String>,
    search: Option<String>,
) -> Result<Value> {
    let engine = get_storage()?;
    let items = engine
        .list_history(
            offset.unwrap_or(0) as usize,
            limit.unwrap_or(200) as usize,
            space_id.as_deref(),
            search.as_deref(),
        )
        .map_err(to_napi_err)?;
    serde_json::to_value(items).map_err(to_napi_err)
}

#[napi]
pub fn storage_delete_history_item(id: String) -> Result<bool> {
    let engine = get_storage()?;
    let id_num: i64 = id.parse().map_err(to_napi_err)?;
    engine.delete_history_item(id_num).map_err(to_napi_err)
}

#[napi]
pub fn storage_delete_history_range(
    from_ms: f64,
    to_ms: f64,
    space_id: Option<String>,
) -> Result<u32> {
    let engine = get_storage()?;
    let count = engine
        .delete_history_range(from_ms as i64, to_ms as i64, space_id.as_deref())
        .map_err(to_napi_err)?;
    Ok(count as u32)
}

#[napi]
pub fn storage_clear_history(space_id: Option<String>) -> Result<u32> {
    let engine = get_storage()?;
    let count = engine
        .clear_history(space_id.as_deref())
        .map_err(to_napi_err)?;
    Ok(count as u32)
}

#[napi]
pub fn storage_import_legacy_history(items_json: Value) -> Result<u32> {
    let engine = get_storage()?;
    let raw_json = serde_json::to_string(&items_json).map_err(to_napi_err)?;
    let count = engine.import_legacy_history(&raw_json).map_err(to_napi_err)?;
    Ok(count as u32)
}

#[napi]
pub fn storage_extract_rich_meta(url: String, title: String) -> Result<Value> {
    let meta = qbrowse_storage::extract_rich_history_meta(&url, &title);
    serde_json::to_value(meta).map_err(to_napi_err)
}

#[napi]
pub fn permission_check(partition_key: String, origin_or_url: String, permission: String) -> Result<bool> {
    let engine = get_storage()?;
    Ok(engine.check_permission(&partition_key, &origin_or_url, &permission))
}

#[napi]
pub fn permission_set(
    partition_key: String,
    origin_or_url: String,
    permission: String,
    decision: String,
) -> Result<bool> {
    let engine = get_storage()?;
    engine
        .set_permission(&partition_key, &origin_or_url, &permission, &decision)
        .map_err(to_napi_err)
}

#[napi]
pub fn permission_list(partition_key: String, origin: Option<String>) -> Result<Value> {
    let engine = get_storage()?;
    let items = engine
        .list_permissions(&partition_key, origin.as_deref())
        .map_err(to_napi_err)?;
    serde_json::to_value(items).map_err(to_napi_err)
}

#[napi]
pub fn permission_reset_origin(partition_key: String, origin_or_url: String) -> Result<bool> {
    let engine = get_storage()?;
    engine
        .reset_origin(&partition_key, &origin_or_url)
        .map_err(to_napi_err)
}

#[napi]
pub fn permission_clear_partition(partition_key: String) -> Result<u32> {
    let engine = get_storage()?;
    let count = engine.clear_partition(&partition_key).map_err(to_napi_err)?;
    Ok(count as u32)
}

#[napi]
pub fn storage_get_setting(key: String) -> Result<Option<String>> {
    let engine = get_storage()?;
    Ok(engine.get_setting(&key))
}

#[napi]
pub fn storage_set_setting(key: String, value: String) -> Result<bool> {
    let engine = get_storage()?;
    engine.set_setting(&key, &value).map_err(to_napi_err)?;
    Ok(true)
}

#[napi]
pub fn storage_get_all_settings() -> Result<Value> {
    let engine = get_storage()?;
    serde_json::to_value(engine.get_all_settings()).map_err(to_napi_err)
}

#[napi]
pub fn storage_bulk_set_settings(entries: HashMap<String, String>) -> Result<bool> {
    let engine = get_storage()?;
    engine.bulk_set_settings(&entries).map_err(to_napi_err)?;
    Ok(true)
}

#[napi]
pub fn storage_get_annotations(url: String, space_id: String) -> Result<Option<String>> {
    let engine = get_storage()?;
    engine.get_annotations(&url, &space_id).map_err(to_napi_err)
}

#[napi]
pub fn storage_save_annotations(url: String, space_id: String, data_json: String) -> Result<bool> {
    let engine = get_storage()?;
    engine
        .save_annotations(&url, &space_id, &data_json)
        .map_err(to_napi_err)?;
    Ok(true)
}

#[napi]
pub fn storage_delete_annotation(url: String, space_id: String) -> Result<bool> {
    let engine = get_storage()?;
    engine.delete_annotation(&url, &space_id).map_err(to_napi_err)
}

#[napi]
pub fn bangs_resolve(input: String, custom_bangs_json: Option<String>) -> Result<Option<Value>> {
    let res = qbrowse_storage::resolve_bang(&input, custom_bangs_json.as_deref());
    res.map(|v| serde_json::to_value(v).map_err(to_napi_err)).transpose()
}

#[napi]
pub fn bangs_suggest(
    prefix: String,
    limit: Option<u32>,
    custom_bangs_json: Option<String>,
) -> Result<Value> {
    let res = qbrowse_storage::suggest_bangs(
        &prefix,
        limit.unwrap_or(10) as usize,
        custom_bangs_json.as_deref(),
    );
    serde_json::to_value(res).map_err(to_napi_err)
}

#[napi]
pub fn bookmarks_import_json(content: String) -> Result<Value> {
    let res = qbrowse_storage::import_bookmarks_json(&content).map_err(to_napi_err)?;
    serde_json::to_value(res).map_err(to_napi_err)
}

#[napi]
pub fn bookmarks_import_html(content: String) -> Result<Value> {
    let res = qbrowse_storage::import_bookmarks_html(&content).map_err(to_napi_err)?;
    serde_json::to_value(res).map_err(to_napi_err)
}

// ==================== CLOUD SYNC CRYPTO ====================

#[napi]
pub async fn sync_encrypt_v2(passphrase: String, plaintext_json: String) -> Result<Value> {
    tokio::task::spawn_blocking(move || {
        let env = qbrowse_sync::encrypt_v2(&passphrase, &plaintext_json).map_err(to_napi_err)?;
        serde_json::to_value(env).map_err(to_napi_err)
    })
    .await
    .map_err(to_napi_err)?
}

#[napi]
pub async fn sync_encrypt_v1(passphrase: String, plaintext_json: String) -> Result<Value> {
    tokio::task::spawn_blocking(move || {
        let env = qbrowse_sync::encrypt_v1(&passphrase, &plaintext_json).map_err(to_napi_err)?;
        serde_json::to_value(env).map_err(to_napi_err)
    })
    .await
    .map_err(to_napi_err)?
}

#[napi]
pub async fn sync_decrypt(
    passphrase: String,
    salt_hex: String,
    iv_hex: String,
    cipher_hex: String,
) -> Result<String> {
    tokio::task::spawn_blocking(move || {
        qbrowse_sync::decrypt_v1_or_v2(&passphrase, &salt_hex, &iv_hex, &cipher_hex)
            .map_err(to_napi_err)
    })
    .await
    .map_err(to_napi_err)?
}

#[napi]
pub fn sync_blake3_hash(data: String) -> String {
    qbrowse_sync::blake3_hash_str(&data)
}

// ==================== SHIELD / ADBLOCK / HEADERS / DARK MODE ====================

#[napi]
pub fn shield_set_active(active: bool) {
    SHIELD.set_active(active);
}

#[napi]
pub fn shield_is_active() -> bool {
    SHIELD.is_active()
}

#[napi]
pub fn shield_set_cname_uncloaking(enabled: bool) {
    SHIELD.set_cname_uncloaking(enabled);
}

#[napi]
pub fn shield_set_offline_mode(enabled: bool) {
    SHIELD.set_offline_mode(enabled);
}

#[napi]
pub fn shield_set_cosmetic_enabled(enabled: bool) {
    SHIELD.set_cosmetic_enabled(enabled);
}

#[napi]
pub fn shield_cname_uncloaked_count() -> u32 {
    SHIELD.cname_uncloaked_count() as u32
}

#[napi]
pub fn shield_set_tab_context(
    web_contents_id: u32,
    top_url: String,
    space_id: Option<String>,
    paused: bool,
) {
    SHIELD.set_tab_context(web_contents_id, &top_url, space_id, paused);
}

#[napi]
pub fn shield_remove_tab_context(web_contents_id: u32) {
    SHIELD.remove_tab_context(web_contents_id);
}

#[napi]
pub fn shield_set_paused_domains(domains: Vec<String>) {
    SHIELD.set_paused_domains(domains);
}

#[napi]
pub fn shield_set_custom_rules(rules: Vec<String>) {
    SHIELD.set_custom_rules(rules);
}

#[napi]
pub fn shield_set_http_exceptions(exceptions: Vec<String>) {
    SHIELD.set_http_exceptions(exceptions);
}

#[napi]
pub fn shield_set_dark_mode_exclusions(patterns: Vec<String>) {
    SHIELD.set_dark_mode_exclusions(patterns);
}

#[napi]
pub fn shield_load_cache(path: String) -> Result<bool> {
    SHIELD.load_cache(Path::new(&path)).map_err(to_napi_err)?;
    Ok(true)
}

#[napi]
pub fn shield_save_cache_atomic(path: String) -> Result<u32> {
    let bytes = SHIELD.save_cache_atomic(Path::new(&path)).map_err(to_napi_err)?;
    Ok(bytes as u32)
}

#[napi]
pub async fn shield_update_filter_lists(urls: Vec<String>) -> Result<Value> {
    let res = SHIELD.update_filter_lists(&urls).await;
    serde_json::to_value(res).map_err(to_napi_err)
}

#[napi]
pub fn shield_check_request(
    web_contents_id: u32,
    url: String,
    source_url: Option<String>,
    resource_type: String,
) -> Result<Value> {
    let res = SHIELD.check_request(web_contents_id, &url, source_url.as_deref(), &resource_type);
    serde_json::to_value(res).map_err(to_napi_err)
}

#[napi]
pub fn shield_get_cosmetic_resources(url: String) -> Result<Value> {
    let res = SHIELD.get_cosmetic_resources(&url);
    serde_json::to_value(res).map_err(to_napi_err)
}

#[napi]
pub fn shield_check_https_upgrade(
    url: String,
    https_only_enabled: bool,
    http_exceptions: Option<Vec<String>>,
) -> Option<String> {
    let exceptions = http_exceptions.unwrap_or_default();
    SHIELD.check_https_upgrade(&url, https_only_enabled, &exceptions)
}

#[napi]
pub fn shield_evaluate_request_headers(
    web_contents_id: u32,
    url: String,
    headers_json: String,
    strip_3p_cookies: bool,
    strip_fp_headers: bool,
    send_dnt: bool,
) -> Result<String> {
    SHIELD
        .evaluate_request_headers(
            web_contents_id,
            &url,
            &headers_json,
            strip_3p_cookies,
            strip_fp_headers,
            send_dnt,
        )
        .map_err(to_napi_err)
}

#[napi]
pub fn shield_evaluate_response_headers(
    web_contents_id: u32,
    url: String,
    resource_type: String,
    headers_json: String,
    strip_3p_cookies: bool,
    dialog_port: Option<u16>,
) -> Result<String> {
    SHIELD
        .evaluate_response_headers(
            web_contents_id,
            &url,
            &resource_type,
            &headers_json,
            strip_3p_cookies,
            dialog_port,
        )
        .map_err(to_napi_err)
}

#[napi]
pub fn shield_is_dark_excluded(url: String, custom_patterns: Option<Vec<String>>) -> bool {
    let patterns = custom_patterns.unwrap_or_default();
    SHIELD.is_dark_excluded(&url, &patterns)
}

// ==================== READER MODE & GITHUB WORK MODE ====================

#[napi]
pub fn reader_extract_article(html: String, base_url: String) -> Result<Value> {
    let article = qbrowse_reader::extract_reader_article(&html, &base_url).map_err(to_napi_err)?;
    serde_json::to_value(article).map_err(to_napi_err)
}

#[napi]
pub fn reader_check_is_article(html: String, url: String) -> bool {
    qbrowse_reader::check_is_article(&html, &url)
}

#[napi]
pub async fn github_fetch_dashboard(
    mode: String,
    token_or_cookie: Option<String>,
    username: Option<String>,
    filter_repo: Option<String>,
) -> Result<Value> {
    let auth_mode = match mode.to_lowercase().as_str() {
        "token" => qbrowse_github::GitHubAuthMode::Token,
        "session" => qbrowse_github::GitHubAuthMode::Session,
        _ => qbrowse_github::GitHubAuthMode::Public,
    };
    let dash = qbrowse_github::fetch_github_dashboard(
        auth_mode,
        token_or_cookie.as_deref(),
        username.as_deref(),
        filter_repo.as_deref(),
    )
    .await;
    serde_json::to_value(dash).map_err(to_napi_err)
}

// ==================== VAULT / TOTP / PASSKEYS / WINDOWS HELLO ====================

#[napi]
pub fn vault_unlock_with_password(vault_json: String, password: String) -> Result<Value> {
    let mut vault: qbrowse_vault::VaultFile = serde_json::from_str(&vault_json).map_err(to_napi_err)?;
    let mut session = VAULT_SESSION.lock();
    let items = session
        .unlock_with_password(&mut vault, &password)
        .map_err(to_napi_err)?;
    Ok(serde_json::json!({
        "items": items,
        "vault": vault,
    }))
}

#[napi]
pub fn vault_lock() -> bool {
    VAULT_SESSION.lock().lock_vault();
    true
}

#[napi]
pub fn vault_is_unlocked() -> bool {
    VAULT_SESSION.lock().is_unlocked()
}

#[napi]
pub fn vault_setup_pin(vault_json: String, pin: String) -> Result<Value> {
    let mut vault: qbrowse_vault::VaultFile = serde_json::from_str(&vault_json).map_err(to_napi_err)?;
    let session = VAULT_SESSION.lock();
    session.setup_pin(&mut vault, &pin).map_err(to_napi_err)?;
    serde_json::to_value(vault).map_err(to_napi_err)
}

#[napi]
pub fn vault_unlock_with_pin(vault_json: String, pin: String, now_ms: Option<f64>) -> Result<Value> {
    let mut vault: qbrowse_vault::VaultFile = serde_json::from_str(&vault_json).map_err(to_napi_err)?;
    let mut session = VAULT_SESSION.lock();
    let now = now_ms.map(|v| v as u64).unwrap_or_else(|| chrono::Utc::now().timestamp_millis() as u64);
    let res = session.unlock_with_pin(&mut vault, &pin, now);
    serde_json::to_value(res).map_err(to_napi_err)
}

#[napi]
pub fn vault_encrypt_with_session(plaintext: String) -> Result<String> {
    let session = VAULT_SESSION.lock();
    let key = session
        .master_key()
        .ok_or_else(|| Error::from_reason("Vault is locked"))?;
    qbrowse_vault::encrypt(&plaintext, key).map_err(to_napi_err)
}

#[napi]
pub fn vault_decrypt_with_session(payload: String) -> Result<Option<String>> {
    let session = VAULT_SESSION.lock();
    let key = session
        .master_key()
        .ok_or_else(|| Error::from_reason("Vault is locked"))?;
    Ok(qbrowse_vault::safe_decrypt(&payload, key))
}

#[napi]
pub fn vault_pack_item_title(title: String, meta_json: Value) -> Result<String> {
    let meta: qbrowse_vault::VaultItemMeta = serde_json::from_value(meta_json).map_err(to_napi_err)?;
    Ok(qbrowse_vault::pack_vault_item_title(&title, &meta))
}

#[napi]
pub fn vault_generate_passkey(alg: Option<String>) -> Result<Value> {
    let algorithm = match alg.as_deref().unwrap_or("ES256").to_uppercase().as_str() {
        "EDDSA" | "ED25519" | "-8" => qbrowse_vault::PasskeyAlgorithm::EdDsa,
        _ => qbrowse_vault::PasskeyAlgorithm::Es256,
    };
    let generated = qbrowse_vault::generate_passkey(algorithm).map_err(to_napi_err)?;
    serde_json::to_value(generated).map_err(to_napi_err)
}

#[napi]
pub fn vault_sign_passkey_assertion(
    private_key_pem_or_jwk: String,
    authenticator_data: Buffer,
    client_data_hash: Buffer,
) -> Result<Buffer> {
    let sig = qbrowse_vault::sign_passkey_assertion(
        &private_key_pem_or_jwk,
        &authenticator_data,
        &client_data_hash,
    )
    .map_err(to_napi_err)?;
    Ok(Buffer::from(sig))
}

#[napi]
pub fn vault_generate_totp(secret_or_uri: String) -> Result<Value> {
    let now_ms = chrono::Utc::now().timestamp_millis() as u64;
    let parsed = qbrowse_vault::parse_otpauth_uri(&secret_or_uri);
    let period = parsed.as_ref().map(|p| p.period).filter(|&p| p > 0).unwrap_or(30);
    let digits = parsed.as_ref().map(|p| p.digits).filter(|&d| d > 0).unwrap_or(6);
    let algo = parsed
        .as_ref()
        .map(|p| qbrowse_vault::totp::TotpAlgorithm::parse(&p.algorithm))
        .unwrap_or(qbrowse_vault::totp::TotpAlgorithm::Sha1);
    let code = qbrowse_vault::generate_totp(&secret_or_uri, now_ms, period, digits, algo)
        .map_err(to_napi_err)?;
    let remaining = qbrowse_vault::get_totp_remaining_seconds(now_ms, period);
    Ok(serde_json::json!({
        "code": code,
        "remainingSeconds": remaining,
        "period": period,
        "issuer": parsed.as_ref().map(|p| p.issuer.clone()).unwrap_or_default(),
        "account": parsed.as_ref().map(|p| p.account.clone()).unwrap_or_default(),
    }))
}

#[napi]
pub fn vault_import_data(content: String, filename: String) -> Result<Value> {
    let res = qbrowse_vault::import_vault_data(&content, &filename);
    serde_json::to_value(res).map_err(to_napi_err)
}

#[napi]
pub async fn vault_check_windows_hello() -> Result<Value> {
    let available = qbrowse_vault::check_windows_hello_available().await;
    Ok(serde_json::json!({ "available": available }))
}

#[napi]
pub async fn vault_verify_windows_hello(message: String, hwnd: Option<i64>) -> Result<Value> {
    let hwnd_opt = hwnd.filter(|&h| h != 0).map(|h| h as isize);
    let res = qbrowse_vault::verify_windows_hello(&message, hwnd_opt).await;
    serde_json::to_value(res).map_err(to_napi_err)
}

#[napi]
pub async fn vault_dpapi_protect(secret: String) -> Result<String> {
    use base64::Engine as _;
    let protected = qbrowse_vault::dpapi_protect_local_user(secret.as_bytes())
        .await
        .map_err(to_napi_err)?;
    Ok(base64::engine::general_purpose::STANDARD.encode(protected))
}

#[napi]
pub async fn vault_dpapi_unprotect(protected_b64: String) -> Result<String> {
    use base64::Engine as _;
    let raw = base64::engine::general_purpose::STANDARD
        .decode(protected_b64.trim())
        .map_err(to_napi_err)?;
    let unprotected = qbrowse_vault::dpapi_unprotect_local_user(&raw)
        .await
        .map_err(to_napi_err)?;
    String::from_utf8(unprotected).map_err(to_napi_err)
}

// ==================== MEDIA / LOCAL FILES / GIF / THUMBNAILS ====================

#[napi]
pub async fn media_list_directory(dir_path: String) -> Result<Value> {
    tokio::task::spawn_blocking(move || {
        let items = qbrowse_media::list_directory(&dir_path).map_err(to_napi_err)?;
        serde_json::to_value(items).map_err(to_napi_err)
    })
    .await
    .map_err(to_napi_err)?
}

#[napi]
pub fn media_autocomplete_path(prefix: String, limit: Option<u32>) -> Result<Value> {
    let items = qbrowse_media::autocomplete_path(&prefix, limit.unwrap_or(10) as usize);
    serde_json::to_value(items).map_err(to_napi_err)
}

#[napi]
pub async fn media_probe_local_file(file_path: String) -> Result<Value> {
    tokio::task::spawn_blocking(move || {
        let probe = qbrowse_media::probe_local_file(&file_path).map_err(to_napi_err)?;
        serde_json::to_value(probe).map_err(to_napi_err)
    })
    .await
    .map_err(to_napi_err)?
}

#[napi]
pub async fn media_read_file_range(
    file_path: String,
    range_header: Option<String>,
    max_chunk_bytes: Option<u32>,
) -> Result<Value> {
    tokio::task::spawn_blocking(move || {
        let resp = qbrowse_media::read_file_range(
            &file_path,
            range_header.as_deref(),
            max_chunk_bytes.unwrap_or(1024 * 1024) as usize,
        )
        .map_err(to_napi_err)?;
        Ok(serde_json::json!({
            "status": resp.status,
            "contentType": resp.content_type,
            "contentRange": resp.content_range,
            "totalSize": resp.total_size,
            "dataBase64": "",
            "bytes": resp.bytes,
        }))
    })
    .await
    .map_err(to_napi_err)?
}

#[napi(object)]
pub struct MediaRangeChunk {
    pub status: u16,
    pub content_type: String,
    pub content_range: Option<String>,
    pub total_size: f64,
    pub bytes: Buffer,
}

#[napi]
pub async fn media_read_file_range_buffer(
    file_path: String,
    range_header: Option<String>,
    max_chunk_bytes: Option<u32>,
) -> Result<MediaRangeChunk> {
    tokio::task::spawn_blocking(move || {
        let resp = qbrowse_media::read_file_range(
            &file_path,
            range_header.as_deref(),
            max_chunk_bytes.unwrap_or(1024 * 1024) as usize,
        )
        .map_err(to_napi_err)?;
        Ok(MediaRangeChunk {
            status: resp.status,
            content_type: resp.content_type,
            content_range: resp.content_range,
            total_size: resp.total_size as f64,
            bytes: Buffer::from(resp.bytes),
        })
    })
    .await
    .map_err(to_napi_err)?
}

#[napi]
pub fn media_parse_gif_info(bytes: Buffer) -> Result<Option<Value>> {
    let info = qbrowse_media::parse_gif_info(&bytes);
    info.map(|v| serde_json::to_value(v).map_err(to_napi_err))
        .transpose()
}

#[napi]
pub fn media_strip_gif_loop(bytes: Buffer) -> Buffer {
    Buffer::from(qbrowse_media::strip_gif_loop(&bytes))
}

#[napi]
pub async fn media_hash_file(file_path: String, algo: String) -> Result<String> {
    tokio::task::spawn_blocking(move || {
        let a = match algo.to_lowercase().as_str() {
            "sha512" => qbrowse_media::HashAlgo::Sha512,
            "blake3" => qbrowse_media::HashAlgo::Blake3,
            _ => qbrowse_media::HashAlgo::Sha256,
        };
        qbrowse_media::hash_file(&file_path, a).map_err(to_napi_err)
    })
    .await
    .map_err(to_napi_err)?
}

#[napi]
pub async fn media_save_tab_thumbnail(
    thumbnails_dir: String,
    tab_id: String,
    image_bytes: Buffer,
) -> Result<String> {
    let bytes = image_bytes.to_vec();
    tokio::task::spawn_blocking(move || {
        qbrowse_media::save_tab_thumbnail(&thumbnails_dir, &tab_id, &bytes).map_err(to_napi_err)
    })
    .await
    .map_err(to_napi_err)?
}

// ==================== SYSTEM / WIN32 / LINUX UPDATER / TELEMETRY ====================

#[napi]
pub fn sys_set_window_rounded_corners(hwnd_isize: i64, preference: Either<u32, bool>) -> bool {
    let pref = match preference {
        Either::A(code) => code,
        Either::B(enabled) => if enabled { 2 } else { 1 },
    };
    qbrowse_sys::set_window_rounded_corners(hwnd_isize as isize, pref).is_ok()
}

#[napi]
pub fn sys_is_reduced_motion_enabled() -> bool {
    qbrowse_sys::is_reduced_motion_enabled()
}

#[napi]
pub fn sys_check_default_browser() -> Result<Value> {
    let st = qbrowse_sys::check_default_browser();
    serde_json::to_value(st).map_err(to_napi_err)
}

#[napi]
pub fn sys_register_default_browser(exe_path: String) -> Result<bool> {
    qbrowse_sys::register_default_browser_hkcu(&exe_path).map_err(to_napi_err)?;
    Ok(true)
}

#[napi]
pub fn sys_parse_latest_yml(yaml_str: String) -> Result<Value> {
    let parsed = qbrowse_sys::parse_latest_yml(&yaml_str).map_err(to_napi_err)?;
    serde_json::to_value(parsed).map_err(to_napi_err)
}

#[napi]
pub fn sys_compare_semver(a: String, b: String) -> i32 {
    qbrowse_sys::compare_semver(&a, &b)
}

#[napi]
pub fn sys_get_process_telemetry() -> Result<Value> {
    let tel = qbrowse_sys::get_process_telemetry();
    serde_json::to_value(tel).map_err(to_napi_err)
}

#[napi]
pub fn sys_linux_normalize_arch(arch: String) -> String {
    qbrowse_sys::normalize_linux_arch(&arch)
}

#[napi]
pub fn sys_linux_metadata_filename(arch: String) -> String {
    qbrowse_sys::get_linux_metadata_file_name(&arch)
}

#[napi]
pub fn sys_linux_detect_asset_arch(filename: String) -> Option<String> {
    qbrowse_sys::detect_asset_arch(&filename)
}

#[napi]
pub fn sys_linux_is_non_package_artifact(filename: String) -> bool {
    qbrowse_sys::is_non_package_artifact(&filename)
}

#[napi]
pub fn sys_linux_sanitize_filename(filename: String, fallback: Option<String>) -> String {
    qbrowse_sys::sanitize_update_file_name(&filename, fallback.as_deref().unwrap_or("update"))
}

#[napi]
pub fn sys_linux_select_release_asset(
    assets_json: Value,
    install_type: String,
    arch: String,
    latest_yml_json: Option<Value>,
) -> Result<Option<Value>> {
    let assets: Vec<qbrowse_sys::ReleaseAsset> =
        serde_json::from_value(assets_json).map_err(to_napi_err)?;
    let yml: Option<qbrowse_sys::LatestYml> = latest_yml_json
        .map(serde_json::from_value)
        .transpose()
        .map_err(to_napi_err)?;
    let sel = qbrowse_sys::select_linux_release_asset(&assets, &install_type, &arch, yml.as_ref());
    sel.map(|s| serde_json::to_value(s).map_err(to_napi_err))
        .transpose()
}

#[napi]
pub fn sys_linux_build_install_command(
    install_type: String,
    file_path: String,
    distro_id: Option<String>,
    distro_like: Option<String>,
) -> String {
    qbrowse_sys::build_linux_install_command(
        &install_type,
        &file_path,
        distro_id.as_deref(),
        distro_like.as_deref(),
    )
}

#[napi]
pub async fn sys_linux_verify_sha512(file_path: String, expected_sha512: String) -> Result<bool> {
    tokio::task::spawn_blocking(move || {
        qbrowse_sys::verify_file_sha512(Path::new(&file_path), &expected_sha512).map_err(to_napi_err)
    })
    .await
    .map_err(to_napi_err)?
}

#[napi]
pub async fn sys_linux_replace_appimage(
    downloaded_path: String,
    target_path: String,
) -> Result<bool> {
    tokio::task::spawn_blocking(move || {
        qbrowse_sys::replace_appimage_atomically(&downloaded_path, &target_path, None)
            .map_err(to_napi_err)?;
        Ok(true)
    })
    .await
    .map_err(to_napi_err)?
}

// ==================== AI (PDF / DOCX / OCR / DOWNLOAD / ARCHIVE / RAG) ====================

#[napi]
pub async fn ai_extract_pdf_text(file_path: String, max_pages: Option<u32>) -> Result<Value> {
    tokio::task::spawn_blocking(move || {
        let res = qbrowse_ai::extract_pdf_text_from_path(Path::new(&file_path), max_pages)
            .map_err(to_napi_err)?;
        serde_json::to_value(res).map_err(to_napi_err)
    })
    .await
    .map_err(to_napi_err)?
}

#[napi]
pub async fn ai_extract_docx_text(file_path: String) -> Result<String> {
    tokio::task::spawn_blocking(move || {
        qbrowse_ai::extract_docx_text_from_path(Path::new(&file_path)).map_err(to_napi_err)
    })
    .await
    .map_err(to_napi_err)?
}

#[napi]
pub async fn ai_ocr_image(file_path: String, lang_hint: Option<String>) -> Result<Value> {
    tokio::task::spawn_blocking(move || {
        let res = qbrowse_ai::ocr_image_from_path(Path::new(&file_path), lang_hint.as_deref())
            .map_err(to_napi_err)?;
        serde_json::to_value(res).map_err(to_napi_err)
    })
    .await
    .map_err(to_napi_err)?
}

#[napi]
pub async fn ai_download_file_resumable(
    url: String,
    dest_path: String,
    task_id: String,
) -> Result<Value> {
    let cancel = Arc::new(AtomicBool::new(false));
    AI_DOWNLOAD_CANCELS.insert(task_id.clone(), cancel.clone());
    let progress = AI_DOWNLOAD_PROGRESS.clone();
    let res = qbrowse_ai::download_file_resumable(
        &url,
        Path::new(&dest_path),
        &task_id,
        &progress,
        Some(cancel),
    )
    .await
    .map_err(to_napi_err)?;
    AI_DOWNLOAD_CANCELS.remove(&task_id);
    serde_json::to_value(res).map_err(to_napi_err)
}

#[napi]
pub fn ai_get_download_progress(task_id: String) -> Result<Option<Value>> {
    AI_DOWNLOAD_PROGRESS
        .get(&task_id)
        .map(|v| serde_json::to_value(v.value()).map_err(to_napi_err))
        .transpose()
}

#[napi]
pub fn ai_cancel_download(task_id: String) -> bool {
    if let Some(flag) = AI_DOWNLOAD_CANCELS.get(&task_id) {
        flag.store(true, std::sync::atomic::Ordering::SeqCst);
        return true;
    }
    false
}

#[napi]
pub async fn ai_extract_archive_safe(archive_path: String, dest_dir: String) -> Result<u32> {
    tokio::task::spawn_blocking(move || {
        let extracted =
            qbrowse_ai::extract_archive_safe(Path::new(&archive_path), Path::new(&dest_dir))
                .map_err(to_napi_err)?;
        Ok(extracted.len() as u32)
    })
    .await
    .map_err(to_napi_err)?
}

#[napi]
pub fn ai_find_matching_mmproj(dir_path: String, model_filename: String) -> Option<String> {
    qbrowse_ai::find_matching_mmproj(Path::new(&dir_path), &model_filename)
        .map(|p| p.to_string_lossy().into_owned())
}

#[napi]
pub async fn ai_check_llama_health(port: u16) -> Result<bool> {
    qbrowse_ai::check_llama_health(port).await.map_err(to_napi_err)
}

#[napi]
pub async fn ai_search_web_ddg(query: String, max_results: Option<u32>) -> Result<Value> {
    let items = qbrowse_ai::search_web_ddg(&query, max_results.unwrap_or(5) as usize)
        .await
        .map_err(to_napi_err)?;
    serde_json::to_value(items).map_err(to_napi_err)
}

// ==================== TOR CONTROL / SOCKS5 / BUNDLE ====================

#[napi]
pub async fn tor_send_newnym(
    control_port: u16,
    cookie_path: Option<String>,
    password: Option<String>,
) -> Result<Value> {
    let cp = cookie_path.map(PathBuf::from);
    let res = qbrowse_tor::send_newnym(control_port, cp.as_deref(), password.as_deref())
        .await
        .map_err(to_napi_err)?;
    serde_json::to_value(res).map_err(to_napi_err)
}

#[napi]
pub async fn tor_get_bootstrap_status(
    control_port: u16,
    cookie_path: Option<String>,
) -> Result<Value> {
    let cp = cookie_path.map(PathBuf::from);
    let res = qbrowse_tor::get_bootstrap_status(control_port, cp.as_deref())
        .await
        .map_err(to_napi_err)?;
    serde_json::to_value(res).map_err(to_napi_err)
}

#[napi]
pub async fn tor_get_circuit_hops(
    control_port: u16,
    cookie_path: Option<String>,
) -> Result<Value> {
    let cp = cookie_path.map(PathBuf::from);
    let res = qbrowse_tor::get_circuit_hops(control_port, cp.as_deref())
        .await
        .map_err(to_napi_err)?;
    serde_json::to_value(res).map_err(to_napi_err)
}

#[napi]
pub async fn tor_check_exit_ip(socks_port: u16) -> Result<Value> {
    let res = qbrowse_tor::check_tor_exit_ip(socks_port)
        .await
        .map_err(to_napi_err)?;
    serde_json::to_value(res).map_err(to_napi_err)
}

#[napi]
pub async fn tor_extract_bundle(archive_path: String, dest_dir: String) -> Result<u32> {
    tokio::task::spawn_blocking(move || {
        let extracted =
            qbrowse_tor::extract_tor_bundle(Path::new(&archive_path), Path::new(&dest_dir))
                .map_err(to_napi_err)?;
        Ok(extracted.len() as u32)
    })
    .await
    .map_err(to_napi_err)?
}

#[napi]
pub fn tor_generate_torrc(config_json: Value) -> Result<String> {
    let cfg: qbrowse_tor::TorrcConfig =
        serde_json::from_value(config_json).map_err(to_napi_err)?;
    Ok(qbrowse_tor::generate_torrc(&cfg))
}

// ==================== EXTENSIONS (CRX / UNPACKED / MANIFEST) ====================

#[napi]
pub async fn ext_download_and_unpack_cws(
    ext_id: String,
    chrome_version: String,
    dest_root: String,
) -> Result<Value> {
    let meta = qbrowse_extensions::download_and_unpack_cws(
        &ext_id,
        &chrome_version,
        Path::new(&dest_root),
    )
    .await
    .map_err(to_napi_err)?;
    serde_json::to_value(meta).map_err(to_napi_err)
}

#[napi]
pub fn ext_inspect_unpacked(dir_path: String) -> Result<Value> {
    let meta = qbrowse_extensions::inspect_extension_dir(Path::new(&dir_path), None)
        .map_err(to_napi_err)?;
    serde_json::to_value(meta).map_err(to_napi_err)
}

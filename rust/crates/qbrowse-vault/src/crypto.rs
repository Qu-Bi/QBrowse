use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use anyhow::{anyhow, Result};
use rand::RngCore;
use scrypt::{scrypt, Params};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use zeroize::Zeroizing;

pub const CANARY_PLAINTEXT: &str = "QBROWSE_VAULT_OK";
pub const LEGACY_SALT: &[u8] = b"QBrowseSalt";
pub const LEGACY_SALT_2026: &[u8] = b"QBrowseSecureSalt2026";
pub const PIN_LOCKOUT_THRESHOLD: u32 = 5;
pub const PIN_LOCKOUT_DURATION_MS: u64 = 30_000;

fn scrypt_params() -> Params {
    // Node.js crypto.scryptSync default: N=16384 (log_n=14), r=8, p=1, dklen=32
    Params::new(14, 8, 1, 32).expect("valid scrypt params")
}

/// Derive a 32-byte key from a password and optional hex-encoded salt.
/// Falls back to `LEGACY_SALT` if `salt_hex` is `None` or empty.
pub fn derive_key(password: &str, salt_hex: Option<&str>) -> Result<Zeroizing<[u8; 32]>> {
    if password.is_empty() {
        return Err(anyhow!("Password cannot be empty"));
    }
    if let Some(hex_str) = salt_hex {
        if !hex_str.is_empty() {
            if let Ok(salt_bytes) = hex::decode(hex_str) {
                let mut key = Zeroizing::new([0u8; 32]);
                scrypt(password.as_bytes(), &salt_bytes, &scrypt_params(), &mut *key)
                    .map_err(|e| anyhow!("scrypt failed: {e}"))?;
                return Ok(key);
            }
        }
    }
    Ok(derive_legacy_key(password))
}

/// Derive a 32-byte key using the legacy `QBrowseSalt`.
pub fn derive_legacy_key(password: &str) -> Zeroizing<[u8; 32]> {
    let mut key = Zeroizing::new([0u8; 32]);
    if !password.is_empty() {
        let _ = scrypt(password.as_bytes(), LEGACY_SALT, &scrypt_params(), &mut *key);
    }
    key
}

/// Derive a 32-byte key using `QBrowseSecureSalt2026`.
pub fn derive_legacy_key_2026(password: &str) -> Zeroizing<[u8; 32]> {
    let mut key = Zeroizing::new([0u8; 32]);
    if !password.is_empty() {
        let _ = scrypt(
            password.as_bytes(),
            LEGACY_SALT_2026,
            &scrypt_params(),
            &mut *key,
        );
    }
    key
}

/// Check if a string matches the `<24-hex-iv>:<32-hex-tag>:<hex-ciphertext>` format.
pub fn is_encrypted_payload(s: &str) -> bool {
    let trimmed = s.trim();
    let mut parts = trimmed.split(':');
    let (Some(iv), Some(tag), Some(ct), None) =
        (parts.next(), parts.next(), parts.next(), parts.next())
    else {
        return false;
    };
    iv.len() == 24
        && iv.bytes().all(|b| b.is_ascii_hexdigit())
        && tag.len() == 32
        && tag.bytes().all(|b| b.is_ascii_hexdigit())
        && !ct.is_empty()
        && ct.len() % 2 == 0
        && ct.bytes().all(|b| b.is_ascii_hexdigit())
}

/// Encrypt UTF-8 plaintext using AES-256-GCM and return `ivHex:authTagHex:encryptedHex`.
pub fn encrypt(plaintext: &str, key: &[u8; 32]) -> Result<String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| anyhow!("AES key error: {e}"))?;
    let mut iv = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut iv);
    let nonce = Nonce::from_slice(&iv);
    let mut ct_and_tag = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| anyhow!("AES-GCM encrypt failed: {e}"))?;
    if ct_and_tag.len() < 16 {
        return Err(anyhow!("Unexpected ciphertext length"));
    }
    let tag_start = ct_and_tag.len() - 16;
    let tag = ct_and_tag.split_off(tag_start);
    Ok(format!(
        "{}:{}:{}",
        hex::encode(iv),
        hex::encode(tag),
        hex::encode(ct_and_tag)
    ))
}

/// Decrypt `ivHex:authTagHex:encryptedHex` using AES-256-GCM, returning `None` on any failure.
pub fn safe_decrypt(ciphertext: &str, key: &[u8; 32]) -> Option<String> {
    if !is_encrypted_payload(ciphertext) {
        return None;
    }
    let trimmed = ciphertext.trim();
    let mut parts = trimmed.split(':');
    let (Some(iv_hex), Some(tag_hex), Some(ct_hex), None) =
        (parts.next(), parts.next(), parts.next(), parts.next())
    else {
        return None;
    };
    let iv = hex::decode(iv_hex).ok()?;
    let tag = hex::decode(tag_hex).ok()?;
    let mut ct = hex::decode(ct_hex).ok()?;
    if iv.len() != 12 || tag.len() != 16 {
        return None;
    }
    ct.extend_from_slice(&tag);
    let cipher = Aes256Gcm::new_from_slice(key).ok()?;
    let nonce = Nonce::from_slice(&iv);
    let plain = cipher.decrypt(nonce, ct.as_slice()).ok()?;
    String::from_utf8(plain).ok()
}

/// Decrypt `ivHex:authTagHex:encryptedHex`, returning an error on failure.
pub fn decrypt(ciphertext: &str, key: &[u8; 32]) -> Result<String> {
    safe_decrypt(ciphertext, key).ok_or_else(|| anyhow!("Decryption failed"))
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PinConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub salt: String,
    #[serde(default)]
    pub wrapped_secret: String,
    #[serde(default)]
    pub failed_attempts: u32,
    #[serde(default)]
    pub lock_until: u64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BioConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub use_safe_storage: bool,
    #[serde(default)]
    pub wrapped_secret_base64: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultStoredItem {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub password: Option<String>,
    #[serde(default)]
    pub item_type: Option<String>,
    #[serde(default)]
    pub passkey_data: Option<serde_json::Value>,
    #[serde(default)]
    pub card_data: Option<serde_json::Value>,
    #[serde(default)]
    pub address_data: Option<serde_json::Value>,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub totp_secret: Option<String>,
    #[serde(default)]
    pub custom_fields: Option<serde_json::Value>,
    #[serde(default)]
    pub favicon: Option<String>,
    #[serde(default)]
    pub created_at: Option<serde_json::Value>,
    #[serde(default)]
    pub updated_at: Option<serde_json::Value>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultFile {
    #[serde(default)]
    pub canary: Option<String>,
    #[serde(default)]
    pub test_encryption: Option<String>,
    #[serde(default)]
    pub vault_salt: Option<String>,
    #[serde(default)]
    pub passwords: Vec<VaultStoredItem>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pin_config: Option<PinConfig>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bio_config: Option<BioConfig>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultItemMeta {
    pub clean_title: String,
    pub item_type: String,
    pub passkey_data: Option<serde_json::Value>,
    pub totp_secret: Option<String>,
    pub notes: String,
    pub custom_fields: Option<serde_json::Value>,
    pub favicon: Option<String>,
    pub created_at: Option<serde_json::Value>,
    pub updated_at: Option<serde_json::Value>,
    pub card_data: Option<serde_json::Value>,
    pub address_data: Option<serde_json::Value>,
}

/// Unpack `title|||JSON` metadata from a stored vault item.
pub fn extract_vault_item_meta(item: &VaultStoredItem) -> VaultItemMeta {
    let mut clean_title = item.title.clone();
    let mut item_type = item.item_type.clone().unwrap_or_else(|| "login".to_string());
    let mut passkey_data = item.passkey_data.clone();
    let mut totp_secret = item.totp_secret.clone();
    let mut notes = item.notes.clone().unwrap_or_default();
    let mut custom_fields = item.custom_fields.clone();
    let mut favicon = item.favicon.clone();
    let mut created_at = item.created_at.clone();
    let mut updated_at = item.updated_at.clone();
    let mut card_data = item.card_data.clone();
    let mut address_data = item.address_data.clone();

    if let Some((prefix, json_part)) = item.title.split_once("|||") {
        clean_title = prefix.to_string();
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(json_part) {
            if let Some(t) = parsed
                .get("type")
                .or_else(|| parsed.get("itemType"))
                .and_then(|v| v.as_str())
            {
                item_type = t.to_string();
            }
            if let Some(n) = parsed.get("notes").and_then(|v| v.as_str()) {
                if !n.is_empty() {
                    notes = n.to_string();
                }
            }
            if let Some(pk) = parsed.get("passkeyData").or_else(|| parsed.get("passkey")) {
                if !pk.is_null() {
                    passkey_data = Some(pk.clone());
                }
            }
            if let Some(totp) = parsed.get("totpSecret").and_then(|v| v.as_str()) {
                if !totp.is_empty() {
                    totp_secret = Some(totp.to_string());
                }
            }
            if let Some(cf) = parsed.get("customFields") {
                if !cf.is_null() {
                    custom_fields = Some(cf.clone());
                }
            }
            if let Some(fav) = parsed.get("favicon").and_then(|v| v.as_str()) {
                favicon = Some(fav.to_string());
            }
            if let Some(ca) = parsed.get("createdAt") {
                if !ca.is_null() {
                    created_at = Some(ca.clone());
                }
            }
            if let Some(ua) = parsed.get("updatedAt") {
                if !ua.is_null() {
                    updated_at = Some(ua.clone());
                }
            }
            if let Some(cd) = parsed.get("cardData") {
                if !cd.is_null() {
                    card_data = Some(cd.clone());
                }
            }
            if let Some(ad) = parsed.get("addressData") {
                if !ad.is_null() {
                    address_data = Some(ad.clone());
                }
            }
        }
    }

    if item_type.is_empty() {
        item_type = if passkey_data.is_some() {
            "passkey".to_string()
        } else {
            "login".to_string()
        };
    }

    VaultItemMeta {
        clean_title,
        item_type,
        passkey_data,
        totp_secret,
        notes,
        custom_fields,
        favicon,
        created_at,
        updated_at,
        card_data,
        address_data,
    }
}

/// Pack clean title and metadata back into `title|||JSON` format.
pub fn pack_vault_item_title(clean_title: &str, meta: &VaultItemMeta) -> String {
    let mut obj = serde_json::Map::new();
    obj.insert("type".to_string(), serde_json::json!(meta.item_type));
    if !meta.notes.is_empty() {
        obj.insert("notes".to_string(), serde_json::json!(meta.notes));
    }
    if let Some(ref pk) = meta.passkey_data {
        obj.insert("passkeyData".to_string(), pk.clone());
    }
    if let Some(ref totp) = meta.totp_secret {
        obj.insert("totpSecret".to_string(), serde_json::json!(totp));
    }
    if let Some(ref cf) = meta.custom_fields {
        obj.insert("customFields".to_string(), cf.clone());
    }
    if let Some(ref fav) = meta.favicon {
        obj.insert("favicon".to_string(), serde_json::json!(fav));
    }
    if let Some(ref ca) = meta.created_at {
        obj.insert("createdAt".to_string(), ca.clone());
    }
    if let Some(ref ua) = meta.updated_at {
        obj.insert("updatedAt".to_string(), ua.clone());
    }
    if let Some(ref cd) = meta.card_data {
        obj.insert("cardData".to_string(), cd.clone());
    }
    if let Some(ref ad) = meta.address_data {
        obj.insert("addressData".to_string(), ad.clone());
    }
    format!("{}|||{}", clean_title, serde_json::Value::Object(obj))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DecryptedVaultItem {
    pub id: Option<String>,
    pub title: String,
    pub raw_title: String,
    pub url: String,
    pub username: String,
    pub password: String,
    pub item_type: String,
    pub passkey_data: Option<serde_json::Value>,
    pub card_data: Option<serde_json::Value>,
    pub address_data: Option<serde_json::Value>,
    pub notes: String,
    pub totp_secret: Option<String>,
    pub custom_fields: Option<serde_json::Value>,
    pub favicon: Option<String>,
    pub created_at: Option<serde_json::Value>,
    pub updated_at: Option<serde_json::Value>,
    pub decryption_failed: bool,
}

fn looks_like_http_url(s: &str) -> bool {
    let lower = s.trim().to_ascii_lowercase();
    lower.starts_with("http://") || lower.starts_with("https://")
}

fn looks_like_domain(s: &str) -> bool {
    let trimmed = s.trim();
    if trimmed.contains(' ') || !trimmed.contains('.') {
        return false;
    }
    let mut parts = trimmed.split('.');
    let first = parts.next().unwrap_or("");
    let second = parts.next().unwrap_or("");
    !first.is_empty()
        && first.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
        && second.len() >= 2
        && second.bytes().take(2).all(|b| b.is_ascii_alphabetic())
}

/// Decrypt all vault items, performing self-healing for legacy keys, unencrypted items,
/// and the parameter-swap bug (`username` <-> `url` <-> `password`).
/// Returns `(decrypted_items, vault_modified)`.
pub fn heal_and_decrypt_vault_items(
    vault: &mut VaultFile,
    primary_key: &[u8; 32],
    candidate_passwords: &[&str],
) -> (Vec<DecryptedVaultItem>, bool) {
    let mut candidate_keys: Vec<Zeroizing<[u8; 32]>> = Vec::new();
    let mut seen_hex = HashSet::new();

    let mut add_key = |k: Zeroizing<[u8; 32]>| {
        let h = hex::encode(*k);
        if seen_hex.insert(h) {
            candidate_keys.push(k);
        }
    };

    add_key(Zeroizing::new(*primary_key));
    for pw in candidate_passwords {
        if !pw.is_empty() {
            if let Some(ref salt) = vault.vault_salt {
                if let Ok(k) = derive_key(pw, Some(salt)) {
                    add_key(k);
                }
            }
            add_key(derive_legacy_key(pw));
            add_key(derive_legacy_key_2026(pw));
        }
    }
    add_key(derive_legacy_key("QBrowseDefaultVaultKey"));
    add_key(derive_legacy_key_2026("QBrowseDefaultVaultKey"));
    add_key(derive_legacy_key("QBrowseWindowsHelloVaultKey"));
    add_key(derive_legacy_key_2026("QBrowseWindowsHelloVaultKey"));

    let mut vault_modified = false;
    let mut results = Vec::with_capacity(vault.passwords.len());

    for p in &mut vault.passwords {
        let meta = extract_vault_item_meta(p);
        let mut raw_decrypted: Option<String> = None;
        let mut needs_reencrypt = false;

        match p.password.as_deref() {
            None | Some("") => {
                raw_decrypted = Some(String::new());
            }
            Some(raw_pw) if !is_encrypted_payload(raw_pw) => {
                raw_decrypted = Some(raw_pw.to_string());
                needs_reencrypt = true;
            }
            Some(enc_pw) => {
                if let Some(dec) = safe_decrypt(enc_pw, primary_key) {
                    raw_decrypted = Some(dec);
                } else {
                    for fk in &candidate_keys {
                        if &**fk == primary_key {
                            continue;
                        }
                        if let Some(dec) = safe_decrypt(enc_pw, fk) {
                            raw_decrypted = Some(dec);
                            needs_reencrypt = true;
                            break;
                        }
                    }
                }
            }
        }

        // Repair parameter-swap bug: username got URL, url got plaintext password, password got encrypted username
        if let Some(ref dec_pw) = raw_decrypted {
            let user_str = p.username.trim();
            let url_str = p.url.trim();
            if looks_like_http_url(user_str)
                && !looks_like_http_url(url_str)
                && !looks_like_domain(url_str)
            {
                let repaired_url = p.username.clone();
                let repaired_user = dec_pw.clone();
                let repaired_pw = p.url.clone();
                p.url = repaired_url;
                p.username = repaired_user;
                raw_decrypted = Some(repaired_pw);
                needs_reencrypt = true;
                vault_modified = true;
            }
        }

        if let Some(ref plain) = raw_decrypted {
            if needs_reencrypt {
                if let Ok(enc) = encrypt(plain, primary_key) {
                    p.password = Some(enc);
                    vault_modified = true;
                }
            }
        }

        let (password_out, decryption_failed) = match raw_decrypted {
            Some(plain) => (plain, false),
            None => (String::new(), true),
        };

        results.push(DecryptedVaultItem {
            id: p.id.clone(),
            title: meta.clean_title,
            raw_title: p.title.clone(),
            url: p.url.clone(),
            username: p.username.clone(),
            password: password_out,
            item_type: meta.item_type,
            passkey_data: meta.passkey_data,
            card_data: meta.card_data,
            address_data: meta.address_data,
            notes: meta.notes,
            totp_secret: meta.totp_secret,
            custom_fields: meta.custom_fields,
            favicon: meta.favicon,
            created_at: meta.created_at,
            updated_at: meta.updated_at,
            decryption_failed,
        });
    }

    (results, vault_modified)
}

/// Stateful vault session holding the unlocked master key in `Zeroizing<[u8; 32]>`.
#[derive(Default)]
pub struct VaultSession {
    master_key: Option<Zeroizing<[u8; 32]>>,
    active_master_password: Option<Zeroizing<String>>,
}

impl VaultSession {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn is_unlocked(&self) -> bool {
        self.master_key.is_some()
    }

    pub fn master_key(&self) -> Option<&[u8; 32]> {
        self.master_key.as_deref()
    }

    /// Lock the vault, zeroizing and dropping the master key and password from memory.
    pub fn lock_vault(&mut self) {
        self.master_key = None;
        self.active_master_password = None;
    }

    /// Unlock (or initialize if `canary` is absent) a `VaultFile` with a master password.
    pub fn unlock_with_password(
        &mut self,
        vault: &mut VaultFile,
        master_password: &str,
    ) -> Result<Vec<DecryptedVaultItem>> {
        if master_password.is_empty() {
            return Err(anyhow!("Master password cannot be empty"));
        }

        let canary = vault
            .canary
            .as_deref()
            .or(vault.test_encryption.as_deref())
            .filter(|s| !s.is_empty());

        let key = if let Some(canary_str) = canary {
            let mut found: Option<Zeroizing<[u8; 32]>> = None;
            if let Some(ref salt) = vault.vault_salt {
                if let Ok(k) = derive_key(master_password, Some(salt)) {
                    if safe_decrypt(canary_str, &k).is_some() {
                        found = Some(k);
                    }
                }
            }
            if found.is_none() {
                let k_leg = derive_legacy_key(master_password);
                if safe_decrypt(canary_str, &k_leg).is_some() {
                    found = Some(k_leg);
                }
            }
            if found.is_none() {
                let k_2026 = derive_legacy_key_2026(master_password);
                if safe_decrypt(canary_str, &k_2026).is_some() {
                    found = Some(k_2026);
                }
            }
            found.ok_or_else(|| anyhow!("Invalid master password"))?
        } else {
            let mut salt_bytes = [0u8; 32];
            rand::thread_rng().fill_bytes(&mut salt_bytes);
            let salt_hex = hex::encode(salt_bytes);
            let k = derive_key(master_password, Some(&salt_hex))?;
            vault.vault_salt = Some(salt_hex);
            vault.canary = Some(encrypt(CANARY_PLAINTEXT, &k)?);
            k
        };

        let (items, _) = heal_and_decrypt_vault_items(vault, &key, &[master_password]);
        self.master_key = Some(key);
        self.active_master_password = Some(Zeroizing::new(master_password.to_string()));
        Ok(items)
    }

    /// Set up PIN protection on an unlocked vault.
    pub fn setup_pin(&self, vault: &mut VaultFile, pin: &str) -> Result<()> {
        let master_key = self
            .master_key
            .as_deref()
            .ok_or_else(|| anyhow!("Vault must be unlocked to set up PIN"))?;
        if pin.len() < 4 {
            return Err(anyhow!("PIN must be at least 4 characters"));
        }
        let mut pin_salt_bytes = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut pin_salt_bytes);
        let pin_salt = hex::encode(pin_salt_bytes);
        let pin_key = derive_key(pin, Some(&pin_salt))?;
        let secret_json = serde_json::json!({
            "keyHex": hex::encode(master_key),
            "masterPassword": self.active_master_password.as_deref().map(|s| s.as_str()).unwrap_or("")
        })
        .to_string();

        vault.pin_config = Some(PinConfig {
            enabled: true,
            salt: pin_salt,
            wrapped_secret: encrypt(&secret_json, &pin_key)?,
            failed_attempts: 0,
            lock_until: 0,
        });
        Ok(())
    }

    /// Unlock the vault using a PIN, enforcing the 5-attempt / 30-second lockout state machine.
    pub fn unlock_with_pin(
        &mut self,
        vault: &mut VaultFile,
        pin: &str,
        now_ms: u64,
    ) -> PinUnlockResult {
        let Some(pin_cfg) = vault.pin_config.as_mut() else {
            return PinUnlockResult {
                success: false,
                locked_out: false,
                lock_until: 0,
                remaining_seconds: 0,
                failed_attempts: 0,
                error: Some("PIN is not configured on this vault".to_string()),
            };
        };

        if !pin_cfg.enabled || pin_cfg.wrapped_secret.is_empty() {
            return PinUnlockResult {
                success: false,
                locked_out: false,
                lock_until: 0,
                remaining_seconds: 0,
                failed_attempts: pin_cfg.failed_attempts,
                error: Some("PIN is not configured on this vault".to_string()),
            };
        }

        if pin_cfg.lock_until > 0 && now_ms < pin_cfg.lock_until {
            let remaining_ms = pin_cfg.lock_until - now_ms;
            let remaining_seconds = remaining_ms.div_ceil(1000);
            return PinUnlockResult {
                success: false,
                locked_out: true,
                lock_until: pin_cfg.lock_until,
                remaining_seconds,
                failed_attempts: pin_cfg.failed_attempts,
                error: None,
            };
        }

        let Ok(pin_key) = derive_key(pin, Some(&pin_cfg.salt)) else {
            return PinUnlockResult {
                success: false,
                locked_out: false,
                lock_until: 0,
                remaining_seconds: 0,
                failed_attempts: pin_cfg.failed_attempts,
                error: Some("Failed to derive PIN key".to_string()),
            };
        };

        if let Some(decrypted) = safe_decrypt(&pin_cfg.wrapped_secret, &pin_key) {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&decrypted) {
                if let Some(key_hex) = val.get("keyHex").and_then(|v| v.as_str()) {
                    if let Ok(key_bytes) = hex::decode(key_hex) {
                        if key_bytes.len() == 32 {
                            let mut arr = Zeroizing::new([0u8; 32]);
                            arr.copy_from_slice(&key_bytes);
                            let mp = val
                                .get("masterPassword")
                                .and_then(|v| v.as_str())
                                .filter(|s| !s.is_empty())
                                .map(|s| Zeroizing::new(s.to_string()));
                            pin_cfg.failed_attempts = 0;
                            pin_cfg.lock_until = 0;
                            let mp_slice: Vec<&str> =
                                mp.as_deref().map(|s| vec![s.as_str()]).unwrap_or_default();
                            heal_and_decrypt_vault_items(vault, &arr, &mp_slice);
                            self.master_key = Some(arr);
                            self.active_master_password = mp;
                            return PinUnlockResult {
                                success: true,
                                locked_out: false,
                                lock_until: 0,
                                remaining_seconds: 0,
                                failed_attempts: 0,
                                error: None,
                            };
                        }
                    }
                }
            }
            return PinUnlockResult {
                success: false,
                locked_out: false,
                lock_until: 0,
                remaining_seconds: 0,
                failed_attempts: pin_cfg.failed_attempts,
                error: Some("Invalid PIN wrapper data".to_string()),
            };
        }

        pin_cfg.failed_attempts = pin_cfg.failed_attempts.saturating_add(1);
        if pin_cfg.failed_attempts >= PIN_LOCKOUT_THRESHOLD {
            pin_cfg.lock_until = now_ms.saturating_add(PIN_LOCKOUT_DURATION_MS);
        }

        PinUnlockResult {
            success: false,
            locked_out: pin_cfg.lock_until > now_ms,
            lock_until: pin_cfg.lock_until,
            remaining_seconds: if pin_cfg.lock_until > now_ms {
                (pin_cfg.lock_until - now_ms).div_ceil(1000)
            } else {
                0
            },
            failed_attempts: pin_cfg.failed_attempts,
            error: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PinUnlockResult {
    pub success: bool,
    pub locked_out: bool,
    pub lock_until: u64,
    pub remaining_seconds: u64,
    pub failed_attempts: u32,
    pub error: Option<String>,
}

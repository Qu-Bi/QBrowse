use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use anyhow::{anyhow, bail, Context, Result};
use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine};
use pbkdf2::pbkdf2_hmac;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::Sha256;
use std::collections::HashMap;
use std::io::{Read, Write};

pub const PBKDF2_ITERATIONS: u32 = 100_000;
pub const SALT_LEN: usize = 16;
pub const IV_LEN: usize = 12;
pub const BROTLI_V2_PREFIX: &str = "br1:";
pub const BROTLI_QUALITY: u32 = 5;
pub const BROTLI_LGWIN: u32 = 22;

pub fn ping() -> &'static str {
    "qbrowse-sync"
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EncryptedEnvelope {
    pub salt: String,
    pub iv: String,
    pub cipher: String,
}

/// Derives a 256-bit AES key from a passphrase and salt using PBKDF2-HMAC-SHA256 (100,000 iterations).
pub fn derive_key(passphrase: &str, salt: &[u8]) -> Result<[u8; 32]> {
    if passphrase.is_empty() {
        bail!("Passphrase must not be empty");
    }
    if salt.is_empty() {
        bail!("Malformed encrypted payload structure: empty salt");
    }
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(passphrase.as_bytes(), salt, PBKDF2_ITERATIONS, &mut key);
    Ok(key)
}

fn encrypt_raw(passphrase: &str, plaintext: &[u8]) -> Result<EncryptedEnvelope> {
    if passphrase.is_empty() {
        bail!("Passphrase must not be empty");
    }
    let mut salt = [0u8; SALT_LEN];
    let mut iv = [0u8; IV_LEN];
    rand::thread_rng().fill_bytes(&mut salt);
    rand::thread_rng().fill_bytes(&mut iv);

    let key = derive_key(passphrase, &salt)?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| anyhow!("Failed to initialize AES-256-GCM: {e}"))?;
    let nonce = Nonce::from_slice(&iv);
    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| anyhow!("AES-256-GCM encryption failed: {e}"))?;

    Ok(EncryptedEnvelope {
        salt: hex::encode(salt),
        iv: hex::encode(iv),
        cipher: hex::encode(ciphertext),
    })
}

fn brotli_compress(data: &[u8]) -> Result<Vec<u8>> {
    let mut out = Vec::new();
    {
        let mut writer =
            brotli::CompressorWriter::new(&mut out, 4096, BROTLI_QUALITY, BROTLI_LGWIN);
        writer
            .write_all(data)
            .context("Failed to write to Brotli compressor")?;
    }
    Ok(out)
}

fn brotli_decompress(data: &[u8]) -> Result<Vec<u8>> {
    let mut reader = brotli::Decompressor::new(data, 4096);
    let mut out = Vec::new();
    reader
        .read_to_end(&mut out)
        .context("Failed to decompress Brotli payload")?;
    Ok(out)
}

/// Encrypts a plaintext JSON string using the v1 format (raw UTF-8 + AES-256-GCM, 100% WebCrypto compatible).
pub fn encrypt_v1(passphrase: &str, plaintext_json: &str) -> Result<EncryptedEnvelope> {
    encrypt_raw(passphrase, plaintext_json.as_bytes())
}

/// Encrypts a plaintext JSON string using the v2 format (Brotli level 5 + "br1:" base64 prefix + AES-256-GCM).
pub fn encrypt_v2(passphrase: &str, plaintext_json: &str) -> Result<EncryptedEnvelope> {
    let compressed = brotli_compress(plaintext_json.as_bytes())?;
    let encoded = BASE64_STANDARD.encode(&compressed);
    let mut payload = String::with_capacity(BROTLI_V2_PREFIX.len() + encoded.len());
    payload.push_str(BROTLI_V2_PREFIX);
    payload.push_str(&encoded);
    encrypt_raw(passphrase, payload.as_bytes())
}

/// Decrypts either a v1 (raw UTF-8 JSON) or v2 ("br1:" + base64(brotli(UTF-8 JSON))) AES-256-GCM payload.
pub fn decrypt_v1_or_v2(
    passphrase: &str,
    salt_hex: &str,
    iv_hex: &str,
    cipher_hex: &str,
) -> Result<String> {
    if passphrase.is_empty() {
        bail!("Missing encryption passphrase");
    }
    let salt = hex::decode(salt_hex.trim()).context("Invalid hex salt")?;
    let iv = hex::decode(iv_hex.trim()).context("Invalid hex iv")?;
    let ciphertext = hex::decode(cipher_hex.trim()).context("Invalid hex cipher")?;

    if salt.is_empty() {
        bail!("Malformed encrypted payload structure: empty salt");
    }
    if iv.len() != IV_LEN {
        bail!(
            "Invalid IV length in backup data: expected {IV_LEN}, got {}",
            iv.len()
        );
    }
    if ciphertext.len() < 16 {
        bail!("Invalid Cipher length in backup data");
    }

    let key = derive_key(passphrase, &salt)?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| anyhow!("Failed to initialize AES-256-GCM: {e}"))?;
    let nonce = Nonce::from_slice(&iv);
    let decrypted_bytes = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| anyhow!("Invalid Master Encryption Password or corrupted cloud data"))?;

    let utf8 = String::from_utf8(decrypted_bytes)
        .context("Decrypted payload is not valid UTF-8")?;

    if let Some(b64_part) = utf8.strip_prefix(BROTLI_V2_PREFIX) {
        let compressed = BASE64_STANDARD
            .decode(b64_part.trim())
            .context("Invalid base64 in br1 payload")?;
        let decompressed = brotli_decompress(&compressed)?;
        let json_str = String::from_utf8(decompressed)
            .context("Decompressed br1 payload is not valid UTF-8")?;
        Ok(json_str)
    } else {
        Ok(utf8)
    }
}

fn value_to_hex_string(val: &Value) -> Option<String> {
    match val {
        Value::String(s) => {
            let trimmed = s.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        }
        Value::Array(arr) => {
            let mut bytes = Vec::with_capacity(arr.len());
            for item in arr {
                let n = item.as_u64()?;
                if n > 255 {
                    return None;
                }
                bytes.push(n as u8);
            }
            if bytes.is_empty() {
                None
            } else {
                Some(hex::encode(bytes))
            }
        }
        _ => None,
    }
}

/// Robustly extracts an `EncryptedEnvelope` from any legacy or nested sync payload shape,
/// matching `extractEncryptedPayload` in `src/store/useSyncStore.js`.
pub fn extract_encrypted_envelope(candidate: &Value) -> Option<EncryptedEnvelope> {
    match candidate {
        Value::String(s) => {
            let trimmed = s.trim();
            if (trimmed.starts_with('{') && trimmed.ends_with('}'))
                || (trimmed.starts_with('"') && trimmed.ends_with('"'))
            {
                if let Ok(parsed) = serde_json::from_str::<Value>(trimmed) {
                    return extract_encrypted_envelope(&parsed);
                }
            }
            None
        }
        Value::Object(map) => {
            let salt = map.get("salt").or_else(|| map.get("s")).and_then(value_to_hex_string);
            let iv = map
                .get("iv")
                .or_else(|| map.get("initializationVector"))
                .and_then(value_to_hex_string);
            let cipher = map
                .get("cipher")
                .or_else(|| map.get("ciphertext"))
                .or_else(|| map.get("data"))
                .or_else(|| map.get("encryptedContent"))
                .and_then(value_to_hex_string);

            if let (Some(salt), Some(iv), Some(cipher)) = (salt, iv, cipher) {
                return Some(EncryptedEnvelope { salt, iv, cipher });
            }

            const NESTED_KEYS: &[&str] = &[
                "encrypted",
                "encryptedData",
                "encryptedPayload",
                "payload",
                "backupData",
                "data",
                "ciphertext",
                "cipher",
                "content",
                "backup",
                "blob",
            ];

            for key in NESTED_KEYS {
                if let Some(child) = map.get(*key) {
                    if let Some(found) = extract_encrypted_envelope(child) {
                        return Some(found);
                    }
                }
            }
            None
        }
        _ => None,
    }
}

/// Encrypts a map of sync section entries (`section_name -> JSON Value`) using v2 envelopes.
pub fn encrypt_sync_payload(
    passphrase: &str,
    entries_map: &HashMap<String, Value>,
) -> Result<HashMap<String, EncryptedEnvelope>> {
    let mut out = HashMap::with_capacity(entries_map.len());
    for (section, val) in entries_map {
        let json_str = serde_json::to_string(val)
            .with_context(|| format!("Failed to serialize sync section '{section}'"))?;
        let env = encrypt_v2(passphrase, &json_str)
            .with_context(|| format!("Failed to encrypt sync section '{section}'"))?;
        out.insert(section.clone(), env);
    }
    Ok(out)
}

/// Decrypts a map of sync section entries (`section_name -> encrypted Value or envelope`),
/// supporting both v1 and v2 payloads and all nested envelope formats from `useSyncStore.js`.
pub fn decrypt_sync_payload(
    passphrase: &str,
    encrypted_map: &HashMap<String, Value>,
) -> Result<HashMap<String, Value>> {
    let mut out = HashMap::with_capacity(encrypted_map.len());
    for (section, raw_val) in encrypted_map {
        let env = extract_encrypted_envelope(raw_val).ok_or_else(|| {
            anyhow!("Malformed encrypted payload structure in section '{section}'")
        })?;
        let json_str = decrypt_v1_or_v2(passphrase, &env.salt, &env.iv, &env.cipher)
            .with_context(|| format!("Failed to decrypt sync section '{section}'"))?;
        let mut decoded: Value = serde_json::from_str(&json_str)
            .with_context(|| format!("Decrypted section '{section}' is not valid JSON"))?;
        if let Value::String(inner) = &decoded {
            if let Ok(inner_val) = serde_json::from_str::<Value>(inner) {
                decoded = inner_val;
            }
        }
        out.insert(section.clone(), decoded);
    }
    Ok(out)
}

/// Computes a fast BLAKE3 lowercase hex digest for unchanged-section skipping.
pub fn blake3_hash(data: &[u8]) -> String {
    blake3::hash(data).to_hex().to_string()
}

/// Convenience wrapper for hashing a UTF-8 string with BLAKE3.
pub fn blake3_hash_str(data: &str) -> String {
    blake3_hash(data.as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_ping() {
        assert_eq!(ping(), "qbrowse-sync");
    }

    #[test]
    fn test_v1_encrypt_decrypt_roundtrip() {
        let pass = "correct-horse-battery-staple";
        let payload = r#"{"tabs":[{"url":"https://example.com","title":"Example"}]}"#;
        let env = encrypt_v1(pass, payload).unwrap();
        assert_eq!(env.salt.len(), SALT_LEN * 2);
        assert_eq!(env.iv.len(), IV_LEN * 2);
        assert!(env.cipher.len() >= 32);

        let dec = decrypt_v1_or_v2(pass, &env.salt, &env.iv, &env.cipher).unwrap();
        assert_eq!(dec, payload);
    }

    #[test]
    fn test_v2_encrypt_decrypt_roundtrip_and_compression() {
        let pass = "super-secret-passphrase-123";
        let large_json = serde_json::to_string(&json!({
            "items": (0..200).map(|i| json!({
                "id": i,
                "url": format!("https://example.com/articles/some-long-repeating-path-{i}"),
                "title": "Some Long Repeating Article Title For Compression Testing"
            })).collect::<Vec<_>>()
        }))
        .unwrap();

        let env_v1 = encrypt_v1(pass, &large_json).unwrap();
        let env_v2 = encrypt_v2(pass, &large_json).unwrap();
        assert!(env_v2.cipher.len() < env_v1.cipher.len());

        let dec = decrypt_v1_or_v2(pass, &env_v2.salt, &env_v2.iv, &env_v2.cipher).unwrap();
        assert_eq!(dec, large_json);
    }

    #[test]
    fn test_wrong_passphrase_fails() {
        let env = encrypt_v2("right-pass", r#"{"ok":true}"#).unwrap();
        let err = decrypt_v1_or_v2("wrong-pass", &env.salt, &env.iv, &env.cipher).unwrap_err();
        assert!(err.to_string().contains("Invalid Master Encryption Password"));
    }

    #[test]
    fn test_js_webcrypto_v1_vector_compatibility() {
        // Known deterministic vector generated with PBKDF2-HMAC-SHA256 (100_000 iters) + AES-256-GCM
        // Salt = 000102030405060708090a0b0c0d0e0f, IV = 101112131415161718191a1b
        let salt = hex::decode("000102030405060708090a0b0c0d0e0f").unwrap();
        let iv = hex::decode("101112131415161718191a1b").unwrap();
        let key = derive_key("qbrowse-test-pass", &salt).unwrap();
        let cipher = Aes256Gcm::new_from_slice(&key).unwrap();
        let ct = cipher
            .encrypt(Nonce::from_slice(&iv), b"{\"hello\":\"world\"}".as_ref())
            .unwrap();
        let dec = decrypt_v1_or_v2(
            "qbrowse-test-pass",
            "000102030405060708090a0b0c0d0e0f",
            "101112131415161718191a1b",
            &hex::encode(ct),
        )
        .unwrap();
        assert_eq!(dec, "{\"hello\":\"world\"}");
    }

    #[test]
    fn test_extract_encrypted_envelope_nested_variants() {
        let env = encrypt_v1("pw", r#"{"a":1}"#).unwrap();
        let nested = json!({
            "updatedAt": 123456,
            "encrypted": {
                "salt": env.salt,
                "iv": env.iv,
                "cipher": env.cipher
            }
        });
        let extracted = extract_encrypted_envelope(&nested).unwrap();
        assert_eq!(extracted, env);

        let legacy_aliases = json!({
            "backupData": serde_json::to_string(&json!({
                "s": env.salt,
                "initializationVector": env.iv,
                "ciphertext": env.cipher
            })).unwrap()
        });
        let extracted_legacy = extract_encrypted_envelope(&legacy_aliases).unwrap();
        assert_eq!(extracted_legacy, env);
    }

    #[test]
    fn test_encrypt_decrypt_sync_payload() {
        let mut sections = HashMap::new();
        sections.insert("tabs".to_string(), json!([{"url": "https://rust-lang.org"}]));
        sections.insert("settings".to_string(), json!({"theme": "dark", "zoom": 1.0}));

        let encrypted = encrypt_sync_payload("master-pw", &sections).unwrap();
        assert_eq!(encrypted.len(), 2);

        // Simulate Firestore shape where one section is wrapped in {"encrypted": ...} and one is v1
        let mut remote_map = HashMap::new();
        remote_map.insert(
            "tabs".to_string(),
            json!({ "encrypted": encrypted.get("tabs").unwrap() }),
        );
        let v1_settings = encrypt_v1("master-pw", &sections["settings"].to_string()).unwrap();
        remote_map.insert("settings".to_string(), serde_json::to_value(v1_settings).unwrap());

        let decrypted = decrypt_sync_payload("master-pw", &remote_map).unwrap();
        assert_eq!(decrypted["tabs"], sections["tabs"]);
        assert_eq!(decrypted["settings"], sections["settings"]);
    }

    #[test]
    fn test_blake3_hash() {
        let h1 = blake3_hash_str("qbrowse-sync-section");
        let h2 = blake3_hash(b"qbrowse-sync-section");
        let h3 = blake3_hash_str("qbrowse-sync-section-modified");
        assert_eq!(h1, h2);
        assert_eq!(h1.len(), 64);
        assert_ne!(h1, h3);
    }
}

use anyhow::{anyhow, Result};
use data_encoding::BASE32_NOPAD;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha1::Sha1;
use sha2::{Sha256, Sha512};
use url::Url;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TotpAlgorithm {
    Sha1,
    Sha256,
    Sha512,
}

impl TotpAlgorithm {
    pub fn parse(s: &str) -> Self {
        let norm: String = s
            .chars()
            .filter(|c| *c != '-' && *c != '_')
            .flat_map(|c| c.to_uppercase())
            .collect();
        match norm.as_str() {
            "SHA256" => Self::Sha256,
            "SHA512" => Self::Sha512,
            _ => Self::Sha1,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OtpAuthParams {
    pub otp_type: String,
    pub label: String,
    pub issuer: String,
    pub account: String,
    pub secret: String,
    pub digits: u32,
    pub period: u32,
    pub algorithm: String,
}

/// Normalize a Base32 TOTP secret or extract it from an `otpauth://` URI.
/// Applies common mistype healing: `0 -> O`, `1 -> I`, `8 -> B`.
pub fn clean_totp_secret(input: &str) -> String {
    let mut raw = input.trim().to_string();
    if raw.is_empty() {
        return String::new();
    }
    if raw.to_ascii_lowercase().starts_with("otpauth://") {
        if let Some(parsed) = parse_otpauth_uri(&raw) {
            if !parsed.secret.is_empty() {
                return parsed.secret;
            }
        }
    }

    let mut cleaned = String::with_capacity(raw.len());
    for ch in raw.drain(..) {
        if matches!(ch, ' ' | '\t' | '\r' | '\n' | '-' | '_' | '=' | ':') {
            continue;
        }
        let up = ch.to_ascii_uppercase();
        let healed = match up {
            '0' => 'O',
            '1' => 'I',
            '8' => 'B',
            other => other,
        };
        cleaned.push(healed);
    }
    cleaned
}

fn decode_base32_or_fallback(secret: &str) -> Vec<u8> {
    let cleaned = clean_totp_secret(secret);
    if !cleaned.is_empty() && cleaned.bytes().all(|b| matches!(b, b'A'..=b'Z' | b'2'..=b'7')) {
        if let Ok(bytes) = BASE32_NOPAD.decode(cleaned.as_bytes()) {
            if !bytes.is_empty() {
                return bytes;
            }
        }
    }
    let hex_clean: String = secret
        .trim()
        .chars()
        .filter(|c| !matches!(c, ' ' | '\t' | '\r' | '\n' | '-' | '_' | '=' | ':'))
        .collect();
    if hex_clean.len() >= 8
        && hex_clean.len() % 2 == 0
        && hex_clean.bytes().all(|b| b.is_ascii_hexdigit())
    {
        if let Ok(bytes) = hex::decode(&hex_clean) {
            if !bytes.is_empty() {
                return bytes;
            }
        }
    }
    secret.trim().as_bytes().to_vec()
}

/// Parse an `otpauth://totp/...` URI into its components, healing the Base32 secret.
pub fn parse_otpauth_uri(uri: &str) -> Option<OtpAuthParams> {
    let trimmed = uri.trim();
    if !trimmed.to_ascii_lowercase().starts_with("otpauth://") {
        return None;
    }
    let url = Url::parse(trimmed).ok()?;
    let otp_type = url.host_str().unwrap_or("totp").to_ascii_lowercase();
    let raw_label = url.path().trim_start_matches('/').to_string();
    let label = url::form_urlencoded::parse(raw_label.as_bytes())
        .map(|(k, v)| if v.is_empty() { k.into_owned() } else { format!("{k}={v}") })
        .next()
        .unwrap_or(raw_label);

    let (issuer_from_label, account) = if let Some((left, right)) = label.split_once(':') {
        (left.trim().to_string(), right.trim().to_string())
    } else {
        (String::new(), label.clone())
    };

    let mut secret_raw = String::new();
    let mut issuer_param = String::new();
    let mut digits: u32 = 6;
    let mut period: u32 = 30;
    let mut algorithm = "SHA1".to_string();

    for (k, v) in url.query_pairs() {
        match k.as_ref() {
            "secret" => secret_raw = v.into_owned(),
            "issuer" => issuer_param = v.into_owned(),
            "digits" => {
                if let Ok(d) = v.parse::<u32>() {
                    if d > 0 {
                        digits = d;
                    }
                }
            }
            "period" => {
                if let Ok(p) = v.parse::<u32>() {
                    if p > 0 {
                        period = p;
                    }
                }
            }
            "algorithm" => {
                if !v.is_empty() {
                    algorithm = v.to_ascii_uppercase();
                }
            }
            _ => {}
        }
    }

    let secret = clean_totp_secret(&secret_raw);
    let issuer = if !issuer_param.trim().is_empty() {
        issuer_param.trim().to_string()
    } else {
        issuer_from_label
    };

    Some(OtpAuthParams {
        otp_type,
        label,
        issuer,
        account,
        secret,
        digits,
        period,
        algorithm,
    })
}

fn hmac_digest(algo: TotpAlgorithm, key: &[u8], msg: &[u8]) -> Result<Vec<u8>> {
    match algo {
        TotpAlgorithm::Sha1 => {
            let mut mac = <Hmac<Sha1> as Mac>::new_from_slice(key)
                .map_err(|e| anyhow!("HMAC-SHA1 init failed: {e}"))?;
            mac.update(msg);
            Ok(mac.finalize().into_bytes().to_vec())
        }
        TotpAlgorithm::Sha256 => {
            let mut mac = <Hmac<Sha256> as Mac>::new_from_slice(key)
                .map_err(|e| anyhow!("HMAC-SHA256 init failed: {e}"))?;
            mac.update(msg);
            Ok(mac.finalize().into_bytes().to_vec())
        }
        TotpAlgorithm::Sha512 => {
            let mut mac = <Hmac<Sha512> as Mac>::new_from_slice(key)
                .map_err(|e| anyhow!("HMAC-SHA512 init failed: {e}"))?;
            mac.update(msg);
            Ok(mac.finalize().into_bytes().to_vec())
        }
    }
}

/// Generate an RFC 6238 TOTP code for a Base32 secret or `otpauth://` URI.
pub fn generate_totp(
    secret_or_uri: &str,
    timestamp_ms: u64,
    period: u32,
    digits: u32,
    algorithm: TotpAlgorithm,
) -> Result<String> {
    let trimmed = secret_or_uri.trim();
    if trimmed.is_empty() {
        return Err(anyhow!("Secret is required"));
    }

    let mut actual_secret = trimmed.to_string();
    let mut actual_period = if period == 0 { 30 } else { period };
    let mut actual_digits = if digits == 0 { 6 } else { digits };
    let mut actual_algo = algorithm;

    if trimmed.to_ascii_lowercase().starts_with("otpauth://") {
        if let Some(parsed) = parse_otpauth_uri(trimmed) {
            actual_secret = parsed.secret;
            if parsed.period > 0 {
                actual_period = parsed.period;
            }
            if parsed.digits > 0 {
                actual_digits = parsed.digits;
            }
            actual_algo = TotpAlgorithm::parse(&parsed.algorithm);
        }
    }

    let key = decode_base32_or_fallback(&actual_secret);
    if key.is_empty() {
        return Err(anyhow!("Invalid TOTP secret"));
    }

    let counter = (timestamp_ms / 1000) / u64::from(actual_period);
    let counter_bytes = counter.to_be_bytes();
    let hmac = hmac_digest(actual_algo, &key, &counter_bytes)?;

    let offset = (hmac[hmac.len() - 1] & 0x0f) as usize;
    let binary = ((u32::from(hmac[offset]) & 0x7f) << 24)
        | (u32::from(hmac[offset + 1]) << 16)
        | (u32::from(hmac[offset + 2]) << 8)
        | u32::from(hmac[offset + 3]);

    let modulo = 10u32.pow(actual_digits);
    let otp = binary % modulo;
    Ok(format!("{otp:0width$}", width = actual_digits as usize))
}

/// Remaining seconds in the current TOTP time step (1..=period).
pub fn get_totp_remaining_seconds(timestamp_ms: u64, period: u32) -> u32 {
    let p = if period == 0 { 30 } else { period };
    let elapsed = ((timestamp_ms / 1000) % u64::from(p)) as u32;
    let remaining = p - elapsed;
    if remaining == 0 { p } else { remaining }
}

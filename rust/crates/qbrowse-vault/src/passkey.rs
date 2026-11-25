use anyhow::{anyhow, Result};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use ed25519_dalek::{
    pkcs8::{
        DecodePrivateKey as EdDecodePrivateKey, EncodePrivateKey as EdEncodePrivateKey,
        EncodePublicKey as EdEncodePublicKey,
    },
    Signer as EdSigner, SigningKey as EdSigningKey,
};
use p256::{
    ecdsa::{Signature as P256Signature, SigningKey as P256SigningKey},
    pkcs8::LineEnding,
    SecretKey as P256SecretKey,
};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PasskeyAlgorithm {
    Es256,
    EdDsa,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedPasskey {
    pub algorithm: PasskeyAlgorithm,
    pub cose_algorithm: i32,
    pub private_key_pem: String,
    pub public_key_pem: String,
    pub public_key_jwk: serde_json::Value,
    pub private_key_jwk: serde_json::Value,
}

/// Generate a new WebAuthn passkey keypair (`ES256` P-256 or `EdDSA` Ed25519)
/// returning PKCS#8 PEM and JWK representations.
pub fn generate_passkey(alg: PasskeyAlgorithm) -> Result<GeneratedPasskey> {
    match alg {
        PasskeyAlgorithm::Es256 => {
            let secret = P256SecretKey::random(&mut OsRng);
            let signing = P256SigningKey::from(&secret);
            let verifying = signing.verifying_key();
            let point = verifying.to_encoded_point(false);
            let x = URL_SAFE_NO_PAD.encode(point.x().ok_or_else(|| anyhow!("missing X"))?);
            let y = URL_SAFE_NO_PAD.encode(point.y().ok_or_else(|| anyhow!("missing Y"))?);
            let d = URL_SAFE_NO_PAD.encode(secret.to_bytes());

            let private_key_pem = secret
                .to_pkcs8_pem(LineEnding::LF)
                .map_err(|e| anyhow!("P-256 PKCS#8 encode error: {e}"))?
                .to_string();
            let public_key_pem = verifying
                .to_public_key_pem(LineEnding::LF)
                .map_err(|e| anyhow!("P-256 SPKI encode error: {e}"))?;

            let public_key_jwk = serde_json::json!({
                "kty": "EC",
                "crv": "P-256",
                "x": x,
                "y": y,
                "alg": "ES256",
                "ext": true
            });
            let private_key_jwk = serde_json::json!({
                "kty": "EC",
                "crv": "P-256",
                "x": x,
                "y": y,
                "d": d,
                "alg": "ES256",
                "ext": true
            });

            Ok(GeneratedPasskey {
                algorithm: alg,
                cose_algorithm: -7,
                private_key_pem,
                public_key_pem,
                public_key_jwk,
                private_key_jwk,
            })
        }
        PasskeyAlgorithm::EdDsa => {
            let signing = EdSigningKey::generate(&mut OsRng);
            let verifying = signing.verifying_key();
            let x = URL_SAFE_NO_PAD.encode(verifying.as_bytes());
            let d = URL_SAFE_NO_PAD.encode(signing.to_bytes());

            let private_key_pem = signing
                .to_pkcs8_pem(LineEnding::LF)
                .map_err(|e| anyhow!("Ed25519 PKCS#8 encode error: {e}"))?
                .to_string();
            let public_key_pem = verifying
                .to_public_key_pem(LineEnding::LF)
                .map_err(|e| anyhow!("Ed25519 SPKI encode error: {e}"))?;

            let public_key_jwk = serde_json::json!({
                "kty": "OKP",
                "crv": "Ed25519",
                "x": x,
                "alg": "EdDSA",
                "ext": true
            });
            let private_key_jwk = serde_json::json!({
                "kty": "OKP",
                "crv": "Ed25519",
                "x": x,
                "d": d,
                "alg": "EdDSA",
                "ext": true
            });

            Ok(GeneratedPasskey {
                algorithm: alg,
                cose_algorithm: -8,
                private_key_pem,
                public_key_pem,
                public_key_jwk,
                private_key_jwk,
            })
        }
    }
}

/// Sign a WebAuthn assertion (`authenticatorData || clientDataHash`) using a PKCS#8 PEM or JWK private key.
/// Returns DER-encoded signature for P-256 (`ES256`) or 64-byte raw signature for Ed25519 (`EdDSA`).
pub fn sign_passkey_assertion(
    private_key_pem_or_jwk: &str,
    authenticator_data: &[u8],
    client_data_hash: &[u8],
) -> Result<Vec<u8>> {
    let mut payload = Vec::with_capacity(authenticator_data.len() + client_data_hash.len());
    payload.extend_from_slice(authenticator_data);
    payload.extend_from_slice(client_data_hash);

    let trimmed = private_key_pem_or_jwk.trim();
    if trimmed.starts_with('{') {
        let jwk: serde_json::Value =
            serde_json::from_str(trimmed).map_err(|e| anyhow!("Invalid JWK JSON: {e}"))?;
        let kty = jwk.get("kty").and_then(|v| v.as_str()).unwrap_or("");
        let crv = jwk.get("crv").and_then(|v| v.as_str()).unwrap_or("");
        let d_b64 = jwk
            .get("d")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("JWK missing private parameter 'd'"))?;
        let d_bytes = URL_SAFE_NO_PAD
            .decode(d_b64)
            .map_err(|e| anyhow!("Invalid base64url in JWK 'd': {e}"))?;

        return match (kty, crv) {
            ("EC", "P-256") => {
                let signing = P256SigningKey::from_slice(&d_bytes)
                    .map_err(|e| anyhow!("Invalid P-256 JWK 'd': {e}"))?;
                let sig: P256Signature = signing.sign(&payload);
                Ok(sig.to_der().as_bytes().to_vec())
            }
            ("OKP", "Ed25519") => {
                let arr: [u8; 32] = d_bytes
                    .try_into()
                    .map_err(|_| anyhow!("Ed25519 JWK 'd' must be 32 bytes"))?;
                let signing = EdSigningKey::from_bytes(&arr);
                Ok(signing.sign(&payload).to_bytes().to_vec())
            }
            _ => Err(anyhow!("Unsupported JWK key type: {kty}/{crv}")),
        };
    }

    if let Ok(signing) = P256SigningKey::from_pkcs8_pem(trimmed) {
        let sig: P256Signature = signing.sign(&payload);
        return Ok(sig.to_der().as_bytes().to_vec());
    }
    if let Ok(signing) = EdSigningKey::from_pkcs8_pem(trimmed) {
        return Ok(signing.sign(&payload).to_bytes().to_vec());
    }

    Err(anyhow!("Unsupported or invalid PKCS#8 PEM private key"))
}

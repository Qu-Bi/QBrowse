pub mod crypto;
pub mod importer;
pub mod passkey;
pub mod totp;
pub mod win_hello;

pub use crypto::{
    decrypt, derive_key, derive_legacy_key, derive_legacy_key_2026, encrypt,
    extract_vault_item_meta, heal_and_decrypt_vault_items, is_encrypted_payload,
    pack_vault_item_title, safe_decrypt, BioConfig, DecryptedVaultItem, PinConfig,
    PinUnlockResult, VaultFile, VaultItemMeta, VaultSession, VaultStoredItem, CANARY_PLAINTEXT,
    PIN_LOCKOUT_DURATION_MS, PIN_LOCKOUT_THRESHOLD,
};
pub use importer::{import_vault_data, ImportedVaultItem, VaultImportResult};
pub use passkey::{generate_passkey, sign_passkey_assertion, GeneratedPasskey, PasskeyAlgorithm};
pub use totp::{
    clean_totp_secret, generate_totp, get_totp_remaining_seconds, parse_otpauth_uri, OtpAuthParams,
    TotpAlgorithm,
};
pub use win_hello::{
    check_windows_hello_available, dpapi_protect_local_user, dpapi_unprotect_local_user,
    verify_windows_hello, WindowsHelloResult,
};

pub fn ping() -> &'static str {
    "qbrowse-vault"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_crypto_roundtrip_and_legacy() {
        let key = derive_key("SuperSecret123!", Some("00112233445566778899aabbccddeeff"))
            .expect("derive_key");
        let enc = encrypt("my-password", &key).expect("encrypt");
        assert!(is_encrypted_payload(&enc));
        assert_eq!(decrypt(&enc, &key).expect("decrypt"), "my-password");

        let legacy = derive_legacy_key("SuperSecret123!");
        let enc_leg = encrypt("legacy-pw", &legacy).expect("encrypt legacy");
        assert_eq!(safe_decrypt(&enc_leg, &legacy).as_deref(), Some("legacy-pw"));
        assert!(safe_decrypt(&enc_leg, &key).is_none());
    }

    #[test]
    fn test_vault_session_unlock_heal_and_lock() {
        let legacy_key = derive_legacy_key("MasterPass");
        let mut vault = VaultFile {
            canary: Some(encrypt(CANARY_PLAINTEXT, &legacy_key).unwrap()),
            passwords: vec![
                VaultStoredItem {
                    id: Some("1".into()),
                    title: "GitHub|||{\"type\":\"login\",\"totpSecret\":\"JBSWY3DPEHPK3PXP\",\"notes\":\"work\"}".into(),
                    url: "secretPass99".into(),
                    username: "https://github.com/login".into(),
                    password: Some(encrypt("alice", &legacy_key).unwrap()),
                    ..Default::default()
                },
            ],
            ..Default::default()
        };

        let mut session = VaultSession::new();
        let items = session
            .unlock_with_password(&mut vault, "MasterPass")
            .expect("unlock");
        assert!(session.is_unlocked());
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].title, "GitHub");
        assert_eq!(items[0].url, "https://github.com/login");
        assert_eq!(items[0].username, "alice");
        assert_eq!(items[0].password, "secretPass99");
        assert_eq!(items[0].totp_secret.as_deref(), Some("JBSWY3DPEHPK3PXP"));
        assert_eq!(items[0].notes, "work");

        session.lock_vault();
        assert!(!session.is_unlocked());
        assert!(session.master_key().is_none());
    }

    #[test]
    fn test_pin_lockout_state_machine() {
        let mut vault = VaultFile::default();
        let mut session = VaultSession::new();
        session.unlock_with_password(&mut vault, "Master1").unwrap();
        session.setup_pin(&mut vault, "4242").unwrap();
        session.lock_vault();

        for attempt in 1..=4 {
            let res = session.unlock_with_pin(&mut vault, "0000", 1_000 + attempt);
            assert!(!res.success);
            assert!(!res.locked_out);
            assert_eq!(res.failed_attempts, attempt as u32);
        }

        let locked = session.unlock_with_pin(&mut vault, "0000", 2_000);
        assert!(!locked.success);
        assert!(locked.locked_out);
        assert_eq!(locked.lock_until, 32_000);

        let still_locked = session.unlock_with_pin(&mut vault, "4242", 10_000);
        assert!(!still_locked.success);
        assert!(still_locked.locked_out);
        assert_eq!(still_locked.remaining_seconds, 22);

        let unlocked = session.unlock_with_pin(&mut vault, "4242", 32_001);
        assert!(unlocked.success);
        assert!(session.is_unlocked());
    }

    #[test]
    fn test_passkey_es256_and_eddsa() {
        let p256 = generate_passkey(PasskeyAlgorithm::Es256).expect("es256");
        let sig1 = sign_passkey_assertion(&p256.private_key_pem, b"auth", b"hash").unwrap();
        let sig2 = sign_passkey_assertion(&p256.private_key_jwk.to_string(), b"auth", b"hash").unwrap();
        assert!(!sig1.is_empty());
        assert!(!sig2.is_empty());

        let ed = generate_passkey(PasskeyAlgorithm::EdDsa).expect("eddsa");
        let ed_sig1 = sign_passkey_assertion(&ed.private_key_pem, b"auth", b"hash").unwrap();
        let ed_sig2 = sign_passkey_assertion(&ed.private_key_jwk.to_string(), b"auth", b"hash").unwrap();
        assert_eq!(ed_sig1.len(), 64);
        assert_eq!(ed_sig1, ed_sig2);
    }

    #[test]
    fn test_totp_rfc6238_and_otpauth_healing() {
        // RFC 6238 test vector for SHA1 at t=59s ("12345678901234567890" -> GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ)
        let code = generate_totp(
            "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
            59_000,
            30,
            8,
            TotpAlgorithm::Sha1,
        )
        .unwrap();
        assert_eq!(code, "94287082");

        let parsed = parse_otpauth_uri(
            "otpauth://totp/GitHub:alice%40example.com?secret=jbswy3dp018k3pxp&issuer=GitHub&digits=6&period=30&algorithm=SHA256",
        )
        .unwrap();
        assert_eq!(parsed.secret, "JBSWY3DPOIBK3PXP");
        assert_eq!(parsed.algorithm, "SHA256");
        assert_eq!(get_totp_remaining_seconds(59_000, 30), 1);
    }

    #[test]
    fn test_import_vault_data_dedup() {
        let csv = "name,url,username,password\nGitHub,https://github.com/login,alice,pw1\nGitHub Dup,https://github.com/signup,alice,pw1\nGoogle,https://accounts.google.com,bob,pw2\n";
        let res = import_vault_data(csv, "chrome.csv");
        assert_eq!(res.source_name, "Chrome/Browser");
        assert_eq!(res.total_parsed, 3);
        assert_eq!(res.duplicates_removed, 1);
        assert_eq!(res.items.len(), 2);
    }
}

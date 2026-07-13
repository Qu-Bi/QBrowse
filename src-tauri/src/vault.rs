use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use argon2::{
    password_hash::{rand_core::OsRng as ArgonOsRng, PasswordHasher, SaltString},
    Argon2,
};
use rusqlite::{params, Connection, Result as SqlResult};
use std::path::PathBuf;

pub struct VaultState {
    pub db_path: PathBuf,
}

#[derive(serde::Serialize)]
pub struct VaultItem {
    pub id: i32,
    pub title: String,
    pub username: String,
    pub encrypted_password: Vec<u8>,
    pub url: String,
}

pub fn init_db(db_path: &PathBuf) -> SqlResult<Connection> {
    let conn = Connection::open(db_path)?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS vault (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            username TEXT NOT NULL,
            encrypted_password BLOB NOT NULL,
            url TEXT NOT NULL
        )",
        [],
    )?;
    Ok(conn)
}

fn derive_key(master_password: &str, salt: &[u8]) -> [u8; 32] {
    // In a real app, you'd store the salt alongside the DB and retrieve it.
    // For this milestone, we use a fixed or simple salt approach.
    let argon2 = Argon2::default();
    let mut key = [0u8; 32];
    // Hash password into key (simplified for milestone)
    argon2::Argon2::default()
        .hash_password_into(master_password.as_bytes(), salt, &mut key)
        .expect("Failed to derive key");
    key
}

#[tauri::command]
pub fn add_password(
    title: String,
    username: String,
    password_plaintext: String,
    url: String,
    master_password: String,
    state: tauri::State<VaultState>,
) -> Result<bool, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;

    let salt = b"static_salt_for_milestone_only"; // Replace with dynamic salt
    let key = derive_key(&master_password, salt);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng); // 96-bits; unique per message

    let mut encrypted_password = cipher
        .encrypt(&nonce, password_plaintext.as_bytes())
        .map_err(|e| e.to_string())?;
    
    // Prepend nonce to ciphertext for decryption later
    let mut final_blob = nonce.to_vec();
    final_blob.append(&mut encrypted_password);

    conn.execute(
        "INSERT INTO vault (title, username, encrypted_password, url) VALUES (?1, ?2, ?3, ?4)",
        params![title, username, final_blob, url],
    )
    .map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub fn get_passwords(
    master_password: String,
    state: tauri::State<VaultState>,
) -> Result<Vec<VaultItem>, String> {
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, title, username, encrypted_password, url FROM vault")
        .map_err(|e| e.to_string())?;

    let salt = b"static_salt_for_milestone_only";
    let key = derive_key(&master_password, salt);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;

    let item_iter = stmt
        .query_map([], |row| {
            let blob: Vec<u8> = row.get(3)?;
            // Decrypt password
            // In a full implementation, you'd decrypt here or return the blob.
            // We'll just return the blob for the milestone struct.
            Ok(VaultItem {
                id: row.get(0)?,
                title: row.get(1)?,
                username: row.get(2)?,
                encrypted_password: blob,
                url: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for item in item_iter {
        items.push(item.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

use anyhow::Result;
use image::imageops::FilterType;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256, Sha512};
use std::fs::{self, File};
use std::io::Read;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HashAlgo {
    Sha256,
    Sha512,
    Blake3,
}

impl HashAlgo {
    pub fn parse(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "sha256" | "sha-256" => Some(Self::Sha256),
            "sha512" | "sha-512" => Some(Self::Sha512),
            "blake3" => Some(Self::Blake3),
            _ => None,
        }
    }
}

/// Stream-hash a file in 64 KB chunks using `sha256`, `sha512`, or `blake3`.
pub fn hash_file(file_path: &str, algo: HashAlgo) -> Result<String> {
    let mut file = File::open(file_path)?;
    let mut buf = [0u8; 64 * 1024];

    match algo {
        HashAlgo::Sha256 => {
            let mut hasher = Sha256::new();
            loop {
                let n = file.read(&mut buf)?;
                if n == 0 {
                    break;
                }
                hasher.update(&buf[..n]);
            }
            Ok(hex::encode(hasher.finalize()))
        }
        HashAlgo::Sha512 => {
            let mut hasher = Sha512::new();
            loop {
                let n = file.read(&mut buf)?;
                if n == 0 {
                    break;
                }
                hasher.update(&buf[..n]);
            }
            Ok(hex::encode(hasher.finalize()))
        }
        HashAlgo::Blake3 => {
            let mut hasher = blake3::Hasher::new();
            loop {
                let n = file.read(&mut buf)?;
                if n == 0 {
                    break;
                }
                hasher.update(&buf[..n]);
            }
            Ok(hasher.finalize().to_hex().to_string())
        }
    }
}

fn sanitize_tab_id(tab_id: &str) -> String {
    let cleaned: String = tab_id
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();
    if cleaned.is_empty() {
        "tab".to_string()
    } else {
        cleaned
    }
}

/// Decode PNG/JPEG/etc., resize down to at most 640px wide, encode as WebP to
/// `<thumbnails_dir>/<tab_id>.webp`, and return `qbrowse-thumb://tab/<tab_id>?t=<ts>`.
pub fn save_tab_thumbnail(thumbnails_dir: &str, tab_id: &str, image_bytes: &[u8]) -> Result<String> {
    let dir = Path::new(thumbnails_dir);
    fs::create_dir_all(dir)?;

    let safe_id = sanitize_tab_id(tab_id);
    let img = image::load_from_memory(image_bytes)?;
    let resized = if img.width() > 640 {
        let new_h = ((img.height() as f64) * (640.0 / img.width() as f64)).round() as u32;
        img.resize(640, new_h.max(1), FilterType::Triangle)
    } else {
        img
    };

    let out_path = dir.join(format!("{safe_id}.webp"));
    resized.save_with_format(&out_path, image::ImageFormat::WebP)?;

    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);

    Ok(format!("qbrowse-thumb://tab/{safe_id}?t={ts}"))
}

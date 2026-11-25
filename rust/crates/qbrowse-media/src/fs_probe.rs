use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

pub const MAX_TEXT_PROBE_BYTES: u64 = 2 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirEntryInfo {
    pub name: String,
    pub path: String,
    pub url: String,
    pub is_directory: bool,
    pub size: u64,
    pub human_size: String,
    pub mime: String,
    pub modified_ms: u64,
    pub hidden: bool,
    pub extension: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathSuggestion {
    pub name: String,
    pub path: String,
    pub url: String,
    pub is_directory: bool,
    pub extension: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileProbe {
    pub stream_url: String,
    pub path: String,
    pub name: String,
    pub size: u64,
    pub mime: String,
    pub mtime: u64,
    pub is_text: bool,
    pub text_content: Option<String>,
    pub base64: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileRangeResponse {
    pub status: u16,
    pub content_type: String,
    pub content_range: Option<String>,
    pub total_size: u64,
    pub bytes: Vec<u8>,
}

pub fn format_human_size(bytes: u64) -> String {
    const UNITS: [&str; 5] = ["B", "KB", "MB", "GB", "TB"];
    if bytes < 1024 {
        return format!("{bytes} B");
    }
    let mut size = bytes as f64;
    let mut unit_idx = 0;
    while size >= 1024.0 && unit_idx < UNITS.len() - 1 {
        size /= 1024.0;
        unit_idx += 1;
    }
    format!("{size:.1} {}", UNITS[unit_idx])
}

pub fn is_text_extension(ext: &str) -> bool {
    matches!(
        ext.to_ascii_lowercase().as_str(),
        "txt"
            | "md"
            | "markdown"
            | "csv"
            | "tsv"
            | "json"
            | "js"
            | "jsx"
            | "mjs"
            | "cjs"
            | "ts"
            | "tsx"
            | "css"
            | "scss"
            | "less"
            | "html"
            | "htm"
            | "xml"
            | "svg"
            | "yaml"
            | "yml"
            | "toml"
            | "ini"
            | "conf"
            | "py"
            | "sh"
            | "bash"
            | "zsh"
            | "bat"
            | "ps1"
            | "c"
            | "cpp"
            | "h"
            | "hpp"
            | "java"
            | "rs"
            | "go"
            | "sql"
            | "log"
            | "env"
    )
}

pub fn mime_from_extension(ext: &str) -> &'static str {
    match ext.to_ascii_lowercase().as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "ogg" => "audio/ogg",
        "m4a" => "audio/mp4",
        "flac" => "audio/flac",
        "aac" => "audio/aac",
        "opus" => "audio/opus",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "mov" => "video/quicktime",
        "mkv" => "video/x-matroska",
        "pdf" => "application/pdf",
        "html" | "htm" => "text/html",
        "css" => "text/css",
        "js" | "mjs" | "cjs" => "application/javascript",
        "json" => "application/json",
        "csv" => "text/csv",
        "md" | "markdown" => "text/markdown",
        "xml" => "application/xml",
        "yaml" | "yml" => "text/yaml",
        e if is_text_extension(e) => "text/plain",
        _ => "application/octet-stream",
    }
}

fn path_to_file_url(path: &Path) -> String {
    let s = path.to_string_lossy().replace('\\', "/");
    if s.starts_with('/') {
        format!("file://{s}")
    } else {
        format!("file:///{s}")
    }
}

fn encode_uri_component(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.' | b'~') {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

fn is_hidden_entry(name: &str, metadata: &fs::Metadata) -> bool {
    if name.starts_with('.') {
        return true;
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
        if metadata.file_attributes() & FILE_ATTRIBUTE_HIDDEN != 0 {
            return true;
        }
    }
    #[cfg(not(windows))]
    let _ = metadata;
    false
}

fn modified_ms(metadata: &fs::Metadata) -> u64 {
    metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// List directory entries sorted folders-first, then case-insensitively by name.
pub fn list_directory(dir_path: &str) -> Result<Vec<DirEntryInfo>> {
    let entries = fs::read_dir(dir_path)?;
    let mut items = Vec::new();

    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        let path = entry.path();
        let Ok(meta) = entry.metadata() else {
            continue;
        };
        let is_directory = meta.is_dir();
        let size = if is_directory { 0 } else { meta.len() };
        let extension = if is_directory {
            String::new()
        } else {
            path.extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_ascii_lowercase()
        };
        let mime = if is_directory {
            "inode/directory".to_string()
        } else {
            mime_from_extension(&extension).to_string()
        };

        items.push(DirEntryInfo {
            name: name.clone(),
            path: path.to_string_lossy().to_string(),
            url: path_to_file_url(&path),
            is_directory,
            size,
            human_size: if is_directory {
                String::from("-")
            } else {
                format_human_size(size)
            },
            mime,
            modified_ms: modified_ms(&meta),
            hidden: is_hidden_entry(&name, &meta),
            extension,
        });
    }

    items.sort_by(|a, b| {
        b.is_directory
            .cmp(&a.is_directory)
            .then_with(|| a.name.to_ascii_lowercase().cmp(&b.name.to_ascii_lowercase()))
    });

    Ok(items)
}

/// Fast (< 1 ms) omnibox local path autocomplete.
pub fn autocomplete_path(prefix: &str, limit: usize) -> Vec<PathSuggestion> {
    let max_items = if limit == 0 { 25 } else { limit };
    let mut raw = prefix.trim().to_string();
    if raw.is_empty() {
        return Vec::new();
    }

    if let Some(stripped) = raw.strip_prefix("file:///") {
        raw = stripped.to_string();
    } else if let Some(stripped) = raw.strip_prefix("file://") {
        raw = stripped.to_string();
    }

    if raw == "~" || raw.starts_with("~/") || raw.starts_with("~\\") {
        if let Some(home) = std::env::var_os("HOME").or_else(|| std::env::var_os("USERPROFILE")) {
            let rest = raw.trim_start_matches('~').trim_start_matches(['/', '\\']);
            raw = PathBuf::from(home).join(rest).to_string_lossy().to_string();
        }
    }

    let ends_with_sep = raw.ends_with('/') || raw.ends_with('\\');
    let raw_path = PathBuf::from(&raw);
    let (search_dir, name_prefix) = if ends_with_sep {
        (raw_path, String::new())
    } else {
        let dir = raw_path
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| PathBuf::from("."));
        let pfx = raw_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        (dir, pfx)
    };

    let Ok(entries) = fs::read_dir(&search_dir) else {
        return Vec::new();
    };

    let mut matches = Vec::new();
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if !name_prefix.is_empty() && !name.to_ascii_lowercase().starts_with(&name_prefix) {
            continue;
        }
        let full_path = entry.path();
        let is_directory = entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
        let extension = if is_directory {
            String::new()
        } else {
            full_path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_ascii_lowercase()
        };
        matches.push(PathSuggestion {
            name,
            path: full_path.to_string_lossy().to_string(),
            url: path_to_file_url(&full_path),
            is_directory,
            extension,
        });
        if matches.len() >= max_items {
            break;
        }
    }
    matches
}

/// Strip Windows extended-length path prefixes (`\\?\UNC\` -> `\\`, `\\?\` -> ``).
pub fn strip_windows_extended_prefix(path: &Path) -> PathBuf {
    let raw = path.to_string_lossy();
    if let Some(unc) = raw.strip_prefix(r"\\?\UNC\") {
        PathBuf::from(format!(r"\\{unc}"))
    } else if let Some(stripped) = raw.strip_prefix(r"\\?\") {
        PathBuf::from(stripped)
    } else {
        path.to_path_buf()
    }
}

/// Probe a local file. Only reads `text_content` for text/code/md/csv files `<= 2 MB`.
/// Never Base64-encodes binary PDFs/video/audio/images.
pub fn probe_local_file(file_path: &str) -> Result<LocalFileProbe> {
    let path = Path::new(file_path);
    let meta = fs::metadata(path)?;
    if meta.is_dir() {
        return Err(anyhow!("Path is a directory"));
    }

    let size = meta.len();
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let is_text = is_text_extension(&ext);
    let mime = mime_from_extension(&ext).to_string();

    let text_content = if is_text && size <= MAX_TEXT_PROBE_BYTES {
        let bytes = fs::read(path)?;
        Some(String::from_utf8_lossy(&bytes).into_owned())
    } else {
        None
    };

    let canonical = fs::canonicalize(path)
        .map(|p| strip_windows_extended_prefix(&p))
        .unwrap_or_else(|_| strip_windows_extended_prefix(path));
    let path_str = canonical.to_string_lossy().to_string();
    let stream_url = format!("qbrowse-local://file?path={}", encode_uri_component(&path_str));

    Ok(LocalFileProbe {
        stream_url,
        path: path_str,
        name,
        size,
        mime,
        mtime: modified_ms(&meta),
        is_text,
        text_content,
        base64: None,
    })
}

/// Read a local file with optional HTTP `Range: bytes=...` support, returning `206` or `200`.
pub fn read_file_range(
    file_path: &str,
    range_header: Option<&str>,
    max_chunk_bytes: usize,
) -> Result<FileRangeResponse> {
    let path = Path::new(file_path);
    let mut file = File::open(path)?;
    let total_size = file.metadata()?.len();
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let content_type = mime_from_extension(&ext).to_string();

    if total_size == 0 {
        return Ok(FileRangeResponse {
            status: 200,
            content_type,
            content_range: None,
            total_size: 0,
            bytes: Vec::new(),
        });
    }

    let cap = if max_chunk_bytes == 0 {
        usize::MAX
    } else {
        max_chunk_bytes
    };

    if let Some(header) = range_header {
        let trimmed = header.trim();
        if let Some(spec) = trimmed.strip_prefix("bytes=") {
            let first_range = spec.split(',').next().unwrap_or("").trim();
            if let Some((start_s, end_s)) = first_range.split_once('-') {
                let (start, mut end) = if start_s.is_empty() {
                    let suffix: u64 = end_s
                        .parse()
                        .map_err(|_| anyhow!("Invalid suffix range"))?;
                    let s = total_size.saturating_sub(suffix);
                    (s, total_size - 1)
                } else {
                    let s: u64 = start_s
                        .parse()
                        .map_err(|_| anyhow!("Invalid range start"))?;
                    let e = if end_s.is_empty() {
                        total_size - 1
                    } else {
                        end_s
                            .parse::<u64>()
                            .map_err(|_| anyhow!("Invalid range end"))?
                            .min(total_size - 1)
                    };
                    (s, e)
                };

                if start >= total_size || start > end {
                    return Err(anyhow!("Range not satisfiable"));
                }

                let max_end = start.saturating_add(cap as u64).saturating_sub(1);
                if end > max_end {
                    end = max_end;
                }

                let len = (end - start + 1) as usize;
                let mut buf = vec![0u8; len];
                file.seek(SeekFrom::Start(start))?;
                file.read_exact(&mut buf)?;

                return Ok(FileRangeResponse {
                    status: 206,
                    content_type,
                    content_range: Some(format!("bytes {start}-{end}/{total_size}")),
                    total_size,
                    bytes: buf,
                });
            }
        }
    }

    let to_read = total_size as usize;
    let mut buf = vec![0u8; to_read];
    file.read_exact(&mut buf)?;
    Ok(FileRangeResponse {
        status: 200,
        content_type,
        content_range: None,
        total_size,
        bytes: buf,
    })
}

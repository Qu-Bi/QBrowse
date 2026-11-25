use anyhow::{anyhow, Context, Result};
use dashmap::DashMap;
use flate2::read::GzDecoder;
use reqwest::header::{CONTENT_LENGTH, CONTENT_RANGE, RANGE, USER_AGENT};
use reqwest::StatusCode;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io;
use std::path::{Component, Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tar::Archive;
use tokio::io::AsyncWriteExt;
use url::Url;
use zip::ZipArchive;

const DEFAULT_USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) QBrowse/1.4 Chrome/120.0.0.0 Safari/537.36";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub task_id: String,
    pub status: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percent: f64,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WebSearchResult {
    pub title: String,
    pub url: String,
    pub snippet: String,
}

fn part_path_for(dest_path: &Path) -> PathBuf {
    let mut os = dest_path.as_os_str().to_os_string();
    os.push(".part");
    PathBuf::from(os)
}

fn update_progress(
    progress_map: &DashMap<String, DownloadProgress>,
    task_id: &str,
    status: &str,
    downloaded_bytes: u64,
    total_bytes: u64,
    error: Option<String>,
) {
    let percent = if total_bytes > 0 {
        ((downloaded_bytes as f64 / total_bytes as f64) * 100.0).min(100.0)
    } else if status == "completed" {
        100.0
    } else {
        0.0
    };
    progress_map.insert(
        task_id.to_string(),
        DownloadProgress {
            task_id: task_id.to_string(),
            status: status.to_string(),
            downloaded_bytes,
            total_bytes,
            percent,
            error,
        },
    );
}

fn parse_total_from_content_range(header_val: &str) -> Option<u64> {
    // Format: "bytes 100-199/500" or "bytes */500"
    let slash_idx = header_val.rfind('/')?;
    let total_str = header_val[slash_idx + 1..].trim();
    if total_str == "*" {
        return None;
    }
    total_str.parse::<u64>().ok()
}

/// Download a file with HTTP Range resume support, `.part` atomic rename, progress tracking, and cancellation.
pub async fn download_file_resumable(
    url: &str,
    dest_path: &Path,
    task_id: &str,
    progress_map: &DashMap<String, DownloadProgress>,
    cancel_flag: Option<Arc<AtomicBool>>,
) -> Result<PathBuf> {
    if let Some(parent) = dest_path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .with_context(|| format!("Failed to create parent directory {}", parent.display()))?;
    }

    let part_path = part_path_for(dest_path);
    let existing_len = match tokio::fs::metadata(&part_path).await {
        Ok(meta) => meta.len(),
        Err(_) => 0,
    };

    let client = reqwest::Client::builder()
        .user_agent(DEFAULT_USER_AGENT)
        .redirect(reqwest::redirect::Policy::limited(10))
        .connect_timeout(Duration::from_secs(20))
        .build()
        .context("Failed to build reqwest client")?;

    let mut req = client.get(url).header(USER_AGENT, DEFAULT_USER_AGENT);
    if existing_len > 0 {
        req = req.header(RANGE, format!("bytes={}-", existing_len));
    }

    let mut response = req
        .send()
        .await
        .with_context(|| format!("Failed to send download request to {}", url))?;

    if response.status() == StatusCode::RANGE_NOT_SATISFIABLE {
        // Server rejected our Range offset; restart cleanly from 0.
        let _ = tokio::fs::remove_file(&part_path).await;
        response = client
            .get(url)
            .header(USER_AGENT, DEFAULT_USER_AGENT)
            .send()
            .await
            .with_context(|| format!("Failed to retry download request to {}", url))?;
    }

    let status = response.status();
    if !status.is_success() {
        let err_msg = format!("Download failed with HTTP {}", status.as_u16());
        update_progress(progress_map, task_id, "error", 0, 0, Some(err_msg.clone()));
        return Err(anyhow!(err_msg));
    }

    let is_partial = status == StatusCode::PARTIAL_CONTENT && existing_len > 0;
    let mut downloaded_bytes = if is_partial { existing_len } else { 0 };

    let total_bytes = if is_partial {
        response
            .headers()
            .get(CONTENT_RANGE)
            .and_then(|v| v.to_str().ok())
            .and_then(parse_total_from_content_range)
            .or_else(|| {
                response
                    .headers()
                    .get(CONTENT_LENGTH)
                    .and_then(|v| v.to_str().ok())
                    .and_then(|s| s.parse::<u64>().ok())
                    .map(|rem| existing_len + rem)
            })
            .unwrap_or(0)
    } else {
        response
            .headers()
            .get(CONTENT_LENGTH)
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0)
    };

    update_progress(
        progress_map,
        task_id,
        "downloading",
        downloaded_bytes,
        total_bytes,
        None,
    );

    let mut file = if is_partial {
        tokio::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&part_path)
            .await
            .with_context(|| format!("Failed to open {} for append", part_path.display()))?
    } else {
        tokio::fs::File::create(&part_path)
            .await
            .with_context(|| format!("Failed to create {}", part_path.display()))?
    };

    while let Some(chunk) = response
        .chunk()
        .await
        .context("Error reading download stream")?
    {
        if let Some(flag) = &cancel_flag {
            if flag.load(Ordering::Relaxed) {
                drop(file);
                let _ = tokio::fs::remove_file(&part_path).await;
                update_progress(
                    progress_map,
                    task_id,
                    "cancelled",
                    downloaded_bytes,
                    total_bytes,
                    Some("Download cancelled".to_string()),
                );
                return Err(anyhow!("Download cancelled"));
            }
        }

        file.write_all(&chunk)
            .await
            .context("Failed to write download chunk")?;
        downloaded_bytes += chunk.len() as u64;
        update_progress(
            progress_map,
            task_id,
            "downloading",
            downloaded_bytes,
            total_bytes,
            None,
        );
    }

    file.flush().await.context("Failed to flush .part file")?;
    drop(file);

    if tokio::fs::try_exists(dest_path).await.unwrap_or(false) {
        let _ = tokio::fs::remove_file(dest_path).await;
    }
    tokio::fs::rename(&part_path, dest_path)
        .await
        .with_context(|| {
            format!(
                "Failed to atomically rename {} to {}",
                part_path.display(),
                dest_path.display()
            )
        })?;

    let final_total = if total_bytes > 0 {
        total_bytes
    } else {
        downloaded_bytes
    };
    update_progress(
        progress_map,
        task_id,
        "completed",
        downloaded_bytes,
        final_total,
        None,
    );

    Ok(dest_path.to_path_buf())
}

/// Validate that a relative archive entry path cannot escape `dest_dir` (Zip-Slip prevention).
fn sanitize_archive_entry_path(dest_dir: &Path, entry_path: &Path) -> Result<PathBuf> {
    if entry_path.is_absolute() {
        return Err(anyhow!(
            "Unsafe archive entry path (absolute): {}",
            entry_path.display()
        ));
    }
    let mut clean = PathBuf::new();
    for comp in entry_path.components() {
        match comp {
            Component::Normal(part) => clean.push(part),
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err(anyhow!(
                    "Unsafe archive entry path (traversal): {}",
                    entry_path.display()
                ));
            }
        }
    }
    if clean.as_os_str().is_empty() {
        return Err(anyhow!("Empty archive entry path"));
    }
    Ok(dest_dir.join(clean))
}

/// Extract a `.zip` or `.tar.gz`/`.tgz` archive safely with strict Zip-Slip prevention.
pub fn extract_archive_safe(archive_path: &Path, dest_dir: &Path) -> Result<Vec<PathBuf>> {
    fs::create_dir_all(dest_dir)
        .with_context(|| format!("Failed to create destination dir {}", dest_dir.display()))?;
    let canonical_dest = fs::canonicalize(dest_dir)
        .with_context(|| format!("Failed to canonicalize {}", dest_dir.display()))?;

    let name_lower = archive_path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    if name_lower.ends_with(".zip") {
        extract_zip_safe(archive_path, &canonical_dest)
    } else if name_lower.ends_with(".tar.gz") || name_lower.ends_with(".tgz") {
        extract_tar_gz_safe(archive_path, &canonical_dest)
    } else {
        // Fallback: sniff magic bytes (PK for zip, 1f 8b for gzip)
        let header = fs::read(archive_path)
            .with_context(|| format!("Failed to read archive {}", archive_path.display()))?;
        if header.starts_with(b"PK") {
            extract_zip_safe(archive_path, &canonical_dest)
        } else if header.starts_with(&[0x1F, 0x8B]) {
            extract_tar_gz_safe(archive_path, &canonical_dest)
        } else {
            Err(anyhow!(
                "Unsupported archive format: {}",
                archive_path.display()
            ))
        }
    }
}

fn extract_zip_safe(archive_path: &Path, canonical_dest: &Path) -> Result<Vec<PathBuf>> {
    let file = File::open(archive_path)
        .with_context(|| format!("Failed to open ZIP {}", archive_path.display()))?;
    let mut archive = ZipArchive::new(file).context("Invalid ZIP archive")?;
    let mut extracted = Vec::new();

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)?;
        let Some(enclosed) = entry.enclosed_name() else {
            return Err(anyhow!(
                "Unsafe ZIP entry path (Zip-Slip detected): {}",
                entry
                    .name()
                    .map(|name| name.into_owned())
                    .unwrap_or_else(|error| format!("<invalid entry name: {error}>"))
            ));
        };
        let out_path = sanitize_archive_entry_path(canonical_dest, &enclosed)?;

        if entry.is_dir() {
            fs::create_dir_all(&out_path)?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent)?;
                let canonical_parent = fs::canonicalize(parent)?;
                if !canonical_parent.starts_with(canonical_dest) {
                    return Err(anyhow!(
                        "ZIP entry escapes destination directory: {}",
                        out_path.display()
                    ));
                }
            }
            let mut out_file = File::create(&out_path)?;
            io::copy(&mut entry, &mut out_file)?;
            #[cfg(unix)]
            if let Some(mode) = entry.unix_mode() {
                use std::os::unix::fs::PermissionsExt;
                let _ = fs::set_permissions(&out_path, fs::Permissions::from_mode(mode));
            }
            extracted.push(out_path);
        }
    }

    Ok(extracted)
}

fn extract_tar_gz_safe(archive_path: &Path, canonical_dest: &Path) -> Result<Vec<PathBuf>> {
    let file = File::open(archive_path)
        .with_context(|| format!("Failed to open tar.gz {}", archive_path.display()))?;
    let gz = GzDecoder::new(file);
    let mut archive = Archive::new(gz);
    let mut extracted = Vec::new();

    for entry_res in archive.entries()? {
        let mut entry = entry_res?;
        let entry_type = entry.header().entry_type();
        let entry_path = entry.path()?.into_owned();
        let out_path = sanitize_archive_entry_path(canonical_dest, &entry_path)?;

        if entry_type.is_symlink() || entry_type.is_hard_link() {
            return Err(anyhow!(
                "Unsafe link entry in tar archive: {}",
                entry_path.display()
            ));
        }

        if entry_type.is_dir() {
            fs::create_dir_all(&out_path)?;
        } else if entry_type.is_file() {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent)?;
                let canonical_parent = fs::canonicalize(parent)?;
                if !canonical_parent.starts_with(canonical_dest) {
                    return Err(anyhow!(
                        "Tar entry escapes destination directory: {}",
                        out_path.display()
                    ));
                }
            }
            let mut out_file = File::create(&out_path)?;
            io::copy(&mut entry, &mut out_file)?;
            #[cfg(unix)]
            if let Ok(mode) = entry.header().mode() {
                use std::os::unix::fs::PermissionsExt;
                let _ = fs::set_permissions(&out_path, fs::Permissions::from_mode(mode));
            }
            extracted.push(out_path);
        }
    }

    Ok(extracted)
}

/// Find a matching multimodal `mmproj-*.gguf` projector in `dir_path` for `model_filename`.
pub fn find_matching_mmproj(dir_path: &Path, model_filename: &str) -> Option<PathBuf> {
    let entries = fs::read_dir(dir_path).ok()?;
    let model_base = Path::new(model_filename)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or(model_filename)
        .to_ascii_lowercase();

    let mut candidates = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(fname) = path.file_name().and_then(|s| s.to_str()) else {
            continue;
        };
        let lower = fname.to_ascii_lowercase();
        if lower.starts_with("mmproj-") && (lower.ends_with(".gguf") || lower.ends_with(".bin")) {
            candidates.push((lower, path));
        }
    }

    candidates.sort_by(|a, b| a.0.cmp(&b.0));

    for (proj_lower, path) in &candidates {
        let matched = if model_base.contains("e4b") {
            proj_lower.contains("e4b")
        } else if model_base.contains("e2b") {
            proj_lower.contains("e2b")
        } else if model_base.contains("qwen") {
            proj_lower.contains("qwen")
        } else if model_base.contains("bielik") {
            false
        } else {
            !proj_lower.contains("e4b")
                && !proj_lower.contains("e2b")
                && !proj_lower.contains("qwen")
        };

        if matched {
            return Some(path.clone());
        }
    }

    None
}

/// Check `GET http://127.0.0.1:<port>/health` for `{"status": "ok"}`.
pub async fn check_llama_health(port: u16) -> Result<bool> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()?;
    let url = format!("http://127.0.0.1:{}/health", port);
    let resp = match client.get(&url).send().await {
        Ok(r) => r,
        Err(_) => return Ok(false),
    };
    if !resp.status().is_success() {
        return Ok(false);
    }
    let body: serde_json::Value = match resp.json().await {
        Ok(v) => v,
        Err(_) => return Ok(false),
    };
    Ok(body.get("status").and_then(|v| v.as_str()) == Some("ok"))
}

fn unwrap_ddg_url(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let normalized = if trimmed.starts_with("//") {
        format!("https:{}", trimmed)
    } else if trimmed.starts_with('/') {
        format!("https://duckduckgo.com{}", trimmed)
    } else {
        trimmed.to_string()
    };

    if let Ok(parsed) = Url::parse(&normalized) {
        if parsed
            .host_str()
            .map(|h| h.contains("duckduckgo.com"))
            .unwrap_or(false)
            && parsed.path().starts_with("/l/")
        {
            for (k, v) in parsed.query_pairs() {
                if k == "uddg" && !v.is_empty() {
                    return v.into_owned();
                }
            }
        }
    }
    normalized
}

/// Parse DuckDuckGo HTML search results from an HTML document string.
pub fn parse_ddg_html(html: &str, max_results: usize) -> Vec<WebSearchResult> {
    let doc = Html::parse_document(html);
    let result_sel = Selector::parse(".result, .web-result").unwrap();
    let title_sel = Selector::parse("a.result__a").unwrap();
    let url_sel = Selector::parse("a.result__url").unwrap();
    let snippet_sel = Selector::parse(".result__snippet").unwrap();

    let mut results = Vec::new();
    for el in doc.select(&result_sel) {
        if results.len() >= max_results {
            break;
        }
        let title_el = el.select(&title_sel).next();
        let url_el = el.select(&url_sel).next().or(title_el);
        let raw_href = url_el.and_then(|a| a.value().attr("href")).unwrap_or("");
        let url = unwrap_ddg_url(raw_href);
        if url.is_empty() {
            continue;
        }

        let title = title_el
            .map(|t| {
                t.text()
                    .collect::<String>()
                    .split_whitespace()
                    .collect::<Vec<_>>()
                    .join(" ")
            })
            .unwrap_or_default();
        let snippet = el
            .select(&snippet_sel)
            .next()
            .map(|s| {
                s.text()
                    .collect::<String>()
                    .split_whitespace()
                    .collect::<Vec<_>>()
                    .join(" ")
            })
            .unwrap_or_default();

        if title.is_empty() && snippet.is_empty() {
            continue;
        }

        results.push(WebSearchResult {
            title,
            url,
            snippet,
        });
    }

    results
}

/// Search the web via DuckDuckGo HTML endpoint using `reqwest` + `scraper`.
pub async fn search_web_ddg(query: &str, max_results: usize) -> Result<Vec<WebSearchResult>> {
    if max_results == 0 || query.trim().is_empty() {
        return Ok(Vec::new());
    }

    let client = reqwest::Client::builder()
        .user_agent(DEFAULT_USER_AGENT)
        .timeout(Duration::from_secs(12))
        .build()?;

    let mut url = Url::parse("https://html.duckduckgo.com/html/")?;
    url.query_pairs_mut().append_pair("q", query);

    let resp = client
        .get(url)
        .header(USER_AGENT, DEFAULT_USER_AGENT)
        .send()
        .await
        .context("Failed to query DuckDuckGo")?;

    if !resp.status().is_success() {
        return Err(anyhow!(
            "DuckDuckGo web search failed: HTTP {}",
            resp.status().as_u16()
        ));
    }

    let html = resp.text().await?;
    Ok(parse_ddg_html(&html, max_results))
}

#[cfg(test)]
mod tests {
    use super::*;
    use flate2::write::GzEncoder;
    use flate2::Compression;
    use std::io::Write;
    use tempfile_helpers::TempDir;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;
    use zip::write::SimpleFileOptions;

    mod tempfile_helpers {
        use std::path::{Path, PathBuf};

        pub struct TempDir(PathBuf);

        impl TempDir {
            pub fn new(prefix: &str) -> Self {
                let mut p = std::env::temp_dir();
                let nanos = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos();
                p.push(format!("{}_{}_{}", prefix, std::process::id(), nanos));
                std::fs::create_dir_all(&p).unwrap();
                Self(p)
            }

            pub fn path(&self) -> &Path {
                &self.0
            }
        }

        impl Drop for TempDir {
            fn drop(&mut self) {
                let _ = std::fs::remove_dir_all(&self.0);
            }
        }
    }

    #[test]
    fn test_extract_zip_safe_and_zip_slip_rejection() {
        let tmp = TempDir::new("qbrowse_ai_zip");
        let zip_path = tmp.path().join("valid.zip");
        {
            let file = File::create(&zip_path).unwrap();
            let mut zw = zip::ZipWriter::new(file);
            zw.start_file("bin/hello.txt", SimpleFileOptions::default())
                .unwrap();
            zw.write_all(b"hello zip").unwrap();
            zw.finish().unwrap();
        }
        let out_dir = tmp.path().join("out");
        let extracted = extract_archive_safe(&zip_path, &out_dir).unwrap();
        assert_eq!(extracted.len(), 1);
        assert_eq!(
            fs::read_to_string(out_dir.join("bin/hello.txt")).unwrap(),
            "hello zip"
        );

        // Malicious zip-slip archive
        let evil_zip = tmp.path().join("evil.zip");
        {
            let file = File::create(&evil_zip).unwrap();
            let mut zw = zip::ZipWriter::new(file);
            zw.start_file("../escape.txt", SimpleFileOptions::default())
                .unwrap();
            zw.write_all(b"pwned").unwrap();
            zw.finish().unwrap();
        }
        let err = extract_archive_safe(&evil_zip, &out_dir).unwrap_err();
        assert!(
            err.to_string().contains("Zip-Slip") || err.to_string().contains("Unsafe"),
            "unexpected error: {}",
            err
        );
    }

    #[test]
    fn test_extract_tar_gz_safe_and_traversal_rejection() {
        let tmp = TempDir::new("qbrowse_ai_tgz");
        let tgz_path = tmp.path().join("valid.tar.gz");
        {
            let file = File::create(&tgz_path).unwrap();
            let enc = GzEncoder::new(file, Compression::default());
            let mut builder = tar::Builder::new(enc);
            let data = b"hello tar";
            let mut header = tar::Header::new_gnu();
            header.set_size(data.len() as u64);
            header.set_mode(0o644);
            header.set_cksum();
            builder
                .append_data(&mut header, "sub/file.txt", &data[..])
                .unwrap();
            builder.finish().unwrap();
        }

        let out_dir = tmp.path().join("out");
        let extracted = extract_archive_safe(&tgz_path, &out_dir).unwrap();
        assert_eq!(extracted.len(), 1);
        assert_eq!(
            fs::read_to_string(out_dir.join("sub/file.txt")).unwrap(),
            "hello tar"
        );

        // Direct path sanitizer test for traversal
        assert!(sanitize_archive_entry_path(&out_dir, Path::new("../../evil.txt")).is_err());
        assert!(sanitize_archive_entry_path(&out_dir, Path::new("/etc/passwd")).is_err());
    }

    #[test]
    fn test_find_matching_mmproj() {
        let tmp = TempDir::new("qbrowse_mmproj");
        fs::write(tmp.path().join("mmproj-gemma-4-E2B-it-Q8_0.gguf"), b"x").unwrap();
        fs::write(tmp.path().join("mmproj-gemma-4-E4B-it-Q8_0.gguf"), b"x").unwrap();
        fs::write(tmp.path().join("mmproj-qwen-3.5-4b-f16.gguf"), b"x").unwrap();

        let e2b = find_matching_mmproj(tmp.path(), "gemma-4-E2B-it-Q4_0.gguf").unwrap();
        assert!(e2b.to_string_lossy().to_lowercase().contains("e2b"));

        let qwen = find_matching_mmproj(tmp.path(), "Qwen3.5-4B-Q4_K_M.gguf").unwrap();
        assert!(qwen.to_string_lossy().to_lowercase().contains("qwen"));

        let bielik = find_matching_mmproj(tmp.path(), "Bielik-11B-v3.1-Instruct.Q4_K_M.gguf");
        assert!(bielik.is_none());
    }

    #[test]
    fn test_parse_ddg_html() {
        let html = r#"
        <div class="result">
            <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fdocs">Example Docs</a>
            <a class="result__url" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fdocs">example.com/docs</a>
            <a class="result__snippet">Read the <b>official</b> docs here.</a>
        </div>
        "#;
        let results = parse_ddg_html(html, 5);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Example Docs");
        assert_eq!(results[0].url, "https://example.com/docs");
        assert_eq!(results[0].snippet, "Read the official docs here.");
    }

    #[tokio::test]
    async fn test_download_file_resumable_with_range_and_cancel() {
        let tmp = TempDir::new("qbrowse_dl");
        let payload = b"0123456789ABCDEF";

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let server = tokio::spawn(async move {
            for _ in 0..2 {
                let (mut sock, _) = listener.accept().await.unwrap();
                let mut buf = [0u8; 1024];
                let n = sock.read(&mut buf).await.unwrap();
                let req_str = String::from_utf8_lossy(&buf[..n]);
                if let Some(line) = req_str
                    .lines()
                    .find(|l| l.to_ascii_lowercase().starts_with("range:"))
                {
                    let offset: usize = line
                        .split('=')
                        .nth(1)
                        .unwrap()
                        .trim_end_matches('-')
                        .trim()
                        .parse()
                        .unwrap();
                    let slice = &payload[offset..];
                    let resp = format!(
                        "HTTP/1.1 206 Partial Content\r\nContent-Length: {}\r\nContent-Range: bytes {}-{}/{}\r\nConnection: close\r\n\r\n",
                        slice.len(),
                        offset,
                        payload.len() - 1,
                        payload.len()
                    );
                    sock.write_all(resp.as_bytes()).await.unwrap();
                    sock.write_all(slice).await.unwrap();
                } else {
                    let resp = format!(
                        "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                        payload.len()
                    );
                    sock.write_all(resp.as_bytes()).await.unwrap();
                    sock.write_all(payload).await.unwrap();
                }
            }
        });

        let dest = tmp.path().join("model.gguf");
        let part = part_path_for(&dest);
        // Pre-seed first 6 bytes in .part to test Range resume
        tokio::fs::write(&part, &payload[..6]).await.unwrap();

        let progress_map = DashMap::new();
        let url = format!("http://{}/model.gguf", addr);
        let out = download_file_resumable(&url, &dest, "task-1", &progress_map, None)
            .await
            .unwrap();
        assert_eq!(out, dest);
        assert_eq!(tokio::fs::read(&dest).await.unwrap(), payload);
        assert!(!part.exists());
        let prog = progress_map.get("task-1").unwrap();
        assert_eq!(prog.status, "completed");
        assert_eq!(prog.downloaded_bytes, payload.len() as u64);

        // Test cancellation
        let dest2 = tmp.path().join("cancelled.gguf");
        let cancel = Arc::new(AtomicBool::new(true));
        let res =
            download_file_resumable(&url, &dest2, "task-2", &progress_map, Some(cancel)).await;
        assert!(res.is_err());
        assert_eq!(progress_map.get("task-2").unwrap().status, "cancelled");

        server.await.unwrap();
    }
}

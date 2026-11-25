use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, AUTHORIZATION, COOKIE, USER_AGENT};
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::time::Duration;

pub const GITHUB_API_BASE: &str = "https://api.github.com";
pub const GITHUB_WEB_BASE: &str = "https://github.com";
pub const QBROWSE_USER_AGENT: &str = "QBrowse-WorkMode/1.4";
pub const API_VERSION: &str = "2022-11-28";
pub const REQUEST_TIMEOUT_MS: u64 = 15_000;

fn is_valid_username(u: &str) -> bool {
    let len = u.len();
    if len == 0 || len > 39 {
        return false;
    }
    let bytes = u.as_bytes();
    if !bytes[0].is_ascii_alphanumeric() || !bytes[len - 1].is_ascii_alphanumeric() {
        return false;
    }
    bytes.iter().all(|b| b.is_ascii_alphanumeric() || *b == b'-')
}

fn is_valid_repo_part(s: &str) -> bool {
    !s.is_empty()
        && s.bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'.' || b == b'_' || b == b'-')
}

fn is_valid_org_part(s: &str) -> bool {
    !s.is_empty() && s.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
}

/// Extracts `(owner/repo, "pull" | "issues", number)` from a GitHub PR/issue URL.
fn extract_github_item_parts(url_str: &str) -> Option<(String, String, String)> {
    let parsed = url::Url::parse(url_str).ok()?;
    let host = parsed.host_str()?.to_ascii_lowercase();
    if host != "github.com" && host != "www.github.com" {
        return None;
    }
    let segs: Vec<&str> = parsed.path_segments()?.collect();
    if segs.len() < 4 {
        return None;
    }
    let owner = segs[0];
    let repo = segs[1];
    let kind = segs[2].to_ascii_lowercase();
    let num = segs[3];
    if (kind == "pull" || kind == "issues")
        && !owner.is_empty()
        && !repo.is_empty()
        && !num.is_empty()
        && num.bytes().all(|b| b.is_ascii_digit())
    {
        Some((format!("{}/{}", owner, repo), kind, num.to_string()))
    } else {
        None
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum GitHubAuthMode {
    Token,
    Session,
    Public,
}

impl GitHubAuthMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Token => "token",
            Self::Session => "session",
            Self::Public => "public",
        }
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubItem {
    pub id: String,
    pub number: String,
    pub title: String,
    pub url: String,
    pub repo: String,
    pub author: String,
    pub avatar: String,
    pub is_draft: bool,
    pub comments: u64,
    pub updated_at: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubNotification {
    pub id: String,
    pub title: String,
    pub reason: String,
    pub unread: bool,
    pub repo: String,
    pub subject_type: String,
    pub url: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubRepo {
    pub name: String,
    pub full_name: String,
    pub url: String,
    pub private: bool,
    pub open_issues_count: u64,
    pub updated_at: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubActivity {
    pub id: String,
    pub event_type: String,
    pub repo: String,
    pub actor: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubErrorInfo {
    pub error_code: String,
    pub error: String,
    pub status: u16,
    pub rate_limit_remaining: Option<u64>,
    pub rate_limited: bool,
    pub reset_at: Option<u64>,
    pub sso_required: bool,
    pub unauthorized: bool,
    pub validation_failed: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubDashboard {
    pub authenticated: bool,
    pub auth_mode: String,
    pub username: Option<String>,
    pub avatar_url: Option<String>,
    pub notifications: Vec<GitHubNotification>,
    pub review_requests: Vec<GitHubItem>,
    pub my_prs: Vec<GitHubItem>,
    pub assigned_issues: Vec<GitHubItem>,
    pub repos: Vec<GitHubRepo>,
    pub activity: Vec<GitHubActivity>,
    pub warning: Option<String>,
    pub error: Option<String>,
    pub error_code: Option<String>,
    pub rate_limit_remaining: Option<u64>,
    pub rate_limited: bool,
    pub reset_at: Option<u64>,
    pub sso_required: bool,
    pub unauthorized: bool,
    pub validation_failed: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SearchQueries {
    pub reviews_query: String,
    pub my_prs_query: String,
    pub repo_prs_query: String,
    pub issues_query: String,
    pub repo_qualifiers: Vec<String>,
}

pub fn sanitize_token(raw: &str) -> String {
    let strip_quotes = |s: &str| -> String {
        let t = s.trim();
        if (t.starts_with('"') && t.ends_with('"') && t.len() >= 2)
            || (t.starts_with('\'') && t.ends_with('\'') && t.len() >= 2)
        {
            t[1..t.len() - 1].trim().to_string()
        } else {
            t.to_string()
        }
    };
    let mut token = strip_quotes(raw);
    let lower = token.to_lowercase();
    if lower.starts_with("bearer ") {
        token = strip_quotes(&token[7..]);
    } else if lower.starts_with("token ") {
        token = strip_quotes(&token[6..]);
    }
    token
}

pub fn sanitize_username(raw: &str) -> String {
    let mut u = raw.trim().to_string();
    for prefix in ["https://github.com/", "http://github.com/", "https://www.github.com/", "http://www.github.com/", "github.com/"] {
        if u.to_lowercase().starts_with(prefix) {
            u = u[prefix.len()..].to_string();
            break;
        }
    }
    u = u.trim_start_matches('@').to_string();
    if let Some(idx) = u.find(['/', '?', '#']) {
        u.truncate(idx);
    }
    u = u.trim().to_string();
    if u.is_empty() || !is_valid_username(&u) {
        return String::new();
    }
    u
}

pub fn parse_repo_filter(raw: &str) -> Vec<String> {
    if raw.trim().is_empty() {
        return Vec::new();
    }
    let mut qualifiers = Vec::new();
    let mut seen = HashSet::new();

    for token in raw.split(|c: char| c.is_whitespace() || c == ',' || c == ';') {
        let mut entry = token.trim().to_string();
        if entry.is_empty() {
            continue;
        }
        for prefix in [
            "https://github.com/",
            "http://github.com/",
            "https://www.github.com/",
            "http://www.github.com/",
            "github.com/",
            "repo:",
            "org:",
        ] {
            if entry.to_lowercase().starts_with(prefix) {
                entry = entry[prefix.len()..].to_string();
            }
        }
        entry = entry.trim_matches('/').to_string();
        if entry.is_empty() {
            continue;
        }

        let parts: Vec<&str> = entry.split('/').filter(|s| !s.is_empty()).collect();
        let mut qualifier = String::new();
        if parts.len() >= 2 {
            let owner = parts[0];
            let repo = parts[1].strip_suffix(".git").unwrap_or(parts[1]);
            if is_valid_repo_part(owner) && is_valid_repo_part(repo) {
                qualifier = format!("repo:{}/{}", owner, repo);
            }
        } else if parts.len() == 1 && is_valid_org_part(parts[0]) {
            qualifier = format!("org:{}", parts[0]);
        }

        if !qualifier.is_empty() && seen.insert(qualifier.to_lowercase()) {
            qualifiers.push(qualifier);
        }
    }

    qualifiers
}

pub fn build_search_queries(
    username: &str,
    include_drafts: bool,
    repo_filter: &str,
) -> SearchQueries {
    let clean_user = if username == "@me" {
        "@me".to_string()
    } else {
        sanitize_username(username)
    };
    let repo_qualifiers = parse_repo_filter(repo_filter);
    let repo_part = if repo_qualifiers.is_empty() {
        String::new()
    } else {
        format!(" {}", repo_qualifiers.join(" "))
    };
    let draft_part = if include_drafts { "" } else { " draft:false" };

    let repo_prs_query = if !repo_qualifiers.is_empty() {
        format!("is:pr is:open{}{}", draft_part, repo_part)
    } else if !clean_user.is_empty() && clean_user != "@me" {
        format!("is:pr is:open user:{}{}", clean_user, draft_part)
    } else {
        String::new()
    };

    SearchQueries {
        reviews_query: format!(
            "is:pr is:open review-requested:{}{}{}",
            clean_user, draft_part, repo_part
        ),
        my_prs_query: format!(
            "is:pr is:open author:{}{}{}",
            clean_user, draft_part, repo_part
        ),
        repo_prs_query,
        issues_query: format!("is:issue is:open assignee:{}{}", clean_user, repo_part),
        repo_qualifiers,
    }
}

pub fn merge_unique_github_items(lists: &[Vec<GitHubItem>]) -> Vec<GitHubItem> {
    let mut by_key: HashMap<String, GitHubItem> = HashMap::new();
    for list in lists {
        for item in list {
            let key = if !item.url.is_empty() {
                item.url.to_lowercase()
            } else {
                item.id.to_lowercase()
            };
            if key.is_empty() {
                continue;
            }
            by_key.entry(key).or_insert_with(|| item.clone());
        }
    }
    let mut merged: Vec<GitHubItem> = by_key.into_values().collect();
    merged.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    merged
}

pub fn parse_github_api_error(
    status: u16,
    body: Option<&Value>,
    headers: &HeaderMap,
) -> GitHubErrorInfo {
    let api_message = body
        .and_then(|v| v.get("message"))
        .and_then(|m| m.as_str())
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    let remaining = headers
        .get("x-ratelimit-remaining")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim().parse::<u64>().ok());
    let reset_epoch = headers
        .get("x-ratelimit-reset")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim().parse::<u64>().ok());
    let sso_header = headers
        .get("x-github-sso")
        .and_then(|v| v.to_str().ok())
        .is_some();

    if status == 401 {
        return GitHubErrorInfo {
            error_code: "INVALID_TOKEN".to_string(),
            error: "Invalid or expired Personal Access Token (HTTP 401). Please verify or regenerate your token.".to_string(),
            status,
            rate_limit_remaining: remaining,
            unauthorized: true,
            ..Default::default()
        };
    }

    if status == 403 {
        let msg_lower = api_message.to_lowercase();
        if remaining == Some(0) || msg_lower.contains("rate limit") {
            return GitHubErrorInfo {
                error_code: "RATE_LIMITED".to_string(),
                error: if api_message.is_empty() {
                    "GitHub API rate limit exceeded.".to_string()
                } else {
                    format!("GitHub API rate limit exceeded: {}", api_message)
                },
                status,
                rate_limit_remaining: Some(0),
                rate_limited: true,
                reset_at: reset_epoch,
                ..Default::default()
            };
        }
        if sso_header || msg_lower.contains("saml") || msg_lower.contains("sso") {
            return GitHubErrorInfo {
                error_code: "SSO_REQUIRED".to_string(),
                error: "Organization SSO/SAML authorization is required for this token.".to_string(),
                status,
                rate_limit_remaining: remaining,
                sso_required: true,
                ..Default::default()
            };
        }
        return GitHubErrorInfo {
            error_code: "FORBIDDEN".to_string(),
            error: if api_message.is_empty() {
                "GitHub access denied (HTTP 403). Check token scopes.".to_string()
            } else {
                format!("GitHub access denied (403): {}", api_message)
            },
            status,
            rate_limit_remaining: remaining,
            ..Default::default()
        };
    }

    if status == 404 {
        return GitHubErrorInfo {
            error_code: "NOT_FOUND".to_string(),
            error: if api_message.is_empty() {
                "GitHub user or resource not found (HTTP 404).".to_string()
            } else {
                format!("GitHub resource not found (404): {}", api_message)
            },
            status,
            rate_limit_remaining: remaining,
            ..Default::default()
        };
    }

    if status == 422 {
        let detail = body
            .and_then(|v| v.get("errors"))
            .and_then(|e| e.as_array())
            .and_then(|arr| arr.first())
            .and_then(|first| first.get("message"))
            .and_then(|m| m.as_str())
            .map(|s| format!(" ({})", s))
            .unwrap_or_default();
        return GitHubErrorInfo {
            error_code: "INVALID_QUERY".to_string(),
            error: format!(
                "GitHub rejected the search filter (422){}. Check your Repository Scope.",
                detail
            ),
            status,
            rate_limit_remaining: remaining,
            validation_failed: true,
            ..Default::default()
        };
    }

    GitHubErrorInfo {
        error_code: "API_ERROR".to_string(),
        error: if api_message.is_empty() {
            format!("GitHub API returned HTTP {}.", status)
        } else {
            format!("GitHub API error ({}): {}", status, api_message)
        },
        status,
        rate_limit_remaining: remaining,
        ..Default::default()
    }
}

pub fn map_search_issue_item(item: &Value) -> GitHubItem {
    let repo_url = item
        .get("repository_url")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let html_url = item.get("html_url").and_then(|v| v.as_str()).unwrap_or("");

    let mut repo_name = repo_url
        .strip_prefix("https://api.github.com/repos/")
        .or_else(|| repo_url.strip_prefix("http://api.github.com/repos/"))
        .unwrap_or("")
        .to_string();
    if repo_name.is_empty() && !html_url.is_empty() {
        if let Some((repo, _, _)) = extract_github_item_parts(html_url) {
            repo_name = repo;
        }
    }

    let number = item
        .get("number")
        .and_then(|v| v.as_u64().map(|n| n.to_string()).or_else(|| v.as_str().map(|s| s.to_string())))
        .unwrap_or_default();
    let id = item
        .get("id")
        .and_then(|v| v.as_u64().map(|n| n.to_string()).or_else(|| v.as_str().map(|s| s.to_string())))
        .unwrap_or_else(|| {
            if !html_url.is_empty() {
                html_url.to_string()
            } else {
                format!("{}#{}", repo_name, number)
            }
        });
    let title = item
        .get("title")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| format!("#{}", number));

    GitHubItem {
        id,
        number,
        title,
        url: html_url.to_string(),
        repo: repo_name,
        author: item
            .get("user")
            .and_then(|u| u.get("login"))
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string(),
        avatar: item
            .get("user")
            .and_then(|u| u.get("avatar_url"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        is_draft: item.get("draft").and_then(|v| v.as_bool()).unwrap_or(false),
        comments: item.get("comments").and_then(|v| v.as_u64()).unwrap_or(0),
        updated_at: item
            .get("updated_at")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
    }
}

pub fn extract_embedded_react_issues(
    html: &str,
    kind: &str,
    fallback_author: &str,
) -> Vec<GitHubItem> {
    let doc = Html::parse_document(html);
    let sel = match Selector::parse("script[type='application/json'][data-target='react-app.embeddedData']") {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };

    let mut items = Vec::new();
    let mut seen = HashSet::new();

    fn walk_json(
        node: &Value,
        kind: &str,
        fallback_author: &str,
        items: &mut Vec<GitHubItem>,
        seen: &mut HashSet<String>,
    ) {
        match node {
            Value::Array(arr) => {
                for el in arr {
                    walk_json(el, kind, fallback_author, items, seen);
                }
            }
            Value::Object(map) => {
                let maybe_num = map.get("number").and_then(|v| {
                    v.as_u64()
                        .map(|n| n.to_string())
                        .or_else(|| v.as_str().map(|s| s.to_string()))
                });
                let maybe_title = map
                    .get("title")
                    .and_then(|v| v.as_str())
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty());

                let maybe_repo = map.get("repository").and_then(|r| {
                    r.get("nameWithOwner")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                        .or_else(|| {
                            let owner = r.get("owner")?.get("login")?.as_str()?;
                            let name = r.get("name")?.as_str()?;
                            Some(format!("{}/{}", owner, name))
                        })
                });

                let maybe_url = map
                    .get("url")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .or_else(|| {
                        let repo = maybe_repo.as_ref()?;
                        let num = maybe_num.as_ref()?;
                        let seg = if kind == "pr" { "pull" } else { "issues" };
                        Some(format!("{}/{}/{}/{}", GITHUB_WEB_BASE, repo, seg, num))
                    });

                if let (Some(title), Some(num), Some(url)) = (maybe_title, maybe_num, maybe_url) {
                    if let Some((parsed_repo, parsed_kind, _)) = extract_github_item_parts(&url) {
                        let is_pr_url = parsed_kind == "pull";
                        let matches_kind = if kind == "pr" { is_pr_url } else { !is_pr_url };
                        if matches_kind && seen.insert(url.clone()) {
                            let repo = maybe_repo.unwrap_or(parsed_repo);
                            let author = map
                                .get("author")
                                .and_then(|a| a.get("login"))
                                .and_then(|v| v.as_str())
                                .or_else(|| {
                                    map.get("user")
                                        .and_then(|u| u.get("login"))
                                        .and_then(|v| v.as_str())
                                })
                                .unwrap_or(if fallback_author.is_empty() {
                                    "unknown"
                                } else {
                                    fallback_author
                                })
                                .to_string();
                            let avatar = map
                                .get("author")
                                .and_then(|a| a.get("avatarUrl"))
                                .and_then(|v| v.as_str())
                                .or_else(|| {
                                    map.get("user")
                                        .and_then(|u| u.get("avatar_url"))
                                        .and_then(|v| v.as_str())
                                })
                                .unwrap_or("")
                                .to_string();
                            let is_draft = map
                                .get("isDraft")
                                .and_then(|v| v.as_bool())
                                .or_else(|| map.get("draft").and_then(|v| v.as_bool()))
                                .unwrap_or(false);
                            let comments = map
                                .get("commentsCount")
                                .and_then(|v| v.as_u64())
                                .or_else(|| {
                                    map.get("comments")
                                        .and_then(|c| c.get("totalCount"))
                                        .and_then(|v| v.as_u64())
                                })
                                .or_else(|| map.get("comments").and_then(|v| v.as_u64()))
                                .unwrap_or(0);
                            let updated_at = map
                                .get("updatedAt")
                                .and_then(|v| v.as_str())
                                .or_else(|| map.get("updated_at").and_then(|v| v.as_str()))
                                .unwrap_or("")
                                .to_string();
                            let id = map
                                .get("id")
                                .and_then(|v| {
                                    v.as_str()
                                        .map(|s| s.to_string())
                                        .or_else(|| v.as_u64().map(|n| n.to_string()))
                                })
                                .unwrap_or_else(|| url.clone());

                            items.push(GitHubItem {
                                id,
                                number: num,
                                title,
                                url,
                                repo,
                                author,
                                avatar,
                                is_draft,
                                comments,
                                updated_at,
                            });
                        }
                    }
                }

                for val in map.values() {
                    walk_json(val, kind, fallback_author, items, seen);
                }
            }
            _ => {}
        }
    }

    for script in doc.select(&sel) {
        let json_text = script.text().collect::<String>();
        if let Ok(parsed) = serde_json::from_str::<Value>(&json_text) {
            walk_json(&parsed, kind, fallback_author, &mut items, &mut seen);
        }
    }

    items
}

pub fn parse_github_html_list(html: &str, kind: &str, fallback_author: &str) -> Vec<GitHubItem> {
    if html.is_empty() {
        return Vec::new();
    }

    // 1. Modern React embedded JSON payload
    let embedded = extract_embedded_react_issues(html, kind, fallback_author);
    if !embedded.is_empty() {
        return embedded;
    }

    // 2. Classic SSR DOM rows: .Box-row, [data-id], and fallback <a> links
    let doc = Html::parse_document(html);
    let path_segment = if kind == "pr" { "pull" } else { "issues" };
    let mut items = Vec::new();
    let mut seen = HashSet::new();

    let row_sel = Selector::parse(".Box-row, [data-id]").unwrap();
    let link_sel = Selector::parse("a[href]").unwrap();
    let time_sel = Selector::parse("relative-time, time").unwrap();

    for row in doc.select(&row_sel) {
        let row_html = row.html();
        for a in row.select(&link_sel) {
            let Some(href) = a.value().attr("href") else {
                continue;
            };
            let full_url = if href.starts_with("http") {
                href.to_string()
            } else {
                format!("{}{}", GITHUB_WEB_BASE, href)
            };
            let Some((repo, item_kind, item_num)) = extract_github_item_parts(&full_url) else {
                continue;
            };
            if item_kind != path_segment {
                continue;
            }
            if let Some(aria) = a.value().attr("aria-label") {
                if aria.to_lowercase().contains("comment") {
                    continue;
                }
            }
            let title = a.text().collect::<String>().split_whitespace().collect::<Vec<_>>().join(" ");
            if title.is_empty()
                || title.chars().all(|c| c.is_ascii_digit())
                || title.starts_with('#')
                || matches!(
                    title.to_lowercase().as_str(),
                    "pull requests" | "issues" | "open" | "closed" | "draft"
                )
            {
                continue;
            }

            let canonical_url = format!("{}/{}/{}/{}", GITHUB_WEB_BASE, repo, path_segment, item_num);
            if !seen.insert(canonical_url.clone()) {
                continue;
            }

            let is_draft = row_html.contains("Draft Pull Request") || row_html.contains(">Draft<");
            let updated_at = row
                .select(&time_sel)
                .next()
                .and_then(|t| t.value().attr("datetime"))
                .unwrap_or("")
                .to_string();

            items.push(GitHubItem {
                id: row
                    .value()
                    .attr("data-id")
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| canonical_url.clone()),
                number: item_num,
                title,
                url: canonical_url,
                repo,
                author: if fallback_author.is_empty() {
                    "unknown".to_string()
                } else {
                    fallback_author.to_string()
                },
                avatar: String::new(),
                is_draft,
                comments: 0,
                updated_at,
            });
            break;
        }
    }

    if !items.is_empty() {
        return items;
    }

    // Fallback: scan all <a> tags directly if no .Box-row / [data-id] wrapper matched
    for a in doc.select(&link_sel) {
        let Some(href) = a.value().attr("href") else {
            continue;
        };
        let full_url = if href.starts_with("http") {
            href.to_string()
        } else {
            format!("{}{}", GITHUB_WEB_BASE, href)
        };
        let Some((repo, item_kind, item_num)) = extract_github_item_parts(&full_url) else {
            continue;
        };
        if item_kind != path_segment {
            continue;
        }
        let title = a.text().collect::<String>().split_whitespace().collect::<Vec<_>>().join(" ");
        if title.is_empty() || title.chars().all(|c| c.is_ascii_digit()) {
            continue;
        }
        let canonical_url = format!("{}/{}/{}/{}", GITHUB_WEB_BASE, repo, path_segment, item_num);
        if seen.insert(canonical_url.clone()) {
            items.push(GitHubItem {
                id: canonical_url.clone(),
                number: item_num,
                title,
                url: canonical_url,
                repo,
                author: if fallback_author.is_empty() {
                    "unknown".to_string()
                } else {
                    fallback_author.to_string()
                },
                avatar: String::new(),
                is_draft: false,
                comments: 0,
                updated_at: String::new(),
            });
        }
    }

    items
}

struct ApiJsonResponse {
    ok: bool,
    status: u16,
    data: Option<Value>,
    rate_limit_remaining: Option<u64>,
    error_info: Option<GitHubErrorInfo>,
}

async fn api_request_json(
    client: &reqwest::Client,
    url: &str,
    token: Option<&str>,
) -> anyhow::Result<ApiJsonResponse> {
    let mut headers = HeaderMap::new();
    headers.insert(ACCEPT, HeaderValue::from_static("application/vnd.github+json"));
    headers.insert("X-GitHub-Api-Version", HeaderValue::from_static(API_VERSION));
    headers.insert(USER_AGENT, HeaderValue::from_static(QBROWSE_USER_AGENT));
    if let Some(tok) = token {
        if let Ok(val) = HeaderValue::from_str(&format!("Bearer {}", tok)) {
            headers.insert(AUTHORIZATION, val);
        }
    }

    let resp = client.get(url).headers(headers).send().await?;
    let status = resp.status().as_u16();
    let resp_headers = resp.headers().clone();
    let remaining = resp_headers
        .get("x-ratelimit-remaining")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse::<u64>().ok());

    let data: Option<Value> = resp.json().await.ok();

    if !(200..300).contains(&status) {
        let err_info = parse_github_api_error(status, data.as_ref(), &resp_headers);
        return Ok(ApiJsonResponse {
            ok: false,
            status,
            data,
            rate_limit_remaining: err_info.rate_limit_remaining.or(remaining),
            error_info: Some(err_info),
        });
    }

    Ok(ApiJsonResponse {
        ok: true,
        status,
        data,
        rate_limit_remaining: remaining,
        error_info: None,
    })
}

fn build_search_url(q: &str) -> String {
    let encoded = url::form_urlencoded::Serializer::new(String::new())
        .append_pair("q", q)
        .append_pair("sort", "updated")
        .append_pair("order", "desc")
        .append_pair("per_page", "30")
        .finish();
    format!("{}/search/issues?{}", GITHUB_API_BASE, encoded)
}

pub async fn fetch_github_dashboard(
    mode: GitHubAuthMode,
    token_or_cookie: Option<&str>,
    username_opt: Option<&str>,
    filter_repo_opt: Option<&str>,
) -> GitHubDashboard {
    let client = match reqwest::Client::builder()
        .timeout(Duration::from_millis(REQUEST_TIMEOUT_MS))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return GitHubDashboard {
                auth_mode: mode.as_str().to_string(),
                error: Some(e.to_string()),
                error_code: Some("CLIENT_INIT_ERROR".to_string()),
                ..Default::default()
            };
        }
    };

    let repo_filter = filter_repo_opt.unwrap_or("");

    match mode {
        GitHubAuthMode::Token => {
            let token = sanitize_token(token_or_cookie.unwrap_or(""));
            if token.is_empty() {
                return GitHubDashboard {
                    auth_mode: "token".to_string(),
                    error: Some("Missing Personal Access Token.".to_string()),
                    error_code: Some("NOT_CONFIGURED".to_string()),
                    unauthorized: true,
                    ..Default::default()
                };
            }
            fetch_via_api(&client, Some(&token), None, repo_filter).await
        }
        GitHubAuthMode::Public => {
            let username = sanitize_username(username_opt.unwrap_or(""));
            if username.is_empty() {
                return GitHubDashboard {
                    auth_mode: "public".to_string(),
                    error: Some("Invalid GitHub username.".to_string()),
                    error_code: Some("INVALID_USERNAME".to_string()),
                    ..Default::default()
                };
            }
            fetch_via_api(&client, None, Some(&username), repo_filter).await
        }
        GitHubAuthMode::Session => {
            let cookie_header = token_or_cookie.unwrap_or("").trim();
            let username_hint = username_opt.map(sanitize_username).unwrap_or_default();
            fetch_via_session(&client, cookie_header, &username_hint, repo_filter).await
        }
    }
}

async fn fetch_via_api(
    client: &reqwest::Client,
    token: Option<&str>,
    username_override: Option<&str>,
    repo_filter: &str,
) -> GitHubDashboard {
    let auth_mode = if token.is_some() { "token" } else { "public" };
    let mut username = username_override.unwrap_or("").to_string();
    let avatar_url: Option<String>;
    let rate_limit_remaining: Option<u64>;

    if let Some(tok) = token {
        let user_res = match api_request_json(client, &format!("{}/user", GITHUB_API_BASE), Some(tok)).await {
            Ok(r) => r,
            Err(e) => {
                return GitHubDashboard {
                    auth_mode: auth_mode.to_string(),
                    error: Some(e.to_string()),
                    error_code: Some("NETWORK_ERROR".to_string()),
                    ..Default::default()
                };
            }
        };
        rate_limit_remaining = user_res.rate_limit_remaining;
        if !user_res.ok {
            let err = user_res.error_info.unwrap_or_default();
            return GitHubDashboard {
                authenticated: false,
                auth_mode: auth_mode.to_string(),
                error: Some(err.error),
                error_code: Some(err.error_code),
                rate_limit_remaining,
                rate_limited: err.rate_limited,
                reset_at: err.reset_at,
                sso_required: err.sso_required,
                unauthorized: err.unauthorized,
                validation_failed: err.validation_failed,
                ..Default::default()
            };
        }
        username = user_res
            .data
            .as_ref()
            .and_then(|d| d.get("login"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        avatar_url = user_res
            .data
            .as_ref()
            .and_then(|d| d.get("avatar_url"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
    } else {
        let user_res = match api_request_json(
            client,
            &format!("{}/users/{}", GITHUB_API_BASE, username),
            None,
        )
        .await
        {
            Ok(r) => r,
            Err(e) => {
                return GitHubDashboard {
                    auth_mode: auth_mode.to_string(),
                    error: Some(e.to_string()),
                    error_code: Some("NETWORK_ERROR".to_string()),
                    ..Default::default()
                };
            }
        };
        rate_limit_remaining = user_res.rate_limit_remaining;
        if !user_res.ok {
            let err = user_res.error_info.unwrap_or_default();
            return GitHubDashboard {
                authenticated: false,
                auth_mode: auth_mode.to_string(),
                error: Some(if user_res.status == 404 {
                    format!("GitHub user \"@{}\" was not found.", username)
                } else {
                    err.error
                }),
                error_code: Some(err.error_code),
                rate_limit_remaining,
                rate_limited: err.rate_limited,
                reset_at: err.reset_at,
                sso_required: err.sso_required,
                unauthorized: err.unauthorized,
                validation_failed: err.validation_failed,
                ..Default::default()
            };
        }
        if let Some(login) = user_res
            .data
            .as_ref()
            .and_then(|d| d.get("login"))
            .and_then(|v| v.as_str())
        {
            username = login.to_string();
        }
        avatar_url = user_res
            .data
            .as_ref()
            .and_then(|d| d.get("avatar_url"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
    }

    let queries = build_search_queries(&username, false, repo_filter);
    let reviews_url = build_search_url(&queries.reviews_query);
    let my_prs_url = build_search_url(&queries.my_prs_query);
    let issues_url = build_search_url(&queries.issues_query);

    let repos_url = if token.is_some() {
        format!("{}/user/repos?sort=updated&per_page=20", GITHUB_API_BASE)
    } else {
        format!("{}/users/{}/repos?sort=updated&per_page=20", GITHUB_API_BASE, username)
    };
    let activity_url = format!("{}/users/{}/events/public?per_page=20", GITHUB_API_BASE, username);
    let notif_url = format!("{}/notifications?per_page=20", GITHUB_API_BASE);

    let (rev_r, my_r, iss_r, repos_r, act_r) = tokio::join!(
        api_request_json(client, &reviews_url, token),
        api_request_json(client, &my_prs_url, token),
        api_request_json(client, &issues_url, token),
        api_request_json(client, &repos_url, token),
        api_request_json(client, &activity_url, token),
    );

    let notif_r = if token.is_some() {
        api_request_json(client, &notif_url, token).await.ok()
    } else {
        None
    };

    let extract_items = |res: anyhow::Result<ApiJsonResponse>| -> (Vec<GitHubItem>, Option<GitHubErrorInfo>, Option<u64>) {
        match res {
            Ok(r) if r.ok => {
                let items = r
                    .data
                    .as_ref()
                    .and_then(|d| d.get("items"))
                    .and_then(|v| v.as_array())
                    .map(|arr| arr.iter().map(map_search_issue_item).collect())
                    .unwrap_or_default();
                (items, None, r.rate_limit_remaining)
            }
            Ok(r) => (Vec::new(), r.error_info, r.rate_limit_remaining),
            Err(e) => (
                Vec::new(),
                Some(GitHubErrorInfo {
                    error_code: "NETWORK_ERROR".to_string(),
                    error: e.to_string(),
                    ..Default::default()
                }),
                None,
            ),
        }
    };

    let (review_requests, err_rev, rem_rev) = extract_items(rev_r);
    let (my_prs, err_my, rem_my) = extract_items(my_r);
    let (assigned_issues, err_iss, rem_iss) = extract_items(iss_r);

    let first_err = err_rev.or(err_my).or(err_iss);
    let latest_rem = rem_iss.or(rem_my).or(rem_rev).or(rate_limit_remaining);

    let repos: Vec<GitHubRepo> = repos_r
        .ok()
        .filter(|r| r.ok)
        .and_then(|r| r.data)
        .and_then(|d| d.as_array().cloned())
        .map(|arr| {
            arr.into_iter()
                .map(|r| GitHubRepo {
                    name: r.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    full_name: r.get("full_name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    url: r.get("html_url").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    private: r.get("private").and_then(|v| v.as_bool()).unwrap_or(false),
                    open_issues_count: r.get("open_issues_count").and_then(|v| v.as_u64()).unwrap_or(0),
                    updated_at: r.get("updated_at").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                })
                .collect()
        })
        .unwrap_or_default();

    let activity: Vec<GitHubActivity> = act_r
        .ok()
        .filter(|r| r.ok)
        .and_then(|r| r.data)
        .and_then(|d| d.as_array().cloned())
        .map(|arr| {
            arr.into_iter()
                .map(|e| GitHubActivity {
                    id: e.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    event_type: e.get("type").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    repo: e
                        .get("repo")
                        .and_then(|r| r.get("name"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    actor: e
                        .get("actor")
                        .and_then(|a| a.get("login"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    created_at: e.get("created_at").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                })
                .collect()
        })
        .unwrap_or_default();

    let notifications: Vec<GitHubNotification> = notif_r
        .filter(|r| r.ok)
        .and_then(|r| r.data)
        .and_then(|d| d.as_array().cloned())
        .map(|arr| {
            arr.into_iter()
                .map(|n| GitHubNotification {
                    id: n.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    title: n
                        .get("subject")
                        .and_then(|s| s.get("title"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    reason: n.get("reason").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    unread: n.get("unread").and_then(|v| v.as_bool()).unwrap_or(false),
                    repo: n
                        .get("repository")
                        .and_then(|r| r.get("full_name"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    subject_type: n
                        .get("subject")
                        .and_then(|s| s.get("type"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    url: n
                        .get("subject")
                        .and_then(|s| s.get("url"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    updated_at: n.get("updated_at").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                })
                .collect()
        })
        .unwrap_or_default();

    let (warning, rate_limited, reset_at, sso_required, unauthorized, validation_failed) =
        if let Some(ref e) = first_err {
            (
                Some(e.error.clone()),
                e.rate_limited,
                e.reset_at,
                e.sso_required,
                e.unauthorized,
                e.validation_failed,
            )
        } else {
            (None, false, None, false, false, false)
        };

    GitHubDashboard {
        authenticated: true,
        auth_mode: auth_mode.to_string(),
        username: Some(username),
        avatar_url,
        notifications,
        review_requests,
        my_prs,
        assigned_issues,
        repos,
        activity,
        warning,
        error: None,
        error_code: None,
        rate_limit_remaining: latest_rem,
        rate_limited,
        reset_at,
        sso_required,
        unauthorized,
        validation_failed,
    }
}

async fn fetch_session_page(
    client: &reqwest::Client,
    path: &str,
    q: &str,
    cookie_header: &str,
) -> (bool, bool, String) {
    let encoded = url::form_urlencoded::Serializer::new(String::new())
        .append_pair("q", q)
        .finish();
    let url = format!("{}{}?{}", GITHUB_WEB_BASE, path, encoded);
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, HeaderValue::from_static(QBROWSE_USER_AGENT));
    headers.insert(
        ACCEPT,
        HeaderValue::from_static("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"),
    );
    if !cookie_header.is_empty() {
        if let Ok(val) = HeaderValue::from_str(cookie_header) {
            headers.insert(COOKIE, val);
        }
    }

    let Ok(resp) = client.get(&url).headers(headers).send().await else {
        return (false, false, String::new());
    };
    let final_url = resp.url().as_str().to_lowercase();
    if final_url.contains("/login") {
        return (false, true, String::new());
    }
    let ok = resp.status().is_success();
    let html = if ok {
        resp.text().await.unwrap_or_default()
    } else {
        String::new()
    };
    (ok, false, html)
}

async fn fetch_via_session(
    client: &reqwest::Client,
    cookie_header: &str,
    username_hint: &str,
    repo_filter: &str,
) -> GitHubDashboard {
    if cookie_header.is_empty() {
        return GitHubDashboard {
            authenticated: false,
            auth_mode: "session".to_string(),
            error: Some("Missing GitHub session cookie header.".to_string()),
            error_code: Some("SESSION_EXPIRED".to_string()),
            unauthorized: true,
            ..Default::default()
        };
    }

    let queries = build_search_queries("@me", false, repo_filter);
    let (rev_page, my_page, iss_page) = tokio::join!(
        fetch_session_page(client, "/pulls", &queries.reviews_query, cookie_header),
        fetch_session_page(client, "/pulls", &queries.my_prs_query, cookie_header),
        fetch_session_page(client, "/issues", &queries.issues_query, cookie_header),
    );

    if rev_page.1 || my_page.1 || iss_page.1 {
        return GitHubDashboard {
            authenticated: false,
            auth_mode: "session".to_string(),
            error: Some("Your GitHub browser session has expired. Please sign in to github.com again or enter a Personal Access Token.".to_string()),
            error_code: Some("SESSION_EXPIRED".to_string()),
            unauthorized: true,
            ..Default::default()
        };
    }

    let resolved_user = if !username_hint.is_empty() {
        username_hint.to_string()
    } else {
        "GitHub User".to_string()
    };

    let review_requests = if rev_page.0 {
        parse_github_html_list(&rev_page.2, "pr", &resolved_user)
    } else {
        Vec::new()
    };
    let my_prs = if my_page.0 {
        parse_github_html_list(&my_page.2, "pr", &resolved_user)
    } else {
        Vec::new()
    };
    let assigned_issues = if iss_page.0 {
        parse_github_html_list(&iss_page.2, "issue", &resolved_user)
    } else {
        Vec::new()
    };

    GitHubDashboard {
        authenticated: rev_page.0 || my_page.0 || iss_page.0,
        auth_mode: "session".to_string(),
        username: Some(resolved_user),
        review_requests,
        my_prs,
        assigned_issues,
        ..Default::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitizes_tokens_usernames_and_repo_filters() {
        assert_eq!(sanitize_token("  Bearer \"ghp_12345\" "), "ghp_12345");
        assert_eq!(sanitize_token("token gho_abc"), "gho_abc");
        assert_eq!(sanitize_username("https://github.com/@octocat/repos"), "octocat");
        assert_eq!(sanitize_username("invalid user!"), "");

        let quals = parse_repo_filter("https://github.com/rust-lang/rust.git, org:tokio-rs");
        assert_eq!(quals, vec!["repo:rust-lang/rust", "org:tokio-rs"]);

        let q = build_search_queries("octocat", false, "rust-lang/rust");
        assert!(q.reviews_query.contains("review-requested:octocat"));
        assert!(q.reviews_query.contains("draft:false"));
        assert!(q.reviews_query.contains("repo:rust-lang/rust"));
    }

    #[test]
    fn parses_react_embedded_json_and_classic_box_row_html() {
        let react_html = r#"
        <html><body>
        <script type="application/json" data-target="react-app.embeddedData">
        {"payload":{"results":[{"id":1,"number":42,"title":"Fix memory leak","url":"https://github.com/acme/app/issues/42","repository":{"nameWithOwner":"acme/app"},"author":{"login":"alice"},"commentsCount":3,"updatedAt":"2026-01-01T00:00:00Z"}]}}
        </script>
        </body></html>
        "#;
        let issues = parse_github_html_list(react_html, "issue", "fallback");
        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].number, "42");
        assert_eq!(issues[0].title, "Fix memory leak");
        assert_eq!(issues[0].repo, "acme/app");
        assert_eq!(issues[0].author, "alice");

        let classic_html = r#"
        <html><body>
        <div class="Box-row" data-id="issue_99">
            <a href="/acme/app/pull/99">Add Rust shield</a>
            <span>Draft</span>
            <relative-time datetime="2026-02-01T12:00:00Z"></relative-time>
        </div>
        </body></html>
        "#;
        let prs = parse_github_html_list(classic_html, "pr", "bob");
        assert_eq!(prs.len(), 1);
        assert_eq!(prs[0].number, "99");
        assert_eq!(prs[0].title, "Add Rust shield");
        assert_eq!(prs[0].repo, "acme/app");
        assert!(prs[0].is_draft);
        assert_eq!(prs[0].updated_at, "2026-02-01T12:00:00Z");
    }

    #[test]
    fn parses_github_api_error_flags_accurately() {
        let mut h_rate = HeaderMap::new();
        h_rate.insert("x-ratelimit-remaining", HeaderValue::from_static("0"));
        h_rate.insert("x-ratelimit-reset", HeaderValue::from_static("1700000000"));
        let err_rate = parse_github_api_error(403, None, &h_rate);
        assert!(err_rate.rate_limited);
        assert_eq!(err_rate.reset_at, Some(1700000000));
        assert_eq!(err_rate.error_code, "RATE_LIMITED");

        let mut h_sso = HeaderMap::new();
        h_sso.insert("x-github-sso", HeaderValue::from_static("required"));
        let err_sso = parse_github_api_error(403, None, &h_sso);
        assert!(err_sso.sso_required);
        assert_eq!(err_sso.error_code, "SSO_REQUIRED");

        let err_401 = parse_github_api_error(401, None, &HeaderMap::new());
        assert!(err_401.unauthorized);
        assert_eq!(err_401.error_code, "INVALID_TOKEN");

        let err_422 = parse_github_api_error(422, None, &HeaderMap::new());
        assert!(err_422.validation_failed);
        assert_eq!(err_422.error_code, "INVALID_QUERY");
    }
}

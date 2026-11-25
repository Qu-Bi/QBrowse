use once_cell::sync::Lazy;
use percent_encoding::percent_decode_str;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use url::Url;

static TRACKING_PARAMS: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "utm_id",
        "fbclid",
        "gclid",
        "gclsrc",
        "dclid",
        "msclkid",
        "twclid",
        "igshid",
        "ref",
        "ref_src",
        "ref_url",
        "source",
        "feature",
        "ved",
        "ei",
        "sei",
        "aep",
        "udm",
        "t",
        "_ga",
        "_gl",
        "mc_cid",
        "mc_eid",
        "si",
        "spm",
        "scm",
        "ns_source",
        "ns_mchannel",
        "ns_campaign",
        "cvid",
        "form",
        "spref",
    ]
    .into_iter()
    .collect()
});

static PRESERVED_ACRONYMS: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    [
        "api", "url", "uri", "css", "html", "js", "ts", "jsx", "tsx", "json", "xml", "sql",
        "nosql", "c++", "c#", "cpu", "gpu", "ram", "ssd", "ui", "ux", "cli", "pr", "mr", "faq",
        "sdk", "ide", "npm", "pypi", "rest", "graphql", "grpc", "jwt", "oauth", "ssh", "ssl",
        "tls", "tcp", "ip", "dns", "http", "https", "ai", "ml", "llm", "gpt", "nlp", "cv", "wasm",
        "svg", "png", "jpg", "pdf", "ios", "os", "vm", "vdom", "dom", "spa", "pwa", "ssr", "ssg",
        "seo", "rss",
    ]
    .into_iter()
    .collect()
});

static RE_FILE_EXT: Lazy<Regex> = Lazy::new(|| Regex::new(r"\.[a-zA-Z0-9]{2,5}$").unwrap());
static RE_HEX_8PLUS: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?i)^[0-9a-f]{8,}$").unwrap());
static RE_NOTION_HEX: Lazy<Regex> = Lazy::new(|| Regex::new(r"-[a-f0-9]{32}$").unwrap());
static RE_MAPS_PLACE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"/maps/place/([^/@?#]+)").unwrap());
static RE_MAPS_DIR: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"/maps/dir/([^/@?#]+)/([^/@?#]+)").unwrap());
static RE_MAPS_SEARCH: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"/maps/search/([^/@?#]+)").unwrap());

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RichHistoryMeta {
    pub clean_url: String,
    pub dedupe_key: String,
    pub display_title: String,
    pub domain: String,
    pub search_query: String,
}

fn decode_component_plus(s: &str) -> String {
    let decoded = percent_decode_str(s).decode_utf8_lossy();
    decoded.replace('+', " ")
}

fn decode_component(s: &str) -> String {
    percent_decode_str(s).decode_utf8_lossy().into_owned()
}

fn get_query_param(u: &Url, key: &str) -> Option<String> {
    u.query_pairs()
        .find(|(k, _)| k == key)
        .map(|(_, v)| v.into_owned())
}

/// Capitalizes and un-slugifies a URL segment or slug.
pub fn unslugify(slug: &str) -> String {
    if slug.is_empty() {
        return String::new();
    }
    let decoded = decode_component(slug);
    let no_ext = RE_FILE_EXT.replace(&decoded, "");
    let replaced: String = no_ext
        .chars()
        .map(|c| match c {
            '-' | '_' | '+' => ' ',
            _ => c,
        })
        .collect();
    let collapsed = replaced.split_whitespace().collect::<Vec<_>>().join(" ");
    if collapsed.is_empty() {
        return String::new();
    }

    collapsed
        .split(' ')
        .filter(|w| !w.is_empty())
        .map(|word| {
            let lower = word.to_lowercase();
            if PRESERVED_ACRONYMS.contains(lower.as_str()) {
                if lower == "c++" {
                    "C++".to_string()
                } else if lower == "c#" {
                    "C#".to_string()
                } else {
                    lower.to_uppercase()
                }
            } else {
                let mut chars = word.chars();
                match chars.next() {
                    Some(first) => {
                        let mut out = first.to_uppercase().to_string();
                        out.push_str(chars.as_str());
                        out
                    }
                    None => String::new(),
                }
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Strips tracking parameters from a URL for clean display.
pub fn strip_tracking_params(raw_url: &str) -> String {
    let trimmed = raw_url.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let Ok(mut u) = Url::parse(trimmed) else {
        return raw_url.to_string();
    };

    let pairs: Vec<(String, String)> = u
        .query_pairs()
        .map(|(k, v)| (k.into_owned(), v.into_owned()))
        .collect();

    let has_tracking = pairs
        .iter()
        .any(|(k, _)| TRACKING_PARAMS.contains(k.as_str()));
    if !has_tracking {
        return raw_url.to_string();
    }

    let kept: Vec<(String, String)> = pairs
        .into_iter()
        .filter(|(k, _)| !TRACKING_PARAMS.contains(k.as_str()))
        .collect();

    if kept.is_empty() {
        u.set_query(None);
    } else {
        let mut qp = u.query_pairs_mut();
        qp.clear();
        for (k, v) in &kept {
            qp.append_pair(k, v);
        }
    }
    u.to_string()
}

/// Checks if a URL is noise/clutter that shouldn't be recorded in history.
pub fn is_junk_history_url(raw_url: &str) -> bool {
    let trimmed = raw_url.trim();
    if trimmed.is_empty() {
        return true;
    }
    let lower = trimmed.to_lowercase();
    if lower == "about:blank"
        || lower.starts_with("about:")
        || lower.starts_with("chrome:")
        || lower.starts_with("devtools:")
        || lower.starts_with("qbrowse:")
        || lower.starts_with("data:")
        || lower.starts_with("blob:")
        || lower.starts_with("javascript:")
    {
        return true;
    }

    let Ok(u) = Url::parse(trimmed) else {
        return false;
    };

    let host = u.host_str().unwrap_or("").to_lowercase();
    let path = u.path();
    let path_lower = path.to_lowercase();

    // Loopback OAuth callbacks (e.g. http://localhost:54321/callback, http://127.0.0.1:8080/oauth/callback)
    if (host == "localhost" || host == "127.0.0.1" || host == "::1" || host == "[::1]")
        && (path_lower.contains("/callback")
            || path_lower.contains("/oauth")
            || path_lower.contains("/auth/callback")
            || path_lower.contains("/signin-oidc"))
    {
        return true;
    }

    // Empty Google search
    if host.contains("google.") && (path == "/search" || path.starts_with("/search/")) {
        let q = get_query_param(&u, "q").unwrap_or_default();
        if q.trim().is_empty() {
            return true;
        }
    }

    // Empty Bing search
    if host.contains("bing.com") && path.contains("/search") {
        let q = get_query_param(&u, "q").unwrap_or_default();
        if q.trim().is_empty() {
            return true;
        }
    }

    // Empty DuckDuckGo search
    if host.contains("duckduckgo.com") && (path == "/" || path.is_empty()) {
        let q = get_query_param(&u, "q").unwrap_or_default();
        if u.query().is_some() && q.is_empty() {
            return true;
        }
    }

    // Google Accounts auth handshakes & pings
    if host.contains("accounts.google.com")
        && (path.contains("/signin/v2/challenge") || path.contains("/CheckCookie"))
    {
        return true;
    }

    // Common telemetry & ad redirect endpoints
    if path.contains("/telemetry") || path.contains("/beacon") || path.contains("/collect") {
        return true;
    }

    false
}

/// Formats a clean domain badge string (e.g. "google.com/maps", "github.com", "Local File").
pub fn format_display_domain(raw_url: &str) -> String {
    if raw_url.is_empty() {
        return String::new();
    }
    if raw_url.starts_with("file://") {
        return "Local File".to_string();
    }
    if raw_url.starts_with("qbrowse://") {
        return "QBrowse".to_string();
    }
    let Ok(u) = Url::parse(raw_url) else {
        return raw_url.to_string();
    };
    let raw_host = u.host_str().unwrap_or("");
    let host = raw_host.strip_prefix("www.").unwrap_or(raw_host);
    let path = u.path();

    if host.contains("google.") {
        if path.contains("/maps") {
            return "google.com/maps".to_string();
        }
        if path.contains("/search") {
            return "google.com/search".to_string();
        }
        if host.starts_with("docs.") {
            return "docs.google.com".to_string();
        }
        if host.starts_with("drive.") {
            return "drive.google.com".to_string();
        }
    }
    if host.contains("github.com") {
        return "github.com".to_string();
    }
    if host.contains("stackoverflow.com") {
        return "stackoverflow.com".to_string();
    }
    if host.contains("youtube.com") || host.contains("youtu.be") {
        return "youtube.com".to_string();
    }
    if host.contains("reddit.com") {
        return "reddit.com".to_string();
    }
    if host.contains("wikipedia.org") {
        return "wikipedia.org".to_string();
    }
    if host == "localhost" || host == "127.0.0.1" {
        return match u.port() {
            Some(p) => format!("localhost:{p}"),
            None => "localhost".to_string(),
        };
    }

    host.to_string()
}

/// Intelligent title extractor matching `getIntelligentTitle` in `src/utils/historyExtractors.js`.
pub fn get_intelligent_title(raw_url: &str, raw_title: &str) -> String {
    let raw_url = raw_url.trim();
    let raw_title = raw_title.trim();
    if raw_url.is_empty() {
        return if raw_title.is_empty() {
            "Untitled".to_string()
        } else {
            raw_title.to_string()
        };
    }

    // 1. Local Files
    if raw_url.starts_with("file://") {
        let clean_path = decode_component(
            raw_url
                .trim_start_matches("file:///")
                .trim_start_matches("file://"),
        );
        let file_name = clean_path
            .split(['/', '\\'])
            .filter(|s| !s.is_empty())
            .last();
        return match file_name {
            Some(name) => format!("{name} (Local File)"),
            None => "Local File".to_string(),
        };
    }

    // 2. QBrowse Internal Pages
    if let Some(rest) = raw_url.strip_prefix("qbrowse://") {
        let page = rest.split(['/', '?', '#']).next().unwrap_or("");
        return match page {
            "flags" => "QBrowse Flags & Features".to_string(),
            "settings" => "Browser Settings".to_string(),
            "help" => "QBrowse Help Center".to_string(),
            "shortcuts" => "Keyboard Shortcuts".to_string(),
            "terms" | "tos" => "Terms of Service".to_string(),
            "privacy" => "Privacy Policy".to_string(),
            "licenses" | "credits" => "Open-Source Licenses".to_string(),
            "ai" => "Qu-AI Assistant".to_string(),
            "vault" => "Credential Vault".to_string(),
            "adblock" => "Shield & Content Filtering".to_string(),
            "history" => "Archive".to_string(),
            "downloads" => "Downloads".to_string(),
            _ => format!("QBrowse {}", unslugify(page)),
        };
    }

    let parsed = Url::parse(raw_url).ok();

    // 3. Localhost Development Servers
    if let Some(ref u) = parsed {
        let host = u.host_str().unwrap_or("");
        if host == "localhost" || host == "127.0.0.1" {
            let port = u.port().map(|p| format!(":{p}")).unwrap_or_default();
            if !raw_title.is_empty()
                && !raw_title.starts_with("http://")
                && !raw_title.starts_with("https://")
                && raw_title != "localhost"
            {
                return format!("{raw_title} (Localhost{port})");
            }
            let path = if u.path() == "/" { "" } else { u.path() };
            return if !path.is_empty() {
                format!("{} (Localhost{port})", unslugify(path))
            } else {
                format!("Local Server ({host}{port})")
            };
        }
    }

    // 4. Google Maps
    if raw_url.contains("google.") && raw_url.contains("/maps") {
        if let Some(caps) = RE_MAPS_PLACE.captures(raw_url) {
            let place = decode_component_plus(&caps[1]).trim().to_string();
            return format!("{place} - Google Maps");
        }
        if let Some(caps) = RE_MAPS_DIR.captures(raw_url) {
            let from = decode_component_plus(&caps[1]).trim().to_string();
            let to = decode_component_plus(&caps[2]).trim().to_string();
            return format!("Directions: {from} to {to} - Google Maps");
        }
        if let Some(caps) = RE_MAPS_SEARCH.captures(raw_url) {
            let term = decode_component_plus(&caps[1]).trim().to_string();
            return format!("Search: {term} - Google Maps");
        }
        return "Google Maps".to_string();
    }

    if let Some(ref u) = parsed {
        let raw_host = u.host_str().unwrap_or("");
        let host = raw_host.strip_prefix("www.").unwrap_or(raw_host);
        let path = u.path();
        let parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();

        // 5. Search Engines
        if host.contains("google.") && (path == "/search" || path.starts_with("/search/")) {
            if let Some(q) = get_query_param(u, "q") {
                if !q.is_empty() {
                    let decoded = decode_component_plus(&q).trim().to_string();
                    let tbm = get_query_param(u, "tbm").unwrap_or_default();
                    let udm = get_query_param(u, "udm").unwrap_or_default();
                    let kind = if tbm == "isch" || udm == "2" {
                        "Images"
                    } else if tbm == "nws" || udm == "12" {
                        "News"
                    } else if tbm == "vid" || udm == "7" {
                        "Videos"
                    } else {
                        "Search"
                    };
                    return format!("{decoded} - Google {kind}");
                }
            }
            return "Google Search".to_string();
        }
        if host.contains("scholar.google.") {
            if let Some(q) = get_query_param(u, "q").filter(|s| !s.is_empty()) {
                return format!("{} - Google Scholar", decode_component_plus(&q).trim());
            }
            return "Google Scholar".to_string();
        }
        if host.contains("google.") && path.contains("/finance/quote/") {
            if let Some(after) = path.split("/finance/quote/").nth(1) {
                if let Some(ticker) = after.split(['/', '?', '#']).next().filter(|s| !s.is_empty())
                {
                    return format!("{} - Google Finance", decode_component(ticker));
                }
            }
        }
        if host.contains("bing.com") && path.contains("/search") {
            if let Some(q) = get_query_param(u, "q").filter(|s| !s.is_empty()) {
                let kind = if path.contains("/images") {
                    "Images"
                } else {
                    "Search"
                };
                return format!("{} - Bing {kind}", decode_component_plus(&q).trim());
            }
            return "Bing Search".to_string();
        }
        if host.contains("duckduckgo.com") {
            if let Some(q) = get_query_param(u, "q").filter(|s| !s.is_empty()) {
                return format!("{} - DuckDuckGo Search", decode_component_plus(&q).trim());
            }
        }
        if host.contains("search.brave.com") {
            if let Some(q) = get_query_param(u, "q").filter(|s| !s.is_empty()) {
                return format!("{} - Brave Search", decode_component_plus(&q).trim());
            }
        }
        if host.contains("ecosia.org") && path.contains("/search") {
            if let Some(q) = get_query_param(u, "q").filter(|s| !s.is_empty()) {
                return format!("{} - Ecosia", decode_component_plus(&q).trim());
            }
        }
        if host.contains("kagi.com") && path.contains("/search") {
            if let Some(q) = get_query_param(u, "q").filter(|s| !s.is_empty()) {
                return format!("{} - Kagi", decode_component_plus(&q).trim());
            }
        }
        if host.contains("yandex.") && path.contains("/search") {
            if let Some(text) = get_query_param(u, "text").filter(|s| !s.is_empty()) {
                return format!("{} - Yandex", decode_component_plus(&text).trim());
            }
        }
        if host.contains("search.yahoo.com") && path.contains("/search") {
            if let Some(p) = get_query_param(u, "p").filter(|s| !s.is_empty()) {
                return format!("{} - Yahoo Search", decode_component_plus(&p).trim());
            }
        }
        if host.contains("perplexity.ai") {
            if let Some(q) = get_query_param(u, "q").filter(|s| !s.is_empty()) {
                return format!("{} - Perplexity", decode_component_plus(&q).trim());
            }
            if let Some(after) = path.strip_prefix("/search/") {
                let slug = after.split(['/', '?', '#']).next().unwrap_or("");
                if !slug.is_empty() {
                    return format!("{} - Perplexity", unslugify(slug));
                }
            }
        }

        // 6. Developer Registries & Hubs
        if host.contains("github.com") && !host.contains("gist.github.com") {
            if parts.len() >= 4 && parts[2] == "pull" {
                return format!("PR #{} in {}/{} - GitHub", parts[3], parts[0], parts[1]);
            }
            if parts.len() >= 4 && parts[2] == "issues" {
                return format!("Issue #{} in {}/{} - GitHub", parts[3], parts[0], parts[1]);
            }
            if parts.len() >= 4 && parts[2] == "releases" && parts[3] == "tag" {
                let tag = parts.get(4).copied().unwrap_or("");
                return format!("Release {tag} in {}/{} - GitHub", parts[0], parts[1]);
            }
            if parts.len() >= 4 && (parts[2] == "commit" || parts[2] == "commits") {
                let short_sha: String = parts[3].chars().take(7).collect();
                return format!("Commit {short_sha} in {}/{} - GitHub", parts[0], parts[1]);
            }
            if parts.len() >= 4 && (parts[2] == "blob" || parts[2] == "tree") {
                let file = parts[4..].join("/");
                let label = if file.is_empty() { parts[3] } else { &file };
                return format!("{label} in {}/{} - GitHub", parts[0], parts[1]);
            }
            if parts.len() >= 4 && parts[2] == "actions" && parts[3] == "runs" {
                let run_id = parts.get(4).copied().unwrap_or("");
                return format!("Workflow Run #{run_id} in {}/{} - GitHub", parts[0], parts[1]);
            }
            if parts.len() >= 2 {
                return format!("{}/{} - GitHub", parts[0], parts[1]);
            }
            if parts.len() == 1 {
                return format!("@{} - GitHub", parts[0]);
            }
        }
        if host.contains("gist.github.com") && parts.len() >= 2 {
            return format!("Gist by @{} - GitHub", parts[0]);
        }
        if host.contains("gitlab.com") {
            if let Some(mr_idx) = parts.iter().position(|&p| p == "merge_requests") {
                let mr = parts.get(mr_idx + 1).copied().unwrap_or("");
                return format!("MR #{mr} - GitLab");
            }
            if let Some(iss_idx) = parts.iter().position(|&p| p == "issues") {
                let iss = parts.get(iss_idx + 1).copied().unwrap_or("");
                return format!("Issue #{iss} - GitLab");
            }
            if parts.len() >= 2 {
                return format!("{}/{} - GitLab", parts[0], parts[1]);
            }
        }
        if host.contains("npmjs.com") {
            if let Some(pkg) = path.strip_prefix("/package/") {
                return format!("{} - npm", pkg.trim_end_matches('/'));
            }
            if path.starts_with("/search") {
                if let Some(q) = get_query_param(u, "q").filter(|s| !s.is_empty()) {
                    return format!("Search: {} - npm", decode_component(&q));
                }
            }
        }
        if host.contains("pypi.org") {
            if let Some(rest) = path.strip_prefix("/project/") {
                if let Some(pkg) = rest.split('/').next().filter(|s| !s.is_empty()) {
                    return format!("{pkg} - PyPI");
                }
            }
            if path.starts_with("/search") {
                if let Some(q) = get_query_param(u, "q").filter(|s| !s.is_empty()) {
                    return format!("Search: {} - PyPI", decode_component(&q));
                }
            }
        }
        if host.contains("crates.io") {
            if let Some(rest) = path.strip_prefix("/crates/") {
                if let Some(c) = rest.split('/').next().filter(|s| !s.is_empty()) {
                    return format!("{c} - Crates.io");
                }
            }
            if path.starts_with("/search") {
                if let Some(q) = get_query_param(u, "q").filter(|s| !s.is_empty()) {
                    return format!("Search: {} - Crates.io", decode_component(&q));
                }
            }
        }
        if host.contains("pkg.go.dev") {
            let pkg = path.trim_start_matches('/');
            if !pkg.is_empty() {
                return format!("{pkg} - Go Packages");
            }
        }
        if host.contains("hub.docker.com") {
            if let Some(repo) = path.strip_prefix("/r/") {
                return format!("{} - Docker Hub", repo.trim_end_matches('/'));
            }
            if let Some(official) = path.strip_prefix("/_/") {
                return format!("{} (Official) - Docker Hub", official.trim_end_matches('/'));
            }
        }
        if host.contains("huggingface.co") && parts.len() >= 2 {
            return format!("{}/{} - Hugging Face", parts[0], parts[1]);
        }

        // 7. Developer Documentation
        if host.contains("developer.mozilla.org") {
            if let Some(doc_idx) = parts.iter().position(|&p| p == "docs") {
                if parts.get(doc_idx + 1).is_some() {
                    if let Some(last) = parts.last() {
                        return format!("{} - MDN Web Docs", unslugify(last));
                    }
                }
            }
        }
        if host.contains("cppreference.com") {
            if let Some(topic) = parts.last().filter(|s| !s.is_empty()) {
                return format!("{} - C++ Reference", decode_component(topic).replace('_', "::"));
            }
        }
        if host.contains("doc.rust-lang.org") {
            if let Some(last) = parts.last() {
                let item = last.strip_suffix(".html").unwrap_or(last);
                if !item.is_empty() {
                    return format!("std::{item} - Rust Docs");
                }
            }
        }
        if host.contains("learn.microsoft.com") {
            if let Some(last) = parts.last().filter(|s| !s.is_empty()) {
                return format!("{} - Microsoft Learn", unslugify(last));
            }
        }
        if host.contains("tailwindcss.com") && path.contains("/docs/") {
            if let Some(after) = path.split("/docs/").nth(1) {
                if let Some(slug) = after.split(['/', '?', '#']).next().filter(|s| !s.is_empty()) {
                    return format!("{} - Tailwind CSS", unslugify(slug));
                }
            }
        }

        // 8. Q&A & Discussions
        if (host.contains("stackoverflow.com")
            || host.contains("stackexchange.com")
            || host.contains("superuser.com")
            || host.contains("serverfault.com"))
            && path.contains("/questions/")
            && parts.len() >= 3
            && !parts[2].is_empty()
        {
            let brand = if host.contains("stackoverflow.com") {
                "Stack Overflow"
            } else if host.contains("superuser.com") {
                "Super User"
            } else {
                "Stack Exchange"
            };
            return format!("{} - {brand}", unslugify(parts[2]));
        }
        if host.contains("reddit.com") {
            if parts.len() >= 5 && parts[0] == "r" && parts[2] == "comments" {
                return format!("{} - r/{}", unslugify(parts[4]), parts[1]);
            }
            if parts.len() >= 2 && parts[0] == "r" {
                return format!("r/{} - Reddit", parts[1]);
            }
            if parts.len() >= 2 && (parts[0] == "user" || parts[0] == "u") {
                return format!("u/{} - Reddit", parts[1]);
            }
        }
        if host.contains("news.ycombinator.com") {
            if let Some(id) = get_query_param(u, "id").filter(|s| !s.is_empty()) {
                if !raw_title.is_empty()
                    && raw_title != "Hacker News"
                    && !raw_title.starts_with("http")
                {
                    return format!("{raw_title} - Hacker News");
                }
                return format!("Hacker News Item #{id}");
            }
            return "Hacker News Frontpage".to_string();
        }

        // 9. Media & Streaming
        if host.contains("youtube.com") || host.contains("youtu.be") {
            if path.contains("/watch") {
                let title_match = if !raw_title.is_empty()
                    && !raw_title.starts_with("http")
                    && raw_title != "YouTube"
                    && !raw_title.contains("youtube.com")
                {
                    raw_title.trim_end_matches(" - YouTube").trim()
                } else {
                    ""
                };
                return if title_match.is_empty() {
                    "YouTube Video".to_string()
                } else {
                    format!("{title_match} - YouTube")
                };
            }
            if path.starts_with("/shorts/") {
                return "YouTube Short".to_string();
            }
            if let Some(handle) = path.strip_prefix("/@") {
                let name = handle.split(['/', '?', '#']).next().unwrap_or("");
                return format!("@{name} - YouTube");
            }
            if path.contains("/playlist") {
                return "YouTube Playlist".to_string();
            }
            if path.contains("/results") {
                if let Some(q) = get_query_param(u, "search_query").filter(|s| !s.is_empty()) {
                    return format!("Search: {} - YouTube", decode_component_plus(&q));
                }
            }
        }
        if host.contains("twitch.tv") {
            if parts.len() == 1 && !["directory", "settings", "downloads"].contains(&parts[0]) {
                return format!("@{} - Twitch", parts[0]);
            }
            if parts.len() >= 2 && parts[0] == "videos" {
                return format!("VOD #{} - Twitch", parts[1]);
            }
        }
        if host.contains("spotify.com") {
            if parts.contains(&"track") {
                return "Spotify Track".to_string();
            }
            if parts.contains(&"album") {
                return "Spotify Album".to_string();
            }
            if parts.contains(&"playlist") {
                return "Spotify Playlist".to_string();
            }
            if parts.contains(&"artist") {
                return "Spotify Artist".to_string();
            }
        }
        if host.contains("imdb.com") {
            if path.contains("/title/") {
                if !raw_title.is_empty()
                    && !raw_title.starts_with("http")
                    && !raw_title.contains("IMDb")
                {
                    return format!("{raw_title} - IMDb");
                }
                return "IMDb Title".to_string();
            }
            if path.contains("/name/") {
                if !raw_title.is_empty()
                    && !raw_title.starts_with("http")
                    && !raw_title.contains("IMDb")
                {
                    return format!("{raw_title} - IMDb");
                }
                return "IMDb Profile".to_string();
            }
        }
        if host.contains("soundcloud.com") && parts.len() >= 2 {
            return format!(
                "{} by {} - SoundCloud",
                unslugify(parts[1]),
                unslugify(parts[0])
            );
        }

        // 10. Social Platforms
        if host.contains("twitter.com") || host == "x.com" {
            if parts.len() >= 3 && parts[1] == "status" {
                return format!("Post by @{} on X", parts[0]);
            }
            if parts.len() == 1
                && !["home", "explore", "notifications", "messages"].contains(&parts[0])
            {
                return format!("@{} - X", parts[0]);
            }
        }
        if host.contains("bsky.app") {
            if parts.len() >= 4 && parts[0] == "profile" && parts[2] == "post" {
                return format!("Post by @{} on Bluesky", parts[1]);
            }
            if parts.len() >= 2 && parts[0] == "profile" {
                return format!("@{} - Bluesky", parts[1]);
            }
        }
        if host.contains("linkedin.com") {
            if let Some(rest) = path.strip_prefix("/in/") {
                let user = rest.split(['/', '?', '#']).next().unwrap_or("");
                return format!("{} - LinkedIn", unslugify(user));
            }
            if let Some(rest) = path.strip_prefix("/company/") {
                let comp = rest.split(['/', '?', '#']).next().unwrap_or("");
                return format!("{} - LinkedIn", unslugify(comp));
            }
            if path.starts_with("/jobs/view/") {
                return "Job Posting - LinkedIn".to_string();
            }
        }

        // 11. E-Commerce
        if host.contains("amazon.") {
            if let Some(dp_idx) = parts.iter().position(|&p| p == "dp") {
                if dp_idx > 0 {
                    return format!("{} - Amazon", unslugify(parts[dp_idx - 1]));
                }
            }
            if let Some(q) = get_query_param(u, "k").filter(|s| !s.is_empty()) {
                return format!("Search: {} - Amazon", decode_component_plus(&q));
            }
        }
        if host.contains("ebay.") {
            if path.contains("/itm/") {
                if let Some(itm_idx) = parts.iter().position(|&p| p == "itm") {
                    if let Some(item_id) = parts.get(itm_idx + 1) {
                        return format!("Item #{item_id} - eBay");
                    }
                }
            }
            if let Some(q) = get_query_param(u, "_nkw").filter(|s| !s.is_empty()) {
                return format!("Search: {} - eBay", decode_component_plus(&q));
            }
        }
        if host.contains("steampowered.com") && path.contains("/app/") {
            if let Some(app_idx) = parts.iter().position(|&p| p == "app") {
                if let Some(slug) = parts.get(app_idx + 2) {
                    return format!("{} - Steam", unslugify(slug));
                }
            }
        }

        // 12. Cloud Productivity & AI
        if host.contains("chatgpt.com") {
            if !raw_title.is_empty() && !raw_title.starts_with("http") && raw_title != "ChatGPT" {
                return format!("{raw_title} - ChatGPT");
            }
            if path.starts_with("/c/") {
                return "ChatGPT Conversation".to_string();
            }
            if path.starts_with("/g/") {
                return "Custom GPT".to_string();
            }
            return "ChatGPT".to_string();
        }
        if host.contains("claude.ai") {
            if !raw_title.is_empty() && !raw_title.starts_with("http") && raw_title != "Claude" {
                return format!("{raw_title} - Claude");
            }
            if path.starts_with("/chat/") {
                return "Claude Chat".to_string();
            }
            return "Claude AI".to_string();
        }
        if host.contains("docs.google.com") {
            if !raw_title.is_empty()
                && !raw_title.starts_with("http")
                && !raw_title.contains("Google Docs")
            {
                return format!("{raw_title} - Google Docs");
            }
            if path.contains("/document/") {
                return "Google Document".to_string();
            }
            if path.contains("/spreadsheets/") {
                return "Google Spreadsheet".to_string();
            }
            if path.contains("/presentation/") {
                return "Google Presentation".to_string();
            }
            return "Google Workspace".to_string();
        }
        if host.contains("drive.google.com") {
            return "Google Drive".to_string();
        }
        if host.contains("figma.com")
            && parts.len() >= 3
            && (parts[0] == "design" || parts[0] == "file")
        {
            return format!("{} - Figma", unslugify(parts[2]));
        }
        if host.contains("notion.so") {
            if let Some(last) = parts.last() {
                let clean_last = RE_NOTION_HEX.replace(last, "");
                return format!("{} - Notion", unslugify(&clean_last));
            }
        }

        // 13. Reference
        if host.contains("wikipedia.org") && path.contains("/wiki/") {
            let article = path
                .trim_start_matches("/wiki/")
                .split(['?', '#'])
                .next()
                .unwrap_or("");
            if !article.is_empty() {
                return format!("{} - Wikipedia", unslugify(article));
            }
        }
        if host.contains("arxiv.org")
            && parts.len() >= 2
            && (parts[0] == "abs" || parts[0] == "pdf")
        {
            return format!("Paper {} - arXiv", parts[1]);
        }
    }

    // 14. Clean raw_title if already human-readable
    if !raw_title.is_empty()
        && !raw_title.starts_with("http://")
        && !raw_title.starts_with("https://")
    {
        let sanitized = raw_title
            .trim_end_matches(" - Google Search")
            .trim_end_matches(" - Google")
            .trim();
        if !sanitized.is_empty() {
            return sanitized.to_string();
        }
    }

    // 15. Universal Fallback
    if let Some(ref u) = parsed {
        let raw_host = u.host_str().unwrap_or("");
        let host = raw_host.strip_prefix("www.").unwrap_or(raw_host);
        let segments: Vec<&str> = u.path().split('/').filter(|s| !s.is_empty()).collect();
        if let Some(last_segment) = segments.last() {
            let clean_slug = unslugify(last_segment);
            if clean_slug.len() > 2 && !RE_HEX_8PLUS.is_match(last_segment) {
                return format!("{clean_slug} ({host})");
            }
        }
        return host.to_string();
    }

    if !raw_title.is_empty() {
        raw_title.to_string()
    } else {
        raw_url.to_string()
    }
}

/// Generates an intelligent deduplication key matching `getHistoryDedupeKey`.
pub fn get_history_dedupe_key(url_str: &str) -> String {
    let trimmed = url_str.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let Ok(u) = Url::parse(trimmed) else {
        return url_str.to_string();
    };
    let raw_host = u.host_str().unwrap_or("");
    let host = raw_host.strip_prefix("www.").unwrap_or(raw_host);
    let path = u.path();

    // Google Maps
    if host.contains("google.") && path.contains("/maps") {
        if let Some(caps) = RE_MAPS_PLACE.captures(path) {
            return format!("gmaps:place:{}", caps[1].to_lowercase());
        }
        if let Some(caps) = RE_MAPS_DIR.captures(path) {
            return format!(
                "gmaps:dir:{}:{}",
                caps[1].to_lowercase(),
                caps[2].to_lowercase()
            );
        }
        if let Some(caps) = RE_MAPS_SEARCH.captures(path) {
            return format!("gmaps:search:{}", caps[1].to_lowercase());
        }
        return "gmaps:general".to_string();
    }

    // Google Search
    if host.contains("google.") && (path == "/search" || path.starts_with("/search/")) {
        let q = get_query_param(&u, "q").unwrap_or_default();
        let trimmed_q = q.trim().to_lowercase();
        return if trimmed_q.is_empty() {
            "gsearch:empty".to_string()
        } else {
            format!("gsearch:{trimmed_q}")
        };
    }

    // Bing Search
    if host.contains("bing.") && path.contains("/search") {
        let q = get_query_param(&u, "q").unwrap_or_default();
        let trimmed_q = q.trim().to_lowercase();
        return if trimmed_q.is_empty() {
            "bsearch:empty".to_string()
        } else {
            format!("bsearch:{trimmed_q}")
        };
    }

    // DuckDuckGo Search
    if host.contains("duckduckgo.com") {
        let q = get_query_param(&u, "q").unwrap_or_default();
        let trimmed_q = q.trim().to_lowercase();
        return if trimmed_q.is_empty() {
            "ddg:empty".to_string()
        } else {
            format!("ddg:{trimmed_q}")
        };
    }

    // Brave Search
    if host.contains("search.brave.com") {
        let q = get_query_param(&u, "q").unwrap_or_default();
        return format!("brave:{}", q.trim().to_lowercase());
    }

    // YouTube Watch
    if host.contains("youtube.com") && path.contains("/watch") {
        let v = get_query_param(&u, "v").unwrap_or_default();
        return format!("yt:video:{v}");
    }

    // YouTube Shorts
    if host.contains("youtube.com") && path.starts_with("/shorts/") {
        let id = path
            .split("/shorts/")
            .nth(1)
            .and_then(|s| s.split(['/', '?', '#']).next())
            .unwrap_or("");
        return format!("yt:shorts:{id}");
    }

    // Reddit Posts
    if host.contains("reddit.com") && path.contains("/comments/") {
        let parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
        let id = parts.get(3).copied().unwrap_or("");
        return format!("reddit:post:{id}");
    }

    // GitHub
    if host.contains("github.com") {
        return format!("gh:{}", path.trim_end_matches('/'));
    }

    // Spotify
    if host.contains("spotify.com") {
        return format!("spotify:{}", path.trim_end_matches('/'));
    }

    // General -> Origin + normalized pathname
    let origin = u.origin().ascii_serialization();
    format!("{}{}", origin, path.trim_end_matches('/'))
}

/// Extracts search query text if the URL represents a search engine, Maps search, or YouTube search.
pub fn extract_search_query(raw_url: &str) -> String {
    let Ok(u) = Url::parse(raw_url.trim()) else {
        return String::new();
    };
    let raw_host = u.host_str().unwrap_or("");
    let host = raw_host.strip_prefix("www.").unwrap_or(raw_host);
    let path = u.path();

    if host.contains("google.") && path.contains("/maps/search/") {
        if let Some(caps) = RE_MAPS_SEARCH.captures(path) {
            return decode_component_plus(&caps[1]).trim().to_string();
        }
    }
    if host.contains("youtube.com") && path.contains("/results") {
        if let Some(q) = get_query_param(&u, "search_query") {
            return decode_component_plus(&q).trim().to_string();
        }
    }
    if host.contains("yandex.") && path.contains("/search") {
        if let Some(t) = get_query_param(&u, "text") {
            return decode_component_plus(&t).trim().to_string();
        }
    }
    if host.contains("search.yahoo.com") && path.contains("/search") {
        if let Some(p) = get_query_param(&u, "p") {
            return decode_component_plus(&p).trim().to_string();
        }
    }
    if let Some(q) = get_query_param(&u, "q") {
        return decode_component_plus(&q).trim().to_string();
    }
    String::new()
}

/// Extracts all rich history metadata for a URL + raw title in a single call.
pub fn extract_rich_history_meta(raw_url: &str, raw_title: &str) -> RichHistoryMeta {
    let clean_url = strip_tracking_params(raw_url);
    let dedupe_key = get_history_dedupe_key(raw_url);
    let display_title = get_intelligent_title(raw_url, raw_title);
    let domain = format_display_domain(raw_url);
    let search_query = extract_search_query(raw_url);
    RichHistoryMeta {
        clean_url,
        dedupe_key,
        display_title,
        domain,
        search_query,
    }
}

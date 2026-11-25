use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use url::Url;

pub const DEFAULT_DARK_EXCLUSIONS: &[&str] = &[
    "youtube.com",
    "github.com",
    "figma.com",
    "mail.google.com",
    "discord.com",
    "twitch.tv",
    "spotify.com",
    "netflix.com",
    "x.com",
    "twitter.com",
    "reddit.com",
    "chatgpt.com",
    "claude.ai",
    "notion.so",
    "linear.app",
    "vercel.com",
    "dribbble.com",
    "unsplash.com",
];

const INTERNAL_SCHEMES: &[&str] = &[
    "about:",
    "qbrowse:",
    "chrome:",
    "chrome-extension:",
    "devtools:",
    "data:",
    "blob:",
    "javascript:",
    "mailto:",
    "tel:",
    "file:",
    "view-source:",
];

static SCHEME_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)^([a-z][a-z0-9+.-]*:)").expect("valid regex"));
static SCHEME_SLASH_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)^[a-z][a-z0-9+.-]*://").expect("valid regex"));
static HOST_PORT_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[a-zA-Z0-9.-]+:\d+(?:/.*)?$").expect("valid regex"));
static IPV4_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$")
        .expect("valid regex")
});
static DOMAIN_LABEL_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$").expect("valid regex"));
static SRGB_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*/\s*([\d.]+%?))?\s*\)$")
        .expect("valid regex")
});
static RGB_NUM_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"[\d.]+%?").expect("valid regex"));

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DarkModeExclusionMatch {
    pub excluded: bool,
    pub matched_rule: Option<String>,
    pub match_type: Option<String>,
    pub hostname: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RgbaColor {
    pub r: f64,
    pub g: f64,
    pub b: f64,
    pub a: f64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackgroundLayer {
    pub bg: Option<String>,
    #[serde(default)]
    pub is_injected_html_bg: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeDarkSignals {
    #[serde(default)]
    pub meta_color_scheme: String,
    #[serde(default)]
    pub computed_color_scheme: String,
    #[serde(default)]
    pub prefers_dark_media: bool,
    #[serde(default)]
    pub has_dark_attr_or_class: bool,
    #[serde(default)]
    pub background_layers: Vec<BackgroundLayer>,
    #[serde(default)]
    pub body_text_color: String,
}

pub fn is_valid_ipv4(host: &str) -> bool {
    IPV4_RE.is_match(host)
}

pub fn is_valid_domain_host(host: &str) -> bool {
    if host.is_empty() || host.len() > 253 {
        return false;
    }
    if host == "localhost" || is_valid_ipv4(host) {
        return true;
    }
    let labels: Vec<&str> = host.split('.').collect();
    if labels.len() < 2 {
        return false;
    }
    for label in &labels {
        if !DOMAIN_LABEL_RE.is_match(label) {
            return false;
        }
    }
    let tld = labels[labels.len() - 1];
    if tld.chars().all(|c| c.is_ascii_digit()) {
        return false;
    }
    true
}

pub fn strip_leading_www(host: &str) -> String {
    let lower = host.to_lowercase();
    if let Some(stripped) = lower.strip_prefix("www.") {
        if stripped.contains('.') {
            return stripped.to_string();
        }
    }
    lower
}

pub fn extract_hostname_from_url(raw_url: &str) -> Option<String> {
    let trimmed = raw_url.trim();
    if trimmed.is_empty() {
        return None;
    }

    if let Some(caps) = SCHEME_RE.captures(trimmed) {
        let scheme = caps[1].to_lowercase();
        if INTERNAL_SCHEMES.contains(&scheme.as_str()) {
            return None;
        }
        if scheme != "http:" && scheme != "https:" {
            return None;
        }
    }

    let with_scheme = if SCHEME_SLASH_RE.is_match(trimmed) {
        trimmed.to_string()
    } else {
        format!("https://{}", trimmed)
    };

    let parsed = Url::parse(&with_scheme).ok()?;
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return None;
    }
    let host_raw = parsed.host_str()?.to_lowercase();
    let host_trimmed = host_raw.trim_end_matches('.');
    let host = strip_leading_www(host_trimmed);
    if !is_valid_domain_host(&host) {
        return None;
    }
    Some(host)
}

pub fn normalize_whitelist_entry(raw_input: &str) -> Option<String> {
    let mut s = raw_input.trim().to_string();
    if s.is_empty() {
        return None;
    }
    if s.starts_with('#') || s.starts_with('!') || s.starts_with("//") {
        return None;
    }
    if s.chars().any(|c| c.is_whitespace()) {
        return None;
    }

    if let Some(caps) = SCHEME_RE.captures(&s) {
        let scheme = caps[1].to_lowercase();
        if INTERNAL_SCHEMES.contains(&scheme.as_str()) {
            return None;
        }
        if s.contains("://") && scheme != "http:" && scheme != "https:" {
            return None;
        }
        if !s.contains("://") && !HOST_PORT_RE.is_match(&s) {
            return None;
        }
    }

    if s.to_lowercase().starts_with("https://") {
        s = s[8..].to_string();
    } else if s.to_lowercase().starts_with("http://") {
        s = s[7..].to_string();
    }

    let authority = match s.find(['/', '?', '#']) {
        Some(idx) => &s[..idx],
        None => s.as_str(),
    };
    let host_part_raw = match authority.rfind('@') {
        Some(idx) => &authority[idx + 1..],
        None => authority,
    };

    // Strip trailing :port
    let mut host_part = match host_part_raw.rsplit_once(':') {
        Some((h, p)) if !p.is_empty() && p.chars().all(|c| c.is_ascii_digit()) => h.to_string(),
        _ => host_part_raw.to_string(),
    };

    let mut has_wildcard = false;
    if let Some(stripped) = host_part.strip_prefix("*.") {
        has_wildcard = true;
        host_part = stripped.to_string();
    }

    host_part = host_part
        .trim_start_matches('.')
        .trim_end_matches('.')
        .to_lowercase();
    if host_part.is_empty() || host_part.contains('*') {
        return None;
    }
    if host_part.chars().all(|c| c.is_ascii_digit() || c == '.') && !is_valid_ipv4(&host_part) {
        return None;
    }

    let parsed = Url::parse(&format!("https://{}", host_part)).ok()?;
    let canonical_raw = parsed.host_str()?.trim_end_matches('.').to_lowercase();
    let canonical_host = strip_leading_www(&canonical_raw);
    if !is_valid_domain_host(&canonical_host) {
        return None;
    }

    if has_wildcard {
        if canonical_host == "localhost"
            || is_valid_ipv4(&canonical_host)
            || !canonical_host.contains('.')
        {
            return None;
        }
        return Some(format!("*.{}", canonical_host));
    }

    Some(canonical_host)
}

pub fn normalize_whitelist(items: &[String]) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut result = Vec::new();
    for raw in items {
        if let Some(normalized) = normalize_whitelist_entry(raw) {
            if seen.insert(normalized.clone()) {
                result.push(normalized);
            }
        }
    }
    result
}

pub fn find_dark_mode_exclusion_match(
    url_or_host: &str,
    exclusions: &[String],
) -> DarkModeExclusionMatch {
    let hostname = extract_hostname_from_url(url_or_host);
    let Some(ref host) = hostname else {
        return DarkModeExclusionMatch {
            excluded: false,
            matched_rule: None,
            match_type: None,
            hostname: None,
        };
    };

    if exclusions.is_empty() {
        return DarkModeExclusionMatch {
            excluded: false,
            matched_rule: None,
            match_type: None,
            hostname,
        };
    }

    let mut best_match: Option<DarkModeExclusionMatch> = None;
    let mut best_score: i64 = -1;

    for raw_rule in exclusions {
        let Some(rule) = normalize_whitelist_entry(raw_rule) else {
            continue;
        };
        let is_wildcard = rule.starts_with("*.");
        let base_domain = if is_wildcard { &rule[2..] } else { &rule };

        let (match_type, score) = if !is_wildcard && host == base_domain {
            (Some("exact"), 10_000 + base_domain.len() as i64)
        } else if is_wildcard
            && (host == base_domain || host.ends_with(&format!(".{}", base_domain)))
        {
            (Some("wildcard"), 5_000 + base_domain.len() as i64)
        } else if !is_wildcard && host.ends_with(&format!(".{}", base_domain)) {
            (Some("subdomain"), 1_000 + base_domain.len() as i64)
        } else {
            (None, -1)
        };

        if let Some(mtype) = match_type {
            if score > best_score {
                best_score = score;
                best_match = Some(DarkModeExclusionMatch {
                    excluded: true,
                    matched_rule: Some(rule),
                    match_type: Some(mtype.to_string()),
                    hostname: hostname.clone(),
                });
            }
        }
    }

    best_match.unwrap_or(DarkModeExclusionMatch {
        excluded: false,
        matched_rule: None,
        match_type: None,
        hostname,
    })
}

/// Checks if `url` is excluded from Force Dark Mode against `DEFAULT_DARK_EXCLUSIONS`
/// combined with `custom_patterns`.
pub fn is_dark_excluded(url: &str, custom_patterns: &[String]) -> bool {
    let mut combined: Vec<String> = DEFAULT_DARK_EXCLUSIONS
        .iter()
        .map(|s| (*s).to_string())
        .collect();
    combined.extend(custom_patterns.iter().cloned());
    find_dark_mode_exclusion_match(url, &combined).excluded
}

/// Pure exclusion check against an explicit list of patterns (without prepending defaults).
pub fn is_url_excluded_from_dark_mode(url_or_host: &str, exclusions: &[String]) -> bool {
    find_dark_mode_exclusion_match(url_or_host, exclusions).excluded
}

pub fn parse_css_color(input: &str) -> Option<RgbaColor> {
    let trimmed = input.trim().to_lowercase();
    if trimmed.is_empty() || trimmed == "transparent" || trimmed == "none" {
        return None;
    }

    if let Some(caps) = SRGB_RE.captures(&trimmed) {
        let a = if let Some(alpha_m) = caps.get(4) {
            let token = alpha_m.as_str();
            if let Some(pct) = token.strip_suffix('%') {
                pct.parse::<f64>().ok()? / 100.0
            } else {
                token.parse::<f64>().ok()?
            }
        } else {
            1.0
        };
        if !a.is_finite() || a < 0.25 {
            return None;
        }
        let r = (caps[1].parse::<f64>().ok()? * 255.0).clamp(0.0, 255.0);
        let g = (caps[2].parse::<f64>().ok()? * 255.0).clamp(0.0, 255.0);
        let b = (caps[3].parse::<f64>().ok()? * 255.0).clamp(0.0, 255.0);
        return Some(RgbaColor {
            r,
            g,
            b,
            a: a.clamp(0.0, 1.0),
        });
    }

    if trimmed.starts_with("rgb") {
        let nums: Vec<&str> = RGB_NUM_RE
            .find_iter(&trimmed)
            .map(|m| m.as_str())
            .collect();
        if nums.len() < 3 {
            return None;
        }
        let parse_channel = |token: &str| -> Option<f64> {
            if let Some(pct) = token.strip_suffix('%') {
                Some((pct.parse::<f64>().ok()? / 100.0) * 255.0)
            } else {
                token.parse::<f64>().ok()
            }
        };
        let a = if nums.len() >= 4 {
            let token = nums[3];
            if let Some(pct) = token.strip_suffix('%') {
                pct.parse::<f64>().ok()? / 100.0
            } else {
                token.parse::<f64>().ok()?
            }
        } else {
            1.0
        };
        if !a.is_finite() || a < 0.25 {
            return None;
        }
        let r = parse_channel(nums[0])?;
        let g = parse_channel(nums[1])?;
        let b = parse_channel(nums[2])?;
        if !r.is_finite() || !g.is_finite() || !b.is_finite() {
            return None;
        }
        return Some(RgbaColor {
            r: r.clamp(0.0, 255.0),
            g: g.clamp(0.0, 255.0),
            b: b.clamp(0.0, 255.0),
            a: a.clamp(0.0, 1.0),
        });
    }

    None
}

pub fn get_composited_luminance(color: &RgbaColor, backdrop: f64) -> f64 {
    let a = color.a;
    let r = color.r * a + backdrop * (1.0 - a);
    let g = color.g * a + backdrop * (1.0 - a);
    let b = color.b * a + backdrop * (1.0 - a);
    (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0
}

pub fn evaluate_native_dark_signals(signals: &NativeDarkSignals) -> bool {
    let meta_norm = signals.meta_color_scheme.trim().to_lowercase();
    let css_norm = signals.computed_color_scheme.trim().to_lowercase();

    if meta_norm == "dark"
        || meta_norm == "only dark"
        || css_norm == "dark"
        || css_norm == "only dark"
    {
        return true;
    }

    if signals.has_dark_attr_or_class {
        return true;
    }

    for layer in &signals.background_layers {
        let Some(ref bg) = layer.bg else { continue };
        let Some(parsed) = parse_css_color(bg) else {
            continue;
        };
        if layer.is_injected_html_bg
            && (parsed.r - 255.0).abs() < f64::EPSILON
            && (parsed.g - 255.0).abs() < f64::EPSILON
            && (parsed.b - 255.0).abs() < f64::EPSILON
            && parsed.a >= 0.99
        {
            continue;
        }
        let lum = get_composited_luminance(&parsed, 255.0);
        return lum < 0.38;
    }

    let declares_dark_support = meta_norm.split_whitespace().any(|w| w == "dark")
        || css_norm.split_whitespace().any(|w| w == "dark");
    if declares_dark_support && signals.prefers_dark_media {
        return true;
    }

    if !signals.body_text_color.is_empty() {
        if let Some(fg) = parse_css_color(&signals.body_text_color) {
            if get_composited_luminance(&fg, 0.0) > 0.72 {
                return true;
            }
        }
    }

    false
}

use once_cell::sync::Lazy;
use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use url::Url;

const EXPANDED_BANGS_JSON: &str = include_str!("bangs_data.json");

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SearchBang {
    pub id: String,
    pub name: String,
    pub prefix: String,
    pub bangs: Vec<String>,
    pub url: String,
    pub category: String,
    #[serde(default)]
    pub is_custom: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BangResolution {
    pub matched: bool,
    pub bang: SearchBang,
    pub query: String,
    pub target_url: String,
}

#[derive(Debug, Deserialize)]
struct RawExpandedBang {
    id: String,
    name: String,
    prefix: String,
    triggers: Vec<String>,
    url: String,
    category: String,
}

#[derive(Debug, Deserialize)]
struct RawCustomBang {
    id: Option<String>,
    name: Option<String>,
    prefix: Option<String>,
    url: Option<String>,
    category: Option<String>,
}

fn default_search_bangs() -> Vec<SearchBang> {
    let defs: &[(&str, &str, &str, &[&str], &str, &str)] = &[
        ("google", "Google", "g", &["!g", "!google", "@google", "@g"], "https://www.google.com/search?q={q}", "General"),
        ("duckduckgo", "DuckDuckGo", "ddg", &["!ddg", "!duckduckgo", "@duckduckgo", "@ddg"], "https://duckduckgo.com/?q={q}", "General"),
        ("bing", "Bing", "b", &["!b", "!bing", "@bing", "@b"], "https://www.bing.com/search?q={q}", "General"),
        ("brave", "Brave Search", "br", &["!br", "!brave", "@brave", "@br"], "https://search.brave.com/search?q={q}", "General"),
        ("ecosia", "Ecosia", "eco", &["!eco", "!ecosia", "@ecosia", "@eco"], "https://www.ecosia.org/search?q={q}", "General"),
        ("startpage", "Startpage", "sp", &["!sp", "!startpage", "@startpage", "@sp"], "https://www.startpage.com/sp/search?query={q}", "General"),
        ("kagi", "Kagi", "k", &["!k", "!kagi", "@kagi", "@k"], "https://kagi.com/search?q={q}", "General"),
        ("youtube", "YouTube", "yt", &["!yt", "!youtube", "@youtube", "@yt"], "https://www.youtube.com/results?search_query={q}", "Media"),
        ("github", "GitHub", "gh", &["!gh", "!github", "@github", "@gh"], "https://github.com/search?q={q}", "Development"),
        ("wikipedia", "Wikipedia", "w", &["!w", "!wiki", "!wikipedia", "@wiki", "@wikipedia"], "https://en.wikipedia.org/wiki/Special:Search?search={q}", "Reference"),
        ("reddit", "Reddit", "r", &["!r", "!reddit", "@reddit", "@r"], "https://www.reddit.com/search/?q={q}", "Social"),
        ("stackoverflow", "Stack Overflow", "so", &["!so", "!stackoverflow", "@stackoverflow", "@so"], "https://stackoverflow.com/search?q={q}", "Development"),
        ("amazon", "Amazon", "a", &["!a", "!amazon", "@amazon"], "https://www.amazon.com/s?k={q}", "Shopping"),
        ("x", "X (Twitter)", "x", &["!x", "!twitter", "@x", "@twitter"], "https://x.com/search?q={q}", "Social"),
        ("maps", "Google Maps", "maps", &["!maps", "!map", "@maps", "@map"], "https://www.google.com/maps/search/{q}", "Reference"),
        ("npm", "NPM Packages", "npm", &["!npm", "@npm"], "https://www.npmjs.com/search?q={q}", "Development"),
        ("mdn", "MDN Web Docs", "mdn", &["!mdn", "@mdn"], "https://developer.mozilla.org/en-US/search?q={q}", "Development"),
        ("gemini", "Google Gemini", "gemini", &["!gemini", "!gem", "@gemini", "@gem", "!ai"], "https://gemini.google.com/app?q={q}", "AI"),
        ("chatgpt", "ChatGPT", "chatgpt", &["!chatgpt", "!gpt", "@chatgpt", "@gpt"], "https://chatgpt.com/?q={q}", "AI"),
        ("perplexity", "Perplexity AI", "p", &["!p", "!px", "!perplexity", "@perplexity", "@p", "@px"], "https://www.perplexity.ai/search?q={q}", "AI"),
    ];

    defs.iter()
        .map(|(id, name, prefix, bangs, url, category)| SearchBang {
            id: (*id).to_string(),
            name: (*name).to_string(),
            prefix: (*prefix).to_string(),
            bangs: bangs.iter().map(|s| (*s).to_string()).collect(),
            url: (*url).to_string(),
            category: (*category).to_string(),
            is_custom: false,
        })
        .collect()
}

fn expand_triggers(triggers: &[String], prefix: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut seen = HashSet::new();
    let stems = std::iter::once(prefix).chain(triggers.iter().map(|s| s.as_str()));
    for raw in stems {
        let stem = raw.trim().to_lowercase();
        let stem = stem.trim_start_matches(['!', '@']);
        if stem.is_empty() {
            continue;
        }
        for t in [format!("!{stem}"), format!("@{stem}")] {
            if seen.insert(t.clone()) {
                out.push(t);
            }
        }
    }
    out
}

static BUILTIN_BANGS: Lazy<Vec<SearchBang>> = Lazy::new(|| {
    let mut merged = default_search_bangs();
    let mut seen_ids: HashSet<String> = merged.iter().map(|b| b.id.to_lowercase()).collect();
    let mut seen_triggers: HashSet<String> = merged
        .iter()
        .flat_map(|b| b.bangs.iter().map(|t| t.to_lowercase()))
        .collect();

    let expanded: Vec<RawExpandedBang> =
        serde_json::from_str(EXPANDED_BANGS_JSON).unwrap_or_default();

    for item in expanded {
        let clean_id = item.id.trim().to_lowercase();
        let clean_prefix = item
            .prefix
            .trim()
            .to_lowercase()
            .trim_start_matches(['!', '@'])
            .to_string();
        if clean_id.is_empty()
            || clean_prefix.is_empty()
            || item.url.is_empty()
            || seen_ids.contains(&clean_id)
        {
            continue;
        }

        let candidates = expand_triggers(&item.triggers, &clean_prefix);
        let unique: Vec<String> = candidates
            .into_iter()
            .filter(|t| !seen_triggers.contains(t))
            .collect();
        if unique.is_empty() {
            continue;
        }

        seen_ids.insert(clean_id.clone());
        for t in &unique {
            seen_triggers.insert(t.clone());
        }

        merged.push(SearchBang {
            id: clean_id,
            name: item.name,
            prefix: clean_prefix,
            bangs: unique,
            url: item.url,
            category: if item.category.is_empty() {
                "General".to_string()
            } else {
                item.category
            },
            is_custom: false,
        });
    }

    merged
});

static BUILTIN_INDEX: Lazy<HashMap<String, usize>> = Lazy::new(|| {
    let mut index = HashMap::new();
    for (idx, bang) in BUILTIN_BANGS.iter().enumerate() {
        for trigger in &bang.bangs {
            index.entry(trigger.to_lowercase()).or_insert(idx);
        }
        let bare_prefix = bang.prefix.to_lowercase();
        if !bare_prefix.is_empty() {
            index.entry(bare_prefix).or_insert(idx);
        }
        let bare_id = bang.id.to_lowercase();
        if !bare_id.is_empty() {
            index.entry(bare_id).or_insert(idx);
        }
    }
    index
});

fn parse_custom_bangs(custom_bangs_json: Option<&str>) -> Vec<SearchBang> {
    let Some(raw_json) = custom_bangs_json else {
        return Vec::new();
    };
    let trimmed = raw_json.trim();
    if trimmed.is_empty() {
        return Vec::new();
    }
    let Ok(items) = serde_json::from_str::<Vec<RawCustomBang>>(trimmed) else {
        return Vec::new();
    };
    items
        .into_iter()
        .filter_map(|c| {
            let prefix = c
                .prefix
                .as_deref()
                .unwrap_or("")
                .trim()
                .trim_start_matches(['!', '@'])
                .to_lowercase();
            let url = c.url?.trim().to_string();
            if prefix.is_empty() || url.is_empty() {
                return None;
            }
            Some(SearchBang {
                id: c.id.unwrap_or_else(|| format!("custom_{prefix}")),
                name: c.name.unwrap_or_else(|| prefix.clone()),
                prefix: prefix.clone(),
                bangs: vec![format!("!{prefix}"), format!("@{prefix}")],
                url,
                category: c.category.unwrap_or_else(|| "Custom".to_string()),
                is_custom: true,
            })
        })
        .collect()
}

pub fn builtin_bang_count() -> usize {
    BUILTIN_BANGS.len()
}

fn find_bang_by_trigger(trigger: &str, custom: &[SearchBang]) -> Option<SearchBang> {
    let clean = trigger.trim().to_lowercase();
    if !clean.starts_with('!') && !clean.starts_with('@') {
        return None;
    }

    for cb in custom {
        if cb.bangs.iter().any(|t| t.to_lowercase() == clean) {
            return Some(cb.clone());
        }
    }

    BUILTIN_INDEX
        .get(&clean)
        .and_then(|&idx| BUILTIN_BANGS.get(idx))
        .cloned()
}

fn build_bang_search_url(bang: &SearchBang, query: &str) -> String {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        let stripped = bang.url.replace("{q}", "");
        if let Ok(u) = Url::parse(&stripped) {
            if let Some(host) = u.host_str() {
                return format!("{}://{}", u.scheme(), host);
            }
        }
        return stripped;
    }
    let encoded = utf8_percent_encode(trimmed, NON_ALPHANUMERIC).to_string();
    if bang.url.contains("{q}") {
        bang.url.replace("{q}", &encoded)
    } else {
        format!("{}{}", bang.url, encoded)
    }
}

fn is_valid_bang_token(token: &str) -> bool {
    let Some(rest) = token.strip_prefix(['!', '@']) else {
        return false;
    };
    !rest.is_empty()
        && rest
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

/// Resolves a leading or trailing bang query (`"!yt lofi beats"` or `"lofi beats !yt"`).
pub fn resolve_bang(input: &str, custom_bangs_json: Option<&str>) -> Option<BangResolution> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return None;
    }
    let custom = parse_custom_bangs(custom_bangs_json);

    // 1. Leading bang
    let (first, rest) = match trimmed.split_once(char::is_whitespace) {
        Some((f, r)) => (f, r.trim()),
        None => (trimmed, ""),
    };
    if is_valid_bang_token(first) {
        if let Some(bang) = find_bang_by_trigger(first, &custom) {
            let target_url = build_bang_search_url(&bang, rest);
            return Some(BangResolution {
                matched: true,
                bang,
                query: rest.to_string(),
                target_url,
            });
        }
    }

    // 2. Trailing bang
    if let Some((before, last)) = trimmed.rsplit_once(char::is_whitespace) {
        if is_valid_bang_token(last) {
            if let Some(bang) = find_bang_by_trigger(last, &custom) {
                let q = before.trim();
                let target_url = build_bang_search_url(&bang, q);
                return Some(BangResolution {
                    matched: true,
                    bang,
                    query: q.to_string(),
                    target_url,
                });
            }
        }
    }

    None
}

/// Suggests matching bangs for an autocomplete prefix like `"!y"` or `"@git"`.
pub fn suggest_bangs(
    prefix: &str,
    limit: usize,
    custom_bangs_json: Option<&str>,
) -> Vec<SearchBang> {
    let trimmed = prefix.trim();
    if !trimmed.starts_with('!') && !trimmed.starts_with('@') {
        return Vec::new();
    }
    let stem = &trimmed[1..];
    if !stem
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        return Vec::new();
    }

    let lower_prefix = trimmed.to_lowercase();
    let query_stem = stem.to_lowercase();
    let custom = parse_custom_bangs(custom_bangs_json);
    let cap = if limit == 0 { 10 } else { limit };

    let all: Vec<&SearchBang> = custom.iter().chain(BUILTIN_BANGS.iter()).collect();
    if query_stem.is_empty() {
        return all.into_iter().take(cap).cloned().collect();
    }

    let mut tier1 = Vec::new();
    let mut tier2 = Vec::new();
    let mut tier3 = Vec::new();
    let mut tier4 = Vec::new();

    for b in all {
        let lower_name = b.name.to_lowercase();
        let lower_b_prefix = b.prefix.to_lowercase();
        let lower_category = b.category.to_lowercase();

        if lower_b_prefix == query_stem || b.bangs.iter().any(|c| c.to_lowercase() == lower_prefix)
        {
            tier1.push(b.clone());
            continue;
        }
        if lower_b_prefix.starts_with(&query_stem)
            || b.bangs
                .iter()
                .any(|c| c.to_lowercase().starts_with(&lower_prefix))
        {
            tier2.push(b.clone());
            continue;
        }
        if lower_name.starts_with(&query_stem) {
            tier3.push(b.clone());
            continue;
        }
        if lower_name.contains(&query_stem)
            || lower_b_prefix.contains(&query_stem)
            || lower_category.contains(&query_stem)
            || b.bangs.iter().any(|c| c.to_lowercase().contains(&query_stem))
        {
            tier4.push(b.clone());
        }
    }

    tier1
        .into_iter()
        .chain(tier2)
        .chain(tier3)
        .chain(tier4)
        .take(cap)
        .collect()
}

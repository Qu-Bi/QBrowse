use dashmap::{DashMap, DashSet};
use once_cell::sync::Lazy;
use regex::Regex;
use serde::Deserialize;
use std::sync::Arc;
use std::time::{Duration, Instant};

pub const CNAME_TTL: Duration = Duration::from_secs(10 * 60);
pub const CNAME_MAX_ENTRIES: usize = 2000;
pub const CNAME_TIMEOUT: Duration = Duration::from_millis(300);

static IPV4_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^\d{1,3}(?:\.\d{1,3}){3}$").expect("valid regex"));

#[derive(Debug, Clone)]
struct CnameEntry {
    cnames: Vec<String>,
    expires_at: Instant,
}

#[derive(Debug, Deserialize)]
struct DohResponse {
    #[serde(default, rename = "Answer")]
    answer: Vec<DohAnswer>,
}

#[derive(Debug, Deserialize)]
struct DohAnswer {
    #[serde(rename = "type")]
    record_type: u16,
    data: String,
}

pub fn should_resolve_cname_host(host: &str) -> bool {
    let clean = host.trim().to_lowercase();
    let clean = clean.trim_end_matches('.');
    if clean.is_empty() {
        return false;
    }
    if clean == "localhost"
        || clean.ends_with(".localhost")
        || clean.ends_with(".local")
        || clean.ends_with(".onion")
        || clean.ends_with(".internal")
    {
        return false;
    }
    if clean.contains(':') || clean.starts_with('[') || IPV4_RE.is_match(clean) {
        return false;
    }
    let labels: Vec<&str> = clean.split('.').filter(|s| !s.is_empty()).collect();
    labels.len() >= 3
}

#[derive(Clone)]
pub struct CnameCache {
    entries: Arc<DashMap<String, CnameEntry>>,
    in_flight: Arc<DashSet<String>>,
    http: reqwest::Client,
    ttl: Duration,
    max_entries: usize,
}

impl Default for CnameCache {
    fn default() -> Self {
        Self::new()
    }
}

impl CnameCache {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .timeout(CNAME_TIMEOUT)
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());
        Self {
            entries: Arc::new(DashMap::new()),
            in_flight: Arc::new(DashSet::new()),
            http,
            ttl: CNAME_TTL,
            max_entries: CNAME_MAX_ENTRIES,
        }
    }

    pub fn get_cached(&self, host: &str) -> Option<Vec<String>> {
        let key = host.trim().to_lowercase();
        if key.is_empty() {
            return None;
        }
        if let Some(entry) = self.entries.get(&key) {
            if Instant::now() < entry.expires_at {
                return Some(entry.cnames.clone());
            }
        }
        self.entries.remove(&key);
        None
    }

    pub fn set_cached(&self, host: &str, cnames: Vec<String>) {
        let key = host.trim().to_lowercase();
        if key.is_empty() {
            return;
        }
        if !self.entries.contains_key(&key) && self.entries.len() >= self.max_entries {
            if let Some(first_key) = self.entries.iter().next().map(|r| r.key().clone()) {
                self.entries.remove(&first_key);
            }
        }
        let normalized: Vec<String> = cnames
            .into_iter()
            .map(|c| c.trim().to_lowercase().trim_end_matches('.').to_string())
            .filter(|c| !c.is_empty())
            .collect();
        self.entries.insert(
            key,
            CnameEntry {
                cnames: normalized,
                expires_at: Instant::now() + self.ttl,
            },
        );
    }

    pub fn clear(&self) {
        self.entries.clear();
        self.in_flight.clear();
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Asynchronously resolves CNAME records for `host` via DNS-over-HTTPS (`cloudflare-dns.com`)
    /// and stores the result in the TTL cache.
    pub async fn resolve_cname_async(&self, host: &str) -> Vec<String> {
        let clean = host.trim().to_lowercase().trim_end_matches('.').to_string();
        if !should_resolve_cname_host(&clean) {
            return Vec::new();
        }
        if let Some(cached) = self.get_cached(&clean) {
            return cached;
        }
        if !self.in_flight.insert(clean.clone()) {
            return Vec::new();
        }

        let result = self.fetch_doh_cname(&clean).await;
        self.set_cached(&clean, result.clone());
        self.in_flight.remove(&clean);
        result
    }

    /// Spawns a non-blocking background CNAME lookup if `tokio::runtime::Handle::try_current()` is available.
    pub fn trigger_background_resolve(&self, host: &str) {
        let clean = host.trim().to_lowercase().trim_end_matches('.').to_string();
        if !should_resolve_cname_host(&clean) {
            return;
        }
        if self.get_cached(&clean).is_some() || self.in_flight.contains(&clean) {
            return;
        }
        if let Ok(handle) = tokio::runtime::Handle::try_current() {
            let cache = self.clone();
            handle.spawn(async move {
                let _ = cache.resolve_cname_async(&clean).await;
            });
        }
    }

    async fn fetch_doh_cname(&self, host: &str) -> Vec<String> {
        let Ok(resp) = self
            .http
            .get("https://1.1.1.1/dns-query")
            .query(&[("name", host), ("type", "CNAME")])
            .header("Accept", "application/dns-json")
            .send()
            .await
        else {
            return Vec::new();
        };

        let Ok(parsed) = resp.json::<DohResponse>().await else {
            return Vec::new();
        };

        parsed
            .answer
            .into_iter()
            .filter(|a| a.record_type == 5)
            .map(|a| a.data.trim().to_lowercase().trim_end_matches('.').to_string())
            .filter(|c| !c.is_empty())
            .collect()
    }
}

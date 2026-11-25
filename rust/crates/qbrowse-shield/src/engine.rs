use crate::cname::{should_resolve_cname_host, CnameCache};
use crate::dark_mode::is_dark_excluded;
use crate::headers::{
    evaluate_request_headers_inner, evaluate_response_headers_inner, extract_hostname,
    get_base_domain,
};
use crate::https::check_https_upgrade;
use adblock::lists::{FilterSet, ParseOptions};
use adblock::request::Request;
use adblock::Engine as AdblockEngine;
use dashmap::DashMap;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::task::JoinSet;

pub const BASELINE_FILTERS: &str = r#"
! QBrowse High-Priority Baseline Rules
||googleadservices.com^
||googlesyndication.com^
||doubleclick.net^
||adnxs.com^
||criteo.com^
||criteo.net^
||taboola.com^
||outbrain.com^
||rubiconproject.com^
||pubmatic.com^
||openx.net^
||scorecardresearch.com^
||amazon-adsystem.com^
||adroll.com^
||applovin.com^
||chartbeat.com^
||quantserve.com^
||moatads.com^
||popads.net^
||popcash.net^
||propellerads.com^
||coinhive.com^
||crypto-loot.com^
||minero.cc^
||cdn.cookielaw.org^
||consent.cookiebot.com^
||consent.trustarc.com^
||quantcast.mgr.consensu.org^
||fundingchoicesmessages.google.com^
||cmp.osano.com^
||static.hotjar.com^
||script.hotjar.com^
||edge.fullstory.com^
||rs.fullstory.com^
||clarity.ms^
||cdn.mouseflow.com^
||api-js.mixpanel.com^
||cdn.heapanalytics.com^
||connect.facebook.net$third-party
||facebook.com/tr$third-party
||static.ads-twitter.com$third-party
||analytics.tiktok.com$third-party
||snap.licdn.com$third-party
||gemius.pl^
||adocean.pl^
||adform.net^
||smartadserver.com^
||adkontekst.pl^
||netsprint.pl^
||teads.tv^
||dot.wp.pl^
||adv.wp.pl^
||dynacrems.wp.pl^
||wpimg.pl/b/^
||wpimg.pl/advert/^
||wpimg.pl/b-^
||wpimg.pl/rek/^
||wpimg.pl/banner^
||wpimg.pl/welcome^
||wpimg.pl/screening^
||wp.pl/reklama^
||wp.pl/*/reklama^
||rek.wp.pl^
||reklama.wp.pl^
||2mdn.net^
||innovid.com^
##.ad-banner
##.advertisement
##[id*="google_ads"]
##[class*="google_ads"]
##.taboola
##.outbrain
##[data-ad-unit]
##[data-ad-slot]
##.ad-container
##.ad-placeholder
##[class*="reklama"]
##[id*="reklama"]
##[class*="Billboard"]
##[id*="Billboard"]
##[class*="AdSlot"]
##[class*="ad-slot"]
##[id^="gpt-ad"]
##[class*="gpt-ad"]
youtube.com##ytd-ad-slot-renderer
youtube.com##ytd-in-feed-ad-layout-renderer
youtube.com##ytd-banner-promo-renderer
youtube.com##ytd-statement-banner-renderer
youtube.com##ytd-display-ad-renderer
youtube.com##ytd-promoted-sparkles-web-renderer
youtube.com##ytd-compact-promoted-video-renderer
youtube.com##ytd-video-masthead-ad-v3-renderer
youtube.com###masthead-ad
youtube.com##ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]
youtube.com##ytd-merch-shelf-renderer
wp.pl##.wp-header-panel
wp.pl##[class*="wp-header-panel"]
wp.pl##[class*="screeningWallpaper"]
wp.pl##[class*="bmjdxfegh"]
wp.pl##[class*="welcome-screen"]
wp.pl##[id*="welcome-screen"]
wp.pl##[class*="interstitial"]
wp.pl##[id*="interstitial"]
wp.pl##div[data-st-area="reklama"]
wp.pl##[class*="ad-overlay"]
"#;

const YOUTUBE_PASS_THROUGH_DOMAINS: &[&str] = &[
    "youtube.com",
    "youtu.be",
    "googlevideo.com",
    "ytimg.com",
    "youtube-nocookie.com",
    "yt3.ggpht.com",
];

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TabContext {
    pub top_url: String,
    pub top_host: String,
    pub top_etld1: String,
    pub space_id: Option<String>,
    pub paused: bool,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlockDecision {
    pub blocked: bool,
    pub redirect: Option<String>,
    pub exception: Option<String>,
    pub cname_cloaked: bool,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CosmeticResources {
    pub hide_selectors: Vec<String>,
    pub injected_script: String,
    pub exceptions: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilterUpdateResult {
    pub success: bool,
    pub lists_fetched: usize,
    pub bytes_total: usize,
    pub error: Option<String>,
}

pub fn map_resource_type(electron_type: &str) -> &'static str {
    match electron_type {
        "mainFrame" | "main_frame" | "document" => "main_frame",
        "subFrame" | "sub_frame" | "subdocument" => "sub_frame",
        "stylesheet" => "stylesheet",
        "script" => "script",
        "image" => "image",
        "font" => "font",
        "object" => "object",
        "xhr" | "xmlhttprequest" => "xmlhttprequest",
        "ping" => "ping",
        "media" => "media",
        "webSocket" | "websocket" => "websocket",
        _ => "other",
    }
}

fn is_subdomain_or_exact(host: &str, domain: &str) -> bool {
    host == domain || host.ends_with(&format!(".{}", domain))
}

pub fn is_youtube_domain(hostname: &str) -> bool {
    let clean = hostname.to_lowercase();
    let clean = clean.strip_prefix("www.").unwrap_or(&clean);
    if clean.is_empty() {
        return false;
    }
    YOUTUBE_PASS_THROUGH_DOMAINS
        .iter()
        .any(|d| is_subdomain_or_exact(clean, d))
}

fn clean_domain_entry(raw: &str) -> String {
    raw.trim()
        .to_lowercase()
        .trim_start_matches("https://")
        .trim_start_matches("http://")
        .split('/')
        .next()
        .unwrap_or("")
        .trim_start_matches("www.")
        .trim_end_matches('.')
        .to_string()
}

fn is_host_in_set(host: &str, domain_set: &HashSet<String>) -> bool {
    if host.is_empty() || domain_set.is_empty() {
        return false;
    }
    let mut check = host.trim_start_matches("www.");
    while !check.is_empty() {
        if domain_set.contains(check) {
            return true;
        }
        match check.find('.') {
            Some(dot) => check = &check[dot + 1..],
            None => break,
        }
    }
    false
}

fn is_essential_auth_or_security_bypass(url_lower: &str, ref_lower: &str) -> bool {
    let is_gmail = url_lower.contains("mail.google.com")
        || url_lower.contains("googleusercontent.com")
        || url_lower.contains("gmail.com")
        || ref_lower.contains("mail.google.com");

    is_gmail
        || url_lower.contains("accounts.google.com")
        || url_lower.contains("accounts.youtube.com")
        || url_lower.contains("ssl.gstatic.com/accounts")
        || url_lower.contains("firebaseapp.com")
        || url_lower.contains("identitytoolkit.googleapis.com")
        || url_lower.contains("securetoken.googleapis.com")
        || url_lower.contains("appleid.apple.com")
        || url_lower.contains("/oauth")
        || url_lower.contains("/auth")
        || url_lower.contains("/login")
        || url_lower.contains("/signin")
        || url_lower.contains("/webauthn")
        || url_lower.contains("/passkey")
        || url_lower.contains("challenges.cloudflare.com")
        || url_lower.contains("/cdn-cgi/challenge-platform")
        || url_lower.contains("hcaptcha.com")
        || url_lower.contains("recaptcha")
}

pub struct ShieldEngine {
    engine: Arc<RwLock<AdblockEngine>>,
    custom_engine: Arc<RwLock<Option<AdblockEngine>>>,
    pub tab_contexts: DashMap<u32, TabContext>,
    pub cname_cache: CnameCache,
    paused_domains: RwLock<HashSet<String>>,
    custom_rules: RwLock<Vec<String>>,
    http_exceptions: RwLock<Vec<String>>,
    dark_mode_exclusions: RwLock<Vec<String>>,
    active: AtomicBool,
    cname_uncloaking_enabled: AtomicBool,
    offline_mode: AtomicBool,
    cosmetic_enabled: AtomicBool,
    cname_uncloaked_count: AtomicUsize,
}

impl Default for ShieldEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl ShieldEngine {
    pub fn new() -> Self {
        let mut filter_set = FilterSet::new(false);
        filter_set.add_filter_list(BASELINE_FILTERS.to_string(), ParseOptions::default());
        let engine = AdblockEngine::new_with_filter_set(filter_set);

        Self {
            engine: Arc::new(RwLock::new(engine)),
            custom_engine: Arc::new(RwLock::new(None)),
            tab_contexts: DashMap::new(),
            cname_cache: CnameCache::new(),
            paused_domains: RwLock::new(HashSet::new()),
            custom_rules: RwLock::new(Vec::new()),
            http_exceptions: RwLock::new(Vec::new()),
            dark_mode_exclusions: RwLock::new(Vec::new()),
            active: AtomicBool::new(true),
            cname_uncloaking_enabled: AtomicBool::new(true),
            offline_mode: AtomicBool::new(false),
            cosmetic_enabled: AtomicBool::new(true),
            cname_uncloaked_count: AtomicUsize::new(0),
        }
    }

    pub fn set_active(&self, active: bool) {
        self.active.store(active, Ordering::Relaxed);
    }

    pub fn is_active(&self) -> bool {
        self.active.load(Ordering::Relaxed)
    }

    pub fn set_cname_uncloaking(&self, enabled: bool) {
        self.cname_uncloaking_enabled.store(enabled, Ordering::Relaxed);
    }

    pub fn set_offline_mode(&self, offline: bool) {
        self.offline_mode.store(offline, Ordering::Relaxed);
    }

    pub fn set_cosmetic_enabled(&self, enabled: bool) {
        self.cosmetic_enabled.store(enabled, Ordering::Relaxed);
    }

    pub fn cname_uncloaked_count(&self) -> usize {
        self.cname_uncloaked_count.load(Ordering::Relaxed)
    }

    pub fn set_tab_context(&self, web_contents_id: u32, top_url: &str, space_id: Option<String>, paused: bool) {
        let top_host = extract_hostname(top_url);
        let top_etld1 = get_base_domain(&top_host);
        self.tab_contexts.insert(
            web_contents_id,
            TabContext {
                top_url: top_url.to_string(),
                top_host,
                top_etld1,
                space_id,
                paused,
            },
        );
    }

    pub fn remove_tab_context(&self, web_contents_id: u32) {
        self.tab_contexts.remove(&web_contents_id);
    }

    pub fn set_paused_domains(&self, domains: Vec<String>) {
        let set: HashSet<String> = domains
            .into_iter()
            .map(|d| clean_domain_entry(&d))
            .filter(|d| !d.is_empty())
            .collect();
        *self.paused_domains.write() = set;
    }

    pub fn set_custom_rules(&self, rules: Vec<String>) {
        let mut filter_lines = Vec::new();
        for r in &rules {
            let trimmed = r.trim();
            if trimmed.is_empty() {
                continue;
            }
            if trimmed.contains("||") || trimmed.starts_with("@@") || trimmed.contains("##") {
                filter_lines.push(trimmed.to_string());
            } else {
                let clean = clean_domain_entry(trimmed);
                if !clean.is_empty() {
                    filter_lines.push(format!("||{}^", clean));
                }
            }
        }
        *self.custom_rules.write() = rules;

        if filter_lines.is_empty() {
            *self.custom_engine.write() = None;
            return;
        }
        let mut fs = FilterSet::new(false);
        fs.add_filter_list(filter_lines.join("\n"), ParseOptions::default());
        *self.custom_engine.write() = Some(AdblockEngine::new_with_filter_set(fs));
    }

    pub fn set_http_exceptions(&self, exceptions: Vec<String>) {
        *self.http_exceptions.write() = exceptions;
    }

    pub fn set_dark_mode_exclusions(&self, exclusions: Vec<String>) {
        *self.dark_mode_exclusions.write() = exclusions;
    }

    pub fn is_dark_excluded(&self, url: &str, custom_patterns: &[String]) -> bool {
        if custom_patterns.is_empty() {
            let stored = self.dark_mode_exclusions.read();
            is_dark_excluded(url, &stored)
        } else {
            is_dark_excluded(url, custom_patterns)
        }
    }

    pub fn check_https_upgrade(&self, url: &str, https_only_enabled: bool, http_exceptions: &[String]) -> Option<String> {
        if http_exceptions.is_empty() {
            let stored = self.http_exceptions.read();
            check_https_upgrade(url, https_only_enabled, &stored)
        } else {
            check_https_upgrade(url, https_only_enabled, http_exceptions)
        }
    }

    /// Serializes the compiled main adblock engine to bytes.
    pub fn serialize(&self) -> Vec<u8> {
        self.engine.read().serialize()
    }

    /// Deserializes a previously serialized engine snapshot into memory.
    pub fn deserialize(&self, bytes: &[u8]) -> anyhow::Result<()> {
        let mut new_engine = AdblockEngine::default();
        new_engine
            .deserialize(bytes)
            .map_err(|e| anyhow::anyhow!("Failed to deserialize adblock engine: {:?}", e))?;
        *self.engine.write() = new_engine;
        Ok(())
    }

    /// Atomically saves the compiled engine binary cache (e.g. `engine-v4.bin`) using a temporary file + rename.
    pub fn save_cache_atomic(&self, cache_path: &Path) -> anyhow::Result<usize> {
        let bytes = self.serialize();
        if let Some(parent) = cache_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let tmp_path = cache_path.with_extension("bin.tmp");
        std::fs::write(&tmp_path, &bytes)?;
        std::fs::rename(&tmp_path, cache_path)?;
        Ok(bytes.len())
    }

    /// Loads the compiled engine binary cache from disk.
    pub fn load_cache(&self, cache_path: &Path) -> anyhow::Result<()> {
        let bytes = std::fs::read(cache_path)?;
        if bytes.len() <= 1024 {
            anyhow::bail!("Cache file too small ({} bytes)", bytes.len());
        }
        self.deserialize(&bytes)
    }

    /// Fetches all filter list URLs in parallel, compiles them with `BASELINE_FILTERS`,
    /// and atomically swaps the active engine.
    pub async fn update_filter_lists(&self, urls: &[String]) -> FilterUpdateResult {
        if self.offline_mode.load(Ordering::Relaxed) {
            return FilterUpdateResult {
                success: false,
                lists_fetched: 0,
                bytes_total: 0,
                error: Some("Offline mode is enabled".to_string()),
            };
        }

        let client = match reqwest::Client::builder()
            .user_agent("QBrowse-Adblock/1.4")
            .timeout(Duration::from_secs(25))
            .build()
        {
            Ok(c) => c,
            Err(e) => {
                return FilterUpdateResult {
                    success: false,
                    lists_fetched: 0,
                    bytes_total: 0,
                    error: Some(e.to_string()),
                };
            }
        };

        let mut join_set = JoinSet::new();
        for url in urls {
            let c = client.clone();
            let u = url.clone();
            join_set.spawn(async move {
                let resp = c.get(&u).send().await.ok()?;
                if !resp.status().is_success() {
                    return None;
                }
                let text = resp.text().await.ok()?;
                if text.len() > 500 {
                    Some(text)
                } else {
                    None
                }
            });
        }

        let mut list_texts = Vec::new();
        let mut bytes_total = 0usize;
        while let Some(res) = join_set.join_next().await {
            if let Ok(Some(text)) = res {
                bytes_total += text.len();
                list_texts.push(text);
            }
        }

        if list_texts.is_empty() {
            return FilterUpdateResult {
                success: false,
                lists_fetched: 0,
                bytes_total: 0,
                error: Some("All filter list fetches failed".to_string()),
            };
        }

        let mut filter_set = FilterSet::new(false);
        filter_set.add_filter_list(BASELINE_FILTERS.to_string(), ParseOptions::default());
        for text in &list_texts {
            filter_set.add_filter_list(text.clone(), ParseOptions::default());
        }
        let compiled = AdblockEngine::new_with_filter_set(filter_set);
        *self.engine.write() = compiled;

        FilterUpdateResult {
            success: true,
            lists_fetched: list_texts.len(),
            bytes_total,
            error: None,
        }
    }

    pub async fn resolve_cname_async(&self, host: &str) -> Vec<String> {
        self.cname_cache.resolve_cname_async(host).await
    }

    pub fn check_request(
        &self,
        web_contents_id: u32,
        url: &str,
        source_url_opt: Option<&str>,
        resource_type: &str,
    ) -> BlockDecision {
        if !self.is_active() || url.is_empty() {
            return BlockDecision::default();
        }

        let tab_ctx = self.tab_contexts.get(&web_contents_id).map(|r| r.clone());
        if let Some(ref ctx) = tab_ctx {
            if ctx.paused {
                return BlockDecision::default();
            }
        }

        let u = url.to_lowercase();
        let req_host = extract_hostname(url);
        let source_url = source_url_opt
            .filter(|s| !s.is_empty())
            .or_else(|| tab_ctx.as_ref().map(|c| c.top_url.as_str()))
            .unwrap_or("");
        let ref_host = extract_hostname(source_url);
        let tab_host = tab_ctx.as_ref().map(|c| c.top_host.as_str()).unwrap_or("");

        // 1. Paused / Allowlisted domains check
        {
            let paused = self.paused_domains.read();
            if is_host_in_set(&req_host, &paused)
                || is_host_in_set(&ref_host, &paused)
                || is_host_in_set(tab_host, &paused)
            {
                return BlockDecision::default();
            }
        }

        // 2. YouTube pass-through (prevents #movie_player ad state machine stalls)
        if is_youtube_domain(&req_host) || is_youtube_domain(&ref_host) || is_youtube_domain(tab_host) {
            return BlockDecision::default();
        }

        // 3. Media stream bypass
        if u.contains("googlevideo.com/videoplayback")
            || u.contains("manifest.googlevideo.com")
            || u.contains(".ttvnw.net/v1/")
        {
            return BlockDecision::default();
        }

        // 4. Essential Auth / OAuth / SSO / Passkey / Captcha bypass
        let ref_lower = source_url.to_lowercase();
        if is_essential_auth_or_security_bypass(&u, &ref_lower) {
            return BlockDecision::default();
        }

        // 5. wp.pl essential UI bundles vs header-bidding / ad telemetry
        if req_host.ends_with("wp.pl")
            && (u.contains("dwiubwlu") || u.contains("z29mzxi") || u.contains("d3bqc2xpyjy"))
        {
            return BlockDecision::default();
        }
        if (req_host.ends_with("wp.pl")
            && (u.contains("d3aucgwu")
                || u.contains("nmvlytaz")
                || u.contains("pwa_adbd")
                || u.contains("pvid=")))
            || (req_host.ends_with("wpimg.pl")
                && (u.contains("/b/")
                    || u.contains("/advert/")
                    || u.contains("/b-")
                    || u.contains("/rek/")
                    || u.contains("/banner")))
        {
            return BlockDecision {
                blocked: true,
                redirect: None,
                exception: None,
                cname_cloaked: false,
            };
        }

        let mapped_type = map_resource_type(resource_type);
        let effective_source = if source_url.is_empty() { url } else { source_url };

        // 6. Custom rules engine
        if let Some(ref custom) = *self.custom_engine.read() {
            if let Ok(req) = Request::new(url, effective_source, mapped_type, "get") {
                let res = custom.check_network_request(&req);
                if res.filter.is_some() {
                    return BlockDecision {
                        blocked: true,
                        redirect: res.redirect,
                        exception: res.exception.map(|e| format!("{:?}", e)),
                        cname_cloaked: false,
                    };
                }
            }
        }

        // 7. Main adblock-rs DFA engine
        if let Ok(req) = Request::new(url, effective_source, mapped_type, "get") {
            let res = self.engine.read().check_network_request(&req);
            if res.filter.is_some() {
                return BlockDecision {
                    blocked: true,
                    redirect: res.redirect,
                    exception: res.exception.map(|e| format!("{:?}", e)),
                    cname_cloaked: false,
                };
            }
            if res.exception.is_some() {
                return BlockDecision {
                    blocked: false,
                    redirect: res.redirect,
                    exception: res.exception.map(|e| format!("{:?}", e)),
                    cname_cloaked: false,
                };
            }
        }

        // 8. Non-blocking CNAME uncloaking cache check + background resolution on miss
        if self.cname_uncloaking_enabled.load(Ordering::Relaxed)
            && should_resolve_cname_host(&req_host)
        {
            if let Some(cnames) = self.cname_cache.get_cached(&req_host) {
                for cname_host in cnames {
                    let synthetic = format!("https://{}/", cname_host);
                    if let Ok(req) = Request::new(&synthetic, effective_source, mapped_type, "get") {
                        let custom_hit = self
                            .custom_engine
                            .read()
                            .as_ref()
                            .map(|c| c.check_network_request(&req).filter.is_some())
                            .unwrap_or(false);
                        let main_hit = self.engine.read().check_network_request(&req).filter.is_some();
                        if custom_hit || main_hit {
                            self.cname_uncloaked_count.fetch_add(1, Ordering::Relaxed);
                            return BlockDecision {
                                blocked: true,
                                redirect: None,
                                exception: None,
                                cname_cloaked: true,
                            };
                        }
                    }
                }
            } else if !self.offline_mode.load(Ordering::Relaxed) {
                self.cname_cache.trigger_background_resolve(&req_host);
            }
        }

        BlockDecision::default()
    }

    pub fn get_cosmetic_resources(&self, url: &str) -> CosmeticResources {
        if !self.is_active()
            || !self.cosmetic_enabled.load(Ordering::Relaxed)
            || url.is_empty()
            || url == "about:blank"
        {
            return CosmeticResources::default();
        }

        let host = extract_hostname(url);
        if host.is_empty() {
            return CosmeticResources::default();
        }
        if is_youtube_domain(&host) {
            return CosmeticResources::default();
        }
        {
            let paused = self.paused_domains.read();
            if is_host_in_set(&host, &paused) {
                return CosmeticResources::default();
            }
        }
        if host == "mail.google.com"
            || host == "gmail.com"
            || host == "google.com"
            || host.ends_with(".google.com")
        {
            return CosmeticResources::default();
        }
        if host == "librus.pl" || host.ends_with(".librus.pl") {
            return CosmeticResources::default();
        }

        let res = self.engine.read().url_cosmetic_resources(url);
        let mut hide_selectors: Vec<String> = res
            .hide_selectors
            .into_iter()
            .filter(|s| s.len() > 1 && s != "*" && s != "body" && s != "html")
            .collect();
        hide_selectors.sort();
        let mut exceptions: Vec<String> = res.exceptions.into_iter().collect();
        exceptions.sort();

        CosmeticResources {
            hide_selectors,
            injected_script: res.injected_script,
            exceptions,
        }
    }

    pub fn evaluate_request_headers(
        &self,
        web_contents_id: u32,
        url: &str,
        headers_json: &str,
        strip_3p_cookies: bool,
        strip_fp_headers: bool,
        send_dnt: bool,
    ) -> anyhow::Result<String> {
        let top_url = self
            .tab_contexts
            .get(&web_contents_id)
            .map(|c| c.top_url.clone())
            .unwrap_or_default();
        evaluate_request_headers_inner(
            url,
            &top_url,
            "",
            "",
            "other",
            headers_json,
            strip_3p_cookies,
            strip_fp_headers,
            send_dnt,
        )
    }

    pub fn evaluate_response_headers(
        &self,
        web_contents_id: u32,
        url: &str,
        resource_type: &str,
        headers_json: &str,
        strip_3p_cookies: bool,
        dialog_port: Option<u16>,
    ) -> anyhow::Result<String> {
        let top_url = self
            .tab_contexts
            .get(&web_contents_id)
            .map(|c| c.top_url.clone())
            .unwrap_or_default();
        evaluate_response_headers_inner(
            url,
            &top_url,
            resource_type,
            headers_json,
            strip_3p_cookies,
            dialog_port,
        )
    }
}

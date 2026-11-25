use serde_json::{Map, Value};
use url::Url;

pub const RELATED_FIRST_PARTY_FAMILIES: &[&[&str]] = &[
    &[
        "librus.pl",
        "konto.librus.pl",
        "synergia.librus.pl",
        "api.librus.pl",
        "portal.librus.pl",
    ],
    &[
        "google.com",
        "youtube.com",
        "youtu.be",
        "googlevideo.com",
        "ytimg.com",
        "ggpht.com",
        "youtube-nocookie.com",
        "googleapis.com",
        "gstatic.com",
        "accounts.google.com",
        "googleusercontent.com",
        "gmail.com",
        "doubleclick.net",
        "googlesyndication.com",
        "googleadservices.com",
    ],
    &[
        "microsoft.com",
        "live.com",
        "microsoftonline.com",
        "office.com",
        "office365.com",
    ],
    &["allegro.pl", "allegrostatic.com"],
    &["gov.pl", "login.gov.pl", "pz.gov.pl"],
];

pub const DEFAULT_CHROME_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";

pub fn extract_hostname(url_or_host: &str) -> String {
    let trimmed = url_or_host.trim();
    if trimmed.is_empty() || trimmed == "about:blank" || trimmed == "null" {
        return String::new();
    }
    if trimmed.contains("://") {
        if let Ok(parsed) = Url::parse(trimmed) {
            return parsed
                .host_str()
                .unwrap_or("")
                .to_lowercase()
                .trim_end_matches('.')
                .to_string();
        }
        return String::new();
    }
    trimmed
        .split('/')
        .next()
        .unwrap_or("")
        .split(':')
        .next()
        .unwrap_or("")
        .to_lowercase()
        .trim_start_matches("www.")
        .trim_end_matches('.')
        .to_string()
}

pub fn get_base_domain(url_or_host: &str) -> String {
    let host = extract_hostname(url_or_host);
    if host.is_empty() {
        return String::new();
    }
    if let Some(domain) = psl::domain_str(&host) {
        return domain.to_string();
    }
    host
}

pub fn are_related_first_party_domains(domain_a: &str, domain_b: &str) -> bool {
    let host_a = extract_hostname(domain_a);
    let host_b = extract_hostname(domain_b);
    if host_a.is_empty() || host_b.is_empty() {
        return false;
    }
    let base_a = get_base_domain(&host_a);
    let base_b = get_base_domain(&host_b);
    if host_a == host_b || (!base_a.is_empty() && base_a == base_b) {
        return true;
    }

    let matches_entry = |host: &str, base: &str, entry: &str| -> bool {
        host == entry || host.ends_with(&format!(".{}", entry)) || base == entry
    };

    RELATED_FIRST_PARTY_FAMILIES.iter().any(|family| {
        family.iter().any(|entry| matches_entry(&host_a, &base_a, entry))
            && family.iter().any(|entry| matches_entry(&host_b, &base_b, entry))
    })
}

pub fn is_google_auth_url(target_url: &str) -> bool {
    if target_url.is_empty() {
        return false;
    }
    if let Ok(u) = Url::parse(target_url) {
        let h = u.host_str().unwrap_or("").to_lowercase();
        let p = u.path();
        return h == "mail.google.com"
            || h == "gmail.com"
            || h.ends_with(".google.com")
            || h == "google.com"
            || h.ends_with(".googleusercontent.com")
            || h == "googleusercontent.com"
            || h.ends_with(".gstatic.com")
            || h == "gstatic.com"
            || h.ends_with(".googleapis.com")
            || h.starts_with("accounts.google.")
            || h == "oauth2.googleapis.com"
            || h.starts_with("accounts.youtube.")
            || h == "myaccount.google.com"
            || h.starts_with("smartlock.google.")
            || h.starts_with("consent.google.")
            || h.starts_with("consent.youtube.")
            || (h.contains("google.")
                && (p.starts_with("/signin")
                    || p.starts_with("/ServiceLogin")
                    || p.contains("/gsi")))
            || (h == "apis.google.com"
                && (p.contains("/auth") || p.contains("/oauth") || p.contains("/gsi")));
    }
    let s = target_url.to_lowercase();
    s.contains("mail.google.com")
        || s.contains("gmail.")
        || s.contains("googleusercontent.")
        || s.contains("accounts.google.")
        || s.contains("smartlock.google.")
        || s.contains("oauth2.googleapis.com")
}

pub fn is_auth_or_sso_flow_url(target_url: &str) -> bool {
    if target_url.is_empty() {
        return false;
    }
    let lower = target_url.to_lowercase();
    lower.contains("/oauth")
        || lower.contains("/authorize")
        || lower.contains("/auth/")
        || lower.contains("/signin")
        || lower.contains("/login")
        || lower.contains("/sso")
        || lower.contains("/saml")
        || lower.contains("/openid")
        || lower.contains("/callback")
        || lower.contains("login.gov.pl")
        || lower.contains("login.microsoftonline.com")
        || lower.contains("login.live.com")
        || lower.contains("appleid.apple.com")
}

pub fn is_youtube_origin(url_or_host: &str) -> bool {
    let host = extract_hostname(url_or_host);
    if host.is_empty() {
        return false;
    }
    host == "youtube.com"
        || host.ends_with(".youtube.com")
        || host == "youtu.be"
        || host.ends_with(".youtu.be")
        || host == "youtube-nocookie.com"
        || host.ends_with(".youtube-nocookie.com")
}

fn is_critical_auth_or_platform_host(req_host: &str) -> bool {
    const ALLOWED: &[&str] = &[
        "google.com",
        "youtube.com",
        "youtu.be",
        "googlevideo.com",
        "ytimg.com",
        "ggpht.com",
        "youtube-nocookie.com",
        "gstatic.com",
        "googleapis.com",
        "googleusercontent.com",
        "gmail.com",
        "firebaseapp.com",
        "firebaseinstallations.googleapis.com",
        "appleid.apple.com",
        "facebook.com",
        "github.com",
        "twitter.com",
        "x.com",
        "microsoft.com",
        "microsoftonline.com",
        "live.com",
        "office.com",
        "voxmedia.com",
        "cloudflare.com",
        "challenges.cloudflare.com",
        "hcaptcha.com",
        "recaptcha.net",
        "turnstile",
    ];
    ALLOWED.iter().any(|d| req_host.contains(d))
}

pub fn should_strip_third_party_cookies(
    request_url: &str,
    resource_type: &str,
    top_url: &str,
    referrer_url: &str,
    initiator_url: &str,
    status_code: Option<u16>,
    strip_3p_cookies: bool,
) -> bool {
    if !strip_3p_cookies {
        return false;
    }
    if resource_type == "mainFrame" || resource_type == "main_frame" {
        return false;
    }
    if is_google_auth_url(request_url)
        || is_google_auth_url(referrer_url)
        || is_google_auth_url(top_url)
    {
        return false;
    }
    if is_youtube_origin(top_url)
        || is_youtube_origin(referrer_url)
        || is_youtube_origin(initiator_url)
    {
        return false;
    }
    if (resource_type == "subFrame" || resource_type == "sub_frame")
        && (is_auth_or_sso_flow_url(request_url)
            || is_auth_or_sso_flow_url(referrer_url)
            || is_auth_or_sso_flow_url(top_url))
    {
        return false;
    }
    if let Some(code) = status_code {
        if (300..400).contains(&code) {
            return false;
        }
    }

    let req_host = extract_hostname(request_url);
    if req_host.is_empty() || is_critical_auth_or_platform_host(&req_host) {
        return false;
    }

    let target_base = get_base_domain(&req_host);
    let context_urls = [referrer_url, top_url, initiator_url];
    let mut has_known_context = false;

    for ctx_url in context_urls {
        let ctx_host = extract_hostname(ctx_url);
        if ctx_host.is_empty() {
            continue;
        }
        has_known_context = true;
        if (!target_base.is_empty() && get_base_domain(&ctx_host) == target_base)
            || are_related_first_party_domains(&req_host, &ctx_host)
        {
            return false;
        }
    }

    has_known_context
}

fn delete_headers_case_insensitive(map: &mut Map<String, Value>, target_lower: &str) {
    let keys_to_remove: Vec<String> = map
        .keys()
        .filter(|k| k.to_lowercase() == target_lower)
        .cloned()
        .collect();
    for k in keys_to_remove {
        map.remove(&k);
    }
}

pub fn evaluate_request_headers_inner(
    url: &str,
    top_url: &str,
    referrer_url: &str,
    initiator_url: &str,
    resource_type: &str,
    headers_json: &str,
    strip_3p_cookies: bool,
    strip_fp_headers: bool,
    send_dnt: bool,
) -> anyhow::Result<String> {
    let mut headers: Map<String, Value> = serde_json::from_str(headers_json)?;
    delete_headers_case_insensitive(&mut headers, "x-electron-version");

    if strip_fp_headers {
        headers.insert(
            "User-Agent".to_string(),
            Value::String(DEFAULT_CHROME_USER_AGENT.to_string()),
        );
        headers.insert(
            "sec-ch-ua".to_string(),
            Value::String(
                "\"Google Chrome\";v=\"134\", \"Chromium\";v=\"134\", \"Not_A Brand\";v=\"24\""
                    .to_string(),
            ),
        );
        headers.insert("sec-ch-ua-mobile".to_string(), Value::String("?0".to_string()));
        headers.insert(
            "sec-ch-ua-platform".to_string(),
            Value::String("\"Windows\"".to_string()),
        );
        if headers.contains_key("sec-ch-ua-full-version-list") {
            headers.insert(
                "sec-ch-ua-full-version-list".to_string(),
                Value::String(
                    "\"Google Chrome\";v=\"134.0.0.0\", \"Chromium\";v=\"134.0.0.0\", \"Not_A Brand\";v=\"24.0.0.0\""
                        .to_string(),
                ),
            );
        }
        delete_headers_case_insensitive(&mut headers, "x-client-data");
    }

    if send_dnt {
        headers.insert("DNT".to_string(), Value::String("1".to_string()));
    }

    if should_strip_third_party_cookies(
        url,
        resource_type,
        top_url,
        referrer_url,
        initiator_url,
        None,
        strip_3p_cookies,
    ) {
        delete_headers_case_insensitive(&mut headers, "cookie");
    }

    Ok(serde_json::to_string(&headers)?)
}

fn is_html_content_type(headers: &Map<String, Value>) -> bool {
    for (k, v) in headers {
        if k.eq_ignore_ascii_case("content-type") {
            let text = match v {
                Value::String(s) => s.to_lowercase(),
                Value::Array(arr) => arr
                    .iter()
                    .filter_map(|x| x.as_str())
                    .collect::<Vec<_>>()
                    .join(" ")
                    .to_lowercase(),
                _ => String::new(),
            };
            return text.contains("text/html") || text.contains("application/xhtml+xml");
        }
    }
    false
}

fn inject_loopback_csp(val: &str, dialog_port: u16) -> String {
    let port_target = format!("127.0.0.1:{}", dialog_port);
    let http_target = format!("http://127.0.0.1:{}", dialog_port);

    // Case-insensitive search for `connect-src `
    let lower = val.to_ascii_lowercase();
    if let Some(pos) = lower.find("connect-src ") {
        let after_directive = pos + "connect-src ".len();
        let end = val[after_directive..]
            .find(';')
            .map(|i| after_directive + i)
            .unwrap_or(val.len());
        let sources = val[after_directive..end].trim();
        let mut additions = Vec::new();
        if !sources.contains(&port_target) {
            additions.push(http_target);
        }
        if !sources.contains("data:") {
            additions.push("data:".to_string());
        }
        if !sources.contains("blob:") {
            additions.push("blob:".to_string());
        }
        if additions.is_empty() {
            return val.to_string();
        }
        let mut out = String::with_capacity(val.len() + 64);
        out.push_str(&val[..pos]);
        out.push_str("connect-src ");
        out.push_str(sources);
        for add in additions {
            out.push(' ');
            out.push_str(&add);
        }
        out.push_str(&val[end..]);
        return out;
    }

    if lower.contains("default-src ") {
        return format!(
            "{}; connect-src * 'self' data: blob: filesystem: {}",
            val, http_target
        );
    }

    val.to_string()
}

pub fn evaluate_response_headers_inner(
    url: &str,
    top_url: &str,
    resource_type: &str,
    headers_json: &str,
    strip_3p_cookies: bool,
    dialog_port: Option<u16>,
) -> anyhow::Result<String> {
    let mut headers: Map<String, Value> = serde_json::from_str(headers_json)?;

    if should_strip_third_party_cookies(
        url,
        resource_type,
        top_url,
        "",
        "",
        None,
        strip_3p_cookies,
    ) {
        delete_headers_case_insensitive(&mut headers, "set-cookie");
    }

    let is_doc_frame = resource_type == "mainFrame"
        || resource_type == "main_frame"
        || resource_type == "subFrame"
        || resource_type == "sub_frame";
    let is_html = is_html_content_type(&headers);
    let is_cloudflare = url.contains("cloudflare.com") || url.contains("challenges.cloudflare.com");
    let is_google_auth = is_google_auth_url(url) || is_google_auth_url(top_url);

    if let Some(port) = dialog_port.filter(|&p| p > 0) {
        if is_doc_frame && is_html && !is_google_auth && !is_cloudflare {
            let keys: Vec<String> = headers.keys().cloned().collect();
            for key in keys {
                let lower = key.to_lowercase();
                if lower == "content-security-policy" || lower == "content-security-policy-report-only" {
                    if let Some(val) = headers.get(&key).cloned() {
                        let updated = match val {
                            Value::Array(arr) => Value::Array(
                                arr.into_iter()
                                    .map(|item| match item {
                                        Value::String(s) => Value::String(inject_loopback_csp(&s, port)),
                                        other => other,
                                    })
                                    .collect(),
                            ),
                            Value::String(s) => Value::String(inject_loopback_csp(&s, port)),
                            other => other,
                        };
                        headers.insert(key, updated);
                    }
                }
            }
        }
    }

    Ok(serde_json::to_string(&headers)?)
}

pub mod cname;
pub mod dark_mode;
pub mod engine;
pub mod headers;
pub mod https;

pub use cname::{should_resolve_cname_host, CnameCache};
pub use dark_mode::{
    evaluate_native_dark_signals, extract_hostname_from_url, find_dark_mode_exclusion_match,
    get_composited_luminance, is_dark_excluded, is_url_excluded_from_dark_mode,
    normalize_whitelist, normalize_whitelist_entry, parse_css_color, BackgroundLayer,
    DarkModeExclusionMatch, NativeDarkSignals, RgbaColor, DEFAULT_DARK_EXCLUSIONS,
};
pub use engine::{
    is_youtube_domain, map_resource_type, BlockDecision, CosmeticResources, FilterUpdateResult,
    ShieldEngine, TabContext, BASELINE_FILTERS,
};
pub use headers::{
    are_related_first_party_domains, evaluate_request_headers_inner,
    evaluate_response_headers_inner, extract_hostname, get_base_domain, is_auth_or_sso_flow_url,
    is_google_auth_url, should_strip_third_party_cookies, RELATED_FIRST_PARTY_FAMILIES,
};
pub use https::check_https_upgrade;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blocks_baseline_ads_and_preserves_bypasses() {
        let shield = ShieldEngine::new();
        shield.set_tab_context(1, "https://example.com/news", None, false);

        // Baseline ad network
        let ad = shield.check_request(
            1,
            "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
            Some("https://example.com/news"),
            "script",
        );
        assert!(ad.blocked);

        // OAuth / SSO / Passkey / Captcha bypass
        let oauth = shield.check_request(
            1,
            "https://accounts.google.com/o/oauth2/v2/auth",
            Some("https://example.com/news"),
            "subFrame",
        );
        assert!(!oauth.blocked);

        let captcha = shield.check_request(
            1,
            "https://challenges.cloudflare.com/turnstile/v0/api.js",
            Some("https://example.com/news"),
            "script",
        );
        assert!(!captcha.blocked);

        // YouTube pass-through
        let yt = shield.check_request(
            1,
            "https://doubleclick.net/instream/ad_status.js",
            Some("https://www.youtube.com/watch?v=123"),
            "xhr",
        );
        assert!(!yt.blocked);

        // wp.pl essential vs telemetry
        let wp_ok = shield.check_request(
            1,
            "https://v.wpimg.pl/dwiubwlu.js",
            Some("https://www.wp.pl/"),
            "script",
        );
        assert!(!wp_ok.blocked);

        let wp_ad = shield.check_request(
            1,
            "https://wpimg.pl/advert/banner.jpg",
            Some("https://www.wp.pl/"),
            "image",
        );
        assert!(wp_ad.blocked);
    }

    #[test]
    fn respects_paused_domain_and_tab_pause() {
        let shield = ShieldEngine::new();
        shield.set_tab_context(2, "https://paused-site.com/page", None, false);
        shield.set_paused_domains(vec!["paused-site.com".to_string()]);

        let res = shield.check_request(
            2,
            "https://doubleclick.net/pixel.gif",
            Some("https://paused-site.com/page"),
            "image",
        );
        assert!(!res.blocked);

        shield.set_paused_domains(vec![]);
        shield.set_tab_context(2, "https://active-site.com/page", None, true);
        let res2 = shield.check_request(
            2,
            "https://doubleclick.net/pixel.gif",
            Some("https://active-site.com/page"),
            "image",
        );
        assert!(!res2.blocked);
    }

    #[test]
    fn cname_uncloaking_cache_hit_blocks_and_flags() {
        let shield = ShieldEngine::new();
        shield.set_tab_context(3, "https://shop.example.com/", None, false);
        shield.cname_cache.set_cached(
            "metrics.example.com",
            vec!["collector.doubleclick.net".to_string()],
        );

        let res = shield.check_request(
            3,
            "https://metrics.example.com/collect",
            Some("https://shop.example.com/"),
            "xhr",
        );
        assert!(res.blocked);
        assert!(res.cname_cloaked);
    }

    #[test]
    fn serialize_and_deserialize_roundtrip() {
        let shield = ShieldEngine::new();
        let bytes = shield.serialize();
        assert!(bytes.len() > 1024);

        let shield2 = ShieldEngine::new();
        shield2.deserialize(&bytes).expect("deserialize succeeds");
        let res = shield2.check_request(
            1,
            "https://static.hotjar.com/c/hotjar-123.js",
            Some("https://example.com/"),
            "script",
        );
        assert!(res.blocked);
    }

    #[test]
    fn cosmetic_resources_and_librus_youtube_exclusions() {
        let shield = ShieldEngine::new();
        let yt = shield.get_cosmetic_resources("https://www.youtube.com/watch?v=1");
        assert!(yt.hide_selectors.is_empty());

        let librus = shield.get_cosmetic_resources("https://synergia.librus.pl/uczen");
        assert!(librus.hide_selectors.is_empty());

        let wp = shield.get_cosmetic_resources("https://www.wp.pl/");
        assert!(!wp.hide_selectors.is_empty());
    }

    #[test]
    fn https_upgrade_skips_local_private_onion_and_exceptions() {
        assert_eq!(
            check_https_upgrade("http://example.com/path?a=1", true, &[]),
            Some("https://example.com/path?a=1".to_string())
        );
        assert_eq!(check_https_upgrade("http://localhost:3000/", true, &[]), None);
        assert_eq!(check_https_upgrade("http://127.0.0.1:8080/", true, &[]), None);
        assert_eq!(check_https_upgrade("http://[::1]:8080/", true, &[]), None);
        assert_eq!(check_https_upgrade("http://nas.local/", true, &[]), None);
        assert_eq!(check_https_upgrade("http://router.lan/", true, &[]), None);
        assert_eq!(check_https_upgrade("http://192.168.1.1/", true, &[]), None);
        assert_eq!(check_https_upgrade("http://10.0.0.5/", true, &[]), None);
        assert_eq!(check_https_upgrade("http://172.16.5.4/", true, &[]), None);
        assert_eq!(check_https_upgrade("http://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion/", true, &[]), None);
        assert_eq!(
            check_https_upgrade("http://legacy.example.org/", true, &["legacy.example.org".to_string()]),
            None
        );
        assert_eq!(check_https_upgrade("http://example.com/", false, &[]), None);
    }

    #[test]
    fn headers_3p_cookie_stripping_and_csp_loopback() {
        let shield = ShieldEngine::new();
        shield.set_tab_context(10, "https://synergia.librus.pl/dashboard", None, false);

        // Related first-party family (librus.pl -> konto.librus.pl) keeps cookies
        let req_related = shield
            .evaluate_request_headers(
                10,
                "https://konto.librus.pl/api/me",
                r#"{"Cookie":"sid=abc","X-Electron-Version":"34.0"}"#,
                true,
                true,
                true,
            )
            .unwrap();
        let v_rel: serde_json::Value = serde_json::from_str(&req_related).unwrap();
        assert_eq!(v_rel["Cookie"], "sid=abc");
        assert!(v_rel.get("X-Electron-Version").is_none());
        assert_eq!(v_rel["DNT"], "1");

        // Unrelated 3P domain has cookies stripped
        let req_3p = shield
            .evaluate_request_headers(
                10,
                "https://tracker.unrelated-ad.com/sync",
                r#"{"Cookie":"uid=999"}"#,
                true,
                false,
                false,
            )
            .unwrap();
        let v_3p: serde_json::Value = serde_json::from_str(&req_3p).unwrap();
        assert!(v_3p.get("Cookie").is_none());

        // Loopback CSP injected ONLY on HTML mainFrame/subFrame
        let resp_html = shield
            .evaluate_response_headers(
                10,
                "https://example.org/page",
                "mainFrame",
                r#"{"content-type":"text/html; charset=utf-8","content-security-policy":["default-src 'self'; connect-src 'self' https://api.example.org"]}"#,
                true,
                Some(45123),
            )
            .unwrap();
        let v_html: serde_json::Value = serde_json::from_str(&resp_html).unwrap();
        let csp = v_html["content-security-policy"][0].as_str().unwrap();
        assert!(csp.contains("http://127.0.0.1:45123"));

        // Non-HTML or xhr does NOT get CSP modified
        let resp_xhr = shield
            .evaluate_response_headers(
                10,
                "https://example.org/api.json",
                "xhr",
                r#"{"content-type":"application/json","content-security-policy":["default-src 'self'"]}"#,
                true,
                Some(45123),
            )
            .unwrap();
        let v_xhr: serde_json::Value = serde_json::from_str(&resp_xhr).unwrap();
        assert_eq!(v_xhr["content-security-policy"][0], "default-src 'self'");
    }

    #[test]
    fn dark_mode_whitelist_matches_defaults_and_custom_patterns() {
        assert!(is_dark_excluded("https://github.com/rust-lang/rust", &[]));
        assert!(is_dark_excluded("https://gist.github.com/user", &[]));
        assert!(!is_dark_excluded("https://example.com/article", &[]));
        assert!(is_dark_excluded(
            "https://docs.example.com/guide",
            &["*.example.com".to_string()]
        ));
    }
}

use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use url::Url;

fn is_private_or_local_ipv4(ip: Ipv4Addr) -> bool {
    ip.is_loopback()
        || ip.is_private()
        || ip.is_link_local()
        || ip.is_unspecified()
        || ip.is_broadcast()
        // Carrier-grade NAT 100.64.0.0/10
        || (ip.octets()[0] == 100 && (ip.octets()[1] & 0b1100_0000) == 64)
}

fn is_private_or_local_ipv6(ip: Ipv6Addr) -> bool {
    if ip.is_loopback() || ip.is_unspecified() {
        return true;
    }
    let segs = ip.segments();
    // Unique local fc00::/7 or link-local fe80::/10
    (segs[0] & 0xfe00) == 0xfc00 || (segs[0] & 0xffc0) == 0xfe80
}

fn is_local_or_private_host(host: &str) -> bool {
    let lower = host.trim_matches(['[', ']']).to_lowercase();
    if lower.is_empty() {
        return true;
    }
    if lower == "localhost"
        || lower.ends_with(".localhost")
        || lower.ends_with(".local")
        || lower.ends_with(".lan")
        || lower.ends_with(".onion")
    {
        return true;
    }
    if let Ok(ip) = lower.parse::<IpAddr>() {
        return match ip {
            IpAddr::V4(v4) => is_private_or_local_ipv4(v4),
            IpAddr::V6(v6) => is_private_or_local_ipv6(v6),
        };
    }
    false
}

/// Checks if an `http://` URL should be upgraded to `https://`.
/// Returns `Some(upgraded_url)` when an upgrade should occur, or `None` if skipped.
pub fn check_https_upgrade(
    url: &str,
    https_only_enabled: bool,
    http_exceptions: &[String],
) -> Option<String> {
    if !https_only_enabled {
        return None;
    }
    if !url.to_ascii_lowercase().starts_with("http://") {
        return None;
    }

    let parsed = Url::parse(url).ok()?;
    if parsed.scheme() != "http" {
        return None;
    }
    let host = parsed.host_str()?;
    if is_local_or_private_host(host) {
        return None;
    }

    let clean_host = host.trim_end_matches('.').to_lowercase();
    let stripped_www = clean_host.strip_prefix("www.").unwrap_or(&clean_host);

    for exc in http_exceptions {
        let e = exc
            .trim()
            .trim_start_matches("http://")
            .trim_start_matches("https://")
            .split('/')
            .next()
            .unwrap_or("")
            .trim_end_matches('.')
            .to_lowercase();
        if e.is_empty() {
            continue;
        }
        let e_stripped = e.strip_prefix("www.").unwrap_or(&e);
        if clean_host == e || stripped_www == e_stripped {
            return None;
        }
    }

    let mut upgraded = parsed;
    upgraded.set_scheme("https").ok()?;
    Some(upgraded.to_string())
}

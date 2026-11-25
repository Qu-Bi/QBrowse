use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TorExitIpResult {
    pub is_tor: bool,
    pub ip: String,
    pub status: String,
}

#[derive(Deserialize)]
struct TorProjectIpResp {
    #[serde(rename = "IsTor")]
    is_tor: bool,
    #[serde(rename = "IP")]
    ip: String,
}

#[derive(Deserialize)]
struct IpifyResp {
    ip: String,
}

/// Check the Tor exit IP via native SOCKS5h (`socks5h://127.0.0.1:<socks_port>`) without spawning `curl`.
pub async fn check_tor_exit_ip(socks_port: u16) -> Result<TorExitIpResult> {
    let proxy_url = format!("socks5h://127.0.0.1:{}", socks_port);
    let proxy = reqwest::Proxy::all(&proxy_url)
        .with_context(|| format!("Invalid SOCKS5h proxy URL {}", proxy_url))?;

    let client = reqwest::Client::builder()
        .proxy(proxy)
        .timeout(Duration::from_secs(6))
        .build()
        .context("Failed to build SOCKS5h reqwest client")?;

    // 1. Try official check.torproject.org API
    if let Ok(resp) = client.get("https://check.torproject.org/api/ip").send().await {
        if resp.status().is_success() {
            if let Ok(parsed) = resp.json::<TorProjectIpResp>().await {
                if !parsed.ip.is_empty() {
                    return Ok(TorExitIpResult {
                        is_tor: parsed.is_tor,
                        ip: parsed.ip,
                        status: if parsed.is_tor {
                            "Protected by Tor Network".to_string()
                        } else {
                            "Clearweb IP".to_string()
                        },
                    });
                }
            }
        }
    }

    // 2. Fallback check endpoint over Tor SOCKS5h
    if let Ok(resp) = client
        .get("https://api.ipify.org?format=json")
        .send()
        .await
    {
        if resp.status().is_success() {
            if let Ok(parsed) = resp.json::<IpifyResp>().await {
                if !parsed.ip.is_empty() {
                    return Ok(TorExitIpResult {
                        is_tor: true,
                        ip: parsed.ip,
                        status: "Protected by Tor Network".to_string(),
                    });
                }
            }
        }
    }

    Ok(TorExitIpResult {
        is_tor: false,
        ip: "Unknown".to_string(),
        status: "Active".to_string(),
    })
}

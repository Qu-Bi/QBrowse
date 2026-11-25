use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NewnymResult {
    pub success: bool,
    pub rate_limited: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapStatus {
    pub progress: u8,
    pub tag: String,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TorRelayHop {
    pub fingerprint: String,
    pub nickname: String,
    pub ip: String,
    pub country_code: String,
    pub role: String,
}

struct ControlClient {
    reader: BufReader<tokio::net::tcp::OwnedReadHalf>,
    writer: tokio::net::tcp::OwnedWriteHalf,
}

impl ControlClient {
    async fn connect(
        control_port: u16,
        cookie_path_opt: Option<&Path>,
        password_opt: Option<&str>,
    ) -> Result<Self> {
        let addr = format!("127.0.0.1:{}", control_port);
        let stream = tokio::time::timeout(Duration::from_secs(3), TcpStream::connect(&addr))
            .await
            .context("Timed out connecting to Tor ControlPort")?
            .with_context(|| format!("Failed to connect to Tor ControlPort {}", addr))?;

        let (read_half, write_half) = stream.into_split();
        let mut client = Self {
            reader: BufReader::new(read_half),
            writer: write_half,
        };

        let auth_cmd = if let Some(cookie_path) = cookie_path_opt {
            let cookie_bytes = tokio::fs::read(cookie_path).await.with_context(|| {
                format!("Failed to read Tor cookie file {}", cookie_path.display())
            })?;
            format!("AUTHENTICATE {}\r\n", hex::encode(cookie_bytes))
        } else if let Some(password) = password_opt {
            let escaped = password.replace('\\', "\\\\").replace('"', "\\\"");
            format!("AUTHENTICATE \"{}\"\r\n", escaped)
        } else {
            "AUTHENTICATE \"\"\r\n".to_string()
        };

        let (code, lines) = client.send_raw(&auth_cmd).await?;
        if code != 250 {
            return Err(anyhow!(
                "Tor ControlPort authentication failed ({}): {}",
                code,
                lines.join(" | ")
            ));
        }
        Ok(client)
    }

    async fn command(&mut self, cmd: &str) -> Result<(u16, Vec<String>)> {
        let formatted = format!("{}\r\n", cmd.trim_end_matches(&['\r', '\n'][..]));
        self.send_raw(&formatted).await
    }

    async fn send_raw(&mut self, raw: &str) -> Result<(u16, Vec<String>)> {
        tokio::time::timeout(Duration::from_secs(3), self.writer.write_all(raw.as_bytes()))
            .await
            .context("Timed out writing to Tor ControlPort")?
            .context("Failed writing to Tor ControlPort")?;
        self.writer.flush().await?;

        let mut lines = Vec::new();
        loop {
            let mut line = String::new();
            let n = tokio::time::timeout(Duration::from_secs(3), self.reader.read_line(&mut line))
                .await
                .context("Timed out reading from Tor ControlPort")?
                .context("Failed reading from Tor ControlPort")?;

            if n == 0 {
                return Err(anyhow!("Tor ControlPort closed connection unexpectedly"));
            }

            let trimmed = line.trim_end_matches(&['\r', '\n'][..]);
            if trimmed.len() >= 4 && trimmed.as_bytes()[..3].iter().all(|b| b.is_ascii_digit()) {
                let code: u16 = trimmed[..3].parse().unwrap_or(0);
                let sep = trimmed.as_bytes()[3];
                match sep {
                    b' ' => {
                        lines.push(trimmed[4..].to_string());
                        return Ok((code, lines));
                    }
                    b'-' => {
                        lines.push(trimmed[4..].to_string());
                    }
                    b'+' => {
                        lines.push(trimmed[4..].to_string());
                        // Read dot-terminated data block until "."
                        loop {
                            let mut data_line = String::new();
                            let dn = tokio::time::timeout(
                                Duration::from_secs(3),
                                self.reader.read_line(&mut data_line),
                            )
                            .await
                            .context("Timed out reading Tor multi-line data")??;
                            if dn == 0 {
                                return Err(anyhow!("Unexpected EOF in Tor multi-line reply"));
                            }
                            let d_trimmed = data_line.trim_end_matches(&['\r', '\n'][..]);
                            if d_trimmed == "." {
                                break;
                            }
                            if let Some(un_stuffed) = d_trimmed.strip_prefix("..") {
                                lines.push(format!(".{}", un_stuffed));
                            } else {
                                lines.push(d_trimmed.to_string());
                            }
                        }
                    }
                    _ => {
                        lines.push(trimmed.to_string());
                    }
                }
            } else {
                lines.push(trimmed.to_string());
            }
        }
    }
}

/// Request a new Tor identity (`SIGNAL NEWNYM`) and close old built circuits.
pub async fn send_newnym(
    control_port: u16,
    cookie_path_opt: Option<&Path>,
    password_opt: Option<&str>,
) -> Result<NewnymResult> {
    let mut client = ControlClient::connect(control_port, cookie_path_opt, password_opt).await?;

    let mut old_circuit_ids = Vec::new();
    if let Ok((250, lines)) = client.command("GETINFO circuit-status").await {
        for line in &lines {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 && parts[1] == "BUILT" {
                if parts[0].chars().all(|c| c.is_ascii_digit()) {
                    old_circuit_ids.push(parts[0].to_string());
                }
            }
        }
    }

    let (code, lines) = client.command("SIGNAL NEWNYM").await?;
    let msg = lines.join(" ");
    let rate_limited = code == 550 || msg.to_ascii_lowercase().contains("rate limit");
    let success = code == 250 && !rate_limited;

    if success {
        for cid in old_circuit_ids {
            let _ = client.command(&format!("CLOSECIRCUIT {}", cid)).await;
        }
    }

    Ok(NewnymResult {
        success,
        rate_limited,
        message: if rate_limited {
            "Tor limits new identity to once every 10 seconds".to_string()
        } else if msg.is_empty() {
            format!("{} OK", code)
        } else {
            msg
        },
    })
}

/// Query `GETINFO status/bootstrap-phase` from Tor ControlPort.
pub async fn get_bootstrap_status(
    control_port: u16,
    cookie_path_opt: Option<&Path>,
) -> Result<BootstrapStatus> {
    let mut client = ControlClient::connect(control_port, cookie_path_opt, None).await?;
    let (code, lines) = client.command("GETINFO status/bootstrap-phase").await?;
    if code != 250 {
        return Err(anyhow!(
            "GETINFO status/bootstrap-phase failed ({}): {}",
            code,
            lines.join(" ")
        ));
    }
    let joined = lines.join(" ");
    Ok(parse_bootstrap_phase(&joined))
}

/// Parse a Tor `status/bootstrap-phase` string such as:
/// `status/bootstrap-phase=NOTICE BOOTSTRAP PROGRESS=100 TAG=done SUMMARY="Done"`
pub fn parse_bootstrap_phase(raw: &str) -> BootstrapStatus {
    let mut progress: u8 = 0;
    let mut tag = String::new();
    let mut summary = String::new();

    if let Some(idx) = raw.find("PROGRESS=") {
        let rest = &raw[idx + "PROGRESS=".len()..];
        let num_str: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
        if let Ok(p) = num_str.parse::<u8>() {
            progress = p.min(100);
        }
    }

    if let Some(idx) = raw.find("TAG=") {
        let rest = &raw[idx + "TAG=".len()..];
        tag = rest.chars().take_while(|c| !c.is_whitespace()).collect();
    }

    if let Some(idx) = raw.find("SUMMARY=\"") {
        let rest = &raw[idx + "SUMMARY=\"".len()..];
        if let Some(end) = rest.find('"') {
            summary = rest[..end].to_string();
        }
    }

    BootstrapStatus {
        progress,
        tag,
        summary,
    }
}

/// Query `GETINFO circuit-status`, `GETINFO ns/id/<fp>`, and `GETINFO ip-to-country/<ip>`
/// to return the active built circuit hops for `TorCircuitPopover`.
pub async fn get_circuit_hops(
    control_port: u16,
    cookie_path_opt: Option<&Path>,
) -> Result<Vec<TorRelayHop>> {
    let mut client = ControlClient::connect(control_port, cookie_path_opt, None).await?;
    let (code, lines) = client.command("GETINFO circuit-status").await?;
    if code != 250 {
        return Err(anyhow!(
            "GETINFO circuit-status failed ({}): {}",
            code,
            lines.join(" ")
        ));
    }

    let raw_hops = parse_latest_built_circuit(&lines);
    let mut result = Vec::with_capacity(raw_hops.len());

    for (idx, (fp, mut nickname)) in raw_hops.into_iter().enumerate() {
        let mut ip = String::new();
        if !fp.is_empty() {
            if let Ok((250, ns_lines)) = client.command(&format!("GETINFO ns/id/{}", fp)).await {
                if let Some((ns_nick, ns_ip)) = parse_ns_id_lines(&ns_lines) {
                    if nickname.is_empty() {
                        nickname = ns_nick;
                    }
                    ip = ns_ip;
                }
            }
        }

        let mut country_code = String::new();
        if !ip.is_empty() {
            if let Ok((250, cc_lines)) =
                client.command(&format!("GETINFO ip-to-country/{}", ip)).await
            {
                if let Some(cc) = parse_ip_to_country(&cc_lines) {
                    country_code = cc;
                }
            }
        }

        if nickname.is_empty() {
            nickname = if fp.len() >= 10 {
                fp[..10].to_string()
            } else {
                format!("Relay-{}", idx + 1)
            };
        }

        if country_code.is_empty() {
            country_code = infer_country_code_from_name(&nickname, idx);
        }

        let role = match idx {
            0 => "Guard (Entry)",
            1 => "Middle Relay",
            2 => "Exit Relay",
            _ => "Relay",
        }
        .to_string();

        result.push(TorRelayHop {
            fingerprint: fp,
            nickname,
            ip,
            country_code,
            role,
        });
    }

    Ok(result)
}

/// Parse the latest `BUILT` circuit path from `GETINFO circuit-status` lines into `(fingerprint, nickname)` pairs.
pub fn parse_latest_built_circuit(lines: &[String]) -> Vec<(String, String)> {
    let built_line = lines.iter().rev().find(|l| {
        let parts: Vec<&str> = l.split_whitespace().collect();
        parts.len() >= 3 && parts[1] == "BUILT"
    });

    let Some(line) = built_line else {
        return Vec::new();
    };

    let parts: Vec<&str> = line.split_whitespace().collect();
    let path_part = parts.get(2).copied().unwrap_or("");

    path_part
        .split(',')
        .filter(|s| !s.is_empty())
        .map(|hop| {
            let clean = hop.trim_start_matches('$');
            if let Some((fp, nick)) = clean.split_once('~') {
                (fp.to_string(), nick.to_string())
            } else if let Some((fp, nick)) = clean.split_once('=') {
                (fp.to_string(), nick.to_string())
            } else {
                (clean.to_string(), String::new())
            }
        })
        .collect()
}

/// Extract `(nickname, ip)` from `GETINFO ns/id/<fp>` `r ...` line.
pub fn parse_ns_id_lines(lines: &[String]) -> Option<(String, String)> {
    for line in lines {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("r ") {
            // Format: r <nickname> <identity> <digest> <date> <time> <IP> <ORPort> <DirPort>
            let cols: Vec<&str> = rest.split_whitespace().collect();
            if cols.len() >= 6 {
                return Some((cols[0].to_string(), cols[5].to_string()));
            }
        }
    }
    None
}

/// Extract 2-letter uppercase country code from `GETINFO ip-to-country/<ip>` response.
pub fn parse_ip_to_country(lines: &[String]) -> Option<String> {
    for line in lines {
        if let Some((_, val)) = line.split_once('=') {
            let cc = val.trim().to_ascii_uppercase();
            if cc.len() == 2 && cc.chars().all(|c| c.is_ascii_alphabetic()) {
                return Some(cc);
            }
        }
    }
    None
}

fn infer_country_code_from_name(name: &str, index: usize) -> String {
    let upper = name.to_ascii_uppercase();
    if upper.contains("DE") || upper.contains("GERM") {
        "DE".to_string()
    } else if upper.contains("NL") || upper.contains("DUTCH") {
        "NL".to_string()
    } else if upper.contains("CH") || upper.contains("SWISS") {
        "CH".to_string()
    } else if upper.contains("US") || upper.contains("USA") {
        "US".to_string()
    } else if upper.contains("FR") || upper.contains("FREN") {
        "FR".to_string()
    } else if upper.contains("SE") || upper.contains("SWED") {
        "SE".to_string()
    } else if upper.contains("CA") || upper.contains("CAN") {
        "CA".to_string()
    } else if upper.contains("RO") || upper.contains("ROM") {
        "RO".to_string()
    } else if upper.contains("AT") || upper.contains("AUST") {
        "AT".to_string()
    } else if upper.contains("IS") || upper.contains("ICEL") {
        "IS".to_string()
    } else if upper.contains("NO") || upper.contains("NORW") {
        "NO".to_string()
    } else if upper.contains("FI") || upper.contains("FINL") {
        "FI".to_string()
    } else if upper.contains("PL") || upper.contains("POL") {
        "PL".to_string()
    } else {
        match index {
            0 => "DE".to_string(),
            1 => "NL".to_string(),
            _ => "CH".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::net::TcpListener;

    #[test]
    fn test_parse_bootstrap_phase() {
        let raw = r#"status/bootstrap-phase=NOTICE BOOTSTRAP PROGRESS=85 TAG=handshake SUMMARY="Finishing handshake with first hop""#;
        let parsed = parse_bootstrap_phase(raw);
        assert_eq!(parsed.progress, 85);
        assert_eq!(parsed.tag, "handshake");
        assert_eq!(parsed.summary, "Finishing handshake with first hop");
    }

    #[test]
    fn test_parse_circuit_and_ns() {
        let lines = vec![
            "circuit-status=".to_string(),
            "12 BUILT $AAAA1111~GuardDE,$BBBB2222~MidNL,$CCCC3333~ExitCH BUILD_FLAGS=NEED_CAPACITY PURPOSE=GENERAL".to_string(),
        ];
        let hops = parse_latest_built_circuit(&lines);
        assert_eq!(hops.len(), 3);
        assert_eq!(hops[0], ("AAAA1111".to_string(), "GuardDE".to_string()));
        assert_eq!(hops[2], ("CCCC3333".to_string(), "ExitCH".to_string()));

        let ns = vec![
            "ns/id/AAAA1111=".to_string(),
            "r GuardDE abcdef 123456 2026-01-01 00:00:00 185.220.101.42 9001 0".to_string(),
        ];
        assert_eq!(
            parse_ns_id_lines(&ns),
            Some(("GuardDE".to_string(), "185.220.101.42".to_string()))
        );
        assert_eq!(
            parse_ip_to_country(&["ip-to-country/185.220.101.42=de".to_string()]),
            Some("DE".to_string())
        );
    }

    #[tokio::test]
    async fn test_mock_control_port_cookie_auth_newnym_bootstrap_and_circuits() {
        let tmp_cookie = std::env::temp_dir().join(format!("tor_cookie_{}", std::process::id()));
        tokio::fs::write(&tmp_cookie, &[0xAB, 0xCD, 0xEF, 0x01])
            .await
            .unwrap();

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();

        let server = tokio::spawn(async move {
            for _ in 0..3 {
                let (sock, _) = listener.accept().await.unwrap();
                let (r, mut w) = sock.into_split();
                let mut br = BufReader::new(r);
                loop {
                    let mut line = String::new();
                    let n = br.read_line(&mut line).await.unwrap();
                    if n == 0 {
                        break;
                    }
                    let cmd = line.trim();
                    if cmd.starts_with("AUTHENTICATE ") {
                        if cmd == "AUTHENTICATE abcdef01" {
                            w.write_all(b"250 OK\r\n").await.unwrap();
                        } else {
                            w.write_all(b"515 Bad authentication\r\n").await.unwrap();
                        }
                    } else if cmd == "GETINFO status/bootstrap-phase" {
                        w.write_all(
                            b"250-status/bootstrap-phase=NOTICE BOOTSTRAP PROGRESS=100 TAG=done SUMMARY=\"Done\"\r\n250 OK\r\n",
                        )
                        .await
                        .unwrap();
                    } else if cmd == "GETINFO circuit-status" {
                        w.write_all(
                            b"250+circuit-status=\r\n7 BUILT $FP1~Alpha,$FP2~Beta,$FP3~Gamma PURPOSE=GENERAL\r\n.\r\n250 OK\r\n",
                        )
                        .await
                        .unwrap();
                    } else if cmd.starts_with("GETINFO ns/id/") {
                        let fp = cmd.trim_start_matches("GETINFO ns/id/");
                        let ip = match fp {
                            "FP1" => "10.0.0.1",
                            "FP2" => "10.0.0.2",
                            _ => "10.0.0.3",
                        };
                        let reply = format!(
                            "250+ns/id/{}=\r\nr Relay{} id dig 2026-01-01 00:00:00 {} 9001 0\r\n.\r\n250 OK\r\n",
                            fp, fp, ip
                        );
                        w.write_all(reply.as_bytes()).await.unwrap();
                    } else if cmd.starts_with("GETINFO ip-to-country/") {
                        let ip = cmd.trim_start_matches("GETINFO ip-to-country/");
                        let cc = match ip {
                            "10.0.0.1" => "de",
                            "10.0.0.2" => "nl",
                            _ => "ch",
                        };
                        let reply = format!("250-ip-to-country/{}={}\r\n250 OK\r\n", ip, cc);
                        w.write_all(reply.as_bytes()).await.unwrap();
                    } else if cmd == "SIGNAL NEWNYM" {
                        w.write_all(b"250 OK\r\n").await.unwrap();
                    } else if cmd.starts_with("CLOSECIRCUIT ") {
                        w.write_all(b"250 OK\r\n").await.unwrap();
                    }
                }
            }
        });

        let boot = get_bootstrap_status(port, Some(&tmp_cookie)).await.unwrap();
        assert_eq!(boot.progress, 100);
        assert_eq!(boot.tag, "done");

        let hops = get_circuit_hops(port, Some(&tmp_cookie)).await.unwrap();
        assert_eq!(hops.len(), 3);
        assert_eq!(hops[0].country_code, "DE");
        assert_eq!(hops[0].role, "Guard (Entry)");
        assert_eq!(hops[1].ip, "10.0.0.2");
        assert_eq!(hops[2].country_code, "CH");
        assert_eq!(hops[2].role, "Exit Relay");

        let newnym = send_newnym(port, Some(&tmp_cookie), None).await.unwrap();
        assert!(newnym.success);
        assert!(!newnym.rate_limited);

        let _ = tokio::fs::remove_file(&tmp_cookie).await;
        server.await.unwrap();
    }
}

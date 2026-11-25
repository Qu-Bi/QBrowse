use crate::linux_update::LatestYml;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use sysinfo::System;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessTelemetry {
    pub pid: u32,
    pub process_memory_bytes: u64,
    pub process_cpu_usage: f32,
    pub system_total_memory_bytes: u64,
    pub system_used_memory_bytes: u64,
    pub cpu_count: usize,
}

/// Parse an electron-builder `latest.yml` / `latest-linux.yml` string.
pub fn parse_latest_yml(yaml_str: &str) -> Result<LatestYml> {
    let parsed: LatestYml = serde_yaml::from_str(yaml_str)?;
    Ok(parsed)
}

fn normalize_semver_str(ver: &str) -> &str {
    let trimmed = ver.trim().trim_start_matches(['v', 'V']);
    trimmed.split('+').next().unwrap_or("0.0.0").trim()
}

fn compare_prerelease(pre_a: &str, pre_b: &str) -> Ordering {
    match (pre_a.is_empty(), pre_b.is_empty()) {
        (true, true) => return Ordering::Equal,
        (true, false) => return Ordering::Greater,
        (false, true) => return Ordering::Less,
        (false, false) => {}
    }

    let ids_a: Vec<&str> = pre_a.split('.').collect();
    let ids_b: Vec<&str> = pre_b.split('.').collect();
    let max_len = ids_a.len().max(ids_b.len());

    for i in 0..max_len {
        match (ids_a.get(i), ids_b.get(i)) {
            (None, Some(_)) => return Ordering::Less,
            (Some(_), None) => return Ordering::Greater,
            (Some(&a), Some(&b)) => {
                if a == b {
                    continue;
                }
                let a_num = a.parse::<u64>();
                let b_num = b.parse::<u64>();
                match (a_num, b_num) {
                    (Ok(na), Ok(nb)) => return na.cmp(&nb),
                    (Ok(_), Err(_)) => return Ordering::Less,
                    (Err(_), Ok(_)) => return Ordering::Greater,
                    (Err(_), Err(_)) => return a.cmp(b),
                }
            }
            (None, None) => break,
        }
    }
    Ordering::Equal
}

/// Compare two SemVer strings (`-1`, `0`, `1`), matching `linuxUpdateHelper.cjs` `compareSemver` 1:1.
pub fn compare_semver(a: &str, b: &str) -> i32 {
    let clean_a = normalize_semver_str(a);
    let clean_b = normalize_semver_str(b);

    let (main_a, pre_a) = clean_a.split_once('-').unwrap_or((clean_a, ""));
    let (main_b, pre_b) = clean_b.split_once('-').unwrap_or((clean_b, ""));

    let parts_a: Vec<u64> = main_a
        .split('.')
        .map(|s| s.parse::<u64>().unwrap_or(0))
        .collect();
    let parts_b: Vec<u64> = main_b
        .split('.')
        .map(|s| s.parse::<u64>().unwrap_or(0))
        .collect();

    let max_len = parts_a.len().max(parts_b.len()).max(3);
    for i in 0..max_len {
        let pa = parts_a.get(i).copied().unwrap_or(0);
        let pb = parts_b.get(i).copied().unwrap_or(0);
        match pa.cmp(&pb) {
            Ordering::Greater => return 1,
            Ordering::Less => return -1,
            Ordering::Equal => {}
        }
    }

    match compare_prerelease(pre_a, pre_b) {
        Ordering::Greater => 1,
        Ordering::Less => -1,
        Ordering::Equal => 0,
    }
}

/// Collect current process and system telemetry via `sysinfo`.
pub fn get_process_telemetry() -> ProcessTelemetry {
    let mut sys = System::new_all();
    sys.refresh_memory();
    let pid_u32 = std::process::id();
    let sys_pid = sysinfo::Pid::from_u32(pid_u32);
    sys.refresh_processes(sysinfo::ProcessesToUpdate::Some(&[sys_pid]), true);

    let (process_memory_bytes, process_cpu_usage) = sys
        .process(sys_pid)
        .map(|p| (p.memory(), p.cpu_usage()))
        .unwrap_or((0, 0.0));

    ProcessTelemetry {
        pid: pid_u32,
        process_memory_bytes,
        process_cpu_usage,
        system_total_memory_bytes: sys.total_memory(),
        system_used_memory_bytes: sys.used_memory(),
        cpu_count: sys.cpus().len(),
    }
}

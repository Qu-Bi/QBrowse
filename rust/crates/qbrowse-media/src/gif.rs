use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GifInfo {
    pub duration_ms: u64,
    pub frames: usize,
}

fn skip_sub_blocks(bytes: &[u8], start: usize) -> usize {
    let mut pos = start;
    while pos < bytes.len() {
        let len = bytes[pos] as usize;
        if len == 0 {
            return pos + 1;
        }
        pos = pos.saturating_add(1 + len);
    }
    bytes.len()
}

fn get_gif_gct_end_offset(bytes: &[u8]) -> usize {
    if bytes.len() < 13 {
        return bytes.len();
    }
    let gct_flag = bytes[10] & 0x80;
    if gct_flag == 0 {
        return 13;
    }
    let gct_size = 3 * (1usize << ((bytes[10] & 0x07) + 1));
    bytes.len().min(13 + gct_size)
}

/// Parse total animation duration (ms) and frame count from a GIF87a/GIF89a buffer.
/// Matches `src/utils/gifParser.js` `parseGifInfo` 1:1.
pub fn parse_gif_info(bytes: &[u8]) -> Option<GifInfo> {
    if bytes.len() < 13 || &bytes[0..3] != b"GIF" {
        return None;
    }

    let mut total_duration_ms: u64 = 0;
    let mut gce_count: usize = 0;
    let mut image_count: usize = 0;
    let mut i = get_gif_gct_end_offset(bytes);

    while i < bytes.len() {
        let block_type = bytes[i];
        i += 1;
        if block_type == 0x3B {
            break;
        }

        if block_type == 0x21 {
            if i >= bytes.len() {
                break;
            }
            let ext_type = bytes[i];
            i += 1;
            if ext_type == 0xF9 {
                if i >= bytes.len() {
                    break;
                }
                let block_size = bytes[i] as usize;
                i += 1;
                if block_size >= 4 && i + block_size <= bytes.len() {
                    let delay = u16::from_le_bytes([bytes[i + 1], bytes[i + 2]]) as u64;
                    let effective = if delay <= 1 { 10 } else { delay };
                    total_duration_ms += effective * 10;
                    gce_count += 1;
                }
                i = skip_sub_blocks(bytes, bytes.len().min(i + block_size));
            } else {
                i = skip_sub_blocks(bytes, i);
            }
        } else if block_type == 0x2C {
            image_count += 1;
            i += 9;
            if i <= bytes.len() && (bytes[i - 1] & 0x80) != 0 {
                let lct_size = 3 * (1usize << ((bytes[i - 1] & 0x07) + 1));
                i += lct_size;
            }
            if i >= bytes.len() {
                break;
            }
            i += 1; // LZW minimum code size
            i = skip_sub_blocks(bytes, i);
        }
    }

    let frames = image_count.max(gce_count);
    if total_duration_ms > 0 && frames > 1 {
        Some(GifInfo {
            duration_ms: total_duration_ms,
            frames,
        })
    } else {
        None
    }
}

/// Strip `NETSCAPE2.0` / `ANIMEXTS1.0` looping application extension blocks so the GIF plays once.
/// Matches `src/utils/gifParser.js` `makeGifSinglePlay` 1:1.
pub fn strip_gif_loop(src: &[u8]) -> Vec<u8> {
    if src.len() < 13 || &src[0..3] != b"GIF" {
        return src.to_vec();
    }

    let header_end = get_gif_gct_end_offset(src);
    let mut omit_ranges: Vec<(usize, usize)> = Vec::new();
    let mut i = header_end;

    while i < src.len() {
        let block_start = i;
        let block_type = src[i];
        i += 1;
        if block_type == 0x3B {
            break;
        }

        if block_type == 0x21 {
            if i >= src.len() {
                break;
            }
            let ext_type = src[i];
            i += 1;
            if ext_type == 0xF9 {
                if i >= src.len() {
                    break;
                }
                let block_size = src[i] as usize;
                i += 1;
                i = skip_sub_blocks(src, src.len().min(i + block_size));
            } else if ext_type == 0xFF {
                let app_len = if i < src.len() { src[i] as usize } else { 0 };
                let mut is_loop_app_ext = false;
                if app_len == 11 && i + 12 <= src.len() {
                    let app = &src[i + 1..i + 12];
                    if app == b"NETSCAPE2.0" || app == b"ANIMEXTS1.0" {
                        is_loop_app_ext = true;
                    }
                }

                let after_app_id = i + 1 + app_len;
                if is_loop_app_ext
                    && after_app_id + 4 <= src.len()
                    && src[after_app_id] == 0x03
                    && src[after_app_id + 1] == 0x01
                    && src[after_app_id + 4] != 0x00
                    && matches!(src[after_app_id + 4], 0x21 | 0x2C | 0x3B)
                {
                    i = after_app_id + 4;
                } else {
                    i = skip_sub_blocks(src, i);
                }

                if is_loop_app_ext {
                    omit_ranges.push((block_start, i));
                }
            } else {
                i = skip_sub_blocks(src, i);
            }
        } else if block_type == 0x2C {
            i += 9;
            if i <= src.len() && (src[i - 1] & 0x80) != 0 {
                let lct_size = 3 * (1usize << ((src[i - 1] & 0x07) + 1));
                i += lct_size;
            }
            if i >= src.len() {
                break;
            }
            i += 1;
            i = skip_sub_blocks(src, i);
        }
    }

    if omit_ranges.is_empty() {
        return src.to_vec();
    }

    let omit_total: usize = omit_ranges.iter().map(|(s, e)| e - s).sum();
    let mut out = Vec::with_capacity(src.len().saturating_sub(omit_total));
    let mut read_pos = 0;

    for (start, end) in omit_ranges {
        if start > read_pos {
            out.extend_from_slice(&src[read_pos..start]);
        }
        read_pos = end;
    }
    if read_pos < src.len() {
        out.extend_from_slice(&src[read_pos..]);
    }
    out
}

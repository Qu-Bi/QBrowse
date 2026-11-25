pub mod fs_probe;
pub mod gif;
pub mod hash_thumb;

pub use fs_probe::{
    autocomplete_path, format_human_size, is_text_extension, list_directory, mime_from_extension,
    probe_local_file, read_file_range, DirEntryInfo, FileRangeResponse, LocalFileProbe,
    PathSuggestion, MAX_TEXT_PROBE_BYTES,
};
pub use gif::{parse_gif_info, strip_gif_loop, GifInfo};
pub use hash_thumb::{hash_file, save_tab_thumbnail, HashAlgo};

pub fn ping() -> &'static str {
    "qbrowse-media"
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;
    use std::path::PathBuf;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "qbrowse_media_test_{}_{}",
            name,
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn test_list_directory_and_autocomplete() {
        let dir = temp_dir("list");
        fs::create_dir_all(dir.join("sub_folder")).unwrap();
        fs::write(dir.join("alpha.txt"), "hello").unwrap();
        fs::write(dir.join(".hidden"), "secret").unwrap();

        let listed = list_directory(dir.to_str().unwrap()).unwrap();
        assert_eq!(listed.len(), 3);
        assert!(listed[0].is_directory);
        assert_eq!(listed[0].name, "sub_folder");
        assert!(listed.iter().any(|e| e.name == ".hidden" && e.hidden));

        let prefix = format!("{}{}al", dir.to_string_lossy(), std::path::MAIN_SEPARATOR);
        let suggestions = autocomplete_path(&prefix, 10);
        assert_eq!(suggestions.len(), 1);
        assert_eq!(suggestions[0].name, "alpha.txt");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_probe_local_file_and_range() {
        let dir = temp_dir("probe");
        let txt_path = dir.join("notes.md");
        fs::write(&txt_path, "# QBrowse\nHello world").unwrap();

        let probe = probe_local_file(txt_path.to_str().unwrap()).unwrap();
        assert!(probe.is_text);
        assert_eq!(probe.text_content.as_deref(), Some("# QBrowse\nHello world"));
        assert!(probe.base64.is_none());
        assert!(probe.stream_url.starts_with("qbrowse-local://file?path="));

        let bin_path = dir.join("video.mp4");
        let mut f = fs::File::create(&bin_path).unwrap();
        f.write_all(b"0123456789ABCDEF").unwrap();

        let bin_probe = probe_local_file(bin_path.to_str().unwrap()).unwrap();
        assert!(!bin_probe.is_text);
        assert!(bin_probe.text_content.is_none());
        assert!(bin_probe.base64.is_none());

        let range = read_file_range(bin_path.to_str().unwrap(), Some("bytes=2-5"), 1024).unwrap();
        assert_eq!(range.status, 206);
        assert_eq!(range.content_range.as_deref(), Some("bytes 2-5/16"));
        assert_eq!(range.bytes, b"2345");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_gif_parse_and_strip_loop() {
        // Minimal 2-frame GIF89a with NETSCAPE2.0 loop block
        let mut gif = Vec::new();
        gif.extend_from_slice(b"GIF89a");
        gif.extend_from_slice(&[1, 0, 1, 0, 0x00, 0, 0]); // LSD (no GCT)
        // NETSCAPE2.0 application extension
        gif.extend_from_slice(&[0x21, 0xFF, 11]);
        gif.extend_from_slice(b"NETSCAPE2.0");
        gif.extend_from_slice(&[3, 1, 0, 0, 0]);
        // Frame 1 GCE (delay = 10 -> 100ms) + Image
        gif.extend_from_slice(&[0x21, 0xF9, 4, 0, 10, 0, 0, 0]);
        gif.extend_from_slice(&[0x2C, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 0]);
        // Frame 2 GCE (delay = 20 -> 200ms) + Image
        gif.extend_from_slice(&[0x21, 0xF9, 4, 0, 20, 0, 0, 0]);
        gif.extend_from_slice(&[0x2C, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 0]);
        gif.push(0x3B);

        let info = parse_gif_info(&gif).unwrap();
        assert_eq!(info.frames, 2);
        assert_eq!(info.duration_ms, 300);

        let stripped = strip_gif_loop(&gif);
        assert!(stripped.len() < gif.len());
        assert!(!stripped.windows(11).any(|w| w == b"NETSCAPE2.0"));
        let info2 = parse_gif_info(&stripped).unwrap();
        assert_eq!(info2.frames, 2);
        assert_eq!(info2.duration_ms, 300);
    }

    #[test]
    fn test_hash_file_and_save_thumbnail() {
        let dir = temp_dir("hash_thumb");
        let file_path = dir.join("data.bin");
        fs::write(&file_path, b"abc").unwrap();

        assert_eq!(
            hash_file(file_path.to_str().unwrap(), HashAlgo::Sha256).unwrap(),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
        assert_eq!(
            hash_file(file_path.to_str().unwrap(), HashAlgo::Blake3).unwrap().len(),
            64
        );

        let img = image::RgbaImage::from_pixel(4, 4, image::Rgba([255, 0, 0, 255]));
        let mut png_bytes = Vec::new();
        image::DynamicImage::ImageRgba8(img)
            .write_to(&mut std::io::Cursor::new(&mut png_bytes), image::ImageFormat::Png)
            .unwrap();

        let thumb_url = save_tab_thumbnail(dir.to_str().unwrap(), "tab-42", &png_bytes).unwrap();
        assert!(thumb_url.starts_with("qbrowse-thumb://tab/tab-42?t="));
        assert!(dir.join("tab-42.webp").exists());

        let _ = fs::remove_dir_all(&dir);
    }
}

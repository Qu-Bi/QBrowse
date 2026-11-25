use anyhow::{anyhow, Context, Result};
use lopdf::content::Content;
use lopdf::Object;
use quick_xml::events::Event;
use quick_xml::Reader;
use serde::{Deserialize, Serialize};
use std::io::{Cursor, Read};
use std::path::Path;
use zip::ZipArchive;

/// Input source for document and image extraction helpers.
pub enum PathOrBytes<'a> {
    Path(&'a Path),
    Bytes(&'a [u8]),
}

impl<'a> From<&'a Path> for PathOrBytes<'a> {
    fn from(p: &'a Path) -> Self {
        Self::Path(p)
    }
}

impl<'a> From<&'a [u8]> for PathOrBytes<'a> {
    fn from(b: &'a [u8]) -> Self {
        Self::Bytes(b)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PdfExtractResult {
    pub text: String,
    pub page_count: u32,
    pub truncated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OcrResult {
    pub supported: bool,
    pub text: String,
}

/// Extract text from a PDF file or in-memory bytes.
pub fn extract_pdf_text(
    input: PathOrBytes<'_>,
    max_pages: Option<u32>,
) -> Result<PdfExtractResult> {
    match input {
        PathOrBytes::Path(path) => extract_pdf_text_from_path(path, max_pages),
        PathOrBytes::Bytes(bytes) => extract_pdf_text_from_bytes(bytes, max_pages),
    }
}

/// Extract text from a PDF file on disk.
pub fn extract_pdf_text_from_path(
    path: &Path,
    max_pages: Option<u32>,
) -> Result<PdfExtractResult> {
    let doc = lopdf::Document::load(path)
        .with_context(|| format!("Failed to load PDF from {}", path.display()))?;
    extract_pdf_from_doc(&doc, max_pages)
}

/// Extract text from PDF bytes in memory.
pub fn extract_pdf_text_from_bytes(
    bytes: &[u8],
    max_pages: Option<u32>,
) -> Result<PdfExtractResult> {
    let doc = lopdf::Document::load_mem(bytes).context("Failed to load PDF from memory")?;
    extract_pdf_from_doc(&doc, max_pages)
}

fn extract_pdf_from_doc(
    doc: &lopdf::Document,
    max_pages: Option<u32>,
) -> Result<PdfExtractResult> {
    let pages = doc.get_pages();
    let page_count = pages.len() as u32;
    let limit = max_pages.filter(|&m| m > 0).unwrap_or(page_count);
    let truncated = page_count > limit;

    let mut all_pages_text = Vec::new();
    for (&page_num, &page_id) in pages.iter().take(limit as usize) {
        let mut page_text = String::new();
        if let Ok(content_bytes) = doc.get_page_content(page_id) {
            if let Ok(content) = Content::decode(&content_bytes) {
                page_text = decode_content_operations(&content.operations);
            }
        }
        // Fallback to lopdf's built-in extractor if stream decoding yielded nothing
        // (e.g., Form XObjects or ToUnicode CMap-encoded fonts).
        if page_text.trim().is_empty() {
            if let Ok(fallback) = doc.extract_text(&[page_num]) {
                if !fallback.trim().is_empty() {
                    page_text = fallback;
                }
            }
        }
        let trimmed = page_text.trim();
        if !trimmed.is_empty() {
            all_pages_text.push(trimmed.to_string());
        }
    }

    Ok(PdfExtractResult {
        text: all_pages_text.join("\n\n"),
        page_count,
        truncated,
    })
}

fn decode_content_operations(operations: &[lopdf::content::Operation]) -> String {
    let mut out = String::new();

    for op in operations {
        match op.operator.as_str() {
            "Tj" => {
                if let Some(Object::String(bytes, _)) = op.operands.first() {
                    out.push_str(&decode_pdf_string(bytes));
                }
            }
            "'" => {
                push_newline_if_needed(&mut out);
                if let Some(Object::String(bytes, _)) = op.operands.first() {
                    out.push_str(&decode_pdf_string(bytes));
                }
            }
            "\"" => {
                push_newline_if_needed(&mut out);
                if let Some(Object::String(bytes, _)) = op.operands.get(2) {
                    out.push_str(&decode_pdf_string(bytes));
                }
            }
            "TJ" => {
                if let Some(Object::Array(items)) = op.operands.first() {
                    for item in items {
                        match item {
                            Object::String(bytes, _) => {
                                out.push_str(&decode_pdf_string(bytes));
                            }
                            Object::Integer(n) if *n < -100 => {
                                push_space_if_needed(&mut out);
                            }
                            Object::Real(n) if *n < -100.0 => {
                                push_space_if_needed(&mut out);
                            }
                            _ => {}
                        }
                    }
                }
            }
            "T*" => {
                push_newline_if_needed(&mut out);
            }
            "Td" | "TD" => {
                let tx = op.operands.first().and_then(object_as_f64).unwrap_or(0.0);
                let ty = op.operands.get(1).and_then(object_as_f64).unwrap_or(0.0);
                if ty.abs() > f64::EPSILON {
                    push_newline_if_needed(&mut out);
                } else if tx > 0.0 {
                    push_space_if_needed(&mut out);
                }
            }
            "ET" => {
                push_newline_if_needed(&mut out);
            }
            _ => {}
        }
    }

    out
}

fn object_as_f64(obj: &Object) -> Option<f64> {
    match obj {
        Object::Integer(i) => Some(*i as f64),
        Object::Real(r) => Some(*r as f64),
        _ => None,
    }
}

fn push_newline_if_needed(out: &mut String) {
    if !out.is_empty() && !out.ends_with('\n') {
        out.push('\n');
    }
}

fn push_space_if_needed(out: &mut String) {
    if !out.is_empty() && !out.ends_with(|c: char| c.is_whitespace()) {
        out.push(' ');
    }
}

/// Decode a PDF string object, handling UTF-16BE BOM, UTF-16LE BOM, UTF-8, and Latin-1 fallback.
pub fn decode_pdf_string(bytes: &[u8]) -> String {
    if bytes.starts_with(&[0xFE, 0xFF]) {
        let utf16: Vec<u16> = bytes[2..]
            .chunks_exact(2)
            .map(|c| u16::from_be_bytes([c[0], c[1]]))
            .collect();
        return String::from_utf16_lossy(&utf16);
    }
    if bytes.starts_with(&[0xFF, 0xFE]) {
        let utf16: Vec<u16> = bytes[2..]
            .chunks_exact(2)
            .map(|c| u16::from_le_bytes([c[0], c[1]]))
            .collect();
        return String::from_utf16_lossy(&utf16);
    }
    match std::str::from_utf8(bytes) {
        Ok(s) => s.to_string(),
        Err(_) => bytes.iter().map(|&b| b as char).collect(),
    }
}

/// Extract plain text from a `.docx` file or in-memory bytes.
pub fn extract_docx_text(input: PathOrBytes<'_>) -> Result<String> {
    match input {
        PathOrBytes::Path(path) => extract_docx_text_from_path(path),
        PathOrBytes::Bytes(bytes) => extract_docx_text_from_bytes(bytes),
    }
}

/// Extract plain text from a `.docx` file on disk.
pub fn extract_docx_text_from_path(path: &Path) -> Result<String> {
    let bytes = std::fs::read(path)
        .with_context(|| format!("Failed to read DOCX file {}", path.display()))?;
    extract_docx_text_from_bytes(&bytes)
}

/// Extract plain text from `.docx` bytes in memory (`word/document.xml`).
pub fn extract_docx_text_from_bytes(bytes: &[u8]) -> Result<String> {
    let cursor = Cursor::new(bytes);
    let mut archive = ZipArchive::new(cursor).context("Failed to open DOCX as ZIP archive")?;
    let mut doc_xml = archive
        .by_name("word/document.xml")
        .context("Missing word/document.xml in DOCX archive")?;

    let mut xml_content = String::new();
    doc_xml
        .read_to_string(&mut xml_content)
        .context("Failed to read word/document.xml as UTF-8")?;

    parse_docx_document_xml(&xml_content)
}

fn parse_docx_document_xml(xml: &str) -> Result<String> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(false);

    let mut out = String::new();
    let mut in_text = false;
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => match e.local_name().as_ref() {
                b"t" => in_text = true,
                b"tab" => out.push('\t'),
                b"br" | b"cr" => out.push('\n'),
                _ => {}
            },
            Ok(Event::Empty(e)) => match e.local_name().as_ref() {
                b"tab" => out.push('\t'),
                b"br" | b"cr" => out.push('\n'),
                _ => {}
            },
            Ok(Event::Text(e)) => {
                if in_text {
                    let unescaped = e.unescape().context("Failed to unescape DOCX XML text")?;
                    out.push_str(&unescaped);
                }
            }
            Ok(Event::End(e)) => match e.local_name().as_ref() {
                b"t" => in_text = false,
                b"p" => {
                    if !out.is_empty() && !out.ends_with('\n') {
                        out.push('\n');
                    }
                }
                _ => {}
            },
            Ok(Event::Eof) => break,
            Err(e) => return Err(anyhow!("DOCX XML parse error: {}", e)),
            _ => {}
        }
        buf.clear();
    }

    Ok(out.trim_end().to_string())
}

/// Run OCR on an image file or in-memory bytes.
pub fn ocr_image(input: PathOrBytes<'_>, lang_hint: Option<&str>) -> Result<OcrResult> {
    match input {
        PathOrBytes::Path(path) => ocr_image_from_path(path, lang_hint),
        PathOrBytes::Bytes(bytes) => ocr_image_from_bytes(bytes, lang_hint),
    }
}

/// Run OCR on an image file on disk.
pub fn ocr_image_from_path(path: &Path, lang_hint: Option<&str>) -> Result<OcrResult> {
    let bytes = std::fs::read(path)
        .with_context(|| format!("Failed to read image file {}", path.display()))?;
    ocr_image_from_bytes(&bytes, lang_hint)
}

/// Run OCR on image bytes in memory.
#[cfg(windows)]
pub fn ocr_image_from_bytes(bytes: &[u8], _lang_hint: Option<&str>) -> Result<OcrResult> {
    use windows::Graphics::Imaging::{BitmapAlphaMode, BitmapPixelFormat, SoftwareBitmap};
    use windows::Media::Ocr::OcrEngine;
    use windows::Storage::Streams::DataWriter;

    let img = image::load_from_memory(bytes).context("Failed to decode image for OCR")?;
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();

    if width == 0 || height == 0 {
        return Ok(OcrResult {
            supported: true,
            text: String::new(),
        });
    }

    // Convert RGBA8 -> BGRA8 for Windows SoftwareBitmap
    let mut bgra = rgba.into_raw();
    for chunk in bgra.chunks_exact_mut(4) {
        chunk.swap(0, 2);
    }

    let writer = DataWriter::new().context("Failed to create WinRT DataWriter")?;
    writer
        .WriteBytes(&bgra)
        .context("Failed to write BGRA bytes to DataWriter")?;
    let buffer = writer
        .DetachBuffer()
        .context("Failed to detach IBuffer from DataWriter")?;

    let bitmap = SoftwareBitmap::CreateCopyWithAlphaFromBuffer(
        &buffer,
        BitmapPixelFormat::Bgra8,
        width as i32,
        height as i32,
        BitmapAlphaMode::Premultiplied,
    )
    .context("Failed to create SoftwareBitmap from BGRA8 buffer")?;

    let engine = OcrEngine::TryCreateFromUserProfileLanguages()
        .context("Failed to create Windows OcrEngine from user profile languages")?;

    let result = engine
        .RecognizeAsync(&bitmap)
        .context("Failed to start Windows OCR RecognizeAsync")?
        .get()
        .context("Windows OCR RecognizeAsync failed")?;

    let text = result
        .Text()
        .context("Failed to read OCR result text")?
        .to_string();

    Ok(OcrResult {
        supported: true,
        text,
    })
}

/// Non-Windows stub returning `supported: false`.
#[cfg(not(windows))]
pub fn ocr_image_from_bytes(_bytes: &[u8], _lang_hint: Option<&str>) -> Result<OcrResult> {
    Ok(OcrResult {
        supported: false,
        text: String::new(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use lopdf::{dictionary, content::Operation, Document, Stream};
    use std::io::Write;
    use zip::write::SimpleFileOptions;

    #[test]
    fn test_decode_pdf_string_utf16be_bom_and_utf8() {
        // UTF-16BE BOM + "Hi"
        let utf16_be = [0xFE, 0xFF, 0x00, b'H', 0x00, b'i'];
        assert_eq!(decode_pdf_string(&utf16_be), "Hi");

        // UTF-8
        assert_eq!(decode_pdf_string(b"Hello PDF"), "Hello PDF");
    }

    #[test]
    fn test_extract_pdf_text_and_truncation() {
        let mut doc = Document::with_version("1.5");
        let pages_id = doc.new_object_id();
        let font_id = doc.add_object(dictionary! {
            "Type" => "Font",
            "Subtype" => "Type1",
            "BaseFont" => "Helvetica",
        });
        let resources_id = doc.add_object(dictionary! {
            "Font" => dictionary! {
                "F1" => font_id,
            },
        });

        let make_page = |doc: &mut Document, text: &str| {
            let content = Content {
                operations: vec![
                    Operation::new("BT", vec![]),
                    Operation::new("Tf", vec!["F1".into(), 12.into()]),
                    Operation::new("Td", vec![10.into(), 700.into()]),
                    Operation::new("Tj", vec![Object::string_literal(text)]),
                    Operation::new("ET", vec![]),
                ],
            };
            let content_id = doc.add_object(Stream::new(dictionary! {}, content.encode().unwrap()));
            doc.add_object(dictionary! {
                "Type" => "Page",
                "Parent" => pages_id,
                "Contents" => content_id,
                "Resources" => resources_id,
            })
        };

        let p1 = make_page(&mut doc, "Page One");
        let p2 = make_page(&mut doc, "Page Two");

        let pages = dictionary! {
            "Type" => "Pages",
            "Kids" => vec![p1.into(), p2.into()],
            "Count" => 2,
        };
        doc.objects.insert(pages_id, Object::Dictionary(pages));
        let catalog_id = doc.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
        });
        doc.trailer.set("Root", catalog_id);

        let mut buf = Vec::new();
        doc.save_to(&mut buf).unwrap();

        let full = extract_pdf_text_from_bytes(&buf, None).unwrap();
        assert_eq!(full.page_count, 2);
        assert!(!full.truncated);
        assert!(full.text.contains("Page One"));
        assert!(full.text.contains("Page Two"));

        let limited = extract_pdf_text_from_bytes(&buf, Some(1)).unwrap();
        assert_eq!(limited.page_count, 2);
        assert!(limited.truncated);
        assert!(limited.text.contains("Page One"));
        assert!(!limited.text.contains("Page Two"));
    }

    #[test]
    fn test_extract_docx_text() {
        let mut buf = Vec::new();
        {
            let cursor = Cursor::new(&mut buf);
            let mut zip = zip::ZipWriter::new(cursor);
            zip.start_file("word/document.xml", SimpleFileOptions::default())
                .unwrap();
            let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Hello</w:t><w:tab/><w:t>World</w:t></w:r></w:p>
    <w:p><w:r><w:t>Line 2</w:t><w:br/><w:t>Line 3</w:t></w:r></w:p>
  </w:body>
</w:document>"#;
            zip.write_all(xml.as_bytes()).unwrap();
            zip.finish().unwrap();
        }

        let extracted = extract_docx_text_from_bytes(&buf).unwrap();
        assert_eq!(extracted, "Hello\tWorld\nLine 2\nLine 3");
    }

    #[test]
    fn test_ocr_image_blank_png() {
        let img = image::RgbaImage::from_pixel(32, 32, image::Rgba([255, 255, 255, 255]));
        let mut png_bytes = Vec::new();
        image::DynamicImage::ImageRgba8(img)
            .write_to(&mut Cursor::new(&mut png_bytes), image::ImageFormat::Png)
            .unwrap();

        let res = ocr_image_from_bytes(&png_bytes, Some("eng")).unwrap();
        if cfg!(windows) {
            assert!(res.supported);
        } else {
            assert!(!res.supported);
            assert!(res.text.is_empty());
        }
    }
}

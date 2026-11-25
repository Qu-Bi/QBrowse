pub mod docs;
pub mod download;

pub use docs::{
    decode_pdf_string, extract_docx_text, extract_docx_text_from_bytes,
    extract_docx_text_from_path, extract_pdf_text, extract_pdf_text_from_bytes,
    extract_pdf_text_from_path, ocr_image, ocr_image_from_bytes, ocr_image_from_path, OcrResult,
    PathOrBytes, PdfExtractResult,
};
pub use download::{
    check_llama_health, download_file_resumable, extract_archive_safe, find_matching_mmproj,
    parse_ddg_html, search_web_ddg, DownloadProgress, WebSearchResult,
};

pub fn ping() -> &'static str {
    "qbrowse-ai"
}

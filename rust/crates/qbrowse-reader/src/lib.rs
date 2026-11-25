use ammonia::Builder;
use once_cell::sync::Lazy;
use regex::Regex;
use scraper::{ElementRef, Html, Selector};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use url::Url;

static UNLIKELY_CANDIDATES_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote|cookie|consent|newsletter")
        .expect("valid regex")
});

static OK_CANDIDATE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)and|article|body|column|content|main|shadow|entry|post|story")
        .expect("valid regex")
});

static POSITIVE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)article|body|content|entry|hentry|h-entry|main|page|pagination|post|text|blog|story")
        .expect("valid regex")
});

static NEGATIVE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)hidden|^hid$| hid$| hid |^hid |banner|combx|comment|com-|contact|foot|footer|footnote|gdpr|masthead|media|meta|outbrain|promo|related|scroll|share|shoutbox|sidebar|skyscraper|sponsor|shopping|tags|tool|widget|cookie|consent|ads|ad-")
        .expect("valid regex")
});

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TtsBlock {
    pub id: String,
    pub text: String,
    pub tag: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReaderArticle {
    pub title: String,
    pub byline: String,
    pub site_name: String,
    pub excerpt: String,
    pub lead_image: String,
    pub published_time: String,
    pub lang: String,
    pub word_count: usize,
    pub reading_time_minutes: usize,
    pub content_html: String,
    pub tts_blocks: Vec<TtsBlock>,
}

fn normalize_ws(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn is_element_hidden(el: &ElementRef) -> bool {
    let val = el.value();
    if val.attr("hidden").is_some() {
        return true;
    }
    if val.attr("aria-hidden") == Some("true") {
        return true;
    }
    if let Some(style) = val.attr("style") {
        let s = style.to_lowercase().replace(' ', "");
        if s.contains("display:none") || s.contains("visibility:hidden") {
            return true;
        }
    }
    false
}

fn has_boilerplate_ancestor(el: &ElementRef) -> bool {
    let mut cur = el.parent();
    while let Some(node) = cur {
        if let Some(parent_el) = ElementRef::wrap(node) {
            let tag = parent_el.value().name();
            if matches!(tag, "nav" | "footer" | "header" | "aside" | "script" | "style" | "noscript" | "form") {
                return true;
            }
            if let Some(role) = parent_el.value().attr("role") {
                if matches!(role, "navigation" | "banner" | "contentinfo" | "complementary") {
                    return true;
                }
            }
            let cls = parent_el.value().attr("class").unwrap_or("");
            let id = parent_el.value().attr("id").unwrap_or("");
            let combined = format!("{} {}", cls, id);
            if combined.contains("sidebar")
                || combined.contains("comments")
                || combined.contains("cookie")
                || combined.contains("consent")
                || combined.contains("nav")
                || combined.contains("footer")
            {
                if !OK_CANDIDATE_RE.is_match(&combined) {
                    return true;
                }
            }
        }
        cur = node.parent();
    }
    false
}

fn link_density(el: &ElementRef) -> f64 {
    let total_len = normalize_ws(&el.text().collect::<String>()).len();
    if total_len == 0 {
        return 1.0;
    }
    let a_sel = Selector::parse("a").unwrap();
    let link_len: usize = el
        .select(&a_sel)
        .map(|a| normalize_ws(&a.text().collect::<String>()).len())
        .sum();
    link_len as f64 / total_len as f64
}

pub fn check_is_article(html: &str, url: &str) -> bool {
    if html.len() < 350 {
        return false;
    }
    if !url.is_empty() {
        if let Ok(parsed) = Url::parse(url) {
            if parsed.path() == "/" || parsed.path().is_empty() {
                return false;
            }
        }
    }

    let doc = Html::parse_document(html);
    let sel = Selector::parse("p, pre, article, [itemprop='articleBody']").unwrap();
    let mut score = 0.0_f64;
    let min_content_len = 120usize;
    let min_score = 20.0_f64;

    for node in doc.select(&sel) {
        if is_element_hidden(&node) || has_boilerplate_ancestor(&node) {
            continue;
        }
        let cls = node.value().attr("class").unwrap_or("");
        let id = node.value().attr("id").unwrap_or("");
        let match_str = format!("{} {}", cls, id);
        if UNLIKELY_CANDIDATES_RE.is_match(&match_str) && !OK_CANDIDATE_RE.is_match(&match_str) {
            continue;
        }
        let text = normalize_ws(&node.text().collect::<String>());
        if text.len() < min_content_len {
            continue;
        }
        if link_density(&node) > 0.5 {
            continue;
        }
        score += ((text.len() - min_content_len) as f64).sqrt();
        if score > min_score {
            return true;
        }
    }

    false
}

fn first_meta_content(doc: &Html, selectors: &[&str]) -> String {
    for s in selectors {
        if let Ok(sel) = Selector::parse(s) {
            if let Some(el) = doc.select(&sel).next() {
                if let Some(content) = el.value().attr("content") {
                    let trimmed = content.trim();
                    if !trimmed.is_empty() {
                        return trimmed.to_string();
                    }
                }
            }
        }
    }
    String::new()
}

fn first_element_text(doc: &Html, selector: &str) -> String {
    if let Ok(sel) = Selector::parse(selector) {
        if let Some(el) = doc.select(&sel).next() {
            return normalize_ws(&el.text().collect::<String>());
        }
    }
    String::new()
}

fn resolve_url(base: Option<&Url>, raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    if trimmed.starts_with("data:") || trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        return trimmed.to_string();
    }
    if let Some(b) = base {
        if let Ok(joined) = b.join(trimmed) {
            return joined.to_string();
        }
    }
    trimmed.to_string()
}

fn is_boilerplate_element(el: &ElementRef) -> bool {
    let tag = el.value().name();
    if matches!(
        tag,
        "script" | "style" | "noscript" | "iframe" | "svg" | "nav" | "footer" | "aside" | "form" | "button"
    ) {
        return true;
    }
    if is_element_hidden(el) {
        return true;
    }
    if let Some(role) = el.value().attr("role") {
        if matches!(role, "navigation" | "banner" | "contentinfo" | "complementary") {
            return true;
        }
    }
    let cls = el.value().attr("class").unwrap_or("");
    let id = el.value().attr("id").unwrap_or("");
    let combined = format!("{} {}", cls, id).to_lowercase();
    if combined.contains("onetrust")
        || combined.contains("cookiebot")
        || combined.contains("cookie-banner")
        || combined.contains("cookie-consent")
        || combined.contains("comments")
        || combined.contains("disqus")
        || combined.contains("sidebar")
        || combined.contains("advertisement")
        || combined.split_whitespace().any(|t| t == "ad" || t == "ads")
    {
        return true;
    }
    false
}

fn score_candidate(el: &ElementRef) -> f64 {
    if is_element_hidden(el) || is_boilerplate_element(el) {
        return f64::NEG_INFINITY;
    }

    let tag = el.value().name();
    let mut score = match tag {
        "article" => 35.0,
        "main" => 30.0,
        "section" => 10.0,
        "div" => 5.0,
        _ => 0.0,
    };

    if el.value().attr("role") == Some("main") {
        score += 25.0;
    }
    if el.value().attr("itemprop") == Some("articleBody") {
        score += 35.0;
    }

    let cls = el.value().attr("class").unwrap_or("");
    let id = el.value().attr("id").unwrap_or("");
    let weight_str = format!("{} {}", cls, id);
    if POSITIVE_RE.is_match(&weight_str) {
        score += 25.0;
    }
    if NEGATIVE_RE.is_match(&weight_str) {
        score -= 25.0;
    }

    let p_sel = Selector::parse("p").unwrap();
    let mut p_text_len = 0usize;
    let mut p_count = 0usize;
    for p in el.select(&p_sel) {
        if is_boilerplate_element(&p) {
            continue;
        }
        let t = normalize_ws(&p.text().collect::<String>());
        if t.len() >= 25 {
            p_count += 1;
            p_text_len += t.len();
            score += 1.0;
            score += (t.matches(',').count() as f64).min(3.0);
            score += ((t.len() as f64) / 100.0).min(3.0);
        }
    }

    if p_count == 0 {
        let own_len = normalize_ws(&el.text().collect::<String>()).len();
        if own_len < 120 {
            return f64::NEG_INFINITY;
        }
        score += (own_len as f64 / 120.0).min(15.0);
    } else {
        score += (p_text_len as f64 / 80.0).min(40.0);
    }

    let density = link_density(el);
    score * (1.0 - density.min(0.9))
}

fn serialize_clean_subtree(el: &ElementRef, base: Option<&Url>, out: &mut String) {
    for child in el.children() {
        match child.value() {
            scraper::Node::Text(t) => {
                out.push_str(&html_escape_text(t));
            }
            scraper::Node::Element(elem) => {
                let child_ref = ElementRef::wrap(child).unwrap();
                if is_boilerplate_element(&child_ref) {
                    continue;
                }
                let tag = elem.name();
                if tag == "header" {
                    // Keep h1-h6 inside header if it's inside article, skip nav/meta headers
                    let has_h1 = Selector::parse("h1, h2").ok().map(|s| child_ref.select(&s).next().is_some()).unwrap_or(false);
                    if !has_h1 {
                        continue;
                    }
                }

                out.push('<');
                out.push_str(tag);

                if tag == "a" {
                    if let Some(href) = elem.attr("href") {
                        let resolved = resolve_url(base, href);
                        if !resolved.is_empty() {
                            out.push_str(" href=\"");
                            out.push_str(&html_escape_attr(&resolved));
                            out.push('"');
                        }
                    }
                    out.push_str(" target=\"_blank\" rel=\"noopener noreferrer\"");
                } else if tag == "img" {
                    let src_raw = elem
                        .attr("src")
                        .or_else(|| elem.attr("data-src"))
                        .or_else(|| elem.attr("data-original"))
                        .unwrap_or("");
                    let resolved = resolve_url(base, src_raw);
                    if !resolved.is_empty() {
                        out.push_str(" src=\"");
                        out.push_str(&html_escape_attr(&resolved));
                        out.push('"');
                    }
                    if let Some(alt) = elem.attr("alt") {
                        out.push_str(" alt=\"");
                        out.push_str(&html_escape_attr(alt));
                        out.push('"');
                    }
                    out.push_str(" loading=\"lazy\" class=\"reader-image\"");
                }

                out.push('>');
                if !matches!(tag, "img" | "br" | "hr") {
                    serialize_clean_subtree(&child_ref, base, out);
                    out.push_str("</");
                    out.push_str(tag);
                    out.push('>');
                }
            }
            _ => {}
        }
    }
}

fn html_escape_text(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn html_escape_attr(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn sanitize_with_ammonia(raw_html: &str) -> String {
    let tags: HashSet<&str> = [
        "p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "ul", "ol", "li", "a", "img",
        "strong", "em", "b", "i", "u", "s", "code", "pre", "br", "hr", "figure", "figcaption",
        "table", "thead", "tbody", "tr", "th", "td", "div", "span", "section", "article",
    ]
    .into_iter()
    .collect();

    let mut tag_attrs: HashMap<&str, HashSet<&str>> = HashMap::new();
    tag_attrs.insert("a", ["href", "target", "title"].into_iter().collect());
    tag_attrs.insert("img", ["src", "alt", "title", "loading", "class"].into_iter().collect());

    let generic_attrs: HashSet<&str> = ["data-tts-id", "class"].into_iter().collect();

    Builder::new()
        .tags(tags)
        .tag_attributes(tag_attrs)
        .generic_attributes(generic_attrs)
        .clean_content_tags(["script", "style"].into_iter().collect())
        .link_rel(Some("noopener noreferrer"))
        .clean(raw_html)
        .to_string()
}

fn annotate_tts_blocks(sanitized_html: &str) -> (String, Vec<TtsBlock>, String, String) {
    let frag = Html::parse_fragment(sanitized_html);
    let mut tts_blocks = Vec::new();
    let mut full_text = String::new();
    let mut first_img = String::new();

    if let Ok(img_sel) = Selector::parse("img") {
        if let Some(img) = frag.select(&img_sel).next() {
            if let Some(src) = img.value().attr("src") {
                first_img = src.to_string();
            }
        }
    }

    let mut out = String::with_capacity(sanitized_html.len() + 256);
    let mut block_idx = 0usize;

    fn walk_annotate(
        el: ElementRef,
        out: &mut String,
        tts_blocks: &mut Vec<TtsBlock>,
        full_text: &mut String,
        block_idx: &mut usize,
    ) {
        for child in el.children() {
            match child.value() {
                scraper::Node::Text(t) => {
                    out.push_str(&html_escape_text(&t));
                }
                scraper::Node::Element(elem) => {
                    let el_ref = ElementRef::wrap(child).unwrap();
                    let tag = elem.name();
                    let is_block_tag = matches!(
                        tag,
                        "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "blockquote" | "li"
                    );
                    let text = normalize_ws(&el_ref.text().collect::<String>());
                    let mut assigned_tts_id: Option<String> = None;

                    if is_block_tag && text.len() > 5 {
                        let id = format!("tts-block-{}", *block_idx);
                        *block_idx += 1;
                        tts_blocks.push(TtsBlock {
                            id: id.clone(),
                            text: text.clone(),
                            tag: tag.to_string(),
                        });
                        if !full_text.is_empty() {
                            full_text.push(' ');
                        }
                        full_text.push_str(&text);
                        assigned_tts_id = Some(id);
                    }

                    out.push('<');
                    out.push_str(tag);
                    let mut has_class = false;
                    for (k, v) in elem.attrs() {
                        if k == "data-tts-id" {
                            continue;
                        }
                        if k == "class" {
                            has_class = true;
                            out.push_str(" class=\"");
                            out.push_str(&html_escape_attr(v));
                            if assigned_tts_id.is_some() && !v.contains("reader-block") {
                                out.push_str(" reader-block");
                            }
                            out.push('"');
                        } else {
                            out.push(' ');
                            out.push_str(k);
                            out.push_str("=\"");
                            out.push_str(&html_escape_attr(v));
                            out.push('"');
                        }
                    }
                    if let Some(ref tts_id) = assigned_tts_id {
                        if !has_class {
                            out.push_str(" class=\"reader-block\"");
                        }
                        out.push_str(" data-tts-id=\"");
                        out.push_str(tts_id);
                        out.push('"');
                    }
                    out.push('>');

                    if !matches!(tag, "img" | "br" | "hr") {
                        walk_annotate(el_ref, out, tts_blocks, full_text, block_idx);
                        out.push_str("</");
                        out.push_str(tag);
                        out.push('>');
                    }
                }
                _ => {}
            }
        }
    }

    walk_annotate(
        frag.root_element(),
        &mut out,
        &mut tts_blocks,
        &mut full_text,
        &mut block_idx,
    );

    (out, tts_blocks, full_text, first_img)
}

pub fn extract_reader_article(html: &str, base_url: &str) -> anyhow::Result<ReaderArticle> {
    if html.trim().is_empty() {
        anyhow::bail!("Empty HTML document");
    }

    let parsed_base = Url::parse(base_url).ok();
    let doc = Html::parse_document(html);

    let title = {
        let og = first_meta_content(
            &doc,
            &[
                "meta[property='og:title']",
                "meta[name='twitter:title']",
            ],
        );
        if !og.is_empty() {
            og
        } else {
            let doc_title = first_element_text(&doc, "title");
            if !doc_title.is_empty() {
                doc_title
            } else {
                let h1 = first_element_text(&doc, "h1");
                if h1.is_empty() {
                    "Untitled Article".to_string()
                } else {
                    h1
                }
            }
        }
    };

    let byline = {
        let m = first_meta_content(
            &doc,
            &[
                "meta[name='author']",
                "meta[property='article:author']",
            ],
        );
        if !m.is_empty() {
            m
        } else {
            let r = first_element_text(&doc, "[rel='author'], [itemprop='author'], .byline");
            r
        }
    };

    let domain = parsed_base
        .as_ref()
        .and_then(|u| u.host_str())
        .map(|h| h.trim_start_matches("www.").to_string())
        .unwrap_or_default();

    let site_name = {
        let og = first_meta_content(&doc, &["meta[property='og:site_name']"]);
        if !og.is_empty() {
            og
        } else {
            domain
        }
    };

    let og_image = first_meta_content(
        &doc,
        &[
            "meta[property='og:image']",
            "meta[name='twitter:image']",
        ],
    );
    let lead_image_meta = resolve_url(parsed_base.as_ref(), &og_image);

    let published_time = {
        let meta_time = first_meta_content(&doc, &["meta[property='article:published_time']"]);
        if !meta_time.is_empty() {
            meta_time
        } else if let Ok(sel) = Selector::parse("time") {
            if let Some(el) = doc.select(&sel).next() {
                el.value()
                    .attr("datetime")
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .unwrap_or_else(|| normalize_ws(&el.text().collect::<String>()))
            } else {
                String::new()
            }
        } else {
            String::new()
        }
    };

    let lang = {
        let html_lang = Selector::parse("html")
            .ok()
            .and_then(|s| doc.select(&s).next())
            .and_then(|el| el.value().attr("lang"))
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        if !html_lang.is_empty() {
            html_lang
        } else {
            first_meta_content(&doc, &["meta[http-equiv='content-language']"])
        }
    };

    let meta_excerpt = first_meta_content(
        &doc,
        &[
            "meta[property='og:description']",
            "meta[name='description']",
        ],
    );

    // Score candidate containers
    let candidate_sel =
        Selector::parse("article, main, [role='main'], [itemprop='articleBody'], section, div")
            .unwrap();
    let mut best_node: Option<ElementRef> = None;
    let mut best_score = f64::NEG_INFINITY;

    for el in doc.select(&candidate_sel) {
        let s = score_candidate(&el);
        if s > best_score {
            best_score = s;
            best_node = Some(el);
        }
    }

    let raw_extracted = if let Some(node) = best_node {
        let mut buf = String::new();
        serialize_clean_subtree(&node, parsed_base.as_ref(), &mut buf);
        buf
    } else if let Some(body) = Selector::parse("body").ok().and_then(|s| doc.select(&s).next()) {
        let mut buf = String::new();
        serialize_clean_subtree(&body, parsed_base.as_ref(), &mut buf);
        buf
    } else {
        String::new()
    };

    let sanitized = sanitize_with_ammonia(&raw_extracted);
    let (content_html, tts_blocks, full_text, first_img) = annotate_tts_blocks(&sanitized);

    let lead_image = if !lead_image_meta.is_empty() {
        lead_image_meta
    } else {
        first_img
    };

    let excerpt = if !meta_excerpt.is_empty() {
        meta_excerpt
    } else {
        tts_blocks
            .first()
            .map(|b| b.text.clone())
            .unwrap_or_default()
    };

    let word_count = full_text.split_whitespace().count();
    let reading_time_minutes = ((word_count as f64) / 220.0).ceil().max(1.0) as usize;

    Ok(ReaderArticle {
        title,
        byline,
        site_name,
        excerpt,
        lead_image,
        published_time,
        lang,
        word_count,
        reading_time_minutes,
        content_html,
        tts_blocks,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_article_strips_boilerplate_resolves_urls_and_annotates_tts() {
        let html = r#"
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>Deep Dive into Rust</title>
            <meta name="author" content="Jane Doe">
            <meta property="og:site_name" content="TechJournal">
            <meta property="og:image" content="/images/cover.png">
            <meta property="article:published_time" content="2026-01-15T10:00:00Z">
        </head>
        <body>
            <nav><a href="/home">Home</a><a href="/about">About</a></nav>
            <div class="cookie-banner">Accept cookies</div>
            <main>
                <article>
                    <h1>Understanding Zero-Cost Abstractions</h1>
                    <p>Rust provides memory safety without garbage collection, enabling predictable high-throughput systems programming across desktop and embedded targets.</p>
                    <p>By compiling ownership checks at build time, developers eliminate entire classes of data races and dangling pointer bugs before shipping code.</p>
                    <img src="/assets/diagram.svg" alt="Ownership diagram">
                    <a href="/next-part">Read Part Two</a>
                    <script>alert('xss')</script>
                </article>
            </main>
            <aside class="sidebar">Related Ads</aside>
            <footer>Copyright 2026</footer>
        </body>
        </html>
        "#;

        let article = extract_reader_article(html, "https://techjournal.example.com/posts/rust")
            .expect("should extract article");

        assert_eq!(article.title, "Deep Dive into Rust");
        assert_eq!(article.byline, "Jane Doe");
        assert_eq!(article.site_name, "TechJournal");
        assert_eq!(
            article.lead_image,
            "https://techjournal.example.com/images/cover.png"
        );
        assert_eq!(article.published_time, "2026-01-15T10:00:00Z");
        assert_eq!(article.lang, "en");
        assert!(article.word_count >= 30);
        assert!(article.reading_time_minutes >= 1);

        // Boilerplate and XSS stripped
        assert!(!article.content_html.contains("alert('xss')"));
        assert!(!article.content_html.contains("Accept cookies"));
        assert!(!article.content_html.contains("Copyright 2026"));

        // Relative URLs resolved
        assert!(article
            .content_html
            .contains("https://techjournal.example.com/assets/diagram.svg"));
        assert!(article
            .content_html
            .contains("https://techjournal.example.com/next-part"));

        // Sequential TTS blocks
        assert!(article.tts_blocks.len() >= 3);
        assert_eq!(article.tts_blocks[0].id, "tts-block-0");
        assert_eq!(article.tts_blocks[1].id, "tts-block-1");
        assert!(article.content_html.contains("data-tts-id=\"tts-block-0\""));
    }

    #[test]
    fn check_is_article_rejects_root_and_accepts_article() {
        let html = r#"<html><body><article><p>This is a sufficiently long paragraph with more than one hundred and twenty characters of meaningful prose about browser architecture and Rust native modules.</p><p>Another long paragraph with over one hundred and twenty characters of meaningful prose explaining how reader mode scoring works in detail.</p></article></body></html>"#;
        assert!(!check_is_article(html, "https://example.com/"));
        assert!(check_is_article(html, "https://example.com/post/123"));
    }
}

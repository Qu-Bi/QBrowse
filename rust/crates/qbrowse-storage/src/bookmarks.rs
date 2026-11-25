use anyhow::{Context, Result};
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedBookmark {
    pub title: String,
    pub url: String,
    pub folder: String,
    pub added_at: i64,
}

/// Converts Chrome/WebKit timestamp (microseconds since 1601-01-01 UTC) to Unix milliseconds.
fn webkit_to_unix_ms(raw: Option<&Value>) -> i64 {
    const WEBKIT_UNIX_EPOCH_DIFF_US: i64 = 11_644_473_600_000_000;
    let Some(val) = raw else {
        return 0;
    };
    let us = match val {
        Value::String(s) => s.trim().parse::<i64>().unwrap_or(0),
        Value::Number(n) => n.as_i64().unwrap_or(0),
        _ => 0,
    };
    if us <= 0 {
        return 0;
    }
    if us > WEBKIT_UNIX_EPOCH_DIFF_US {
        (us - WEBKIT_UNIX_EPOCH_DIFF_US) / 1000
    } else if us > 1_000_000_000_000 {
        // Already milliseconds
        us
    } else {
        // Seconds
        us * 1000
    }
}

fn collect_chrome_nodes(node: &Value, folder_path: &str, out: &mut Vec<NormalizedBookmark>) {
    let Some(obj) = node.as_object() else {
        return;
    };
    let node_type = obj.get("type").and_then(|v| v.as_str()).unwrap_or("");
    let name = obj
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();

    if node_type == "url" {
        if let Some(url) = obj.get("url").and_then(|v| v.as_str()) {
            let url = url.trim();
            if !url.is_empty() {
                out.push(NormalizedBookmark {
                    title: if name.is_empty() {
                        url.to_string()
                    } else {
                        name.to_string()
                    },
                    url: url.to_string(),
                    folder: folder_path.to_string(),
                    added_at: webkit_to_unix_ms(obj.get("date_added")),
                });
            }
        }
        return;
    }

    if let Some(children) = obj.get("children").and_then(|v| v.as_array()) {
        let next_folder = if name.is_empty() {
            folder_path.to_string()
        } else if folder_path.is_empty() {
            name.to_string()
        } else {
            format!("{folder_path}/{name}")
        };
        for child in children {
            collect_chrome_nodes(child, &next_folder, out);
        }
    }
}

/// Imports Chrome / Edge / Brave / Opera `Bookmarks` JSON into a normalized list.
pub fn import_bookmarks_json(content: &str) -> Result<Vec<NormalizedBookmark>> {
    let root: Value =
        serde_json::from_str(content).context("Failed to parse Chrome/Chromium Bookmarks JSON")?;
    let mut out = Vec::new();

    if let Some(roots) = root.get("roots").and_then(|v| v.as_object()) {
        for (_key, root_node) in roots {
            collect_chrome_nodes(root_node, "", &mut out);
        }
    } else if root.is_array() {
        if let Some(arr) = root.as_array() {
            for item in arr {
                collect_chrome_nodes(item, "", &mut out);
            }
        }
    } else {
        collect_chrome_nodes(&root, "", &mut out);
    }

    Ok(out)
}

fn parse_add_date(raw: Option<&str>) -> i64 {
    let Some(s) = raw else {
        return 0;
    };
    let n = s.trim().parse::<i64>().unwrap_or(0);
    if n <= 0 {
        return 0;
    }
    if n > 1_000_000_000_000 {
        n
    } else {
        n * 1000
    }
}

fn walk_dl_element(
    el: scraper::ElementRef<'_>,
    folder_stack: &mut Vec<String>,
    out: &mut Vec<NormalizedBookmark>,
) {
    let mut pending_folder: Option<String> = None;

    for child in el.children() {
        let Some(child_el) = scraper::ElementRef::wrap(child) else {
            continue;
        };
        let tag = child_el.value().name().to_ascii_lowercase();

        match tag.as_str() {
            "dt" => {
                // Inside <DT> we can have <H3> (folder name), <A> (bookmark), and/or nested <DL>
                let h3_sel = Selector::parse("h3").unwrap();
                let a_sel = Selector::parse("a").unwrap();
                let dl_sel = Selector::parse("dl").unwrap();

                // Check direct or first H3
                if let Some(h3) = child_el.select(&h3_sel).next() {
                    // Only treat as folder header if this DT doesn't just wrap a deeper structure
                    let folder_name = h3.text().collect::<String>().trim().to_string();
                    if !folder_name.is_empty() {
                        pending_folder = Some(folder_name);
                    }
                }

                // Check if this DT has a direct <A> bookmark
                for a in child_el.children().filter_map(scraper::ElementRef::wrap) {
                    if a.value().name().eq_ignore_ascii_case("a") {
                        if let Some(href) = a.value().attr("href") {
                            let url = href.trim();
                            if !url.is_empty() {
                                let title = a.text().collect::<String>().trim().to_string();
                                let added_at = parse_add_date(a.value().attr("add_date"));
                                out.push(NormalizedBookmark {
                                    title: if title.is_empty() {
                                        url.to_string()
                                    } else {
                                        title
                                    },
                                    url: url.to_string(),
                                    folder: folder_stack.join("/"),
                                    added_at,
                                });
                            }
                        }
                    }
                }

                // Check for nested <DL> inside <DT> (standard Netscape HTML)
                for nested in child_el.children().filter_map(scraper::ElementRef::wrap) {
                    if nested.value().name().eq_ignore_ascii_case("dl") {
                        let pushed = if let Some(name) = pending_folder.take() {
                            folder_stack.push(name);
                            true
                        } else {
                            false
                        };
                        walk_dl_element(nested, folder_stack, out);
                        if pushed {
                            folder_stack.pop();
                        }
                    }
                }

                // Fallback: if <A> was nested inside <DT> without direct child match (e.g. <DT><P><A>)
                if child_el
                    .children()
                    .filter_map(scraper::ElementRef::wrap)
                    .all(|c| !c.value().name().eq_ignore_ascii_case("a"))
                    && child_el.select(&dl_sel).next().is_none()
                {
                    if let Some(a) = child_el.select(&a_sel).next() {
                        if let Some(href) = a.value().attr("href") {
                            let url = href.trim();
                            if !url.is_empty() {
                                let title = a.text().collect::<String>().trim().to_string();
                                let added_at = parse_add_date(a.value().attr("add_date"));
                                out.push(NormalizedBookmark {
                                    title: if title.is_empty() {
                                        url.to_string()
                                    } else {
                                        title
                                    },
                                    url: url.to_string(),
                                    folder: folder_stack.join("/"),
                                    added_at,
                                });
                            }
                        }
                    }
                }
            }
            "dl" => {
                let pushed = if let Some(name) = pending_folder.take() {
                    folder_stack.push(name);
                    true
                } else {
                    false
                };
                walk_dl_element(child_el, folder_stack, out);
                if pushed {
                    folder_stack.pop();
                }
            }
            "h3" => {
                let folder_name = child_el.text().collect::<String>().trim().to_string();
                if !folder_name.is_empty() {
                    pending_folder = Some(folder_name);
                }
            }
            "a" => {
                if let Some(href) = child_el.value().attr("href") {
                    let url = href.trim();
                    if !url.is_empty() {
                        let title = child_el.text().collect::<String>().trim().to_string();
                        let added_at = parse_add_date(child_el.value().attr("add_date"));
                        out.push(NormalizedBookmark {
                            title: if title.is_empty() {
                                url.to_string()
                            } else {
                                title
                            },
                            url: url.to_string(),
                            folder: folder_stack.join("/"),
                            added_at,
                        });
                    }
                }
            }
            "p" => {
                // Netscape bookmark files often wrap <DT> inside <P> or vice versa
                walk_dl_element(child_el, folder_stack, out);
            }
            _ => {}
        }
    }
}

/// Imports Netscape Bookmark HTML format into a normalized list.
pub fn import_bookmarks_html(content: &str) -> Result<Vec<NormalizedBookmark>> {
    let doc = Html::parse_document(content);
    let dl_sel = Selector::parse("dl").unwrap();
    let mut out = Vec::new();
    let mut folder_stack = Vec::new();

    if let Some(root_dl) = doc.select(&dl_sel).next() {
        walk_dl_element(root_dl, &mut folder_stack, &mut out);
    } else {
        // Fallback: collect all <a href="...">
        let a_sel = Selector::parse("a[href]").unwrap();
        for a in doc.select(&a_sel) {
            if let Some(href) = a.value().attr("href") {
                let url = href.trim();
                if !url.is_empty() {
                    let title = a.text().collect::<String>().trim().to_string();
                    out.push(NormalizedBookmark {
                        title: if title.is_empty() {
                            url.to_string()
                        } else {
                            title
                        },
                        url: url.to_string(),
                        folder: String::new(),
                        added_at: parse_add_date(a.value().attr("add_date")),
                    });
                }
            }
        }
    }

    Ok(out)
}

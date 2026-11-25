pub mod bangs;
pub mod bookmarks;
pub mod history;
pub mod history_extractors;
pub mod permissions;
pub mod settings;

use anyhow::{Context, Result};
use dashmap::DashMap;
use parking_lot::Mutex;
use rusqlite::Connection;
use std::collections::HashMap;
use std::path::Path;

pub use bangs::{builtin_bang_count, resolve_bang, suggest_bangs, BangResolution, SearchBang};
pub use bookmarks::{import_bookmarks_html, import_bookmarks_json, NormalizedBookmark};
pub use history::HistoryEntry;
pub use history_extractors::{
    extract_rich_history_meta, format_display_domain, get_history_dedupe_key,
    get_intelligent_title, is_junk_history_url, strip_tracking_params, RichHistoryMeta,
};
pub use permissions::{extract_origin, normalize_permission_key, SitePermissionEntry};

pub fn ping() -> &'static str {
    "qbrowse-storage"
}

pub struct StorageEngine {
    conn: Mutex<Connection>,
    ephemeral_permissions: DashMap<(String, String, String), String>,
    settings_cache: DashMap<String, String>,
}

impl StorageEngine {
    /// Opens or creates `qbrowse.db` at `db_path` in WAL mode
    /// and optionally migrates a legacy `site-permissions.json` file.
    pub fn open(db_path: impl AsRef<Path>, legacy_permissions_json: Option<&Path>) -> Result<Self> {
        let path = db_path.as_ref();
        if let Some(parent) = path.parent() {
            if !parent.as_os_str().is_empty() {
                std::fs::create_dir_all(parent).with_context(|| {
                    format!("Failed to create storage directory {}", parent.display())
                })?;
            }
        }

        let conn = Connection::open(path)
            .with_context(|| format!("Failed to open SQLite database at {}", path.display()))?;
        Self::init_connection(conn, legacy_permissions_json)
    }

    /// Opens an in-memory SQLite database (useful for unit tests).
    pub fn open_in_memory(legacy_permissions_json: Option<&Path>) -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        Self::init_connection(conn, legacy_permissions_json)
    }

    fn init_connection(
        mut conn: Connection,
        legacy_permissions_json: Option<&Path>,
    ) -> Result<Self> {
        conn.execute_batch(
            r#"
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA temp_store = MEMORY;
            PRAGMA foreign_keys = ON;
            "#,
        )
        .context("Failed to configure SQLite PRAGMAs")?;

        history::init_history_schema(&conn)?;
        permissions::init_permissions_schema(&conn)?;
        settings::init_settings_and_annotations_schema(&conn)?;

        if let Some(legacy_path) = legacy_permissions_json {
            let _ = permissions::migrate_permissions_json_file(&mut conn, legacy_path)?;
        }

        let settings_cache = DashMap::new();
        settings::load_settings_cache(&conn, &settings_cache)?;

        Ok(Self {
            conn: Mutex::new(conn),
            ephemeral_permissions: DashMap::new(),
            settings_cache,
        })
    }

    // ==================== HISTORY ENGINE ====================

    pub fn record_visit(
        &self,
        url: &str,
        title: &str,
        space_id: &str,
        timestamp_ms: i64,
    ) -> Result<Option<HistoryEntry>> {
        let conn = self.conn.lock();
        history::record_visit(&conn, url, title, space_id, timestamp_ms)
    }

    pub fn search_history(
        &self,
        query: &str,
        limit: usize,
        space_id_opt: Option<&str>,
    ) -> Result<Vec<HistoryEntry>> {
        let conn = self.conn.lock();
        history::search_history(&conn, query, limit, space_id_opt)
    }

    pub fn list_history(
        &self,
        offset: usize,
        limit: usize,
        space_id_opt: Option<&str>,
        search_opt: Option<&str>,
    ) -> Result<Vec<HistoryEntry>> {
        let conn = self.conn.lock();
        history::list_history(&conn, offset, limit, space_id_opt, search_opt)
    }

    pub fn delete_history_item(&self, id: i64) -> Result<bool> {
        let conn = self.conn.lock();
        history::delete_history_item(&conn, id)
    }

    pub fn delete_history_range(
        &self,
        from_ms: i64,
        to_ms: i64,
        space_id_opt: Option<&str>,
    ) -> Result<usize> {
        let conn = self.conn.lock();
        history::delete_history_range(&conn, from_ms, to_ms, space_id_opt)
    }

    pub fn clear_history(&self, space_id_opt: Option<&str>) -> Result<usize> {
        let conn = self.conn.lock();
        history::clear_history(&conn, space_id_opt)
    }

    pub fn import_legacy_history(&self, json_items: &str) -> Result<usize> {
        let mut conn = self.conn.lock();
        history::import_legacy_history(&mut conn, json_items)
    }

    // ==================== SITE PERMISSIONS ENGINE ====================

    pub fn check_permission(
        &self,
        partition_key: &str,
        origin_or_url: &str,
        permission: &str,
    ) -> bool {
        let conn = self.conn.lock();
        permissions::check_permission(
            &conn,
            &self.ephemeral_permissions,
            partition_key,
            origin_or_url,
            permission,
        )
    }

    pub fn set_permission(
        &self,
        partition_key: &str,
        origin_or_url: &str,
        permission: &str,
        decision: &str,
    ) -> Result<bool> {
        let conn = self.conn.lock();
        permissions::set_permission(
            &conn,
            &self.ephemeral_permissions,
            partition_key,
            origin_or_url,
            permission,
            decision,
        )
    }

    pub fn list_permissions(
        &self,
        partition_key: &str,
        origin_opt: Option<&str>,
    ) -> Result<Vec<SitePermissionEntry>> {
        let conn = self.conn.lock();
        permissions::list_permissions(&conn, &self.ephemeral_permissions, partition_key, origin_opt)
    }

    pub fn reset_origin(&self, partition_key: &str, origin_or_url: &str) -> Result<bool> {
        let conn = self.conn.lock();
        permissions::reset_origin(&conn, &self.ephemeral_permissions, partition_key, origin_or_url)
    }

    pub fn clear_partition(&self, partition_key: &str) -> Result<usize> {
        let conn = self.conn.lock();
        permissions::clear_partition(&conn, &self.ephemeral_permissions, partition_key)
    }

    // ==================== SETTINGS KV & ANNOTATIONS ====================

    pub fn get_setting(&self, key: &str) -> Option<String> {
        self.settings_cache.get(key).map(|v| v.value().clone())
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.conn.lock();
        settings::set_setting(&conn, &self.settings_cache, key, value)
    }

    pub fn get_all_settings(&self) -> HashMap<String, String> {
        self.settings_cache
            .iter()
            .map(|e| (e.key().clone(), e.value().clone()))
            .collect()
    }

    pub fn bulk_set_settings(&self, entries: &HashMap<String, String>) -> Result<usize> {
        let mut conn = self.conn.lock();
        settings::bulk_set_settings(&mut conn, &self.settings_cache, entries)
    }

    pub fn get_annotations(&self, url: &str, space_id: &str) -> Result<Option<String>> {
        let conn = self.conn.lock();
        settings::get_annotations(&conn, url, space_id)
    }

    pub fn save_annotations(&self, url: &str, space_id: &str, data_json: &str) -> Result<()> {
        let conn = self.conn.lock();
        settings::save_annotations(&conn, url, space_id, data_json)
    }

    pub fn delete_annotation(&self, url: &str, space_id: &str) -> Result<bool> {
        let conn = self.conn.lock();
        settings::delete_annotation(&conn, url, space_id)
    }

    // ==================== SEARCH BANGS ====================

    pub fn resolve_bang(&self, input: &str, custom_bangs_json: Option<&str>) -> Option<BangResolution> {
        bangs::resolve_bang(input, custom_bangs_json)
    }

    pub fn suggest_bangs(
        &self,
        prefix: &str,
        limit: usize,
        custom_bangs_json: Option<&str>,
    ) -> Vec<SearchBang> {
        bangs::suggest_bangs(prefix, limit, custom_bangs_json)
    }

    // ==================== BOOKMARK IMPORTER ====================

    pub fn import_bookmarks_json(&self, content: &str) -> Result<Vec<NormalizedBookmark>> {
        bookmarks::import_bookmarks_json(content)
    }

    pub fn import_bookmarks_html(&self, content: &str) -> Result<Vec<NormalizedBookmark>> {
        bookmarks::import_bookmarks_html(content)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_ping() {
        assert_eq!(ping(), "qbrowse-storage");
    }

    #[test]
    fn test_history_extractors_parity() {
        let stripped = strip_tracking_params(
            "https://example.com/post?utm_source=twitter&id=42&fbclid=123",
        );
        assert_eq!(stripped, "https://example.com/post?id=42");

        assert!(is_junk_history_url("about:blank"));
        assert!(is_junk_history_url("chrome://settings"));
        assert!(is_junk_history_url("devtools://devtools/bundled/inspector.html"));
        assert!(is_junk_history_url("qbrowse://settings"));
        assert!(is_junk_history_url("data:text/html,hi"));
        assert!(is_junk_history_url("blob:https://example.com/123"));
        assert!(is_junk_history_url("javascript:void(0)"));
        assert!(is_junk_history_url("http://localhost:54321/oauth/callback?code=abc"));
        assert!(is_junk_history_url("https://www.google.com/search?aep=11"));
        assert!(!is_junk_history_url("https://www.google.com/search?q=rust+lang"));

        let meta_gh = extract_rich_history_meta(
            "https://github.com/rust-lang/rust/pull/12345",
            "Pull Request",
        );
        assert_eq!(meta_gh.display_title, "PR #12345 in rust-lang/rust - GitHub");
        assert_eq!(meta_gh.domain, "github.com");
        assert_eq!(meta_gh.dedupe_key, "gh:/rust-lang/rust/pull/12345");

        let meta_maps = extract_rich_history_meta(
            "https://www.google.com/maps/place/Eiffel+Tower/@48.8584,2.2945,17z",
            "Google Maps",
        );
        assert_eq!(meta_maps.display_title, "Eiffel Tower - Google Maps");
        assert_eq!(meta_maps.domain, "google.com/maps");
        assert_eq!(meta_maps.dedupe_key, "gmaps:place:eiffel+tower");

        let meta_search = extract_rich_history_meta(
            "https://www.google.com/search?q=async+rust&udm=2",
            "Google",
        );
        assert_eq!(meta_search.display_title, "async rust - Google Images");
        assert_eq!(meta_search.search_query, "async rust");
        assert_eq!(meta_search.dedupe_key, "gsearch:async rust");
    }

    #[test]
    fn test_history_engine_crud_fts_and_privacy_guards() {
        let engine = StorageEngine::open_in_memory(None).unwrap();

        // Reject ghost, tor, .onion, and junk URLs
        assert!(engine
            .record_visit("https://example.com", "Example", "ghost", 1000)
            .unwrap()
            .is_none());
        assert!(engine
            .record_visit("https://example.com", "Example", "tor", 1000)
            .unwrap()
            .is_none());
        assert!(engine
            .record_visit("http://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion/", "DDG", "default", 1000)
            .unwrap()
            .is_none());
        assert!(engine
            .record_visit("about:blank", "Blank", "default", 1000)
            .unwrap()
            .is_none());

        // Record & dedupe visits
        let e1 = engine
            .record_visit(
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=share",
                "Never Gonna Give You Up - YouTube",
                "work",
                1_700_000_000_000,
            )
            .unwrap()
            .unwrap();
        assert_eq!(e1.visit_count, 1);

        let e2 = engine
            .record_visit(
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42",
                "Never Gonna Give You Up - YouTube",
                "work",
                1_700_000_010_000,
            )
            .unwrap()
            .unwrap();
        assert_eq!(e2.id, e1.id);
        assert_eq!(e2.visit_count, 2);

        // Search FTS5
        let hits = engine.search_history("Never Gonna", 10, Some("work")).unwrap();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].visit_count, 2);

        // List & delete
        let listed = engine.list_history(0, 10, Some("work"), None).unwrap();
        assert_eq!(listed.len(), 1);
        assert!(engine.delete_history_item(e1.id).unwrap());
        assert!(engine.list_history(0, 10, None, None).unwrap().is_empty());

        // Idempotent legacy import
        let legacy = serde_json::to_string(&json!([
            { "url": "https://crates.io/crates/rusqlite", "title": "rusqlite", "spaceId": "default", "visitCount": 3, "lastVisit": 1700000000000i64 },
            { "url": "https://crates.io/crates/rusqlite", "title": "rusqlite", "spaceId": "default", "visitCount": 3, "lastVisit": 1700000000000i64 },
            { "url": "https://secret.com", "title": "Secret", "spaceId": "ghost", "visitCount": 1, "lastVisit": 1700000000000i64 }
        ]))
        .unwrap();
        engine.import_legacy_history(&legacy).unwrap();
        let all = engine.list_history(0, 20, None, None).unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].visit_count, 3);

        // Delete range & clear
        let removed = engine
            .delete_history_range(1699999999000, 1700000001000, Some("default"))
            .unwrap();
        assert_eq!(removed, 1);
        assert_eq!(engine.clear_history(None).unwrap(), 0);
    }

    #[test]
    fn test_site_permissions_and_ephemeral_isolation() {
        let tmp_dir = std::env::temp_dir().join("qbrowse_storage_perm_test");
        let _ = std::fs::create_dir_all(&tmp_dir);
        let legacy_json = tmp_dir.join("site-permissions.json");
        std::fs::write(
            &legacy_json,
            r#"{"https://meet.google.com":{"media":"allow","notifications":"block"}}"#,
        )
        .unwrap();

        let engine = StorageEngine::open_in_memory(Some(&legacy_json)).unwrap();
        let _ = std::fs::remove_file(&legacy_json);

        // Migrated rules
        assert!(engine.check_permission("default", "https://meet.google.com/abc", "camera"));
        assert!(engine.check_permission("default", "https://meet.google.com/abc", "microphone"));
        assert!(!engine.check_permission("default", "https://meet.google.com/abc", "notifications"));

        // Default-deny permissions
        assert!(!engine.check_permission("default", "https://example.com", "midiSysex"));
        assert!(!engine.check_permission("default", "https://example.com", "pointerLock"));
        assert!(!engine.check_permission("default", "https://example.com", "openExternal"));

        // Ephemeral (ghost / tor) never reads persistent rules and never writes to disk
        assert!(!engine.check_permission("ghost", "https://meet.google.com", "camera"));
        assert!(engine
            .set_permission("ghost", "https://example.com", "camera", "allow")
            .unwrap());
        assert!(engine.check_permission("ghost", "https://example.com", "camera"));
        assert!(!engine.check_permission("default", "https://example.com", "camera"));

        assert_eq!(engine.clear_partition("ghost").unwrap(), 1);
        assert!(!engine.check_permission("ghost", "https://example.com", "camera"));

        assert!(engine
            .reset_origin("default", "https://meet.google.com")
            .unwrap());
        assert!(engine
            .list_permissions("default", Some("https://meet.google.com"))
            .unwrap()
            .is_empty());
    }

    #[test]
    fn test_settings_kv_and_annotations() {
        let engine = StorageEngine::open_in_memory(None).unwrap();
        engine.set_setting("theme", "obsidian").unwrap();
        assert_eq!(engine.get_setting("theme").as_deref(), Some("obsidian"));

        let mut bulk = HashMap::new();
        bulk.insert("zoom".to_string(), "1.1".to_string());
        bulk.insert("adblock".to_string(), "true".to_string());
        assert_eq!(engine.bulk_set_settings(&bulk).unwrap(), 2);
        assert_eq!(engine.get_all_settings().len(), 3);

        engine
            .save_annotations(
                "https://example.com/article?utm_source=x",
                "work",
                r#"[{"highlight":"Rust"}]"#,
            )
            .unwrap();
        let loaded = engine
            .get_annotations("https://example.com/article", "work")
            .unwrap();
        assert_eq!(loaded.as_deref(), Some(r#"[{"highlight":"Rust"}]"#));
        assert!(engine
            .delete_annotation("https://example.com/article", "work")
            .unwrap());
        assert!(engine
            .get_annotations("https://example.com/article", "work")
            .unwrap()
            .is_none());
    }

    #[test]
    fn test_bangs_engine() {
        let engine = StorageEngine::open_in_memory(None).unwrap();
        assert!(builtin_bang_count() > 500);

        let res = engine.resolve_bang("!yt lofi beats", None).unwrap();
        assert!(res.matched);
        assert_eq!(res.bang.id, "youtube");
        assert_eq!(res.query, "lofi beats");
        assert!(res.target_url.contains("youtube.com/results?search_query=lofi%20beats"));

        let custom = r#"[{"prefix":"qb","name":"QBrowse Docs","url":"https://docs.qbrowse.app/?q={q}"}]"#;
        let res_custom = engine.resolve_bang("rust !qb", Some(custom)).unwrap();
        assert_eq!(res_custom.target_url, "https://docs.qbrowse.app/?q=rust");

        let suggestions = engine.suggest_bangs("!crates", 5, None);
        assert!(!suggestions.is_empty());
        assert_eq!(suggestions[0].prefix, "crates");
    }

    #[test]
    fn test_bookmark_importers() {
        let engine = StorageEngine::open_in_memory(None).unwrap();

        let chrome_json = r#"{
            "roots": {
                "bookmark_bar": {
                    "name": "Bookmarks bar",
                    "type": "folder",
                    "children": [
                        {
                            "name": "Dev",
                            "type": "folder",
                            "children": [
                                { "name": "Rust", "type": "url", "url": "https://www.rust-lang.org", "date_added": "13350000000000000" }
                            ]
                        }
                    ]
                }
            }
        }"#;
        let json_bms = engine.import_bookmarks_json(chrome_json).unwrap();
        assert_eq!(json_bms.len(), 1);
        assert_eq!(json_bms[0].title, "Rust");
        assert_eq!(json_bms[0].folder, "Bookmarks bar/Dev");
        assert!(json_bms[0].added_at > 1_700_000_000_000);

        let netscape_html = r#"<!DOCTYPE NETSCAPE-Bookmark-file-1>
        <DL><p>
            <DT><H3>Reading</H3>
            <DL><p>
                <DT><A HREF="https://docs.rs" ADD_DATE="1700000000">Docs.rs</A>
            </DL><p>
        </DL><p>"#;
        let html_bms = engine.import_bookmarks_html(netscape_html).unwrap();
        assert_eq!(html_bms.len(), 1);
        assert_eq!(html_bms[0].title, "Docs.rs");
        assert_eq!(html_bms[0].url, "https://docs.rs");
        assert_eq!(html_bms[0].folder, "Reading");
        assert_eq!(html_bms[0].added_at, 1_700_000_000_000);
    }
}

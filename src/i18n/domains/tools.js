// Modular domain translations: tools namespace (ToolHub, AI, DevTools, Passkeys, etc.)

const en = {
    common: {
        incognito: "Incognito",
        selectOption: "Select option...",
        colors: {
            accent: "Accent",
            yellow: "Yellow",
            green: "Green",
            blue: "Blue",
            pink: "Pink"
        }
    },
    wallpaperPreview: {
        alt: "Wallpaper preview",
        badge: "Preview"
    },
    presets: {
        names: {
            balanced: "Balanced",
            developer: "Developer",
            classic_reverse: "Modern Arc",
            bottom_bar: "Ergonomic Flow",
            minimalist: "Minimal Focus",
            privacy: "Privacy Sentinel"
        },
        taglines: {
            balanced: "Dual personal & work workspaces with Google search.",
            developer: "Isolated workspaces with GitHub Live PR integration.",
            classic_reverse: "Right-aligned tab tree with a clean reading canvas.",
            bottom_bar: "Bottom address bar for thumb-friendly navigation.",
            minimalist: "Single workspace with compact, distraction-free chrome.",
            privacy: "Strict tracker protection with DuckDuckGo search."
        },
        descriptions: {
            balanced: "Dual workspaces (Personal & Work), standard privacy, and Google search.",
            developer: "Multi-workspace isolation with GitHub Live PR tracking and dev flows.",
            classic_reverse: "Right-aligned navigation tree, mirrored drawer, and focused tab flow.",
            bottom_bar: "Bottom address bar navigation for thumb-friendly, ergonomic browsing flow.",
            minimalist: "Single workspace, right sidebar, compact interface, and clutter-free focus.",
            privacy: "Strict tracker protection, mirrored controls, DuckDuckGo, and instant Tor onion routing."
        },
        customTaglineFallback: "Custom workspace and layout configuration.",
        accents: {
            amberGold: "Amber Gold",
            ocean: "Ocean",
            skyBlue: "Sky Blue",
            cyberEmerald: "Cyber Emerald",
            electricBlue: "Electric Blue",
            royalViolet: "Royal Violet",
            roseGold: "Rose Gold",
            sunsetOrange: "Sunset Orange",
            cyberCyan: "Cyber Cyan",
            slateGray: "Slate Gray"
        }
    },
    addPin: {
        title: "Pin App to Sidebar",
        subtitle: "Add a quick access app or website shortcut",
        defaultAppName: "App Name",
        appNameLabel: "App Name / Title",
        appNamePlaceholder: "e.g. GitHub, Gemini...",
        urlLabel: "URL / Domain *",
        urlPlaceholder: "e.g. github.com or https://gemini.google.com",
        quickPresets: "Quick Presets",
        cancel: "Cancel",
        pinApp: "Pin App"
    },
    passkey: {
        biometrics: {
            darwin: "Touch ID",
            linux: "System Biometrics",
            win32: "Windows Hello"
        },
        hints: {
            darwin: "Touch the Touch ID sensor or enter your macOS password",
            linux: "Touch your fingerprint sensor or enter your system password",
            win32: "Touch your fingerprint sensor or enter your Windows PIN"
        },
        cancelDenyTitle: "Cancel & Deny",
        verifiedTitle: "Identity Verified!",
        scanningTitle: "Scanning {biometric}...",
        autofillTitle: "Autofill Saved Password",
        passkeyCreateTitle: "Create QVault Passkey",
        passkeyTitle: "Passkey Authentication",
        verifiedAutofillDesc: "Vault unlocked and credentials autofilled",
        verifiedPasskeyCreateDesc: "Identity verified — saving passkey to QVault",
        verifiedPasskeyDesc: "Passkey released and signed successfully",
        requireAutofillDesc: "Verification required to unlock vault & autofill",
        requirePasskeyCreateDesc: "Verification required to create and save this passkey",
        requirePasskeyDesc: "Verification required to sign in with your passkey",
        passwordBadge: "Password",
        passkeyBadge: "Passkey",
        accountLabel: "Account:",
        savedLogin: "Saved Login",
        passkeyUser: "Passkey User",
        verifyingWith: "Verifying with {biometric}...",
        verifiedBtn: "Verified!",
        verifyWith: "Verify with {biometric}",
        orPassPin: "Or with Master Password / PIN",
        orPass: "Or with Master Password",
        placeholderPin: "Enter Master Password or 4–8 digit Quick PIN",
        placeholderPass: "Enter QVault Master Password",
        checking: "Checking credentials...",
        verifyAuth: "Verify & Authenticate",
        useHardwareKeyBtn: "Use Hardware / System Key",
        useHardwareKeyHint: {
            darwin: "YubiKey · FIDO2 · Touch ID · Phone QR",
            linux: "YubiKey · FIDO2 · USB / NFC / BLE · Phone QR",
            win32: "YubiKey · FIDO2 · Windows Hello · Phone QR"
        },
        toastHardwareHandoff: "Switching to Hardware / System Security Key for {domain}...",
        cancelDenyBtn: "Cancel & Deny Request",
        websiteFallback: "Website",
        theWebsiteFallback: "the website",
        toastAutofill: "Vault unlocked & credentials autofilled for {domain}!",
        toastPasskeyCreated: "Passkey verified & saving for {domain}!",
        toastPasskey: "Passkey verified for {domain}!",
        promptAutofill: "Verify your identity to autofill credentials for {domain}",
        promptPasskeyCreate: "Create and save a QVault passkey for {domain}",
        promptPasskey: "Sign in to {domain} with your QVault passkey",
        biometricError: "Biometric error: {error}",
        vaultLockedOut: "Vault locked due to failed attempts. Try again in {seconds}s.",
        incorrectCreds: "Incorrect Master Password or Quick PIN. Please try again.",
        verificationFailed: "Verification failed: {error}"
    },
    history: {
        title: "Archive",
        entrySingular: "{count} entry saved",
        entryPlural: "{count} entries saved",
        searchPlaceholder: "Search archive...",
        clearAllTitle: "Clear all browsing history",
        clear: "Clear",
        closeTitle: "Close (Esc)",
        segments: {
            all: "All",
            today: "Today",
            yesterday: "Yesterday",
            week: "Last 7 Days",
            older: "Older"
        },
        emptySearch: "No results matching \"{query}\"",
        emptyTitle: "Archive is empty",
        emptySearchDesc: "Try checking your spelling or selecting another filter.",
        emptyDesc: "Pages you visit will be saved here for quick reference.",
        itemSingular: "{count} item",
        itemPlural: "{count} items",
        copyLinkTitle: "Copy link",
        openNewTabTitle: "Open in new tab",
        removeTitle: "Remove from archive",
        toastCleared: "Archive cleared",
        toastCopied: "Copied link",
        toastOpenedBg: "Opened in background tab",
        loadMore: "Load more",
    },
    cookies: {
        title: "Cookies & Site Storage Explorer",
        subtitle: "Inspect, search, and delete site cookies and local data",
        filterDomain: "Filter Domain",
        refreshTitle: "Refresh list",
        allSites: "All Sites",
        clearDomain: "Clear {domain}",
        clearAllData: "Clear All Browsing Data",
        searchPlaceholder: "Search cookies by name, domain, or value...",
        emptyTitle: "No cookies found",
        emptyDesc: "Try clearing search or picking another domain",
        secure: "Secure",
        httpOnly: "HttpOnly",
        path: "Path: {path}",
        expires: "Expires: {date}",
        deleteTitle: "Delete cookie",
        toastDeleted: "Deleted cookie: {name}",
        toastClearedSite: "Cleared {count} cookies for {domain}",
        toastClearedAll: "Cleared browsing data & cookies"
    },
    resources: {
        title: "Task Manager",
        cpu: "CPU",
        ram: "RAM",
        asleepCount: "{count} asleep",
        sleepInactive: "Sleep Inactive",
        sleepInactiveTitle: "Sleep inactive background tabs to free memory",
        wakeAll: "Wake All",
        wakeAllTitle: "Wake all hibernated tabs",
        purgeCacheTitle: "Trim browser memory cache",
        autoRefreshActiveTitle: "Auto-refresh active (every 2s)",
        autoRefreshPausedTitle: "Auto-refresh paused",
        autoRefresh2s: "2s",
        paused: "Paused",
        refreshTitle: "Refresh process metrics",
        closeTitle: "Close (ESC)",
        filters: {
            all: "All",
            tabs: "Tabs",
            processes: "Processes",
            sleeping: "Sleeping"
        },
        searchPlaceholder: "Filter by name, PID...",
        colTask: "Task / Process",
        colSpace: "Space / Type",
        colStatus: "Status",
        colCpu: "CPU",
        colMemory: "Memory",
        colAction: "Action",
        emptyMatch: "No tasks matching \"{query}\"",
        blankTab: "Blank Tab",
        newTabDash: "Zen New Tab Dashboard",
        pidSubtitle: "PID {pid} · {type}",
        active: "Active",
        spaceTab: "{space} tab",
        mainCore: "Main Core",
        sleep: "Sleep",
        live: "Live",
        memSaved: "(Saved)",
        wakeTabTitle: "Wake tab",
        activeTabCannotSleep: "Active tab cannot be slept",
        sleepTabTitle: "Put tab to sleep",
        switchTabTitle: "Switch to tab",
        closeTabTitle: "Close tab",
        core: "Core",
        endProcessTitle: "End process PID {pid}",
        itemsOf: "{shown} of {total} items",
        pressEscPrefix: "Press",
        pressEscSuffix: "to close",
        procMain: "QBrowse Main Process",
        procGpu: "GPU Process",
        procRenderer: "Webview Renderer",
        procUtility: "Utility Service (Audio/Storage)",
        procZygote: "Sandbox Preloader",
        procPepper: "Plugin Host",
        procChild: "{type} Process",
        procChildDefault: "Child",
        toastHibernatedSingular: "Hibernated {count} inactive tab (~{mb} MB RAM freed)",
        toastHibernatedPlural: "Hibernated {count} inactive tabs (~{mb} MB RAM freed)",
        toastWokeSingular: "Restored {count} sleeping tab",
        toastWokePlural: "Restored {count} sleeping tabs",
        toastCachePurged: "Browser cache purged & memory trimmed",
        toastKillUnavailable: "Cannot terminate process: API unavailable",
        toastKilled: "Terminated process {pid}",
        toastKillFailed: "Unable to terminate process {pid}",
        toastKillError: "Error killing process {pid}"
    },
    docViewer: {
        fallbackName: "Local Document",
        fallbackFile: "File",
        preview: "Preview",
        raw: "Raw",
        zoomOut: "Zoom Out",
        zoomIn: "Zoom In",
        resetZoom: "Reset Zoom",
        copyTitle: "Copy File Content",
        copied: "Copied",
        copy: "Copy",
        revealTitle: "Reveal in System Folder",
        loading: "Loading document...",
        errorTitle: "Unable to Display File",
        readError: "Failed to read file",
        toastCopied: "Copied content to clipboard",
        toastRevealed: "Revealed file in system folder"
    },
    pdfViewer: {
        toggleThumbnails: "Toggle Page Thumbnails",
        fallbackName: "PDF Document",
        pageSingular: "{count} page",
        pagePlural: "{count} pages",
        prevPage: "Previous Page",
        nextPage: "Next Page",
        zoomOut: "Zoom Out",
        zoomIn: "Zoom In",
        fitWidth: "Fit to Width",
        rotate: "Rotate 90° Clockwise",
        normalMode: "Normal Mode",
        darkInvertMode: "Dark Reader Invert Mode",
        summarize: "Summarize",
        revealTitle: "Open in System File Manager",
        pagesHeader: "Pages",
        pageNum: "Page {num}",
        loading: "Rendering PDF with PDF.js...",
        errorTitle: "Failed to Open Document",
        openError: "Failed to open PDF document",
        extractingToast: "Extracting document text for Qu-AI...",
        openedAiToast: "Opened in Qu-AI Panel with document text!",
        extractErrorToast: "Failed to extract text: {error}",
        revealedToast: "Revealed file in system folder",
        fallbackDocName: "document",
        pageMarker: "--- Page {num} ---",
        summaryPrompt: "Please provide a concise, high-level summary and key takeaways of this PDF document ({fileName}):"
    },
    localDir: {
        parentFolderTitle: "Go to Parent Folder",
        reloadTitle: "Reload folder",
        openInFileManager: "Open in File Manager",
        filterPlaceholder: "Filter files in this directory...",
        sortName: "Name",
        sortSize: "Size",
        sortDate: "Date",
        gridViewTitle: "Grid View",
        listViewTitle: "List View",
        scanning: "Scanning directory contents...",
        errorTitle: "Unable to Open Folder",
        goParent: "Go to Parent Directory",
        emptySearch: "No files match your query",
        emptySearchHint: "Try clearing the search filter",
        folderType: "Folder",
        revealTitle: "Reveal in File Manager",
        colName: "Name",
        colModified: "Modified",
        colSize: "Size",
        itemSingular: "{count} item",
        itemPlural: "{count} items",
        filtered: "(filtered)",
        suiteName: "QBrowse File Suite",
        apiUnavailable: "Electron directory API not available",
        openFailed: "Failed to open directory",
        toastOpened: "Opened in system file manager",
        toastRevealed: "Revealed: {name}"
    },
    tour: {
        welcomeTitle: "Welcome to QBrowse",
        welcomeSubtitle: "Choose how you would like to experience the browser walkthrough:",
        overviewBadge: "Overview",
        quickTitle: "Quick Overview",
        quickDesc: "Swift visual tour of the layout, workspaces, and navigation with clear explanations.",
        startQuick: "Start Quick Tour",
        interactiveBadge: "Interactive",
        interactiveTitle: "Interactive Masterclass",
        interactiveDesc: "Real guided missions that prompt you to use the actual browser UI: click buttons, test Tor, and master shortcuts.",
        startInteractive: "Start Interactive Tour",
        skipWelcome: "Skip Tour and Start Browsing (Esc)",
        stepCounter: "Step {current} of {total}",
        closeTitle: "Close Tour (Esc)",
        skipTour: "Skip Tour",
        back: "Back",
        finishTour: "Finish Tour",
        nextStep: "Next Step",
        exitToast: "Tour closed. Press Ctrl+K anytime to explore QBrowse!",
        topBarShortcut: "Top Bar",
        steps: {
            spaces: {
                title: "Multi-Space Isolation",
                badge: "Workspaces",
                description: "Keep your workflows cleanly separated. Each workspace (Personal, Work, Ghost, Tor) maintains its own completely isolated logins, cookies, and tabs so work never bleeds into personal browsing.",
                missionInstruction: "Click the \"Work\" workspace in the sidebar switcher or press Ctrl+2",
                missionSuccess: "Workspace switched! Notice how your tabs, logins, and session cookies are now cleanly isolated."
            },
            splitview: {
                title: "Native Split-Screen View",
                badge: "Multitasking",
                description: "Browse two websites simultaneously side-by-side without opening separate windows. Perfect for research, coding with documentation open, or comparing items side-by-side.",
                missionInstruction: "Click the Split View icon on the top bar or press Ctrl+\\ to toggle dual-pane browsing",
                missionSuccess: "Split view toggled! Notice the secondary browser window that just appeared on the right."
            },
            tor: {
                title: "Built-in Tor Onion Network",
                badge: "Privacy & Onion",
                description: "Browse the decentralized web with built-in multi-hop circuit encryption. QBrowse routes your connection through encrypted Tor relays to access .onion domains without third-party proxies.",
                missionInstruction: "Click the Tor Network icon on the top bar to inspect your active relay circuit",
                missionSuccess: "Tor circuit open! You can see your multi-hop relay nodes and toggle onion routing at any time."
            },
            vault: {
                title: "Zero-Knowledge QVault",
                badge: "Hardware Security",
                description: "Your master passwords, passkeys, and credit card autofills are encrypted directly on your device using local hardware keys and {biometric} biometric security. Zero plain text ever leaves your PC.",
                missionInstruction: "Click the QVault icon on the top bar to open your local QVault",
                missionSuccess: "QVault opened! All stored credentials are encrypted locally on your hardware with biometric protection."
            },
            shield: {
                title: "Native Ad & Tracker Interceptor",
                badge: "Protection",
                description: "Hardware-accelerated native network blocking stops third-party telemetry, crypto-miners, fingerprinting scripts, and intrusive ads before network packets even reach your computer.",
                missionInstruction: "Click the Shield icon on the top bar to inspect blocked trackers and protection rules",
                missionSuccess: "QShield inspector open! You can view live blocked telemetry domains and toggle the interceptor."
            },
            darkmode: {
                title: "Smart Dark Mode & System Themes",
                badge: "Appearance",
                description: "Effortlessly tailor your visual aesthetics. Switch between sleek dark themes, crisp light mode, or toggle Smart Invert to force high-contrast dark styles across legacy bright websites.",
                missionInstruction: "Click the Theme icon on the top bar to inspect appearance options",
                missionSuccess: "Theme panel opened! You can toggle between dark, light, and smart invert modes."
            },
            toolhub: {
                title: "ToolHub & Persistent Sticky Notes",
                badge: "Research & Tools",
                description: "Highlight any text on any webpage to pin persistent notes that survive page reloads and browser restarts. Also includes an integrated private AI assistant, clean PDF exports, and clipboard history.",
                missionInstruction: "Click the ToolHub handle on the right screen edge or press Ctrl+J to open the drawer",
                missionSuccess: "ToolHub is open! You can attach notes to any site, review clips, or chat with your local AI assistant."
            },
            omnibox: {
                title: "Smart Omnibox & Command Palette",
                badge: "Universal Command",
                description: "A universal launchpad for everything. Search with bang shortcuts (!yt, @github), run power browser commands (>pdf, >clear), calculate math expressions, or interact with your local private AI model.",
                missionInstruction: "Press Ctrl+K or click the center address bar to command QBrowse",
                missionSuccess: "Omnibox activated! Type !yt to search YouTube, @github for repos, or > for power-user commands."
            }
        }
    },
    reader: {
        themes: {
            dark: "Dark",
            sepia: "Sepia",
            light: "Light",
            midnight: "Midnight"
        },
        fonts: {
            serif: "Serif",
            sans: "Sans",
            mono: "Mono",
            dyslexic: "Dyslexic"
        },
        widths: {
            compact: "Compact",
            balanced: "Balanced",
            wide: "Wide"
        },
        exitTitle: "Exit Reader Mode (Esc / Ctrl+Alt+R)",
        backToWebpage: "Back to Webpage",
        openOriginalTitle: "Open original: {url}",
        hideAudioTitle: "Hide Audio Player",
        listenTitle: "Listen to Article (Read Aloud)",
        listening: "Listening",
        readAloud: "Read Aloud",
        themeTitle: "{name} Theme",
        fontTitle: "Use {name} Font",
        decreaseSizeTitle: "Decrease text size",
        increaseSizeTitle: "Increase text size",
        widthTitle: "{name} Column Width",
        closeTitle: "Close Reader Mode",
        byAuthor: "By {author}",
        minRead: "{minutes} min read",
        wordsCount: "{count} words",
        prevParaTitle: "Previous paragraph",
        pauseTitle: "Pause",
        playTitle: "Play",
        nextParaTitle: "Next paragraph",
        audioNarration: "Audio Narration",
        blockProgress: "Block {current} of {total}",
        speedTitle: "Change narration speed",
        selectVoiceTitle: "Select voice",
        voiceFallback: "Voice",
        systemVoices: "System Voices",
        stopCloseTitle: "Stop & Close Narration",
        highlightWithTitle: "Highlight with {color}",
        noteBtn: "Note",
        copyTextTitle: "Copy text",
        stickyNote: "Sticky Note",
        notePlaceholder: "Type your note or thought...",
        deleteBtn: "Delete",
        saveBtn: "Save"
    },
    toolhub: {
        title: "Tool Hub",
        snip: "Snip",
        snipTitle: "Interactive Screen Snip (Crop Selection)",
        captureViewportTitle: "Capture Visible Viewport",
        captureFullTitle: "Capture Full Scrolling Page",
        tabs: {
            notes: "Notes",
            clipboard: "Clipboard",
            ai: "Local AI",
            downloads: "Downloads"
        },
        webNotesTab: "Web Notes ({count})",
        scratchpadTab: "Scratchpad",
        globalScope: "Global",
        spaceScope: "{space} Space",
        scratchpadTitle: "Scratchpad: {name}",
        scratchpadGlobalPlaceholder: "Jot down global thoughts, notes, links... markdown supported.",
        scratchpadSpacePlaceholder: "Scratchpad for {space} Space... markdown supported.",
        searchNotesPlaceholder: "Search highlights, notes, domains...",
        clearSearchTitle: "Clear search",
        allSpaces: "All Spaces",
        exportMd: "Export MD",
        exportMdTitle: "Export Notes as Markdown (.md)",
        noWebNotesTitle: "No Web Notes Saved",
        noWebNotesDesc: "Highlight text on any webpage or click \"Note\" in the floating pill to keep persistent notes across visits.",
        otherDomain: "Other",
        colorTitle: "Color: {color}",
        jumpHighlightTitle: "Click to jump to this highlight on page",
        editNotePlaceholder: "Add a note or thought...",
        deleteNote: "Delete Note",
        deleteNoteTitle: "Delete note text",
        cancel: "Cancel",
        saveNote: "Save Note",
        clickToEditNote: "Click to edit note",
        addNoteTitle: "Add note",
        noteBtn: "Note",
        copyQuoteTitle: "Copy quote",
        jumpBtn: "Jump",
        jumpBtnTitle: "Jump to note on page",
        deleteHighlightTitle: "Delete highlight",
        clipboardHeader: "System Clipboard History",
        syncBtn: "Sync",
        syncTitle: "Sync system clipboard",
        deleteClipTitle: "Delete clip",
        clipboardEmptyTitle: "Clipboard history is empty",
        clipboardEmptyDesc: "Copy text or URLs anywhere to see them here",
        clearClipboard: "Clear Clipboard History",
        aiStatusRunning: "llama-server Active (Port 8080)",
        aiStatusDownloading: "Downloading model ({progress}%)...",
        aiStatusStarting: "Starting engine...",
        aiStatusReady: "Ready to Start",
        aiStatusDownloaded: "Downloaded",
        aiStatusNotDownloaded: "Model Not Downloaded",
        cancelDownloadTitle: "Cancel Download",
        downloadModelTitle: "Download {name} ({size})",
        downloadBtn: "Download",
        startingBtn: "Starting...",
        stopBtn: "Stop",
        startBtn: "Start",
        openWebUiTitle: "Open llama.cpp Web UI",
        aiConsoleSettingsTitle: "llama.cpp Console & Advanced Settings",
        downloadingFile: "Downloading {filename}",
        downloadingWeights: "Downloading weights...",
        noModelTitle: "No AI Model Downloaded",
        offlineBadge: "Offline",
        noModelDesc: "Download {name} to run fast, private local AI for web summarization, coding, and chat.",
        downloadModelSize: "Download Model ({size})",
        settingsBtn: "Settings",
        contextBtn: "Context",
        searchBtn: "Search",
        voiceBtn: "Voice",
        summarizeBtn: "Summarize",
        summarizePrompt: "Summarize this web page clearly with key takeaways and main points based on its content.",
        attachTitle: "Attach File or Image",
        chatPlaceholder: "Ask local Gemma 4 AI or drop files...",
        voiceInputTitle: "Voice Input (Whisper)",
        downloadsHeader: "Active & Recent Downloads",
        itemSingular: "{count} Item",
        itemPlural: "{count} Items",
        openDownloadsFolderTitle: "Open Downloads Folder",
        clearDownloadsTitle: "Clear All Downloads",
        downloadedFileFallback: "Downloaded File",
        snipBadge: "Snip",
        verified: "Verified",
        unverified: "Unverified",
        cancelled: "Cancelled",
        failed: "Failed",
        sha256Prefix: "SHA-256: {hash}",
        saved: "Saved",
        verifyCopyHashTitle: "Verify & Copy SHA-256 Checksum",
        copyHashTitle: "SHA-256: {hash} (Click to copy)",
        copyImageTitle: "Copy Image to Clipboard",
        showInFolderTitle: "Show in Folder",
        deleteDownloadTitle: "Delete file & remove from list",
        downloadsEmptyTitle: "No active downloads",
        downloadsEmptyDesc: "Screenshots and downloaded files will appear here",
        pdfPageName: "{name} (Pg {page})",
        pdfImageSize: "PDF Image",
        toasts: {
            jumpingToNote: "Jumping to note on page...",
            exportedMarkdown: "Exported Markdown file!",
            copiedNotesMarkdown: "Copied notes to clipboard as Markdown!",
            copiedToClipboard: "Copied to clipboard!",
            clipDeleted: "Clip deleted",
            clipboardCleared: "Clipboard history cleared",
            parsingPdf: "Parsing PDF visually: {name}",
            pdfVramLimit: "Parsed first 10 pages of {name} as images (VRAM limit).",
            pdfVisualFailed: "Failed to parse PDF visually. Falling back to text extraction.",
            openPageFirst: "Open a web page first to summarize it",
            transcriptionFailed: "Transcription failed",
            micDenied: "Microphone access denied",
            noteRemoved: "Note removed",
            noteUpdated: "Note updated",
            copiedQuote: "Copied quote",
            highlightRemoved: "Highlight removed",
            downloadsCleared: "Downloads list cleared",
            hashCopied: "SHA-256 checksum copied to clipboard",
            hashMissing: "Unable to calculate hash - file missing",
            screenshotCopied: "Screenshot copied to clipboard",
            downloadDeleted: "Download and file deleted"
        }
    },
    fontManager: {
        title: "App Typography & Font",
        active: "Active:",
        resetTitle: "Reset font to operating system default",
        resetToDefault: "Reset to Default",
        modes: {
            preset: "Preset Fonts",
            google: "Google Fonts",
            system: "System Fonts",
            file: "Upload Font"
        },
        categories: {
            all: "All",
            sans: "Sans",
            mono: "Mono",
            serif: "Serif"
        },
        activeFont: "Active Font",
        clickToApply: "Click to apply",
        googleTitle: "Use Any Google Font",
        googleDesc: "Type any font name from fonts.google.com and press Enter to instantly load it into QBrowse.",
        googlePlaceholder: "e.g. Montserrat, Space Grotesk, Syne, Cinzel...",
        applyFont: "Apply Font",
        popularGoogle: "Popular Google Fonts",
        filterPlaceholder: "Filter list...",
        systemTitle: "Installed System Font Picker",
        systemDesc: "Enter any font installed on your operating system (e.g. Segoe UI Variable, Calibri, Helvetica, Comic Sans MS).",
        systemPlaceholder: "Enter system font name...",
        installed: "Installed",
        notDetected: "Not detected",
        notDetectedTitle: "Font not detected by canvas metrics differential, but CSS will still attempt to render it if available",
        commonOsFonts: "Common Operating System Fonts",
        dropTitle: "Click or drag & drop your font file here",
        dropDesc: "Supports TrueType (.ttf), OpenType (.otf), WOFF (.woff), and WOFF2 (.woff2) up to 12MB.",
        selectFile: "Select Local Font File",
        activeCustomFace: "Active Custom Font Face",
        removeFileTitle: "Remove uploaded font file",
        fineTuning: "Typography Fine-Tuning",
        letterSpacing: "Letter Spacing (Tracking)",
        weightShift: "Weight Shift (Boldness)",
        fontScale: "UI Font Scale",
        reset100Title: "Reset to 100%",
        specimen: "Typography Specimen",
        specimen1: "The quick brown fox jumps over the lazy dog",
        specimen2: "Sphinx of black quartz, judge my vow.",
        activeDefault: "System Default (Segoe UI / Native)",
        activeGoogle: "Google Font: {name}",
        activeSystem: "System Font: {name}",
        activeFile: "Custom File: {name}",
        customLabel: "Custom",
        installedOsLabel: "Installed OS",
        uploadedFontLabel: "Uploaded Font",
        spacing: {
            tight: "Tight",
            normal: "Normal",
            relaxed: "Relaxed",
            wide: "Wide"
        },
        weight: {
            normal: "Normal",
            medium: "Medium",
            semibold: "Semi-Bold"
        },
        osLabels: {
            "Windows 11": "Windows 11",
            Windows: "Windows",
            macOS: "macOS",
            "macOS / Multi": "macOS / Multi",
            Universal: "Universal",
            "Windows Dev": "Windows Dev",
            "Windows Terminal": "Windows Terminal",
            Casual: "Casual",
            Linux: "Linux",
            GNOME: "GNOME",
            Serif: "Serif"
        },
        presetDefaultName: "System Default",
        presets: {
            default: {
                description: "Native operating system typography (Segoe UI / San Francisco).",
                previewText: "Aa Bb Gg 123"
            },
            inter: {
                description: "Clean, hyper-legible modern interface sans crafted for digital screens.",
                previewText: "Modern Neo-Grotesque"
            },
            geist: {
                description: "Vercel's signature developer typeface with geometric precision.",
                previewText: "Minimalist Engineering"
            },
            outfit: {
                description: "Sophisticated geometric sans with high-fashion and luxury brand aesthetics.",
                previewText: "Luxury Geometric Sans"
            },
            "plus-jakarta": {
                description: "Fresh, warm, and friendly contemporary typeface designed for premium web apps.",
                previewText: "Friendly Contemporary"
            },
            poppins: {
                description: "Approachable geometric rounded sans with playful, energetic curves.",
                previewText: "Approachable Curves"
            },
            roboto: {
                description: "Google's signature Android and Material Design workhorse.",
                previewText: "Material Architecture"
            },
            manrope: {
                description: "Crossover between modern grotesk and geometric sans with superior legibility.",
                previewText: "Precision Semi-Geometric"
            },
            lexend: {
                description: "Scientifically designed to reduce visual stress and accelerate reading speed.",
                previewText: "Effortless Readability"
            },
            "jetbrains-mono": {
                description: "High-contrast code font with increased letter heights for dev enthusiasts.",
                previewText: "Developer Aesthetics"
            },
            "fira-code": {
                description: "Monospaced font featuring programming ligatures and crystal clarity.",
                previewText: "=> Programmer Ligatures"
            },
            "playfair-display": {
                description: "High-contrast transitional serif reminiscent of European Enlightenment print.",
                previewText: "Editorial High Fashion"
            },
            merriweather: {
                description: "Warm, pleasant literary serif engineered for pleasant long-form reading.",
                previewText: "Literary Classic Serif"
            }
        },
        errors: {
            invalidFormat: "Invalid font format. Please upload .ttf, .otf, .woff, or .woff2 files.",
            tooLarge: "Font file is too large. Maximum supported size is 12MB.",
            readFailed: "Failed to read the font file. Please try another file."
        },
        toasts: {
            presetSet: "App font set to {name}",
            googleApplied: "Google Font \"{name}\" applied to QBrowse",
            systemApplied: "System font \"{name}\" applied",
            fileLoaded: "Custom font file \"{name}\" loaded successfully"
        }
    },
    aiSettings: {
        title: "llama.cpp AI Engine",
        status: {
            online: "Online (llama-server)",
            starting: "Starting...",
            updating: "Updating Engine...",
            error: "Engine Error",
            stopped: "Stopped"
        },
        syncTitle: "Check and synchronize native llama.cpp engine (b11796 with Gemma 4 support)",
        updatingBtn: "Updating...",
        syncBtn: "Sync Engine (b11796)",
        subtitle: "High-speed, zero-knowledge local LLM runner with native Gemma 4, Qwen 3.5 & Bielik 11B GGUF support.",
        downloadingModel: "Downloading Model ({progress}%)",
        connectingCdn: "Connecting to CDN...",
        cancel: "Cancel",
        downloadBtn: "Download {name} ({size})",
        startingBtn: "Starting llama-server...",
        stopBtn: "Stop llama-server",
        startBtn: "Start llama-server Engine",
        defaultStartError: "llama-server encountered an error starting the model.",
        dismiss: "Dismiss",
        updateEngineBtn: "Update AI Engine",
        genSpeed: "Generation Speed",
        tokPerSec: "tok/s",
        contextWindow: "Context Window",
        tokens: "tokens",
        gpuOffload: "GPU Offload",
        layers: "layers",
        activeModelTitle: "Active GGUF Model",
        loadCustomGguf: "Load Custom .GGUF File...",
        loadCustomProjector: "Load Custom Projector...",
        customModelPrefix: "Custom Model: {path}",
        customProjectorPrefix: "Custom Projector: {path}",
        reset: "Reset",
        downloadedBadge: "Downloaded",
        downloadingTarget: "Downloading {target}",
        visionProjector: "Vision Projector...",
        languageModel: "Language Model...",
        weights: "weights...",
        modelReady: "Model Ready for Use",
        downloadModelFile: "Download Model File ({size})",
        overridesTitle: "llama-server Parameter Overrides",
        autoDetectBtn: "Auto-Detect Hardware",
        cpuThreadsLabel: "CPU Threads (-t): {threads}",
        contextSizeLabel: "Context Size (-c)",
        tokensOption: "{n} tokens",
        contextBadges: {
            compact: "Compact",
            default: "Default",
            extended: "Extended",
            max: "Max"
        },
        gpuLayersLabel: "GPU Offload Layers (-ngl): {layers}",
        dataProcessingTitle: "Data Processing",
        parsePdfTitle: "Parse PDF as Image",
        parsePdfDesc: "When dropping PDFs into chat, parse pages as images instead of extracting raw text. Best for Gemma 4 & Qwen 3.5 Vision models to \"see\" charts and layouts.",
        consoleTitle: "llama-server Terminal Console (Live Stdout)",
        copyOutputTitle: "Copy Terminal Output",
        clearConsoleTitle: "Clear Console",
        consoleEmpty: "[llama-server console initialized. Ready for server startup output...]",
        modelWord: "Model",
        visionWord: "Vision",
        models: {
            "gemma-4-e2b": "Google Gemma 4 E2B Instruct GGUF model with full Multimodal Vision support for analyzing images and chat.",
            "gemma-4-e4b": "High reasoning Google Gemma 4 E4B model with full Multimodal Vision support for complex analysis.",
            "qwen-3.5-4b": "Alibaba Qwen 3.5 4B model with multimodal vision support, reasoning, code generation, and multilingual understanding.",
            "bielik-11b-v3.1": "Flagship Polish & European multilingual 11B model by SpeakLeash with deep Polish nuance, instruction following, and reasoning."
        },
        toasts: {
            customModelLoaded: "Loaded custom model: {name}",
            demoModelLoaded: "Loaded demo custom model path!",
            customProjectorLoaded: "Loaded custom vision projector: {name}",
            demoProjectorLoaded: "Loaded demo custom projector path!",
            updatingEngine: "Updating native llama.cpp engine...",
            engineUpdated: "llama.cpp engine successfully updated to latest build (b11796)!",
            engineUpdateFailed: "Engine update failed: {error}",
            unknownError: "Unknown error",
            logsCopied: "llama-server logs copied to clipboard!",
            hardwareDetected: "Hardware Auto-Detected: {threads} threads, {ram}GB RAM",
            hardwareDefault: "Hardware Auto-Detected: Default optimizations applied",
            resizingContext: "Resizing llama-server context window to {tokens} tokens..."
        }
    },
    adblockImport: {
        title: "Import Blocklist from GitHub / Web",
        subtitle: "Auto-parse hosts files, GitHub raw lists, or Adblock rules into your custom blocklist.",
        closeTitle: "Close",
        modeUrl: "Remote URL / GitHub",
        modePaste: "Paste Raw Text",
        urlLabel: "Blocklist URL (GitHub raw, Gist, or hosts URL)",
        githubRawBadge: "GitHub Raw",
        githubRawTitle: "GitHub repository link detected and auto-converted to raw format",
        fetching: "Fetching...",
        fetchParse: "Fetch & Parse",
        popularLists: "Popular Community Blocklists",
        pasteLabel: "Paste hosts file, ABP filter rules, or domain list",
        pastePlaceholder: "# Paste any format below:\n0.0.0.0 tracking.evil.com\n127.0.0.1 ads.adserver.org\n||telemetry.network.io^\nanalytics.badsite.com",
        parsing: "Parsing...",
        parseDomains: "Parse Domains",
        back: "Back",
        backTitle: "Step back to source input (Esc)",
        readyToImport: "Ready to Import",
        kbSource: "{kb} KB source",
        validDomains: "Valid Domains",
        newUnique: "New Unique",
        duplicatesFiltered: "Duplicates Filtered",
        linesAnalyzed: "Lines Analyzed",
        extractedSample: "Extracted Domains Sample ({count})",
        searchSamplePlaceholder: "Search sample...",
        moreDomains: "+ {count} more domains",
        backToSource: "Back to Source",
        cancel: "Cancel",
        replaceList: "Replace Entire List",
        replaceListTitle: "Replaces your existing custom blocklist with the parsed domains",
        importN: "Import {count} Domains",
        importDomains: "Import Domains",
        pastedSourceLabel: "Pasted Text",
        errors: {
            invalidUrl: "Please enter a valid blocklist URL.",
            fetchFailed: "Failed to fetch remote blocklist",
            noValidFromUrl: "No valid domain names could be parsed from this source.",
            downloadError: "Error downloading remote list",
            emptyPaste: "Please paste some domain or hosts rules first.",
            noValidFromText: "No valid domain names could be extracted from the text.",
            parseError: "Error parsing text"
        },
        presets: {
            stevenblack: {
                desc: "Comprehensive community-curated adware and malware protection.",
                badge: "Recommended"
            },
            "oisd-basic": {
                desc: "Lightweight, false-positive-free domains blocking mobile & web tracking.",
                badge: "Low Overhead"
            },
            "adguard-trackers": {
                desc: "Specialized domain blocklist targeting analytical telemetry scripts.",
                badge: "Privacy"
            },
            peterlowe: {
                desc: "Long-standing standard plain list of active advertisement servers.",
                badge: "Fast"
            },
            danpollock: {
                desc: "Trusted zero-host list blocking telemetry, shock sites, and spam networks.",
                badge: "Classic"
            }
        }
    },
    studio: {
        title: "Preset Studio",
        subtitle: "Visually re-dock components, sculpt curvatures, customize themes, and manage custom presets.",
        tabCanvas: "Canvas",
        tabPresets: "Presets",
        closeAria: "Close Preset Studio",
        dockLeftSidebar: "Dock Sidebar on Left",
        dockRightSidebar: "Dock Sidebar on Right",
        dockTopBar: "Dock Navigation Bar at Top",
        dockBottomBar: "Dock Navigation Bar at Bottom",
        searchBarPlaceholder: "Search the web, or type a command...",
        toolhubDockTitle: "ToolHub Dock: {pos} (Click or drag to swap)",
        legendDock: "Dock:",
        legendBarValue: "{pos} Bar",
        legendSidebar: "Sidebar:",
        legendToolhub: "ToolHub:",
        legendSummary: "Curvature: {curvature} · Omnibox: {omnibox} · Tabs: {tabs}",
        layoutControls: "Layout Controls",
        resetTitle: "Reset draft to current browser setup",
        reset: "Reset",
        editingLabel: "Editing:",
        cancelEditTitle: "Cancel editing and create a new preset",
        cancel: "Cancel",
        sidebarMode: "Sidebar Mode",
        sidebarModes: {
            classic: "Classic",
            floating: "Floating",
            compact: "Compact",
            hidden: "Hidden"
        },
        windowCurvature: "Window Curvature",
        curvatures: {
            default: "Default",
            cohesive: "Cohesive",
            square: "Sharp"
        },
        omniboxArch: "Omnibox Architecture",
        omniboxStyles: {
            capsule: "Capsule",
            wide: "Wide",
            minimal: "Minimal"
        },
        tabPresentation: "Tab Presentation",
        tabStyles: {
            pills: "Pills",
            compact: "Compact",
            cards: "Cards"
        },
        windowControlsStyle: "Window Controls Style",
        controlsStyles: {
            mac: "macOS",
            windows: "Windows",
            minimal: "Minimal"
        },
        windowControlsLayout: "Window Controls Layout",
        controlsOrders: {
            auto: "Smart Corner",
            "close-first": "Close First",
            "minimize-first": "Minimize First"
        },
        themeLabel: "Theme",
        themes: {
            dark: "Dark",
            light: "Light"
        },
        uiScaleLabel: "UI Scale",
        uiScales: {
            comfortable: "Normal",
            compact: "Compact"
        },
        accentSwatchLabel: "Accent Color Swatch",
        openColorPickerTitle: "Open System Color Picker",
        saveChanges: "Save Changes",
        applyLive: "Apply Live",
        saveAsNew: "Save as New",
        applyToBrowser: "Apply to Browser",
        saveAsCustom: "Save as Custom Preset",
        searchPresetsPlaceholder: "Search presets...",
        filterAll: "All",
        filterBuiltin: "Built-in",
        filterCustom: "Custom ({count})",
        saveActiveSetup: "Save Active Browser Setup",
        activeBadge: "Active",
        editingBadge: "(Editing)",
        reapply: "Reapply",
        apply: "Apply",
        editInStudio: "Edit in Studio",
        customize: "Customize",
        editPresetTitle: "Edit preset in studio",
        customizePresetTitle: "Customize layout in studio",
        duplicateTitle: "Duplicate preset",
        deleteTitle: "Delete custom preset",
        editCustomModalTitle: "Edit Custom Preset",
        saveCustomModalTitle: "Save as Custom Preset",
        presetNameLabel: "Preset Name",
        presetNamePlaceholder: "e.g. Ergonomic Workflow, Minimalist Arc",
        presetDescLabel: "Tagline / Description",
        presetDescPlaceholder: "Short description of this configuration...",
        presetIconLabel: "Preset Icon",
        createPreset: "Create Preset",
        deleteConfirmTitle: "Delete Custom Preset?",
        deleteConfirmDescBefore: "Are you sure you want to delete ",
        deleteConfirmDescAfter: "? This cannot be undone.",
        deletePresetBtn: "Delete Preset",
        posTop: "Top",
        posBottom: "Bottom",
        posLeft: "Left",
        posRight: "Right",
        moveTo: "Move to {pos}",
        draggableNavTitle: "Draggable Navigation Bar: Drag to Top or Bottom zone, or click swap",
        draggableSidebarTitle: "Draggable Sidebar: Drag between Left and Right dock zones",
        swapTo: "Swap to {pos}",
        miniTab: "Tab #{num}",
        miniCardView: "Card View #{num}",
        miniActiveSpaceTab: "Active Space Tab",
        miniSidebarPos: "Sidebar ({pos})",
        layoutTagFormat: "{bar} · {sidebar}",
        layoutSummaryFormat: "{tag} · {toolhub}",
        topBarLabel: "Top Bar",
        bottomBarLabel: "Bottom Bar",
        leftSidebarLabel: "Left Sidebar",
        rightSidebarLabel: "Right Sidebar",
        leftToolhubLabel: "Left ToolHub",
        rightToolhubLabel: "Right ToolHub",
        tabsHighlight: "{style} Tabs",
        compactScaleLabel: "Compact Scale",
        comfortableScaleLabel: "Comfortable Scale",
        defaultCustomName: "Custom Preset",
        defaultCustomDesc: "Custom user configuration",
        defaultNewNameFormat: "{bar} {side}",
        defaultNewNameArc: "Arc",
        defaultNewNameFlow: "Flow",
        defaultNewDescFormat: "Custom layout: {bar}, {sidebar}, {tabs} tabs",
        toasts: {
            applied: "Layout applied to browser!",
            reset: "Studio draft reset to browser setup",
            editingPreset: "Editing \"{name}\" in Studio",
            loadedPreset: "Loaded \"{name}\" into Studio Canvas",
            switchedNewDraft: "Switched to new draft"
        }
    },
    setup: {
        strictOfflineTitle: "Zero-Background-Requests (Strict Offline)",
        strictOfflineDesc: "Disable all optional background network traffic (update checks, filter refreshes, live suggestions, remote favicons, and cloud sync).",
        headerTitle: "QBrowse Setup",
        headerSubtitle: "Personalization Assistant",
        steps: {
            language: {
                label: "Language",
                desc: "Interface Locale"
            },
            presets: {
                label: "Presets & Style",
                desc: "Experience & Style"
            },
            import: {
                label: "Import",
                desc: "Bookmarks & Passwords"
            },
            privacy: {
                label: "Privacy",
                desc: "Shields & Tor"
            },
            default: {
                label: "Default",
                desc: "System Integration"
            },
            sync: {
                label: "Sync & Account",
                desc: "Cloud or Local"
            }
        },
        chooseSetupTitle: "Choose your setup",
        chooseSetupDesc: "Select a tailored layout to get started. You can customize every panel at any time.",
        customLayoutCta: "Custom layout? Preset Studio →",
        themeLabel: "Theme",
        dark: "Dark",
        light: "Light",
        accentLabel: "Accent",
        step2Badge: "Step 2 of 5",
        step2Title: "Bring Your Data & Vault",
        step2Desc: "Import your bookmarks and transition your passwords from Bitwarden, Proton Pass, Chrome, or Firefox.",
        tabBookmarks: "Bookmarks",
        tabVault: "Password Vault",
        bookmarksFound: "{count} bookmarks found",
        notDetected: "Not detected on this machine",
        imported: "Imported",
        importing: "Importing...",
        importBookmarks: "Import Bookmarks",
        scanningBrowsers: "Scanning for existing browsers...",
        htmlImported: "HTML file imported ({count} items)",
        uploadHtml: "Upload Bookmarks HTML File (.html)",
        vaultComplete: "Vault Migration Complete",
        vaultImportedSummary: "Successfully imported {count} items from {source} into QVault!",
        importAnother: "Import Another",
        exportCsvJson: "Export as .CSV or .JSON",
        parsingVault: "Parsing Vault File...",
        uploadVault: "Upload Vault Export (.csv or .json)",
        compatibleManagers: "Compatible with Bitwarden, Proton Pass, Google Chrome, Edge, Brave, and 1Password",
        step3Badge: "Step 3 of 5",
        step3Title: "Armor Your Privacy",
        step3Desc: "QBrowse blocks tracking scripts, eliminates intrusive ads, and routes traffic through the Tor network.",
        privacyOptimizedBadge: "Preset: Privacy Purist Optimized",
        adblockTitle: "Ghostery Native Tracker Shield",
        adblockDesc: "Blocks trackers, telemetry, analytics, and intrusive ads without slowing down page loads.",
        torTitle: "Tor Onion Routing Space",
        torDesc: "Enables .onion darkweb browsing and multi-node encrypted relay circuits at any time.",
        ready: "Ready",
        step4Badge: "Step 4 of 5",
        step4Title: "Set as Default Browser",
        step4Desc: "Open desktop links in isolated spaces, keeping work and personal research separated automatically.",
        isDefaultTitle: "QBrowse is Your Default Browser!",
        makeDefaultTitle: "Make QBrowse your primary web gateway",
        isDefaultDesc: "All desktop links and web files will automatically open in QBrowse.",
        makeDefaultDesc: "Handles all http://, https://, and HTML files with deep OS system integration.",
        osLabels: {
            darwin: "System Settings",
            linux: "Default Applications",
            win32: "Windows Default Apps"
        },
        defaultHint: "{label} opened — select QBrowse in the system window to confirm.",
        openOsSettings: "Open {label}",
        defaultSet: "Default Browser Set",
        openingSettings: "Opening Settings...",
        setAsDefault: "Set as Default Browser",
        step5Badge: "Step 5 of 5 • Profile & Cloud Sync",
        step5Title: "Choose How You Browse",
        step5Desc: "QBrowse gives you total sovereignty. Browse completely offline with local hardware encryption, or create a free Cloud Sync account to sync your vault, spaces, and bookmarks across multiple devices.",
        zeroTelemetry: "Zero Telemetry",
        localProfile: "Local Profile",
        localProfileDesc: "100% offline. All passwords, history, and workspace tabs remain encrypted on this machine with local hardware keys. No account needed.",
        e2eEncrypted: "E2E Encrypted",
        cloudSync: "QBrowse Cloud Sync",
        cloudSyncDesc: "Sync your password vault, workspaces, pinned tabs, and bookmarks seamlessly across all your computers via Firebase.",
        localReadyTitle: "Local Profile is Ready to Launch",
        localReadyDesc: "All bookmarks, vault credentials, and workspaces will remain strictly on this computer with zero telemetry. You can easily enable Cloud Sync at any time in the future from Settings or the Profile menu.",
        takeTour: "Take the Living Tour",
        startDirectly: "Start Browsing Directly",
        activeSync: "Active Sync",
        cloudLinked: "End-to-End Encrypted Cloud Storage Linked",
        signOut: "Sign Out",
        activeSyncDesc: "Your bookmarks, workspace tabs, and encrypted password vault are continuously synchronized across all authorized devices in real-time.",
        signIn: "Sign In",
        existingAccount: "(Existing Account)",
        register: "Register",
        newAccount: "(New Account)",
        registerSubtitle: "Create a new QBrowse account to sync data across your devices.",
        signInSubtitle: "Sign in to synchronize your existing bookmarks, spaces, and vault.",
        switchToSignIn: "Switch to Sign In",
        emailLabel: "Email Address",
        emailPlaceholder: "name@example.com",
        createPassLabel: "Create Password (min. 6 characters)",
        accountPassLabel: "Account Password",
        min6Chars: "At least 6 characters",
        confirmPassLabel: "Confirm Password",
        passwordsMatch: "Passwords match",
        passwordsMismatch: "Passwords do not match",
        useAccountAsMaster: "Use account password as Master Encryption Key",
        masterDerivedDesc: "Derives AES-GCM 256-bit client keys directly from your login password.",
        masterSeparateDesc: "Using a separate custom encryption passphrase.",
        customMasterLabel: "Custom Master Encryption Passphrase",
        customMasterPlaceholder: "Enter unique vault encryption passphrase...",
        creatingAccount: "Creating Encrypted Account...",
        signingInSyncing: "Signing In & Syncing...",
        createAccountBtn: "Create Account & Enable Cloud Sync",
        signInBtn: "Sign In & Enable Cloud Sync",
        alreadyRegistered: "Already registered with QBrowse?",
        signInHere: "Sign In here",
        newToSync: "New to QBrowse Cloud Sync?",
        createFreeAccount: "Create a free account (Register)",
        skipSyncLocal: "Skip cloud sync and continue with Local Profile (No account needed)",
        skipSyncComplete: "Skip Sync & Complete",
        vaultModalTitle: "Protect Your Imported Vault",
        vaultModalDesc: "Enter or create a Master Password to encrypt your credentials.",
        masterPassLabel: "Master Password",
        masterPassPlaceholder: "Enter master password...",
        confirmMasterLabel: "Confirm Master Password",
        confirmMasterPlaceholder: "Confirm password...",
        cancel: "Cancel",
        encryptImport: "Encrypt & Import",
        bookmarkFallback: "Bookmark",
        htmlFileFallback: "HTML file",
        toasts: {
            enterEmail: "Please enter an email address.",
            validEmail: "Please enter a valid email address (e.g. name@domain.com).",
            passMin6: "Password must be at least 6 characters.",
            confirmPassReq: "Please confirm your password.",
            passMismatch: "Passwords do not match. Please re-enter.",
            signedIn: "Signed in to QBrowse Cloud Sync!",
            registered: "Account registered & Cloud Sync active!",
            bookmarksImported: "Successfully imported {count} bookmarks!",
            importFailed: "Import failed.",
            couldNotImportBookmarks: "Could not import bookmarks.",
            htmlImported: "Imported {count} bookmarks from {filename}!",
            htmlImportFailed: "HTML Bookmarks import failed.",
            noCredentials: "No credentials found in file",
            passwordsImported: "Imported {count} passwords from {source}!",
            vaultImportFailed: "Import failed: {error}",
            passMin4: "Password must be at least 4 characters",
            vaultPassMismatch: "Passwords do not match",
            incorrectMasterPass: "Incorrect master password for existing vault",
            vaultImportError: "Import error: {error}",
            nowDefault: "QBrowse is now your default browser!",
            openingWinDefault: "Opening Windows Default Apps. Click \"Set default\" for QBrowse.",
            openingOsDefault: "Opening {label}. Select QBrowse as your default browser.",
            couldNotOpenDefault: "Could not open default browser settings."
        }
    },
    flags: {
        title: "Experiments",
        subtitle: "Fine-tune experimental browser features, hardware graphics pipelines, post-quantum cryptographic ciphers, and Tor stream isolation parameters.",
        resetAll: "Reset all to default",
        warningTitle: "Warning: Experimental Features Ahead!",
        warningBody: "Enabling these experimental switches alters underlying Chromium V8 execution, hardware compositing, or TLS parameters. Relaunching is required for changes to take effect.",
        searchPlaceholder: "Search flags (e.g. GPU, Kyber, QUIC, DoH, bfcache)...",
        tabAvailable: "Available ({count})",
        tabUnavailable: "Unavailable ({count})",
        categories: {
            All: "All",
            Performance: "Performance",
            "Hardware & Graphics": "Hardware & Graphics",
            "Web Standards & Engine": "Web Standards & Engine",
            Security: "Security",
            Networking: "Networking",
            "Media & UI": "Media & UI",
            "AI & Tools": "AI & Tools",
            Experimental: "Experimental"
        },
        statuses: {
            Stable: "Stable",
            Beta: "Beta",
            Experimental: "Experimental"
        },
        options: {
            default: "Default",
            enabled: "Enabled",
            disabled: "Disabled"
        },
        emptyMatch: "No available flags match \"{search}\"",
        reasonPrefix: "Reason: {reason}",
        unavailableBadge: "Unavailable",
        relaunchMsg: "Your changes will take effect the next time you relaunch QBrowse.",
        relaunchBtn: "Relaunch",
        toasts: {
            reset: "All experimental flags restored to default",
            relaunching: "Relaunching QBrowse with updated flags..."
        },
        items: {
            "prefer-high-performance-gpu": {
                name: "Prefer High-Performance GPU",
                description: "Directs WebGL, Canvas, and 3D rendering to the dedicated GPU on systems with multiple graphics cards. Automatically disabled in Eco Saver mode to conserve battery."
            },
            "unlock-frame-rate": {
                name: "Unlocked Frame Rate (Benchmark Mode)",
                description: "Disables V-Sync and framerate limits for synthetic canvas/WebGL FPS benchmarks (e.g. xbitlabs, TestUFO). May cause screen tearing and higher power consumption in regular browsing."
            },
            "ignore-gpu-blocklist": {
                name: "Ignore GPU Blocklist",
                description: "Overrides Chromium built-in software rendering lists and enables hardware acceleration on older or unclassified graphics drivers."
            },
            "experimental-web-platform": {
                name: "Experimental Web Platform Features",
                description: "Enables experimental web platform features under development in Chromium. Increases compatibility score on HTML5Test; some cutting-edge APIs may be unstable."
            },
            "gpu-rasterization": {
                name: "GPU Rasterization & Compositor Acceleration",
                description: "Accelerates web page rasterization and compositing using dedicated hardware GPU pipelines instead of CPU software rendering."
            },
            "smooth-scrolling": {
                name: "Smooth Scrolling Engine",
                description: "Enables fluid physical cubic-bezier easing animations when scrolling page contents via mouse wheel, touchpad, or arrow keys."
            },
            "zero-copy-rasterizer": {
                name: "Zero-Copy GPU Rasterizer (GpuMemoryBuffer)",
                description: "Raster workers write directly into shared GPU textures without CPU memory staging copies, reducing memory bus contention."
            },
            "enable-vulkan": {
                name: "Vulkan Graphics & Compositing Backend",
                description: "Uses the Vulkan cross-platform graphics API for GPU compositing, rendering pipelines, and driver interop on supported GPUs."
            },
            "back-forward-cache": {
                name: "Back-forward Cache (bfcache)",
                description: "Preserves complete in-memory execution snapshots of recently visited web pages for instantaneous back and forward navigations."
            },
            "canvas-oop-rasterization": {
                name: "Out-of-Process 2D Canvas Rasterization",
                description: "Performs HTML5 2D Canvas rendering operations in the dedicated GPU process rather than the sandboxed renderer process."
            },
            "enable-drdc": {
                name: "Dynamic High Refresh Rate Detection (120Hz/144Hz/240Hz)",
                description: "Synchronizes frame pacing and V-Sync intervals to adapt dynamically to ProMotion and high-refresh gaming displays."
            },
            "auto-suspend-tabs": {
                name: "Auto-Suspend Memory Saver (V8 GC Throttling)",
                description: "Automatically unloads inactive background tabs after 15 minutes of inactivity to dramatically conserve RAM and battery life."
            },
            "parallel-download-engine": {
                name: "Parallel Multi-Threaded Range Downloads",
                description: "Splits large file downloads into multiple parallel HTTP range requests to maximize bandwidth utilization and transfer speed."
            },
            "lazy-image-loading": {
                name: "Lazy Image & Embedded Frame Loading",
                description: "Defers loading of off-screen images and third-party iframes until they are scrolled into view, reducing initial page payload."
            },
            "enable-tls13-kyber": {
                name: "Post-Quantum Cryptography for TLS (Kyber768 / ML-KEM)",
                description: "Enables quantum-resistant hybrid key encapsulation (X25519Kyber768) in TLS 1.3 handshakes to protect traffic against future quantum decryption."
            },
            "enable-encrypted-client-hello": {
                name: "Encrypted Client Hello (ECH / Encrypted SNI)",
                description: "Encrypts the Server Name Indication (SNI) inside TLS handshakes, preventing ISPs, firewalls, and network snoops from seeing visited domain names."
            },
            "strict-origin-isolation": {
                name: "Strict Origin Site-Per-Process Sandboxing",
                description: "Enforces dedicated OS processes with isolated virtual memory addresses for every distinct origin, mitigating Spectre and Meltdown exploits."
            },
            "webrtc-ip-protection": {
                name: "WebRTC Local IP Address & STUN Leak Concealment",
                description: "Restricts WebRTC ICE candidates to non-proxied UDP endpoints, preventing malicious scripts from enumerating your true local LAN or public IP."
            },
            "enable-dns-over-https": {
                name: "Strict DNS-over-HTTPS (DoH Cloudflare/Quad9)",
                description: "Encrypts all recursive DNS lookups over HTTPS (port 443) to block ISP eavesdropping, DNS hijacking, and domain poisoning."
            },
            "disable-hyperlink-auditing": {
                name: "Disable Hyperlink Auditing (<a ping>) & Beacon Pings",
                description: "Blocks websites from silently dispatching tracking POST requests when user clicks hyperlinks, neutralizing outbound ad tracking beacons."
            },
            "enable-fingerprint-randomization": {
                name: "HTML5 Canvas & WebAudio Fingerprint Noise Injection",
                description: "Subtly perturbs pixel readback and audio buffer values with cryptographic pseudorandom noise to prevent unique hardware device fingerprinting."
            },
            "enable-font-enumeration-shield": {
                name: "Local Font Enumeration & Query Shield",
                description: "Prevents web applications from probing locally installed system fonts to assemble persistent cross-browser identity hashes."
            },
            "aggressive-tracker-blocker": {
                name: "Aggressive Ad & URL Parameter Stripping Engine",
                description: "Strips telemetry tracking query parameters (utm_source, gclid, fbclid, msclkid) and blocks known tracking pixels across all navigation requests."
            },
            "enable-subresource-filter": {
                name: "Subresource Filter for Abusive & Deceptive Interstitials",
                description: "Automatically detects and suppresses clickjackers, invisible overlay links, and deceptive download prompts on untrusted websites."
            },
            "enable-quic": {
                name: "Experimental QUIC & HTTP/3 Transport Protocol",
                description: "Enables UDP-based HTTP/3 transport for zero-RTT handshakes, forward error correction, and multiplexed stream delivery without head-of-line blocking."
            },
            "tor-stream-isolation": {
                name: "Tor Per-Domain Stream Circuit Isolation (IsolateDestAddr)",
                description: "Forces each unique top-level domain in Tor Space to traverse a distinct exit circuit, preventing cross-site correlation and exit-node tracking."
            },
            "dns-prefetching": {
                name: "Predictive DNS Pre-Resolution Engine",
                description: "Proactively resolves IP addresses for anchor links visible on the current page to eliminate DNS resolution latency upon clicking."
            },
            "heavy-ad-intervention": {
                name: "Heavy Network Ad Resource Intervention",
                description: "Unloads advertising iframes that consume more than 4MB of network bandwidth or 60 seconds of CPU execution time."
            },
            "cross-origin-isolation": {
                name: "Cross-Origin Opener Policy (COOP) & SharedArrayBuffer",
                description: "Enables high-precision WebAssembly shared memory operations by strictly enforcing Cross-Origin Opener and Embedder policies."
            },
            "document-pip-api": {
                name: "Document Picture-in-Picture API",
                description: "Enables floating picture-in-picture windows populated with arbitrary HTML documents, video streams, custom player controls, and widgets."
            },
            "force-dark-contents": {
                name: "Auto Dark Mode for Web Contents (Chromium Inversion)",
                description: "Automatically synthesizes a dark theme for websites that only support light backgrounds using luminance-preserving color inversion."
            },
            "overlay-scrollbars": {
                name: "Minimalist Floating Overlay Scrollbars",
                description: "Replaces chunky OS scrollbars with sleek floating scroll indicators that automatically fade out when scrolling stops."
            },
            "enable-webgpu": {
                name: "Next-Generation WebGPU Graphics & Compute API",
                description: "Provides low-overhead, direct GPU access for in-browser neural networks, 3D simulations, and shader computations."
            },
            "tab-audio-muting": {
                name: "One-Click Tab Audio Muting Indicator",
                description: "Adds an interactive audio speaker badge to active tab buttons, allowing immediate tab audio muting with a single click."
            },
            "webrtc-pipewire": {
                name: "PipeWire Desktop Capturer (Linux Wayland)",
                description: "Enables screen sharing and window capture via PipeWire portal on modern Linux desktop environments (GNOME, KDE Plasma)."
            },
            "hdr-compositing": {
                name: "High Dynamic Range (HDR) Color Compositing",
                description: "Enables 10-bit wide color gamut (Rec.2020 / DCI-P3) and HDR tone mapping on compatible OLED and mini-LED displays."
            },
            "local-ai-assistant": {
                name: "Local GGUF LLM VRAM Acceleration (llama.cpp)",
                description: "Offloads on-device Gemma and Llama 3 model weights directly to GPU VRAM for private, low-latency summarization and querying."
            },
            "experimental-split-screen-gestures": {
                name: "Kinetic Split Screen Panes & Snap Gestures",
                description: "Allows dragging tabs to viewport edges to instantly create responsive horizontal or vertical dual-pane browsing sessions."
            },
            "enable-reader-mode": {
                name: "Distraction-Free Article Reader Mode",
                description: "Extracts article text and typography into a high-legibility layout, eliminating sidebars, advertisements, and page clutter."
            },
            "auto-password-generation": {
                name: "Cryptographic Strong Password Generation",
                description: "Automatically detects new account registration forms and proposes 128-bit cryptographically secure passwords backed by QVault."
            },
            "tab-groups-auto-clustering": {
                name: "Smart Domain & Workspace Tab Clustering",
                description: "Intelligently suggests grouping open tabs based on shared origin domains and temporal workspace usage patterns."
            },
            "touch-ui-layout": {
                name: "Touchscreen Tablet UI Mode",
                description: "Expands tab bar heights and hit-testing margins for touch-first convertibles. Currently disabled on desktop keyboard/mouse profiles.",
                reason: "Requires touch-digitizer hardware detection."
            },
            "eye-tracking-gaze-scroll": {
                name: "Eye-Tracking Gaze Navigation",
                description: "Controls viewport scrolling based on pupil gaze coordinates. Requires specialized infrared hardware sensors.",
                reason: "Supported eye-tracking sensor not detected."
            },
            "cellular-data-saver": {
                name: "Cellular Metered Data Saver",
                description: "Compresses remote images via upstream proxy gateways. Disabled for privacy to prevent remote proxy decryption.",
                reason: "Disabled by default to preserve Tor and HTTPS end-to-end privacy."
            }
        }
    }
};

const pl = {
    common: {
        incognito: "Incognito",
        selectOption: "Wybierz opcję...",
        colors: {
            accent: "Akcent",
            yellow: "Żółty",
            green: "Zielony",
            blue: "Niebieski",
            pink: "Różowy"
        }
    },
    wallpaperPreview: {
        alt: "Podgląd tapety",
        badge: "Podgląd"
    },
    presets: {
        names: {
            balanced: "Zrównoważony",
            developer: "Deweloperski",
            classic_reverse: "Nowoczesny Arc",
            bottom_bar: "Ergonomiczny",
            minimalist: "Minimalistyczny",
            privacy: "Strażnik Prywatności"
        },
        taglines: {
            balanced: "Podwójne obszary osobiste i do pracy z wyszukiwarką Google.",
            developer: "Izolowane obszary robocze z integracją GitHub Live PR.",
            classic_reverse: "Drzewo kart po prawej stronie i przejrzyste płótno.",
            bottom_bar: "Dolny pasek adresu do wygodnej nawigacji kciukiem.",
            minimalist: "Pojedynczy obszar roboczy z kompaktowym, czystym interfejsem.",
            privacy: "Ścisła ochrona przed śledzeniem z wyszukiwarką DuckDuckGo."
        },
        descriptions: {
            balanced: "Podwójne obszary robocze (Osobisty i Praca), standardowa prywatność i Google.",
            developer: "Izolacja wielu obszarów roboczych ze śledzeniem PR na GitHub i funkcjami dev.",
            classic_reverse: "Nawigacja po prawej stronie, lustrzany panel i skupienie na kartach.",
            bottom_bar: "Dolny pasek adresu zapewniający ergonomiczną nawigację.",
            minimalist: "Jeden obszar roboczy, prawy panel boczny, kompaktowy interfejs bez rozpraszaczy.",
            privacy: "Ścisła blokada trackerów, DuckDuckGo oraz natychmiastowa sieć Tor."
        },
        customTaglineFallback: "Własna konfiguracja obszaru roboczego i układu.",
        accents: {
            amberGold: "Bursztynowe Złoto",
            ocean: "Oceaniczny",
            skyBlue: "Błękit Nieba",
            cyberEmerald: "Cyberszmaragd",
            electricBlue: "Elektryczny Błękit",
            royalViolet: "Królewski Fiolet",
            roseGold: "Różowe Złoto",
            sunsetOrange: "Pomarańcz Zachodu",
            cyberCyan: "Cybercyjan",
            slateGray: "Łupkowa Szarość"
        }
    },
    addPin: {
        title: "Przypnij aplikację do paska bocznego",
        subtitle: "Dodaj skrót do szybkiego dostępu do aplikacji lub strony",
        defaultAppName: "Nazwa aplikacji",
        appNameLabel: "Nazwa / Tytuł aplikacji",
        appNamePlaceholder: "np. GitHub, Gemini...",
        urlLabel: "URL / Domena *",
        urlPlaceholder: "np. github.com lub https://gemini.google.com",
        quickPresets: "Szybkie szablony",
        cancel: "Anuluj",
        pinApp: "Przypnij"
    },
    passkey: {
        biometrics: {
            darwin: "Touch ID",
            linux: "Biometria systemowa",
            win32: "Windows Hello"
        },
        hints: {
            darwin: "Dotknij czujnika Touch ID lub wprowadź hasło macOS",
            linux: "Dotknij czytnika linii papilarnych lub wpisz hasło systemowe",
            win32: "Dotknij czytnika linii papilarnych lub wpisz kod PIN systemu Windows"
        },
        cancelDenyTitle: "Anuluj i odrzuć",
        verifiedTitle: "Tożsamość zweryfikowana!",
        scanningTitle: "Skanowanie {biometric}...",
        autofillTitle: "Autouzupełnianie zapisanego hasła",
        passkeyTitle: "Uwierzytelnianie kluczem dostępu",
        verifiedAutofillDesc: "Sejf odblokowany, dane zostały uzupełnione",
        verifiedPasskeyDesc: "Klucz dostępu został udostępniony i podpisany",
        requireAutofillDesc: "Wymagana weryfikacja, aby odblokować sejf i uzupełnić dane",
        requirePasskeyDesc: "Wymagana weryfikacja, aby zalogować się kluczem dostępu",
        passwordBadge: "Hasło",
        passkeyBadge: "Klucz dostępu",
        accountLabel: "Konto:",
        savedLogin: "Zapisany login",
        passkeyUser: "Użytkownik klucza",
        verifyingWith: "Weryfikacja przez {biometric}...",
        verifiedBtn: "Zweryfikowano!",
        verifyWith: "Zweryfikuj przez {biometric}",
        orPassPin: "Lub użyj hasła głównego / kodu PIN",
        orPass: "Lub użyj hasła głównego",
        placeholderPin: "Wpisz hasło główne lub 4–8-cyfrowy szybki PIN",
        placeholderPass: "Wpisz hasło główne QVault",
        checking: "Sprawdzanie poświadczeń...",
        verifyAuth: "Zweryfikuj i uwierzytelnij",
        cancelDenyBtn: "Anuluj i odrzuć żądanie",
        websiteFallback: "Witryna",
        theWebsiteFallback: "tej witryny",
        toastAutofill: "Sejf odblokowany i dane uzupełnione dla {domain}!",
        toastPasskey: "Klucz dostępu zweryfikowany dla {domain}!",
        promptAutofill: "Zweryfikuj tożsamość, aby uzupełnić dane dla {domain}",
        promptPasskey: "Zaloguj się do {domain} za pomocą klucza QVault",
        biometricError: "Błąd biometrii: {error}",
        vaultLockedOut: "Sejf zablokowany po błędnych próbach. Spróbuj za {seconds} s.",
        incorrectCreds: "Nieprawidłowe hasło główne lub szybki PIN. Spróbuj ponownie.",
        verificationFailed: "Weryfikacja nie powiodła się: {error}",
        passkeyCreateTitle: "Utwórz klucz dostępu QVault",
        verifiedPasskeyCreateDesc: "Tożsamość zweryfikowana — zapisywanie klucza w QVault",
        requirePasskeyCreateDesc: "Wymagana weryfikacja, aby utworzyć i zapisać ten klucz dostępu",
        useHardwareKeyBtn: "Użyj klucza sprzętowego / systemowego",
        useHardwareKeyHint: {
            darwin: "YubiKey · FIDO2 · Touch ID · QR telefonu",
            linux: "YubiKey · FIDO2 · USB / NFC / BLE · QR telefonu",
            win32: "YubiKey · FIDO2 · Windows Hello · QR telefonu"
        },
        toastHardwareHandoff: "Przełączanie na sprzętowy / systemowy klucz bezpieczeństwa dla {domain}...",
        toastPasskeyCreated: "Klucz dostępu zweryfikowany i zapisywany dla {domain}!",
        promptPasskeyCreate: "Utwórz i zapisz klucz dostępu QVault dla {domain}"
    },
    history: {
        title: "Archiwum",
        entrySingular: "{count} zapisany wpis",
        entryPlural: "Zapisanych wpisów: {count}",
        searchPlaceholder: "Szukaj w archiwum...",
        clearAllTitle: "Wyczyść całą historię przeglądania",
        clear: "Wyczyść",
        closeTitle: "Zamknij (Esc)",
        segments: {
            all: "Wszystkie",
            today: "Dzisiaj",
            yesterday: "Wczoraj",
            week: "Ostatnie 7 dni",
            older: "Starsze"
        },
        emptySearch: "Brak wyników dla „{query}”",
        emptyTitle: "Archiwum jest puste",
        emptySearchDesc: "Sprawdź pisownię lub wybierz inny filtr.",
        emptyDesc: "Odwiedzone strony zostaną zapisane tutaj dla szybkiego dostępu.",
        itemSingular: "{count} element",
        itemPlural: "Elementy: {count}",
        copyLinkTitle: "Kopiuj link",
        openNewTabTitle: "Otwórz w nowej karcie",
        removeTitle: "Usuń z archiwum",
        toastCleared: "Wyczyszczono archiwum",
        toastCopied: "Skopiowano link",
        toastOpenedBg: "Otwarto w karcie w tle",
        loadMore: "Załaduj więcej",
    },
    cookies: {
        title: "Eksplorator plików cookie i danych witryn",
        subtitle: "Przeglądaj, wyszukuj i usuwaj pliki cookie oraz dane lokalne witryn",
        filterDomain: "Filtruj domenę",
        refreshTitle: "Odśwież listę",
        allSites: "Wszystkie witryny",
        clearDomain: "Wyczyść {domain}",
        clearAllData: "Wyczyść wszystkie dane przeglądania",
        searchPlaceholder: "Szukaj plików cookie po nazwie, domenie lub wartości...",
        emptyTitle: "Nie znaleziono plików cookie",
        emptyDesc: "Wyczyść wyszukiwanie lub wybierz inną domenę",
        secure: "Secure",
        httpOnly: "HttpOnly",
        path: "Ścieżka: {path}",
        expires: "Wygasa: {date}",
        deleteTitle: "Usuń plik cookie",
        toastDeleted: "Usunięto plik cookie: {name}",
        toastClearedSite: "Usunięto pliki cookie ({count}) dla {domain}",
        toastClearedAll: "Wyczyszczono dane przeglądania i pliki cookie"
    },
    resources: {
        title: "Menedżer zadań",
        cpu: "CPU",
        ram: "RAM",
        asleepCount: "Uśpione: {count}",
        sleepInactive: "Uśpij nieaktywne",
        sleepInactiveTitle: "Uśpij nieaktywne karty w tle, aby zwolnić pamięć",
        wakeAll: "Wybudź wszystkie",
        wakeAllTitle: "Wybudź wszystkie uśpione karty",
        purgeCacheTitle: "Wyczyść pamięć podręczną przeglądarki",
        autoRefreshActiveTitle: "Automatyczne odświeżanie aktywne (co 2 s)",
        autoRefreshPausedTitle: "Automatyczne odświeżanie wstrzymane",
        autoRefresh2s: "2 s",
        paused: "Wstrzymano",
        refreshTitle: "Odśwież metryki procesów",
        closeTitle: "Zamknij (ESC)",
        filters: {
            all: "Wszystkie",
            tabs: "Karty",
            processes: "Procesy",
            sleeping: "Uśpione"
        },
        searchPlaceholder: "Filtruj po nazwie, PID...",
        colTask: "Zadanie / Proces",
        colSpace: "Obszar / Typ",
        colStatus: "Status",
        colCpu: "CPU",
        colMemory: "Pamięć",
        colAction: "Akcja",
        emptyMatch: "Brak zadań pasujących do „{query}”",
        blankTab: "Pusta karta",
        newTabDash: "Panel Nowej Karty Zen",
        pidSubtitle: "PID {pid} · {type}",
        active: "Aktywna",
        spaceTab: "Karta: {space}",
        mainCore: "Rdzeń główny",
        sleep: "Uśpiona",
        live: "Aktywny",
        memSaved: "(Zaoszczędzono)",
        wakeTabTitle: "Wybudź kartę",
        activeTabCannotSleep: "Aktywnej karty nie można uśpić",
        sleepTabTitle: "Uśpij kartę",
        switchTabTitle: "Przejdź do karty",
        closeTabTitle: "Zamknij kartę",
        core: "Rdzeń",
        endProcessTitle: "Zakończ proces PID {pid}",
        itemsOf: "{shown} z {total} elementów",
        pressEscPrefix: "Naciśnij",
        pressEscSuffix: "aby zamknąć",
        procMain: "Proces główny QBrowse",
        procGpu: "Proces GPU",
        procRenderer: "Renderer widoku Webview",
        procUtility: "Usługa narzędziowa (Audio/Pamięć)",
        procZygote: "Moduł wstępnego ładowania piaskownicy",
        procPepper: "Host wtyczek",
        procChild: "Proces {type}",
        procChildDefault: "Potomny",
        toastHibernatedSingular: "Uśpiono {count} nieaktywną kartę (zwolniono ~{mb} MB RAM)",
        toastHibernatedPlural: "Uśpiono nieaktywne karty: {count} (zwolniono ~{mb} MB RAM)",
        toastWokeSingular: "Przywrócono {count} uśpioną kartę",
        toastWokePlural: "Przywrócono uśpione karty: {count}",
        toastCachePurged: "Wyczyszczono pamięć podręczną i zoptymalizowano RAM",
        toastKillUnavailable: "Nie można zakończyć procesu: interfejs API niedostępny",
        toastKilled: "Zakończono proces {pid}",
        toastKillFailed: "Nie udało się zakończyć procesu {pid}",
        toastKillError: "Błąd podczas zamykania procesu {pid}"
    },
    docViewer: {
        fallbackName: "Dokument lokalny",
        fallbackFile: "Plik",
        preview: "Podgląd",
        raw: "Źródło",
        zoomOut: "Pomniejsz",
        zoomIn: "Powiększ",
        resetZoom: "Resetuj powiększenie",
        copyTitle: "Kopiuj zawartość pliku",
        copied: "Skopiowano",
        copy: "Kopiuj",
        revealTitle: "Pokaż w folderze systemowym",
        loading: "Ładowanie dokumentu...",
        errorTitle: "Nie można wyświetlić pliku",
        readError: "Nie udało się odczytać pliku",
        toastCopied: "Skopiowano zawartość do schowka",
        toastRevealed: "Otwarto lokalizację pliku w folderze"
    },
    pdfViewer: {
        toggleThumbnails: "Przełącz miniatury stron",
        fallbackName: "Dokument PDF",
        pageSingular: "{count} strona",
        pagePlural: "Strony: {count}",
        prevPage: "Poprzednia strona",
        nextPage: "Następna strona",
        zoomOut: "Pomniejsz",
        zoomIn: "Powiększ",
        fitWidth: "Dopasuj do szerokości",
        rotate: "Obróć o 90° w prawo",
        normalMode: "Tryb normalny",
        darkInvertMode: "Tryb ciemny z odwróceniem kolorów",
        summarize: "Podsumuj",
        revealTitle: "Otwórz w menedżerze plików",
        pagesHeader: "Strony",
        pageNum: "Strona {num}",
        loading: "Renderowanie PDF za pomocą PDF.js...",
        errorTitle: "Nie udało się otworzyć dokumentu",
        openError: "Nie udało się otworzyć pliku PDF",
        extractingToast: "Wyodrębnianie tekstu dokumentu dla Qu-AI...",
        openedAiToast: "Otwarto tekst dokumentu w panelu Qu-AI!",
        extractErrorToast: "Nie udało się wyodrębnić tekstu: {error}",
        revealedToast: "Pokazano plik w folderze systemowym",
        fallbackDocName: "dokument",
        pageMarker: "--- Strona {num} ---",
        summaryPrompt: "Przygotuj zwięzłe podsumowanie oraz najważniejsze wnioski z tego dokumentu PDF ({fileName}):"
    },
    localDir: {
        parentFolderTitle: "Przejdź do folderu nadrzędnego",
        reloadTitle: "Odśwież folder",
        openInFileManager: "Otwórz w Menedżerze plików",
        filterPlaceholder: "Filtruj pliki w tym katalogu...",
        sortName: "Nazwa",
        sortSize: "Rozmiar",
        sortDate: "Data",
        gridViewTitle: "Widok siatki",
        listViewTitle: "Widok listy",
        scanning: "Skanowanie zawartości katalogu...",
        errorTitle: "Nie można otworzyć folderu",
        goParent: "Przejdź do katalogu nadrzędnego",
        emptySearch: "Brak plików pasujących do zapytania",
        emptySearchHint: "Spróbuj wyczyścić filtr wyszukiwania",
        folderType: "Folder",
        revealTitle: "Pokaż w Menedżerze plików",
        colName: "Nazwa",
        colModified: "Zmodyfikowano",
        colSize: "Rozmiar",
        itemSingular: "{count} element",
        itemPlural: "Elementy: {count}",
        filtered: "(przefiltrowano)",
        suiteName: "Pakiet plików QBrowse",
        apiUnavailable: "Interfejs API katalogów Electron jest niedostępny",
        openFailed: "Nie udało się otworzyć katalogu",
        toastOpened: "Otwarto w systemowym menedżerze plików",
        toastRevealed: "Wskazano: {name}"
    },
    tour: {
        welcomeTitle: "Witaj w QBrowse",
        welcomeSubtitle: "Wybierz sposób, w jaki chcesz poznać możliwości przeglądarki:",
        overviewBadge: "Przegląd",
        quickTitle: "Szybki przegląd",
        quickDesc: "Krótka wizualna prezentacja układu, obszarów roboczych i nawigacji z czytelnymi opisami.",
        startQuick: "Rozpocznij szybki przewodnik",
        interactiveBadge: "Interaktywny",
        interactiveTitle: "Interaktywny kurs mistrzowski",
        interactiveDesc: "Prawdziwe misje zachęcające do korzystania z interfejsu: klikaj przyciski, testuj Tora i poznaj skróty.",
        startInteractive: "Rozpocznij przewodnik interaktywny",
        skipWelcome: "Pomiń przewodnik i zacznij przeglądać (Esc)",
        stepCounter: "Krok {current} z {total}",
        closeTitle: "Zamknij przewodnik (Esc)",
        skipTour: "Pomiń przewodnik",
        back: "Wstecz",
        finishTour: "Zakończ przewodnik",
        nextStep: "Następny krok",
        exitToast: "Przewodnik zamknięty. Naciśnij Ctrl+K w dowolnym momencie, aby odkrywać QBrowse!",
        topBarShortcut: "Górny pasek",
        steps: {
            spaces: {
                title: "Izolacja wielu obszarów roboczych",
                badge: "Obszary robocze",
                description: "Oddziel swoją pracę od spraw prywatnych. Każdy obszar (Osobisty, Praca, Ghost, Tor) zachowuje całkowicie odizolowane sesje logowania, pliki cookie i karty.",
                missionInstruction: "Kliknij obszar „Praca” w przełączniku na pasku bocznym lub naciśnij Ctrl+2",
                missionSuccess: "Obszar przełączony! Zauważ, jak Twoje karty, logowania i pliki cookie są teraz w pełni odizolowane."
            },
            splitview: {
                title: "Natywny podział ekranu",
                badge: "Wielozadaniowość",
                description: "Przeglądaj dwie strony jednocześnie obok siebie bez otwierania osobnych okien. Idealne do researchu, programowania z dokumentacją lub porównywania treści.",
                missionInstruction: "Kliknij ikonę Podziału ekranu na górnym pasku lub naciśnij Ctrl+\\, aby włączyć dwa panele",
                missionSuccess: "Podział ekranu przełączony! Zwróć uwagę na drugie okno przeglądarki po prawej stronie."
            },
            tor: {
                title: "Wbudowana sieć Tor Onion",
                badge: "Prywatność i Onion",
                description: "Przeglądaj zdecentralizowaną sieć z wbudowanym wieloskoko­wym szyfrowaniem. QBrowse kieruje ruch przez szyfrowane przekaźniki Tor i obsługuje domeny .onion.",
                missionInstruction: "Kliknij ikonę sieci Tor na górnym pasku, aby sprawdzić aktywny obwód przekaźników",
                missionSuccess: "Obwód Tor otwarty! Możesz zobaczyć węzły przekaźnikowe i włączać trasowanie cebulowe w dowolnej chwili."
            },
            vault: {
                title: "Sejf Zero-Knowledge QVault",
                badge: "Bezpieczeństwo sprzętowe",
                description: "Twoje hasła główne, klucze dostępu i dane kart są szyfrowane bezpośrednio na urządzeniu za pomocą kluczy sprzętowych i biometrii {biometric}. Żaden czysty tekst nie opuszcza komputera.",
                missionInstruction: "Kliknij ikonę QVault na górnym pasku, aby otworzyć lokalny sejf",
                missionSuccess: "QVault otwarty! Wszystkie poświadczenia są szyfrowane lokalnie z ochroną biometryczną."
            },
            shield: {
                title: "Natywny bloker reklam i trackerów",
                badge: "Ochrona",
                description: "Akcelerowane sprzętowo blokowanie sieciowe zatrzymuje telemetrię, skrypty koparek, fingerprinting i natrętne reklamy, zanim pakiety dotrą do urządzenia.",
                missionInstruction: "Kliknij ikonę Tarczy na górnym pasku, aby podejrzeć zablokowane trackery i reguły ochrony",
                missionSuccess: "Inspektor QShield otwarty! Możesz przeglądać blokowane domeny na żywo i zarządzać tarczą."
            },
            darkmode: {
                title: "Inteligentny tryb ciemny i motywy",
                badge: "Wygląd",
                description: "Dopasuj estetykę przeglądarki bez wysiłku. Przełączaj się między eleganckimi ciemnymi motywami, trybem jasnym lub inteligentną inwersją dla jasnych stron.",
                missionInstruction: "Kliknij ikonę Motywu na górnym pasku, aby zobaczyć opcje wyglądu",
                missionSuccess: "Panel motywów otwarty! Możesz przełączać tryb ciemny, jasny i inteligentną inwersję."
            },
            toolhub: {
                title: "ToolHub i trwałe notatki na stronach",
                badge: "Badania i narzędzia",
                description: "Zaznacz dowolny tekst na stronie, aby przypiąć trwałe notatki zachowywane po odświeżeniu i restarcie. Zawiera też prywatnego asystenta AI, eksport i schowek.",
                missionInstruction: "Kliknij uchwyt ToolHub na prawej krawędzi ekranu lub naciśnij Ctrl+J, aby otworzyć panel",
                missionSuccess: "ToolHub otwarty! Możesz dodawać notatki do stron, przeglądać schowek lub rozmawiać z lokalną AI."
            },
            omnibox: {
                title: "Inteligentny pasek i paleta poleceń",
                badge: "Uniwersalne polecenia",
                description: "Uniwersalne centrum dowodzenia. Wyszukuj skrótami (!yt, @github), uruchamiaj polecenia przeglądarki (>pdf, >clear), licz wyrażenia i pytaj lokalną AI.",
                missionInstruction: "Naciśnij Ctrl+K lub kliknij środkowy pasek adresu, aby wydać polecenie QBrowse",
                missionSuccess: "Omnibox aktywny! Wpisz !yt dla YouTube, @github dla repozytoriów lub > dla poleceń zaawansowanych."
            }
        }
    },
    reader: {
        themes: {
            dark: "Ciemny",
            sepia: "Sepia",
            light: "Jasny",
            midnight: "Północ"
        },
        fonts: {
            serif: "Szeryfowa",
            sans: "Bezszeryfowa",
            mono: "Stała",
            dyslexic: "Dla dyslektyków"
        },
        widths: {
            compact: "Wąska",
            balanced: "Zbalansowana",
            wide: "Szeroka"
        },
        exitTitle: "Wyjdź z trybu czytnika (Esc / Ctrl+Alt+R)",
        backToWebpage: "Wróć do strony",
        openOriginalTitle: "Otwórz oryginał: {url}",
        hideAudioTitle: "Ukryj odtwarzacz audio",
        listenTitle: "Odsłuchaj artykuł (Czytanie na głos)",
        listening: "Słuchanie",
        readAloud: "Czytaj na głos",
        themeTitle: "Motyw: {name}",
        fontTitle: "Użyj czcionki: {name}",
        decreaseSizeTitle: "Zmniejsz rozmiar tekstu",
        increaseSizeTitle: "Zwiększ rozmiar tekstu",
        widthTitle: "Szerokość kolumny: {name}",
        closeTitle: "Zamknij tryb czytnika",
        byAuthor: "Autor: {author}",
        minRead: "{minutes} min czytania",
        wordsCount: "Słowa: {count}",
        prevParaTitle: "Poprzedni akapit",
        pauseTitle: "Pauza",
        playTitle: "Odtwórz",
        nextParaTitle: "Następny akapit",
        audioNarration: "Narracja audio",
        blockProgress: "Akapit {current} z {total}",
        speedTitle: "Zmień szybkość narracji",
        selectVoiceTitle: "Wybierz głos",
        voiceFallback: "Głos",
        systemVoices: "Głosy systemowe",
        stopCloseTitle: "Zatrzymaj i zamknij narrację",
        highlightWithTitle: "Podświetl kolorem: {color}",
        noteBtn: "Notatka",
        copyTextTitle: "Kopiuj tekst",
        stickyNote: "Notatka przypięta",
        notePlaceholder: "Wpisz swoją notatkę lub myśl...",
        deleteBtn: "Usuń",
        saveBtn: "Zapisz"
    },
    toolhub: {
        title: "Tool Hub",
        snip: "Wycinek",
        snipTitle: "Interaktywny wycinek ekranu (zaznaczenie obszaru)",
        captureViewportTitle: "Przechwyć widoczny obszar",
        captureFullTitle: "Przechwyć całą przewijaną stronę",
        tabs: {
            notes: "Notatki",
            clipboard: "Schowek",
            ai: "Lokalna AI",
            downloads: "Pobrane"
        },
        webNotesTab: "Notatki WWW ({count})",
        scratchpadTab: "Brudnopis",
        globalScope: "Globalny",
        spaceScope: "Obszar {space}",
        scratchpadTitle: "Brudnopis: {name}",
        scratchpadGlobalPlaceholder: "Zapisuj ogólne myśli, notatki, linki... obsługuje Markdown.",
        scratchpadSpacePlaceholder: "Brudnopis dla obszaru {space}... obsługuje Markdown.",
        searchNotesPlaceholder: "Szukaj podświetleń, notatek, domen...",
        clearSearchTitle: "Wyczyść wyszukiwanie",
        allSpaces: "Wszystkie obszary",
        exportMd: "Eksport MD",
        exportMdTitle: "Eksportuj notatki jako Markdown (.md)",
        noWebNotesTitle: "Brak zapisanych notatek WWW",
        noWebNotesDesc: "Zaznacz tekst na dowolnej stronie lub kliknij „Notatka” na pływającym pasku, aby zachować notatki między wizytami.",
        otherDomain: "Inne",
        colorTitle: "Kolor: {color}",
        jumpHighlightTitle: "Kliknij, aby przejść do tego podświetlenia na stronie",
        editNotePlaceholder: "Dodaj notatkę lub myśl...",
        deleteNote: "Usuń notatkę",
        deleteNoteTitle: "Usuń treść notatki",
        cancel: "Anuluj",
        saveNote: "Zapisz notatkę",
        clickToEditNote: "Kliknij, aby edytować notatkę",
        addNoteTitle: "Dodaj notatkę",
        noteBtn: "Notatka",
        copyQuoteTitle: "Kopiuj cytat",
        jumpBtn: "Skocz",
        jumpBtnTitle: "Przejdź do notatki na stronie",
        deleteHighlightTitle: "Usuń podświetlenie",
        clipboardHeader: "Historia schowka systemowego",
        syncBtn: "Synchronizuj",
        syncTitle: "Synchronizuj ze schowkiem systemowym",
        deleteClipTitle: "Usuń wycinek",
        clipboardEmptyTitle: "Historia schowka jest pusta",
        clipboardEmptyDesc: "Skopiuj tekst lub adres URL w dowolnym miejscu, aby zobaczyć go tutaj",
        clearClipboard: "Wyczyść historię schowka",
        aiStatusRunning: "llama-server aktywny (Port 8080)",
        aiStatusDownloading: "Pobieranie modelu ({progress}%)...",
        aiStatusStarting: "Uruchamianie silnika...",
        aiStatusReady: "Gotowy do uruchomienia",
        aiStatusDownloaded: "Pobrano",
        aiStatusNotDownloaded: "Model niepobrany",
        cancelDownloadTitle: "Anuluj pobieranie",
        downloadModelTitle: "Pobierz {name} ({size})",
        downloadBtn: "Pobierz",
        startingBtn: "Uruchamianie...",
        stopBtn: "Zatrzymaj",
        startBtn: "Uruchom",
        openWebUiTitle: "Otwórz interfejs WWW llama.cpp",
        aiConsoleSettingsTitle: "Konsola llama.cpp i zaawansowane ustawienia",
        downloadingFile: "Pobieranie {filename}",
        downloadingWeights: "Pobieranie wag modelu...",
        noModelTitle: "Brak pobranego modelu AI",
        offlineBadge: "Offline",
        noModelDesc: "Pobierz {name}, aby uruchomić szybką, prywatną lokalną AI do podsumowań stron, kodowania i czatu.",
        downloadModelSize: "Pobierz model ({size})",
        settingsBtn: "Ustawienia",
        contextBtn: "Kontekst",
        searchBtn: "Szukaj",
        voiceBtn: "Głos",
        summarizeBtn: "Podsumuj",
        summarizePrompt: "Podsumuj tę stronę internetową przejrzyście, wypisując kluczowe wnioski i główne punkty na podstawie jej treści.",
        attachTitle: "Dołącz plik lub obraz",
        chatPlaceholder: "Zapytaj lokalną Gemma 4 AI lub upuść pliki...",
        voiceInputTitle: "Wprowadzanie głosowe (Whisper)",
        downloadsHeader: "Aktywne i ostatnie pobrania",
        itemSingular: "{count} element",
        itemPlural: "Elementy: {count}",
        openDownloadsFolderTitle: "Otwórz folder pobrań",
        clearDownloadsTitle: "Wyczyść wszystkie pobrania",
        downloadedFileFallback: "Pobrany plik",
        snipBadge: "Wycinek",
        verified: "Zweryfikowano",
        unverified: "Niezweryfikowano",
        sha256Prefix: "SHA-256: {hash}",
        saved: "Zapisano",
        verifyCopyHashTitle: "Zweryfikuj i kopiuj sumę SHA-256",
        copyHashTitle: "SHA-256: {hash} (Kliknij, aby skopiować)",
        copyImageTitle: "Kopiuj obraz do schowka",
        showInFolderTitle: "Pokaż w folderze",
        deleteDownloadTitle: "Usuń plik i usuń z listy",
        downloadsEmptyTitle: "Brak aktywnych pobrań",
        downloadsEmptyDesc: "Zrzuty ekranu i pobrane pliki pojawią się tutaj",
        pdfPageName: "{name} (Str. {page})",
        pdfImageSize: "Obraz PDF",
        toasts: {
            jumpingToNote: "Przechodzenie do notatki na stronie...",
            exportedMarkdown: "Wyeksportowano plik Markdown!",
            copiedNotesMarkdown: "Skopiowano notatki do schowka jako Markdown!",
            copiedToClipboard: "Skopiowano do schowka!",
            clipDeleted: "Usunięto element schowka",
            clipboardCleared: "Wyczyszczono historię schowka",
            parsingPdf: "Przetwarzanie wizualne PDF: {name}",
            pdfVramLimit: "Przetworzono pierwsze 10 stron pliku {name} jako obrazy (limit VRAM).",
            pdfVisualFailed: "Błąd przetwarzania wizualnego PDF. Powrót do ekstrakcji tekstu.",
            openPageFirst: "Najpierw otwórz stronę WWW, aby ją podsumować",
            transcriptionFailed: "Transkrypcja nie powiodła się",
            micDenied: "Brak dostępu do mikrofonu",
            noteRemoved: "Usunięto notatkę",
            noteUpdated: "Zaktualizowano notatkę",
            copiedQuote: "Skopiowano cytat",
            highlightRemoved: "Usunięto podświetlenie",
            downloadsCleared: "Wyczyszczono listę pobrań",
            hashCopied: "Skopiowano sumę kontrolną SHA-256 do schowka",
            hashMissing: "Nie można obliczyć skrótu — brak pliku",
            screenshotCopied: "Skopiowano zrzut ekranu do schowka",
            downloadDeleted: "Usunięto pobranie i plik"
        },
        cancelled: "Anulowano",
        failed: "Niepowodzenie"
    },
    fontManager: {
        title: "Typografia i czcionka aplikacji",
        active: "Aktywna:",
        resetTitle: "Przywróć domyślną czcionkę systemu operacyjnego",
        resetToDefault: "Przywróć domyślne",
        modes: {
            preset: "Gotowe czcionki",
            google: "Google Fonts",
            system: "Czcionki systemowe",
            file: "Wgraj czcionkę"
        },
        categories: {
            all: "Wszystkie",
            sans: "Bezszeryfowe",
            mono: "Stałe",
            serif: "Szeryfowe"
        },
        activeFont: "Aktywna czcionka",
        clickToApply: "Kliknij, aby zastosować",
        googleTitle: "Użyj dowolnej czcionki Google Font",
        googleDesc: "Wpisz nazwę czcionki z fonts.google.com i naciśnij Enter, aby natychmiast wczytać ją w QBrowse.",
        googlePlaceholder: "np. Montserrat, Space Grotesk, Syne, Cinzel...",
        applyFont: "Zastosuj czcionkę",
        popularGoogle: "Popularne czcionki Google Fonts",
        filterPlaceholder: "Filtruj listę...",
        systemTitle: "Wybór zainstalowanej czcionki systemowej",
        systemDesc: "Wpisz nazwę dowolnej czcionki zainstalowanej w systemie (np. Segoe UI Variable, Calibri, Helvetica, Comic Sans MS).",
        systemPlaceholder: "Wpisz nazwę czcionki systemowej...",
        installed: "Zainstalowana",
        notDetected: "Nie wykryto",
        notDetectedTitle: "Czcionka nie została wykryta przez pomiar metryk, ale CSS nadal spróbuje jej użyć, jeśli jest dostępna",
        commonOsFonts: "Popularne czcionki systemu operacyjnego",
        dropTitle: "Kliknij lub upuść plik czcionki tutaj",
        dropDesc: "Obsługuje TrueType (.ttf), OpenType (.otf), WOFF (.woff) i WOFF2 (.woff2) do 12 MB.",
        selectFile: "Wybierz lokalny plik czcionki",
        activeCustomFace: "Aktywna własna czcionka",
        removeFileTitle: "Usuń wgrany plik czcionki",
        fineTuning: "Precyzyjne dostrajanie typografii",
        letterSpacing: "Odstęp między literami (Tracking)",
        weightShift: "Grubość tekstu",
        fontScale: "Skala czcionki interfejsu",
        reset100Title: "Przywróć 100%",
        specimen: "Próbka typografii",
        specimen1: "Pchnąć w tę łódź jeża lub ośm skrzyń fig",
        specimen2: "Zażółć gęślą jaźń — 1234567890.",
        activeDefault: "Domyślna systemowa (Segoe UI / Natywna)",
        activeGoogle: "Google Font: {name}",
        activeSystem: "Czcionka systemowa: {name}",
        activeFile: "Własny plik: {name}",
        customLabel: "Własna",
        installedOsLabel: "Zainstalowana w OS",
        uploadedFontLabel: "Wgrana czcionka",
        spacing: {
            tight: "Wąski",
            normal: "Normalny",
            relaxed: "Luźny",
            wide: "Szeroki"
        },
        weight: {
            normal: "Normalna",
            medium: "Średnia",
            semibold: "Półgruba"
        },
        osLabels: {
            "Windows 11": "Windows 11",
            Windows: "Windows",
            macOS: "macOS",
            "macOS / Multi": "macOS / Wieloplatformowy",
            Universal: "Uniwersalna",
            "Windows Dev": "Windows Dev",
            "Windows Terminal": "Terminal Windows",
            Casual: "Swobodna",
            Linux: "Linux",
            GNOME: "GNOME",
            Serif: "Szeryfowa"
        },
        presetDefaultName: "Domyślna systemowa",
        presets: {
            default: {
                description: "Natywna typografia systemu operacyjnego (Segoe UI / San Francisco).",
                previewText: "Aa Bb Gg 123"
            },
            inter: {
                description: "Czysty, czytelny krój bezszeryfowy stworzony z myślą o ekranach cyfrowych.",
                previewText: "Nowoczesny Neo-Grotesque"
            },
            geist: {
                description: "Charakterystyczny krój deweloperski Vercel o geometrycznej precyzji.",
                previewText: "Minimalistyczna inżynieria"
            },
            outfit: {
                description: "Wyrafinowany geometryczny krój o estetyce marek premium.",
                previewText: "Luksusowy geometryczny"
            },
            "plus-jakarta": {
                description: "Świeży, przyjazny współczesny krój zaprojektowany dla nowoczesnych aplikacji.",
                previewText: "Przyjazny współczesny"
            },
            poppins: {
                description: "Przystępny geometryczny krój z miękkimi, energicznymi kształtami.",
                previewText: "Przystępne kształty"
            },
            roboto: {
                description: "Flagowy krój Google znany z systemu Android i Material Design.",
                previewText: "Architektura Material"
            },
            manrope: {
                description: "Połączenie nowoczesnego grotesku z geometryczną precyzją i czytelnością.",
                previewText: "Precyzyjny półgeometryczny"
            },
            lexend: {
                description: "Zaprojektowana naukowo, aby zmniejszać zmęczenie wzroku i przyspieszać czytanie.",
                previewText: "Swobodne czytanie"
            },
            "jetbrains-mono": {
                description: "Wyraźna czcionka do kodowania o podwyższonej wysokości liter dla programistów.",
                previewText: "Estetyka programisty"
            },
            "fira-code": {
                description: "Czcionka o stałej szerokości z ligaturami programistycznymi i świetną ostrością.",
                previewText: "=> Ligatury kodu"
            },
            "playfair-display": {
                description: "Kontrastowy szeryfowy krój inspirowany europejskim drukiem klasycznym.",
                previewText: "Redakcyjna elegancja"
            },
            merriweather: {
                description: "Ciepły, przyjemny krój szeryfowy zoptymalizowany pod dłuższe teksty.",
                previewText: "Klasyczna literatura"
            }
        },
        errors: {
            invalidFormat: "Nieprawidłowy format czcionki. Prześlij plik .ttf, .otf, .woff lub .woff2.",
            tooLarge: "Plik czcionki jest za duży. Maksymalny obsługiwany rozmiar to 12 MB.",
            readFailed: "Nie udało się odczytać pliku czcionki. Wybierz inny plik."
        },
        toasts: {
            presetSet: "Ustawiono czcionkę aplikacji na {name}",
            googleApplied: "Zastosowano czcionkę Google Font „{name}”",
            systemApplied: "Zastosowano czcionkę systemową „{name}”",
            fileLoaded: "Wczytano plik własnej czcionki „{name}”"
        }
    },
    aiSettings: {
        title: "Silnik AI llama.cpp",
        status: {
            online: "Online (llama-server)",
            starting: "Uruchamianie...",
            updating: "Aktualizacja silnika...",
            error: "Błąd silnika",
            stopped: "Zatrzymany"
        },
        syncTitle: "Sprawdź i zsynchronizuj natywny silnik llama.cpp (b11796 ze wsparciem Gemma 4)",
        updatingBtn: "Aktualizowanie...",
        syncBtn: "Synchronizuj silnik (b11796)",
        subtitle: "Szybki, lokalny silnik LLM bez telemetrii z natywną obsługą modeli Gemma 4, Qwen 3.5 i Bielik 11B GGUF.",
        downloadingModel: "Pobieranie modelu ({progress}%)",
        connectingCdn: "Łączenie z CDN...",
        cancel: "Anuluj",
        downloadBtn: "Pobierz {name} ({size})",
        startingBtn: "Uruchamianie llama-server...",
        stopBtn: "Zatrzymaj llama-server",
        startBtn: "Uruchom silnik llama-server",
        defaultStartError: "Wystąpił błąd podczas uruchamiania modelu przez llama-server.",
        dismiss: "Odrzuć",
        updateEngineBtn: "Zaktualizuj silnik AI",
        genSpeed: "Prędkość generowania",
        tokPerSec: "tok/s",
        contextWindow: "Okno kontekstu",
        tokens: "tokenów",
        gpuOffload: "Odciążenie GPU",
        layers: "warstw",
        activeModelTitle: "Aktywny model GGUF",
        loadCustomGguf: "Wczytaj własny plik .GGUF...",
        loadCustomProjector: "Wczytaj własny projektor...",
        customModelPrefix: "Własny model: {path}",
        customProjectorPrefix: "Własny projektor: {path}",
        reset: "Resetuj",
        downloadedBadge: "Pobrano",
        downloadingTarget: "Pobieranie: {target}",
        visionProjector: "Projektor wizyjny...",
        languageModel: "Model językowy...",
        weights: "wagi modelu...",
        modelReady: "Model gotowy do użycia",
        downloadModelFile: "Pobierz plik modelu ({size})",
        overridesTitle: "Parametry zaawansowane llama-server",
        autoDetectBtn: "Wykryj sprzęt automatycznie",
        cpuThreadsLabel: "Wątki CPU (-t): {threads}",
        contextSizeLabel: "Rozmiar kontekstu (-c)",
        tokensOption: "{n} tokenów",
        contextBadges: {
            compact: "Kompaktowy",
            default: "Domyślny",
            extended: "Rozszerzony",
            max: "Maksymalny"
        },
        gpuLayersLabel: "Warstwy na GPU (-ngl): {layers}",
        dataProcessingTitle: "Przetwarzanie danych",
        parsePdfTitle: "Przetwarzaj PDF jako obrazy",
        parsePdfDesc: "Podczas upuszczania plików PDF na czat konwertuj strony na obrazy zamiast wyciągać surowy tekst. Najlepsze dla modeli wizyjnych Gemma 4 i Qwen 3.5 do analizy wykresów i układów.",
        consoleTitle: "Konsola terminala llama-server (wyjście na żywo)",
        copyOutputTitle: "Kopiuj wyjście terminala",
        clearConsoleTitle: "Wyczyść konsolę",
        consoleEmpty: "[Konsola llama-server gotowa. Oczekiwanie na logi uruchomienia serwera...]",
        modelWord: "Model",
        visionWord: "Wizja",
        models: {
            "gemma-4-e2b": "Model Google Gemma 4 E2B Instruct GGUF z pełnym wsparciem multimodalnej wizji do analizy obrazów i czatu.",
            "gemma-4-e4b": "Zaawansowany model Google Gemma 4 E4B z pełnym wsparciem wizji multimodalnej do złożonej analizy.",
            "qwen-3.5-4b": "Model Alibaba Qwen 3.5 4B z obsługą wizji multimodalnej, rozumowaniem, generowaniem kodu i wielojęzycznością.",
            "bielik-11b-v3.1": "Flagowy polski i europejski model 11B od SpeakLeash z głębokim wyczuciem języka polskiego, realizacją poleceń i rozumowaniem."
        },
        toasts: {
            customModelLoaded: "Wczytano własny model: {name}",
            demoModelLoaded: "Wczytano przykładową ścieżkę własnego modelu!",
            customProjectorLoaded: "Wczytano własny projektor wizyjny: {name}",
            demoProjectorLoaded: "Wczytano przykładową ścieżkę projektora!",
            updatingEngine: "Aktualizowanie natywnego silnika llama.cpp...",
            engineUpdated: "Silnik llama.cpp zaktualizowany do najnowszej wersji (b11796)!",
            engineUpdateFailed: "Aktualizacja silnika nie powiodła się: {error}",
            unknownError: "Nieznany błąd",
            logsCopied: "Skopiowano logi llama-server do schowka!",
            hardwareDetected: "Wykryto sprzęt: {threads} wątków, {ram} GB RAM",
            hardwareDefault: "Wykryto sprzęt: zastosowano domyślne optymalizacje",
            resizingContext: "Zmiana okna kontekstu llama-server na {tokens} tokenów..."
        }
    },
    adblockImport: {
        title: "Importuj listę blokowania z GitHub / Sieci",
        subtitle: "Automatycznie analizuj pliki hosts, surowe listy GitHub lub reguły Adblock do własnej listy.",
        closeTitle: "Zamknij",
        modeUrl: "Zdalny URL / GitHub",
        modePaste: "Wklej tekst",
        urlLabel: "Adres URL listy (GitHub raw, Gist lub plik hosts)",
        githubRawBadge: "GitHub Raw",
        githubRawTitle: "Wykryto link GitHub i automatycznie przekształcono go na format raw",
        fetching: "Pobieranie...",
        fetchParse: "Pobierz i analizuj",
        popularLists: "Popularne listy społecznościowe",
        pasteLabel: "Wklej plik hosts, reguły ABP lub listę domen",
        pastePlaceholder: "# Wklej dowolny format poniżej:\n0.0.0.0 tracking.evil.com\n127.0.0.1 ads.adserver.org\n||telemetry.network.io^\nanalytics.badsite.com",
        parsing: "Analizowanie...",
        parseDomains: "Analizuj domeny",
        back: "Wstecz",
        backTitle: "Wróć do wyboru źródła (Esc)",
        readyToImport: "Gotowe do importu",
        kbSource: "Źródło: {kb} KB",
        validDomains: "Poprawne domeny",
        newUnique: "Nowe unikalne",
        duplicatesFiltered: "Odfiltrowane duplikaty",
        linesAnalyzed: "Przeanalizowane linie",
        extractedSample: "Próbka wyodrębnionych domen ({count})",
        searchSamplePlaceholder: "Szukaj w próbce...",
        moreDomains: "+ {count} więcej domen",
        backToSource: "Wróć do źródła",
        cancel: "Anuluj",
        replaceList: "Zastąp całą listę",
        replaceListTitle: "Zastępuje obecną własną listę blokowania przeanalizowanymi domenami",
        importN: "Importuj {count} domen",
        importDomains: "Importuj domeny",
        pastedSourceLabel: "Wklejony tekst",
        errors: {
            invalidUrl: "Wprowadź prawidłowy adres URL listy blokowania.",
            fetchFailed: "Nie udało się pobrać zdalnej listy blokowania",
            noValidFromUrl: "Nie udało się wyodrębnić żadnych prawidłowych domen z tego źródła.",
            downloadError: "Błąd pobierania zdalnej listy",
            emptyPaste: "Najpierw wklej domeny lub reguły pliku hosts.",
            noValidFromText: "Nie udało się wyodrębnić prawidłowych nazw domen z tekstu.",
            parseError: "Błąd podczas analizowania tekstu"
        },
        presets: {
            stevenblack: {
                desc: "Kompleksowa lista społecznościowa przeciw adware i malware.",
                badge: "Polecana"
            },
            "oisd-basic": {
                desc: "Lekka lista bez fałszywych alarmów blokująca śledzenie w sieci i na urządzeniach mobilnych.",
                badge: "Niskie zużycie"
            },
            "adguard-trackers": {
                desc: "Wyspecjalizowana lista domen blokująca skrypty analityczne i telemetrię.",
                badge: "Prywatność"
            },
            peterlowe: {
                desc: "Klasyczna, sprawdzona lista aktywnych serwerów reklamowych.",
                badge: "Szybka"
            },
            danpollock: {
                desc: "Zaufana lista zero-host blokująca telemetrię, spam i szkodliwe witryny.",
                badge: "Klasyczna"
            }
        }
    },
    studio: {
        title: "Studio motywów i układu",
        subtitle: "Wizualnie przestawiaj elementy, rzeźbij zaokrąglenia, dostosuj motywy i zarządzaj własnymi szablonami.",
        tabCanvas: "Płótno",
        tabPresets: "Szablony",
        closeAria: "Zamknij Studio motywów",
        dockLeftSidebar: "Zadokuj pasek boczny po lewej",
        dockRightSidebar: "Zadokuj pasek boczny po prawej",
        dockTopBar: "Zadokuj pasek nawigacji na górze",
        dockBottomBar: "Zadokuj pasek nawigacji na dole",
        searchBarPlaceholder: "Szukaj w sieci lub wpisz polecenie...",
        toolhubDockTitle: "Dok ToolHub: {pos} (Kliknij lub przeciągnij, aby zamienić)",
        legendDock: "Dok:",
        legendBarValue: "Pasek ({pos})",
        legendSidebar: "Pasek boczny:",
        legendToolhub: "ToolHub:",
        legendSummary: "Zaokrąglenie: {curvature} · Omnibox: {omnibox} · Karty: {tabs}",
        layoutControls: "Kontrolki układu",
        resetTitle: "Przywróć szkic do aktualnych ustawień przeglądarki",
        reset: "Resetuj",
        editingLabel: "Edycja:",
        cancelEditTitle: "Anuluj edycję i utwórz nowy szablon",
        cancel: "Anuluj",
        sidebarMode: "Tryb paska bocznego",
        sidebarModes: {
            classic: "Klasyczny",
            floating: "Pływający",
            compact: "Kompaktowy",
            hidden: "Ukryty"
        },
        windowCurvature: "Zaokrąglenie okna",
        curvatures: {
            default: "Domyślne",
            cohesive: "Spójne",
            square: "Ostre"
        },
        omniboxArch: "Styl paska adresu (Omnibox)",
        omniboxStyles: {
            capsule: "Kapsuła",
            wide: "Szeroki",
            minimal: "Minimalny"
        },
        tabPresentation: "Prezentacja kart",
        tabStyles: {
            pills: "Pigułki",
            compact: "Kompaktowe",
            cards: "Kafelki"
        },
        windowControlsStyle: "Styl przycisków okna",
        controlsStyles: {
            mac: "macOS",
            windows: "Windows",
            minimal: "Minimalny"
        },
        windowControlsLayout: "Układ przycisków okna",
        controlsOrders: {
            auto: "Inteligentny róg",
            "close-first": "Najpierw zamknij",
            "minimize-first": "Najpierw minimalizuj"
        },
        themeLabel: "Motyw",
        themes: {
            dark: "Ciemny",
            light: "Jasny"
        },
        uiScaleLabel: "Skala interfejsu",
        uiScales: {
            comfortable: "Normalna",
            compact: "Kompaktowa"
        },
        accentSwatchLabel: "Paleta koloru akcentu",
        openColorPickerTitle: "Otwórz systemowy próbnik kolorów",
        saveChanges: "Zapisz zmiany",
        applyLive: "Zastosuj na żywo",
        saveAsNew: "Zapisz jako nowy",
        applyToBrowser: "Zastosuj w przeglądarce",
        saveAsCustom: "Zapisz jako własny szablon",
        searchPresetsPlaceholder: "Szukaj szablonów...",
        filterAll: "Wszystkie",
        filterBuiltin: "Wbudowane",
        filterCustom: "Własne ({count})",
        saveActiveSetup: "Zapisz aktywny układ przeglądarki",
        activeBadge: "Aktywny",
        editingBadge: "(Edytowany)",
        reapply: "Zastosuj ponownie",
        apply: "Zastosuj",
        editInStudio: "Edytuj w Studio",
        customize: "Dostosuj",
        editPresetTitle: "Edytuj szablon w studio",
        customizePresetTitle: "Dostosuj układ w studio",
        duplicateTitle: "Duplikuj szablon",
        deleteTitle: "Usuń własny szablon",
        editCustomModalTitle: "Edytuj własny szablon",
        saveCustomModalTitle: "Zapisz jako własny szablon",
        presetNameLabel: "Nazwa szablonu",
        presetNamePlaceholder: "np. Układ ergonomiczny, Minimalistyczny Arc",
        presetDescLabel: "Opis / Podtytuł",
        presetDescPlaceholder: "Krótki opis tej konfiguracji...",
        presetIconLabel: "Ikona szablonu",
        createPreset: "Utwórz szablon",
        deleteConfirmTitle: "Usunąć własny szablon?",
        deleteConfirmDescBefore: "Czy na pewno chcesz usunąć szablon ",
        deleteConfirmDescAfter: "? Tej operacji nie można cofnąć.",
        deletePresetBtn: "Usuń szablon",
        posTop: "Góra",
        posBottom: "Dół",
        posLeft: "Lewo",
        posRight: "Prawo",
        moveTo: "Przenieś na: {pos}",
        draggableNavTitle: "Przeciągalny pasek nawigacji: przeciągnij na górę lub dół albo kliknij zamianę",
        draggableSidebarTitle: "Przeciągalny pasek boczny: przeciągnij między lewą a prawą strefą",
        swapTo: "Przenieś na: {pos}",
        miniTab: "Karta #{num}",
        miniCardView: "Widok kafelka #{num}",
        miniActiveSpaceTab: "Aktywna karta obszaru",
        miniSidebarPos: "Pasek boczny ({pos})",
        layoutTagFormat: "{bar} · {sidebar}",
        layoutSummaryFormat: "{tag} · {toolhub}",
        topBarLabel: "Górny pasek",
        bottomBarLabel: "Dolny pasek",
        leftSidebarLabel: "Lewy pasek boczny",
        rightSidebarLabel: "Prawy pasek boczny",
        leftToolhubLabel: "Lewy ToolHub",
        rightToolhubLabel: "Prawy ToolHub",
        tabsHighlight: "Karty: {style}",
        compactScaleLabel: "Skala kompaktowa",
        comfortableScaleLabel: "Skala komfortowa",
        defaultCustomName: "Własny szablon",
        defaultCustomDesc: "Własna konfiguracja użytkownika",
        defaultNewNameFormat: "{bar} {side}",
        defaultNewNameArc: "Arc",
        defaultNewNameFlow: "Flow",
        defaultNewDescFormat: "Własny układ: {bar}, {sidebar}, karty: {tabs}",
        toasts: {
            applied: "Zastosowano układ w przeglądarce!",
            reset: "Przywrócono szkic do ustawień przeglądarki",
            editingPreset: "Edycja „{name}” w Studio",
            loadedPreset: "Wczytano „{name}” na płótno Studio",
            switchedNewDraft: "Przełączono na nowy szkic"
        }
    },
    setup: {
        strictOfflineTitle: "Zero żądań w tle (Ścisły tryb offline)",
        strictOfflineDesc: "Wyłącz cały opcjonalny ruch sieciowy w tle (sprawdzanie aktualizacji, odświeżanie filtrów, podpowiedzi na żywo, zdalne ikony i synchronizację w chmurze).",
        headerTitle: "Konfiguracja QBrowse",
        headerSubtitle: "Asystent personalizacji",
        steps: {
            language: {
                label: "Język",
                desc: "Język interfejsu"
            },
            presets: {
                label: "Motywy i styl",
                desc: "Wygląd i układ"
            },
            import: {
                label: "Import",
                desc: "Zakładki i hasła"
            },
            privacy: {
                label: "Prywatność",
                desc: "Tarcze i Tor"
            },
            default: {
                label: "Domyślna",
                desc: "Integracja z systemem"
            },
            sync: {
                label: "Synchronizacja",
                desc: "Chmura lub lokalnie"
            }
        },
        chooseSetupTitle: "Wybierz swój układ",
        chooseSetupDesc: "Wybierz dopasowany szablon na start. W każdej chwili możesz dostosować dowolny panel.",
        customLayoutCta: "Własny układ? Studio motywów →",
        themeLabel: "Motyw",
        dark: "Ciemny",
        light: "Jasny",
        accentLabel: "Akcent",
        step2Badge: "Krok 2 z 5",
        step2Title: "Przenieś dane i hasła",
        step2Desc: "Zaimportuj zakładki oraz przenieś hasła z Bitwarden, Proton Pass, Chrome lub Firefox.",
        tabBookmarks: "Zakładki",
        tabVault: "Sejf haseł",
        bookmarksFound: "Znaleziono zakładek: {count}",
        notDetected: "Nie wykryto na tym komputerze",
        imported: "Zaimportowano",
        importing: "Importowanie...",
        importBookmarks: "Importuj zakładki",
        scanningBrowsers: "Skanowanie zainstalowanych przeglądarek...",
        htmlImported: "Zaimportowano plik HTML ({count} pozycji)",
        uploadHtml: "Wgraj plik HTML z zakładkami (.html)",
        vaultComplete: "Migracja sejfu zakończona",
        vaultImportedSummary: "Pomyślnie zaimportowano {count} pozycji z {source} do QVault!",
        importAnother: "Importuj kolejny",
        exportCsvJson: "Eksportuj jako .CSV lub .JSON",
        parsingVault: "Analizowanie pliku sejfu...",
        uploadVault: "Wgraj eksport sejfu (.csv lub .json)",
        compatibleManagers: "Zgodny z Bitwarden, Proton Pass, Google Chrome, Edge, Brave i 1Password",
        step3Badge: "Krok 3 z 5",
        step3Title: "Wzmocnij prywatność",
        step3Desc: "QBrowse blokuje skrypty śledzące, eliminuje natrętne reklamy i kieruje ruch przez sieć Tor.",
        privacyOptimizedBadge: "Szablon: Zoptymalizowano dla prywatności",
        adblockTitle: "Natywna tarcza trackerów Ghostery",
        adblockDesc: "Blokuje trackery, telemetrię, analitykę i uciążliwe reklamy bez spowalniania ładowania stron.",
        torTitle: "Obszar trasowania cebulowego Tor",
        torDesc: "Umożliwia przeglądanie domen .onion i wielowęzłowych szyfrowanych obwodów w dowolnej chwili.",
        ready: "Gotowy",
        step4Badge: "Krok 4 z 5",
        step4Title: "Ustaw jako domyślną przeglądarkę",
        step4Desc: "Otwieraj linki z pulpitu w odizolowanych obszarach, oddzielając pracę od prywatnych spraw.",
        isDefaultTitle: "QBrowse jest Twoją domyślną przeglądarką!",
        makeDefaultTitle: "Uczyń QBrowse główną bramą do sieci",
        isDefaultDesc: "Wszystkie linki z pulpitu i pliki HTML będą otwierane automatycznie w QBrowse.",
        makeDefaultDesc: "Obsługuje wszystkie linki http://, https:// oraz pliki HTML z pełną integracją z systemem.",
        osLabels: {
            darwin: "Ustawienia systemowe",
            linux: "Domyślne aplikacje",
            win32: "Domyślne aplikacje Windows"
        },
        defaultHint: "Otwarto okno „{label}” — wybierz QBrowse w oknie systemowym, aby potwierdzić.",
        openOsSettings: "Otwórz: {label}",
        defaultSet: "Ustawiono jako domyślną",
        openingSettings: "Otwieranie ustawień...",
        setAsDefault: "Ustaw jako domyślną przeglądarkę",
        step5Badge: "Krok 5 z 5 • Profil i chmura",
        step5Title: "Wybierz sposób przeglądania",
        step5Desc: "QBrowse zapewnia pełną niezależność. Przeglądaj całkowicie offline z lokalnym szyfrowaniem sprzętowym lub załóż darmowe konto Cloud Sync, aby synchronizować sejf, obszary i zakładki między urządzeniami.",
        zeroTelemetry: "Zero telemetrii",
        localProfile: "Profil lokalny",
        localProfileDesc: "100% offline. Wszystkie hasła, historia i karty pozostają zaszyfrowane lokalnie kluczami sprzętowymi. Bez zakładania konta.",
        e2eEncrypted: "Szyfrowanie E2E",
        cloudSync: "QBrowse Cloud Sync",
        cloudSyncDesc: "Synchronizuj sejf haseł, obszary robocze, przypięte karty i zakładki płynnie między komputerami przez Firebase.",
        localReadyTitle: "Profil lokalny jest gotowy do startu",
        localReadyDesc: "Wszystkie zakładki, hasła i obszary pozostaną wyłącznie na tym komputerze bez telemetrii. Cloud Sync możesz włączyć później w Ustawieniach lub menu profilu.",
        takeTour: "Rozpocznij interaktywny przewodnik",
        startDirectly: "Zacznij przeglądać od razu",
        activeSync: "Synchronizacja aktywna",
        cloudLinked: "Połączono zaszyfrowaną pamięć w chmurze End-to-End",
        signOut: "Wyloguj",
        activeSyncDesc: "Twoje zakładki, karty obszarów roboczych oraz zaszyfrowany sejf haseł są na bieżąco synchronizowane między urządzeniami.",
        signIn: "Zaloguj się",
        existingAccount: "(Mam już konto)",
        register: "Rejestracja",
        newAccount: "(Nowe konto)",
        registerSubtitle: "Utwórz nowe konto QBrowse, aby synchronizować dane między urządzeniami.",
        signInSubtitle: "Zaloguj się, aby zsynchronizować istniejące zakładki, obszary i sejf.",
        switchToSignIn: "Przejdź do logowania",
        emailLabel: "Adres e-mail",
        emailPlaceholder: "nazwa@przyklad.pl",
        createPassLabel: "Utwórz hasło (min. 6 znaków)",
        accountPassLabel: "Hasło do konta",
        min6Chars: "Minimum 6 znaków",
        confirmPassLabel: "Potwierdź hasło",
        passwordsMatch: "Hasła są zgodne",
        passwordsMismatch: "Hasła nie są zgodne",
        useAccountAsMaster: "Użyj hasła konta jako klucza głównego szyfrowania",
        masterDerivedDesc: "Wyprowadza klucze klienta AES-GCM 256-bit bezpośrednio z hasła logowania.",
        masterSeparateDesc: "Używanie osobnego własnego hasła szyfrującego.",
        customMasterLabel: "Własne główne hasło szyfrujące",
        customMasterPlaceholder: "Wpisz unikalne hasło szyfrujące sejf...",
        creatingAccount: "Tworzenie zaszyfrowanego konta...",
        signingInSyncing: "Logowanie i synchronizacja...",
        createAccountBtn: "Utwórz konto i włącz Cloud Sync",
        signInBtn: "Zaloguj i włącz Cloud Sync",
        alreadyRegistered: "Masz już konto w QBrowse?",
        signInHere: "Zaloguj się tutaj",
        newToSync: "Pierwszy raz w QBrowse Cloud Sync?",
        createFreeAccount: "Utwórz darmowe konto (Rejestracja)",
        skipSyncLocal: "Pomiń synchronizację w chmurze i kontynuuj z profilem lokalnym (bez konta)",
        skipSyncComplete: "Pomiń synchronizację i zakończ",
        vaultModalTitle: "Zabezpiecz zaimportowany sejf",
        vaultModalDesc: "Wpisz lub utwórz hasło główne, aby zaszyfrować swoje poświadczenia.",
        masterPassLabel: "Hasło główne",
        masterPassPlaceholder: "Wpisz hasło główne...",
        confirmMasterLabel: "Potwierdź hasło główne",
        confirmMasterPlaceholder: "Potwierdź hasło...",
        cancel: "Anuluj",
        encryptImport: "Zaszyfruj i importuj",
        bookmarkFallback: "Zakładka",
        htmlFileFallback: "plik HTML",
        toasts: {
            enterEmail: "Wprowadź adres e-mail.",
            validEmail: "Wprowadź prawidłowy adres e-mail (np. nazwa@domena.pl).",
            passMin6: "Hasło musi mieć co najmniej 6 znaków.",
            confirmPassReq: "Potwierdź swoje hasło.",
            passMismatch: "Hasła nie są zgodne. Wpisz je ponownie.",
            signedIn: "Zalogowano do QBrowse Cloud Sync!",
            registered: "Konto utworzone, Cloud Sync aktywny!",
            bookmarksImported: "Pomyślnie zaimportowano {count} zakładek!",
            importFailed: "Import nie powiódł się.",
            couldNotImportBookmarks: "Nie udało się zaimportować zakładek.",
            htmlImported: "Zaimportowano {count} zakładek z pliku {filename}!",
            htmlImportFailed: "Import zakładek HTML nie powiódł się.",
            noCredentials: "Nie znaleziono poświadczeń w pliku",
            passwordsImported: "Zaimportowano {count} haseł z {source}!",
            vaultImportFailed: "Błąd importu: {error}",
            passMin4: "Hasło musi mieć co najmniej 4 znaki",
            vaultPassMismatch: "Hasła nie są zgodne",
            incorrectMasterPass: "Nieprawidłowe hasło główne do istniejącego sejfu",
            vaultImportError: "Błąd importu: {error}",
            nowDefault: "QBrowse jest teraz Twoją domyślną przeglądarką!",
            openingWinDefault: "Otwieranie Domyślnych aplikacji Windows. Kliknij „Ustaw domyślną” dla QBrowse.",
            openingOsDefault: "Otwieranie „{label}”. Wybierz QBrowse jako domyślną przeglądarkę.",
            couldNotOpenDefault: "Nie udało się otworzyć ustawień domyślnej przeglądarki."
        }
    },
    flags: {
        title: "Eksperymenty",
        subtitle: "Dostrajaj eksperymentalne funkcje przeglądarki, potoki grafiki sprzętowej, szyfry postkwantowe oraz parametry izolacji strumieni Tor.",
        resetAll: "Przywróć wszystkie domyślne",
        warningTitle: "Uwaga: funkcje eksperymentalne!",
        warningBody: "Włączenie tych przełączników zmienia działanie silnika Chromium V8, kompozytora sprzętowego lub parametry TLS. Wymagany jest restart przeglądarki.",
        searchPlaceholder: "Szukaj flag (np. GPU, Kyber, QUIC, DoH, bfcache)...",
        tabAvailable: "Dostępne ({count})",
        tabUnavailable: "Niedostępne ({count})",
        categories: {
            All: "Wszystkie",
            Performance: "Wydajność",
            "Hardware & Graphics": "Sprzęt i grafika",
            "Web Standards & Engine": "Standardy WWW i silnik",
            Security: "Bezpieczeństwo",
            Networking: "Sieć",
            "Media & UI": "Media i interfejs",
            "AI & Tools": "AI i narzędzia",
            Experimental: "Eksperymentalne"
        },
        statuses: {
            Stable: "Stabilna",
            Beta: "Beta",
            Experimental: "Eksperymentalna"
        },
        options: {
            default: "Domyślna",
            enabled: "Włączona",
            disabled: "Wyłączona"
        },
        emptyMatch: "Brak dostępnych flag pasujących do „{search}”",
        reasonPrefix: "Powód: {reason}",
        unavailableBadge: "Niedostępna",
        relaunchMsg: "Zmiany zaczną obowiązywać po ponownym uruchomieniu QBrowse.",
        relaunchBtn: "Uruchom ponownie",
        toasts: {
            reset: "Przywrócono domyślne wartości wszystkich flag eksperymentalnych",
            relaunching: "Ponowne uruchamianie QBrowse ze zaktualizowanymi flagami..."
        },
        items: {
            "prefer-high-performance-gpu": {
                name: "Preferuj wydajny procesor graficzny (GPU)",
                description: "Kieruje renderowanie WebGL, Canvas i 3D na dedykowaną kartę graficzną w systemach z wieloma GPU. Automatycznie wyłączane w trybie Eco."
            },
            "unlock-frame-rate": {
                name: "Odblokowany limit klatek (Tryb benchmark)",
                description: "Wyłącza synchronizację pionową (V-Sync) dla testów FPS Canvas/WebGL (np. TestUFO). Może powodować rozrywanie obrazu i wyższy pobór mocy."
            },
            "ignore-gpu-blocklist": {
                name: "Ignoruj czarną listę GPU",
                description: "Pomija wbudowane listy renderowania programowego Chromium i wymusza akcelerację sprzętową na starszych sterownikach."
            },
            "experimental-web-platform": {
                name: "Eksperymentalne funkcje platformy Web",
                description: "Włącza eksperymentalne interfejsy API rozwijane w Chromium. Zwiększa zgodność w testach HTML5Test; niektóre API mogą być niestabilne."
            },
            "gpu-rasterization": {
                name: "Rasteryzacja GPU i akceleracja kompozytora",
                description: "Przyspiesza rasteryzację i składanie stron WWW przez dedykowane potoki sprzętowe GPU zamiast renderowania programowego na CPU."
            },
            "smooth-scrolling": {
                name: "Silnik płynnego przewijania",
                description: "Włącza płynne fizyczne animacje przewijania przy użyciu kółka myszy, gładzika i klawiszy strzałek."
            },
            "zero-copy-rasterizer": {
                name: "Rasteryzator GPU Zero-Copy (GpuMemoryBuffer)",
                description: "Wątki rasteryzacji zapisują dane bezpośrednio do współdzielonych tekstur GPU bez pośrednich kopii w pamięci CPU."
            },
            "enable-vulkan": {
                name: "Backend graficzny i kompozytora Vulkan",
                description: "Wykorzystuje wieloplatformowe API Vulkan do składania grafiki i akceleracji GPU na obsługiwanych kartach graficznych."
            },
            "back-forward-cache": {
                name: "Pamięć podręczna wstecz/dalej (bfcache)",
                description: "Zachowuje pełne migawki ostatnio odwiedzonych stron w pamięci RAM, zapewniając natychmiastowe przechodzenie wstecz i dalej."
            },
            "canvas-oop-rasterization": {
                name: "Pozaprocesowa rasteryzacja 2D Canvas",
                description: "Wykonuje operacje rysowania HTML5 2D Canvas w dedykowanym procesie GPU zamiast w odizolowanym procesie renderera."
            },
            "enable-drdc": {
                name: "Dynamiczne wykrywanie wysokiego odświeżania (120Hz/144Hz/240Hz)",
                description: "Synchronizuje taktowanie klatek i V-Sync z wyświetlaczami ProMotion oraz monitorami o wysokiej częstotliwości odświeżania."
            },
            "auto-suspend-tabs": {
                name: "Automatyczne usypianie kart (oszczędzanie RAM)",
                description: "Automatycznie zwalnia pamięć nieaktywnych kart w tle po 15 minutach bezczynności, oszczędzając RAM i baterię."
            },
            "parallel-download-engine": {
                name: "Równoległe pobieranie wielowątkowe",
                description: "Dzieli duże pobierane pliki na wiele równoległych żądań zakresów HTTP, maksymalizując wykorzystanie łącza."
            },
            "lazy-image-loading": {
                name: "Leniwe ładowanie obrazów i osadzonych ramek",
                description: "Odracza ładowanie obrazów i ramek iframe poza ekranem do momentu przewinięcia do nich, zmniejszając początkowy transfer."
            },
            "enable-tls13-kyber": {
                name: "Kryptografia postkwantowa dla TLS (Kyber768 / ML-KEM)",
                description: "Włącza hybrydową wymianę kluczy odporną na komputery kwantowe (X25519Kyber768) w uzgadnianiu TLS 1.3."
            },
            "enable-encrypted-client-hello": {
                name: "Encrypted Client Hello (ECH / szyfrowane SNI)",
                description: "Szyfruje nazwę serwera (SNI) w trakcie uzgadniania TLS, chroniąc odwiedzane domeny przed podsłuchem dostawców internetu."
            },
            "strict-origin-isolation": {
                name: "Ścisła izolacja witryn na poziomie procesów",
                description: "Wymusza osobny proces systemu operacyjnego z izolowaną pamięcią dla każdej domeny, chroniąc przed atakami Spectre i Meltdown."
            },
            "webrtc-ip-protection": {
                name: "Ochrona lokalnego adresu IP w WebRTC",
                description: "Ogranicza kandydatów ICE w WebRTC, zapobiegając wyciekom lokalnego i publicznego adresu IP przez złośliwe skrypty."
            },
            "enable-dns-over-https": {
                name: "Ścisły DNS-over-HTTPS (DoH Cloudflare/Quad9)",
                description: "Szyfruje wszystkie zapytania DNS przez protokół HTTPS (port 443), blokując podsłuchiwanie i zatruwanie DNS."
            },
            "disable-hyperlink-auditing": {
                name: "Blokuj audytowanie odnośników (<a ping>)",
                description: "Blokuje wysyłanie ukrytych żądań śledzących POST podczas klikania linków na stronach."
            },
            "enable-fingerprint-randomization": {
                name: "Losowy szum chroniący przed fingerprintingiem Canvas i WebAudio",
                description: "Subtelnie modyfikuje odczyty pikseli i buforów audio pseudolosowym szumem, uniemożliwiając unikalną identyfikację sprzętu."
            },
            "enable-font-enumeration-shield": {
                name: "Ochrona przed skanowaniem czcionek systemowych",
                description: "Uniemożliwia aplikacjom WWW wykrywanie listy lokalnie zainstalowanych czcionek w celu śledzenia użytkownika."
            },
            "aggressive-tracker-blocker": {
                name: "Agresywne usuwanie parametrów śledzących z URL",
                description: "Automatycznie usuwa parametry śledzące (utm_source, gclid, fbclid, msclkid) oraz blokuje znane piksele śledzące."
            },
            "enable-subresource-filter": {
                name: "Filtr podzasobów dla natarczywych nakładek",
                description: "Automatycznie wykrywa i blokuje próby clickjackingu, niewidoczne linki oraz zwodnicze monity pobierania."
            },
            "enable-quic": {
                name: "Eksperymentalny protokół transportowy QUIC i HTTP/3",
                description: "Włącza transport HTTP/3 oparty na UDP zapewniający połączenia zero-RTT oraz multipleksowanie bez blokowania kolejki."
            },
            "tor-stream-isolation": {
                name: "Izolacja obwodów Tor dla każdej domeny (IsolateDestAddr)",
                description: "Wymusza osobny obwód wyjściowy dla każdej domeny w obszarze Tor, zapobiegając korelacji ruchu między witrynami."
            },
            "dns-prefetching": {
                name: "Predykcyjne wstępne rozwiązywanie nazw DNS",
                description: "Wyprzedzająco rozwiązuje adresy IP linków widocznych na stronie, aby skrócić czas oczekiwania po kliknięciu."
            },
            "heavy-ad-intervention": {
                name: "Interwencja dla nadmiernie obciążających reklam",
                description: "Wyładowuje ramki reklamowe zużywające ponad 4 MB transferu lub 60 sekund czasu procesora."
            },
            "cross-origin-isolation": {
                name: "Polityka COOP i obsługa SharedArrayBuffer",
                description: "Umożliwia operacje współdzielonej pamięci WebAssembly wysokiej precyzji przez ścisłe reguły Cross-Origin."
            },
            "document-pip-api": {
                name: "Interfejs Document Picture-in-Picture API",
                description: "Umożliwia tworzenie pływających okien Picture-in-Picture z dowolną zawartością HTML, wideo i widżetami."
            },
            "force-dark-contents": {
                name: "Automatyczny tryb ciemny treści stron (inwersja Chromium)",
                description: "Automatycznie generuje ciemny motyw dla stron obsługujących tylko jasne tło z zachowaniem jasności obrazów."
            },
            "overlay-scrollbars": {
                name: "Minimalistyczne pływające paski przewijania",
                description: "Zastępuje masywne paski systemowe smukłymi wskaźnikami, które automatycznie zanikają po zakończeniu przewijania."
            },
            "enable-webgpu": {
                name: "Interfejs grafiki i obliczeń WebGPU nowej generacji",
                description: "Zapewnia bezpośredni, niskopoziomowy dostęp do GPU dla sieci neuronowych w przeglądarce, symulacji 3D i shaderów."
            },
            "tab-audio-muting": {
                name: "Wyciszanie dźwięku karty jednym kliknięciem",
                description: "Dodaje interaktywną ikonę głośnika na przyciskach kart, pozwalając natychmiast wyciszyć dźwięk jednym kliknięciem."
            },
            "webrtc-pipewire": {
                name: "Przechwytywanie pulpitu PipeWire (Linux Wayland)",
                description: "Włącza udostępnianie ekranu i okien przez portal PipeWire w nowoczesnych środowiskach Linux (GNOME, KDE Plasma)."
            },
            "hdr-compositing": {
                name: "Kompozycja kolorów High Dynamic Range (HDR)",
                description: "Włącza 10-bitową szeroką paletę barw (Rec.2020 / DCI-P3) i mapowanie tonów HDR na kompatybilnych ekranach."
            },
            "local-ai-assistant": {
                name: "Akceleracja VRAM dla lokalnych modeli GGUF (llama.cpp)",
                description: "Przenosi wagi lokalnych modeli Gemma i Llama 3 do pamięci VRAM karty graficznej w celu szybkich podsumowań i zapytań."
            },
            "experimental-split-screen-gestures": {
                name: "Kinetyczne gesty podziału ekranu",
                description: "Pozwala przeciągać karty do krawędzi okna, aby natychmiast utworzyć podzielony widok dwóch stron."
            },
            "enable-reader-mode": {
                name: "Tryb czytania artykułów bez rozpraszaczy",
                description: "Wydobywa treść artykułów do przejrzystego układu typograficznego bez reklam i pasków bocznych."
            },
            "auto-password-generation": {
                name: "Kryptograficzne generowanie silnych haseł",
                description: "Automatycznie wykrywa formularze rejestracji i proponuje 128-bitowe bezpieczne hasła zapisywane w QVault."
            },
            "tab-groups-auto-clustering": {
                name: "Inteligentne grupowanie kart według domen",
                description: "Sugeruje grupowanie otwartych kart na podstawie wspólnej domeny i wzorców pracy w obszarze roboczym."
            },
            "touch-ui-layout": {
                name: "Tryb interfejsu dla tabletów dotykowych",
                description: "Powiększa wysokość pasków kart i marginesy dotykowe. Wyłączone na profilach komputerowych z klawiaturą i myszą.",
                reason: "Wymaga wykrycia sprzętowego ekranu dotykowego."
            },
            "eye-tracking-gaze-scroll": {
                name: "Nawigacja wzrokiem (Eye-Tracking)",
                description: "Steruje przewijaniem strony na podstawie ruchu źrenic. Wymaga dedykowanego sprzętu na podczerwień.",
                reason: "Nie wykryto obsługiwanego czujnika śledzenia wzroku."
            },
            "cellular-data-saver": {
                name: "Oszczędzanie danych w sieciach komórkowych",
                description: "Kompresuje obrazy przez serwery proxy. Wyłączone ze względów prywatności, aby uniknąć pośredniego deszyfrowania.",
                reason: "Domyślnie wyłączone w celu ochrony prywatności Tor i HTTPS E2E."
            }
        }
    }
};

const fr = {
    common: {
        incognito: "Navigation privée",
        selectOption: "Sélectionner une option...",
        colors: {
            accent: "Accent",
            yellow: "Jaune",
            green: "Vert",
            blue: "Bleu",
            pink: "Rose"
        }
    },
    wallpaperPreview: {
        alt: "Aperçu du fond d'écran",
        badge: "Aperçu"
    },
    presets: {
        names: {
            balanced: "Équilibré",
            developer: "Développeur",
            classic_reverse: "Arc Moderne",
            bottom_bar: "Flux Ergonomique",
            minimalist: "Focus Minimal",
            privacy: "Sentinelle Privée"
        },
        taglines: {
            balanced: "Espaces Personnel & Travail avec recherche Google.",
            developer: "Espaces isolés avec intégration GitHub Live PR.",
            classic_reverse: "Arborescence d’onglets à droite et lecture épurée.",
            bottom_bar: "Barre d’adresse en bas pour une navigation ergonomique.",
            minimalist: "Espace unique avec interface compacte sans distraction.",
            privacy: "Protection stricte contre le pistage avec DuckDuckGo."
        },
        descriptions: {
            balanced: "Doubles espaces (Personnel & Travail), confidentialité standard et Google.",
            developer: "Isolation multi-espaces avec suivi GitHub Live PR et outils dev.",
            classic_reverse: "Arbre de navigation à droite, panneau inversé et flux d’onglets.",
            bottom_bar: "Barre d’adresse en bas pour une navigation confortable à une main.",
            minimalist: "Espace unique, barre latérale droite et interface ultra-compacte.",
            privacy: "Blocage strict des traqueurs, DuckDuckGo et routage Tor instantané."
        },
        customTaglineFallback: "Configuration personnalisée d’espace et de disposition.",
        accents: {
            amberGold: "Or Ambré",
            ocean: "Océan",
            skyBlue: "Bleu Ciel",
            cyberEmerald: "Émeraude Cyber",
            electricBlue: "Bleu Électrique",
            royalViolet: "Violet Royal",
            roseGold: "Or Rose",
            sunsetOrange: "Orange Crépuscule",
            cyberCyan: "Cyan Cyber",
            slateGray: "Gris Ardoise"
        }
    },
    addPin: {
        title: "Épingler une app à la barre latérale",
        subtitle: "Ajouter un raccourci vers une application ou un site web",
        defaultAppName: "Nom de l'application",
        appNameLabel: "Nom / Titre de l'app",
        appNamePlaceholder: "ex. GitHub, Gemini...",
        urlLabel: "URL / Domaine *",
        urlPlaceholder: "ex. github.com ou https://gemini.google.com",
        quickPresets: "Préréglages rapides",
        cancel: "Annuler",
        pinApp: "Épingler"
    },
    passkey: {
        biometrics: {
            darwin: "Touch ID",
            linux: "Biométrie système",
            win32: "Windows Hello"
        },
        hints: {
            darwin: "Touchez le capteur Touch ID ou saisissez votre mot de passe macOS",
            linux: "Touchez le capteur d'empreintes ou saisissez votre mot de passe système",
            win32: "Touchez le capteur d'empreintes ou saisissez votre code PIN Windows"
        },
        cancelDenyTitle: "Annuler et refuser",
        verifiedTitle: "Identité vérifiée !",
        scanningTitle: "Analyse {biometric}...",
        autofillTitle: "Remplir le mot de passe enregistré",
        passkeyTitle: "Authentification par clé d'accès",
        verifiedAutofillDesc: "Coffre déverrouillé et identifiants remplis",
        verifiedPasskeyDesc: "Clé d'accès libérée et signée avec succès",
        requireAutofillDesc: "Vérification requise pour déverrouiller le coffre et remplir",
        requirePasskeyDesc: "Vérification requise pour se connecter avec votre clé d'accès",
        passwordBadge: "Mot de passe",
        passkeyBadge: "Clé d'accès",
        accountLabel: "Compte :",
        savedLogin: "Identifiant enregistré",
        passkeyUser: "Utilisateur de clé d'accès",
        verifyingWith: "Vérification avec {biometric}...",
        verifiedBtn: "Vérifié !",
        verifyWith: "Vérifier avec {biometric}",
        orPassPin: "Ou avec mot de passe principal / PIN",
        orPass: "Ou avec mot de passe principal",
        placeholderPin: "Mot de passe principal ou code PIN à 4–8 chiffres",
        placeholderPass: "Entrez le mot de passe principal QVault",
        checking: "Vérification des identifiants...",
        verifyAuth: "Vérifier et authentifier",
        cancelDenyBtn: "Annuler et refuser la demande",
        websiteFallback: "Site web",
        theWebsiteFallback: "le site web",
        toastAutofill: "Coffre déverrouillé et identifiants remplis pour {domain} !",
        toastPasskey: "Clé d'accès vérifiée pour {domain} !",
        promptAutofill: "Vérifiez votre identité pour remplir les identifiants de {domain}",
        promptPasskey: "Connectez-vous à {domain} avec votre clé d'accès QVault",
        biometricError: "Erreur biométrique : {error}",
        vaultLockedOut: "Coffre verrouillé après trop de tentatives. Réessayez dans {seconds}s.",
        incorrectCreds: "Mot de passe principal ou code PIN incorrect. Veuillez réessayer.",
        verificationFailed: "Échec de la vérification : {error}",
        passkeyCreateTitle: "Créer une clé d'accès QVault",
        verifiedPasskeyCreateDesc: "Identité vérifiée — enregistrement de la clé dans QVault",
        requirePasskeyCreateDesc: "Vérification requise pour créer et enregistrer cette clé d'accès",
        useHardwareKeyBtn: "Utiliser une clé matérielle / système",
        useHardwareKeyHint: {
            darwin: "YubiKey · FIDO2 · Touch ID · QR téléphone",
            linux: "YubiKey · FIDO2 · USB / NFC / BLE · QR téléphone",
            win32: "YubiKey · FIDO2 · Windows Hello · QR téléphone"
        },
        toastHardwareHandoff: "Passage à la clé de sécurité matérielle / système pour {domain}...",
        toastPasskeyCreated: "Clé d'accès vérifiée et enregistrée pour {domain} !",
        promptPasskeyCreate: "Créer et enregistrer une clé d'accès QVault pour {domain}"
    },
    history: {
        title: "Archives",
        entrySingular: "{count} entrée enregistrée",
        entryPlural: "{count} entrées enregistrées",
        searchPlaceholder: "Rechercher dans les archives...",
        clearAllTitle: "Effacer tout l'historique de navigation",
        clear: "Effacer",
        closeTitle: "Fermer (Échap)",
        segments: {
            all: "Tout",
            today: "Aujourd'hui",
            yesterday: "Hier",
            week: "7 derniers jours",
            older: "Plus ancien"
        },
        emptySearch: "Aucun résultat pour « {query} »",
        emptyTitle: "Les archives sont vides",
        emptySearchDesc: "Vérifiez l'orthographe ou choisissez un autre filtre.",
        emptyDesc: "Les pages visitées seront enregistrées ici pour un accès rapide.",
        itemSingular: "{count} élément",
        itemPlural: "{count} éléments",
        copyLinkTitle: "Copier le lien",
        openNewTabTitle: "Ouvrir dans un nouvel onglet",
        removeTitle: "Supprimer des archives",
        toastCleared: "Archives effacées",
        toastCopied: "Lien copié",
        toastOpenedBg: "Ouvert dans un onglet en arrière-plan",
        loadMore: "Charger plus",
    },
    cookies: {
        title: "Explorateur de cookies et stockage des sites",
        subtitle: "Inspecter, rechercher et supprimer les cookies et données locales",
        filterDomain: "Filtrer par domaine",
        refreshTitle: "Actualiser la liste",
        allSites: "Tous les sites",
        clearDomain: "Effacer {domain}",
        clearAllData: "Effacer toutes les données",
        searchPlaceholder: "Rechercher par nom, domaine ou valeur...",
        emptyTitle: "Aucun cookie trouvé",
        emptyDesc: "Effacez la recherche ou choisissez un autre domaine",
        secure: "Sécurisé",
        httpOnly: "HttpOnly",
        path: "Chemin : {path}",
        expires: "Expire : {date}",
        deleteTitle: "Supprimer le cookie",
        toastDeleted: "Cookie supprimé : {name}",
        toastClearedSite: "{count} cookies supprimés pour {domain}",
        toastClearedAll: "Données de navigation et cookies effacés"
    },
    resources: {
        title: "Gestionnaire des tâches",
        cpu: "CPU",
        ram: "RAM",
        asleepCount: "{count} en veille",
        sleepInactive: "Mettre en veille",
        sleepInactiveTitle: "Mettre en veille les onglets inactifs pour libérer la mémoire",
        wakeAll: "Tout réveiller",
        wakeAllTitle: "Réveiller tous les onglets en veille",
        purgeCacheTitle: "Purger le cache mémoire du navigateur",
        autoRefreshActiveTitle: "Actualisation auto active (toutes les 2 s)",
        autoRefreshPausedTitle: "Actualisation auto en pause",
        autoRefresh2s: "2s",
        paused: "En pause",
        refreshTitle: "Actualiser les métriques",
        closeTitle: "Fermer (Échap)",
        filters: {
            all: "Tout",
            tabs: "Onglets",
            processes: "Processus",
            sleeping: "En veille"
        },
        searchPlaceholder: "Filtrer par nom, PID...",
        colTask: "Tâche / Processus",
        colSpace: "Espace / Type",
        colStatus: "Statut",
        colCpu: "CPU",
        colMemory: "Mémoire",
        colAction: "Action",
        emptyMatch: "Aucune tâche correspondant à « {query} »",
        blankTab: "Onglet vide",
        newTabDash: "Tableau de bord Nouvel Onglet Zen",
        pidSubtitle: "PID {pid} · {type}",
        active: "Actif",
        spaceTab: "Onglet {space}",
        mainCore: "Noyau principal",
        sleep: "Veille",
        live: "Actif",
        memSaved: "(Économisé)",
        wakeTabTitle: "Réveiller l'onglet",
        activeTabCannotSleep: "L'onglet actif ne peut pas être mis en veille",
        sleepTabTitle: "Mettre l'onglet en veille",
        switchTabTitle: "Basculer vers l'onglet",
        closeTabTitle: "Fermer l'onglet",
        core: "Noyau",
        endProcessTitle: "Terminer le processus PID {pid}",
        itemsOf: "{shown} sur {total} éléments",
        pressEscPrefix: "Appuyez sur",
        pressEscSuffix: "pour fermer",
        procMain: "Processus principal QBrowse",
        procGpu: "Processus GPU",
        procRenderer: "Moteur de rendu Webview",
        procUtility: "Service utilitaire (Audio/Stockage)",
        procZygote: "Préchargeur Sandbox",
        procPepper: "Hôte d'extension",
        procChild: "Processus {type}",
        procChildDefault: "Enfant",
        toastHibernatedSingular: "{count} onglet inactif mis en veille (~{mb} Mo de RAM libérés)",
        toastHibernatedPlural: "{count} onglets inactifs mis en veille (~{mb} Mo de RAM libérés)",
        toastWokeSingular: "{count} onglet réveillé",
        toastWokePlural: "{count} onglets réveillés",
        toastCachePurged: "Cache du navigateur purgé et mémoire optimisée",
        toastKillUnavailable: "Impossible de terminer le processus : API indisponible",
        toastKilled: "Processus {pid} terminé",
        toastKillFailed: "Impossible de terminer le processus {pid}",
        toastKillError: "Erreur lors de la fermeture du processus {pid}"
    },
    docViewer: {
        fallbackName: "Document local",
        fallbackFile: "Fichier",
        preview: "Aperçu",
        raw: "Brut",
        zoomOut: "Zoom arrière",
        zoomIn: "Zoom avant",
        resetZoom: "Réinitialiser le zoom",
        copyTitle: "Copier le contenu du fichier",
        copied: "Copié",
        copy: "Copier",
        revealTitle: "Afficher dans le dossier système",
        loading: "Chargement du document...",
        errorTitle: "Impossible d'afficher le fichier",
        readError: "Échec de la lecture du fichier",
        toastCopied: "Contenu copié dans le presse-papiers",
        toastRevealed: "Fichier affiché dans le dossier système"
    },
    pdfViewer: {
        toggleThumbnails: "Afficher/masquer les vignettes",
        fallbackName: "Document PDF",
        pageSingular: "{count} page",
        pagePlural: "{count} pages",
        prevPage: "Page précédente",
        nextPage: "Page suivante",
        zoomOut: "Zoom arrière",
        zoomIn: "Zoom avant",
        fitWidth: "Ajuster à la largeur",
        rotate: "Pivoter de 90° (horaire)",
        normalMode: "Mode normal",
        darkInvertMode: "Mode sombre inversé",
        summarize: "Résumer",
        revealTitle: "Ouvrir dans le gestionnaire de fichiers",
        pagesHeader: "Pages",
        pageNum: "Page {num}",
        loading: "Rendu du PDF avec PDF.js...",
        errorTitle: "Impossible d'ouvrir le document",
        openError: "Échec de l'ouverture du document PDF",
        extractingToast: "Extraction du texte pour Qu-AI...",
        openedAiToast: "Ouvert dans le panneau Qu-AI avec le texte du document !",
        extractErrorToast: "Échec de l'extraction du texte : {error}",
        revealedToast: "Fichier affiché dans le dossier système",
        fallbackDocName: "document",
        pageMarker: "--- Page {num} ---",
        summaryPrompt: "Veuillez fournir un résumé concis et les points clés de ce document PDF ({fileName}) :"
    },
    localDir: {
        parentFolderTitle: "Dossier parent",
        reloadTitle: "Actualiser le dossier",
        openInFileManager: "Ouvrir dans le gestionnaire",
        filterPlaceholder: "Filtrer les fichiers de ce dossier...",
        sortName: "Nom",
        sortSize: "Taille",
        sortDate: "Date",
        gridViewTitle: "Vue grille",
        listViewTitle: "Vue liste",
        scanning: "Analyse du dossier...",
        errorTitle: "Impossible d'ouvrir le dossier",
        goParent: "Aller au dossier parent",
        emptySearch: "Aucun fichier ne correspond à votre recherche",
        emptySearchHint: "Essayez de vider le champ de filtre",
        folderType: "Dossier",
        revealTitle: "Afficher dans le gestionnaire de fichiers",
        colName: "Nom",
        colModified: "Modifié",
        colSize: "Taille",
        itemSingular: "{count} élément",
        itemPlural: "{count} éléments",
        filtered: "(filtré)",
        suiteName: "Suite Fichiers QBrowse",
        apiUnavailable: "API répertoire Electron indisponible",
        openFailed: "Échec de l'ouverture du dossier",
        toastOpened: "Ouvert dans le gestionnaire de fichiers système",
        toastRevealed: "Affiché : {name}"
    },
    tour: {
        welcomeTitle: "Bienvenue sur QBrowse",
        welcomeSubtitle: "Choisissez comment découvrir le navigateur :",
        overviewBadge: "Aperçu",
        quickTitle: "Aperçu rapide",
        quickDesc: "Visite visuelle rapide de l'interface, des espaces de travail et de la navigation.",
        startQuick: "Démarrer la visite rapide",
        interactiveBadge: "Interactif",
        interactiveTitle: "Masterclass interactive",
        interactiveDesc: "Missions guidées dans l'interface réelle : cliquez, testez Tor et maîtrisez les raccourcis.",
        startInteractive: "Démarrer la visite interactive",
        skipWelcome: "Ignorer la visite et commencer à naviguer (Échap)",
        stepCounter: "Étape {current} sur {total}",
        closeTitle: "Fermer la visite (Échap)",
        skipTour: "Ignorer",
        back: "Retour",
        finishTour: "Terminer",
        nextStep: "Suivant",
        exitToast: "Visite fermée. Appuyez sur Ctrl+K à tout moment pour explorer QBrowse !",
        topBarShortcut: "Barre supérieure",
        steps: {
            spaces: {
                title: "Isolation multi-espaces",
                badge: "Espaces",
                description: "Séparez proprement vos activités. Chaque espace (Personnel, Travail, Ghost, Tor) isole ses sessions, cookies et onglets.",
                missionInstruction: "Cliquez sur l’espace « Travail » dans la barre latérale ou appuyez sur Ctrl+2",
                missionSuccess: "Espace activé ! Vos onglets, connexions et cookies sont désormais totalement isolés."
            },
            splitview: {
                title: "Vue écran partagé native",
                badge: "Multitâche",
                description: "Affichez deux sites côte à côte sans ouvrir une nouvelle fenêtre. Idéal pour la recherche, le code ou la comparaison.",
                missionInstruction: "Cliquez sur l’icône Vue partagée en haut ou appuyez sur Ctrl+\\ pour diviser l’écran",
                missionSuccess: "Vue partagée activée ! Un second volet de navigation est apparu à droite."
            },
            tor: {
                title: "Réseau Tor Onion intégré",
                badge: "Confidentialité & Onion",
                description: "Naviguez avec chiffrement multi-sauts intégré. QBrowse achemine votre trafic via des relais Tor chiffrés vers les sites .onion.",
                missionInstruction: "Cliquez sur l’icône Tor dans la barre supérieure pour inspecter votre circuit de relais",
                missionSuccess: "Circuit Tor affiché ! Vous pouvez visualiser les nœuds relais et basculer le routage Onion."
            },
            vault: {
                title: "QVault Zéro-Connaissance",
                badge: "Sécurité matérielle",
                description: "Vos mots de passe, clés d’accès et cartes sont chiffrés localement par matériel avec sécurité biométrique {biometric}. Aucune donnée en clair ne quitte votre PC.",
                missionInstruction: "Cliquez sur l’icône QVault dans la barre supérieure pour ouvrir votre coffre local",
                missionSuccess: "QVault ouvert ! Tous vos identifiants sont chiffrés localement avec protection biométrique."
            },
            shield: {
                title: "Bloqueur natif de pubs et traqueurs",
                badge: "Protection",
                description: "Le filtrage matériel stoppe la télémétrie, le minage crypto, le fingerprinting et les publicités avant même le traitement réseau.",
                missionInstruction: "Cliquez sur l’icône Bouclier en haut pour inspecter les traqueurs bloqués",
                missionSuccess: "Inspecteur QShield ouvert ! Consultez les domaines bloqués en direct et gérez la protection."
            },
            darkmode: {
                title: "Mode sombre intelligent & thèmes",
                badge: "Apparence",
                description: "Adaptez votre esthétique : thèmes sombres raffinés, mode clair net ou inversion intelligente pour assombrir les sites anciens.",
                missionInstruction: "Cliquez sur l’icône Thème dans la barre supérieure pour voir les options visuelles",
                missionSuccess: "Panneau des thèmes ouvert ! Basculez entre sombre, clair et inversion intelligente."
            },
            toolhub: {
                title: "ToolHub et notes persistantes",
                badge: "Outils & Recherche",
                description: "Surlignez n’importe quel texte sur une page pour épingler des notes persistantes, profitez de l’IA locale privée et de l’historique du presse-papiers.",
                missionInstruction: "Cliquez sur la poignée ToolHub à droite ou appuyez sur Ctrl+J pour ouvrir le tiroir",
                missionSuccess: "ToolHub est ouvert ! Épinglez des notes, consultez le presse-papiers ou discutez avec l’IA locale."
            },
            omnibox: {
                title: "Omnibox intelligente et commandes",
                badge: "Commande universelle",
                description: "Un lanceur universel : raccourcis (!yt, @github), commandes système (>pdf, >clear), calculatrice et accès direct à votre modèle IA local.",
                missionInstruction: "Appuyez sur Ctrl+K ou cliquez sur la barre d’adresse centrale pour commander QBrowse",
                missionSuccess: "Omnibox activée ! Tapez !yt pour YouTube, @github pour les dépôts ou > pour les commandes."
            }
        }
    },
    reader: {
        themes: {
            dark: "Sombre",
            sepia: "Sépia",
            light: "Clair",
            midnight: "Minuit"
        },
        fonts: {
            serif: "Serif",
            sans: "Sans",
            mono: "Mono",
            dyslexic: "Dyslexie"
        },
        widths: {
            compact: "Compacte",
            balanced: "Équilibrée",
            wide: "Large"
        },
        exitTitle: "Quitter le mode lecture (Échap / Ctrl+Alt+R)",
        backToWebpage: "Retour à la page",
        openOriginalTitle: "Ouvrir l'original : {url}",
        hideAudioTitle: "Masquer le lecteur audio",
        listenTitle: "Écouter l'article (Lecture vocale)",
        listening: "Écoute en cours",
        readAloud: "Lire à voix haute",
        themeTitle: "Thème {name}",
        fontTitle: "Utiliser la police {name}",
        decreaseSizeTitle: "Réduire la taille du texte",
        increaseSizeTitle: "Augmenter la taille du texte",
        widthTitle: "Largeur de colonne : {name}",
        closeTitle: "Fermer le mode lecture",
        byAuthor: "Par {author}",
        minRead: "{minutes} min de lecture",
        wordsCount: "{count} mots",
        prevParaTitle: "Paragraphe précédent",
        pauseTitle: "Pause",
        playTitle: "Lecture",
        nextParaTitle: "Paragraphe suivant",
        audioNarration: "Narration audio",
        blockProgress: "Bloc {current} sur {total}",
        speedTitle: "Modifier la vitesse de lecture",
        selectVoiceTitle: "Choisir une voix",
        voiceFallback: "Voix",
        systemVoices: "Voix système",
        stopCloseTitle: "Arrêter et fermer la narration",
        highlightWithTitle: "Surligner en {color}",
        noteBtn: "Note",
        copyTextTitle: "Copier le texte",
        stickyNote: "Note adhésive",
        notePlaceholder: "Saisissez votre note ou réflexion...",
        deleteBtn: "Supprimer",
        saveBtn: "Enregistrer"
    },
    toolhub: {
        title: "Tool Hub",
        snip: "Capture",
        snipTitle: "Capture d'écran interactive (recadrage)",
        captureViewportTitle: "Capturer la zone visible",
        captureFullTitle: "Capturer la page entière",
        tabs: {
            notes: "Notes",
            clipboard: "Presse-papiers",
            ai: "IA Locale",
            downloads: "Télécharg."
        },
        webNotesTab: "Notes Web ({count})",
        scratchpadTab: "Bloc-notes",
        globalScope: "Global",
        spaceScope: "Espace {space}",
        scratchpadTitle: "Bloc-notes : {name}",
        scratchpadGlobalPlaceholder: "Notez vos idées globales, liens... Markdown pris en charge.",
        scratchpadSpacePlaceholder: "Bloc-notes pour {space}... Markdown pris en charge.",
        searchNotesPlaceholder: "Rechercher surlignages, notes, domaines...",
        clearSearchTitle: "Effacer la recherche",
        allSpaces: "Tous les espaces",
        exportMd: "Exporter MD",
        exportMdTitle: "Exporter les notes en Markdown (.md)",
        noWebNotesTitle: "Aucune note web enregistrée",
        noWebNotesDesc: "Surlignez du texte sur une page ou cliquez sur « Note » pour conserver vos annotations entre vos visites.",
        otherDomain: "Autre",
        colorTitle: "Couleur : {color}",
        jumpHighlightTitle: "Cliquer pour aller à ce surlignage sur la page",
        editNotePlaceholder: "Ajouter une note ou une pensée...",
        deleteNote: "Supprimer la note",
        deleteNoteTitle: "Supprimer le texte de la note",
        cancel: "Annuler",
        saveNote: "Enregistrer",
        clickToEditNote: "Cliquer pour modifier la note",
        addNoteTitle: "Ajouter une note",
        noteBtn: "Note",
        copyQuoteTitle: "Copier la citation",
        jumpBtn: "Aller",
        jumpBtnTitle: "Aller à la note sur la page",
        deleteHighlightTitle: "Supprimer le surlignage",
        clipboardHeader: "Historique du presse-papiers système",
        syncBtn: "Sync",
        syncTitle: "Synchroniser le presse-papiers",
        deleteClipTitle: "Supprimer l'élément",
        clipboardEmptyTitle: "Le presse-papiers est vide",
        clipboardEmptyDesc: "Copiez du texte ou des URL n’importe où pour les voir ici",
        clearClipboard: "Effacer le presse-papiers",
        aiStatusRunning: "llama-server actif (Port 8080)",
        aiStatusDownloading: "Téléchargement du modèle ({progress}%)...",
        aiStatusStarting: "Démarrage du moteur...",
        aiStatusReady: "Prêt à démarrer",
        aiStatusDownloaded: "Téléchargé",
        aiStatusNotDownloaded: "Modèle non téléchargé",
        cancelDownloadTitle: "Annuler le téléchargement",
        downloadModelTitle: "Télécharger {name} ({size})",
        downloadBtn: "Télécharger",
        startingBtn: "Démarrage...",
        stopBtn: "Arrêter",
        startBtn: "Démarrer",
        openWebUiTitle: "Ouvrir l’interface web llama.cpp",
        aiConsoleSettingsTitle: "Console llama.cpp et paramètres avancés",
        downloadingFile: "Téléchargement de {filename}",
        downloadingWeights: "Téléchargement des poids...",
        noModelTitle: "Aucun modèle IA téléchargé",
        offlineBadge: "Hors ligne",
        noModelDesc: "Téléchargez {name} pour exécuter une IA locale rapide et privée pour résumer, coder et discuter.",
        downloadModelSize: "Télécharger ({size})",
        settingsBtn: "Paramètres",
        contextBtn: "Contexte",
        searchBtn: "Recherche",
        voiceBtn: "Voix",
        summarizeBtn: "Résumer",
        summarizePrompt: "Résumez clairement cette page web avec les points essentiels et les idées principales d’après son contenu.",
        attachTitle: "Joindre un fichier ou une image",
        chatPlaceholder: "Interrogez Gemma 4 local ou déposez des fichiers...",
        voiceInputTitle: "Saisie vocale (Whisper)",
        downloadsHeader: "Téléchargements actifs et récents",
        itemSingular: "{count} élément",
        itemPlural: "{count} éléments",
        openDownloadsFolderTitle: "Ouvrir le dossier Téléchargements",
        clearDownloadsTitle: "Effacer tous les téléchargements",
        downloadedFileFallback: "Fichier téléchargé",
        snipBadge: "Capture",
        verified: "Vérifié",
        unverified: "Non vérifié",
        sha256Prefix: "SHA-256 : {hash}",
        saved: "Enregistré",
        verifyCopyHashTitle: "Vérifier et copier le checksum SHA-256",
        copyHashTitle: "SHA-256 : {hash} (Cliquer pour copier)",
        copyImageTitle: "Copier l’image dans le presse-papiers",
        showInFolderTitle: "Afficher dans le dossier",
        deleteDownloadTitle: "Supprimer le fichier et retirer de la liste",
        downloadsEmptyTitle: "Aucun téléchargement actif",
        downloadsEmptyDesc: "Les captures et fichiers téléchargés apparaîtront ici",
        pdfPageName: "{name} (P. {page})",
        pdfImageSize: "Image PDF",
        toasts: {
            jumpingToNote: "Accès à la note sur la page...",
            exportedMarkdown: "Fichier Markdown exporté !",
            copiedNotesMarkdown: "Notes copiées en Markdown !",
            copiedToClipboard: "Copié dans le presse-papiers !",
            clipDeleted: "Élément supprimé",
            clipboardCleared: "Historique du presse-papiers effacé",
            parsingPdf: "Analyse visuelle du PDF : {name}",
            pdfVramLimit: "10 premières pages de {name} converties en images (limite VRAM).",
            pdfVisualFailed: "Échec de l'analyse visuelle du PDF. Passage à l'extraction texte.",
            openPageFirst: "Ouvrez d'abord une page web pour la résumer",
            transcriptionFailed: "Échec de la transcription",
            micDenied: "Accès au microphone refusé",
            noteRemoved: "Note supprimée",
            noteUpdated: "Note mise à jour",
            copiedQuote: "Citation copiée",
            highlightRemoved: "Surlignage supprimé",
            downloadsCleared: "Liste des téléchargements effacée",
            hashCopied: "Empreinte SHA-256 copiée dans le presse-papiers",
            hashMissing: "Impossible de calculer le hachage — fichier introuvable",
            screenshotCopied: "Capture copiée dans le presse-papiers",
            downloadDeleted: "Téléchargement et fichier supprimés"
        },
        cancelled: "Annulé",
        failed: "Échec"
    },
    fontManager: {
        title: "Typographie et police de l'application",
        active: "Active :",
        resetTitle: "Rétablir la police par défaut du système d'exploitation",
        resetToDefault: "Rétablir par défaut",
        modes: {
            preset: "Polices prédéfinies",
            google: "Google Fonts",
            system: "Polices système",
            file: "Importer police"
        },
        categories: {
            all: "Toutes",
            sans: "Sans",
            mono: "Mono",
            serif: "Serif"
        },
        activeFont: "Police active",
        clickToApply: "Cliquer pour appliquer",
        googleTitle: "Utiliser n’importe quelle Google Font",
        googleDesc: "Saisissez un nom de police de fonts.google.com et appuyez sur Entrée pour la charger instantanément.",
        googlePlaceholder: "ex. Montserrat, Space Grotesk, Syne, Cinzel...",
        applyFont: "Appliquer",
        popularGoogle: "Google Fonts populaires",
        filterPlaceholder: "Filtrer la liste...",
        systemTitle: "Sélecteur de police système installée",
        systemDesc: "Saisissez une police installée sur votre OS (ex. Segoe UI Variable, Calibri, Helvetica).",
        systemPlaceholder: "Nom de la police système...",
        installed: "Installée",
        notDetected: "Non détectée",
        notDetectedTitle: "Non détectée par les métriques canvas, mais CSS tentera tout de même de l'afficher si disponible",
        commonOsFonts: "Polices courantes du système d'exploitation",
        dropTitle: "Cliquez ou déposez votre fichier de police ici",
        dropDesc: "Prend en charge TrueType (.ttf), OpenType (.otf), WOFF (.woff) et WOFF2 (.woff2) jusqu’à 12 Mo.",
        selectFile: "Choisir un fichier local",
        activeCustomFace: "Police personnalisée active",
        removeFileTitle: "Supprimer le fichier de police importé",
        fineTuning: "Réglages typographiques fins",
        letterSpacing: "Espacement des lettres",
        weightShift: "Graisse du texte",
        fontScale: "Échelle de police UI",
        reset100Title: "Réinitialiser à 100%",
        specimen: "Spécimen typographique",
        specimen1: "Portez ce vieux whisky au juge blond qui fume",
        specimen2: "Voix ambiguë d’un cœur qui, au zéphyr, préfère les jattes de kiwis.",
        activeDefault: "Système par défaut (Segoe UI / Natif)",
        activeGoogle: "Google Font : {name}",
        activeSystem: "Police système : {name}",
        activeFile: "Fichier personnalisé : {name}",
        customLabel: "Personnalisée",
        installedOsLabel: "OS installé",
        uploadedFontLabel: "Police importée",
        spacing: {
            tight: "Serré",
            normal: "Normal",
            relaxed: "Aéré",
            wide: "Large"
        },
        weight: {
            normal: "Normal",
            medium: "Moyen",
            semibold: "Semi-gras"
        },
        osLabels: {
            "Windows 11": "Windows 11",
            Windows: "Windows",
            macOS: "macOS",
            "macOS / Multi": "macOS / Multi",
            Universal: "Universelle",
            "Windows Dev": "Windows Dev",
            "Windows Terminal": "Terminal Windows",
            Casual: "Décontractée",
            Linux: "Linux",
            GNOME: "GNOME",
            Serif: "Serif"
        },
        presetDefaultName: "Système par défaut",
        presets: {
            default: {
                description: "Typographie native du système d'exploitation (Segoe UI / San Francisco).",
                previewText: "Aa Bb Gg 123"
            },
            inter: {
                description: "Police moderne épurée et ultra-lisible conçue pour les écrans.",
                previewText: "Néo-Grotesque Moderne"
            },
            geist: {
                description: "Police signature de Vercel à la précision géométrique.",
                previewText: "Ingénierie Minimaliste"
            },
            outfit: {
                description: "Linéale géométrique sophistiquée à l’esthétique soignée.",
                previewText: "Géométrique Élégante"
            },
            "plus-jakarta": {
                description: "Police contemporaine chaleureuse pour des applications modernes.",
                previewText: "Contemporaine Chaleureuse"
            },
            poppins: {
                description: "Linéale géométrique arrondie aux courbes dynamiques.",
                previewText: "Courbes Douces"
            },
            roboto: {
                description: "La police emblématique de Google pour Android et Material Design.",
                previewText: "Architecture Material"
            },
            manrope: {
                description: "Croisement entre grotesque moderne et géométrique très lisible.",
                previewText: "Précision Semi-Géométrique"
            },
            lexend: {
                description: "Conçue scientifiquement pour réduire la fatigue visuelle et lire plus vite.",
                previewText: "Lecture Sans Effort"
            },
            "jetbrains-mono": {
                description: "Police de code très contrastée pensée pour les développeurs.",
                previewText: "Esthétique Développeur"
            },
            "fira-code": {
                description: "Police à chasse fixe dotée de ligatures de programmation nettes.",
                previewText: "=> Ligatures de Code"
            },
            "playfair-display": {
                description: "Sérif éditoriale contrastée inspirée de l’imprimerie classique.",
                previewText: "Élégance Éditoriale"
            },
            merriweather: {
                description: "Sérif littéraire chaleureuse idéale pour la lecture longue.",
                previewText: "Classique Littéraire"
            }
        },
        errors: {
            invalidFormat: "Format invalide. Importez des fichiers .ttf, .otf, .woff ou .woff2.",
            tooLarge: "Fichier trop volumineux. La taille maximale est de 12 Mo.",
            readFailed: "Impossible de lire le fichier de police. Essayez un autre fichier."
        },
        toasts: {
            presetSet: "Police de l'application définie sur {name}",
            googleApplied: "Google Font « {name} » appliquée à QBrowse",
            systemApplied: "Police système « {name} » appliquée",
            fileLoaded: "Fichier de police « {name} » chargé avec succès"
        }
    },
    aiSettings: {
        title: "Moteur IA llama.cpp",
        status: {
            online: "En ligne (llama-server)",
            starting: "Démarrage...",
            updating: "Mise à jour...",
            error: "Erreur moteur",
            stopped: "Arrêté"
        },
        syncTitle: "Vérifier et synchroniser le moteur natif llama.cpp (b11796 avec support Gemma 4)",
        updatingBtn: "Mise à jour...",
        syncBtn: "Synchroniser (b11796)",
        subtitle: "Exécution LLM locale rapide sans télémétrie, compatible Gemma 4, Qwen 3.5 & Bielik 11B GGUF.",
        downloadingModel: "Téléchargement du modèle ({progress}%)",
        connectingCdn: "Connexion au CDN...",
        cancel: "Annuler",
        downloadBtn: "Télécharger {name} ({size})",
        startingBtn: "Démarrage de llama-server...",
        stopBtn: "Arrêter llama-server",
        startBtn: "Démarrer le moteur llama-server",
        defaultStartError: "llama-server a rencontré une erreur au démarrage du modèle.",
        dismiss: "Fermer",
        updateEngineBtn: "Mettre à jour le moteur",
        genSpeed: "Vitesse de génération",
        tokPerSec: "tok/s",
        contextWindow: "Fenêtre de contexte",
        tokens: "jetons",
        gpuOffload: "Déchargement GPU",
        layers: "couches",
        activeModelTitle: "Modèle GGUF actif",
        loadCustomGguf: "Charger un .GGUF...",
        loadCustomProjector: "Charger un projecteur...",
        customModelPrefix: "Modèle perso : {path}",
        customProjectorPrefix: "Projecteur perso : {path}",
        reset: "Réinitialiser",
        downloadedBadge: "Téléchargé",
        downloadingTarget: "Téléchargement : {target}",
        visionProjector: "Projecteur Vision...",
        languageModel: "Modèle de langage...",
        weights: "poids...",
        modelReady: "Modèle prêt à l’emploi",
        downloadModelFile: "Télécharger le modèle ({size})",
        overridesTitle: "Paramètres llama-server",
        autoDetectBtn: "Auto-détecter le matériel",
        cpuThreadsLabel: "Threads CPU (-t) : {threads}",
        contextSizeLabel: "Taille du contexte (-c)",
        tokensOption: "{n} jetons",
        contextBadges: {
            compact: "Compact",
            default: "Défaut",
            extended: "Étendu",
            max: "Max"
        },
        gpuLayersLabel: "Couches GPU (-ngl) : {layers}",
        dataProcessingTitle: "Traitement des données",
        parsePdfTitle: "Analyser les PDF en images",
        parsePdfDesc: "Convertit les pages PDF déposées en images au lieu d’extraire le texte brut. Idéal pour les modèles Vision Gemma 4 & Qwen 3.5.",
        consoleTitle: "Console terminal llama-server (Stdout en direct)",
        copyOutputTitle: "Copier la sortie du terminal",
        clearConsoleTitle: "Effacer la console",
        consoleEmpty: "[Console llama-server initialisée. En attente des journaux de démarrage...]",
        modelWord: "Modèle",
        visionWord: "Vision",
        models: {
            "gemma-4-e2b": "Modèle Google Gemma 4 E2B Instruct GGUF avec vision multimodale complète pour analyser images et discussions.",
            "gemma-4-e4b": "Modèle avancé Google Gemma 4 E4B à fort raisonnement avec vision multimodale complète.",
            "qwen-3.5-4b": "Modèle Alibaba Qwen 3.5 4B avec vision multimodale, raisonnement, code et compréhension multilingue.",
            "bielik-11b-v3.1": "Modèle phare polonais et européen 11B par SpeakLeash avec maîtrise avancée du polonais et raisonnement."
        },
        toasts: {
            customModelLoaded: "Modèle personnalisé chargé : {name}",
            demoModelLoaded: "Chemin du modèle de démonstration chargé !",
            customProjectorLoaded: "Projecteur vision chargé : {name}",
            demoProjectorLoaded: "Chemin du projecteur de démonstration chargé !",
            updatingEngine: "Mise à jour du moteur natif llama.cpp...",
            engineUpdated: "Moteur llama.cpp mis à jour vers la version b11796 !",
            engineUpdateFailed: "Échec de la mise à jour : {error}",
            unknownError: "Erreur inconnue",
            logsCopied: "Journaux llama-server copiés dans le presse-papiers !",
            hardwareDetected: "Matériel détecté : {threads} threads, {ram} Go RAM",
            hardwareDefault: "Matériel détecté : optimisations par défaut appliquées",
            resizingContext: "Redimensionnement du contexte llama-server à {tokens} jetons..."
        }
    },
    adblockImport: {
        title: "Importer une liste de blocage (GitHub / Web)",
        subtitle: "Analyse automatique de fichiers hosts, listes GitHub raw ou filtres Adblock.",
        closeTitle: "Fermer",
        modeUrl: "URL distante / GitHub",
        modePaste: "Coller du texte brut",
        urlLabel: "URL de la liste (GitHub raw, Gist ou fichier hosts)",
        githubRawBadge: "GitHub Raw",
        githubRawTitle: "Lien GitHub détecté et converti automatiquement au format raw",
        fetching: "Récupération...",
        fetchParse: "Récupérer et analyser",
        popularLists: "Listes communautaires populaires",
        pasteLabel: "Collez un fichier hosts, des règles ABP ou des domaines",
        pastePlaceholder: "# Collez n’importe quel format ci-dessous :\n0.0.0.0 tracking.evil.com\n127.0.0.1 ads.adserver.org\n||telemetry.network.io^\nanalytics.badsite.com",
        parsing: "Analyse...",
        parseDomains: "Analyser les domaines",
        back: "Retour",
        backTitle: "Revenir à la source (Échap)",
        readyToImport: "Prêt à importer",
        kbSource: "Source : {kb} Ko",
        validDomains: "Domaines valides",
        newUnique: "Nouveaux uniques",
        duplicatesFiltered: "Doublons filtrés",
        linesAnalyzed: "Lignes analysées",
        extractedSample: "Échantillon de domaines extraits ({count})",
        searchSamplePlaceholder: "Filtrer l’échantillon...",
        moreDomains: "+ {count} autres domaines",
        backToSource: "Retour à la source",
        cancel: "Annuler",
        replaceList: "Remplacer toute la liste",
        replaceListTitle: "Remplace votre liste personnalisée actuelle par les domaines analysés",
        importN: "Importer {count} domaines",
        importDomains: "Importer les domaines",
        pastedSourceLabel: "Texte collé",
        errors: {
            invalidUrl: "Veuillez saisir une URL de liste valide.",
            fetchFailed: "Impossible de récupérer la liste distante",
            noValidFromUrl: "Aucun nom de domaine valide extrait de cette source.",
            downloadError: "Erreur lors du téléchargement de la liste",
            emptyPaste: "Veuillez d’abord coller des domaines ou règles hosts.",
            noValidFromText: "Aucun nom de domaine valide trouvé dans le texte.",
            parseError: "Erreur lors de l'analyse du texte"
        },
        presets: {
            stevenblack: {
                desc: "Protection communautaire complète contre adwares et malwares.",
                badge: "Recommandée"
            },
            "oisd-basic": {
                desc: "Liste légère sans faux positifs bloquant le suivi web et mobile.",
                badge: "Faible impact"
            },
            "adguard-trackers": {
                desc: "Liste spécialisée ciblant les scripts analytiques et de télémétrie.",
                badge: "Vie privée"
            },
            peterlowe: {
                desc: "Liste standard historique des serveurs publicitaires actifs.",
                badge: "Rapide"
            },
            danpollock: {
                desc: "Liste fiable bloquant télémétrie, spam et sites nuisibles.",
                badge: "Classique"
            }
        }
    },
    studio: {
        title: "Studio de préréglages",
        subtitle: "Réorganisez les panneaux, sculptez les courbures, personnalisez les thèmes et gérez vos préréglages.",
        tabCanvas: "Canevas",
        tabPresets: "Préréglages",
        closeAria: "Fermer le Studio de préréglages",
        dockLeftSidebar: "Ancrer la barre latérale à gauche",
        dockRightSidebar: "Ancrer la barre latérale à droite",
        dockTopBar: "Ancrer la barre de navigation en haut",
        dockBottomBar: "Ancrer la barre de navigation en bas",
        searchBarPlaceholder: "Rechercher sur le web ou saisir une commande...",
        toolhubDockTitle: "Ancrage ToolHub : {pos} (Cliquer ou glisser pour inverser)",
        legendDock: "Barre :",
        legendBarValue: "{pos}",
        legendSidebar: "Latérale :",
        legendToolhub: "ToolHub :",
        legendSummary: "Courbure : {curvature} · Omnibox : {omnibox} · Onglets : {tabs}",
        layoutControls: "Contrôles de disposition",
        resetTitle: "Réinitialiser le brouillon à la configuration actuelle",
        reset: "Réinitialiser",
        editingLabel: "Édition :",
        cancelEditTitle: "Annuler l’édition et créer un nouveau préréglage",
        cancel: "Annuler",
        sidebarMode: "Mode barre latérale",
        sidebarModes: {
            classic: "Classique",
            floating: "Flottante",
            compact: "Compacte",
            hidden: "Masquée"
        },
        windowCurvature: "Courbure des fenêtres",
        curvatures: {
            default: "Défaut",
            cohesive: "Cohésive",
            square: "Anguleuse"
        },
        omniboxArch: "Architecture de l'Omnibox",
        omniboxStyles: {
            capsule: "Capsule",
            wide: "Large",
            minimal: "Minimale"
        },
        tabPresentation: "Présentation des onglets",
        tabStyles: {
            pills: "Pilules",
            compact: "Compacte",
            cards: "Cartes"
        },
        windowControlsStyle: "Style des boutons de fenêtre",
        controlsStyles: {
            mac: "macOS",
            windows: "Windows",
            minimal: "Minimal"
        },
        windowControlsLayout: "Disposition des contrôles",
        controlsOrders: {
            auto: "Coin intelligent",
            "close-first": "Fermer d’abord",
            "minimize-first": "Réduire d’abord"
        },
        themeLabel: "Thème",
        themes: {
            dark: "Sombre",
            light: "Clair"
        },
        uiScaleLabel: "Échelle de l'UI",
        uiScales: {
            comfortable: "Normale",
            compact: "Compacte"
        },
        accentSwatchLabel: "Nuancier d'accentuation",
        openColorPickerTitle: "Ouvrir le sélecteur de couleur système",
        saveChanges: "Enregistrer les modifications",
        applyLive: "Appliquer en direct",
        saveAsNew: "Enregistrer sous...",
        applyToBrowser: "Appliquer au navigateur",
        saveAsCustom: "Enregistrer comme préréglage",
        searchPresetsPlaceholder: "Rechercher des préréglages...",
        filterAll: "Tous",
        filterBuiltin: "Intégrés",
        filterCustom: "Perso ({count})",
        saveActiveSetup: "Enregistrer la config actuelle",
        activeBadge: "Actif",
        editingBadge: "(En édition)",
        reapply: "Réappliquer",
        apply: "Appliquer",
        editInStudio: "Éditer dans Studio",
        customize: "Personnaliser",
        editPresetTitle: "Éditer le préréglage dans le studio",
        customizePresetTitle: "Personnaliser la disposition dans le studio",
        duplicateTitle: "Dupliquer le préréglage",
        deleteTitle: "Supprimer le préréglage personnalisé",
        editCustomModalTitle: "Modifier le préréglage personnalisé",
        saveCustomModalTitle: "Enregistrer comme préréglage",
        presetNameLabel: "Nom du préréglage",
        presetNamePlaceholder: "ex. Flux Ergonomique, Arc Minimaliste",
        presetDescLabel: "Slogan / Description",
        presetDescPlaceholder: "Brève description de cette configuration...",
        presetIconLabel: "Icône du préréglage",
        createPreset: "Créer le préréglage",
        deleteConfirmTitle: "Supprimer le préréglage ?",
        deleteConfirmDescBefore: "Voulez-vous vraiment supprimer ",
        deleteConfirmDescAfter: " ? Cette action est irréversible.",
        deletePresetBtn: "Supprimer",
        posTop: "Haut",
        posBottom: "Bas",
        posLeft: "Gauche",
        posRight: "Droite",
        moveTo: "Déplacer en {pos}",
        draggableNavTitle: "Barre de navigation déplaçable : glissez en haut/bas ou cliquez",
        draggableSidebarTitle: "Barre latérale déplaçable : glissez entre gauche et droite",
        swapTo: "Basculer à {pos}",
        miniTab: "Onglet #{num}",
        miniCardView: "Vue carte #{num}",
        miniActiveSpaceTab: "Onglet d'espace actif",
        miniSidebarPos: "Latérale ({pos})",
        layoutTagFormat: "{bar} · {sidebar}",
        layoutSummaryFormat: "{tag} · {toolhub}",
        topBarLabel: "Barre en haut",
        bottomBarLabel: "Barre en bas",
        leftSidebarLabel: "Barre à gauche",
        rightSidebarLabel: "Barre à droite",
        leftToolhubLabel: "ToolHub à gauche",
        rightToolhubLabel: "ToolHub à droite",
        tabsHighlight: "Onglets {style}",
        compactScaleLabel: "Échelle compacte",
        comfortableScaleLabel: "Échelle confortable",
        defaultCustomName: "Préréglage perso",
        defaultCustomDesc: "Configuration personnalisée",
        defaultNewNameFormat: "{bar} {side}",
        defaultNewNameArc: "Arc",
        defaultNewNameFlow: "Flux",
        defaultNewDescFormat: "Disposition perso : {bar}, {sidebar}, onglets {tabs}",
        toasts: {
            applied: "Disposition appliquée au navigateur !",
            reset: "Brouillon réinitialisé sur la config actuelle",
            editingPreset: "Édition de « {name} » dans Studio",
            loadedPreset: "« {name} » chargé sur le canevas",
            switchedNewDraft: "Basculé vers un nouveau brouillon"
        }
    },
    setup: {
        strictOfflineTitle: "Zéro requête en arrière-plan (Hors ligne strict)",
        strictOfflineDesc: "Désactivez tout trafic réseau optionnel en arrière-plan (vérifications de mises à jour, actualisation des filtres, suggestions en direct, favicons distants et synchronisation cloud).",
        headerTitle: "Configuration QBrowse",
        headerSubtitle: "Assistant de personnalisation",
        steps: {
            language: {
                label: "Langue",
                desc: "Langue UI"
            },
            presets: {
                label: "Style & Thèmes",
                desc: "Expérience"
            },
            import: {
                label: "Importer",
                desc: "Favoris & Mots de passe"
            },
            privacy: {
                label: "Confidentialité",
                desc: "Boucliers & Tor"
            },
            default: {
                label: "Par défaut",
                desc: "Intégration OS"
            },
            sync: {
                label: "Compte & Sync",
                desc: "Cloud ou Local"
            }
        },
        chooseSetupTitle: "Choisissez votre configuration",
        chooseSetupDesc: "Sélectionnez une disposition adaptée pour commencer. Tout reste modifiable à tout moment.",
        customLayoutCta: "Disposition sur mesure ? Studio →",
        themeLabel: "Thème",
        dark: "Sombre",
        light: "Clair",
        accentLabel: "Accent",
        step2Badge: "Étape 2 sur 5",
        step2Title: "Importez vos données et votre coffre",
        step2Desc: "Importez vos favoris et transférez vos mots de passe depuis Bitwarden, Proton Pass, Chrome ou Firefox.",
        tabBookmarks: "Favoris",
        tabVault: "Coffre-fort",
        bookmarksFound: "{count} favoris détectés",
        notDetected: "Non détecté sur cet appareil",
        imported: "Importé",
        importing: "Importation...",
        importBookmarks: "Importer les favoris",
        scanningBrowsers: "Recherche des navigateurs installés...",
        htmlImported: "Fichier HTML importé ({count} éléments)",
        uploadHtml: "Importer un fichier HTML de favoris (.html)",
        vaultComplete: "Migration du coffre terminée",
        vaultImportedSummary: "{count} éléments importés depuis {source} dans QVault !",
        importAnother: "Importer un autre",
        exportCsvJson: "Exporter en .CSV ou .JSON",
        parsingVault: "Analyse du coffre...",
        uploadVault: "Importer un export (.csv ou .json)",
        compatibleManagers: "Compatible avec Bitwarden, Proton Pass, Google Chrome, Edge, Brave et 1Password",
        step3Badge: "Étape 3 sur 5",
        step3Title: "Blindez votre vie privée",
        step3Desc: "QBrowse bloque les scripts de pistage, supprime les publicités et achemine le trafic via Tor.",
        privacyOptimizedBadge: "Préréglage : Optimisé Vie Privée",
        adblockTitle: "Bouclier anti-traqueurs Ghostery",
        adblockDesc: "Bloque traqueurs, télémétrie et publicités intrusives sans ralentir les pages.",
        torTitle: "Espace de routage Tor Onion",
        torDesc: "Active la navigation .onion et les circuits relais chiffrés multi-nœuds à tout moment.",
        ready: "Prêt",
        step4Badge: "Étape 4 sur 5",
        step4Title: "Définir comme navigateur par défaut",
        step4Desc: "Ouvrez vos liens système dans des espaces isolés en séparant travail et navigation privée.",
        isDefaultTitle: "QBrowse est votre navigateur par défaut !",
        makeDefaultTitle: "Faites de QBrowse votre passerelle web principale",
        isDefaultDesc: "Tous les liens du bureau et fichiers web s’ouvriront automatiquement dans QBrowse.",
        makeDefaultDesc: "Gère tous les liens http://, https:// et fichiers HTML avec intégration OS complète.",
        osLabels: {
            darwin: "Réglages Système",
            linux: "Applications par défaut",
            win32: "Applications par défaut Windows"
        },
        defaultHint: "{label} ouvert — sélectionnez QBrowse dans la fenêtre système pour confirmer.",
        openOsSettings: "Ouvrir {label}",
        defaultSet: "Défini par défaut",
        openingSettings: "Ouverture des réglages...",
        setAsDefault: "Définir par défaut",
        step5Badge: "Étape 5 sur 5 • Profil & Sync Cloud",
        step5Title: "Choisissez votre mode de navigation",
        step5Desc: "QBrowse vous offre une souveraineté totale. Naviguez 100 % hors ligne avec chiffrement matériel local ou créez un compte Cloud Sync gratuit.",
        zeroTelemetry: "Zéro télémétrie",
        localProfile: "Profil local",
        localProfileDesc: "100 % hors ligne. Mots de passe, historique et onglets restent chiffrés localement par clés matérielles. Aucun compte requis.",
        e2eEncrypted: "Chiffré E2E",
        cloudSync: "QBrowse Cloud Sync",
        cloudSyncDesc: "Synchronisez coffre, espaces, onglets épinglés et favoris sur tous vos ordinateurs via Firebase.",
        localReadyTitle: "Le profil local est prêt à démarrer",
        localReadyDesc: "Vos favoris, identifiants et espaces restent strictement sur cet ordinateur. Vous pourrez activer Cloud Sync plus tard dans les paramètres.",
        takeTour: "Suivre la visite interactive",
        startDirectly: "Commencer à naviguer",
        activeSync: "Sync active",
        cloudLinked: "Stockage Cloud chiffré de bout en bout lié",
        signOut: "Déconnexion",
        activeSyncDesc: "Vos favoris, onglets et votre coffre chiffré sont synchronisés en temps réel sur vos appareils autorisés.",
        signIn: "Connexion",
        existingAccount: "(Compte existant)",
        register: "Inscription",
        newAccount: "(Nouveau compte)",
        registerSubtitle: "Créez un nouveau compte QBrowse pour synchroniser vos données.",
        signInSubtitle: "Connectez-vous pour synchroniser vos favoris, espaces et coffre.",
        switchToSignIn: "Passer à la connexion",
        emailLabel: "Adresse e-mail",
        emailPlaceholder: "nom@exemple.com",
        createPassLabel: "Créer un mot de passe (min. 6 caractères)",
        accountPassLabel: "Mot de passe du compte",
        min6Chars: "Au moins 6 caractères",
        confirmPassLabel: "Confirmer le mot de passe",
        passwordsMatch: "Les mots de passe correspondent",
        passwordsMismatch: "Les mots de passe ne correspondent pas",
        useAccountAsMaster: "Utiliser le mot de passe du compte comme clé principale",
        masterDerivedDesc: "Dérive des clés client AES-GCM 256 bits directement depuis votre mot de passe.",
        masterSeparateDesc: "Utilisation d’une phrase secrète de chiffrement distincte.",
        customMasterLabel: "Phrase secrète de chiffrement principale",
        customMasterPlaceholder: "Saisissez une phrase secrète unique pour le coffre...",
        creatingAccount: "Création du compte chiffré...",
        signingInSyncing: "Connexion et synchronisation...",
        createAccountBtn: "Créer le compte et activer Cloud Sync",
        signInBtn: "Se connecter et activer Cloud Sync",
        alreadyRegistered: "Déjà inscrit sur QBrowse ?",
        signInHere: "Se connecter ici",
        newToSync: "Nouveau sur QBrowse Cloud Sync ?",
        createFreeAccount: "Créer un compte gratuit (Inscription)",
        skipSyncLocal: "Ignorer le Cloud Sync et continuer avec le Profil local",
        skipSyncComplete: "Ignorer Sync et terminer",
        vaultModalTitle: "Protégez votre coffre importé",
        vaultModalDesc: "Saisissez ou créez un mot de passe principal pour chiffrer vos identifiants.",
        masterPassLabel: "Mot de passe principal",
        masterPassPlaceholder: "Saisir le mot de passe principal...",
        confirmMasterLabel: "Confirmer le mot de passe principal",
        confirmMasterPlaceholder: "Confirmer le mot de passe...",
        cancel: "Annuler",
        encryptImport: "Chiffrer et importer",
        bookmarkFallback: "Favori",
        htmlFileFallback: "fichier HTML",
        toasts: {
            enterEmail: "Veuillez saisir une adresse e-mail.",
            validEmail: "Veuillez saisir une adresse e-mail valide (ex. nom@domaine.com).",
            passMin6: "Le mot de passe doit contenir au moins 6 caractères.",
            confirmPassReq: "Veuillez confirmer votre mot de passe.",
            passMismatch: "Les mots de passe ne correspondent pas.",
            signedIn: "Connecté à QBrowse Cloud Sync !",
            registered: "Compte créé et Cloud Sync activé !",
            bookmarksImported: "{count} favoris importés avec succès !",
            importFailed: "Échec de l'importation.",
            couldNotImportBookmarks: "Impossible d'importer les favoris.",
            htmlImported: "{count} favoris importés depuis {filename} !",
            htmlImportFailed: "Échec de l'importation du fichier HTML.",
            noCredentials: "Aucun identifiant trouvé dans le fichier",
            passwordsImported: "{count} mots de passe importés depuis {source} !",
            vaultImportFailed: "Échec de l'importation : {error}",
            passMin4: "Le mot de passe doit contenir au moins 4 caractères",
            vaultPassMismatch: "Les mots de passe ne correspondent pas",
            incorrectMasterPass: "Mot de passe principal incorrect pour le coffre existant",
            vaultImportError: "Erreur d'importation : {error}",
            nowDefault: "QBrowse est maintenant votre navigateur par défaut !",
            openingWinDefault: "Ouverture des applications par défaut Windows. Sélectionnez QBrowse.",
            openingOsDefault: "Ouverture de {label}. Choisissez QBrowse par défaut.",
            couldNotOpenDefault: "Impossible d'ouvrir les réglages par défaut."
        }
    },
    flags: {
        title: "Expériences",
        subtitle: "Ajustez les fonctionnalités expérimentales, pipelines graphiques matériels, chiffrements post-quantiques et isolation des flux Tor.",
        resetAll: "Tout réinitialiser",
        warningTitle: "Attention : fonctionnalités expérimentales !",
        warningBody: "Ces commutateurs modifient l’exécution Chromium V8, le compositeur matériel ou les paramètres TLS. Un redémarrage est requis.",
        searchPlaceholder: "Rechercher un drapeau (ex. GPU, Kyber, QUIC, DoH, bfcache)...",
        tabAvailable: "Disponibles ({count})",
        tabUnavailable: "Indisponibles ({count})",
        categories: {
            All: "Toutes",
            Performance: "Performances",
            "Hardware & Graphics": "Matériel & Graphismes",
            "Web Standards & Engine": "Standards Web & Moteur",
            Security: "Sécurité",
            Networking: "Réseau",
            "Media & UI": "Média & Interface",
            "AI & Tools": "IA & Outils",
            Experimental: "Expérimental"
        },
        statuses: {
            Stable: "Stable",
            Beta: "Bêta",
            Experimental: "Expérimental"
        },
        options: {
            default: "Défaut",
            enabled: "Activé",
            disabled: "Désactivé"
        },
        emptyMatch: "Aucun drapeau disponible ne correspond à « {search} »",
        reasonPrefix: "Raison : {reason}",
        unavailableBadge: "Indisponible",
        relaunchMsg: "Vos modifications prendront effet au prochain redémarrage de QBrowse.",
        relaunchBtn: "Redémarrer",
        toasts: {
            reset: "Tous les drapeaux expérimentaux ont été réinitialisés",
            relaunching: "Redémarrage de QBrowse avec les nouveaux paramètres..."
        },
        items: {
            "prefer-high-performance-gpu": {
                name: "Préférer le GPU haute performance",
                description: "Dirige le rendu WebGL, Canvas et 3D vers le GPU dédié sur les systèmes multi-GPU. Désactivé automatiquement en mode Éco."
            },
            "unlock-frame-rate": {
                name: "Fréquence d’images déverrouillée (Mode Benchmark)",
                description: "Désactive la V-Sync pour les tests FPS Canvas/WebGL. Peut provoquer du déchirement d’écran et une consommation accrue."
            },
            "ignore-gpu-blocklist": {
                name: "Ignorer la liste de blocage GPU",
                description: "Outrepasse les restrictions logicielles intégrées à Chromium pour activer l’accélération matérielle sur d’anciens pilotes."
            },
            "experimental-web-platform": {
                name: "Fonctionnalités expérimentales de la plateforme Web",
                description: "Active les API web expérimentales en cours de développement dans Chromium."
            },
            "gpu-rasterization": {
                name: "Rastérisation GPU et accélération du compositeur",
                description: "Accélère la rastérisation et la composition des pages via les pipelines matériels du GPU."
            },
            "smooth-scrolling": {
                name: "Moteur de défilement fluide",
                description: "Active les animations fluides par courbes de Bézier lors du défilement à la souris ou au pavé tactile."
            },
            "zero-copy-rasterizer": {
                name: "Rastérisateur GPU Zero-Copy (GpuMemoryBuffer)",
                description: "Écrit directement dans les textures GPU partagées sans copies intermédiaires en mémoire CPU."
            },
            "enable-vulkan": {
                name: "Backend graphique et compositeur Vulkan",
                description: "Utilise l’API Vulkan pour la composition et le rendu GPU sur les cartes compatibles."
            },
            "back-forward-cache": {
                name: "Cache Précédent/Suivant (bfcache)",
                description: "Conserve en mémoire des instantanés complets des pages récentes pour une navigation instantanée."
            },
            "canvas-oop-rasterization": {
                name: "Rastérisation Canvas 2D hors processus",
                description: "Exécute les opérations Canvas 2D dans le processus GPU dédié plutôt que dans le moteur de rendu."
            },
            "enable-drdc": {
                name: "Détection dynamique de haute fréquence (120/144/240 Hz)",
                description: "Synchronise la cadence d’images avec les écrans ProMotion et moniteurs haute fréquence."
            },
            "auto-suspend-tabs": {
                name: "Mise en veille automatique des onglets (Économie RAM)",
                description: "Décharge automatiquement les onglets inactifs après 15 minutes pour économiser la RAM et la batterie."
            },
            "parallel-download-engine": {
                name: "Téléchargements parallèles multi-threads",
                description: "Segmente les gros fichiers en requêtes HTTP parallèles pour saturer votre bande passante."
            },
            "lazy-image-loading": {
                name: "Chargement différé des images et cadres",
                description: "Diffère le chargement des images hors écran jusqu’au défilement, allégeant le chargement initial."
            },
            "enable-tls13-kyber": {
                name: "Cryptographie post-quantique pour TLS (Kyber768 / ML-KEM)",
                description: "Active l’échange de clés hybride résistant au quantique dans TLS 1.3."
            },
            "enable-encrypted-client-hello": {
                name: "Encrypted Client Hello (ECH / SNI chiffré)",
                description: "Chiffre le nom d’hôte (SNI) lors des poignées de main TLS face aux FAI et pare-feux."
            },
            "strict-origin-isolation": {
                name: "Isolation stricte Site-par-Processus",
                description: "Alloue un processus OS isolé à chaque origine distincte contre les failles Spectre/Meltdown."
            },
            "webrtc-ip-protection": {
                name: "Protection IP locale et anti-fuite STUN WebRTC",
                description: "Empêche les scripts malveillants de découvrir votre véritable adresse IP locale ou publique via WebRTC."
            },
            "enable-dns-over-https": {
                name: "DNS-over-HTTPS strict (Cloudflare/Quad9)",
                description: "Chiffre toutes les résolutions DNS via HTTPS (port 443) contre l’espionnage et l’empoisonnement DNS."
            },
            "disable-hyperlink-auditing": {
                name: "Désactiver l’audit des hyperliens (<a ping>)",
                description: "Empêche l’envoi silencieux de requêtes POST de pistage lors des clics sur les liens."
            },
            "enable-fingerprint-randomization": {
                name: "Injection de bruit anti-empreinte Canvas & WebAudio",
                description: "Perturbe subtilement les lectures de pixels et audio pour contrer le fingerprinting matériel."
            },
            "enable-font-enumeration-shield": {
                name: "Bouclier d’énumération des polices locales",
                description: "Empêche les sites de sonder vos polices installées pour créer une empreinte persistante."
            },
            "aggressive-tracker-blocker": {
                name: "Suppression agressive des paramètres de suivi URL",
                description: "Nettoie les paramètres utm_source, gclid, fbclid et bloque les pixels de suivi connus."
            },
            "enable-subresource-filter": {
                name: "Filtre contre les interstitiels abusifs",
                description: "Détecte et bloque les détournements de clics et invites de téléchargement trompeuses."
            },
            "enable-quic": {
                name: "Protocole expérimental QUIC & HTTP/3",
                description: "Active le transport HTTP/3 sur UDP pour des connexions zéro-RTT et flux multiplexés."
            },
            "tor-stream-isolation": {
                name: "Isolation de circuit Tor par domaine (IsolateDestAddr)",
                description: "Attribue un circuit de sortie distinct par domaine racine dans Tor pour éviter toute corrélation."
            },
            "dns-prefetching": {
                name: "Pré-résolution DNS prédictive",
                description: "Résout à l’avance les adresses IP des liens visibles pour accélérer la navigation au clic."
            },
            "heavy-ad-intervention": {
                name: "Intervention contre les publicités lourdes",
                description: "Décharge les cadres publicitaires consommant plus de 4 Mo ou 60 secondes de CPU."
            },
            "cross-origin-isolation": {
                name: "Politique COOP & SharedArrayBuffer",
                description: "Active la mémoire partagée WebAssembly haute précision via les en-têtes Cross-Origin."
            },
            "document-pip-api": {
                name: "API Document Picture-in-Picture",
                description: "Active les fenêtres flottantes contenant du HTML arbitraire, lecteurs vidéo et widgets."
            },
            "force-dark-contents": {
                name: "Mode sombre automatique des pages (inversion Chromium)",
                description: "Génère un thème sombre pour les sites clairs tout en préservant les images."
            },
            "overlay-scrollbars": {
                name: "Barres de défilement flottantes minimalistes",
                description: "Remplace les barres système épaisses par de fins indicateurs qui s’estompent automatiquement."
            },
            "enable-webgpu": {
                name: "API graphique et calcul WebGPU nouvelle génération",
                description: "Fournit un accès direct au GPU pour les réseaux de neurones, la 3D et les shaders."
            },
            "tab-audio-muting": {
                name: "Coupure du son d’onglet en un clic",
                description: "Ajoute un badge haut-parleur interactif sur l’onglet pour couper le son instantanément."
            },
            "webrtc-pipewire": {
                name: "Capture d’écran PipeWire (Linux Wayland)",
                description: "Active le partage d’écran via le portail PipeWire sous GNOME et KDE Plasma."
            },
            "hdr-compositing": {
                name: "Composition couleur HDR (Grande gamme dynamique)",
                description: "Active le gamut étendu 10 bits (Rec.2020 / DCI-P3) sur les écrans compatibles."
            },
            "local-ai-assistant": {
                name: "Accélération VRAM pour LLM GGUF locaux (llama.cpp)",
                description: "Décharge les poids Gemma et Llama 3 en VRAM pour des résumés rapides et privés."
            },
            "experimental-split-screen-gestures": {
                name: "Gestes cinétiques d’écran partagé",
                description: "Permet de glisser un onglet vers un bord pour diviser l’écran instantanément."
            },
            "enable-reader-mode": {
                name: "Mode Lecture sans distraction",
                description: "Extrait l’article dans une mise en page épurée sans publicités ni barres latérales."
            },
            "auto-password-generation": {
                name: "Génération cryptographique de mots de passe forts",
                description: "Détecte les formulaires d’inscription et propose des mots de passe 128 bits sécurisés via QVault."
            },
            "tab-groups-auto-clustering": {
                name: "Regroupement intelligent d’onglets par domaine",
                description: "Suggère de regrouper les onglets selon leurs domaines et l’usage de l’espace de travail."
            },
            "touch-ui-layout": {
                name: "Interface tactile pour tablettes",
                description: "Agrandit la barre d’onglets et les zones tactiles. Désactivé sur profils bureau.",
                reason: "Nécessite la détection d’un numériseur tactile."
            },
            "eye-tracking-gaze-scroll": {
                name: "Navigation par suivi oculaire",
                description: "Fait défiler la page selon le regard. Nécessite un capteur infrarouge dédié.",
                reason: "Aucun capteur de suivi oculaire compatible détecté."
            },
            "cellular-data-saver": {
                name: "Économiseur de données cellulaires",
                description: "Compresse les images via un proxy distant. Désactivé pour protéger la confidentialité.",
                reason: "Désactivé par défaut pour préserver le chiffrement E2E HTTPS et Tor."
            }
        }
    }
};

const de = {
    common: {
        incognito: "Inkognito",
        selectOption: "Option auswählen...",
        colors: {
            accent: "Akzent",
            yellow: "Gelb",
            green: "Grün",
            blue: "Blau",
            pink: "Rosa"
        }
    },
    wallpaperPreview: {
        alt: "Hintergrundbild-Vorschau",
        badge: "Vorschau"
    },
    presets: {
        names: {
            balanced: "Ausgewogen",
            developer: "Entwickler",
            classic_reverse: "Modernes Arc",
            bottom_bar: "Ergonomischer Fluss",
            minimalist: "Minimal-Fokus",
            privacy: "Datenschutz-Wächter"
        },
        taglines: {
            balanced: "Persönlicher & Arbeitsbereich mit Google-Suche.",
            developer: "Isolierte Arbeitsbereiche mit GitHub Live-PR-Integration.",
            classic_reverse: "Rechtsbündiger Tab-Baum mit klarer Leseansicht.",
            bottom_bar: "Untere Adressleiste für daumenfreundliche Navigation.",
            minimalist: "Einzelner Arbeitsbereich mit kompakter, ablenkungsfreier Oberfläche.",
            privacy: "Strenger Tracker-Schutz mit DuckDuckGo-Suche."
        },
        descriptions: {
            balanced: "Zwei Arbeitsbereiche (Privat & Arbeit), Standard-Datenschutz und Google.",
            developer: "Multi-Workspace-Isolation mit GitHub Live-PR-Tracking und Dev-Tools.",
            classic_reverse: "Rechtsbündige Navigationsstruktur, gespiegelte Leiste und fokussierte Tabs.",
            bottom_bar: "Adressleiste unten für ergonomische Einhand-Navigation.",
            minimalist: "Einzelner Arbeitsbereich, rechte Seitenleiste und ultrakompaktes UI.",
            privacy: "Strenger Tracker-Blocker, DuckDuckGo und sofortiges Tor-Onion-Routing."
        },
        customTaglineFallback: "Benutzerdefinierte Arbeitsbereichs- und Layout-Konfiguration.",
        accents: {
            amberGold: "Bernsteingold",
            ocean: "Ozean",
            skyBlue: "Himmelblau",
            cyberEmerald: "Cyber-Smaragd",
            electricBlue: "Elektrisch Blau",
            royalViolet: "Königsviolett",
            roseGold: "Roségold",
            sunsetOrange: "Sonnenuntergang",
            cyberCyan: "Cyber-Cyan",
            slateGray: "Schiefergrau"
        }
    },
    addPin: {
        title: "App an Seitenleiste anheften",
        subtitle: "Schnellzugriff für App oder Website hinzufügen",
        defaultAppName: "App-Name",
        appNameLabel: "App-Name / Titel",
        appNamePlaceholder: "z. B. GitHub, Gemini...",
        urlLabel: "URL / Domain *",
        urlPlaceholder: "z. B. github.com oder https://gemini.google.com",
        quickPresets: "Schnellvorlagen",
        cancel: "Abbrechen",
        pinApp: "Anheften"
    },
    passkey: {
        biometrics: {
            darwin: "Touch ID",
            linux: "System-Biometrie",
            win32: "Windows Hello"
        },
        hints: {
            darwin: "Berühren Sie den Touch ID-Sensor oder geben Sie Ihr macOS-Passwort ein",
            linux: "Berühren Sie den Fingerabdrucksensor oder geben Sie Ihr Systempasswort ein",
            win32: "Berühren Sie den Fingerabdrucksensor oder geben Sie Ihre Windows-PIN ein"
        },
        cancelDenyTitle: "Abbrechen & Ablehnen",
        verifiedTitle: "Identität bestätigt!",
        scanningTitle: "Scanne {biometric}...",
        autofillTitle: "Gespeichertes Passwort ausfüllen",
        passkeyTitle: "Passkey-Authentifizierung",
        verifiedAutofillDesc: "Tresor entsperrt und Zugangsdaten ausgefüllt",
        verifiedPasskeyDesc: "Passkey erfolgreich freigegeben und signiert",
        requireAutofillDesc: "Verifizierung zum Entsperren und Ausfüllen erforderlich",
        requirePasskeyDesc: "Verifizierung für die Anmeldung mit Ihrem Passkey erforderlich",
        passwordBadge: "Passwort",
        passkeyBadge: "Passkey",
        accountLabel: "Konto:",
        savedLogin: "Gespeicherter Login",
        passkeyUser: "Passkey-Benutzer",
        verifyingWith: "Verifiziere mit {biometric}...",
        verifiedBtn: "Bestätigt!",
        verifyWith: "Mit {biometric} verifizieren",
        orPassPin: "Oder mit Master-Passwort / PIN",
        orPass: "Oder mit Master-Passwort",
        placeholderPin: "Master-Passwort oder 4–8-stellige Schnell-PIN eingeben",
        placeholderPass: "QVault Master-Passwort eingeben",
        checking: "Prüfe Zugangsdaten...",
        verifyAuth: "Verifizieren & Authentifizieren",
        cancelDenyBtn: "Abbrechen & Anfrage ablehnen",
        websiteFallback: "Website",
        theWebsiteFallback: "die Website",
        toastAutofill: "Tresor entsperrt & Zugangsdaten für {domain} ausgefüllt!",
        toastPasskey: "Passkey für {domain} bestätigt!",
        promptAutofill: "Identität bestätigen, um Zugangsdaten für {domain} auszufüllen",
        promptPasskey: "Mit Ihrem QVault-Passkey bei {domain} anmelden",
        biometricError: "Biometriefehler: {error}",
        vaultLockedOut: "Tresor nach Fehlversuchen gesperrt. Erneut versuchen in {seconds}s.",
        incorrectCreds: "Falsches Master-Passwort oder falsche Schnell-PIN. Bitte erneut versuchen.",
        verificationFailed: "Verifizierung fehlgeschlagen: {error}",
        passkeyCreateTitle: "QVault-Passkey erstellen",
        verifiedPasskeyCreateDesc: "Identität verifiziert — Passkey wird in QVault gespeichert",
        requirePasskeyCreateDesc: "Verifizierung erforderlich, um diesen Passkey zu erstellen und zu speichern",
        useHardwareKeyBtn: "Hardware- / Systemschlüssel verwenden",
        useHardwareKeyHint: {
            darwin: "YubiKey · FIDO2 · Touch ID · Telefon-QR",
            linux: "YubiKey · FIDO2 · USB / NFC / BLE · Telefon-QR",
            win32: "YubiKey · FIDO2 · Windows Hello · Telefon-QR"
        },
        toastHardwareHandoff: "Wechsel zu Hardware- / Systemsicherheitsschlüssel für {domain}...",
        toastPasskeyCreated: "Passkey verifiziert & für {domain} gespeichert!",
        promptPasskeyCreate: "QVault-Passkey für {domain} erstellen und speichern"
    },
    history: {
        title: "Archiv",
        entrySingular: "{count} Eintrag gespeichert",
        entryPlural: "{count} Einträge gespeichert",
        searchPlaceholder: "Archiv durchsuchen...",
        clearAllTitle: "Gesamten Browserverlauf löschen",
        clear: "Leeren",
        closeTitle: "Schließen (Esc)",
        segments: {
            all: "Alle",
            today: "Heute",
            yesterday: "Gestern",
            week: "Letzte 7 Tage",
            older: "Älter"
        },
        emptySearch: "Keine Ergebnisse für „{query}“",
        emptyTitle: "Archiv ist leer",
        emptySearchDesc: "Überprüfen Sie die Schreibweise oder wählen Sie einen anderen Filter.",
        emptyDesc: "Besuchte Seiten werden hier für den schnellen Zugriff gespeichert.",
        itemSingular: "{count} Eintrag",
        itemPlural: "{count} Einträge",
        copyLinkTitle: "Link kopieren",
        openNewTabTitle: "In neuem Tab öffnen",
        removeTitle: "Aus Archiv entfernen",
        toastCleared: "Archiv geleert",
        toastCopied: "Link kopiert",
        toastOpenedBg: "Im Hintergrund-Tab geöffnet",
        loadMore: "Mehr laden",
    },
    cookies: {
        title: "Cookies & Website-Speicher-Explorer",
        subtitle: "Website-Cookies und lokale Daten prüfen, durchsuchen und löschen",
        filterDomain: "Domain filtern",
        refreshTitle: "Liste aktualisieren",
        allSites: "Alle Websites",
        clearDomain: "{domain} löschen",
        clearAllData: "Alle Browserdaten löschen",
        searchPlaceholder: "Cookies nach Name, Domain oder Wert suchen...",
        emptyTitle: "Keine Cookies gefunden",
        emptyDesc: "Suche zurücksetzen oder andere Domain auswählen",
        secure: "Sicher",
        httpOnly: "HttpOnly",
        path: "Pfad: {path}",
        expires: "Läuft ab: {date}",
        deleteTitle: "Cookie löschen",
        toastDeleted: "Cookie gelöscht: {name}",
        toastClearedSite: "{count} Cookies für {domain} gelöscht",
        toastClearedAll: "Browserdaten & Cookies gelöscht"
    },
    resources: {
        title: "Task-Manager",
        cpu: "CPU",
        ram: "RAM",
        asleepCount: "{count} im Ruhemodus",
        sleepInactive: "Inaktive pausieren",
        sleepInactiveTitle: "Inaktive Hintergrund-Tabs in den Ruhemodus versetzen, um RAM freizugeben",
        wakeAll: "Alle wecken",
        wakeAllTitle: "Alle pausierten Tabs aufwecken",
        purgeCacheTitle: "Browser-Speichercache leeren",
        autoRefreshActiveTitle: "Auto-Aktualisierung aktiv (alle 2s)",
        autoRefreshPausedTitle: "Auto-Aktualisierung pausiert",
        autoRefresh2s: "2s",
        paused: "Pausiert",
        refreshTitle: "Prozessmetriken aktualisieren",
        closeTitle: "Schließen (ESC)",
        filters: {
            all: "Alle",
            tabs: "Tabs",
            processes: "Prozesse",
            sleeping: "Ruhemodus"
        },
        searchPlaceholder: "Nach Name, PID filtern...",
        colTask: "Aufgabe / Prozess",
        colSpace: "Bereich / Typ",
        colStatus: "Status",
        colCpu: "CPU",
        colMemory: "Arbeitsspeicher",
        colAction: "Aktion",
        emptyMatch: "Keine Aufgaben passend zu „{query}“",
        blankTab: "Leerer Tab",
        newTabDash: "Zen Neuer-Tab-Dashboard",
        pidSubtitle: "PID {pid} · {type}",
        active: "Aktiv",
        spaceTab: "{space}-Tab",
        mainCore: "Hauptkern",
        sleep: "Ruhe",
        live: "Aktiv",
        memSaved: "(Gespart)",
        wakeTabTitle: "Tab aufwecken",
        activeTabCannotSleep: "Aktiver Tab kann nicht pausiert werden",
        sleepTabTitle: "Tab in Ruhemodus versetzen",
        switchTabTitle: "Zum Tab wechseln",
        closeTabTitle: "Tab schließen",
        core: "Kern",
        endProcessTitle: "Prozess PID {pid} beenden",
        itemsOf: "{shown} von {total} Einträgen",
        pressEscPrefix: "Drücken Sie",
        pressEscSuffix: "zum Schließen",
        procMain: "QBrowse Hauptprozess",
        procGpu: "GPU-Prozess",
        procRenderer: "Webview-Renderer",
        procUtility: "Hilfsdienst (Audio/Speicher)",
        procZygote: "Sandbox-Vorlader",
        procPepper: "Plugin-Host",
        procChild: "{type}-Prozess",
        procChildDefault: "Unterprozess",
        toastHibernatedSingular: "{count} inaktiver Tab pausiert (~{mb} MB RAM freigegeben)",
        toastHibernatedPlural: "{count} inaktive Tabs pausiert (~{mb} MB RAM freigegeben)",
        toastWokeSingular: "{count} schlafender Tab wiederhergestellt",
        toastWokePlural: "{count} schlafende Tabs wiederhergestellt",
        toastCachePurged: "Browser-Cache geleert & Speicher optimiert",
        toastKillUnavailable: "Prozess kann nicht beendet werden: API nicht verfügbar",
        toastKilled: "Prozess {pid} beendet",
        toastKillFailed: "Prozess {pid} konnte nicht beendet werden",
        toastKillError: "Fehler beim Beenden von Prozess {pid}"
    },
    docViewer: {
        fallbackName: "Lokales Dokument",
        fallbackFile: "Datei",
        preview: "Vorschau",
        raw: "Rohdaten",
        zoomOut: "Verkleinern",
        zoomIn: "Vergrößern",
        resetZoom: "Zoom zurücksetzen",
        copyTitle: "Dateiinhalt kopieren",
        copied: "Kopiert",
        copy: "Kopieren",
        revealTitle: "Im Systemordner anzeigen",
        loading: "Dokument wird geladen...",
        errorTitle: "Datei kann nicht angezeigt werden",
        readError: "Datei konnte nicht gelesen werden",
        toastCopied: "Inhalt in die Zwischenablage kopiert",
        toastRevealed: "Datei im Systemordner angezeigt"
    },
    pdfViewer: {
        toggleThumbnails: "Seiten-Miniaturen umschalten",
        fallbackName: "PDF-Dokument",
        pageSingular: "{count} Seite",
        pagePlural: "{count} Seiten",
        prevPage: "Vorherige Seite",
        nextPage: "Nächste Seite",
        zoomOut: "Verkleinern",
        zoomIn: "Vergrößern",
        fitWidth: "An Breite anpassen",
        rotate: "Um 90° im Uhrzeigersinn drehen",
        normalMode: "Normaler Modus",
        darkInvertMode: "Dunkler Invertierungsmodus",
        summarize: "Zusammenfassen",
        revealTitle: "Im Dateimanager öffnen",
        pagesHeader: "Seiten",
        pageNum: "Seite {num}",
        loading: "PDF wird mit PDF.js gerendert...",
        errorTitle: "Dokument konnte nicht geöffnet werden",
        openError: "PDF-Dokument konnte nicht geöffnet werden",
        extractingToast: "Dokumenttext wird für Qu-AI extrahiert...",
        openedAiToast: "Im Qu-AI-Panel mit Dokumenttext geöffnet!",
        extractErrorToast: "Textextraktion fehlgeschlagen: {error}",
        revealedToast: "Datei im Systemordner angezeigt",
        fallbackDocName: "Dokument",
        pageMarker: "--- Seite {num} ---",
        summaryPrompt: "Bitte erstelle eine prägnante Zusammenfassung und die wichtigsten Erkenntnisse dieses PDF-Dokuments ({fileName}):"
    },
    localDir: {
        parentFolderTitle: "Zum übergeordneten Ordner",
        reloadTitle: "Ordner neu laden",
        openInFileManager: "Im Dateimanager öffnen",
        filterPlaceholder: "Dateien in diesem Verzeichnis filtern...",
        sortName: "Name",
        sortSize: "Größe",
        sortDate: "Datum",
        gridViewTitle: "Rasteransicht",
        listViewTitle: "Listenansicht",
        scanning: "Verzeichnisinhalt wird gescannt...",
        errorTitle: "Ordner konnte nicht geöffnet werden",
        goParent: "Zum übergeordneten Verzeichnis",
        emptySearch: "Keine Dateien entsprechen Ihrer Suche",
        emptySearchHint: "Versuchen Sie, den Suchfilter zu leeren",
        folderType: "Ordner",
        revealTitle: "Im Dateimanager anzeigen",
        colName: "Name",
        colModified: "Geändert",
        colSize: "Größe",
        itemSingular: "{count} Objekt",
        itemPlural: "{count} Objekte",
        filtered: "(gefiltert)",
        suiteName: "QBrowse Datei-Suite",
        apiUnavailable: "Electron-Verzeichnis-API nicht verfügbar",
        openFailed: "Verzeichnis konnte nicht geöffnet werden",
        toastOpened: "Im System-Dateimanager geöffnet",
        toastRevealed: "Angezeigt: {name}"
    },
    tour: {
        welcomeTitle: "Willkommen bei QBrowse",
        welcomeSubtitle: "Wählen Sie, wie Sie den Browser-Rundgang erleben möchten:",
        overviewBadge: "Überblick",
        quickTitle: "Schnellüberblick",
        quickDesc: "Kurzer visueller Rundgang durch Layout, Arbeitsbereiche und Navigation.",
        startQuick: "Schnell-Tour starten",
        interactiveBadge: "Interaktiv",
        interactiveTitle: "Interaktive Masterclass",
        interactiveDesc: "Geführte Missionen in der echten UI: Schaltflächen klicken, Tor testen und Kurzbefehle meistern.",
        startInteractive: "Interaktive Tour starten",
        skipWelcome: "Tour überspringen und direkt surfen (Esc)",
        stepCounter: "Schritt {current} von {total}",
        closeTitle: "Tour schließen (Esc)",
        skipTour: "Tour überspringen",
        back: "Zurück",
        finishTour: "Tour beenden",
        nextStep: "Nächster Schritt",
        exitToast: "Tour beendet. Drücken Sie jederzeit Strg+K, um QBrowse zu erkunden!",
        topBarShortcut: "Obere Leiste",
        steps: {
            spaces: {
                title: "Multi-Space-Isolation",
                badge: "Arbeitsbereiche",
                description: "Halten Sie Arbeitsabläufe sauber getrennt. Jeder Bereich (Privat, Arbeit, Ghost, Tor) isoliert Logins, Cookies und Tabs vollständig.",
                missionInstruction: "Klicken Sie in der Seitenleiste auf „Arbeit“ oder drücken Sie Strg+2",
                missionSuccess: "Arbeitsbereich gewechselt! Ihre Tabs, Logins und Cookies sind nun sauber isoliert."
            },
            splitview: {
                title: "Native Split-Screen-Ansicht",
                badge: "Multitasking",
                description: "Surfen Sie auf zwei Websites gleichzeitig nebeneinander, ohne separate Fenster zu öffnen. Ideal für Recherche und Entwicklung.",
                missionInstruction: "Klicken Sie oben auf das Split-View-Symbol oder drücken Sie Strg+\\",
                missionSuccess: "Geteilte Ansicht umgeschaltet! Rechts wurde das zweite Browserfenster geöffnet."
            },
            tor: {
                title: "Integriertes Tor-Onion-Netzwerk",
                badge: "Privatsphäre & Onion",
                description: "Surfen Sie mit mehrstufiger Verschlüsselung durch das dezentrale Web und greifen Sie direkt auf .onion-Domains zu.",
                missionInstruction: "Klicken Sie oben auf das Tor-Symbol, um Ihren aktiven Relay-Circuit anzuzeigen",
                missionSuccess: "Tor-Circuit geöffnet! Sie sehen Ihre Relay-Knoten und können jederzeit umschalten."
            },
            vault: {
                title: "Zero-Knowledge QVault",
                badge: "Hardware-Sicherheit",
                description: "Master-Passwörter, Passkeys und Zahlungsdaten werden lokal mit Hardware-Schlüsseln und {biometric} verschlüsselt. Kein Klartext verlässt Ihren PC.",
                missionInstruction: "Klicken Sie oben auf das QVault-Symbol, um Ihren lokalen Tresor zu öffnen",
                missionSuccess: "QVault geöffnet! Alle Zugangsdaten sind lokal mit biometrischem Schutz verschlüsselt."
            },
            shield: {
                title: "Nativer Werbe- & Tracker-Blocker",
                badge: "Schutz",
                description: "Hardwarebeschleunigtes Netzwerk-Blocking stoppt Telemetrie, Krypto-Miner, Fingerprinting und Werbung noch vor dem Laden.",
                missionInstruction: "Klicken Sie oben auf das Schild-Symbol, um blockierte Tracker zu prüfen",
                missionSuccess: "QShield-Inspektor geöffnet! Sehen Sie live blockierte Domains und steuern Sie den Schutz."
            },
            darkmode: {
                title: "Intelligenter Dunkelmodus & Themes",
                badge: "Darstellung",
                description: "Passen Sie die Optik nahtlos an: dunkle Themes, klarer Hellmodus oder Smart Invert für helle Alt-Websites.",
                missionInstruction: "Klicken Sie oben auf das Theme-Symbol, um die Darstellungsoptionen zu öffnen",
                missionSuccess: "Theme-Panel geöffnet! Wechseln Sie zwischen Dunkel, Hell und Smart Invert."
            },
            toolhub: {
                title: "ToolHub & Persistente Haftnotizen",
                badge: "Recherche & Tools",
                description: "Markieren Sie Text auf beliebigen Seiten für dauerhafte Notizen, nutzen Sie den privaten KI-Assistenten und den Zwischenablage-Verlauf.",
                missionInstruction: "Klicken Sie rechts auf den ToolHub-Griff oder drücken Sie Strg+J",
                missionSuccess: "ToolHub ist offen! Heften Sie Notizen an Websites oder chatten Sie mit Ihrer lokalen KI."
            },
            omnibox: {
                title: "Smarte Omnibox & Befehlspalette",
                badge: "Universal-Befehl",
                description: "Ihr Startpunkt für alles: Bang-Kürzel (!yt, @github), Browser-Befehle (>pdf, >clear), Taschenrechner und direkte KI-Abfragen.",
                missionInstruction: "Drücken Sie Strg+K oder klicken Sie auf die zentrale Adressleiste",
                missionSuccess: "Omnibox aktiv! Tippen Sie !yt für YouTube, @github für Repos oder > für Befehle."
            }
        }
    },
    reader: {
        themes: {
            dark: "Dunkel",
            sepia: "Sepia",
            light: "Hell",
            midnight: "Mitternacht"
        },
        fonts: {
            serif: "Serif",
            sans: "Sans",
            mono: "Mono",
            dyslexic: "Legasthenie"
        },
        widths: {
            compact: "Schmal",
            balanced: "Ausgewogen",
            wide: "Breit"
        },
        exitTitle: "Lesemodus beenden (Esc / Strg+Alt+R)",
        backToWebpage: "Zurück zur Webseite",
        openOriginalTitle: "Original öffnen: {url}",
        hideAudioTitle: "Audioplayer ausblenden",
        listenTitle: "Artikel anhören (Vorlesen)",
        listening: "Wiedergabe",
        readAloud: "Vorlesen",
        themeTitle: "Design: {name}",
        fontTitle: "Schriftart {name} verwenden",
        decreaseSizeTitle: "Text verkleinern",
        increaseSizeTitle: "Text vergrößern",
        widthTitle: "Spaltenbreite: {name}",
        closeTitle: "Lesemodus schließen",
        byAuthor: "Von {author}",
        minRead: "{minutes} Min. Lesezeit",
        wordsCount: "{count} Wörter",
        prevParaTitle: "Vorheriger Absatz",
        pauseTitle: "Pause",
        playTitle: "Abspielen",
        nextParaTitle: "Nächster Absatz",
        audioNarration: "Sprachausgabe",
        blockProgress: "Abschnitt {current} von {total}",
        speedTitle: "Lesegeschwindigkeit ändern",
        selectVoiceTitle: "Stimme auswählen",
        voiceFallback: "Stimme",
        systemVoices: "Systemstimmen",
        stopCloseTitle: "Vorlesen stoppen & schließen",
        highlightWithTitle: "Hervorheben mit {color}",
        noteBtn: "Notiz",
        copyTextTitle: "Text kopieren",
        stickyNote: "Haftnotiz",
        notePlaceholder: "Notiz oder Gedanken eingeben...",
        deleteBtn: "Löschen",
        saveBtn: "Speichern"
    },
    toolhub: {
        title: "Tool Hub",
        snip: "Ausschnitt",
        snipTitle: "Interaktiver Bildschirmausschnitt (Auswahl)",
        captureViewportTitle: "Sichtbaren Bereich aufnehmen",
        captureFullTitle: "Gesamte scrollbare Seite aufnehmen",
        tabs: {
            notes: "Notizen",
            clipboard: "Zwischenablage",
            ai: "Lokale KI",
            downloads: "Downloads"
        },
        webNotesTab: "Web-Notizen ({count})",
        scratchpadTab: "Notizblock",
        globalScope: "Global",
        spaceScope: "Bereich {space}",
        scratchpadTitle: "Notizblock: {name}",
        scratchpadGlobalPlaceholder: "Globale Gedanken, Notizen, Links festhalten... Markdown unterstützt.",
        scratchpadSpacePlaceholder: "Notizblock für Bereich {space}... Markdown unterstützt.",
        searchNotesPlaceholder: "Markierungen, Notizen, Domains suchen...",
        clearSearchTitle: "Suche löschen",
        allSpaces: "Alle Bereiche",
        exportMd: "MD-Export",
        exportMdTitle: "Notizen als Markdown (.md) exportieren",
        noWebNotesTitle: "Keine Web-Notizen gespeichert",
        noWebNotesDesc: "Markieren Sie Text auf einer Webseite oder klicken Sie auf „Notiz“, um dauerhafte Notizen zu speichern.",
        otherDomain: "Sonstige",
        colorTitle: "Farbe: {color}",
        jumpHighlightTitle: "Klicken, um zu dieser Markierung zu springen",
        editNotePlaceholder: "Notiz oder Gedanken hinzufügen...",
        deleteNote: "Notiz löschen",
        deleteNoteTitle: "Notiztext löschen",
        cancel: "Abbrechen",
        saveNote: "Notiz speichern",
        clickToEditNote: "Klicken zum Bearbeiten",
        addNoteTitle: "Notiz hinzufügen",
        noteBtn: "Notiz",
        copyQuoteTitle: "Zitat kopieren",
        jumpBtn: "Springen",
        jumpBtnTitle: "Zur Notiz auf der Seite springen",
        deleteHighlightTitle: "Markierung löschen",
        clipboardHeader: "System-Zwischenablageverlauf",
        syncBtn: "Sync",
        syncTitle: "System-Zwischenablage synchronisieren",
        deleteClipTitle: "Eintrag löschen",
        clipboardEmptyTitle: "Zwischenablage ist leer",
        clipboardEmptyDesc: "Kopieren Sie Text oder URLs, um sie hier anzuzeigen",
        clearClipboard: "Zwischenablage leeren",
        aiStatusRunning: "llama-server aktiv (Port 8080)",
        aiStatusDownloading: "Lade Modell ({progress}%)...",
        aiStatusStarting: "Engine wird gestartet...",
        aiStatusReady: "Startbereit",
        aiStatusDownloaded: "Heruntergeladen",
        aiStatusNotDownloaded: "Modell nicht heruntergeladen",
        cancelDownloadTitle: "Download abbrechen",
        downloadModelTitle: "{name} herunterladen ({size})",
        downloadBtn: "Laden",
        startingBtn: "Startet...",
        stopBtn: "Stopp",
        startBtn: "Start",
        openWebUiTitle: "llama.cpp Web-UI öffnen",
        aiConsoleSettingsTitle: "llama.cpp Konsole & Erweiterte Einstellungen",
        downloadingFile: "Lade {filename}",
        downloadingWeights: "Lade Modellgewichte...",
        noModelTitle: "Kein KI-Modell heruntergeladen",
        offlineBadge: "Offline",
        noModelDesc: "Laden Sie {name} herunter, um schnelle, private lokale KI für Zusammenfassungen, Code und Chat zu nutzen.",
        downloadModelSize: "Modell laden ({size})",
        settingsBtn: "Einstellungen",
        contextBtn: "Kontext",
        searchBtn: "Suche",
        voiceBtn: "Sprache",
        summarizeBtn: "Zusammenfassen",
        summarizePrompt: "Fasse diese Webseite übersichtlich mit den wichtigsten Erkenntnissen und Hauptpunkten zusammen.",
        attachTitle: "Datei oder Bild anhängen",
        chatPlaceholder: "Lokale Gemma 4 KI fragen oder Dateien ablegen...",
        voiceInputTitle: "Spracheingabe (Whisper)",
        downloadsHeader: "Aktive & Letzte Downloads",
        itemSingular: "{count} Eintrag",
        itemPlural: "{count} Einträge",
        openDownloadsFolderTitle: "Download-Ordner öffnen",
        clearDownloadsTitle: "Alle Downloads leeren",
        downloadedFileFallback: "Heruntergeladene Datei",
        snipBadge: "Ausschnitt",
        verified: "Verifiziert",
        unverified: "Unverifiziert",
        sha256Prefix: "SHA-256: {hash}",
        saved: "Gespeichert",
        verifyCopyHashTitle: "SHA-256-Prüfsumme prüfen & kopieren",
        copyHashTitle: "SHA-256: {hash} (Zum Kopieren klicken)",
        copyImageTitle: "Bild in Zwischenablage kopieren",
        showInFolderTitle: "Im Ordner anzeigen",
        deleteDownloadTitle: "Datei löschen & aus Liste entfernen",
        downloadsEmptyTitle: "Keine aktiven Downloads",
        downloadsEmptyDesc: "Screenshots und heruntergeladene Dateien erscheinen hier",
        pdfPageName: "{name} (S. {page})",
        pdfImageSize: "PDF-Bild",
        toasts: {
            jumpingToNote: "Springe zur Notiz auf der Seite...",
            exportedMarkdown: "Markdown-Datei exportiert!",
            copiedNotesMarkdown: "Notizen als Markdown kopiert!",
            copiedToClipboard: "In Zwischenablage kopiert!",
            clipDeleted: "Eintrag gelöscht",
            clipboardCleared: "Zwischenablage geleert",
            parsingPdf: "PDF wird visuell analysiert: {name}",
            pdfVramLimit: "Erste 10 Seiten von {name} als Bilder geladen (VRAM-Limit).",
            pdfVisualFailed: "Visuelle PDF-Analyse fehlgeschlagen. Nutze Textextraktion.",
            openPageFirst: "Öffnen Sie zuerst eine Webseite zum Zusammenfassen",
            transcriptionFailed: "Transkription fehlgeschlagen",
            micDenied: "Mikrofonzugriff verweigert",
            noteRemoved: "Notiz entfernt",
            noteUpdated: "Notiz aktualisiert",
            copiedQuote: "Zitat kopiert",
            highlightRemoved: "Markierung entfernt",
            downloadsCleared: "Download-Liste geleert",
            hashCopied: "SHA-256-Prüfsumme kopiert",
            hashMissing: "Hash konnte nicht berechnet werden – Datei fehlt",
            screenshotCopied: "Screenshot in Zwischenablage kopiert",
            downloadDeleted: "Download und Datei gelöscht"
        },
        cancelled: "Abgebrochen",
        failed: "Fehlgeschlagen"
    },
    fontManager: {
        title: "App-Typografie & Schriftart",
        active: "Aktiv:",
        resetTitle: "Auf Systemstandard-Schriftart zurücksetzen",
        resetToDefault: "Zurücksetzen",
        modes: {
            preset: "Vorlagen",
            google: "Google Fonts",
            system: "Systemschriften",
            file: "Datei hochladen"
        },
        categories: {
            all: "Alle",
            sans: "Sans",
            mono: "Mono",
            serif: "Serif"
        },
        activeFont: "Aktive Schriftart",
        clickToApply: "Zum Anwenden klicken",
        googleTitle: "Beliebige Google Font verwenden",
        googleDesc: "Geben Sie einen Schriftnamen von fonts.google.com ein und drücken Sie Enter zum sofortigen Laden.",
        googlePlaceholder: "z. B. Montserrat, Space Grotesk, Syne, Cinzel...",
        applyFont: "Anwenden",
        popularGoogle: "Beliebte Google Fonts",
        filterPlaceholder: "Liste filtern...",
        systemTitle: "Installierte Systemschrift wählen",
        systemDesc: "Geben Sie eine installierte Systemschriftart ein (z. B. Segoe UI Variable, Calibri, Helvetica).",
        systemPlaceholder: "Systemschriftname eingeben...",
        installed: "Installiert",
        notDetected: "Nicht erkannt",
        notDetectedTitle: "Nicht über Canvas-Metrik erkannt, CSS versucht dennoch die Darstellung falls vorhanden",
        commonOsFonts: "Häufige Betriebssystem-Schriftarten",
        dropTitle: "Schriftdatei hier klicken oder ablegen",
        dropDesc: "Unterstützt TrueType (.ttf), OpenType (.otf), WOFF (.woff) und WOFF2 (.woff2) bis 12 MB.",
        selectFile: "Lokale Schriftdatei wählen",
        activeCustomFace: "Aktive eigene Schriftart",
        removeFileTitle: "Hochgeladene Schriftdatei entfernen",
        fineTuning: "Typografie-Feinabstimmung",
        letterSpacing: "Zeichenabstand (Laufweite)",
        weightShift: "Schriftstärke",
        fontScale: "UI-Schriftskalierung",
        reset100Title: "Auf 100 % zurücksetzen",
        specimen: "Schriftmuster",
        specimen1: "Franz jagt im komplett verwahrlosten Taxi quer durch Bayern",
        specimen2: "Zwölf Boxkämpfer jagen Viktor quer über den großen Sylter Deich.",
        activeDefault: "Systemstandard (Segoe UI / Nativ)",
        activeGoogle: "Google Font: {name}",
        activeSystem: "Systemschrift: {name}",
        activeFile: "Eigene Datei: {name}",
        customLabel: "Benutzerdefiniert",
        installedOsLabel: "Installiertes OS",
        uploadedFontLabel: "Hochgeladene Schrift",
        spacing: {
            tight: "Eng",
            normal: "Normal",
            relaxed: "Locker",
            wide: "Weit"
        },
        weight: {
            normal: "Normal",
            medium: "Mittel",
            semibold: "Halbfett"
        },
        osLabels: {
            "Windows 11": "Windows 11",
            Windows: "Windows",
            macOS: "macOS",
            "macOS / Multi": "macOS / Multi",
            Universal: "Universal",
            "Windows Dev": "Windows Dev",
            "Windows Terminal": "Windows Terminal",
            Casual: "Zwanglos",
            Linux: "Linux",
            GNOME: "GNOME",
            Serif: "Serif"
        },
        presetDefaultName: "Systemstandard",
        presets: {
            default: {
                description: "Native Betriebssystem-Typografie (Segoe UI / San Francisco).",
                previewText: "Aa Bb Gg 123"
            },
            inter: {
                description: "Klare, hochlesbare moderne UI-Sans speziell für Bildschirme.",
                previewText: "Moderne Neo-Grotesque"
            },
            geist: {
                description: "Vercels charakteristische Entwicklerschrift mit geometrischer Präzision.",
                previewText: "Minimalistische Technik"
            },
            outfit: {
                description: "Raffinierte geometrische Sans mit hochwertiger Ästhetik.",
                previewText: "Geometrische Eleganz"
            },
            "plus-jakarta": {
                description: "Frische, freundliche zeitgenössische Schrift für moderne Web-Apps.",
                previewText: "Freundlich & Modern"
            },
            poppins: {
                description: "Zugängliche abgerundete geometrische Sans mit dynamischen Kurven.",
                previewText: "Weiche Konturen"
            },
            roboto: {
                description: "Googles klassisches Arbeitstier für Android und Material Design.",
                previewText: "Material-Architektur"
            },
            manrope: {
                description: "Mischung aus moderner Grotesk und geometrischer Sans mit hoher Lesbarkeit.",
                previewText: "Präzise Halb-Geometrik"
            },
            lexend: {
                description: "Wissenschaftlich entwickelt, um Sehstress zu reduzieren und Lesen zu beschleunigen.",
                previewText: "Mühelose Lesbarkeit"
            },
            "jetbrains-mono": {
                description: "Kontrastreiche Programmierschrift mit erhöhter Mittellänge für Entwickler.",
                previewText: "Entwickler-Ästhetik"
            },
            "fira-code": {
                description: "Dicktengleiche Schriftart mit Programmier-Ligaturen und hoher Klarheit.",
                previewText: "=> Code-Ligaturen"
            },
            "playfair-display": {
                description: "Kontrastreiche Übergangs-Antiqua im Stil klassischer Druckkunst.",
                previewText: "Redaktioneller Stil"
            },
            merriweather: {
                description: "Warme, angenehme Leseserife für lange Texte.",
                previewText: "Literarischer Klassiker"
            }
        },
        errors: {
            invalidFormat: "Ungültiges Format. Bitte .ttf, .otf, .woff oder .woff2 hochladen.",
            tooLarge: "Datei zu groß. Maximale Größe beträgt 12 MB.",
            readFailed: "Schriftdatei konnte nicht gelesen werden."
        },
        toasts: {
            presetSet: "App-Schriftart auf {name} gesetzt",
            googleApplied: "Google Font „{name}“ auf QBrowse angewendet",
            systemApplied: "Systemschrift „{name}“ angewendet",
            fileLoaded: "Schriftdatei „{name}“ erfolgreich geladen"
        }
    },
    aiSettings: {
        title: "llama.cpp KI-Engine",
        status: {
            online: "Online (llama-server)",
            starting: "Startet...",
            updating: "Aktualisiere Engine...",
            error: "Engine-Fehler",
            stopped: "Gestoppt"
        },
        syncTitle: "Native llama.cpp-Engine prüfen und synchronisieren (b11796 mit Gemma 4)",
        updatingBtn: "Aktualisiere...",
        syncBtn: "Engine sync (b11796)",
        subtitle: "Schneller lokaler Zero-Knowledge-LLM-Runner mit nativer Gemma 4, Qwen 3.5 & Bielik 11B GGUF-Unterstützung.",
        downloadingModel: "Modell wird geladen ({progress}%)",
        connectingCdn: "Verbinde mit CDN...",
        cancel: "Abbrechen",
        downloadBtn: "{name} laden ({size})",
        startingBtn: "Starte llama-server...",
        stopBtn: "llama-server stoppen",
        startBtn: "llama-server starten",
        defaultStartError: "llama-server meldete einen Fehler beim Starten des Modells.",
        dismiss: "Schließen",
        updateEngineBtn: "KI-Engine aktualisieren",
        genSpeed: "Generierungsrate",
        tokPerSec: "Tok/s",
        contextWindow: "Kontextfenster",
        tokens: "Tokens",
        gpuOffload: "GPU-Auslagerung",
        layers: "Ebenen",
        activeModelTitle: "Aktives GGUF-Modell",
        loadCustomGguf: "Eigene .GGUF-Datei laden...",
        loadCustomProjector: "Eigenen Projektor laden...",
        customModelPrefix: "Eigenes Modell: {path}",
        customProjectorPrefix: "Eigener Projektor: {path}",
        reset: "Zurücksetzen",
        downloadedBadge: "Geladen",
        downloadingTarget: "Lade {target}",
        visionProjector: "Vision-Projektor...",
        languageModel: "Sprachmodell...",
        weights: "Gewichte...",
        modelReady: "Modell einsatzbereit",
        downloadModelFile: "Modelldatei laden ({size})",
        overridesTitle: "llama-server Parameter",
        autoDetectBtn: "Hardware erkennen",
        cpuThreadsLabel: "CPU-Threads (-t): {threads}",
        contextSizeLabel: "Kontextgröße (-c)",
        tokensOption: "{n} Tokens",
        contextBadges: {
            compact: "Kompakt",
            default: "Standard",
            extended: "Erweitert",
            max: "Max"
        },
        gpuLayersLabel: "GPU-Ebenen (-ngl): {layers}",
        dataProcessingTitle: "Datenverarbeitung",
        parsePdfTitle: "PDF als Bild verarbeiten",
        parsePdfDesc: "Wandelt PDF-Seiten im Chat in Bilder um statt Rohtext zu extrahieren. Optimal für Gemma 4 & Qwen 3.5 Vision.",
        consoleTitle: "llama-server Terminalkonsole (Live-Stdout)",
        copyOutputTitle: "Terminalausgabe kopieren",
        clearConsoleTitle: "Konsole leeren",
        consoleEmpty: "[llama-server Konsole initialisiert. Bereit für Serverausgabe...]",
        modelWord: "Modell",
        visionWord: "Vision",
        models: {
            "gemma-4-e2b": "Google Gemma 4 E2B Instruct GGUF mit vollständiger multimodaler Vision-Unterstützung.",
            "gemma-4-e4b": "Leistungsstarkes Google Gemma 4 E4B Modell mit multimodaler Vision für komplexe Analysen.",
            "qwen-3.5-4b": "Alibaba Qwen 3.5 4B Modell mit Vision, Logik, Code-Generierung und Mehrsprachigkeit.",
            "bielik-11b-v3.1": "Polnisch-europäisches 11B-Spitzenmodell von SpeakLeash mit hoher Sprachpräzision und Logik."
        },
        toasts: {
            customModelLoaded: "Eigenes Modell geladen: {name}",
            demoModelLoaded: "Demo-Modellpfad geladen!",
            customProjectorLoaded: "Vision-Projektor geladen: {name}",
            demoProjectorLoaded: "Demo-Projektorpfad geladen!",
            updatingEngine: "Native llama.cpp-Engine wird aktualisiert...",
            engineUpdated: "llama.cpp-Engine auf Build b11796 aktualisiert!",
            engineUpdateFailed: "Engine-Update fehlgeschlagen: {error}",
            unknownError: "Unbekannter Fehler",
            logsCopied: "llama-server-Logs kopiert!",
            hardwareDetected: "Hardware erkannt: {threads} Threads, {ram} GB RAM",
            hardwareDefault: "Hardware erkannt: Standardoptimierungen aktiv",
            resizingContext: "Kontextfenster wird auf {tokens} Tokens angepasst..."
        }
    },
    adblockImport: {
        title: "Sperrliste von GitHub / Web importieren",
        subtitle: "Hosts-Dateien, GitHub-Raw-Listen oder Adblock-Regeln automatisch einlesen.",
        closeTitle: "Schließen",
        modeUrl: "Remote-URL / GitHub",
        modePaste: "Rohtext einfügen",
        urlLabel: "Sperrlisten-URL (GitHub raw, Gist oder Hosts-URL)",
        githubRawBadge: "GitHub Raw",
        githubRawTitle: "GitHub-Link erkannt und automatisch in Raw-Format umgewandelt",
        fetching: "Abrufen...",
        fetchParse: "Abrufen & Analysieren",
        popularLists: "Beliebte Community-Listen",
        pasteLabel: "Hosts-Datei, ABP-Filterregeln oder Domainliste einfügen",
        pastePlaceholder: "# Beliebiges Format einfügen:\n0.0.0.0 tracking.evil.com\n127.0.0.1 ads.adserver.org\n||telemetry.network.io^\nanalytics.badsite.com",
        parsing: "Analysiere...",
        parseDomains: "Domains analysieren",
        back: "Zurück",
        backTitle: "Zurück zur Eingabe (Esc)",
        readyToImport: "Bereit zum Import",
        kbSource: "{kb} KB Quelle",
        validDomains: "Gültige Domains",
        newUnique: "Neu & eindeutig",
        duplicatesFiltered: "Duplikate entfernt",
        linesAnalyzed: "Analysierte Zeilen",
        extractedSample: "Beispiel extrahierter Domains ({count})",
        searchSamplePlaceholder: "Beispiel durchsuchen...",
        moreDomains: "+ {count} weitere Domains",
        backToSource: "Zurück zur Quelle",
        cancel: "Abbrechen",
        replaceList: "Gesamte Liste ersetzen",
        replaceListTitle: "Ersetzt Ihre bestehende eigene Sperrliste durch diese Domains",
        importN: "{count} Domains importieren",
        importDomains: "Domains importieren",
        pastedSourceLabel: "Eingefügter Text",
        errors: {
            invalidUrl: "Bitte geben Sie eine gültige Sperrlisten-URL ein.",
            fetchFailed: "Remote-Sperrliste konnte nicht abgerufen werden",
            noValidFromUrl: "Keine gültigen Domainnamen in dieser Quelle gefunden.",
            downloadError: "Fehler beim Herunterladen der Liste",
            emptyPaste: "Bitte fügen Sie zuerst Domains oder Hosts-Regeln ein.",
            noValidFromText: "Keine gültigen Domainnamen im Text gefunden.",
            parseError: "Fehler beim Analysieren des Textes"
        },
        presets: {
            stevenblack: {
                desc: "Umfassender Community-Schutz gegen Adware und Malware.",
                badge: "Empfohlen"
            },
            "oisd-basic": {
                desc: "Leichtgewichtige Liste ohne Fehlalarme gegen Web- und Mobil-Tracking.",
                badge: "Ressourcenschonend"
            },
            "adguard-trackers": {
                desc: "Spezialisierte Domainliste gegen Analyse- und Telemetrieskripte.",
                badge: "Datenschutz"
            },
            peterlowe: {
                desc: "Bewährte Standardliste aktiver Werbeserver.",
                badge: "Schnell"
            },
            danpollock: {
                desc: "Vertrauenswürdige Zero-Host-Liste gegen Telemetrie und Spam.",
                badge: "Klassisch"
            }
        }
    },
    studio: {
        title: "Preset Studio",
        subtitle: "Komponenten visuell andocken, Rundungen formen, Themes anpassen und eigene Presets verwalten.",
        tabCanvas: "Leinwand",
        tabPresets: "Presets",
        closeAria: "Preset Studio schließen",
        dockLeftSidebar: "Seitenleiste links andocken",
        dockRightSidebar: "Seitenleiste rechts andocken",
        dockTopBar: "Navigationsleiste oben andocken",
        dockBottomBar: "Navigationsleiste unten andocken",
        searchBarPlaceholder: "Im Web suchen oder Befehl eingeben...",
        toolhubDockTitle: "ToolHub-Dock: {pos} (Klicken oder ziehen zum Tauschen)",
        legendDock: "Leiste:",
        legendBarValue: "{pos}",
        legendSidebar: "Seitenleiste:",
        legendToolhub: "ToolHub:",
        legendSummary: "Krümmung: {curvature} · Omnibox: {omnibox} · Tabs: {tabs}",
        layoutControls: "Layout-Steuerung",
        resetTitle: "Entwurf auf aktuelle Browser-Einstellung zurücksetzen",
        reset: "Zurücksetzen",
        editingLabel: "Bearbeitung:",
        cancelEditTitle: "Bearbeitung abbrechen und neues Preset erstellen",
        cancel: "Abbrechen",
        sidebarMode: "Seitenleisten-Modus",
        sidebarModes: {
            classic: "Klassisch",
            floating: "Schwebend",
            compact: "Kompakt",
            hidden: "Ausgeblendet"
        },
        windowCurvature: "Fensterrundung",
        curvatures: {
            default: "Standard",
            cohesive: "Kohäsiv",
            square: "Eckig"
        },
        omniboxArch: "Omnibox-Architektur",
        omniboxStyles: {
            capsule: "Kapsel",
            wide: "Breit",
            minimal: "Minimal"
        },
        tabPresentation: "Tab-Darstellung",
        tabStyles: {
            pills: "Pillen",
            compact: "Kompakt",
            cards: "Karten"
        },
        windowControlsStyle: "Fenstersteuerungs-Stil",
        controlsStyles: {
            mac: "macOS",
            windows: "Windows",
            minimal: "Minimal"
        },
        windowControlsLayout: "Fenstersteuerungs-Anordnung",
        controlsOrders: {
            auto: "Smarte Ecke",
            "close-first": "Schließen zuerst",
            "minimize-first": "Minimieren zuerst"
        },
        themeLabel: "Design",
        themes: {
            dark: "Dunkel",
            light: "Hell"
        },
        uiScaleLabel: "UI-Skalierung",
        uiScales: {
            comfortable: "Normal",
            compact: "Kompakt"
        },
        accentSwatchLabel: "Akzentfarbpalette",
        openColorPickerTitle: "System-Farbwähler öffnen",
        saveChanges: "Änderungen speichern",
        applyLive: "Live anwenden",
        saveAsNew: "Als neu speichern",
        applyToBrowser: "Auf Browser anwenden",
        saveAsCustom: "Als eigenes Preset speichern",
        searchPresetsPlaceholder: "Presets durchsuchen...",
        filterAll: "Alle",
        filterBuiltin: "Integriert",
        filterCustom: "Eigene ({count})",
        saveActiveSetup: "Aktuelles Setup speichern",
        activeBadge: "Aktiv",
        editingBadge: "(In Bearbeitung)",
        reapply: "Erneut anwenden",
        apply: "Anwenden",
        editInStudio: "Im Studio bearbeiten",
        customize: "Anpassen",
        editPresetTitle: "Preset im Studio bearbeiten",
        customizePresetTitle: "Layout im Studio anpassen",
        duplicateTitle: "Preset duplizieren",
        deleteTitle: "Eigenes Preset löschen",
        editCustomModalTitle: "Eigenes Preset bearbeiten",
        saveCustomModalTitle: "Als eigenes Preset speichern",
        presetNameLabel: "Preset-Name",
        presetNamePlaceholder: "z. B. Ergonomischer Workflow, Minimal-Arc",
        presetDescLabel: "Untertitel / Beschreibung",
        presetDescPlaceholder: "Kurze Beschreibung dieser Konfiguration...",
        presetIconLabel: "Preset-Symbol",
        createPreset: "Preset erstellen",
        deleteConfirmTitle: "Eigenes Preset löschen?",
        deleteConfirmDescBefore: "Möchten Sie ",
        deleteConfirmDescAfter: " wirklich löschen? Dies kann nicht rückgängig gemacht werden.",
        deletePresetBtn: "Preset löschen",
        posTop: "Oben",
        posBottom: "Unten",
        posLeft: "Links",
        posRight: "Rechts",
        moveTo: "Nach {pos} verschieben",
        draggableNavTitle: "Verschiebbare Navigationsleiste: Nach oben/unten ziehen oder tauschen",
        draggableSidebarTitle: "Verschiebbare Seitenleiste: Zwischen linker und rechter Zone ziehen",
        swapTo: "Nach {pos} tauschen",
        miniTab: "Tab #{num}",
        miniCardView: "Kartenansicht #{num}",
        miniActiveSpaceTab: "Aktiver Bereichs-Tab",
        miniSidebarPos: "Seitenleiste ({pos})",
        layoutTagFormat: "{bar} · {sidebar}",
        layoutSummaryFormat: "{tag} · {toolhub}",
        topBarLabel: "Obere Leiste",
        bottomBarLabel: "Untere Leiste",
        leftSidebarLabel: "Linke Seitenleiste",
        rightSidebarLabel: "Rechte Seitenleiste",
        leftToolhubLabel: "Linker ToolHub",
        rightToolhubLabel: "Rechter ToolHub",
        tabsHighlight: "{style} Tabs",
        compactScaleLabel: "Kompakte Skalierung",
        comfortableScaleLabel: "Komfortable Skalierung",
        defaultCustomName: "Eigenes Preset",
        defaultCustomDesc: "Benutzerdefinierte Konfiguration",
        defaultNewNameFormat: "{bar} {side}",
        defaultNewNameArc: "Arc",
        defaultNewNameFlow: "Flow",
        defaultNewDescFormat: "Eigenes Layout: {bar}, {sidebar}, {tabs} Tabs",
        toasts: {
            applied: "Layout auf Browser angewendet!",
            reset: "Studio-Entwurf auf Browser-Setup zurückgesetzt",
            editingPreset: "Bearbeite „{name}“ im Studio",
            loadedPreset: "„{name}“ in Studio-Leinwand geladen",
            switchedNewDraft: "Zu neuem Entwurf gewechselt"
        }
    },
    setup: {
        strictOfflineTitle: "Keine Hintergrundanfragen (Striktes Offline)",
        strictOfflineDesc: "Deaktivieren Sie allen optionalen Hintergrund-Netzwerkverkehr (Update-Prüfungen, Filteraktualisierungen, Live-Vorschläge, entfernte Favicons und Cloud-Sync).",
        headerTitle: "QBrowse-Einrichtung",
        headerSubtitle: "Personalisierungs-Assistent",
        steps: {
            language: {
                label: "Sprache",
                desc: "UI-Sprache"
            },
            presets: {
                label: "Presets & Stil",
                desc: "Erlebnis & Stil"
            },
            import: {
                label: "Import",
                desc: "Lesezeichen & Passwörter"
            },
            privacy: {
                label: "Datenschutz",
                desc: "Schutz & Tor"
            },
            default: {
                label: "Standard",
                desc: "Systemintegration"
            },
            sync: {
                label: "Konto & Sync",
                desc: "Cloud oder Lokal"
            }
        },
        chooseSetupTitle: "Wählen Sie Ihr Setup",
        chooseSetupDesc: "Starten Sie mit einem passenden Layout. Sie können jedes Element jederzeit anpassen.",
        customLayoutCta: "Eigenes Layout? Preset Studio →",
        themeLabel: "Design",
        dark: "Dunkel",
        light: "Hell",
        accentLabel: "Akzent",
        step2Badge: "Schritt 2 von 5",
        step2Title: "Daten & Tresor importieren",
        step2Desc: "Importieren Sie Lesezeichen und Passwörter aus Bitwarden, Proton Pass, Chrome oder Firefox.",
        tabBookmarks: "Lesezeichen",
        tabVault: "Passwort-Tresor",
        bookmarksFound: "{count} Lesezeichen gefunden",
        notDetected: "Auf diesem Gerät nicht erkannt",
        imported: "Importiert",
        importing: "Importiere...",
        importBookmarks: "Lesezeichen importieren",
        scanningBrowsers: "Suche nach installierten Browsern...",
        htmlImported: "HTML-Datei importiert ({count} Einträge)",
        uploadHtml: "Lesezeichen-HTML-Datei hochladen (.html)",
        vaultComplete: "Tresor-Migration abgeschlossen",
        vaultImportedSummary: "{count} Einträge aus {source} erfolgreich in QVault importiert!",
        importAnother: "Weitere importieren",
        exportCsvJson: "Als .CSV oder .JSON exportieren",
        parsingVault: "Analysiere Tresor-Datei...",
        uploadVault: "Tresor-Export hochladen (.csv oder .json)",
        compatibleManagers: "Kompatibel mit Bitwarden, Proton Pass, Google Chrome, Edge, Brave und 1Password",
        step3Badge: "Schritt 3 von 5",
        step3Title: "Privatsphäre schützen",
        step3Desc: "QBrowse blockiert Tracker, entfernt Werbung und leitet Datenverkehr durch das Tor-Netzwerk.",
        privacyOptimizedBadge: "Preset: Datenschutz-Purist optimiert",
        adblockTitle: "Nativer Ghostery Tracker-Schutz",
        adblockDesc: "Blockiert Tracker, Telemetrie, Analysen und störende Werbung ohne Geschwindigkeitseinbußen.",
        torTitle: "Tor Onion-Routing-Bereich",
        torDesc: "Ermöglicht jederzeit .onion-Surfen und mehrstufig verschlüsselte Relay-Schaltungen.",
        ready: "Bereit",
        step4Badge: "Schritt 4 von 5",
        step4Title: "Als Standardbrowser festlegen",
        step4Desc: "Öffnen Sie Desktop-Links in isolierten Bereichen und trennen Sie Arbeit von Privatem automatisch.",
        isDefaultTitle: "QBrowse ist Ihr Standardbrowser!",
        makeDefaultTitle: "Machen Sie QBrowse zu Ihrem Haupt-Browser",
        isDefaultDesc: "Alle Desktop-Links und Webdateien werden automatisch in QBrowse geöffnet.",
        makeDefaultDesc: "Verarbeitet alle http://, https:// und HTML-Dateien mit tiefer Systemintegration.",
        osLabels: {
            darwin: "Systemeinstellungen",
            linux: "Standardanwendungen",
            win32: "Windows-Standard-Apps"
        },
        defaultHint: "{label} geöffnet — wählen Sie QBrowse im Systemfenster aus, um zu bestätigen.",
        openOsSettings: "{label} öffnen",
        defaultSet: "Standardbrowser festgelegt",
        openingSettings: "Öffne Einstellungen...",
        setAsDefault: "Als Standardbrowser festlegen",
        step5Badge: "Schritt 5 von 5 • Profil & Cloud Sync",
        step5Title: "Wählen Sie Ihre Nutzungsart",
        step5Desc: "Volle Souveränität: Surfen Sie komplett offline mit lokaler Hardware-Verschlüsselung oder erstellen Sie ein kostenloses Cloud Sync-Konto.",
        zeroTelemetry: "Keine Telemetrie",
        localProfile: "Lokales Profil",
        localProfileDesc: "100 % offline. Alle Passwörter, Chronik und Tabs bleiben lokal mit Hardware-Schlüsseln verschlüsselt. Kein Konto nötig.",
        e2eEncrypted: "E2E-verschlüsselt",
        cloudSync: "QBrowse Cloud Sync",
        cloudSyncDesc: "Synchronisieren Sie Passwort-Tresor, Bereiche, angeheftete Tabs und Lesezeichen nahtlos per Firebase.",
        localReadyTitle: "Lokales Profil ist startklar",
        localReadyDesc: "Alle Lesezeichen, Tresordaten und Bereiche bleiben ohne Telemetrie auf diesem Gerät. Cloud Sync kann später jederzeit aktiviert werden.",
        takeTour: "Interaktive Tour starten",
        startDirectly: "Direkt mit dem Surfen starten",
        activeSync: "Sync aktiv",
        cloudLinked: "Ende-zu-Ende-verschlüsselter Cloud-Speicher verknüpft",
        signOut: "Abmelden",
        activeSyncDesc: "Ihre Lesezeichen, Bereichs-Tabs und Ihr verschlüsselter Passwort-Tresor werden in Echtzeit synchronisiert.",
        signIn: "Anmelden",
        existingAccount: "(Vorhandenes Konto)",
        register: "Registrieren",
        newAccount: "(Neues Konto)",
        registerSubtitle: "Erstellen Sie ein neues QBrowse-Konto für geräteübergreifenden Sync.",
        signInSubtitle: "Melden Sie sich an, um Lesezeichen, Bereiche und Tresor zu synchronisieren.",
        switchToSignIn: "Zur Anmeldung wechseln",
        emailLabel: "E-Mail-Adresse",
        emailPlaceholder: "name@beispiel.de",
        createPassLabel: "Passwort erstellen (mind. 6 Zeichen)",
        accountPassLabel: "Konto-Passwort",
        min6Chars: "Mindestens 6 Zeichen",
        confirmPassLabel: "Passwort bestätigen",
        passwordsMatch: "Passwörter stimmen überein",
        passwordsMismatch: "Passwörter stimmen nicht überein",
        useAccountAsMaster: "Konto-Passwort als Master-Verschlüsselungsschlüssel nutzen",
        masterDerivedDesc: "Leitet AES-GCM-256-Bit-Clientschlüssel direkt aus Ihrem Login-Passwort ab.",
        masterSeparateDesc: "Verwendet eine separate eigene Verschlüsselungspassphrase.",
        customMasterLabel: "Eigene Master-Passphrase",
        customMasterPlaceholder: "Einzigartige Tresor-Passphrase eingeben...",
        creatingAccount: "Erstelle verschlüsseltes Konto...",
        signingInSyncing: "Anmelden & Synchronisieren...",
        createAccountBtn: "Konto erstellen & Cloud Sync aktivieren",
        signInBtn: "Anmelden & Cloud Sync aktivieren",
        alreadyRegistered: "Bereits bei QBrowse registriert?",
        signInHere: "Hier anmelden",
        newToSync: "Neu bei QBrowse Cloud Sync?",
        createFreeAccount: "Kostenloses Konto erstellen (Registrieren)",
        skipSyncLocal: "Cloud Sync überspringen und mit lokalem Profil fortfahren",
        skipSyncComplete: "Sync überspringen & abschließen",
        vaultModalTitle: "Importierten Tresor schützen",
        vaultModalDesc: "Geben Sie ein Master-Passwort ein oder erstellen Sie eines zur Verschlüsselung.",
        masterPassLabel: "Master-Passwort",
        masterPassPlaceholder: "Master-Passwort eingeben...",
        confirmMasterLabel: "Master-Passwort bestätigen",
        confirmMasterPlaceholder: "Passwort bestätigen...",
        cancel: "Abbrechen",
        encryptImport: "Verschlüsseln & Importieren",
        bookmarkFallback: "Lesezeichen",
        htmlFileFallback: "HTML-Datei",
        toasts: {
            enterEmail: "Bitte geben Sie eine E-Mail-Adresse ein.",
            validEmail: "Bitte geben Sie eine gültige E-Mail-Adresse ein (z. B. name@domain.de).",
            passMin6: "Das Passwort muss mindestens 6 Zeichen lang sein.",
            confirmPassReq: "Bitte bestätigen Sie Ihr Passwort.",
            passMismatch: "Die Passwörter stimmen nicht überein.",
            signedIn: "Bei QBrowse Cloud Sync angemeldet!",
            registered: "Konto registriert & Cloud Sync aktiv!",
            bookmarksImported: "{count} Lesezeichen erfolgreich importiert!",
            importFailed: "Import fehlgeschlagen.",
            couldNotImportBookmarks: "Lesezeichen konnten nicht importiert werden.",
            htmlImported: "{count} Lesezeichen aus {filename} importiert!",
            htmlImportFailed: "HTML-Lesezeichen-Import fehlgeschlagen.",
            noCredentials: "Keine Zugangsdaten in der Datei gefunden",
            passwordsImported: "{count} Passwörter aus {source} importiert!",
            vaultImportFailed: "Import fehlgeschlagen: {error}",
            passMin4: "Das Passwort muss mindestens 4 Zeichen lang sein",
            vaultPassMismatch: "Passwörter stimmen nicht überein",
            incorrectMasterPass: "Falsches Master-Passwort für vorhandenen Tresor",
            vaultImportError: "Importfehler: {error}",
            nowDefault: "QBrowse ist jetzt Ihr Standardbrowser!",
            openingWinDefault: "Windows-Standard-Apps werden geöffnet. Wählen Sie QBrowse aus.",
            openingOsDefault: "Öffne {label}. Wählen Sie QBrowse als Standardbrowser.",
            couldNotOpenDefault: "Einstellungen für Standardbrowser konnten nicht geöffnet werden."
        }
    },
    flags: {
        title: "Experimente",
        subtitle: "Experimentelle Browser-Funktionen, GPU-Pipelines, Post-Quanten-Kryptografie und Tor-Stream-Isolation feinabstimmen.",
        resetAll: "Alle zurücksetzen",
        warningTitle: "Warnung: Experimentelle Funktionen!",
        warningBody: "Diese Schalter ändern Chromium-V8-Ausführung, Hardware-Compositing oder TLS-Parameter. Ein Neustart ist erforderlich.",
        searchPlaceholder: "Flags suchen (z. B. GPU, Kyber, QUIC, DoH, bfcache)...",
        tabAvailable: "Verfügbar ({count})",
        tabUnavailable: "Nicht verfügbar ({count})",
        categories: {
            All: "Alle",
            Performance: "Leistung",
            "Hardware & Graphics": "Hardware & Grafik",
            "Web Standards & Engine": "Webstandards & Engine",
            Security: "Sicherheit",
            Networking: "Netzwerk",
            "Media & UI": "Medien & UI",
            "AI & Tools": "KI & Tools",
            Experimental: "Experimentell"
        },
        statuses: {
            Stable: "Stabil",
            Beta: "Beta",
            Experimental: "Experimentell"
        },
        options: {
            default: "Standard",
            enabled: "Aktiviert",
            disabled: "Deaktiviert"
        },
        emptyMatch: "Keine verfügbaren Flags für „{search}“",
        reasonPrefix: "Grund: {reason}",
        unavailableBadge: "Nicht verfügbar",
        relaunchMsg: "Ihre Änderungen werden beim nächsten Neustart von QBrowse wirksam.",
        relaunchBtn: "Neu starten",
        toasts: {
            reset: "Alle experimentellen Flags auf Standard zurückgesetzt",
            relaunching: "QBrowse wird mit aktualisierten Flags neu gestartet..."
        },
        items: {
            "prefer-high-performance-gpu": {
                name: "Hochleistungs-GPU bevorzugen",
                description: "Leitet WebGL, Canvas und 3D-Rendering bei Systemen mit mehreren GPUs auf die dedizierte Grafikkarte. Im Eco-Modus deaktiviert."
            },
            "unlock-frame-rate": {
                name: "Freigeschaltete Bildrate (Benchmark-Modus)",
                description: "Deaktiviert V-Sync für synthetische Canvas/WebGL-FPS-Benchmarks. Kann Tearing und höheren Stromverbrauch verursachen."
            },
            "ignore-gpu-blocklist": {
                name: "GPU-Blockliste ignorieren",
                description: "Umgeht Chromium-Software-Rendering-Listen und aktiviert Hardwarebeschleunigung auf älteren Treibern."
            },
            "experimental-web-platform": {
                name: "Experimentelle Web-Plattform-Funktionen",
                description: "Aktiviert experimentelle Chromium-Web-APIs in Entwicklung. Einige moderne APIs können instabil sein."
            },
            "gpu-rasterization": {
                name: "GPU-Rasterung & Compositor-Beschleunigung",
                description: "Beschleunigt Seitenrasterung und Compositing über dedizierte GPU-Pipelines statt CPU-Software-Rendering."
            },
            "smooth-scrolling": {
                name: "Sanfte Scroll-Engine",
                description: "Aktiviert flüssige physikalische Bezier-Animationen beim Scrollen per Mausrad, Touchpad oder Pfeiltasten."
            },
            "zero-copy-rasterizer": {
                name: "Zero-Copy-GPU-Rasterisierer (GpuMemoryBuffer)",
                description: "Raster-Worker schreiben direkt in geteilte GPU-Texturen ohne CPU-Speicherkopien."
            },
            "enable-vulkan": {
                name: "Vulkan-Grafik- & Compositing-Backend",
                description: "Nutzt die plattformübergreifende Vulkan-API für GPU-Compositing und Rendering auf unterstützten GPUs."
            },
            "back-forward-cache": {
                name: "Zurück-Vorwärts-Cache (bfcache)",
                description: "Speichert vollständige Snapshots kürzlich besuchter Seiten im RAM für sofortiges Vor- und Zurücknavigieren."
            },
            "canvas-oop-rasterization": {
                name: "Out-of-Process 2D-Canvas-Rasterung",
                description: "Führt HTML5-2D-Canvas-Operationen im dedizierten GPU-Prozess statt im Renderer-Prozess aus."
            },
            "enable-drdc": {
                name: "Dynamische hohe Bildwiederholrate (120/144/240 Hz)",
                description: "Synchronisiert Frame-Pacing und V-Sync dynamisch mit ProMotion- und Gaming-Displays."
            },
            "auto-suspend-tabs": {
                name: "Auto-Ruhemodus für Tabs (V8-Speicherschoner)",
                description: "Entlädt inaktive Hintergrund-Tabs automatisch nach 15 Minuten, um RAM und Akku zu schonen."
            },
            "parallel-download-engine": {
                name: "Parallele Multi-Thread-Downloads",
                description: "Teilt große Downloads in mehrere parallele HTTP-Bereichsanfragen für maximale Bandbreitennutzung."
            },
            "lazy-image-loading": {
                name: "Verzögertes Laden von Bildern & Frames",
                description: "Lädt Bilder und Iframes außerhalb des Sichtbereichs erst beim Heranscrollen."
            },
            "enable-tls13-kyber": {
                name: "Post-Quanten-Kryptografie für TLS (Kyber768 / ML-KEM)",
                description: "Aktiviert quantensicheren hybriden Schlüsselaustausch (X25519Kyber768) in TLS-1.3-Handshakes."
            },
            "enable-encrypted-client-hello": {
                name: "Encrypted Client Hello (ECH / Verschlüsseltes SNI)",
                description: "Verschlüsselt den Servernamen (SNI) im TLS-Handshake vor ISPs und Firewalls."
            },
            "strict-origin-isolation": {
                name: "Strikte Site-per-Process-Sandbox",
                description: "Erzwingt eigene OS-Prozesse mit isoliertem Speicher pro Herkunft gegen Spectre/Meltdown."
            },
            "webrtc-ip-protection": {
                name: "WebRTC-Schutz vor lokalen IP- & STUN-Lecks",
                description: "Schränkt WebRTC-ICE-Kandidaten ein, um lokale LAN- oder öffentliche IPs vor Skripten zu verbergen."
            },
            "enable-dns-over-https": {
                name: "Striktes DNS-over-HTTPS (Cloudflare/Quad9)",
                description: "Verschlüsselt alle DNS-Abfragen über HTTPS (Port 443) gegen Abhören und Manipulation."
            },
            "disable-hyperlink-auditing": {
                name: "Hyperlink-Auditing (<a ping>) deaktivieren",
                description: "Blockiert das stille Senden von Tracking-POST-Anfragen beim Klicken auf Links."
            },
            "enable-fingerprint-randomization": {
                name: "Canvas- & WebAudio-Fingerprinting-Rauschen",
                description: "Fügt Pixel- und Audio-Auslesungen kryptografisches Rauschen hinzu, um Geräte-Fingerprinting zu verhindern."
            },
            "enable-font-enumeration-shield": {
                name: "Schutz vor lokaler Schrifterkennung",
                description: "Hindert Web-Apps daran, installierte Systemschriften für Tracking-Hashes auszulesen."
            },
            "aggressive-tracker-blocker": {
                name: "Aggressives Entfernen von URL-Tracking-Parametern",
                description: "Entfernt utm_source, gclid, fbclid und blockiert bekannte Tracking-Pixel."
            },
            "enable-subresource-filter": {
                name: "Unterressourcen-Filter für täuschende Overlays",
                description: "Erkennt und blockiert Clickjacking, unsichtbare Overlay-Links und irreführende Downloads."
            },
            "enable-quic": {
                name: "Experimentelles QUIC- & HTTP/3-Protokoll",
                description: "Aktiviert UDP-basiertes HTTP/3 für Zero-RTT-Handshakes und gemultiplexte Streams."
            },
            "tor-stream-isolation": {
                name: "Tor-Schaltungsisolation pro Domain (IsolateDestAddr)",
                description: "Erzwingt für jede Domain im Tor-Bereich eine eigene Ausgangsschaltung gegen Korrelation."
            },
            "dns-prefetching": {
                name: "Vorausschauende DNS-Vorauflösung",
                description: "Löst IP-Adressen sichtbarer Links vorab auf, um Ladeverzögerungen zu minimieren."
            },
            "heavy-ad-intervention": {
                name: "Intervention bei ressourcenintensiver Werbung",
                description: "Entlädt Werbe-Iframes, die mehr als 4 MB Netzwerkdaten oder 60s CPU-Zeit verbrauchen."
            },
            "cross-origin-isolation": {
                name: "Cross-Origin-Richtlinie (COOP) & SharedArrayBuffer",
                description: "Ermöglicht präzise WebAssembly-Shared-Memory-Operationen durch strenge Cross-Origin-Isolation."
            },
            "document-pip-api": {
                name: "Document Picture-in-Picture API",
                description: "Aktiviert schwebende Bild-in-Bild-Fenster mit beliebigen HTML-Inhalten, Videos und Widgets."
            },
            "force-dark-contents": {
                name: "Automatischer Dunkelmodus für Webinhalte",
                description: "Erzeugt automatisch ein dunkles Design für helle Websites mit Helligkeits-Umkehrung."
            },
            "overlay-scrollbars": {
                name: "Minimalistische schwebende Scrollbalken",
                description: "Ersetzt klobige System-Scrollbalken durch dezente Indikatoren, die automatisch ausblenden."
            },
            "enable-webgpu": {
                name: "WebGPU-Grafik- & Compute-API der nächsten Generation",
                description: "Bietet direkten GPU-Zugriff für neuronale Netze im Browser, 3D-Simulationen und Shader."
            },
            "tab-audio-muting": {
                name: "Ein-Klick-Stummschaltung am Tab",
                description: "Fügt aktiven Tabs ein interaktives Lautsprechersymbol zum sofortigen Stummschalten hinzu."
            },
            "webrtc-pipewire": {
                name: "PipeWire-Desktop-Aufnahme (Linux Wayland)",
                description: "Aktiviert Bildschirmfreigabe über das PipeWire-Portal unter GNOME und KDE Plasma."
            },
            "hdr-compositing": {
                name: "HDR-Farbcompositing (High Dynamic Range)",
                description: "Aktiviert 10-Bit-Farbraum (Rec.2020 / DCI-P3) und HDR-Tone-Mapping auf kompatiblen Displays."
            },
            "local-ai-assistant": {
                name: "Lokale GGUF-LLM-VRAM-Beschleunigung (llama.cpp)",
                description: "Lagert Gemma- und Llama-3-Gewichte direkt in GPU-VRAM für schnelle private Abfragen aus."
            },
            "experimental-split-screen-gestures": {
                name: "Kinetische Split-Screen-Gesten",
                description: "Ermöglicht das Ziehen von Tabs an Fensterränder für sofortiges Dual-Pane-Browsing."
            },
            "enable-reader-mode": {
                name: "Ablenkungsfreier Artikel-Lesemodus",
                description: "Extrahiert Artikeltext in ein klares Leselayout ohne Seitenleisten oder Werbung."
            },
            "auto-password-generation": {
                name: "Kryptografische Erstellung starker Passwörter",
                description: "Erkennt Registrierungsformulare und schlägt sichere 128-Bit-Passwörter über QVault vor."
            },
            "tab-groups-auto-clustering": {
                name: "Intelligentes Tab-Clustering nach Domain",
                description: "Schlägt Gruppierungen offener Tabs anhand gemeinsamer Domains und Arbeitsbereiche vor."
            },
            "touch-ui-layout": {
                name: "Touchscreen-Tablet-UI-Modus",
                description: "Vergrößert Tableisten für Touch-Geräte. Auf Desktop-Profilen mit Maus/Tastatur deaktiviert.",
                reason: "Erfordert Hardware-Erkennung eines Touch-Digitizers."
            },
            "eye-tracking-gaze-scroll": {
                name: "Eye-Tracking-Blicknavigation",
                description: "Steuert das Scrollen anhand der Blickrichtung. Erfordert spezielle Infrarot-Sensoren.",
                reason: "Kein unterstützter Eye-Tracking-Sensor erkannt."
            },
            "cellular-data-saver": {
                name: "Mobiler Datensparmodus",
                description: "Komprimiert Bilder über Proxy-Gateways. Aus Datenschutzgründen deaktiviert.",
                reason: "Standardmäßig deaktiviert zum Schutz der Tor- und HTTPS-E2E-Privatsphäre."
            }
        }
    }
};

const es = {
    common: {
        incognito: "Incógnito",
        selectOption: "Seleccionar opción...",
        colors: {
            accent: "Acento",
            yellow: "Amarillo",
            green: "Verde",
            blue: "Azul",
            pink: "Rosa"
        }
    },
    wallpaperPreview: {
        alt: "Vista previa del fondo",
        badge: "Vista previa"
    },
    presets: {
        names: {
            balanced: "Equilibrado",
            developer: "Desarrollador",
            classic_reverse: "Arc Moderno",
            bottom_bar: "Flujo Ergonómico",
            minimalist: "Enfoque Mínimo",
            privacy: "Centinela Privado"
        },
        taglines: {
            balanced: "Espacios Personal y Trabajo con búsqueda en Google.",
            developer: "Espacios aislados con integración GitHub Live PR.",
            classic_reverse: "Árbol de pestañas a la derecha y lectura limpia.",
            bottom_bar: "Barra de direcciones inferior para navegación cómoda.",
            minimalist: "Un solo espacio con interfaz compacta sin distracciones.",
            privacy: "Protección estricta contra rastreo con DuckDuckGo."
        },
        descriptions: {
            balanced: "Espacios duales (Personal y Trabajo), privacidad estándar y Google.",
            developer: "Aislamiento multiespacio con seguimiento de PR en GitHub.",
            classic_reverse: "Árbol de navegación a la derecha, panel invertido y flujo enfocado.",
            bottom_bar: "Barra inferior ergonómica pensada para navegación ágil.",
            minimalist: "Espacio único, barra derecha e interfaz compacta sin ruido.",
            privacy: "Bloqueo estricto de rastreadores, DuckDuckGo y red Tor inmediata."
        },
        customTaglineFallback: "Configuración personalizada de espacio y diseño.",
        accents: {
            amberGold: "Oro Ámbar",
            ocean: "Océano",
            skyBlue: "Azul Cielo",
            cyberEmerald: "Esmeralda Cyber",
            electricBlue: "Azul Eléctrico",
            royalViolet: "Violeta Real",
            roseGold: "Oro Rosa",
            sunsetOrange: "Naranja Ocaso",
            cyberCyan: "Cian Cyber",
            slateGray: "Gris Pizarra"
        }
    },
    addPin: {
        title: "Fijar app en la barra lateral",
        subtitle: "Añade un acceso rápido a una aplicación o sitio web",
        defaultAppName: "Nombre de la app",
        appNameLabel: "Nombre / Título",
        appNamePlaceholder: "ej. GitHub, Gemini...",
        urlLabel: "URL / Dominio *",
        urlPlaceholder: "ej. github.com o https://gemini.google.com",
        quickPresets: "Atajos rápidos",
        cancel: "Cancelar",
        pinApp: "Fijar app"
    },
    passkey: {
        biometrics: {
            darwin: "Touch ID",
            linux: "Biometría del sistema",
            win32: "Windows Hello"
        },
        hints: {
            darwin: "Toca el sensor Touch ID o introduce tu contraseña de macOS",
            linux: "Toca el sensor de huellas o introduce tu contraseña del sistema",
            win32: "Toca el sensor de huellas o introduce tu PIN de Windows"
        },
        cancelDenyTitle: "Cancelar y denegar",
        verifiedTitle: "¡Identidad verificada!",
        scanningTitle: "Escaneando {biometric}...",
        autofillTitle: "Autocompletar contraseña guardada",
        passkeyTitle: "Autenticación con Passkey",
        verifiedAutofillDesc: "Bóveda desbloqueada y credenciales completadas",
        verifiedPasskeyDesc: "Passkey liberada y firmada correctamente",
        requireAutofillDesc: "Verificación necesaria para desbloquear y autocompletar",
        requirePasskeyDesc: "Verificación necesaria para iniciar sesión con passkey",
        passwordBadge: "Contraseña",
        passkeyBadge: "Passkey",
        accountLabel: "Cuenta:",
        savedLogin: "Acceso guardado",
        passkeyUser: "Usuario de Passkey",
        verifyingWith: "Verificando con {biometric}...",
        verifiedBtn: "¡Verificado!",
        verifyWith: "Verificar con {biometric}",
        orPassPin: "O con contraseña maestra / PIN",
        orPass: "O con contraseña maestra",
        placeholderPin: "Contraseña maestra o PIN rápido de 4–8 dígitos",
        placeholderPass: "Introduce la contraseña maestra de QVault",
        checking: "Comprobando credenciales...",
        verifyAuth: "Verificar y autenticar",
        cancelDenyBtn: "Cancelar y denegar solicitud",
        websiteFallback: "Sitio web",
        theWebsiteFallback: "el sitio web",
        toastAutofill: "¡Bóveda desbloqueada y credenciales completadas para {domain}!",
        toastPasskey: "¡Passkey verificada para {domain}!",
        promptAutofill: "Verifica tu identidad para completar credenciales en {domain}",
        promptPasskey: "Inicia sesión en {domain} con tu passkey de QVault",
        biometricError: "Error biométrico: {error}",
        vaultLockedOut: "Bóveda bloqueada tras intentos fallidos. Reintenta en {seconds}s.",
        incorrectCreds: "Contraseña maestra o PIN rápido incorrectos. Inténtalo de nuevo.",
        verificationFailed: "Error de verificación: {error}",
        passkeyCreateTitle: "Crear clave de acceso de QVault",
        verifiedPasskeyCreateDesc: "Identidad verificada — guardando clave en QVault",
        requirePasskeyCreateDesc: "Se requiere verificación para crear y guardar esta clave de acceso",
        useHardwareKeyBtn: "Usar llave de hardware / sistema",
        useHardwareKeyHint: {
            darwin: "YubiKey · FIDO2 · Touch ID · QR del teléfono",
            linux: "YubiKey · FIDO2 · USB / NFC / BLE · QR del teléfono",
            win32: "YubiKey · FIDO2 · Windows Hello · QR del teléfono"
        },
        toastHardwareHandoff: "Cambiando a llave de seguridad de hardware / sistema para {domain}...",
        toastPasskeyCreated: "¡Clave de acceso verificada y guardada para {domain}!",
        promptPasskeyCreate: "Crear y guardar una clave de acceso de QVault para {domain}"
    },
    history: {
        title: "Archivo",
        entrySingular: "{count} entrada guardada",
        entryPlural: "{count} entradas guardadas",
        searchPlaceholder: "Buscar en el archivo...",
        clearAllTitle: "Borrar todo el historial de navegación",
        clear: "Borrar",
        closeTitle: "Cerrar (Esc)",
        segments: {
            all: "Todo",
            today: "Hoy",
            yesterday: "Ayer",
            week: "Últimos 7 días",
            older: "Más antiguo"
        },
        emptySearch: "Sin resultados para \"{query}\"",
        emptyTitle: "El archivo está vacío",
        emptySearchDesc: "Revisa la ortografía o selecciona otro filtro.",
        emptyDesc: "Las páginas que visites se guardarán aquí para acceso rápido.",
        itemSingular: "{count} elemento",
        itemPlural: "{count} elementos",
        copyLinkTitle: "Copiar enlace",
        openNewTabTitle: "Abrir en pestaña nueva",
        removeTitle: "Eliminar del archivo",
        toastCleared: "Archivo borrado",
        toastCopied: "Enlace copiado",
        toastOpenedBg: "Abierto en pestaña en segundo plano",
        loadMore: "Cargar más",
    },
    cookies: {
        title: "Explorador de cookies y almacenamiento",
        subtitle: "Inspecciona, busca y elimina cookies y datos locales de sitios",
        filterDomain: "Filtrar dominio",
        refreshTitle: "Actualizar lista",
        allSites: "Todos los sitios",
        clearDomain: "Borrar {domain}",
        clearAllData: "Borrar todos los datos",
        searchPlaceholder: "Buscar cookies por nombre, dominio o valor...",
        emptyTitle: "No se encontraron cookies",
        emptyDesc: "Limpia la búsqueda o elige otro dominio",
        secure: "Segura",
        httpOnly: "HttpOnly",
        path: "Ruta: {path}",
        expires: "Expira: {date}",
        deleteTitle: "Eliminar cookie",
        toastDeleted: "Cookie eliminada: {name}",
        toastClearedSite: "{count} cookies eliminadas para {domain}",
        toastClearedAll: "Datos de navegación y cookies borrados"
    },
    resources: {
        title: "Administrador de tareas",
        cpu: "CPU",
        ram: "RAM",
        asleepCount: "{count} suspendidas",
        sleepInactive: "Suspender inactivas",
        sleepInactiveTitle: "Suspender pestañas inactivas en segundo plano para liberar RAM",
        wakeAll: "Activar todas",
        wakeAllTitle: "Reactivar todas las pestañas suspendidas",
        purgeCacheTitle: "Limpiar caché de memoria del navegador",
        autoRefreshActiveTitle: "Actualización automática activa (cada 2s)",
        autoRefreshPausedTitle: "Actualización automática en pausa",
        autoRefresh2s: "2s",
        paused: "En pausa",
        refreshTitle: "Actualizar métricas de procesos",
        closeTitle: "Cerrar (ESC)",
        filters: {
            all: "Todo",
            tabs: "Pestañas",
            processes: "Procesos",
            sleeping: "Suspendidas"
        },
        searchPlaceholder: "Filtrar por nombre, PID...",
        colTask: "Tarea / Proceso",
        colSpace: "Espacio / Tipo",
        colStatus: "Estado",
        colCpu: "CPU",
        colMemory: "Memoria",
        colAction: "Acción",
        emptyMatch: "No hay tareas que coincidan con \"{query}\"",
        blankTab: "Pestaña vacía",
        newTabDash: "Panel Nueva Pestaña Zen",
        pidSubtitle: "PID {pid} · {type}",
        active: "Activa",
        spaceTab: "Pestaña {space}",
        mainCore: "Núcleo principal",
        sleep: "Suspendida",
        live: "Activa",
        memSaved: "(Ahorrado)",
        wakeTabTitle: "Reactivar pestaña",
        activeTabCannotSleep: "La pestaña activa no se puede suspender",
        sleepTabTitle: "Suspender pestaña",
        switchTabTitle: "Ir a la pestaña",
        closeTabTitle: "Cerrar pestaña",
        core: "Núcleo",
        endProcessTitle: "Finalizar proceso PID {pid}",
        itemsOf: "{shown} de {total} elementos",
        pressEscPrefix: "Pulsa",
        pressEscSuffix: "para cerrar",
        procMain: "Proceso principal de QBrowse",
        procGpu: "Proceso GPU",
        procRenderer: "Renderizador Webview",
        procUtility: "Servicio auxiliar (Audio/Almacenamiento)",
        procZygote: "Precargador Sandbox",
        procPepper: "Host de complementos",
        procChild: "Proceso {type}",
        procChildDefault: "Secundario",
        toastHibernatedSingular: "{count} pestaña inactiva suspendida (~{mb} MB de RAM liberados)",
        toastHibernatedPlural: "{count} pestañas inactivas suspendidas (~{mb} MB de RAM liberados)",
        toastWokeSingular: "{count} pestaña suspendida restaurada",
        toastWokePlural: "{count} pestañas suspendidas restauradas",
        toastCachePurged: "Caché del navegador purgada y memoria liberada",
        toastKillUnavailable: "No se puede finalizar el proceso: API no disponible",
        toastKilled: "Proceso {pid} finalizado",
        toastKillFailed: "No se pudo finalizar el proceso {pid}",
        toastKillError: "Error al finalizar el proceso {pid}"
    },
    docViewer: {
        fallbackName: "Documento local",
        fallbackFile: "Archivo",
        preview: "Vista previa",
        raw: "Sin formato",
        zoomOut: "Alejar",
        zoomIn: "Acercar",
        resetZoom: "Restablecer zoom",
        copyTitle: "Copiar contenido del archivo",
        copied: "Copiado",
        copy: "Copiar",
        revealTitle: "Mostrar en carpeta del sistema",
        loading: "Cargando documento...",
        errorTitle: "No se puede mostrar el archivo",
        readError: "Error al leer el archivo",
        toastCopied: "Contenido copiado al portapapeles",
        toastRevealed: "Archivo mostrado en la carpeta del sistema"
    },
    pdfViewer: {
        toggleThumbnails: "Mostrar/ocultar miniaturas",
        fallbackName: "Documento PDF",
        pageSingular: "{count} página",
        pagePlural: "{count} páginas",
        prevPage: "Página anterior",
        nextPage: "Página siguiente",
        zoomOut: "Alejar",
        zoomIn: "Acercar",
        fitWidth: "Ajustar al ancho",
        rotate: "Rotar 90° a la derecha",
        normalMode: "Modo normal",
        darkInvertMode: "Modo oscuro invertido",
        summarize: "Resumir",
        revealTitle: "Abrir en explorador de archivos",
        pagesHeader: "Páginas",
        pageNum: "Página {num}",
        loading: "Renderizando PDF con PDF.js...",
        errorTitle: "Error al abrir el documento",
        openError: "No se pudo abrir el documento PDF",
        extractingToast: "Extrayendo texto del documento para Qu-AI...",
        openedAiToast: "¡Abierto en el panel Qu-AI con el texto del documento!",
        extractErrorToast: "Error al extraer texto: {error}",
        revealedToast: "Archivo mostrado en la carpeta del sistema",
        fallbackDocName: "documento",
        pageMarker: "--- Página {num} ---",
        summaryPrompt: "Proporciona un resumen conciso y los puntos clave de este documento PDF ({fileName}):"
    },
    localDir: {
        parentFolderTitle: "Ir a carpeta superior",
        reloadTitle: "Recargar carpeta",
        openInFileManager: "Abrir en gestor de archivos",
        filterPlaceholder: "Filtrar archivos en este directorio...",
        sortName: "Nombre",
        sortSize: "Tamaño",
        sortDate: "Fecha",
        gridViewTitle: "Vista de cuadrícula",
        listViewTitle: "Vista de lista",
        scanning: "Escaneando contenido del directorio...",
        errorTitle: "No se pudo abrir la carpeta",
        goParent: "Ir al directorio superior",
        emptySearch: "Ningún archivo coincide con la búsqueda",
        emptySearchHint: "Prueba a borrar el filtro de búsqueda",
        folderType: "Carpeta",
        revealTitle: "Mostrar en gestor de archivos",
        colName: "Nombre",
        colModified: "Modificado",
        colSize: "Tamaño",
        itemSingular: "{count} elemento",
        itemPlural: "{count} elementos",
        filtered: "(filtrado)",
        suiteName: "Suite de Archivos QBrowse",
        apiUnavailable: "API de directorios de Electron no disponible",
        openFailed: "Error al abrir el directorio",
        toastOpened: "Abierto en el gestor de archivos del sistema",
        toastRevealed: "Mostrado: {name}"
    },
    tour: {
        welcomeTitle: "Bienvenido a QBrowse",
        welcomeSubtitle: "Elige cómo te gustaría explorar el recorrido del navegador:",
        overviewBadge: "Resumen",
        quickTitle: "Vista rápida",
        quickDesc: "Recorrido visual ágil por el diseño, los espacios de trabajo y la navegación.",
        startQuick: "Iniciar recorrido rápido",
        interactiveBadge: "Interactivo",
        interactiveTitle: "Clase magistral interactiva",
        interactiveDesc: "Misiones guiadas con la interfaz real: haz clic en botones, prueba Tor y domina atajos.",
        startInteractive: "Iniciar recorrido interactivo",
        skipWelcome: "Omitir recorrido y empezar a navegar (Esc)",
        stepCounter: "Paso {current} de {total}",
        closeTitle: "Cerrar recorrido (Esc)",
        skipTour: "Omitir",
        back: "Atrás",
        finishTour: "Finalizar",
        nextStep: "Siguiente paso",
        exitToast: "Recorrido cerrado. ¡Pulsa Ctrl+K cuando quieras para explorar QBrowse!",
        topBarShortcut: "Barra superior",
        steps: {
            spaces: {
                title: "Aislamiento multiespacio",
                badge: "Espacios",
                description: "Mantén tus flujos separados. Cada espacio (Personal, Trabajo, Ghost, Tor) aísla sesiones, cookies y pestañas.",
                missionInstruction: "Haz clic en «Trabajo» en la barra lateral o pulsa Ctrl+2",
                missionSuccess: "¡Espacio cambiado! Tus pestañas, sesiones y cookies ahora están totalmente aisladas."
            },
            splitview: {
                title: "Vista dividida nativa",
                badge: "Multitarea",
                description: "Navega por dos sitios a la vez lado a lado sin abrir otra ventana. Ideal para investigar, programar o comparar.",
                missionInstruction: "Haz clic en el icono Vista dividida arriba o pulsa Ctrl+\\",
                missionSuccess: "¡Vista dividida activada! Mira el segundo panel que acaba de aparecer a la derecha."
            },
            tor: {
                title: "Red Tor Onion integrada",
                badge: "Privacidad y Onion",
                description: "Navega con cifrado multisalto integrado. QBrowse enruta tu tráfico mediante nodos Tor cifrados hacia dominios .onion.",
                missionInstruction: "Haz clic en el icono de Tor en la barra superior para ver tu circuito activo",
                missionSuccess: "¡Circuito Tor abierto! Puedes ver los nodos de retransmisión y alternar el enrutamiento."
            },
            vault: {
                title: "QVault Cero-Conocimiento",
                badge: "Seguridad física",
                description: "Tus contraseñas, passkeys y tarjetas se cifran localmente con claves de hardware y biometría {biometric}. Ningún texto plano sale de tu PC.",
                missionInstruction: "Haz clic en el icono de QVault en la barra superior para abrir tu bóveda",
                missionSuccess: "¡QVault abierto! Todas tus credenciales están cifradas localmente con biometría."
            },
            shield: {
                title: "Bloqueador nativo de anuncios y rastreo",
                badge: "Protección",
                description: "El bloqueo acelerado por hardware detiene telemetría, criptomineros, huellas digitales y anuncios antes de llegar a tu equipo.",
                missionInstruction: "Haz clic en el icono del Escudo arriba para inspeccionar los rastreadores bloqueados",
                missionSuccess: "¡Inspector QShield abierto! Ve dominios bloqueados en vivo y ajusta la protección."
            },
            darkmode: {
                title: "Modo oscuro inteligente y temas",
                badge: "Apariencia",
                description: "Personaliza tu estilo visual entre temas oscuros elegantes, modo claro o inversión inteligente para webs claras.",
                missionInstruction: "Haz clic en el icono de Tema arriba para ver las opciones de apariencia",
                missionSuccess: "¡Panel de temas abierto! Alterna entre oscuro, claro e inversión inteligente."
            },
            toolhub: {
                title: "ToolHub y notas persistentes",
                badge: "Herramientas",
                description: "Resalta cualquier texto en una web para fijar notas persistentes, usa el asistente de IA privado y revisa tu portapapeles.",
                missionInstruction: "Haz clic en el tirador derecho de ToolHub o pulsa Ctrl+J para abrir el cajón",
                missionSuccess: "¡ToolHub abierto! Añade notas a cualquier sitio o conversa con tu IA local."
            },
            omnibox: {
                title: "Omnibox inteligente y paleta de comandos",
                badge: "Comando universal",
                description: "Lanzador universal: atajos (!yt, @github), comandos rápidos (>pdf, >clear), calculadora e interacción directa con la IA local.",
                missionInstruction: "Pulsa Ctrl+K o haz clic en la barra central para dar órdenes a QBrowse",
                missionSuccess: "¡Omnibox activada! Escribe !yt para YouTube, @github para repos o > para comandos."
            }
        }
    },
    reader: {
        themes: {
            dark: "Oscuro",
            sepia: "Sepia",
            light: "Claro",
            midnight: "Medianoche"
        },
        fonts: {
            serif: "Serif",
            sans: "Sans",
            mono: "Mono",
            dyslexic: "Dislexia"
        },
        widths: {
            compact: "Compacto",
            balanced: "Equilibrado",
            wide: "Ancho"
        },
        exitTitle: "Salir del modo lectura (Esc / Ctrl+Alt+R)",
        backToWebpage: "Volver a la página",
        openOriginalTitle: "Abrir original: {url}",
        hideAudioTitle: "Ocultar reproductor",
        listenTitle: "Escuchar artículo (Lectura en voz alta)",
        listening: "Escuchando",
        readAloud: "Leer en voz alta",
        themeTitle: "Tema {name}",
        fontTitle: "Usar fuente {name}",
        decreaseSizeTitle: "Reducir tamaño del texto",
        increaseSizeTitle: "Aumentar tamaño del texto",
        widthTitle: "Ancho de columna: {name}",
        closeTitle: "Cerrar modo lectura",
        byAuthor: "Por {author}",
        minRead: "{minutes} min de lectura",
        wordsCount: "{count} palabras",
        prevParaTitle: "Párrafo anterior",
        pauseTitle: "Pausar",
        playTitle: "Reproducir",
        nextParaTitle: "Párrafo siguiente",
        audioNarration: "Narración de audio",
        blockProgress: "Bloque {current} de {total}",
        speedTitle: "Cambiar velocidad de narración",
        selectVoiceTitle: "Seleccionar voz",
        voiceFallback: "Voz",
        systemVoices: "Voces del sistema",
        stopCloseTitle: "Detener y cerrar narración",
        highlightWithTitle: "Resaltar con {color}",
        noteBtn: "Nota",
        copyTextTitle: "Copiar texto",
        stickyNote: "Nota adhesiva",
        notePlaceholder: "Escribe tu nota o idea...",
        deleteBtn: "Eliminar",
        saveBtn: "Guardar"
    },
    toolhub: {
        title: "Tool Hub",
        snip: "Recorte",
        snipTitle: "Recorte interactivo de pantalla (Selección)",
        captureViewportTitle: "Capturar área visible",
        captureFullTitle: "Capturar página completa",
        tabs: {
            notes: "Notas",
            clipboard: "Portapapeles",
            ai: "IA Local",
            downloads: "Descargas"
        },
        webNotesTab: "Notas Web ({count})",
        scratchpadTab: "Bloc de notas",
        globalScope: "Global",
        spaceScope: "Espacio {space}",
        scratchpadTitle: "Bloc: {name}",
        scratchpadGlobalPlaceholder: "Anota ideas globales, enlaces... compatible con Markdown.",
        scratchpadSpacePlaceholder: "Bloc para el espacio {space}... compatible con Markdown.",
        searchNotesPlaceholder: "Buscar resaltados, notas, dominios...",
        clearSearchTitle: "Limpiar búsqueda",
        allSpaces: "Todos",
        exportMd: "Exportar MD",
        exportMdTitle: "Exportar notas como Markdown (.md)",
        noWebNotesTitle: "Sin notas web guardadas",
        noWebNotesDesc: "Resalta texto en cualquier página o pulsa \"Nota\" para guardar anotaciones persistentes entre visitas.",
        otherDomain: "Otro",
        colorTitle: "Color: {color}",
        jumpHighlightTitle: "Clic para ir a este resaltado en la página",
        editNotePlaceholder: "Añade una nota o comentario...",
        deleteNote: "Eliminar nota",
        deleteNoteTitle: "Eliminar texto de la nota",
        cancel: "Cancelar",
        saveNote: "Guardar nota",
        clickToEditNote: "Clic para editar la nota",
        addNoteTitle: "Añadir nota",
        noteBtn: "Nota",
        copyQuoteTitle: "Copiar cita",
        jumpBtn: "Ir",
        jumpBtnTitle: "Ir a la nota en la página",
        deleteHighlightTitle: "Eliminar resaltado",
        clipboardHeader: "Historial del portapapeles",
        syncBtn: "Sincronizar",
        syncTitle: "Sincronizar portapapeles del sistema",
        deleteClipTitle: "Eliminar recorte",
        clipboardEmptyTitle: "El portapapeles está vacío",
        clipboardEmptyDesc: "Copia texto o enlaces en cualquier lugar para verlos aquí",
        clearClipboard: "Limpiar portapapeles",
        aiStatusRunning: "llama-server activo (Puerto 8080)",
        aiStatusDownloading: "Descargando modelo ({progress}%)...",
        aiStatusStarting: "Iniciando motor...",
        aiStatusReady: "Listo para iniciar",
        aiStatusDownloaded: "Descargado",
        aiStatusNotDownloaded: "Modelo no descargado",
        cancelDownloadTitle: "Cancelar descarga",
        downloadModelTitle: "Descargar {name} ({size})",
        downloadBtn: "Descargar",
        startingBtn: "Iniciando...",
        stopBtn: "Detener",
        startBtn: "Iniciar",
        openWebUiTitle: "Abrir interfaz web llama.cpp",
        aiConsoleSettingsTitle: "Consola llama.cpp y ajustes avanzados",
        downloadingFile: "Descargando {filename}",
        downloadingWeights: "Descargando pesos...",
        noModelTitle: "Ningún modelo IA descargado",
        offlineBadge: "Sin conexión",
        noModelDesc: "Descarga {name} para ejecutar IA local rápida y privada para resumir webs, programar y chatear.",
        downloadModelSize: "Descargar modelo ({size})",
        settingsBtn: "Ajustes",
        contextBtn: "Contexto",
        searchBtn: "Buscar",
        voiceBtn: "Voz",
        summarizeBtn: "Resumir",
        summarizePrompt: "Resume esta página web con claridad incluyendo las conclusiones clave y puntos principales según su contenido.",
        attachTitle: "Adjuntar archivo o imagen",
        chatPlaceholder: "Pregunta a Gemma 4 local o suelta archivos...",
        voiceInputTitle: "Entrada de voz (Whisper)",
        downloadsHeader: "Descargas activas y recientes",
        itemSingular: "{count} elemento",
        itemPlural: "{count} elementos",
        openDownloadsFolderTitle: "Abrir carpeta de descargas",
        clearDownloadsTitle: "Borrar todas las descargas",
        downloadedFileFallback: "Archivo descargado",
        snipBadge: "Recorte",
        verified: "Verificado",
        unverified: "Sin verificar",
        sha256Prefix: "SHA-256: {hash}",
        saved: "Guardado",
        verifyCopyHashTitle: "Verificar y copiar suma SHA-256",
        copyHashTitle: "SHA-256: {hash} (Clic para copiar)",
        copyImageTitle: "Copiar imagen al portapapeles",
        showInFolderTitle: "Mostrar en carpeta",
        deleteDownloadTitle: "Eliminar archivo y quitar de la lista",
        downloadsEmptyTitle: "Sin descargas activas",
        downloadsEmptyDesc: "Las capturas y archivos descargados aparecerán aquí",
        pdfPageName: "{name} (Pág. {page})",
        pdfImageSize: "Imagen PDF",
        toasts: {
            jumpingToNote: "Yendo a la nota en la página...",
            exportedMarkdown: "¡Archivo Markdown exportado!",
            copiedNotesMarkdown: "¡Notas copiadas como Markdown!",
            copiedToClipboard: "¡Copiado al portapapeles!",
            clipDeleted: "Elemento eliminado",
            clipboardCleared: "Historial del portapapeles borrado",
            parsingPdf: "Analizando PDF visualmente: {name}",
            pdfVramLimit: "Primeras 10 páginas de {name} procesadas como imágenes (límite VRAM).",
            pdfVisualFailed: "Error al procesar PDF visualmente. Usando extracción de texto.",
            openPageFirst: "Abre primero una página web para resumirla",
            transcriptionFailed: "Error de transcripción",
            micDenied: "Acceso al micrófono denegado",
            noteRemoved: "Nota eliminada",
            noteUpdated: "Nota actualizada",
            copiedQuote: "Cita copiada",
            highlightRemoved: "Resaltado eliminado",
            downloadsCleared: "Lista de descargas vaciada",
            hashCopied: "Suma SHA-256 copiada al portapapeles",
            hashMissing: "No se pudo calcular el hash — archivo ausente",
            screenshotCopied: "Captura copiada al portapapeles",
            downloadDeleted: "Descarga y archivo eliminados"
        },
        cancelled: "Cancelado",
        failed: "Error"
    },
    fontManager: {
        title: "Tipografía y fuente de la app",
        active: "Activa:",
        resetTitle: "Restablecer a la fuente predeterminada del sistema",
        resetToDefault: "Restablecer",
        modes: {
            preset: "Predefinidas",
            google: "Google Fonts",
            system: "Sistema",
            file: "Subir fuente"
        },
        categories: {
            all: "Todas",
            sans: "Sans",
            mono: "Mono",
            serif: "Serif"
        },
        activeFont: "Fuente activa",
        clickToApply: "Clic para aplicar",
        googleTitle: "Usar cualquier Google Font",
        googleDesc: "Escribe cualquier nombre de fuente de fonts.google.com y pulsa Enter para cargarla al instante.",
        googlePlaceholder: "ej. Montserrat, Space Grotesk, Syne, Cinzel...",
        applyFont: "Aplicar",
        popularGoogle: "Google Fonts populares",
        filterPlaceholder: "Filtrar lista...",
        systemTitle: "Selector de fuentes del sistema",
        systemDesc: "Introduce cualquier fuente instalada en tu sistema (ej. Segoe UI Variable, Calibri, Helvetica).",
        systemPlaceholder: "Nombre de la fuente del sistema...",
        installed: "Instalada",
        notDetected: "No detectada",
        notDetectedTitle: "No detectada por métricas de lienzo, pero CSS intentará renderizarla si existe",
        commonOsFonts: "Fuentes comunes del sistema operativo",
        dropTitle: "Haz clic o arrastra tu archivo de fuente aquí",
        dropDesc: "Admite TrueType (.ttf), OpenType (.otf), WOFF (.woff) y WOFF2 (.woff2) hasta 12 MB.",
        selectFile: "Seleccionar archivo local",
        activeCustomFace: "Fuente personalizada activa",
        removeFileTitle: "Quitar archivo de fuente subido",
        fineTuning: "Ajuste fino de tipografía",
        letterSpacing: "Espaciado entre letras",
        weightShift: "Grosor del texto",
        fontScale: "Escala de fuente UI",
        reset100Title: "Restablecer al 100%",
        specimen: "Muestra tipográfica",
        specimen1: "El veloz murciélago hindú comía feliz cardillo y kiwi",
        specimen2: "La cigüeña tocaba el saxofón detrás del palenque de paja.",
        activeDefault: "Predeterminada del sistema (Segoe UI / Nativa)",
        activeGoogle: "Google Font: {name}",
        activeSystem: "Fuente del sistema: {name}",
        activeFile: "Archivo personalizado: {name}",
        customLabel: "Personalizada",
        installedOsLabel: "Instalada en SO",
        uploadedFontLabel: "Fuente subida",
        spacing: {
            tight: "Estrecho",
            normal: "Normal",
            relaxed: "Holgado",
            wide: "Amplio"
        },
        weight: {
            normal: "Normal",
            medium: "Media",
            semibold: "Seminegrita"
        },
        osLabels: {
            "Windows 11": "Windows 11",
            Windows: "Windows",
            macOS: "macOS",
            "macOS / Multi": "macOS / Multi",
            Universal: "Universal",
            "Windows Dev": "Windows Dev",
            "Windows Terminal": "Terminal Windows",
            Casual: "Informal",
            Linux: "Linux",
            GNOME: "GNOME",
            Serif: "Serif"
        },
        presetDefaultName: "Predeterminada del sistema",
        presets: {
            default: {
                description: "Tipografía nativa del sistema operativo (Segoe UI / San Francisco).",
                previewText: "Aa Bb Gg 123"
            },
            inter: {
                description: "Tipografía sans moderna, limpia y ultra legible para pantallas.",
                previewText: "Neogrotesca Moderna"
            },
            geist: {
                description: "Tipografía característica de Vercel con precisión geométrica.",
                previewText: "Ingeniería Minimalista"
            },
            outfit: {
                description: "Sans geométrica sofisticada con estética elegante.",
                previewText: "Geométrica de Lujo"
            },
            "plus-jakarta": {
                description: "Tipografía contemporánea fresca y amigable para apps web.",
                previewText: "Contemporánea Amigable"
            },
            poppins: {
                description: "Sans geométrica redondeada con curvas enérgicas y accesibles.",
                previewText: "Curvas Accesibles"
            },
            roboto: {
                description: "La tipografía emblemática de Google para Android y Material Design.",
                previewText: "Arquitectura Material"
            },
            manrope: {
                description: "Fusión de grotesca moderna y geométrica de gran legibilidad.",
                previewText: "Precisión Semigeométrica"
            },
            lexend: {
                description: "Diseñada científicamente para reducir la fatiga visual y leer más rápido.",
                previewText: "Lectura Sin Esfuerzo"
            },
            "jetbrains-mono": {
                description: "Fuente de código de alto contraste con mayor altura para programadores.",
                previewText: "Estética de Código"
            },
            "fira-code": {
                description: "Fuente monoespaciada con ligaduras de programación nítidas.",
                previewText: "=> Ligaduras de Código"
            },
            "playfair-display": {
                description: "Serif editorial de alto contraste inspirada en la imprenta clásica.",
                previewText: "Elegancia Editorial"
            },
            merriweather: {
                description: "Serif literaria cálida pensada para lectura prolongada.",
                previewText: "Clásico Literario"
            }
        },
        errors: {
            invalidFormat: "Formato inválido. Sube archivos .ttf, .otf, .woff o .woff2.",
            tooLarge: "Archivo demasiado grande. El tamaño máximo es de 12 MB.",
            readFailed: "Error al leer el archivo de fuente. Prueba con otro."
        },
        toasts: {
            presetSet: "Fuente de la app establecida a {name}",
            googleApplied: "Google Font \"{name}\" aplicada a QBrowse",
            systemApplied: "Fuente del sistema \"{name}\" aplicada",
            fileLoaded: "Archivo de fuente \"{name}\" cargado correctamente"
        }
    },
    aiSettings: {
        title: "Motor de IA llama.cpp",
        status: {
            online: "En línea (llama-server)",
            starting: "Iniciando...",
            updating: "Actualizando motor...",
            error: "Error del motor",
            stopped: "Detenido"
        },
        syncTitle: "Comprobar y sincronizar el motor nativo llama.cpp (b11796 con soporte Gemma 4)",
        updatingBtn: "Actualizando...",
        syncBtn: "Sincronizar (b11796)",
        subtitle: "Ejecutor LLM local rápido y privado con soporte nativo para Gemma 4, Qwen 3.5 y Bielik 11B GGUF.",
        downloadingModel: "Descargando modelo ({progress}%)",
        connectingCdn: "Conectando al CDN...",
        cancel: "Cancelar",
        downloadBtn: "Descargar {name} ({size})",
        startingBtn: "Iniciando llama-server...",
        stopBtn: "Detener llama-server",
        startBtn: "Iniciar motor llama-server",
        defaultStartError: "llama-server encontró un error al iniciar el modelo.",
        dismiss: "Descartar",
        updateEngineBtn: "Actualizar motor IA",
        genSpeed: "Velocidad de generación",
        tokPerSec: "tok/s",
        contextWindow: "Ventana de contexto",
        tokens: "tokens",
        gpuOffload: "Descarga GPU",
        layers: "capas",
        activeModelTitle: "Modelo GGUF activo",
        loadCustomGguf: "Cargar archivo .GGUF...",
        loadCustomProjector: "Cargar proyector...",
        customModelPrefix: "Modelo personalizado: {path}",
        customProjectorPrefix: "Proyector personalizado: {path}",
        reset: "Restablecer",
        downloadedBadge: "Descargado",
        downloadingTarget: "Descargando {target}",
        visionProjector: "Proyector de visión...",
        languageModel: "Modelo de lenguaje...",
        weights: "pesos...",
        modelReady: "Modelo listo para usar",
        downloadModelFile: "Descargar archivo del modelo ({size})",
        overridesTitle: "Parámetros de llama-server",
        autoDetectBtn: "Autodetectar hardware",
        cpuThreadsLabel: "Hilos CPU (-t): {threads}",
        contextSizeLabel: "Tamaño de contexto (-c)",
        tokensOption: "{n} tokens",
        contextBadges: {
            compact: "Compacto",
            default: "Predeterminado",
            extended: "Extendido",
            max: "Máximo"
        },
        gpuLayersLabel: "Capas GPU (-ngl): {layers}",
        dataProcessingTitle: "Procesamiento de datos",
        parsePdfTitle: "Analizar PDF como imagen",
        parsePdfDesc: "Convierte páginas PDF en imágenes al soltarlas en el chat en lugar de extraer texto plano. Ideal para visión en Gemma 4 y Qwen 3.5.",
        consoleTitle: "Consola de terminal llama-server (Stdout en vivo)",
        copyOutputTitle: "Copiar salida de terminal",
        clearConsoleTitle: "Limpiar consola",
        consoleEmpty: "[Consola de llama-server inicializada. Esperando salida del servidor...]",
        modelWord: "Modelo",
        visionWord: "Visión",
        models: {
            "gemma-4-e2b": "Modelo Google Gemma 4 E2B Instruct GGUF con soporte completo de visión multimodal.",
            "gemma-4-e4b": "Modelo Google Gemma 4 E4B de alto razonamiento con visión multimodal completa.",
            "qwen-3.5-4b": "Modelo Alibaba Qwen 3.5 4B con visión multimodal, razonamiento, código y soporte multilingüe.",
            "bielik-11b-v3.1": "Modelo insignia polaco y europeo 11B de SpeakLeash con gran precisión lingüística y razonamiento."
        },
        toasts: {
            customModelLoaded: "Modelo personalizado cargado: {name}",
            demoModelLoaded: "¡Ruta de modelo de demostración cargada!",
            customProjectorLoaded: "Proyector de visión cargado: {name}",
            demoProjectorLoaded: "¡Ruta de proyector de demostración cargada!",
            updatingEngine: "Actualizando motor nativo llama.cpp...",
            engineUpdated: "¡Motor llama.cpp actualizado a la versión b11796!",
            engineUpdateFailed: "Error al actualizar el motor: {error}",
            unknownError: "Error desconocido",
            logsCopied: "¡Registros de llama-server copiados al portapapeles!",
            hardwareDetected: "Hardware detectado: {threads} hilos, {ram} GB RAM",
            hardwareDefault: "Hardware detectado: optimizaciones predeterminadas aplicadas",
            resizingContext: "Ajustando ventana de contexto a {tokens} tokens..."
        }
    },
    adblockImport: {
        title: "Importar lista de bloqueo desde GitHub / Web",
        subtitle: "Analiza archivos hosts, listas raw de GitHub o reglas Adblock automáticamente.",
        closeTitle: "Cerrar",
        modeUrl: "URL remota / GitHub",
        modePaste: "Pegar texto sin formato",
        urlLabel: "URL de la lista (GitHub raw, Gist o archivo hosts)",
        githubRawBadge: "GitHub Raw",
        githubRawTitle: "Enlace de GitHub detectado y convertido automáticamente a formato raw",
        fetching: "Obteniendo...",
        fetchParse: "Obtener y analizar",
        popularLists: "Listas populares de la comunidad",
        pasteLabel: "Pega un archivo hosts, reglas ABP o lista de dominios",
        pastePlaceholder: "# Pega cualquier formato abajo:\n0.0.0.0 tracking.evil.com\n127.0.0.1 ads.adserver.org\n||telemetry.network.io^\nanalytics.badsite.com",
        parsing: "Analizando...",
        parseDomains: "Analizar dominios",
        back: "Atrás",
        backTitle: "Volver a la entrada de origen (Esc)",
        readyToImport: "Listo para importar",
        kbSource: "Origen de {kb} KB",
        validDomains: "Dominios válidos",
        newUnique: "Nuevos únicos",
        duplicatesFiltered: "Duplicados filtrados",
        linesAnalyzed: "Líneas analizadas",
        extractedSample: "Muestra de dominios extraídos ({count})",
        searchSamplePlaceholder: "Buscar muestra...",
        moreDomains: "+ {count} dominios más",
        backToSource: "Volver al origen",
        cancel: "Cancelar",
        replaceList: "Reemplazar toda la lista",
        replaceListTitle: "Reemplaza tu lista personalizada actual con los dominios analizados",
        importN: "Importar {count} dominios",
        importDomains: "Importar dominios",
        pastedSourceLabel: "Texto pegado",
        errors: {
            invalidUrl: "Introduce una URL de lista válida.",
            fetchFailed: "No se pudo descargar la lista remota",
            noValidFromUrl: "No se encontraron dominios válidos en este origen.",
            downloadError: "Error al descargar la lista remota",
            emptyPaste: "Pega primero algunos dominios o reglas hosts.",
            noValidFromText: "No se pudieron extraer dominios válidos del texto.",
            parseError: "Error al analizar el texto"
        },
        presets: {
            stevenblack: {
                desc: "Protección integral mantenida por la comunidad contra adware y malware.",
                badge: "Recomendada"
            },
            "oisd-basic": {
                desc: "Lista ligera sin falsos positivos contra rastreo web y móvil.",
                badge: "Bajo impacto"
            },
            "adguard-trackers": {
                desc: "Lista especializada enfocada en scripts analíticos y de telemetría.",
                badge: "Privacidad"
            },
            peterlowe: {
                desc: "Lista estándar clásica de servidores publicitarios activos.",
                badge: "Rápida"
            },
            danpollock: {
                desc: "Lista confiable zero-host que bloquea telemetría, spam y sitios nocivos.",
                badge: "Clásica"
            }
        }
    },
    studio: {
        title: "Estudio de Preajustes",
        subtitle: "Reacopla componentes visualmente, ajusta curvaturas, personaliza temas y gestiona tus preajustes.",
        tabCanvas: "Lienzo",
        tabPresets: "Preajustes",
        closeAria: "Cerrar Estudio de Preajustes",
        dockLeftSidebar: "Acoplar barra lateral a la izquierda",
        dockRightSidebar: "Acoplar barra lateral a la derecha",
        dockTopBar: "Acoplar barra de navegación arriba",
        dockBottomBar: "Acoplar barra de navegación abajo",
        searchBarPlaceholder: "Buscar en la web o escribir un comando...",
        toolhubDockTitle: "Acoplamiento de ToolHub: {pos} (Clic o arrastra para cambiar)",
        legendDock: "Barra:",
        legendBarValue: "{pos}",
        legendSidebar: "Lateral:",
        legendToolhub: "ToolHub:",
        legendSummary: "Curvatura: {curvature} · Omnibox: {omnibox} · Pestañas: {tabs}",
        layoutControls: "Controles de diseño",
        resetTitle: "Restablecer borrador a la configuración actual",
        reset: "Restablecer",
        editingLabel: "Editando:",
        cancelEditTitle: "Cancelar edición y crear un nuevo preajuste",
        cancel: "Cancelar",
        sidebarMode: "Modo de barra lateral",
        sidebarModes: {
            classic: "Clásica",
            floating: "Flotante",
            compact: "Compacta",
            hidden: "Oculta"
        },
        windowCurvature: "Curvatura de ventana",
        curvatures: {
            default: "Normal",
            cohesive: "Cohesiva",
            square: "Recta"
        },
        omniboxArch: "Arquitectura de Omnibox",
        omniboxStyles: {
            capsule: "Cápsula",
            wide: "Ancha",
            minimal: "Mínima"
        },
        tabPresentation: "Estilo de pestañas",
        tabStyles: {
            pills: "Píldoras",
            compact: "Compactas",
            cards: "Tarjetas"
        },
        windowControlsStyle: "Estilo de controles de ventana",
        controlsStyles: {
            mac: "macOS",
            windows: "Windows",
            minimal: "Minimal"
        },
        windowControlsLayout: "Orden de controles de ventana",
        controlsOrders: {
            auto: "Esquina inteligente",
            "close-first": "Cerrar primero",
            "minimize-first": "Minimizar primero"
        },
        themeLabel: "Tema",
        themes: {
            dark: "Oscuro",
            light: "Claro"
        },
        uiScaleLabel: "Escala de UI",
        uiScales: {
            comfortable: "Normal",
            compact: "Compacta"
        },
        accentSwatchLabel: "Color de acento",
        openColorPickerTitle: "Abrir selector de color del sistema",
        saveChanges: "Guardar cambios",
        applyLive: "Aplicar en vivo",
        saveAsNew: "Guardar como nuevo",
        applyToBrowser: "Aplicar al navegador",
        saveAsCustom: "Guardar como preajuste",
        searchPresetsPlaceholder: "Buscar preajustes...",
        filterAll: "Todos",
        filterBuiltin: "Integrados",
        filterCustom: "Propios ({count})",
        saveActiveSetup: "Guardar diseño actual",
        activeBadge: "Activo",
        editingBadge: "(Editando)",
        reapply: "Reaplicar",
        apply: "Aplicar",
        editInStudio: "Editar en Estudio",
        customize: "Personalizar",
        editPresetTitle: "Editar preajuste en estudio",
        customizePresetTitle: "Personalizar diseño en estudio",
        duplicateTitle: "Duplicar preajuste",
        deleteTitle: "Eliminar preajuste personalizado",
        editCustomModalTitle: "Editar preajuste personalizado",
        saveCustomModalTitle: "Guardar como preajuste",
        presetNameLabel: "Nombre del preajuste",
        presetNamePlaceholder: "ej. Flujo Ergonómico, Arc Minimalista",
        presetDescLabel: "Descripción corta",
        presetDescPlaceholder: "Breve descripción de esta configuración...",
        presetIconLabel: "Icono del preajuste",
        createPreset: "Crear preajuste",
        deleteConfirmTitle: "¿Eliminar preajuste personalizado?",
        deleteConfirmDescBefore: "¿Seguro que deseas eliminar ",
        deleteConfirmDescAfter: "? Esta acción no se puede deshacer.",
        deletePresetBtn: "Eliminar preajuste",
        posTop: "Arriba",
        posBottom: "Abajo",
        posLeft: "Izquierda",
        posRight: "Derecha",
        moveTo: "Mover a {pos}",
        draggableNavTitle: "Barra arrastrable: arrastra arriba o abajo, o pulsa para cambiar",
        draggableSidebarTitle: "Barra lateral arrastrable: arrastra entre izquierda y derecha",
        swapTo: "Cambiar a {pos}",
        miniTab: "Pestaña #{num}",
        miniCardView: "Tarjeta #{num}",
        miniActiveSpaceTab: "Pestaña activa",
        miniSidebarPos: "Lateral ({pos})",
        layoutTagFormat: "{bar} · {sidebar}",
        layoutSummaryFormat: "{tag} · {toolhub}",
        topBarLabel: "Barra superior",
        bottomBarLabel: "Barra inferior",
        leftSidebarLabel: "Barra izquierda",
        rightSidebarLabel: "Barra derecha",
        leftToolhubLabel: "ToolHub izquierdo",
        rightToolhubLabel: "ToolHub derecho",
        tabsHighlight: "Pestañas {style}",
        compactScaleLabel: "Escala compacta",
        comfortableScaleLabel: "Escala cómoda",
        defaultCustomName: "Preajuste propio",
        defaultCustomDesc: "Configuración personalizada",
        defaultNewNameFormat: "{bar} {side}",
        defaultNewNameArc: "Arc",
        defaultNewNameFlow: "Flujo",
        defaultNewDescFormat: "Diseño propio: {bar}, {sidebar}, pestañas {tabs}",
        toasts: {
            applied: "¡Diseño aplicado al navegador!",
            reset: "Borrador restablecido al diseño actual",
            editingPreset: "Editando \"{name}\" en el Estudio",
            loadedPreset: "\"{name}\" cargado en el lienzo",
            switchedNewDraft: "Cambiado a nuevo borrador"
        }
    },
    setup: {
        strictOfflineTitle: "Cero solicitudes en segundo plano (Sin conexión estricto)",
        strictOfflineDesc: "Desactiva todo el tráfico de red opcional en segundo plano (comprobaciones de actualización, filtros, sugerencias en vivo, favicons remotos y sincronización en la nube).",
        headerTitle: "Configuración de QBrowse",
        headerSubtitle: "Asistente de personalización",
        steps: {
            language: {
                label: "Idioma",
                desc: "Idioma de interfaz"
            },
            presets: {
                label: "Estilo y diseño",
                desc: "Experiencia"
            },
            import: {
                label: "Importar",
                desc: "Marcadores y claves"
            },
            privacy: {
                label: "Privacidad",
                desc: "Escudos y Tor"
            },
            default: {
                label: "Predeterminado",
                desc: "Integración OS"
            },
            sync: {
                label: "Cuenta y Sync",
                desc: "Nube o Local"
            }
        },
        chooseSetupTitle: "Elige tu configuración",
        chooseSetupDesc: "Selecciona un diseño inicial a medida. Podrás personalizar cada panel en cualquier momento.",
        customLayoutCta: "¿Diseño a medida? Estudio →",
        themeLabel: "Tema",
        dark: "Oscuro",
        light: "Claro",
        accentLabel: "Acento",
        step2Badge: "Paso 2 de 5",
        step2Title: "Trae tus datos y bóveda",
        step2Desc: "Importa tus marcadores y contraseñas desde Bitwarden, Proton Pass, Chrome o Firefox.",
        tabBookmarks: "Marcadores",
        tabVault: "Bóveda",
        bookmarksFound: "{count} marcadores encontrados",
        notDetected: "No detectado en este equipo",
        imported: "Importado",
        importing: "Importando...",
        importBookmarks: "Importar marcadores",
        scanningBrowsers: "Buscando navegadores instalados...",
        htmlImported: "Archivo HTML importado ({count} elementos)",
        uploadHtml: "Subir archivo HTML de marcadores (.html)",
        vaultComplete: "Migración completada",
        vaultImportedSummary: "¡{count} elementos importados desde {source} en QVault!",
        importAnother: "Importar otro",
        exportCsvJson: "Exportar como .CSV o .JSON",
        parsingVault: "Analizando archivo...",
        uploadVault: "Subir exportación (.csv o .json)",
        compatibleManagers: "Compatible con Bitwarden, Proton Pass, Google Chrome, Edge, Brave y 1Password",
        step3Badge: "Paso 3 de 5",
        step3Title: "Blinda tu privacidad",
        step3Desc: "QBrowse bloquea rastreadores, elimina anuncios intrusivos y enruta tráfico mediante Tor.",
        privacyOptimizedBadge: "Preajuste: Privacidad optimizada",
        adblockTitle: "Escudo nativo Ghostery",
        adblockDesc: "Bloquea rastreadores, telemetría y anuncios intrusivos sin ralentizar la carga.",
        torTitle: "Espacio de enrutamiento Tor Onion",
        torDesc: "Permite navegar por sitios .onion y circuitos cifrados multisalto en cualquier momento.",
        ready: "Listo",
        step4Badge: "Paso 4 de 5",
        step4Title: "Establecer como predeterminado",
        step4Desc: "Abre enlaces externos en espacios aislados manteniendo trabajo y vida personal separados.",
        isDefaultTitle: "¡QBrowse es tu navegador predeterminado!",
        makeDefaultTitle: "Haz de QBrowse tu puerta principal a la web",
        isDefaultDesc: "Todos los enlaces y archivos HTML se abrirán automáticamente en QBrowse.",
        makeDefaultDesc: "Gestiona enlaces http://, https:// y archivos HTML con integración total del sistema.",
        osLabels: {
            darwin: "Ajustes del Sistema",
            linux: "Aplicaciones predeterminadas",
            win32: "Aplicaciones predeterminadas de Windows"
        },
        defaultHint: "Se abrió {label} — selecciona QBrowse en la ventana del sistema para confirmar.",
        openOsSettings: "Abrir {label}",
        defaultSet: "Establecido como predeterminado",
        openingSettings: "Abriendo ajustes...",
        setAsDefault: "Establecer como predeterminado",
        step5Badge: "Paso 5 de 5 • Perfil y Cloud Sync",
        step5Title: "Elige cómo navegar",
        step5Desc: "Soberanía total: navega 100 % sin conexión con cifrado local por hardware o crea una cuenta gratuita de Cloud Sync.",
        zeroTelemetry: "Cero telemetría",
        localProfile: "Perfil local",
        localProfileDesc: "100 % sin conexión. Contraseñas, historial y pestañas permanecen cifrados localmente. Sin cuenta.",
        e2eEncrypted: "Cifrado E2E",
        cloudSync: "QBrowse Cloud Sync",
        cloudSyncDesc: "Sincroniza bóveda, espacios, pestañas fijadas y marcadores entre equipos vía Firebase.",
        localReadyTitle: "El perfil local está listo",
        localReadyDesc: "Tus marcadores, credenciales y espacios permanecerán solo en este equipo. Podrás activar Cloud Sync después desde Ajustes.",
        takeTour: "Hacer el recorrido guiado",
        startDirectly: "Empezar a navegar",
        activeSync: "Sync activa",
        cloudLinked: "Almacenamiento en la nube cifrado E2E vinculado",
        signOut: "Cerrar sesión",
        activeSyncDesc: "Tus marcadores, pestañas y bóveda cifrada se sincronizan continuamente en todos tus dispositivos.",
        signIn: "Iniciar sesión",
        existingAccount: "(Cuenta existente)",
        register: "Registrarse",
        newAccount: "(Nueva cuenta)",
        registerSubtitle: "Crea una cuenta QBrowse para sincronizar datos entre dispositivos.",
        signInSubtitle: "Inicia sesión para sincronizar tus marcadores, espacios y bóveda.",
        switchToSignIn: "Cambiar a Iniciar sesión",
        emailLabel: "Correo electrónico",
        emailPlaceholder: "nombre@ejemplo.com",
        createPassLabel: "Crear contraseña (mín. 6 caracteres)",
        accountPassLabel: "Contraseña de la cuenta",
        min6Chars: "Mínimo 6 caracteres",
        confirmPassLabel: "Confirmar contraseña",
        passwordsMatch: "Las contraseñas coinciden",
        passwordsMismatch: "Las contraseñas no coinciden",
        useAccountAsMaster: "Usar contraseña de la cuenta como clave maestra",
        masterDerivedDesc: "Deriva claves AES-GCM de 256 bits directamente de tu contraseña de acceso.",
        masterSeparateDesc: "Usando una frase de cifrado personalizada independiente.",
        customMasterLabel: "Frase de cifrado maestra personalizada",
        customMasterPlaceholder: "Introduce una frase única para cifrar la bóveda...",
        creatingAccount: "Creando cuenta cifrada...",
        signingInSyncing: "Iniciando sesión y sincronizando...",
        createAccountBtn: "Crear cuenta y activar Cloud Sync",
        signInBtn: "Iniciar sesión y activar Cloud Sync",
        alreadyRegistered: "¿Ya estás registrado en QBrowse?",
        signInHere: "Inicia sesión aquí",
        newToSync: "¿Nuevo en QBrowse Cloud Sync?",
        createFreeAccount: "Crear cuenta gratuita (Registrarse)",
        skipSyncLocal: "Omitir Cloud Sync y continuar con perfil local",
        skipSyncComplete: "Omitir Sync y finalizar",
        vaultModalTitle: "Protege tu bóveda importada",
        vaultModalDesc: "Introduce o crea una contraseña maestra para cifrar tus credenciales.",
        masterPassLabel: "Contraseña maestra",
        masterPassPlaceholder: "Introduce contraseña maestra...",
        confirmMasterLabel: "Confirmar contraseña maestra",
        confirmMasterPlaceholder: "Confirmar contraseña...",
        cancel: "Cancelar",
        encryptImport: "Cifrar e importar",
        bookmarkFallback: "Marcador",
        htmlFileFallback: "archivo HTML",
        toasts: {
            enterEmail: "Introduce un correo electrónico.",
            validEmail: "Introduce un correo válido (ej. nombre@dominio.com).",
            passMin6: "La contraseña debe tener al menos 6 caracteres.",
            confirmPassReq: "Confirma tu contraseña.",
            passMismatch: "Las contraseñas no coinciden.",
            signedIn: "¡Sesión iniciada en QBrowse Cloud Sync!",
            registered: "¡Cuenta registrada y Cloud Sync activo!",
            bookmarksImported: "¡{count} marcadores importados correctamente!",
            importFailed: "Error en la importación.",
            couldNotImportBookmarks: "No se pudieron importar los marcadores.",
            htmlImported: "¡{count} marcadores importados de {filename}!",
            htmlImportFailed: "Error al importar marcadores HTML.",
            noCredentials: "No se encontraron credenciales en el archivo",
            passwordsImported: "¡{count} contraseñas importadas desde {source}!",
            vaultImportFailed: "Error de importación: {error}",
            passMin4: "La contraseña debe tener al menos 4 caracteres",
            vaultPassMismatch: "Las contraseñas no coinciden",
            incorrectMasterPass: "Contraseña maestra incorrecta para la bóveda existente",
            vaultImportError: "Error de importación: {error}",
            nowDefault: "¡QBrowse es ahora tu navegador predeterminado!",
            openingWinDefault: "Abriendo Aplicaciones predeterminadas de Windows. Elige QBrowse.",
            openingOsDefault: "Abriendo {label}. Selecciona QBrowse como predeterminado.",
            couldNotOpenDefault: "No se pudo abrir la configuración de navegador predeterminado."
        }
    },
    flags: {
        title: "Experimentos",
        subtitle: "Ajusta funciones experimentales, gráficos por hardware, cifrados poscuánticos y aislamiento de circuitos Tor.",
        resetAll: "Restablecer todo",
        warningTitle: "¡Advertencia: funciones experimentales!",
        warningBody: "Activar estas opciones altera Chromium V8, la composición gráfica o parámetros TLS. Se requiere reiniciar para aplicar cambios.",
        searchPlaceholder: "Buscar banderas (ej. GPU, Kyber, QUIC, DoH, bfcache)...",
        tabAvailable: "Disponibles ({count})",
        tabUnavailable: "No disponibles ({count})",
        categories: {
            All: "Todas",
            Performance: "Rendimiento",
            "Hardware & Graphics": "Hardware y Gráficos",
            "Web Standards & Engine": "Estándares Web y Motor",
            Security: "Seguridad",
            Networking: "Redes",
            "Media & UI": "Multimedia e Interfaz",
            "AI & Tools": "IA y Herramientas",
            Experimental: "Experimental"
        },
        statuses: {
            Stable: "Estable",
            Beta: "Beta",
            Experimental: "Experimental"
        },
        options: {
            default: "Predeterminado",
            enabled: "Activado",
            disabled: "Desactivado"
        },
        emptyMatch: "Ninguna bandera disponible coincide con \"{search}\"",
        reasonPrefix: "Motivo: {reason}",
        unavailableBadge: "No disponible",
        relaunchMsg: "Tus cambios se aplicarán la próxima vez que reinicies QBrowse.",
        relaunchBtn: "Reiniciar",
        toasts: {
            reset: "Todas las banderas experimentales restauradas",
            relaunching: "Reiniciando QBrowse con las banderas actualizadas..."
        },
        items: {
            "prefer-high-performance-gpu": {
                name: "Preferir GPU de alto rendimiento",
                description: "Dirige el renderizado WebGL, Canvas y 3D a la GPU dedicada en sistemas multi-GPU. Desactivado en modo Eco."
            },
            "unlock-frame-rate": {
                name: "Tasa de fotogramas desbloqueada (Benchmark)",
                description: "Desactiva V-Sync para pruebas sintéticas de FPS. Puede causar tearing y mayor consumo."
            },
            "ignore-gpu-blocklist": {
                name: "Ignorar lista de bloqueo de GPU",
                description: "Omite la lista de renderizado por software de Chromium y fuerza aceleración por hardware."
            },
            "experimental-web-platform": {
                name: "Funciones experimentales de plataforma web",
                description: "Activa APIs web en desarrollo dentro de Chromium."
            },
            "gpu-rasterization": {
                name: "Rasterización GPU y composición acelerada",
                description: "Acelera rasterización y composición usando la GPU dedicada en lugar de CPU."
            },
            "smooth-scrolling": {
                name: "Motor de desplazamiento suave",
                description: "Activa animaciones fluidas con curvas cúbicas al desplazar con ratón o panel táctil."
            },
            "zero-copy-rasterizer": {
                name: "Rasterizador GPU Zero-Copy (GpuMemoryBuffer)",
                description: "Escribe directamente en texturas GPU compartidas sin copias en memoria CPU."
            },
            "enable-vulkan": {
                name: "Backend gráfico y compositor Vulkan",
                description: "Usa la API Vulkan para composición y renderizado en GPUs compatibles."
            },
            "back-forward-cache": {
                name: "Caché atrás/adelante (bfcache)",
                description: "Conserva instantáneas en RAM de páginas recientes para navegación instantánea."
            },
            "canvas-oop-rasterization": {
                name: "Rasterización 2D Canvas fuera de proceso",
                description: "Ejecuta operaciones Canvas 2D en el proceso GPU dedicado."
            },
            "enable-drdc": {
                name: "Detección dinámica de alta tasa de refresco (120/144/240 Hz)",
                description: "Sincroniza fotogramas y V-Sync con pantallas ProMotion y monitores gaming."
            },
            "auto-suspend-tabs": {
                name: "Suspensión automática de pestañas (Ahorro RAM)",
                description: "Descarga automáticamente pestañas inactivas tras 15 minutos para ahorrar RAM y batería."
            },
            "parallel-download-engine": {
                name: "Descargas paralelas multihilo",
                description: "Divide descargas grandes en múltiples peticiones HTTP simultáneas."
            },
            "lazy-image-loading": {
                name: "Carga diferida de imágenes y marcos",
                description: "Pospone la carga de imágenes fuera de pantalla hasta que entran en vista."
            },
            "enable-tls13-kyber": {
                name: "Criptografía poscuántica para TLS (Kyber768 / ML-KEM)",
                description: "Activa intercambio híbrido resistente a computación cuántica en TLS 1.3."
            },
            "enable-encrypted-client-hello": {
                name: "Encrypted Client Hello (ECH / SNI cifrado)",
                description: "Cifra el nombre del servidor (SNI) en TLS frente a ISPs y cortafuegos."
            },
            "strict-origin-isolation": {
                name: "Aislamiento estricto Sitio-por-Proceso",
                description: "Asigna procesos OS dedicados con memoria aislada por origen contra Spectre/Meltdown."
            },
            "webrtc-ip-protection": {
                name: "Protección de IP local y fugas STUN en WebRTC",
                description: "Restringe candidatos ICE de WebRTC para ocultar tu IP real local o pública."
            },
            "enable-dns-over-https": {
                name: "DNS-over-HTTPS estricto (Cloudflare/Quad9)",
                description: "Cifra las consultas DNS por HTTPS (puerto 443) evitando espionaje."
            },
            "disable-hyperlink-auditing": {
                name: "Desactivar auditoría de hipervínculos (<a ping>)",
                description: "Bloquea envíos silenciosos de rastreo POST al hacer clic en enlaces."
            },
            "enable-fingerprint-randomization": {
                name: "Ruido anti-huella digital en Canvas y WebAudio",
                description: "Perturba ligeramente lecturas de píxeles y audio para evitar huellas de hardware."
            },
            "enable-font-enumeration-shield": {
                name: "Escudo contra enumeración de fuentes locales",
                description: "Evita que las webs detecten tus fuentes instaladas para rastrearte."
            },
            "aggressive-tracker-blocker": {
                name: "Eliminación agresiva de parámetros de rastreo URL",
                description: "Limpia utm_source, gclid, fbclid y bloquea píxeles de seguimiento."
            },
            "enable-subresource-filter": {
                name: "Filtro de subrecursos para superposiciones abusivas",
                description: "Detecta y suprime clickjacking y enlaces invisibles engañosos."
            },
            "enable-quic": {
                name: "Protocolo experimental QUIC y HTTP/3",
                description: "Habilita transporte HTTP/3 sobre UDP con conexiones zero-RTT."
            },
            "tor-stream-isolation": {
                name: "Aislamiento de circuito Tor por dominio (IsolateDestAddr)",
                description: "Asigna un circuito de salida único por dominio en el espacio Tor."
            },
            "dns-prefetching": {
                name: "Resolución DNS predictiva",
                description: "Resuelve de antemano IPs de enlaces visibles para acelerar la navegación."
            },
            "heavy-ad-intervention": {
                name: "Intervención ante anuncios pesados",
                description: "Descarga iframes publicitarios que superen 4 MB o 60s de CPU."
            },
            "cross-origin-isolation": {
                name: "Política COOP y SharedArrayBuffer",
                description: "Permite operaciones WebAssembly de memoria compartida con políticas estrictas."
            },
            "document-pip-api": {
                name: "API Document Picture-in-Picture",
                description: "Activa ventanas flotantes con HTML arbitrario, vídeo y controles personalizados."
            },
            "force-dark-contents": {
                name: "Modo oscuro automático para contenido web",
                description: "Genera un tema oscuro preservando la luminancia en webs claras."
            },
            "overlay-scrollbars": {
                name: "Barras de desplazamiento flotantes minimalistas",
                description: "Reemplaza barras gruesas por indicadores estilizados que se ocultan solos."
            },
            "enable-webgpu": {
                name: "API WebGPU de nueva generación",
                description: "Acceso directo de baja latencia a la GPU para IA en navegador, 3D y shaders."
            },
            "tab-audio-muting": {
                name: "Silenciado rápido de audio por pestaña",
                description: "Añade un icono interactivo de altavoz para silenciar pestañas al instante."
            },
            "webrtc-pipewire": {
                name: "Captura de escritorio PipeWire (Linux Wayland)",
                description: "Activa compartir pantalla mediante el portal PipeWire en GNOME y KDE."
            },
            "hdr-compositing": {
                name: "Composición de color HDR",
                description: "Activa gama amplia de 10 bits (Rec.2020 / DCI-P3) en pantallas compatibles."
            },
            "local-ai-assistant": {
                name: "Aceleración VRAM para LLM GGUF locales (llama.cpp)",
                description: "Descarga pesos de Gemma y Llama 3 en VRAM para resúmenes rápidos y privados."
            },
            "experimental-split-screen-gestures": {
                name: "Gestos cinéticos de pantalla dividida",
                description: "Arrastra pestañas a los bordes para crear vistas divididas al instante."
            },
            "enable-reader-mode": {
                name: "Modo lectura sin distracciones",
                description: "Extrae el texto del artículo en un diseño limpio sin anuncios ni barras laterales."
            },
            "auto-password-generation": {
                name: "Generación criptográfica de contraseñas seguras",
                description: "Propone contraseñas de 128 bits respaldadas por QVault en formularios de registro."
            },
            "tab-groups-auto-clustering": {
                name: "Agrupación inteligente de pestañas por dominio",
                description: "Sugiere agrupar pestañas abiertas según su dominio y espacio de trabajo."
            },
            "touch-ui-layout": {
                name: "Modo táctil para tabletas",
                description: "Amplía la altura de pestañas y márgenes táctiles. Desactivado en escritorio.",
                reason: "Requiere detección de pantalla táctil por hardware."
            },
            "eye-tracking-gaze-scroll": {
                name: "Navegación por seguimiento ocular",
                description: "Desplaza la página según la mirada. Requiere sensores infrarrojos específicos.",
                reason: "No se detectó sensor de seguimiento ocular compatible."
            },
            "cellular-data-saver": {
                name: "Ahorro de datos móviles",
                description: "Comprime imágenes mediante proxies remotos. Desactivado por privacidad.",
                reason: "Desactivado por defecto para preservar la privacidad de Tor y HTTPS E2E."
            }
        }
    }
};

const pt = {
    common: {
        incognito: "Anônimo",
        selectOption: "Selecionar opção...",
        colors: {
            accent: "Destaque",
            yellow: "Amarelo",
            green: "Verde",
            blue: "Azul",
            pink: "Rosa"
        }
    },
    wallpaperPreview: {
        alt: "Prévia do papel de parede",
        badge: "Prévia"
    },
    presets: {
        names: {
            balanced: "Equilibrado",
            developer: "Desenvolvedor",
            classic_reverse: "Arc Moderno",
            bottom_bar: "Fluxo Ergonômico",
            minimalist: "Foco Mínimo",
            privacy: "Sentinela Privada"
        },
        taglines: {
            balanced: "Espaços Pessoal e Trabalho com busca Google.",
            developer: "Espaços isolados com integração GitHub Live PR.",
            classic_reverse: "Árvore de abas à direita com leitura limpa.",
            bottom_bar: "Barra de endereços inferior para navegação confortável.",
            minimalist: "Espaço único com interface compacta sem distrações.",
            privacy: "Proteção rígida contra rastreadores com DuckDuckGo."
        },
        descriptions: {
            balanced: "Espaços duplos (Pessoal e Trabalho), privacidade padrão e Google.",
            developer: "Isolamento multi-espaço com rastreamento de PRs do GitHub.",
            classic_reverse: "Árvore de navegação à direita, gaveta espelhada e foco nas abas.",
            bottom_bar: "Barra inferior ergonômica para navegação ágil com uma mão.",
            minimalist: "Espaço único, barra lateral direita e visual ultracompacto.",
            privacy: "Bloqueio estrito de rastreadores, DuckDuckGo e rede Tor instantânea."
        },
        customTaglineFallback: "Configuração personalizada de espaço e layout.",
        accents: {
            amberGold: "Ouro Âmbar",
            ocean: "Oceano",
            skyBlue: "Azul Celeste",
            cyberEmerald: "Esmeralda Cyber",
            electricBlue: "Azul Elétrico",
            royalViolet: "Violeta Real",
            roseGold: "Ouro Rosé",
            sunsetOrange: "Laranja Pôr do Sol",
            cyberCyan: "Ciano Cyber",
            slateGray: "Cinza Ardósia"
        }
    },
    addPin: {
        title: "Fixar app na barra lateral",
        subtitle: "Adicione um atalho rápido para aplicativo ou site",
        defaultAppName: "Nome do App",
        appNameLabel: "Nome / Título do App",
        appNamePlaceholder: "ex. GitHub, Gemini...",
        urlLabel: "URL / Domínio *",
        urlPlaceholder: "ex. github.com ou https://gemini.google.com",
        quickPresets: "Atalhos rápidos",
        cancel: "Cancelar",
        pinApp: "Fixar App"
    },
    passkey: {
        biometrics: {
            darwin: "Touch ID",
            linux: "Biometria do sistema",
            win32: "Windows Hello"
        },
        hints: {
            darwin: "Toque o sensor Touch ID ou digite sua senha do macOS",
            linux: "Toque o leitor biométrico ou digite sua senha do sistema",
            win32: "Toque o leitor biométrico ou digite seu PIN do Windows"
        },
        cancelDenyTitle: "Cancelar e recusar",
        verifiedTitle: "Identidade verificada!",
        scanningTitle: "Verificando {biometric}...",
        autofillTitle: "Preencher senha salva",
        passkeyTitle: "Autenticação por Passkey",
        verifiedAutofillDesc: "Cofre desbloqueado e credenciais preenchidas",
        verifiedPasskeyDesc: "Passkey liberada e assinada com sucesso",
        requireAutofillDesc: "Verificação necessária para desbloquear e preencher",
        requirePasskeyDesc: "Verificação necessária para entrar com sua passkey",
        passwordBadge: "Senha",
        passkeyBadge: "Passkey",
        accountLabel: "Conta:",
        savedLogin: "Login salvo",
        passkeyUser: "Usuário Passkey",
        verifyingWith: "Verificando com {biometric}...",
        verifiedBtn: "Verificado!",
        verifyWith: "Verificar com {biometric}",
        orPassPin: "Ou com senha mestra / PIN",
        orPass: "Ou com senha mestra",
        placeholderPin: "Senha mestra ou PIN rápido de 4–8 dígitos",
        placeholderPass: "Digite a senha mestra do QVault",
        checking: "Verificando credenciais...",
        verifyAuth: "Verificar e autenticar",
        cancelDenyBtn: "Cancelar e recusar solicitação",
        websiteFallback: "Site",
        theWebsiteFallback: "o site",
        toastAutofill: "Cofre desbloqueado e credenciais preenchidas para {domain}!",
        toastPasskey: "Passkey verificada para {domain}!",
        promptAutofill: "Verifique sua identidade para preencher credenciais de {domain}",
        promptPasskey: "Entre em {domain} com sua passkey do QVault",
        biometricError: "Erro biométrico: {error}",
        vaultLockedOut: "Cofre bloqueado por tentativas falhas. Tente novamente em {seconds}s.",
        incorrectCreds: "Senha mestra ou PIN rápido incorretos. Tente novamente.",
        verificationFailed: "Falha na verificação: {error}",
        passkeyCreateTitle: "Criar chave de acesso do QVault",
        verifiedPasskeyCreateDesc: "Identidade verificada — salvando chave no QVault",
        requirePasskeyCreateDesc: "Verificação necessária para criar e salvar esta chave de acesso",
        useHardwareKeyBtn: "Usar chave de hardware / sistema",
        useHardwareKeyHint: {
            darwin: "YubiKey · FIDO2 · Touch ID · QR do celular",
            linux: "YubiKey · FIDO2 · USB / NFC / BLE · QR do celular",
            win32: "YubiKey · FIDO2 · Windows Hello · QR do celular"
        },
        toastHardwareHandoff: "Alternando para chave de segurança de hardware / sistema para {domain}...",
        toastPasskeyCreated: "Chave de acesso verificada e salva para {domain}!",
        promptPasskeyCreate: "Criar e salvar uma chave de acesso do QVault para {domain}"
    },
    history: {
        title: "Arquivo",
        entrySingular: "{count} entrada salva",
        entryPlural: "{count} entradas salvas",
        searchPlaceholder: "Pesquisar no arquivo...",
        clearAllTitle: "Limpar todo o histórico de navegação",
        clear: "Limpar",
        closeTitle: "Fechar (Esc)",
        segments: {
            all: "Tudo",
            today: "Hoje",
            yesterday: "Ontem",
            week: "Últimos 7 dias",
            older: "Mais antigo"
        },
        emptySearch: "Nenhum resultado para \"{query}\"",
        emptyTitle: "O arquivo está vazio",
        emptySearchDesc: "Verifique a ortografia ou escolha outro filtro.",
        emptyDesc: "As páginas visitadas serão salvas aqui para acesso rápido.",
        itemSingular: "{count} item",
        itemPlural: "{count} itens",
        copyLinkTitle: "Copiar link",
        openNewTabTitle: "Abrir em nova aba",
        removeTitle: "Remover do arquivo",
        toastCleared: "Arquivo limpo",
        toastCopied: "Link copiado",
        toastOpenedBg: "Aberto em aba em segundo plano",
        loadMore: "Carregar mais",
    },
    cookies: {
        title: "Explorador de cookies e armazenamento",
        subtitle: "Inspecione, pesquise e exclua cookies e dados locais de sites",
        filterDomain: "Filtrar domínio",
        refreshTitle: "Atualizar lista",
        allSites: "Todos os sites",
        clearDomain: "Limpar {domain}",
        clearAllData: "Limpar todos os dados",
        searchPlaceholder: "Buscar cookies por nome, domínio ou valor...",
        emptyTitle: "Nenhum cookie encontrado",
        emptyDesc: "Limpe a busca ou selecione outro domínio",
        secure: "Seguro",
        httpOnly: "HttpOnly",
        path: "Caminho: {path}",
        expires: "Expira: {date}",
        deleteTitle: "Excluir cookie",
        toastDeleted: "Cookie excluído: {name}",
        toastClearedSite: "{count} cookies limpos para {domain}",
        toastClearedAll: "Dados de navegação e cookies limpos"
    },
    resources: {
        title: "Gerenciador de Tarefas",
        cpu: "CPU",
        ram: "RAM",
        asleepCount: "{count} suspensas",
        sleepInactive: "Suspender inativas",
        sleepInactiveTitle: "Suspender abas inativas em segundo plano para liberar memória",
        wakeAll: "Acordar todas",
        wakeAllTitle: "Restaurar todas as abas suspensas",
        purgeCacheTitle: "Limpar cache de memória do navegador",
        autoRefreshActiveTitle: "Atualização automática ativa (a cada 2s)",
        autoRefreshPausedTitle: "Atualização automática pausada",
        autoRefresh2s: "2s",
        paused: "Pausado",
        refreshTitle: "Atualizar métricas de processos",
        closeTitle: "Fechar (ESC)",
        filters: {
            all: "Tudo",
            tabs: "Abas",
            processes: "Processos",
            sleeping: "Suspensas"
        },
        searchPlaceholder: "Filtrar por nome, PID...",
        colTask: "Tarefa / Processo",
        colSpace: "Espaço / Tipo",
        colStatus: "Status",
        colCpu: "CPU",
        colMemory: "Memória",
        colAction: "Ação",
        emptyMatch: "Nenhuma tarefa correspondente a \"{query}\"",
        blankTab: "Aba em branco",
        newTabDash: "Painel Nova Aba Zen",
        pidSubtitle: "PID {pid} · {type}",
        active: "Ativa",
        spaceTab: "Aba {space}",
        mainCore: "Núcleo principal",
        sleep: "Suspensa",
        live: "Ativa",
        memSaved: "(Economizado)",
        wakeTabTitle: "Reativar aba",
        activeTabCannotSleep: "Aba ativa não pode ser suspensa",
        sleepTabTitle: "Suspender aba",
        switchTabTitle: "Ir para a aba",
        closeTabTitle: "Fechar aba",
        core: "Núcleo",
        endProcessTitle: "Encerrar processo PID {pid}",
        itemsOf: "{shown} de {total} itens",
        pressEscPrefix: "Pressione",
        pressEscSuffix: "para fechar",
        procMain: "Processo Principal QBrowse",
        procGpu: "Processo GPU",
        procRenderer: "Renderizador Webview",
        procUtility: "Serviço Utilitário (Áudio/Armazenamento)",
        procZygote: "Pré-carregador Sandbox",
        procPepper: "Host de Plugins",
        procChild: "Processo {type}",
        procChildDefault: "Filho",
        toastHibernatedSingular: "{count} aba inativa suspensa (~{mb} MB de RAM liberados)",
        toastHibernatedPlural: "{count} abas inativas suspensas (~{mb} MB de RAM liberados)",
        toastWokeSingular: "{count} aba suspensa restaurada",
        toastWokePlural: "{count} abas suspensas restauradas",
        toastCachePurged: "Cache do navegador limpo e memória otimizada",
        toastKillUnavailable: "Não foi possível encerrar o processo: API indisponível",
        toastKilled: "Processo {pid} encerrado",
        toastKillFailed: "Não foi possível encerrar o processo {pid}",
        toastKillError: "Erro ao encerrar o processo {pid}"
    },
    docViewer: {
        fallbackName: "Documento local",
        fallbackFile: "Arquivo",
        preview: "Visualização",
        raw: "Bruto",
        zoomOut: "Reduzir",
        zoomIn: "Ampliar",
        resetZoom: "Redefinir zoom",
        copyTitle: "Copiar conteúdo do arquivo",
        copied: "Copiado",
        copy: "Copiar",
        revealTitle: "Mostrar na pasta do sistema",
        loading: "Carregando documento...",
        errorTitle: "Não foi possível exibir o arquivo",
        readError: "Falha ao ler o arquivo",
        toastCopied: "Conteúdo copiado para a área de transferência",
        toastRevealed: "Arquivo exibido na pasta do sistema"
    },
    pdfViewer: {
        toggleThumbnails: "Alternar miniaturas das páginas",
        fallbackName: "Documento PDF",
        pageSingular: "{count} página",
        pagePlural: "{count} páginas",
        prevPage: "Página anterior",
        nextPage: "Próxima página",
        zoomOut: "Reduzir",
        zoomIn: "Ampliar",
        fitWidth: "Ajustar à largura",
        rotate: "Girar 90° no sentido horário",
        normalMode: "Modo normal",
        darkInvertMode: "Modo escuro invertido",
        summarize: "Resumir",
        revealTitle: "Abrir no gerenciador de arquivos",
        pagesHeader: "Páginas",
        pageNum: "Página {num}",
        loading: "Renderizando PDF com PDF.js...",
        errorTitle: "Falha ao abrir documento",
        openError: "Não foi possível abrir o documento PDF",
        extractingToast: "Extraindo texto do documento para o Qu-AI...",
        openedAiToast: "Aberto no painel Qu-AI com o texto do documento!",
        extractErrorToast: "Falha ao extrair texto: {error}",
        revealedToast: "Arquivo exibido na pasta do sistema",
        fallbackDocName: "documento",
        pageMarker: "--- Página {num} ---",
        summaryPrompt: "Forneça um resumo conciso e os pontos principais deste documento PDF ({fileName}):"
    },
    localDir: {
        parentFolderTitle: "Ir para pasta superior",
        reloadTitle: "Recarregar pasta",
        openInFileManager: "Abrir no Gerenciador de Arquivos",
        filterPlaceholder: "Filtrar arquivos neste diretório...",
        sortName: "Nome",
        sortSize: "Tamanho",
        sortDate: "Data",
        gridViewTitle: "Visualização em grade",
        listViewTitle: "Visualização em lista",
        scanning: "Verificando conteúdo do diretório...",
        errorTitle: "Não foi possível abrir a pasta",
        goParent: "Ir para diretório superior",
        emptySearch: "Nenhum arquivo corresponde à pesquisa",
        emptySearchHint: "Tente limpar o filtro de pesquisa",
        folderType: "Pasta",
        revealTitle: "Mostrar no Gerenciador de Arquivos",
        colName: "Nome",
        colModified: "Modificado",
        colSize: "Tamanho",
        itemSingular: "{count} item",
        itemPlural: "{count} itens",
        filtered: "(filtrado)",
        suiteName: "Suíte de Arquivos QBrowse",
        apiUnavailable: "API de diretórios do Electron indisponível",
        openFailed: "Falha ao abrir diretório",
        toastOpened: "Aberto no gerenciador de arquivos do sistema",
        toastRevealed: "Exibido: {name}"
    },
    tour: {
        welcomeTitle: "Bem-vindo ao QBrowse",
        welcomeSubtitle: "Escolha como você gostaria de experimentar o tour do navegador:",
        overviewBadge: "Visão geral",
        quickTitle: "Visão rápida",
        quickDesc: "Tour visual ágil pelo layout, espaços de trabalho e navegação com explicações claras.",
        startQuick: "Iniciar tour rápido",
        interactiveBadge: "Interativo",
        interactiveTitle: "Masterclass interativa",
        interactiveDesc: "Missões guiadas na interface real: clique em botões, teste o Tor e domine atalhos.",
        startInteractive: "Iniciar tour interativo",
        skipWelcome: "Pular tour e começar a navegar (Esc)",
        stepCounter: "Passo {current} de {total}",
        closeTitle: "Fechar tour (Esc)",
        skipTour: "Pular tour",
        back: "Voltar",
        finishTour: "Concluir tour",
        nextStep: "Próximo passo",
        exitToast: "Tour fechado. Pressione Ctrl+K a qualquer momento para explorar o QBrowse!",
        topBarShortcut: "Barra superior",
        steps: {
            spaces: {
                title: "Isolamento multi-espaço",
                badge: "Espaços",
                description: "Separe seus fluxos de trabalho. Cada espaço (Pessoal, Trabalho, Ghost, Tor) isola logins, cookies e abas.",
                missionInstruction: "Clique no espaço \"Trabalho\" na barra lateral ou pressione Ctrl+2",
                missionSuccess: "Espaço alternado! Suas abas, logins e cookies agora estão totalmente isolados."
            },
            splitview: {
                title: "Tela dividida nativa",
                badge: "Multitarefa",
                description: "Navegue em dois sites lado a lado sem abrir novas janelas. Perfeito para pesquisa, código e comparação.",
                missionInstruction: "Clique no ícone de Tela Dividida no topo ou pressione Ctrl+\\",
                missionSuccess: "Tela dividida alternada! Observe a segunda janela de navegador à direita."
            },
            tor: {
                title: "Rede Tor Onion integrada",
                badge: "Privacidade e Onion",
                description: "Navegue com criptografia multi-salto integrada. O QBrowse roteia sua conexão por nós Tor para acessar domínios .onion.",
                missionInstruction: "Clique no ícone do Tor na barra superior para inspecionar seu circuito ativo",
                missionSuccess: "Circuito Tor aberto! Veja seus nós de retransmissão e alterne o roteamento quando quiser."
            },
            vault: {
                title: "QVault Zero-Knowledge",
                badge: "Segurança de hardware",
                description: "Senhas mestras, passkeys e cartões são criptografados localmente com chaves de hardware e {biometric}. Nada em texto puro sai do PC.",
                missionInstruction: "Clique no ícone do QVault na barra superior para abrir seu cofre local",
                missionSuccess: "QVault aberto! Todas as credenciais estão criptografadas localmente com biometria."
            },
            shield: {
                title: "Bloqueador nativo de anúncios e rastreadores",
                badge: "Proteção",
                description: "Bloqueio acelerado por hardware interrompe telemetria, mineradores e rastreamento antes de chegarem ao dispositivo.",
                missionInstruction: "Clique no ícone do Escudo na barra superior para ver os rastreadores bloqueados",
                missionSuccess: "Inspetor QShield aberto! Veja domínios bloqueados em tempo real e gerencie a proteção."
            },
            darkmode: {
                title: "Modo escuro inteligente e temas",
                badge: "Aparência",
                description: "Personalize o visual entre temas escuros, modo claro nítido ou inversão inteligente para sites claros.",
                missionInstruction: "Clique no ícone de Tema na barra superior para ver as opções de aparência",
                missionSuccess: "Painel de temas aberto! Alterne entre escuro, claro e inversão inteligente."
            },
            toolhub: {
                title: "ToolHub e notas persistentes",
                badge: "Ferramentas",
                description: "Destaque textos em qualquer página para fixar notas persistentes, use a IA local privada e acesse o histórico da área de transferência.",
                missionInstruction: "Clique na alça do ToolHub na borda direita ou pressione Ctrl+J",
                missionSuccess: "ToolHub aberto! Anexe notas a qualquer site ou converse com sua IA local."
            },
            omnibox: {
                title: "Omnibox inteligente e paleta de comandos",
                badge: "Comando universal",
                description: "Central universal: atalhos (!yt, @github), comandos rápidos (>pdf, >clear), calculadora e acesso direto à IA local.",
                missionInstruction: "Pressione Ctrl+K ou clique na barra de endereços central para comandar o QBrowse",
                missionSuccess: "Omnibox ativada! Digite !yt para YouTube, @github para repositórios ou > para comandos."
            }
        }
    },
    reader: {
        themes: {
            dark: "Escuro",
            sepia: "Sépia",
            light: "Claro",
            midnight: "Meia-noite"
        },
        fonts: {
            serif: "Serif",
            sans: "Sans",
            mono: "Mono",
            dyslexic: "Dislexia"
        },
        widths: {
            compact: "Compacto",
            balanced: "Equilibrado",
            wide: "Largo"
        },
        exitTitle: "Sair do Modo Leitura (Esc / Ctrl+Alt+R)",
        backToWebpage: "Voltar à página",
        openOriginalTitle: "Abrir original: {url}",
        hideAudioTitle: "Ocultar reprodutor de áudio",
        listenTitle: "Ouvir artigo (Leitura em voz alta)",
        listening: "Ouvindo",
        readAloud: "Ler em voz alta",
        themeTitle: "Tema {name}",
        fontTitle: "Usar fonte {name}",
        decreaseSizeTitle: "Diminuir texto",
        increaseSizeTitle: "Aumentar texto",
        widthTitle: "Largura da coluna: {name}",
        closeTitle: "Fechar Modo Leitura",
        byAuthor: "Por {author}",
        minRead: "{minutes} min de leitura",
        wordsCount: "{count} palavras",
        prevParaTitle: "Parágrafo anterior",
        pauseTitle: "Pausar",
        playTitle: "Reproduzir",
        nextParaTitle: "Próximo parágrafo",
        audioNarration: "Narração de áudio",
        blockProgress: "Bloco {current} de {total}",
        speedTitle: "Alterar velocidade da narração",
        selectVoiceTitle: "Selecionar voz",
        voiceFallback: "Voz",
        systemVoices: "Vozes do sistema",
        stopCloseTitle: "Parar e fechar narração",
        highlightWithTitle: "Destacar com {color}",
        noteBtn: "Nota",
        copyTextTitle: "Copiar texto",
        stickyNote: "Nota adesiva",
        notePlaceholder: "Digite sua nota ou ideia...",
        deleteBtn: "Excluir",
        saveBtn: "Salvar"
    },
    toolhub: {
        title: "Tool Hub",
        snip: "Recorte",
        snipTitle: "Recorte interativo de tela (Seleção)",
        captureViewportTitle: "Capturar área visível",
        captureFullTitle: "Capturar página inteira",
        tabs: {
            notes: "Notas",
            clipboard: "Área transf.",
            ai: "IA Local",
            downloads: "Downloads"
        },
        webNotesTab: "Notas Web ({count})",
        scratchpadTab: "Rascunho",
        globalScope: "Global",
        spaceScope: "Espaço {space}",
        scratchpadTitle: "Rascunho: {name}",
        scratchpadGlobalPlaceholder: "Anote ideias globais, links... compatível com Markdown.",
        scratchpadSpacePlaceholder: "Rascunho para o espaço {space}... compatível com Markdown.",
        searchNotesPlaceholder: "Buscar destaques, notas, domínios...",
        clearSearchTitle: "Limpar pesquisa",
        allSpaces: "Todos",
        exportMd: "Exportar MD",
        exportMdTitle: "Exportar notas como Markdown (.md)",
        noWebNotesTitle: "Nenhuma nota web salva",
        noWebNotesDesc: "Destaque texto em qualquer página ou clique em \"Nota\" para manter anotações persistentes entre visitas.",
        otherDomain: "Outro",
        colorTitle: "Cor: {color}",
        jumpHighlightTitle: "Clique para ir a este destaque na página",
        editNotePlaceholder: "Adicione uma nota ou ideia...",
        deleteNote: "Excluir nota",
        deleteNoteTitle: "Excluir texto da nota",
        cancel: "Cancelar",
        saveNote: "Salvar nota",
        clickToEditNote: "Clique para editar a nota",
        addNoteTitle: "Adicionar nota",
        noteBtn: "Nota",
        copyQuoteTitle: "Copiar citação",
        jumpBtn: "Ir",
        jumpBtnTitle: "Ir para a nota na página",
        deleteHighlightTitle: "Excluir destaque",
        clipboardHeader: "Histórico da área de transferência",
        syncBtn: "Sincronizar",
        syncTitle: "Sincronizar área de transferência",
        deleteClipTitle: "Excluir item",
        clipboardEmptyTitle: "Histórico vazio",
        clipboardEmptyDesc: "Copie textos ou URLs em qualquer lugar para vê-los aqui",
        clearClipboard: "Limpar histórico",
        aiStatusRunning: "llama-server ativo (Porta 8080)",
        aiStatusDownloading: "Baixando modelo ({progress}%)...",
        aiStatusStarting: "Iniciando motor...",
        aiStatusReady: "Pronto para iniciar",
        aiStatusDownloaded: "Baixado",
        aiStatusNotDownloaded: "Modelo não baixado",
        cancelDownloadTitle: "Cancelar download",
        downloadModelTitle: "Baixar {name} ({size})",
        downloadBtn: "Baixar",
        startingBtn: "Iniciando...",
        stopBtn: "Parar",
        startBtn: "Iniciar",
        openWebUiTitle: "Abrir interface web llama.cpp",
        aiConsoleSettingsTitle: "Console llama.cpp e configurações avançadas",
        downloadingFile: "Baixando {filename}",
        downloadingWeights: "Baixando pesos...",
        noModelTitle: "Nenhum modelo de IA baixado",
        offlineBadge: "Offline",
        noModelDesc: "Baixe {name} para executar IA local rápida e privada para resumos, código e chat.",
        downloadModelSize: "Baixar modelo ({size})",
        settingsBtn: "Ajustes",
        contextBtn: "Contexto",
        searchBtn: "Busca",
        voiceBtn: "Voz",
        summarizeBtn: "Resumir",
        summarizePrompt: "Resuma esta página da web com clareza, destacando os principais pontos e conclusões com base no conteúdo.",
        attachTitle: "Anexar arquivo ou imagem",
        chatPlaceholder: "Pergunte à Gemma 4 local ou solte arquivos...",
        voiceInputTitle: "Entrada de voz (Whisper)",
        downloadsHeader: "Downloads ativos e recentes",
        itemSingular: "{count} item",
        itemPlural: "{count} itens",
        openDownloadsFolderTitle: "Abrir pasta de downloads",
        clearDownloadsTitle: "Limpar todos os downloads",
        downloadedFileFallback: "Arquivo baixado",
        snipBadge: "Recorte",
        verified: "Verificado",
        unverified: "Não verificado",
        sha256Prefix: "SHA-256: {hash}",
        saved: "Salvo",
        verifyCopyHashTitle: "Verificar e copiar checksum SHA-256",
        copyHashTitle: "SHA-256: {hash} (Clique para copiar)",
        copyImageTitle: "Copiar imagem para área de transferência",
        showInFolderTitle: "Mostrar na pasta",
        deleteDownloadTitle: "Excluir arquivo e remover da lista",
        downloadsEmptyTitle: "Nenhum download ativo",
        downloadsEmptyDesc: "Capturas de tela e arquivos baixados aparecerão aqui",
        pdfPageName: "{name} (Pág. {page})",
        pdfImageSize: "Imagem PDF",
        toasts: {
            jumpingToNote: "Indo para a nota na página...",
            exportedMarkdown: "Arquivo Markdown exportado!",
            copiedNotesMarkdown: "Notas copiadas como Markdown!",
            copiedToClipboard: "Copiado para a área de transferência!",
            clipDeleted: "Item excluído",
            clipboardCleared: "Histórico da área de transferência limpo",
            parsingPdf: "Analisando PDF visualmente: {name}",
            pdfVramLimit: "Primeiras 10 páginas de {name} convertidas em imagens (limite VRAM).",
            pdfVisualFailed: "Falha ao processar PDF visualmente. Usando extração de texto.",
            openPageFirst: "Abra primeiro uma página web para resumi-la",
            transcriptionFailed: "Falha na transcrição",
            micDenied: "Acesso ao microfone negado",
            noteRemoved: "Nota removida",
            noteUpdated: "Nota atualizada",
            copiedQuote: "Citação copiada",
            highlightRemoved: "Destaque removido",
            downloadsCleared: "Lista de downloads limpa",
            hashCopied: "Checksum SHA-256 copiado",
            hashMissing: "Não foi possível calcular o hash — arquivo ausente",
            screenshotCopied: "Captura copiada para a área de transferência",
            downloadDeleted: "Download e arquivo excluídos"
        },
        cancelled: "Cancelado",
        failed: "Falhou"
    },
    fontManager: {
        title: "Tipografia e fonte do app",
        active: "Ativa:",
        resetTitle: "Restaurar fonte padrão do sistema",
        resetToDefault: "Restaurar padrão",
        modes: {
            preset: "Predefinidas",
            google: "Google Fonts",
            system: "Sistema",
            file: "Enviar fonte"
        },
        categories: {
            all: "Todas",
            sans: "Sans",
            mono: "Mono",
            serif: "Serif"
        },
        activeFont: "Fonte ativa",
        clickToApply: "Clique para aplicar",
        googleTitle: "Usar qualquer Google Font",
        googleDesc: "Digite qualquer nome de fonte de fonts.google.com e pressione Enter para carregá-la instantaneamente.",
        googlePlaceholder: "ex. Montserrat, Space Grotesk, Syne, Cinzel...",
        applyFont: "Aplicar",
        popularGoogle: "Google Fonts populares",
        filterPlaceholder: "Filtrar lista...",
        systemTitle: "Seletor de fonte do sistema",
        systemDesc: "Digite qualquer fonte instalada no seu sistema operacional (ex. Segoe UI Variable, Calibri, Helvetica).",
        systemPlaceholder: "Nome da fonte do sistema...",
        installed: "Instalada",
        notDetected: "Não detectada",
        notDetectedTitle: "Não detectada por métricas de canvas, mas o CSS ainda tentará renderizar se disponível",
        commonOsFonts: "Fontes comuns do sistema operacional",
        dropTitle: "Clique ou arraste seu arquivo de fonte aqui",
        dropDesc: "Suporta TrueType (.ttf), OpenType (.otf), WOFF (.woff) e WOFF2 (.woff2) até 12 MB.",
        selectFile: "Selecionar arquivo local",
        activeCustomFace: "Fonte personalizada ativa",
        removeFileTitle: "Remover arquivo de fonte enviado",
        fineTuning: "Ajuste fino de tipografia",
        letterSpacing: "Espaçamento entre letras",
        weightShift: "Peso da fonte",
        fontScale: "Escala da fonte da UI",
        reset100Title: "Restaurar para 100%",
        specimen: "Espécime tipográfico",
        specimen1: "Bancos fúteis pagavam-lhe queijo, whisky e xadrez",
        specimen2: "À noite, vovô Kowalsky vê o ímã cair no pé do pingüim queixoso.",
        activeDefault: "Padrão do sistema (Segoe UI / Nativa)",
        activeGoogle: "Google Font: {name}",
        activeSystem: "Fonte do sistema: {name}",
        activeFile: "Arquivo personalizado: {name}",
        customLabel: "Personalizada",
        installedOsLabel: "Instalada no SO",
        uploadedFontLabel: "Fonte enviada",
        spacing: {
            tight: "Justo",
            normal: "Normal",
            relaxed: "Arejado",
            wide: "Amplo"
        },
        weight: {
            normal: "Normal",
            medium: "Médio",
            semibold: "Seminegrito"
        },
        osLabels: {
            "Windows 11": "Windows 11",
            Windows: "Windows",
            macOS: "macOS",
            "macOS / Multi": "macOS / Multi",
            Universal: "Universal",
            "Windows Dev": "Windows Dev",
            "Windows Terminal": "Terminal Windows",
            Casual: "Casual",
            Linux: "Linux",
            GNOME: "GNOME",
            Serif: "Serif"
        },
        presetDefaultName: "Padrão do sistema",
        presets: {
            default: {
                description: "Tipografia nativa do sistema operacional (Segoe UI / San Francisco).",
                previewText: "Aa Bb Gg 123"
            },
            inter: {
                description: "Sans moderna, limpa e altamente legível projetada para telas digitais.",
                previewText: "Neo-Grotesk Moderna"
            },
            geist: {
                description: "Tipografia de desenvolvedor da Vercel com precisão geométrica.",
                previewText: "Engenharia Minimalista"
            },
            outfit: {
                description: "Sans geométrica sofisticada com estética elegante.",
                previewText: "Geométrica Elegante"
            },
            "plus-jakarta": {
                description: "Tipografia contemporânea amigável e moderna para apps web.",
                previewText: "Contemporânea Amigável"
            },
            poppins: {
                description: "Sans geométrica arredondada com curvas suaves e energéticas.",
                previewText: "Curvas Suaves"
            },
            roboto: {
                description: "A fonte clássica do Google para Android e Material Design.",
                previewText: "Arquitetura Material"
            },
            manrope: {
                description: "Combinação de grotesca moderna e geométrica com excelente leitura.",
                previewText: "Precisão Semigeométrica"
            },
            lexend: {
                description: "Projetada cientificamente para reduzir o cansaço visual e acelerar a leitura.",
                previewText: "Leitura Sem Esforço"
            },
            "jetbrains-mono": {
                description: "Fonte de código de alto contraste feita para desenvolvedores.",
                previewText: "Estética de Código"
            },
            "fira-code": {
                description: "Fonte monoespaçada com ligaduras de programação e clareza cristalina.",
                previewText: "=> Ligaduras de Código"
            },
            "playfair-display": {
                description: "Serifa editorial de alto contraste inspirada na impressão clássica.",
                previewText: "Elegância Editorial"
            },
            merriweather: {
                description: "Serifa literária acolhedora criada para leitura confortável.",
                previewText: "Clássico Literário"
            }
        },
        errors: {
            invalidFormat: "Formato inválido. Envie arquivos .ttf, .otf, .woff ou .woff2.",
            tooLarge: "Arquivo muito grande. O tamanho máximo é 12 MB.",
            readFailed: "Falha ao ler o arquivo de fonte. Tente outro arquivo."
        },
        toasts: {
            presetSet: "Fonte do app definida para {name}",
            googleApplied: "Google Font \"{name}\" aplicada ao QBrowse",
            systemApplied: "Fonte do sistema \"{name}\" aplicada",
            fileLoaded: "Arquivo de fonte \"{name}\" carregado com sucesso"
        }
    },
    aiSettings: {
        title: "Motor de IA llama.cpp",
        status: {
            online: "Online (llama-server)",
            starting: "Iniciando...",
            updating: "Atualizando motor...",
            error: "Erro do motor",
            stopped: "Parado"
        },
        syncTitle: "Verificar e sincronizar motor nativo llama.cpp (b11796 com suporte Gemma 4)",
        updatingBtn: "Atualizando...",
        syncBtn: "Sincronizar (b11796)",
        subtitle: "Executor LLM local rápido e privado com suporte nativo a Gemma 4, Qwen 3.5 e Bielik 11B GGUF.",
        downloadingModel: "Baixando modelo ({progress}%)",
        connectingCdn: "Conectando à CDN...",
        cancel: "Cancelar",
        downloadBtn: "Baixar {name} ({size})",
        startingBtn: "Iniciando llama-server...",
        stopBtn: "Parar llama-server",
        startBtn: "Iniciar motor llama-server",
        defaultStartError: "llama-server encontrou um erro ao iniciar o modelo.",
        dismiss: "Dispensar",
        updateEngineBtn: "Atualizar motor IA",
        genSpeed: "Velocidade de geração",
        tokPerSec: "tok/s",
        contextWindow: "Janela de contexto",
        tokens: "tokens",
        gpuOffload: "Carga na GPU",
        layers: "camadas",
        activeModelTitle: "Modelo GGUF ativo",
        loadCustomGguf: "Carregar arquivo .GGUF...",
        loadCustomProjector: "Carregar projetor...",
        customModelPrefix: "Modelo personalizado: {path}",
        customProjectorPrefix: "Projetor personalizado: {path}",
        reset: "Redefinir",
        downloadedBadge: "Baixado",
        downloadingTarget: "Baixando {target}",
        visionProjector: "Projetor de visão...",
        languageModel: "Modelo de linguagem...",
        weights: "pesos...",
        modelReady: "Modelo pronto para uso",
        downloadModelFile: "Baixar arquivo do modelo ({size})",
        overridesTitle: "Parâmetros do llama-server",
        autoDetectBtn: "Autodetectar hardware",
        cpuThreadsLabel: "Threads CPU (-t): {threads}",
        contextSizeLabel: "Tamanho do contexto (-c)",
        tokensOption: "{n} tokens",
        contextBadges: {
            compact: "Compacto",
            default: "Padrão",
            extended: "Estendido",
            max: "Máximo"
        },
        gpuLayersLabel: "Camadas na GPU (-ngl): {layers}",
        dataProcessingTitle: "Processamento de dados",
        parsePdfTitle: "Analisar PDF como imagem",
        parsePdfDesc: "Converte páginas PDF em imagens ao soltar no chat em vez de extrair texto bruto. Ideal para modelos Vision Gemma 4 e Qwen 3.5.",
        consoleTitle: "Console de terminal llama-server (Stdout ao vivo)",
        copyOutputTitle: "Copiar saída do terminal",
        clearConsoleTitle: "Limpar console",
        consoleEmpty: "[Console do llama-server inicializado. Aguardando saída do servidor...]",
        modelWord: "Modelo",
        visionWord: "Visão",
        models: {
            "gemma-4-e2b": "Modelo Google Gemma 4 E2B Instruct GGUF com suporte completo a visão multimodal.",
            "gemma-4-e4b": "Modelo Google Gemma 4 E4B de alto raciocínio com visão multimodal completa.",
            "qwen-3.5-4b": "Modelo Alibaba Qwen 3.5 4B com visão multimodal, raciocínio, geração de código e suporte multilíngue.",
            "bielik-11b-v3.1": "Modelo polonês e europeu 11B da SpeakLeash com alta precisão linguística e raciocínio."
        },
        toasts: {
            customModelLoaded: "Modelo personalizado carregado: {name}",
            demoModelLoaded: "Caminho de modelo de demonstração carregado!",
            customProjectorLoaded: "Projetor de visão carregado: {name}",
            demoProjectorLoaded: "Caminho de projetor de demonstração carregado!",
            updatingEngine: "Atualizando motor nativo llama.cpp...",
            engineUpdated: "Motor llama.cpp atualizado para a versão b11796!",
            engineUpdateFailed: "Falha ao atualizar o motor: {error}",
            unknownError: "Erro desconhecido",
            logsCopied: "Logs do llama-server copiados!",
            hardwareDetected: "Hardware detectado: {threads} threads, {ram} GB RAM",
            hardwareDefault: "Hardware detectado: otimizações padrão aplicadas",
            resizingContext: "Redimensionando janela de contexto para {tokens} tokens..."
        }
    },
    adblockImport: {
        title: "Importar lista de bloqueio do GitHub / Web",
        subtitle: "Analise arquivos hosts, listas raw do GitHub ou regras Adblock automaticamente.",
        closeTitle: "Fechar",
        modeUrl: "URL remota / GitHub",
        modePaste: "Colar texto bruto",
        urlLabel: "URL da lista (GitHub raw, Gist ou hosts)",
        githubRawBadge: "GitHub Raw",
        githubRawTitle: "Link do GitHub detectado e convertido automaticamente para formato raw",
        fetching: "Buscando...",
        fetchParse: "Buscar e analisar",
        popularLists: "Listas populares da comunidade",
        pasteLabel: "Cole arquivo hosts, regras ABP ou lista de domínios",
        pastePlaceholder: "# Cole qualquer formato abaixo:\n0.0.0.0 tracking.evil.com\n127.0.0.1 ads.adserver.org\n||telemetry.network.io^\nanalytics.badsite.com",
        parsing: "Analisando...",
        parseDomains: "Analisar domínios",
        back: "Voltar",
        backTitle: "Voltar para a origem (Esc)",
        readyToImport: "Pronto para importar",
        kbSource: "Fonte de {kb} KB",
        validDomains: "Domínios válidos",
        newUnique: "Novos únicos",
        duplicatesFiltered: "Duplicados filtrados",
        linesAnalyzed: "Linhas analisadas",
        extractedSample: "Amostra de domínios extraídos ({count})",
        searchSamplePlaceholder: "Buscar na amostra...",
        moreDomains: "+ mais {count} domínios",
        backToSource: "Voltar à origem",
        cancel: "Cancelar",
        replaceList: "Substituir lista inteira",
        replaceListTitle: "Substitui sua lista personalizada atual pelos domínios analisados",
        importN: "Importar {count} domínios",
        importDomains: "Importar domínios",
        pastedSourceLabel: "Texto colado",
        errors: {
            invalidUrl: "Insira uma URL de lista válida.",
            fetchFailed: "Falha ao buscar lista remota",
            noValidFromUrl: "Nenhum domínio válido encontrado nesta fonte.",
            downloadError: "Erro ao baixar lista remota",
            emptyPaste: "Cole alguns domínios ou regras hosts primeiro.",
            noValidFromText: "Nenhum domínio válido extraído do texto.",
            parseError: "Erro ao analisar o texto"
        },
        presets: {
            stevenblack: {
                desc: "Proteção abrangente mantida pela comunidade contra adware e malware.",
                badge: "Recomendada"
            },
            "oisd-basic": {
                desc: "Lista leve sem falsos positivos bloqueando rastreamento web e móvel.",
                badge: "Leve"
            },
            "adguard-trackers": {
                desc: "Lista especializada contra scripts analíticos e de telemetria.",
                badge: "Privacidade"
            },
            peterlowe: {
                desc: "Lista padrão clássica de servidores de anúncios ativos.",
                badge: "Rápida"
            },
            danpollock: {
                desc: "Lista confiável zero-host bloqueando telemetria, spam e sites maliciosos.",
                badge: "Clássica"
            }
        }
    },
    studio: {
        title: "Estúdio de Predefinições",
        subtitle: "Reencaixe componentes visualmente, molde curvaturas, personalize temas e gerencie predefinições.",
        tabCanvas: "Tela",
        tabPresets: "Predefinições",
        closeAria: "Fechar Estúdio de Predefinições",
        dockLeftSidebar: "Acoplar barra lateral à esquerda",
        dockRightSidebar: "Acoplar barra lateral à direita",
        dockTopBar: "Acoplar barra de navegação no topo",
        dockBottomBar: "Acoplar barra de navegação na base",
        searchBarPlaceholder: "Pesquisar na web ou digitar comando...",
        toolhubDockTitle: "Posição do ToolHub: {pos} (Clique ou arraste para trocar)",
        legendDock: "Barra:",
        legendBarValue: "{pos}",
        legendSidebar: "Lateral:",
        legendToolhub: "ToolHub:",
        legendSummary: "Curvatura: {curvature} · Omnibox: {omnibox} · Abas: {tabs}",
        layoutControls: "Controles de layout",
        resetTitle: "Redefinir rascunho para configuração atual do navegador",
        reset: "Redefinir",
        editingLabel: "Editando:",
        cancelEditTitle: "Cancelar edição e criar nova predefinição",
        cancel: "Cancelar",
        sidebarMode: "Modo da barra lateral",
        sidebarModes: {
            classic: "Clássica",
            floating: "Flutuante",
            compact: "Compacta",
            hidden: "Oculta"
        },
        windowCurvature: "Curvatura da janela",
        curvatures: {
            default: "Padrão",
            cohesive: "Coesa",
            square: "Reta"
        },
        omniboxArch: "Estilo da Omnibox",
        omniboxStyles: {
            capsule: "Cápsula",
            wide: "Ampla",
            minimal: "Mínima"
        },
        tabPresentation: "Estilo das abas",
        tabStyles: {
            pills: "Pílulas",
            compact: "Compactas",
            cards: "Cartões"
        },
        windowControlsStyle: "Estilo dos controles da janela",
        controlsStyles: {
            mac: "macOS",
            windows: "Windows",
            minimal: "Minimal"
        },
        windowControlsLayout: "Ordem dos controles da janela",
        controlsOrders: {
            auto: "Canto inteligente",
            "close-first": "Fechar primeiro",
            "minimize-first": "Minimizar primeiro"
        },
        themeLabel: "Tema",
        themes: {
            dark: "Escuro",
            light: "Claro"
        },
        uiScaleLabel: "Escala da UI",
        uiScales: {
            comfortable: "Normal",
            compact: "Compacta"
        },
        accentSwatchLabel: "Cor de destaque",
        openColorPickerTitle: "Abrir seletor de cores do sistema",
        saveChanges: "Salvar alterações",
        applyLive: "Aplicar ao vivo",
        saveAsNew: "Salvar como nova",
        applyToBrowser: "Aplicar ao navegador",
        saveAsCustom: "Salvar como predefinição",
        searchPresetsPlaceholder: "Pesquisar predefinições...",
        filterAll: "Todas",
        filterBuiltin: "Integradas",
        filterCustom: "Próprias ({count})",
        saveActiveSetup: "Salvar layout atual",
        activeBadge: "Ativa",
        editingBadge: "(Editando)",
        reapply: "Reaplicar",
        apply: "Aplicar",
        editInStudio: "Editar no Estúdio",
        customize: "Personalizar",
        editPresetTitle: "Editar predefinição no estúdio",
        customizePresetTitle: "Personalizar layout no estúdio",
        duplicateTitle: "Duplicar predefinição",
        deleteTitle: "Excluir predefinição personalizada",
        editCustomModalTitle: "Editar predefinição personalizada",
        saveCustomModalTitle: "Salvar como predefinição",
        presetNameLabel: "Nome da predefinição",
        presetNamePlaceholder: "ex. Fluxo Ergonômico, Arc Minimalista",
        presetDescLabel: "Descrição curta",
        presetDescPlaceholder: "Breve descrição desta configuração...",
        presetIconLabel: "Ícone",
        createPreset: "Criar predefinição",
        deleteConfirmTitle: "Excluir predefinição?",
        deleteConfirmDescBefore: "Tem certeza de que deseja excluir ",
        deleteConfirmDescAfter: "? Isso não pode ser desfeito.",
        deletePresetBtn: "Excluir",
        posTop: "Topo",
        posBottom: "Base",
        posLeft: "Esquerda",
        posRight: "Direita",
        moveTo: "Mover para {pos}",
        draggableNavTitle: "Barra arrastável: arraste para topo/base ou clique para alternar",
        draggableSidebarTitle: "Barra lateral arrastável: arraste entre esquerda e direita",
        swapTo: "Trocar para {pos}",
        miniTab: "Aba #{num}",
        miniCardView: "Cartão #{num}",
        miniActiveSpaceTab: "Aba do espaço ativo",
        miniSidebarPos: "Lateral ({pos})",
        layoutTagFormat: "{bar} · {sidebar}",
        layoutSummaryFormat: "{tag} · {toolhub}",
        topBarLabel: "Barra superior",
        bottomBarLabel: "Barra inferior",
        leftSidebarLabel: "Barra esquerda",
        rightSidebarLabel: "Barra direita",
        leftToolhubLabel: "ToolHub esquerdo",
        rightToolhubLabel: "ToolHub direito",
        tabsHighlight: "Abas {style}",
        compactScaleLabel: "Escala compacta",
        comfortableScaleLabel: "Escala confortável",
        defaultCustomName: "Predefinição própria",
        defaultCustomDesc: "Configuração personalizada",
        defaultNewNameFormat: "{bar} {side}",
        defaultNewNameArc: "Arc",
        defaultNewNameFlow: "Fluxo",
        defaultNewDescFormat: "Layout próprio: {bar}, {sidebar}, abas {tabs}",
        toasts: {
            applied: "Layout aplicado ao navegador!",
            reset: "Rascunho redefinido para o layout atual",
            editingPreset: "Editando \"{name}\" no Estúdio",
            loadedPreset: "\"{name}\" carregado na tela",
            switchedNewDraft: "Alternado para novo rascunho"
        }
    },
    setup: {
        strictOfflineTitle: "Zero solicitações em segundo plano (Offline estrito)",
        strictOfflineDesc: "Desative todo o tráfego de rede opcional em segundo plano (verificações de atualização, atualização de filtros, sugestões ao vivo, favicons remotos e sincronização na nuvem).",
        headerTitle: "Configuração do QBrowse",
        headerSubtitle: "Assistente de personalização",
        steps: {
            language: {
                label: "Idioma",
                desc: "Idioma da UI"
            },
            presets: {
                label: "Estilo e temas",
                desc: "Experiência"
            },
            import: {
                label: "Importar",
                desc: "Favoritos e senhas"
            },
            privacy: {
                label: "Privacidade",
                desc: "Escudos e Tor"
            },
            default: {
                label: "Padrão",
                desc: "Integração OS"
            },
            sync: {
                label: "Conta e Sync",
                desc: "Nuvem ou Local"
            }
        },
        chooseSetupTitle: "Escolha sua configuração",
        chooseSetupDesc: "Selecione um layout inicial sob medida. Você pode ajustar cada painel quando quiser.",
        customLayoutCta: "Layout personalizado? Estúdio →",
        themeLabel: "Tema",
        dark: "Escuro",
        light: "Claro",
        accentLabel: "Destaque",
        step2Badge: "Etapa 2 de 5",
        step2Title: "Traga seus dados e cofre",
        step2Desc: "Importe favoritos e migre suas senhas do Bitwarden, Proton Pass, Chrome ou Firefox.",
        tabBookmarks: "Favoritos",
        tabVault: "Cofre de Senhas",
        bookmarksFound: "{count} favoritos encontrados",
        notDetected: "Não detectado neste dispositivo",
        imported: "Importado",
        importing: "Importando...",
        importBookmarks: "Importar favoritos",
        scanningBrowsers: "Procurando navegadores instalados...",
        htmlImported: "Arquivo HTML importado ({count} itens)",
        uploadHtml: "Enviar arquivo HTML de favoritos (.html)",
        vaultComplete: "Migração concluída",
        vaultImportedSummary: "{count} itens importados de {source} para o QVault!",
        importAnother: "Importar outro",
        exportCsvJson: "Exportar como .CSV ou .JSON",
        parsingVault: "Analisando arquivo...",
        uploadVault: "Enviar exportação (.csv ou .json)",
        compatibleManagers: "Compatível com Bitwarden, Proton Pass, Google Chrome, Edge, Brave e 1Password",
        step3Badge: "Etapa 3 de 5",
        step3Title: "Blinde sua privacidade",
        step3Desc: "O QBrowse bloqueia rastreadores, remove anúncios invasivos e roteia tráfego pela rede Tor.",
        privacyOptimizedBadge: "Predefinição: Privacidade otimizada",
        adblockTitle: "Escudo nativo Ghostery",
        adblockDesc: "Bloqueia rastreadores, telemetria e anúncios sem deixar as páginas lentas.",
        torTitle: "Espaço Tor Onion Routing",
        torDesc: "Habilita navegação .onion e circuitos criptografados de múltiplos nós a qualquer momento.",
        ready: "Pronto",
        step4Badge: "Etapa 4 de 5",
        step4Title: "Definir como padrão",
        step4Desc: "Abra links externos em espaços isolados separando trabalho e navegação pessoal automaticamente.",
        isDefaultTitle: "O QBrowse é seu navegador padrão!",
        makeDefaultTitle: "Torne o QBrowse seu navegador principal",
        isDefaultDesc: "Todos os links e arquivos HTML abrirão automaticamente no QBrowse.",
        makeDefaultDesc: "Gerencia links http://, https:// e arquivos HTML com integração total do sistema.",
        osLabels: {
            darwin: "Ajustes do Sistema",
            linux: "Aplicativos padrão",
            win32: "Aplicativos padrão do Windows"
        },
        defaultHint: "{label} aberto — selecione o QBrowse na janela do sistema para confirmar.",
        openOsSettings: "Abrir {label}",
        defaultSet: "Definido como padrão",
        openingSettings: "Abrindo ajustes...",
        setAsDefault: "Definir como navegador padrão",
        step5Badge: "Etapa 5 de 5 • Perfil e Cloud Sync",
        step5Title: "Escolha como navegar",
        step5Desc: "Soberania total: navegue 100% offline com criptografia de hardware local ou crie uma conta gratuita de Cloud Sync.",
        zeroTelemetry: "Zero telemetria",
        localProfile: "Perfil local",
        localProfileDesc: "100% offline. Senhas, histórico e abas ficam criptografados localmente por chaves de hardware. Sem conta.",
        e2eEncrypted: "Criptografia E2E",
        cloudSync: "QBrowse Cloud Sync",
        cloudSyncDesc: "Sincronize cofre, espaços, abas fixadas e favoritos entre computadores via Firebase.",
        localReadyTitle: "Perfil local pronto para iniciar",
        localReadyDesc: "Seus favoritos, credenciais e espaços ficam apenas neste dispositivo. Você pode ativar o Cloud Sync depois nas Configurações.",
        takeTour: "Fazer o tour interativo",
        startDirectly: "Começar a navegar",
        activeSync: "Sync ativa",
        cloudLinked: "Armazenamento em nuvem criptografado E2E vinculado",
        signOut: "Sair",
        activeSyncDesc: "Seus favoritos, abas e cofre criptografado são sincronizados em tempo real em todos os seus dispositivos.",
        signIn: "Entrar",
        existingAccount: "(Conta existente)",
        register: "Registrar",
        newAccount: "(Nova conta)",
        registerSubtitle: "Crie uma nova conta QBrowse para sincronizar entre dispositivos.",
        signInSubtitle: "Entre para sincronizar seus favoritos, espaços e cofre.",
        switchToSignIn: "Ir para Entrar",
        emailLabel: "E-mail",
        emailPlaceholder: "nome@exemplo.com",
        createPassLabel: "Criar senha (mín. 6 caracteres)",
        accountPassLabel: "Senha da conta",
        min6Chars: "Pelo menos 6 caracteres",
        confirmPassLabel: "Confirmar senha",
        passwordsMatch: "As senhas coincidem",
        passwordsMismatch: "As senhas não coincidem",
        useAccountAsMaster: "Usar senha da conta como chave mestra",
        masterDerivedDesc: "Deriva chaves AES-GCM de 256 bits diretamente da sua senha de login.",
        masterSeparateDesc: "Usando uma frase secreta de criptografia separada.",
        customMasterLabel: "Frase secreta mestra personalizada",
        customMasterPlaceholder: "Digite uma frase secreta única para o cofre...",
        creatingAccount: "Criando conta criptografada...",
        signingInSyncing: "Entrando e sincronizando...",
        createAccountBtn: "Criar conta e ativar Cloud Sync",
        signInBtn: "Entrar e ativar Cloud Sync",
        alreadyRegistered: "Já tem conta no QBrowse?",
        signInHere: "Entre aqui",
        newToSync: "Novo no QBrowse Cloud Sync?",
        createFreeAccount: "Criar conta gratuita (Registrar)",
        skipSyncLocal: "Pular Cloud Sync e continuar com perfil local",
        skipSyncComplete: "Pular Sync e concluir",
        vaultModalTitle: "Proteja seu cofre importado",
        vaultModalDesc: "Digite ou crie uma senha mestra para criptografar suas credenciais.",
        masterPassLabel: "Senha mestra",
        masterPassPlaceholder: "Digite a senha mestra...",
        confirmMasterLabel: "Confirmar senha mestra",
        confirmMasterPlaceholder: "Confirmar senha...",
        cancel: "Cancelar",
        encryptImport: "Criptografar e importar",
        bookmarkFallback: "Favorito",
        htmlFileFallback: "arquivo HTML",
        toasts: {
            enterEmail: "Digite um endereço de e-mail.",
            validEmail: "Digite um e-mail válido (ex. nome@dominio.com).",
            passMin6: "A senha deve ter pelo menos 6 caracteres.",
            confirmPassReq: "Confirme sua senha.",
            passMismatch: "As senhas não coincidem.",
            signedIn: "Conectado ao QBrowse Cloud Sync!",
            registered: "Conta registrada e Cloud Sync ativo!",
            bookmarksImported: "{count} favoritos importados com sucesso!",
            importFailed: "Falha na importação.",
            couldNotImportBookmarks: "Não foi possível importar os favoritos.",
            htmlImported: "{count} favoritos importados de {filename}!",
            htmlImportFailed: "Falha ao importar favoritos HTML.",
            noCredentials: "Nenhuma credencial encontrada no arquivo",
            passwordsImported: "{count} senhas importadas de {source}!",
            vaultImportFailed: "Falha na importação: {error}",
            passMin4: "A senha deve ter pelo menos 4 caracteres",
            vaultPassMismatch: "As senhas não coincidem",
            incorrectMasterPass: "Senha mestra incorreta para o cofre existente",
            vaultImportError: "Erro de importação: {error}",
            nowDefault: "QBrowse agora é seu navegador padrão!",
            openingWinDefault: "Abrindo Aplicativos padrão do Windows. Escolha o QBrowse.",
            openingOsDefault: "Abrindo {label}. Selecione o QBrowse como padrão.",
            couldNotOpenDefault: "Não foi possível abrir as configurações de navegador padrão."
        }
    },
    flags: {
        title: "Experimentos",
        subtitle: "Ajuste recursos experimentais, pipelines gráficos de hardware, cifras pós-quânticas e isolamento Tor.",
        resetAll: "Restaurar tudo",
        warningTitle: "Atenção: recursos experimentais!",
        warningBody: "Estas opções alteram o motor Chromium V8, composição gráfica ou parâmetros TLS. É necessário reiniciar o navegador.",
        searchPlaceholder: "Buscar flags (ex. GPU, Kyber, QUIC, DoH, bfcache)...",
        tabAvailable: "Disponíveis ({count})",
        tabUnavailable: "Indisponíveis ({count})",
        categories: {
            All: "Todas",
            Performance: "Desempenho",
            "Hardware & Graphics": "Hardware e Gráficos",
            "Web Standards & Engine": "Padrões Web e Motor",
            Security: "Segurança",
            Networking: "Rede",
            "Media & UI": "Mídia e Interface",
            "AI & Tools": "IA e Ferramentas",
            Experimental: "Experimental"
        },
        statuses: {
            Stable: "Estável",
            Beta: "Beta",
            Experimental: "Experimental"
        },
        options: {
            default: "Padrão",
            enabled: "Ativado",
            disabled: "Desativado"
        },
        emptyMatch: "Nenhuma flag disponível corresponde a \"{search}\"",
        reasonPrefix: "Motivo: {reason}",
        unavailableBadge: "Indisponível",
        relaunchMsg: "Suas alterações entrarão em vigor ao reiniciar o QBrowse.",
        relaunchBtn: "Reiniciar",
        toasts: {
            reset: "Todas as flags experimentais foram restauradas",
            relaunching: "Reiniciando QBrowse com as flags atualizadas..."
        },
        items: {
            "prefer-high-performance-gpu": {
                name: "Preferir GPU de alto desempenho",
                description: "Direciona renderização WebGL, Canvas e 3D para a GPU dedicada em sistemas multi-GPU. Desativado no modo Eco."
            },
            "unlock-frame-rate": {
                name: "Taxa de quadros desbloqueada (Benchmark)",
                description: "Desativa V-Sync para benchmarks sintéticos de FPS. Pode causar tearing e maior consumo."
            },
            "ignore-gpu-blocklist": {
                name: "Ignorar lista de bloqueio de GPU",
                description: "Ignora bloqueios de software do Chromium e força aceleração de hardware em drivers antigos."
            },
            "experimental-web-platform": {
                name: "Recursos experimentais da plataforma Web",
                description: "Ativa APIs web experimentais em desenvolvimento no Chromium."
            },
            "gpu-rasterization": {
                name: "Rasterização GPU e aceleração de composição",
                description: "Acelera rasterização e composição de páginas via GPU dedicada em vez da CPU."
            },
            "smooth-scrolling": {
                name: "Motor de rolagem suave",
                description: "Habilita animações fluidas de rolagem via mouse, touchpad ou teclado."
            },
            "zero-copy-rasterizer": {
                name: "Rasterizador GPU Zero-Copy (GpuMemoryBuffer)",
                description: "Grava diretamente em texturas compartilhadas da GPU sem cópias na CPU."
            },
            "enable-vulkan": {
                name: "Backend gráfico e compositor Vulkan",
                description: "Usa a API Vulkan para composição e renderização em GPUs compatíveis."
            },
            "back-forward-cache": {
                name: "Cache Avançar/Voltar (bfcache)",
                description: "Mantém instantâneos em memória para navegação instantânea entre páginas recentes."
            },
            "canvas-oop-rasterization": {
                name: "Rasterização Canvas 2D fora do processo",
                description: "Executa operações Canvas 2D no processo dedicado da GPU."
            },
            "enable-drdc": {
                name: "Detecção dinâmica de alta taxa de atualização (120/144/240 Hz)",
                description: "Sincroniza quadros e V-Sync dinamicamente com telas ProMotion e gamers."
            },
            "auto-suspend-tabs": {
                name: "Suspensão automática de abas (Economia RAM)",
                description: "Descarrega abas inativas após 15 minutos para economizar RAM e bateria."
            },
            "parallel-download-engine": {
                name: "Downloads paralelos multithread",
                description: "Divide arquivos grandes em múltiplas requisições HTTP simultâneas."
            },
            "lazy-image-loading": {
                name: "Carregamento lento de imagens e quadros",
                description: "Adia o carregamento de imagens fora da tela até que entrem no campo de visão."
            },
            "enable-tls13-kyber": {
                name: "Criptografia pós-quântica para TLS (Kyber768 / ML-KEM)",
                description: "Ativa troca de chaves híbrida resistente a ataques quânticos no TLS 1.3."
            },
            "enable-encrypted-client-hello": {
                name: "Encrypted Client Hello (ECH / SNI criptografado)",
                description: "Criptografa o nome do servidor (SNI) no handshake TLS contra ISPs e firewalls."
            },
            "strict-origin-isolation": {
                name: "Isolamento estrito Site-por-Processo",
                description: "Impõe processos isolados com memória separada por origem contra Spectre/Meltdown."
            },
            "webrtc-ip-protection": {
                name: "Proteção de IP local e vazamento STUN no WebRTC",
                description: "Restringe candidatos ICE do WebRTC para ocultar seu IP real local ou público."
            },
            "enable-dns-over-https": {
                name: "DNS-over-HTTPS estrito (Cloudflare/Quad9)",
                description: "Criptografa consultas DNS via HTTPS (porta 443) evitando interceptação."
            },
            "disable-hyperlink-auditing": {
                name: "Desativar auditoria de hiperlinks (<a ping>)",
                description: "Bloqueia pings POST silenciosos de rastreamento ao clicar em links."
            },
            "enable-fingerprint-randomization": {
                name: "Ruído anti-impressão digital em Canvas e WebAudio",
                description: "Adiciona ruído pseudoaleatório para impedir identificação única do dispositivo."
            },
            "enable-font-enumeration-shield": {
                name: "Escudo de enumeração de fontes locais",
                description: "Impede que sites leiam suas fontes instaladas para criar rastreadores."
            },
            "aggressive-tracker-blocker": {
                name: "Remoção agressiva de parâmetros de rastreio URL",
                description: "Remove utm_source, gclid, fbclid e bloqueia pixels de rastreamento."
            },
            "enable-subresource-filter": {
                name: "Filtro de sub-recursos contra sobreposições abusivas",
                description: "Detecta e bloqueia clickjacking e avisos enganosos de download."
            },
            "enable-quic": {
                name: "Protocolo experimental QUIC e HTTP/3",
                description: "Habilita transporte HTTP/3 via UDP com handshakes zero-RTT."
            },
            "tor-stream-isolation": {
                name: "Isolamento de circuito Tor por domínio (IsolateDestAddr)",
                description: "Atribui um circuito de saída distinto por domínio no espaço Tor."
            },
            "dns-prefetching": {
                name: "Pré-resolução preditiva de DNS",
                description: "Resolve antecipadamente IPs de links visíveis para reduzir latência."
            },
            "heavy-ad-intervention": {
                name: "Intervenção contra anúncios pesados",
                description: "Descarrega iframes de anúncios que consumam mais de 4 MB ou 60s de CPU."
            },
            "cross-origin-isolation": {
                name: "Política COOP e SharedArrayBuffer",
                description: "Habilita memória compartilhada WebAssembly de alta precisão."
            },
            "document-pip-api": {
                name: "API Document Picture-in-Picture",
                description: "Permite janelas flutuantes com HTML arbitrário, vídeos e widgets."
            },
            "force-dark-contents": {
                name: "Modo escuro automático em conteúdo web",
                description: "Gera tema escuro preservando luminosidade para sites claros."
            },
            "overlay-scrollbars": {
                name: "Barras de rolagem flutuantes minimalistas",
                description: "Substitui barras tradicionais por indicadores finos que somem automaticamente."
            },
            "enable-webgpu": {
                name: "API WebGPU de próxima geração",
                description: "Acesso direto de baixo custo à GPU para redes neurais, 3D e shaders."
            },
            "tab-audio-muting": {
                name: "Silenciar áudio da aba com um clique",
                description: "Adiciona ícone interativo de alto-falante nas abas para silenciar imediatamente."
            },
            "webrtc-pipewire": {
                name: "Captura de tela PipeWire (Linux Wayland)",
                description: "Ativa compartilhamento de tela via portal PipeWire no GNOME e KDE."
            },
            "hdr-compositing": {
                name: "Composição de cores HDR",
                description: "Habilita gama ampla de 10 bits (Rec.2020 / DCI-P3) em telas compatíveis."
            },
            "local-ai-assistant": {
                name: "Aceleração VRAM para LLMs GGUF locais (llama.cpp)",
                description: "Carrega pesos Gemma e Llama 3 na VRAM da GPU para resumos rápidos e privados."
            },
            "experimental-split-screen-gestures": {
                name: "Gestos cinéticos de tela dividida",
                description: "Arraste abas para as bordas da janela para dividir a tela instantaneamente."
            },
            "enable-reader-mode": {
                name: "Modo de leitura sem distrações",
                description: "Extrai texto de artigos em layout limpo sem barras laterais ou anúncios."
            },
            "auto-password-generation": {
                name: "Geração criptográfica de senhas fortes",
                description: "Propõe senhas de 128 bits protegidas pelo QVault em formulários de cadastro."
            },
            "tab-groups-auto-clustering": {
                name: "Agrupamento inteligente de abas por domínio",
                description: "Sugere agrupar abas abertas com base no domínio e uso do espaço."
            },
            "touch-ui-layout": {
                name: "Modo de interface tátil para tablets",
                description: "Amplia barras e margens para toque. Desativado em desktops.",
                reason: "Requer detecção de hardware de tela sensível ao toque."
            },
            "eye-tracking-gaze-scroll": {
                name: "Navegação por rastreamento ocular",
                description: "Rola a página com base no olhar. Requer sensores infravermelhos dedicados.",
                reason: "Nenhum sensor ocular compatível detectado."
            },
            "cellular-data-saver": {
                name: "Economizador de dados móveis",
                description: "Comprime imagens via proxies remotos. Desativado por privacidade.",
                reason: "Desativado por padrão para preservar a privacidade Tor e HTTPS E2E."
            }
        }
    }
};

const zh = {
    common: {
        incognito: "无痕模式",
        selectOption: "选择选项...",
        colors: {
            accent: "强调色",
            yellow: "黄色",
            green: "绿色",
            blue: "蓝色",
            pink: "粉色"
        }
    },
    wallpaperPreview: {
        alt: "壁纸预览",
        badge: "预览"
    },
    presets: {
        names: {
            balanced: "均衡模式",
            developer: "开发者模式",
            classic_reverse: "现代 Arc",
            bottom_bar: "人体工学流",
            minimalist: "极简专注",
            privacy: "隐私哨兵"
        },
        taglines: {
            balanced: "个人与工作双工作区，搭配 Google 搜索。",
            developer: "多工作区隔离，集成 GitHub 实时 PR 跟踪。",
            classic_reverse: "右侧对齐标签树与清爽阅读视图。",
            bottom_bar: "底部地址栏设计，单手拇指操作更顺手。",
            minimalist: "单一工作区搭配紧凑界面，专注无干扰。",
            privacy: "严格拦截追踪器，默认 DuckDuckGo 搜索。"
        },
        descriptions: {
            balanced: "个人与工作双工作区、标准隐私保护与 Google 搜索。",
            developer: "多工作区隔离、GitHub 实时 PR 跟踪与开发者流程。",
            classic_reverse: "右侧导航树、镜像抽屉与专注标签流。",
            bottom_bar: "底部地址栏导航，带来符合人体工学的流畅浏览体验。",
            minimalist: "单一工作区、右侧边栏与极致紧凑的无干扰界面。",
            privacy: "严格追踪拦截、镜像控制、DuckDuckGo 与一键 Tor 洋葱路由。"
        },
        customTaglineFallback: "自定义工作区与布局配置。",
        accents: {
            amberGold: "琥珀金",
            ocean: "海洋蓝",
            skyBlue: "天蓝色",
            cyberEmerald: "赛博翠绿",
            electricBlue: "电光蓝",
            royalViolet: "皇家紫",
            roseGold: "玫瑰金",
            sunsetOrange: "日落橙",
            cyberCyan: "赛博青",
            slateGray: "板岩灰"
        }
    },
    addPin: {
        title: "固定应用到侧边栏",
        subtitle: "添加快速访问的应用或网站快捷方式",
        defaultAppName: "应用名称",
        appNameLabel: "应用名称 / 标题",
        appNamePlaceholder: "例如 GitHub、Gemini...",
        urlLabel: "网址 / 域名 *",
        urlPlaceholder: "例如 github.com 或 https://gemini.google.com",
        quickPresets: "常用预设",
        cancel: "取消",
        pinApp: "固定应用"
    },
    passkey: {
        biometrics: {
            darwin: "Touch ID",
            linux: "系统生物识别",
            win32: "Windows Hello"
        },
        hints: {
            darwin: "轻触 Touch ID 传感器或输入 macOS 密码",
            linux: "轻触指纹传感器或输入系统密码",
            win32: "轻触指纹传感器或输入 Windows PIN 码"
        },
        cancelDenyTitle: "取消并拒绝",
        verifiedTitle: "身份验证成功！",
        scanningTitle: "正在扫描 {biometric}...",
        autofillTitle: "自动填充已保存密码",
        passkeyTitle: "通行密钥验证",
        verifiedAutofillDesc: "密码库已解锁并已填充凭据",
        verifiedPasskeyDesc: "通行密钥已释放并完成签名",
        requireAutofillDesc: "需要验证身份以解锁密码库并自动填充",
        requirePasskeyDesc: "需要验证身份以使用通行密钥登录",
        passwordBadge: "密码",
        passkeyBadge: "通行密钥",
        accountLabel: "账号：",
        savedLogin: "已保存登录",
        passkeyUser: "通行密钥用户",
        verifyingWith: "正在使用 {biometric} 验证...",
        verifiedBtn: "已验证！",
        verifyWith: "使用 {biometric} 验证",
        orPassPin: "或使用主密码 / PIN",
        orPass: "或使用主密码",
        placeholderPin: "输入主密码或 4–8 位快捷 PIN",
        placeholderPass: "输入 QVault 主密码",
        checking: "正在验证凭据...",
        verifyAuth: "验证并授权",
        cancelDenyBtn: "取消并拒绝请求",
        websiteFallback: "网站",
        theWebsiteFallback: "该网站",
        toastAutofill: "已解锁密码库并为 {domain} 自动填充凭据！",
        toastPasskey: "已为 {domain} 验证通行密钥！",
        promptAutofill: "验证您的身份以自动填充 {domain} 的凭据",
        promptPasskey: "使用您的 QVault 通行密钥登录 {domain}",
        biometricError: "生物识别错误：{error}",
        vaultLockedOut: "失败次数过多，密码库已锁定。请在 {seconds} 秒后重试。",
        incorrectCreds: "主密码或快捷 PIN 不正确，请重试。",
        verificationFailed: "验证失败：{error}",
        passkeyCreateTitle: "创建 QVault 通行密钥",
        verifiedPasskeyCreateDesc: "身份已验证 — 正在将通行密钥保存到 QVault",
        requirePasskeyCreateDesc: "需要验证才能创建并保存此通行密钥",
        useHardwareKeyBtn: "使用硬件 / 系统密钥",
        useHardwareKeyHint: {
            darwin: "YubiKey · FIDO2 · Touch ID · 手机二维码",
            linux: "YubiKey · FIDO2 · USB / NFC / BLE · 手机二维码",
            win32: "YubiKey · FIDO2 · Windows Hello · 手机二维码"
        },
        toastHardwareHandoff: "正在为 {domain} 切换到硬件 / 系统安全密钥...",
        toastPasskeyCreated: "{domain} 的通行密钥已验证并保存！",
        promptPasskeyCreate: "为 {domain} 创建并保存 QVault 通行密钥"
    },
    history: {
        title: "历史存档",
        entrySingular: "已保存 {count} 条记录",
        entryPlural: "已保存 {count} 条记录",
        searchPlaceholder: "搜索历史存档...",
        clearAllTitle: "清除所有浏览历史",
        clear: "清除",
        closeTitle: "关闭 (Esc)",
        segments: {
            all: "全部",
            today: "今天",
            yesterday: "昨天",
            week: "最近 7 天",
            older: "更早"
        },
        emptySearch: "没有匹配“{query}”的结果",
        emptyTitle: "存档为空",
        emptySearchDesc: "请检查拼写或选择其他筛选条件。",
        emptyDesc: "您访问过的页面将保存在这里方便快速查找。",
        itemSingular: "{count} 项",
        itemPlural: "{count} 项",
        copyLinkTitle: "复制链接",
        openNewTabTitle: "在新标签页中打开",
        removeTitle: "从存档中移除",
        toastCleared: "历史存档已清空",
        toastCopied: "链接已复制",
        toastOpenedBg: "已在后台标签页打开",
        loadMore: "加载更多",
    },
    cookies: {
        title: "Cookie 与站点存储浏览器",
        subtitle: "查看、搜索并删除网站 Cookie 和本地数据",
        filterDomain: "筛选域名",
        refreshTitle: "刷新列表",
        allSites: "所有网站",
        clearDomain: "清除 {domain}",
        clearAllData: "清除所有浏览数据",
        searchPlaceholder: "按名称、域名或值搜索 Cookie...",
        emptyTitle: "未找到 Cookie",
        emptyDesc: "尝试清空搜索条件或选择其他域名",
        secure: "安全",
        httpOnly: "HttpOnly",
        path: "路径：{path}",
        expires: "过期时间：{date}",
        deleteTitle: "删除 Cookie",
        toastDeleted: "已删除 Cookie：{name}",
        toastClearedSite: "已清除 {domain} 的 {count} 个 Cookie",
        toastClearedAll: "已清除浏览数据和 Cookie"
    },
    resources: {
        title: "任务管理器",
        cpu: "CPU",
        ram: "内存",
        asleepCount: "{count} 个休眠中",
        sleepInactive: "休眠非活动标签",
        sleepInactiveTitle: "休眠后台非活动标签页以释放内存",
        wakeAll: "全部唤醒",
        wakeAllTitle: "唤醒所有已休眠的标签页",
        purgeCacheTitle: "清理浏览器内存缓存",
        autoRefreshActiveTitle: "自动刷新已启用（每 2 秒）",
        autoRefreshPausedTitle: "自动刷新已暂停",
        autoRefresh2s: "2秒",
        paused: "已暂停",
        refreshTitle: "刷新进程指标",
        closeTitle: "关闭 (ESC)",
        filters: {
            all: "全部",
            tabs: "标签页",
            processes: "进程",
            sleeping: "已休眠"
        },
        searchPlaceholder: "按名称或 PID 筛选...",
        colTask: "任务 / 进程",
        colSpace: "空间 / 类型",
        colStatus: "状态",
        colCpu: "CPU",
        colMemory: "内存",
        colAction: "操作",
        emptyMatch: "没有匹配“{query}”的任务",
        blankTab: "空白标签页",
        newTabDash: "Zen 新标签页仪表板",
        pidSubtitle: "PID {pid} · {type}",
        active: "当前活动",
        spaceTab: "{space} 标签",
        mainCore: "主核心",
        sleep: "休眠",
        live: "运行中",
        memSaved: "(已节省)",
        wakeTabTitle: "唤醒标签页",
        activeTabCannotSleep: "无法休眠当前活动标签页",
        sleepTabTitle: "休眠标签页",
        switchTabTitle: "切换到此标签页",
        closeTabTitle: "关闭标签页",
        core: "核心",
        endProcessTitle: "结束进程 PID {pid}",
        itemsOf: "共 {total} 项中的 {shown} 项",
        pressEscPrefix: "按",
        pressEscSuffix: "关闭",
        procMain: "QBrowse 主进程",
        procGpu: "GPU 进程",
        procRenderer: "Webview 渲染进程",
        procUtility: "工具服务（音频/存储）",
        procZygote: "沙盒预加载器",
        procPepper: "插件宿主",
        procChild: "{type} 进程",
        procChildDefault: "子",
        toastHibernatedSingular: "已休眠 {count} 个非活动标签页（释放约 {mb} MB 内存）",
        toastHibernatedPlural: "已休眠 {count} 个非活动标签页（释放约 {mb} MB 内存）",
        toastWokeSingular: "已恢复 {count} 个休眠标签页",
        toastWokePlural: "已恢复 {count} 个休眠标签页",
        toastCachePurged: "已清理浏览器缓存并释放内存",
        toastKillUnavailable: "无法结束进程：API 不可用",
        toastKilled: "已结束进程 {pid}",
        toastKillFailed: "无法结束进程 {pid}",
        toastKillError: "结束进程 {pid} 时出错"
    },
    docViewer: {
        fallbackName: "本地文档",
        fallbackFile: "文件",
        preview: "预览",
        raw: "源码",
        zoomOut: "缩小",
        zoomIn: "放大",
        resetZoom: "重置缩放",
        copyTitle: "复制文件内容",
        copied: "已复制",
        copy: "复制",
        revealTitle: "在系统文件夹中显示",
        loading: "正在加载文档...",
        errorTitle: "无法显示文件",
        readError: "读取文件失败",
        toastCopied: "内容已复制到剪贴板",
        toastRevealed: "已在系统文件夹中定位文件"
    },
    pdfViewer: {
        toggleThumbnails: "切换页面缩略图",
        fallbackName: "PDF 文档",
        pageSingular: "{count} 页",
        pagePlural: "{count} 页",
        prevPage: "上一页",
        nextPage: "下一页",
        zoomOut: "缩小",
        zoomIn: "放大",
        fitWidth: "适应宽度",
        rotate: "顺时针旋转 90°",
        normalMode: "正常模式",
        darkInvertMode: "深色反色阅读模式",
        summarize: "AI 总结",
        revealTitle: "在系统文件管理器中打开",
        pagesHeader: "页面",
        pageNum: "第 {num} 页",
        loading: "正在使用 PDF.js 渲染 PDF...",
        errorTitle: "无法打开文档",
        openError: "打开 PDF 文档失败",
        extractingToast: "正在为 Qu-AI 提取文档文本...",
        openedAiToast: "已携带文档文本在 Qu-AI 面板中打开！",
        extractErrorToast: "提取文本失败：{error}",
        revealedToast: "已在系统文件夹中显示文件",
        fallbackDocName: "文档",
        pageMarker: "--- 第 {num} 页 ---",
        summaryPrompt: "请根据内容简明扼要地总结这份 PDF 文档（{fileName}）并提炼核心要点："
    },
    localDir: {
        parentFolderTitle: "返回上一级文件夹",
        reloadTitle: "重新加载文件夹",
        openInFileManager: "在文件管理器中打开",
        filterPlaceholder: "筛选此目录中的文件...",
        sortName: "名称",
        sortSize: "大小",
        sortDate: "日期",
        gridViewTitle: "网格视图",
        listViewTitle: "列表视图",
        scanning: "正在扫描目录内容...",
        errorTitle: "无法打开文件夹",
        goParent: "转到上级目录",
        emptySearch: "没有匹配的文件",
        emptySearchHint: "请尝试清空搜索筛选条件",
        folderType: "文件夹",
        revealTitle: "在文件管理器中显示",
        colName: "名称",
        colModified: "修改时间",
        colSize: "大小",
        itemSingular: "{count} 项",
        itemPlural: "{count} 项",
        filtered: "(已筛选)",
        suiteName: "QBrowse 文件套件",
        apiUnavailable: "Electron 目录 API 不可用",
        openFailed: "打开目录失败",
        toastOpened: "已在系统文件管理器中打开",
        toastRevealed: "已定位：{name}"
    },
    tour: {
        welcomeTitle: "欢迎使用 QBrowse",
        welcomeSubtitle: "请选择您希望体验浏览器导览的方式：",
        overviewBadge: "概览",
        quickTitle: "快速概览",
        quickDesc: "简洁清晰的界面布局、工作区与导航功能视觉导览。",
        startQuick: "开始快速导览",
        interactiveBadge: "互动体验",
        interactiveTitle: "互动大师课",
        interactiveDesc: "在真实界面中完成引导任务：点击按钮、测试 Tor 网络并掌握快捷键。",
        startInteractive: "开始互动导览",
        skipWelcome: "跳过导览并开始浏览 (Esc)",
        stepCounter: "第 {current} / {total} 步",
        closeTitle: "关闭导览 (Esc)",
        skipTour: "跳过导览",
        back: "上一步",
        finishTour: "完成导览",
        nextStep: "下一步",
        exitToast: "导览已关闭。随时按 Ctrl+K 探索 QBrowse！",
        topBarShortcut: "顶部栏",
        steps: {
            spaces: {
                title: "多工作区隔离",
                badge: "工作区",
                description: "让工作与生活井然有序。每个工作区（个人、工作、隐身、Tor）拥有完全独立的登录状态、Cookie 与标签页。",
                missionInstruction: "点击侧边栏切换器中的“工作”工作区，或按 Ctrl+2",
                missionSuccess: "工作区已切换！您的标签页、登录状态与会话 Cookie 已完全隔离。"
            },
            splitview: {
                title: "原生分屏视图",
                badge: "多任务",
                description: "无需打开新窗口即可并排浏览两个网页，非常适合研究资料、边看文档边写代码或横向对比。",
                missionInstruction: "点击顶部栏的分屏视图图标，或按 Ctrl+\\ 切换双栏浏览",
                missionSuccess: "分屏视图已切换！右侧已出现第二个浏览器窗格。"
            },
            tor: {
                title: "内置 Tor 洋葱网络",
                badge: "隐私与洋葱网",
                description: "内置多跳中继加密，无需第三方代理即可通过加密 Tor 链路直接访问 .onion 域名。",
                missionInstruction: "点击顶部栏的 Tor 网络图标查看当前中继电路",
                missionSuccess: "Tor 电路已打开！您可以查看多跳中继节点并随时开关洋葱路由。"
            },
            vault: {
                title: "零知识加密 QVault",
                badge: "硬件级安全",
                description: "您的主密码、通行密钥和支付卡自动填充均通过本地硬件密钥与 {biometric} 在设备上加密，绝不以明文离开电脑。",
                missionInstruction: "点击顶部栏的 QVault 图标打开本地密码库",
                missionSuccess: "QVault 已打开！所有凭据均在本地硬件上受生物识别保护加密存储。"
            },
            shield: {
                title: "原生广告与追踪器拦截器",
                badge: "安全防护",
                description: "硬件加速的原生网络拦截可在数据包抵达前阻断遥测、挖矿脚本、指纹采集和侵入式广告。",
                missionInstruction: "点击顶部栏的盾牌图标查看已拦截的追踪器与防护规则",
                missionSuccess: "QShield 检查器已打开！可实时查看被拦截的遥测域名并管理防护。"
            },
            darkmode: {
                title: "智能深色模式与系统主题",
                badge: "外观",
                description: "轻松定制视觉风格。可在精致深色主题、纯净浅色模式或智能反色间切换。",
                missionInstruction: "点击顶部栏的主题图标查看外观选项",
                missionSuccess: "主题面板已打开！您可在深色、浅色与智能反色模式间自由切换。"
            },
            toolhub: {
                title: "ToolHub 与持久化便签",
                badge: "工具与研究",
                description: "在任意网页高亮文本即可固定跨重启保留的笔记，还内置本地私密 AI 助手和剪贴板历史。",
                missionInstruction: "点击屏幕右侧边缘的 ToolHub 抓手，或按 Ctrl+J 打开抽屉",
                missionSuccess: "ToolHub 已打开！您可以为网页添加笔记、查看剪贴板或与本地 AI 对话。"
            },
            omnibox: {
                title: "智能地址栏与命令面板",
                badge: "全能指令",
                description: "一切操作的统一入口：使用快捷命令 (!yt, @github)、浏览器指令 (>pdf, >clear)、数学计算或直连本地 AI。",
                missionInstruction: "按 Ctrl+K 或点击居中地址栏来控制 QBrowse",
                missionSuccess: "Omnibox 已激活！输入 !yt 搜索 YouTube、@github 搜仓库或 > 查看高级指令。"
            }
        }
    },
    reader: {
        themes: {
            dark: "深色",
            sepia: "护眼米黄",
            light: "浅色",
            midnight: "午夜"
        },
        fonts: {
            serif: "衬线体",
            sans: "无衬线",
            mono: "等宽体",
            dyslexic: "阅读友好"
        },
        widths: {
            compact: "紧凑",
            balanced: "适中",
            wide: "宽幅"
        },
        exitTitle: "退出阅读模式 (Esc / Ctrl+Alt+R)",
        backToWebpage: "返回原网页",
        openOriginalTitle: "打开原链接：{url}",
        hideAudioTitle: "隐藏音频播放器",
        listenTitle: "收听文章（朗读）",
        listening: "正在朗读",
        readAloud: "朗读文章",
        themeTitle: "{name}主题",
        fontTitle: "使用{name}字体",
        decreaseSizeTitle: "减小字号",
        increaseSizeTitle: "增大字号",
        widthTitle: "{name}栏宽",
        closeTitle: "关闭阅读模式",
        byAuthor: "作者：{author}",
        minRead: "预计阅读 {minutes} 分钟",
        wordsCount: "{count} 词",
        prevParaTitle: "上一段",
        pauseTitle: "暂停",
        playTitle: "播放",
        nextParaTitle: "下一段",
        audioNarration: "语音朗读",
        blockProgress: "第 {current} / {total} 段",
        speedTitle: "切换朗读倍速",
        selectVoiceTitle: "选择语音",
        voiceFallback: "语音",
        systemVoices: "系统语音",
        stopCloseTitle: "停止并关闭朗读",
        highlightWithTitle: "用{color}高亮",
        noteBtn: "笔记",
        copyTextTitle: "复制文本",
        stickyNote: "便签笔记",
        notePlaceholder: "输入您的笔记或想法...",
        deleteBtn: "删除",
        saveBtn: "保存"
    },
    toolhub: {
        title: "工具中心",
        snip: "截图",
        snipTitle: "交互式屏幕截图（框选区域）",
        captureViewportTitle: "截取当前可见区域",
        captureFullTitle: "截取整页滚动长图",
        tabs: {
            notes: "笔记",
            clipboard: "剪贴板",
            ai: "本地 AI",
            downloads: "下载"
        },
        webNotesTab: "网页笔记 ({count})",
        scratchpadTab: "便笺本",
        globalScope: "全局",
        spaceScope: "{space} 空间",
        scratchpadTitle: "便笺本：{name}",
        scratchpadGlobalPlaceholder: "记录全局想法、笔记与链接... 支持 Markdown。",
        scratchpadSpacePlaceholder: "{space} 空间便笺本... 支持 Markdown。",
        searchNotesPlaceholder: "搜索高亮、笔记、域名...",
        clearSearchTitle: "清空搜索",
        allSpaces: "所有空间",
        exportMd: "导出 MD",
        exportMdTitle: "将笔记导出为 Markdown (.md)",
        noWebNotesTitle: "暂无已保存的网页笔记",
        noWebNotesDesc: "在任意网页高亮文本并点击悬浮条中的“笔记”，即可跨会话保留批注。",
        otherDomain: "其他",
        colorTitle: "颜色：{color}",
        jumpHighlightTitle: "点击跳转到页面上的该高亮位置",
        editNotePlaceholder: "添加笔记或想法...",
        deleteNote: "删除笔记",
        deleteNoteTitle: "删除笔记文本",
        cancel: "取消",
        saveNote: "保存笔记",
        clickToEditNote: "点击编辑笔记",
        addNoteTitle: "添加笔记",
        noteBtn: "笔记",
        copyQuoteTitle: "复制摘录",
        jumpBtn: "跳转",
        jumpBtnTitle: "跳转到页面笔记位置",
        deleteHighlightTitle: "删除高亮",
        clipboardHeader: "系统剪贴板历史",
        syncBtn: "同步",
        syncTitle: "同步系统剪贴板",
        deleteClipTitle: "删除记录",
        clipboardEmptyTitle: "剪贴板历史为空",
        clipboardEmptyDesc: "在任意位置复制文本或网址即可在此处查看",
        clearClipboard: "清空剪贴板历史",
        aiStatusRunning: "llama-server 运行中 (端口 8080)",
        aiStatusDownloading: "正在下载模型 ({progress}%)...",
        aiStatusStarting: "正在启动引擎...",
        aiStatusReady: "准备就绪",
        aiStatusDownloaded: "已下载",
        aiStatusNotDownloaded: "尚未下载模型",
        cancelDownloadTitle: "取消下载",
        downloadModelTitle: "下载 {name} ({size})",
        downloadBtn: "下载",
        startingBtn: "启动中...",
        stopBtn: "停止",
        startBtn: "启动",
        openWebUiTitle: "打开 llama.cpp Web UI",
        aiConsoleSettingsTitle: "llama.cpp 控制台与高级设置",
        downloadingFile: "正在下载 {filename}",
        downloadingWeights: "正在下载权重...",
        noModelTitle: "未下载 AI 模型",
        offlineBadge: "离线",
        noModelDesc: "下载 {name} 即可运行快速、私密的本地 AI 进行网页总结、编程与对话。",
        downloadModelSize: "下载模型 ({size})",
        settingsBtn: "设置",
        contextBtn: "上下文",
        searchBtn: "联网",
        voiceBtn: "语音",
        summarizeBtn: "总结页面",
        summarizePrompt: "请根据该网页内容，清晰地总结核心要点和主要结论。",
        attachTitle: "附加文件或图片",
        chatPlaceholder: "向本地 Gemma 4 AI 提问或拖入文件...",
        voiceInputTitle: "语音输入 (Whisper)",
        downloadsHeader: "当前与最近下载",
        itemSingular: "{count} 项",
        itemPlural: "{count} 项",
        openDownloadsFolderTitle: "打开下载文件夹",
        clearDownloadsTitle: "清空全部下载记录",
        downloadedFileFallback: "已下载文件",
        snipBadge: "截图",
        verified: "已校验",
        unverified: "未校验",
        sha256Prefix: "SHA-256: {hash}",
        saved: "已保存",
        verifyCopyHashTitle: "校验并复制 SHA-256 哈希",
        copyHashTitle: "SHA-256: {hash} (点击复制)",
        copyImageTitle: "复制图片到剪贴板",
        showInFolderTitle: "在文件夹中显示",
        deleteDownloadTitle: "删除文件并从列表移除",
        downloadsEmptyTitle: "暂无活动下载",
        downloadsEmptyDesc: "截图与下载的文件将会显示在这里",
        pdfPageName: "{name} (第 {page} 页)",
        pdfImageSize: "PDF 图像",
        toasts: {
            jumpingToNote: "正在跳转到页面笔记位置...",
            exportedMarkdown: "已导出 Markdown 文件！",
            copiedNotesMarkdown: "已将笔记作为 Markdown 复制！",
            copiedToClipboard: "已复制到剪贴板！",
            clipDeleted: "已删除剪贴板条目",
            clipboardCleared: "已清空剪贴板历史",
            parsingPdf: "正在可视化解析 PDF：{name}",
            pdfVramLimit: "已将 {name} 的前 10 页解析为图像（VRAM 限制）。",
            pdfVisualFailed: "PDF 可视化解析失败，改用文本提取。",
            openPageFirst: "请先打开一个网页再进行总结",
            transcriptionFailed: "语音转写失败",
            micDenied: "麦克风权限被拒绝",
            noteRemoved: "笔记已删除",
            noteUpdated: "笔记已更新",
            copiedQuote: "已复制摘录",
            highlightRemoved: "已移除高亮",
            downloadsCleared: "下载列表已清空",
            hashCopied: "已复制 SHA-256 校验码",
            hashMissing: "无法计算哈希 — 文件缺失",
            screenshotCopied: "截图已复制到剪贴板",
            downloadDeleted: "已删除下载记录和文件"
        },
        cancelled: "已取消",
        failed: "失败"
    },
    fontManager: {
        title: "应用字体与排版",
        active: "当前使用：",
        resetTitle: "重置为操作系统默认字体",
        resetToDefault: "恢复默认",
        modes: {
            preset: "预设字体",
            google: "Google 字体",
            system: "系统字体",
            file: "上传字体"
        },
        categories: {
            all: "全部",
            sans: "无衬线",
            mono: "等宽",
            serif: "衬线"
        },
        activeFont: "当前字体",
        clickToApply: "点击应用",
        googleTitle: "使用任意 Google Font",
        googleDesc: "输入 fonts.google.com 上的任意字体名称并按回车，即可即时加载到 QBrowse。",
        googlePlaceholder: "例如 Montserrat, Space Grotesk, Syne, Cinzel...",
        applyFont: "应用字体",
        popularGoogle: "热门 Google 字体",
        filterPlaceholder: "筛选列表...",
        systemTitle: "系统已安装字体选择器",
        systemDesc: "输入操作系统中已安装的字体名（如 Microsoft YaHei, PingFang SC, Segoe UI）。",
        systemPlaceholder: "输入系统字体名称...",
        installed: "已安装",
        notDetected: "未检测到",
        notDetectedTitle: "画布度量未检测到该字体，但如果可用 CSS 仍会尝试渲染",
        commonOsFonts: "常见操作系统字体",
        dropTitle: "点击或拖放字体文件到此处",
        dropDesc: "支持 TrueType (.ttf)、OpenType (.otf)、WOFF (.woff) 和 WOFF2 (.woff2)，最大 12MB。",
        selectFile: "选择本地字体文件",
        activeCustomFace: "当前自定义字体",
        removeFileTitle: "移除上传的字体文件",
        fineTuning: "排版微调",
        letterSpacing: "字间距",
        weightShift: "字重偏移",
        fontScale: "界面字体缩放",
        reset100Title: "重置为 100%",
        specimen: "字体排版示例",
        specimen1: "天地玄黄，宇宙洪荒，日月盈昃",
        specimen2: "The quick brown fox jumps over the lazy dog.",
        activeDefault: "系统默认 (Segoe UI / 原生)",
        activeGoogle: "Google 字体：{name}",
        activeSystem: "系统字体：{name}",
        activeFile: "自定义文件：{name}",
        customLabel: "自定义",
        installedOsLabel: "系统内置",
        uploadedFontLabel: "已上传字体",
        spacing: {
            tight: "紧凑",
            normal: "标准",
            relaxed: "宽松",
            wide: "加宽"
        },
        weight: {
            normal: "常规",
            medium: "中等",
            semibold: "半粗"
        },
        osLabels: {
            "Windows 11": "Windows 11",
            Windows: "Windows",
            macOS: "macOS",
            "macOS / Multi": "macOS / 跨平台",
            Universal: "通用",
            "Windows Dev": "Windows 开发",
            "Windows Terminal": "Windows 终端",
            Casual: "休闲",
            Linux: "Linux",
            GNOME: "GNOME",
            Serif: "衬线体"
        },
        presetDefaultName: "系统默认",
        presets: {
            default: {
                description: "操作系统原生排版字体（Segoe UI / 苹方）。",
                previewText: "Aa Bb 汉 123"
            },
            inter: {
                description: "专为数字屏幕打造的简洁、高易读性现代界面无衬线字体。",
                previewText: "现代新无衬线"
            },
            geist: {
                description: "Vercel 标志性的几何精准风格开发者字体。",
                previewText: "极简工程美学"
            },
            outfit: {
                description: "具有高级时尚美感的精致几何无衬线字体。",
                previewText: "精致几何风格"
            },
            "plus-jakarta": {
                description: "清新温暖的现代字体，专为精致 Web 应用打造。",
                previewText: "亲和现代风"
            },
            poppins: {
                description: "圆润且充满活力的友好几何无衬线字体。",
                previewText: "灵动圆润曲线"
            },
            roboto: {
                description: "Google Android 与 Material Design 的经典主力字体。",
                previewText: "Material 架构"
            },
            manrope: {
                description: "融合现代怪诞体与几何体，兼具优异可读性。",
                previewText: "精准半几何体"
            },
            lexend: {
                description: "科学设计以减轻视觉压力并提升阅读速度。",
                previewText: "轻松高效阅读"
            },
            "jetbrains-mono": {
                description: "高对比度编程字体，专为开发者增大字高。",
                previewText: "开发者编程美学"
            },
            "fira-code": {
                description: "支持编程连字且清晰锐利的等宽字体。",
                previewText: "=> 编程连字"
            },
            "playfair-display": {
                description: "灵感源自欧洲古典印刷的高对比度衬线字体。",
                previewText: "刊物典雅风格"
            },
            merriweather: {
                description: "温暖舒适的文学衬线字体，适合长篇阅读。",
                previewText: "经典文学衬线"
            }
        },
        errors: {
            invalidFormat: "字体格式无效。请上传 .ttf、.otf、.woff 或 .woff2 文件。",
            tooLarge: "字体文件过大，最大支持 12MB。",
            readFailed: "读取字体文件失败，请换一个文件重试。"
        },
        toasts: {
            presetSet: "应用字体已设为 {name}",
            googleApplied: "已将 Google 字体“{name}”应用到 QBrowse",
            systemApplied: "已应用系统字体“{name}”",
            fileLoaded: "自定义字体文件“{name}”加载成功"
        }
    },
    aiSettings: {
        title: "llama.cpp AI 引擎",
        status: {
            online: "在线 (llama-server)",
            starting: "正在启动...",
            updating: "正在更新引擎...",
            error: "引擎错误",
            stopped: "已停止"
        },
        syncTitle: "检查并同步原生 llama.cpp 引擎 (支持 Gemma 4 的 b11796)",
        updatingBtn: "更新中...",
        syncBtn: "同步引擎 (b11796)",
        subtitle: "高速、零遥测的本地大语言模型运行器，原生支持 Gemma 4、Qwen 3.5 与 Bielik 11B GGUF。",
        downloadingModel: "正在下载模型 ({progress}%)",
        connectingCdn: "正在连接 CDN...",
        cancel: "取消",
        downloadBtn: "下载 {name} ({size})",
        startingBtn: "正在启动 llama-server...",
        stopBtn: "停止 llama-server",
        startBtn: "启动 llama-server 引擎",
        defaultStartError: "llama-server 启动模型时遇到错误。",
        dismiss: "忽略",
        updateEngineBtn: "更新 AI 引擎",
        genSpeed: "生成速度",
        tokPerSec: "tok/s",
        contextWindow: "上下文窗口",
        tokens: "tokens",
        gpuOffload: "GPU 卸载",
        layers: "层",
        activeModelTitle: "当前 GGUF 模型",
        loadCustomGguf: "加载自定义 .GGUF 文件...",
        loadCustomProjector: "加载自定义视觉投影器...",
        customModelPrefix: "自定义模型：{path}",
        customProjectorPrefix: "自定义投影器：{path}",
        reset: "重置",
        downloadedBadge: "已下载",
        downloadingTarget: "正在下载 {target}",
        visionProjector: "视觉投影器...",
        languageModel: "语言模型...",
        weights: "权重...",
        modelReady: "模型已就绪",
        downloadModelFile: "下载模型文件 ({size})",
        overridesTitle: "llama-server 参数设置",
        autoDetectBtn: "自动检测硬件",
        cpuThreadsLabel: "CPU 线程 (-t)：{threads}",
        contextSizeLabel: "上下文大小 (-c)",
        tokensOption: "{n} tokens",
        contextBadges: {
            compact: "紧凑",
            default: "默认",
            extended: "扩展",
            max: "最大"
        },
        gpuLayersLabel: "GPU 卸载层数 (-ngl)：{layers}",
        dataProcessingTitle: "数据处理",
        parsePdfTitle: "将 PDF 解析为图像",
        parsePdfDesc: "在聊天中拖入 PDF 时将页面解析为图像而非提取纯文本，最适合 Gemma 4 和 Qwen 3.5 视觉模型识别图表与版面。",
        consoleTitle: "llama-server 终端控制台（实时输出）",
        copyOutputTitle: "复制终端输出",
        clearConsoleTitle: "清空控制台",
        consoleEmpty: "[llama-server 控制台已就绪，等待服务器启动输出...]",
        modelWord: "模型",
        visionWord: "视觉",
        models: {
            "gemma-4-e2b": "Google Gemma 4 E2B Instruct GGUF 模型，支持完整的多模态视觉分析与对话。",
            "gemma-4-e4b": "高推理能力 Google Gemma 4 E4B 模型，具备完整多模态视觉支持以应对复杂分析。",
            "qwen-3.5-4b": "阿里巴巴 Qwen 3.5 4B 模型，支持多模态视觉、推理、代码生成与多语言理解。",
            "bielik-11b-v3.1": "SpeakLeash 旗舰级 11B 波兰及欧洲多语言模型，具备出色的语义理解与推理能力。"
        },
        toasts: {
            customModelLoaded: "已加载自定义模型：{name}",
            demoModelLoaded: "已加载示例自定义模型路径！",
            customProjectorLoaded: "已加载自定义视觉投影器：{name}",
            demoProjectorLoaded: "已加载示例投影器路径！",
            updatingEngine: "正在更新原生 llama.cpp 引擎...",
            engineUpdated: "llama.cpp 引擎已更新至最新版本 (b11796)！",
            engineUpdateFailed: "引擎更新失败：{error}",
            unknownError: "未知错误",
            logsCopied: "llama-server 日志已复制到剪贴板！",
            hardwareDetected: "已检测硬件：{threads} 线程，{ram}GB 内存",
            hardwareDefault: "已检测硬件：已应用默认优化",
            resizingContext: "正在将 llama-server 上下文窗口调整为 {tokens} tokens..."
        }
    },
    adblockImport: {
        title: "从 GitHub / 网络导入拦截列表",
        subtitle: "自动将 hosts 文件、GitHub 原始列表或 Adblock 规则解析至自定义列表。",
        closeTitle: "关闭",
        modeUrl: "远程 URL / GitHub",
        modePaste: "粘贴纯文本",
        urlLabel: "规则列表 URL (GitHub raw, Gist 或 hosts 地址)",
        githubRawBadge: "GitHub Raw",
        githubRawTitle: "已检测到 GitHub 链接并自动转换为原始文件格式",
        fetching: "获取中...",
        fetchParse: "获取并解析",
        popularLists: "热门社区拦截列表",
        pasteLabel: "粘贴 hosts 文件、ABP 过滤规则或域名列表",
        pastePlaceholder: "# 在下方粘贴任意格式：\n0.0.0.0 tracking.evil.com\n127.0.0.1 ads.adserver.org\n||telemetry.network.io^\nanalytics.badsite.com",
        parsing: "解析中...",
        parseDomains: "解析域名",
        back: "返回",
        backTitle: "返回源输入 (Esc)",
        readyToImport: "准备导入",
        kbSource: "源文件 {kb} KB",
        validDomains: "有效域名",
        newUnique: "新增去重",
        duplicatesFiltered: "已过滤重复",
        linesAnalyzed: "已分析行数",
        extractedSample: "提取域名预览 ({count})",
        searchSamplePlaceholder: "搜索样本...",
        moreDomains: "+ 还有 {count} 个域名",
        backToSource: "返回源选择",
        cancel: "取消",
        replaceList: "替换整个列表",
        replaceListTitle: "使用本次解析的域名替换您现有的自定义列表",
        importN: "导入 {count} 个域名",
        importDomains: "导入域名",
        pastedSourceLabel: "粘贴文本",
        errors: {
            invalidUrl: "请输入有效的拦截列表 URL。",
            fetchFailed: "获取远程列表失败",
            noValidFromUrl: "未能从该源解析出有效域名。",
            downloadError: "下载远程列表出错",
            emptyPaste: "请先粘贴域名或 hosts 规则。",
            noValidFromText: "未能从文本中提取到有效域名。",
            parseError: "解析文本时出错"
        },
        presets: {
            stevenblack: {
                desc: "社区维护的全面广告软件与恶意软件防护列表。",
                badge: "推荐"
            },
            "oisd-basic": {
                desc: "轻量且零误报的网页与移动端追踪拦截域名列表。",
                badge: "低开销"
            },
            "adguard-trackers": {
                desc: "专用于屏蔽统计分析与遥测脚本的域名拦截列表。",
                badge: "隐私"
            },
            peterlowe: {
                desc: "历史悠久的经典活跃广告服务器纯域名列表。",
                badge: "快速"
            },
            danpollock: {
                desc: "备受信赖的零主机列表，用于拦截遥测与垃圾网站。",
                badge: "经典"
            }
        }
    },
    studio: {
        title: "预设工作室",
        subtitle: "可视化拖拽停靠组件、雕琢圆角曲率、定制主题并管理自定义预设。",
        tabCanvas: "画布",
        tabPresets: "预设库",
        closeAria: "关闭预设工作室",
        dockLeftSidebar: "停靠侧边栏到左侧",
        dockRightSidebar: "停靠侧边栏到右侧",
        dockTopBar: "停靠导航栏到顶部",
        dockBottomBar: "停靠导航栏到底部",
        searchBarPlaceholder: "搜索网络或输入命令...",
        toolhubDockTitle: "ToolHub 停靠：{pos}（点击或拖拽切换）",
        legendDock: "导航栏：",
        legendBarValue: "{pos}",
        legendSidebar: "侧边栏：",
        legendToolhub: "ToolHub：",
        legendSummary: "圆角：{curvature} · 地址栏：{omnibox} · 标签：{tabs}",
        layoutControls: "布局控制",
        resetTitle: "将草稿重置为当前浏览器设置",
        reset: "重置",
        editingLabel: "正在编辑：",
        cancelEditTitle: "取消编辑并创建新预设",
        cancel: "取消",
        sidebarMode: "侧边栏模式",
        sidebarModes: {
            classic: "经典",
            floating: "悬浮",
            compact: "紧凑",
            hidden: "隐藏"
        },
        windowCurvature: "窗口圆角曲率",
        curvatures: {
            default: "默认",
            cohesive: "融合",
            square: "锐利"
        },
        omniboxArch: "地址栏架构",
        omniboxStyles: {
            capsule: "胶囊",
            wide: "宽幅",
            minimal: "极简"
        },
        tabPresentation: "标签页样式",
        tabStyles: {
            pills: "胶囊",
            compact: "紧凑",
            cards: "卡片"
        },
        windowControlsStyle: "窗口按钮风格",
        controlsStyles: {
            mac: "macOS",
            windows: "Windows",
            minimal: "极简"
        },
        windowControlsLayout: "窗口按钮排序",
        controlsOrders: {
            auto: "智能角落",
            "close-first": "关闭优先",
            "minimize-first": "最小化优先"
        },
        themeLabel: "主题",
        themes: {
            dark: "深色",
            light: "浅色"
        },
        uiScaleLabel: "界面缩放",
        uiScales: {
            comfortable: "标准",
            compact: "紧凑"
        },
        accentSwatchLabel: "强调色板",
        openColorPickerTitle: "打开系统取色器",
        saveChanges: "保存更改",
        applyLive: "实时应用",
        saveAsNew: "另存为新预设",
        applyToBrowser: "应用到浏览器",
        saveAsCustom: "保存为自定义预设",
        searchPresetsPlaceholder: "搜索预设...",
        filterAll: "全部",
        filterBuiltin: "内置",
        filterCustom: "自定义 ({count})",
        saveActiveSetup: "保存当前浏览器配置",
        activeBadge: "当前使用",
        editingBadge: "(编辑中)",
        reapply: "重新应用",
        apply: "应用",
        editInStudio: "在工作室编辑",
        customize: "自定义",
        editPresetTitle: "在工作室编辑预设",
        customizePresetTitle: "在工作室自定义布局",
        duplicateTitle: "复制预设",
        deleteTitle: "删除自定义预设",
        editCustomModalTitle: "编辑自定义预设",
        saveCustomModalTitle: "保存为自定义预设",
        presetNameLabel: "预设名称",
        presetNamePlaceholder: "例如：人体工学工作流、极简 Arc",
        presetDescLabel: "标语 / 描述",
        presetDescPlaceholder: "简短描述此配置...",
        presetIconLabel: "预设图标",
        createPreset: "创建预设",
        deleteConfirmTitle: "删除自定义预设？",
        deleteConfirmDescBefore: "确定要删除 ",
        deleteConfirmDescAfter: " 吗？此操作无法撤销。",
        deletePresetBtn: "删除预设",
        posTop: "顶部",
        posBottom: "底部",
        posLeft: "左侧",
        posRight: "右侧",
        moveTo: "移至{pos}",
        draggableNavTitle: "可拖拽导航栏：拖到顶部/底部或点击切换",
        draggableSidebarTitle: "可拖拽侧边栏：在左右停靠区之间拖动",
        swapTo: "切换至{pos}",
        miniTab: "标签 #{num}",
        miniCardView: "卡片视图 #{num}",
        miniActiveSpaceTab: "活动空间标签",
        miniSidebarPos: "侧边栏 ({pos})",
        layoutTagFormat: "{bar} · {sidebar}",
        layoutSummaryFormat: "{tag} · {toolhub}",
        topBarLabel: "顶部栏",
        bottomBarLabel: "底部栏",
        leftSidebarLabel: "左侧边栏",
        rightSidebarLabel: "右侧边栏",
        leftToolhubLabel: "左侧 ToolHub",
        rightToolhubLabel: "右侧 ToolHub",
        tabsHighlight: "{style}标签",
        compactScaleLabel: "紧凑缩放",
        comfortableScaleLabel: "舒适缩放",
        defaultCustomName: "自定义预设",
        defaultCustomDesc: "自定义用户配置",
        defaultNewNameFormat: "{bar} {side}",
        defaultNewNameArc: "Arc",
        defaultNewNameFlow: "Flow",
        defaultNewDescFormat: "自定义布局：{bar}，{sidebar}，{tabs}标签",
        toasts: {
            applied: "已将布局应用到浏览器！",
            reset: "工作室草稿已重置为当前配置",
            editingPreset: "正在工作室编辑“{name}”",
            loadedPreset: "已将“{name}”加载至工作室画布",
            switchedNewDraft: "已切换为新草稿"
        }
    },
    setup: {
        strictOfflineTitle: "零后台请求（严格离线）",
        strictOfflineDesc: "禁用所有可选的后台网络流量（更新检查、过滤器刷新、实时建议、远程网站图标和云同步）。",
        headerTitle: "QBrowse 配置向导",
        headerSubtitle: "个性化助手",
        steps: {
            language: {
                label: "语言",
                desc: "界面语言"
            },
            presets: {
                label: "预设与风格",
                desc: "体验与外观"
            },
            import: {
                label: "导入数据",
                desc: "书签与密码"
            },
            privacy: {
                label: "隐私防护",
                desc: "护盾与 Tor"
            },
            default: {
                label: "默认浏览器",
                desc: "系统集成"
            },
            sync: {
                label: "同步与账号",
                desc: "云端或本地"
            }
        },
        chooseSetupTitle: "选择您的初始配置",
        chooseSetupDesc: "挑选一个为您量身定制的布局。您随时都可以微调每个面板。",
        customLayoutCta: "想要自定义布局？打开预设工作室 →",
        themeLabel: "主题",
        dark: "深色",
        light: "浅色",
        accentLabel: "强调色",
        step2Badge: "第 2 / 5 步",
        step2Title: "迁移您的数据与密码库",
        step2Desc: "导入您的书签，并从 Bitwarden、Proton Pass、Chrome 或 Firefox 迁移密码。",
        tabBookmarks: "书签",
        tabVault: "密码库",
        bookmarksFound: "发现 {count} 个书签",
        notDetected: "未在本机检测到",
        imported: "已导入",
        importing: "导入中...",
        importBookmarks: "导入书签",
        scanningBrowsers: "正在扫描已安装的浏览器...",
        htmlImported: "已导入 HTML 文件（{count} 项）",
        uploadHtml: "上传书签 HTML 文件 (.html)",
        vaultComplete: "密码库迁移完成",
        vaultImportedSummary: "已成功从 {source} 导入 {count} 条密码至 QVault！",
        importAnother: "继续导入",
        exportCsvJson: "导出为 .CSV 或 .JSON",
        parsingVault: "正在解析密码库文件...",
        uploadVault: "上传密码库导出文件 (.csv 或 .json)",
        compatibleManagers: "兼容 Bitwarden、Proton Pass、Google Chrome、Edge、Brave 与 1Password",
        step3Badge: "第 3 / 5 步",
        step3Title: "强化您的隐私防线",
        step3Desc: "QBrowse 可拦截追踪脚本、清除侵入式广告，并通过 Tor 网络路由流量。",
        privacyOptimizedBadge: "预设：已为隐私极致优化",
        adblockTitle: "Ghostery 原生追踪器护盾",
        adblockDesc: "在不拖慢网页加载速度的情况下拦截追踪器、遥测、统计与广告。",
        torTitle: "Tor 洋葱路由空间",
        torDesc: "随时开启 .onion 暗网访问与多节点加密中继链路。",
        ready: "就绪",
        step4Badge: "第 4 / 5 步",
        step4Title: "设为默认浏览器",
        step4Desc: "在隔离的工作区中打开桌面链接，自动分开工作与个人浏览。",
        isDefaultTitle: "QBrowse 已成为您的默认浏览器！",
        makeDefaultTitle: "将 QBrowse 设为您的首选网页入口",
        isDefaultDesc: "所有桌面链接与网页文件都将自动在 QBrowse 中打开。",
        makeDefaultDesc: "通过深度系统集成接管所有 http://、https:// 链接与 HTML 文件。",
        osLabels: {
            darwin: "系统设置",
            linux: "默认应用程序",
            win32: "Windows 默认应用"
        },
        defaultHint: "已打开“{label}” — 请在系统窗口中选择 QBrowse 确认。",
        openOsSettings: "打开 {label}",
        defaultSet: "已设为默认浏览器",
        openingSettings: "正在打开设置...",
        setAsDefault: "设为默认浏览器",
        step5Badge: "第 5 / 5 步 • 个人资料与云同步",
        step5Title: "选择您的浏览方式",
        step5Desc: "完全自主掌控：使用本地硬件加密 100% 离线浏览，或创建免费的云同步账号以在多台设备间同步密码库、空间与书签。",
        zeroTelemetry: "零遥测",
        localProfile: "本地配置文件",
        localProfileDesc: "100% 离线。所有密码、历史与工作区标签均使用本地硬件密钥加密保存在本机，无需账号。",
        e2eEncrypted: "端到端加密",
        cloudSync: "QBrowse 云同步",
        cloudSyncDesc: "通过 Firebase 在您的所有电脑间无缝同步密码库、工作区、固定标签与书签。",
        localReadyTitle: "本地配置文件已就绪",
        localReadyDesc: "所有书签、密码凭据与工作区将严格保留在此电脑上且无任何遥测。您日后可随时在设置中开启云同步。",
        takeTour: "开启互动引导之旅",
        startDirectly: "直接开始浏览",
        activeSync: "同步已激活",
        cloudLinked: "已连接端到端加密云存储",
        signOut: "退出登录",
        activeSyncDesc: "您的书签、工作区标签页与加密密码库正在所有授权设备间实时同步。",
        signIn: "登录",
        existingAccount: "（已有账号）",
        register: "注册",
        newAccount: "（新账号）",
        registerSubtitle: "创建一个新 QBrowse 账号以跨设备同步数据。",
        signInSubtitle: "登录以同步您现有的书签、空间与密码库。",
        switchToSignIn: "切换到登录",
        emailLabel: "电子邮箱",
        emailPlaceholder: "name@example.com",
        createPassLabel: "创建密码（至少 6 位）",
        accountPassLabel: "账号密码",
        min6Chars: "至少 6 个字符",
        confirmPassLabel: "确认密码",
        passwordsMatch: "密码匹配",
        passwordsMismatch: "两次密码不一致",
        useAccountAsMaster: "使用账号密码作为主加密密钥",
        masterDerivedDesc: "直接从您的登录密码派生 AES-GCM 256 位客户端密钥。",
        masterSeparateDesc: "使用单独的自定义加密密语。",
        customMasterLabel: "自定义主加密密语",
        customMasterPlaceholder: "输入专属密码库加密密语...",
        creatingAccount: "正在创建加密账号...",
        signingInSyncing: "正在登录并同步...",
        createAccountBtn: "创建账号并启用云同步",
        signInBtn: "登录并启用云同步",
        alreadyRegistered: "已经注册过 QBrowse？",
        signInHere: "点此登录",
        newToSync: "初次使用 QBrowse 云同步？",
        createFreeAccount: "创建免费账号（注册）",
        skipSyncLocal: "跳过云同步并继续使用本地配置文件（无需账号）",
        skipSyncComplete: "跳过同步并完成",
        vaultModalTitle: "保护您导入的密码库",
        vaultModalDesc: "输入或创建一个主密码来加密您的凭据。",
        masterPassLabel: "主密码",
        masterPassPlaceholder: "输入主密码...",
        confirmMasterLabel: "确认主密码",
        confirmMasterPlaceholder: "确认密码...",
        cancel: "取消",
        encryptImport: "加密并导入",
        bookmarkFallback: "书签",
        htmlFileFallback: "HTML 文件",
        toasts: {
            enterEmail: "请输入电子邮箱地址。",
            validEmail: "请输入有效的邮箱地址（如 name@domain.com）。",
            passMin6: "密码长度至少为 6 个字符。",
            confirmPassReq: "请确认您的密码。",
            passMismatch: "两次输入的密码不一致，请重新输入。",
            signedIn: "已登录到 QBrowse 云同步！",
            registered: "账号注册成功，云同步已激活！",
            bookmarksImported: "成功导入 {count} 个书签！",
            importFailed: "导入失败。",
            couldNotImportBookmarks: "无法导入书签。",
            htmlImported: "已从 {filename} 导入 {count} 个书签！",
            htmlImportFailed: "HTML 书签导入失败。",
            noCredentials: "文件中未找到凭据",
            passwordsImported: "已从 {source} 导入 {count} 条密码！",
            vaultImportFailed: "导入失败：{error}",
            passMin4: "密码至少需要 4 个字符",
            vaultPassMismatch: "两次输入的密码不一致",
            incorrectMasterPass: "现有密码库的主密码不正确",
            vaultImportError: "导入错误：{error}",
            nowDefault: "QBrowse 现已成为您的默认浏览器！",
            openingWinDefault: "正在打开 Windows 默认应用。请点击 QBrowse 设为默认。",
            openingOsDefault: "正在打开 {label}。请选择 QBrowse 作为默认浏览器。",
            couldNotOpenDefault: "无法打开默认浏览器设置。"
        }
    },
    flags: {
        title: "实验性功能",
        subtitle: "微调实验性浏览器特性、硬件图形管线、后量子加密套件与 Tor 电路隔离参数。",
        resetAll: "全部重置为默认",
        warningTitle: "警告：前方为实验性功能！",
        warningBody: "启用这些实验开关会修改底层 Chromium V8 执行、硬件合成器或 TLS 参数，重启浏览器后方可生效。",
        searchPlaceholder: "搜索实验标志（如 GPU, Kyber, QUIC, DoH, bfcache）...",
        tabAvailable: "可用 ({count})",
        tabUnavailable: "不可用 ({count})",
        categories: {
            All: "全部",
            Performance: "性能",
            "Hardware & Graphics": "硬件与图形",
            "Web Standards & Engine": "Web 标准与引擎",
            Security: "安全",
            Networking: "网络",
            "Media & UI": "媒体与界面",
            "AI & Tools": "AI 与工具",
            Experimental: "实验性"
        },
        statuses: {
            Stable: "稳定",
            Beta: "测试版",
            Experimental: "实验版"
        },
        options: {
            default: "默认",
            enabled: "已启用",
            disabled: "已禁用"
        },
        emptyMatch: "没有匹配“{search}”的可用标志",
        reasonPrefix: "原因：{reason}",
        unavailableBadge: "不可用",
        relaunchMsg: "您的更改将在下次重新启动 QBrowse 时生效。",
        relaunchBtn: "立即重启",
        toasts: {
            reset: "所有实验性标志已恢复默认值",
            relaunching: "正在使用更新后的标志重启 QBrowse..."
        },
        items: {
            "prefer-high-performance-gpu": {
                name: "优先使用高性能 GPU",
                description: "在多显卡系统上将 WebGL、Canvas 和 3D 渲染引导至独立显卡。在节能模式下自动禁用以节省电量。"
            },
            "unlock-frame-rate": {
                name: "解锁帧率上限（基准测试模式）",
                description: "为 Canvas/WebGL FPS 基准测试禁用垂直同步。常规浏览可能导致画面撕裂和功耗升高。"
            },
            "ignore-gpu-blocklist": {
                name: "忽略 GPU 黑名单",
                description: "覆盖 Chromium 内置软件渲染列表，在较旧或未分类显卡驱动上启用硬件加速。"
            },
            "experimental-web-platform": {
                name: "实验性 Web 平台功能",
                description: "启用 Chromium 中仍在开发的实验性 Web 平台 API，部分前沿接口可能不稳定。"
            },
            "gpu-rasterization": {
                name: "GPU 光栅化与合成器加速",
                description: "使用专用硬件 GPU 管线加速网页光栅化与合成，替代 CPU 软件渲染。"
            },
            "smooth-scrolling": {
                name: "平滑滚动引擎",
                description: "在使用鼠标滚轮、触控板或方向键滚动时启用流畅的物理贝塞尔曲线动画。"
            },
            "zero-copy-rasterizer": {
                name: "零拷贝 GPU 光栅化器 (GpuMemoryBuffer)",
                description: "光栅化工作线程直接写入共享 GPU 纹理，减少 CPU 内存拷贝开销。"
            },
            "enable-vulkan": {
                name: "Vulkan 图形与合成后端",
                description: "在受支持的 GPU 上使用跨平台 Vulkan 图形 API 进行合成与渲染。"
            },
            "back-forward-cache": {
                name: "前进/后退缓存 (bfcache)",
                description: "在内存中保留近期访问页面的完整快照，实现瞬时前进与后退导航。"
            },
            "canvas-oop-rasterization": {
                name: "进程外 2D Canvas 光栅化",
                description: "在专用 GPU 进程中执行 HTML5 2D Canvas 绘制操作，而非沙盒渲染进程。"
            },
            "enable-drdc": {
                name: "动态高刷新率检测 (120Hz/144Hz/240Hz)",
                description: "动态同步帧节奏与 V-Sync 间隔以适配 ProMotion 及高刷电竞显示器。"
            },
            "auto-suspend-tabs": {
                name: "自动休眠标签页内存省电模式",
                description: "后台标签页闲置 15 分钟后自动释放内存，显著节约 RAM 与电池续航。"
            },
            "parallel-download-engine": {
                name: "多线程并行分段下载",
                description: "将大文件拆分为多个并行 HTTP Range 请求，充分利用网络带宽。"
            },
            "lazy-image-loading": {
                name: "图片与内嵌框架懒加载",
                description: "推迟加载视口外的图片和第三方 iframe 直至滚动可见，降低初始载荷。"
            },
            "enable-tls13-kyber": {
                name: "TLS 后量子加密算法 (Kyber768 / ML-KEM)",
                description: "在 TLS 1.3 握手中启用抗量子混合密钥封装 (X25519Kyber768)。"
            },
            "enable-encrypted-client-hello": {
                name: "加密客户端问候 (ECH / 加密 SNI)",
                description: "在 TLS 握手中加密服务器名称指示 (SNI)，防止 ISP 与防火墙窥探访问域名。"
            },
            "strict-origin-isolation": {
                name: "严格同源站点级进程沙盒隔离",
                description: "为每个独立源分配专用系统进程与隔离内存空间，缓解 Spectre 与 Meltdown 漏洞。"
            },
            "webrtc-ip-protection": {
                name: "WebRTC 本地 IP 与 STUN 泄漏隐藏",
                description: "限制 WebRTC ICE 候选地址，防止恶意脚本探测您的真实局域网或公网 IP。"
            },
            "enable-dns-over-https": {
                name: "严格 DNS-over-HTTPS (DoH Cloudflare/Quad9)",
                description: "通过 HTTPS（443 端口）加密所有 DNS 查询，防止 ISP 窃听与 DNS 劫持。"
            },
            "disable-hyperlink-auditing": {
                name: "禁用超链接审计 (<a ping>)",
                description: "阻止网站在用户点击链接时静默发送 POST 追踪信标请求。"
            },
            "enable-fingerprint-randomization": {
                name: "Canvas 与 WebAudio 指纹随机噪声注入",
                description: "为像素读回与音频缓冲区加入伪随机噪声，防止硬件设备指纹追踪。"
            },
            "enable-font-enumeration-shield": {
                name: "本地字体枚举防护护盾",
                description: "阻止网页探测本机已安装字体来拼凑持久性跨浏览器身份哈希。"
            },
            "aggressive-tracker-blocker": {
                name: "强力广告与 URL 追踪参数剥离引擎",
                description: "清除 utm_source、gclid、fbclid 等追踪参数并屏蔽已知追踪像素。"
            },
            "enable-subresource-filter": {
                name: "恶意弹窗与欺诈插页子资源过滤",
                description: "自动检测并拦截点击劫持、隐形覆盖链接与欺诈性下载提示。"
            },
            "enable-quic": {
                name: "实验性 QUIC 与 HTTP/3 传输协议",
                description: "启用基于 UDP 的 HTTP/3 传输，实现零 RTT 握手与多路复用流传输。"
            },
            "tor-stream-isolation": {
                name: "Tor 按域名电路隔离 (IsolateDestAddr)",
                description: "强制 Tor 空间中的每个顶级域名使用独立出口电路，防止跨站关联追踪。"
            },
            "dns-prefetching": {
                name: "预测性 DNS 预解析引擎",
                description: "提前解析当前页面可见链接的 IP 地址，消除点击时的 DNS 解析延迟。"
            },
            "heavy-ad-intervention": {
                name: "高负载网络广告干预",
                description: "自动卸载消耗超过 4MB 流量或 60 秒 CPU 时间的广告 iframe。"
            },
            "cross-origin-isolation": {
                name: "跨源开启者策略 (COOP) 与 SharedArrayBuffer",
                description: "通过严格执行跨源策略启用高精度 WebAssembly 共享内存操作。"
            },
            "document-pip-api": {
                name: "Document 画中画 API",
                description: "支持包含任意 HTML 文档、视频流与自定义控件的悬浮画中画窗口。"
            },
            "force-dark-contents": {
                name: "网页内容自动深色模式（Chromium 反色）",
                description: "使用保留亮度的色彩反转算法为仅支持浅色的网站自动合成深色主题。"
            },
            "overlay-scrollbars": {
                name: "极简悬浮滚动条",
                description: "将厚重的系统滚动条替换为停止滚动时自动淡出的精致悬浮条。"
            },
            "enable-webgpu": {
                name: "下一代 WebGPU 图形与计算 API",
                description: "为浏览器内神经网络、3D 模拟和着色器计算提供低开销直接 GPU 访问。"
            },
            "tab-audio-muting": {
                name: "标签页音频一键静音指示器",
                description: "在发声标签页上添加可交互喇叭图标，支持单击立即静音。"
            },
            "webrtc-pipewire": {
                name: "PipeWire 桌面捕获器 (Linux Wayland)",
                description: "在现代 Linux 桌面环境（GNOME、KDE Plasma）上通过 PipeWire 门户共享屏幕。"
            },
            "hdr-compositing": {
                name: "高动态范围 (HDR) 色彩合成",
                description: "在兼容的 OLED 与 mini-LED 显示器上启用 10-bit 广色域与 HDR 色调映射。"
            },
            "local-ai-assistant": {
                name: "本地 GGUF 模型显存加速 (llama.cpp)",
                description: "将本地 Gemma 与 Llama 3 权重直接卸载至 GPU 显存，实现私密低延迟总结。"
            },
            "experimental-split-screen-gestures": {
                name: "灵动分屏窗格与吸附手势",
                description: "允许将标签页拖至视口边缘即时创建水平或垂直双栏浏览视图。"
            },
            "enable-reader-mode": {
                name: "无干扰文章阅读模式",
                description: "提取文章正文与版式，去除侧边栏、广告与页面杂项，提升阅读清晰度。"
            },
            "auto-password-generation": {
                name: "高强度密码加密生成",
                description: "自动检测注册表单并生成由 QVault 托管的 128 位加密安全密码。"
            },
            "tab-groups-auto-clustering": {
                name: "按域名与工作区智能聚类标签页",
                description: "根据共享源域名和工作区使用习惯智能建议合并相关标签页。"
            },
            "touch-ui-layout": {
                name: "触屏平板 UI 模式",
                description: "增大标签栏高度与触控边距，在桌面键鼠模式下默认禁用。",
                reason: "需要检测到触摸屏数字化仪硬件。"
            },
            "eye-tracking-gaze-scroll": {
                name: "眼动追踪视线滚动导航",
                description: "根据瞳孔注视坐标控制页面滚动，需要专用红外传感器硬件。",
                reason: "未检测到受支持的眼动追踪传感器。"
            },
            "cellular-data-saver": {
                name: "蜂窝流量节省模式",
                description: "通过上游代理网关压缩远程图片。出于隐私考虑默认禁用，以防中间代理解密。",
                reason: "默认禁用以保护 Tor 与 HTTPS 端到端隐私。"
            }
        }
    }
};

const ja = {
    common: {
        incognito: "シークレット",
        selectOption: "オプションを選択...",
        colors: {
            accent: "アクセント",
            yellow: "イエロー",
            green: "グリーン",
            blue: "ブルー",
            pink: "ピンク"
        }
    },
    wallpaperPreview: {
        alt: "壁紙プレビュー",
        badge: "プレビュー"
    },
    presets: {
        names: {
            balanced: "バランス",
            developer: "開発者",
            classic_reverse: "モダン Arc",
            bottom_bar: "エルゴノミック",
            minimalist: "ミニマル集中",
            privacy: "プライバシー哨戒"
        },
        taglines: {
            balanced: "個人・仕事用のデュアルワークスペースと Google 検索。",
            developer: "GitHub Live PR 連携を備えた分離ワークスペース。",
            classic_reverse: "右配置のタブツリーとすっきりした閲覧画面。",
            bottom_bar: "親指で操作しやすい下部アドレスバー配置。",
            minimalist: "集中を妨げないコンパクトな単一ワークスペース。",
            privacy: "厳格なトラッカー保護と DuckDuckGo 検索。"
        },
        descriptions: {
            balanced: "個人・仕事の2スペース、標準プライバシー保護、Google 検索。",
            developer: "GitHub Live PR 追跡と開発フローを備えたマルチスペース分離。",
            classic_reverse: "右配置のナビゲーションツリーと集中型タブフロー。",
            bottom_bar: "片手でも操作しやすいエルゴノミックな下部アドレスバー。",
            minimalist: "単一ワークスペース、右サイドバー、最小限のコンパクトUI。",
            privacy: "厳格なトラッカー遮断、DuckDuckGo、即時 Tor オニオンルーティング。"
        },
        customTaglineFallback: "カスタムワークスペースおよびレイアウト構成。",
        accents: {
            amberGold: "アンバーゴールド",
            ocean: "オーシャン",
            skyBlue: "スカイブルー",
            cyberEmerald: "サイバーエメラルド",
            electricBlue: "エレクトリックブルー",
            royalViolet: "ロイヤルバイオレット",
            roseGold: "ローズゴールド",
            sunsetOrange: "サンセットオレンジ",
            cyberCyan: "サイバーシアン",
            slateGray: "スレートグレー"
        }
    },
    addPin: {
        title: "サイドバーにアプリをピン留め",
        subtitle: "よく使うアプリやウェブサイトのショートカットを追加",
        defaultAppName: "アプリ名",
        appNameLabel: "アプリ名 / タイトル",
        appNamePlaceholder: "例: GitHub, Gemini...",
        urlLabel: "URL / ドメイン *",
        urlPlaceholder: "例: github.com または https://gemini.google.com",
        quickPresets: "クイックプリセット",
        cancel: "キャンセル",
        pinApp: "ピン留め"
    },
    passkey: {
        biometrics: {
            darwin: "Touch ID",
            linux: "システム生体認証",
            win32: "Windows Hello"
        },
        hints: {
            darwin: "Touch ID センサーに触れるか macOS のパスワードを入力してください",
            linux: "指紋センサーに触れるかシステムのパスワードを入力してください",
            win32: "指紋センサーに触れるか Windows PIN を入力してください"
        },
        cancelDenyTitle: "キャンセルして拒否",
        verifiedTitle: "本人確認が完了しました！",
        scanningTitle: "{biometric} をスキャン中...",
        autofillTitle: "保存済みパスワードを自動入力",
        passkeyTitle: "パスキー認証",
        verifiedAutofillDesc: "保管庫のロックを解除し認証情報を入力しました",
        verifiedPasskeyDesc: "パスキーが正常に署名・解放されました",
        requireAutofillDesc: "保管庫のロック解除と自動入力には認証が必要です",
        requirePasskeyDesc: "パスキーでサインインするには認証が必要です",
        passwordBadge: "パスワード",
        passkeyBadge: "パスキー",
        accountLabel: "アカウント：",
        savedLogin: "保存済みログイン",
        passkeyUser: "パスキーユーザー",
        verifyingWith: "{biometric} で認証中...",
        verifiedBtn: "認証済み！",
        verifyWith: "{biometric} で認証",
        orPassPin: "またはマスターパスワード / PIN",
        orPass: "またはマスターパスワード",
        placeholderPin: "マスターパスワードまたは 4〜8 桁のクイック PIN",
        placeholderPass: "QVault マスターパスワードを入力",
        checking: "認証情報を確認中...",
        verifyAuth: "確認して認証",
        cancelDenyBtn: "キャンセルしてリクエストを拒否",
        websiteFallback: "ウェブサイト",
        theWebsiteFallback: "ウェブサイト",
        toastAutofill: "{domain} の保管庫を解除し認証情報を入力しました！",
        toastPasskey: "{domain} のパスキーを確認しました！",
        promptAutofill: "{domain} の認証情報を自動入力するために本人確認してください",
        promptPasskey: "QVault パスキーで {domain} にサインイン",
        biometricError: "生体認証エラー：{error}",
        vaultLockedOut: "認証失敗が続いたため保管庫をロックしました。{seconds}秒後に再試行してください。",
        incorrectCreds: "マスターパスワードまたはクイック PIN が正しくありません。",
        verificationFailed: "認証に失敗しました：{error}",
        passkeyCreateTitle: "QVault パスキーを作成",
        verifiedPasskeyCreateDesc: "本人確認完了 — QVault にパスキーを保存中",
        requirePasskeyCreateDesc: "このパスキーを作成して保存するには認証が必要です",
        useHardwareKeyBtn: "ハードウェア / システムキーを使用",
        useHardwareKeyHint: {
            darwin: "YubiKey · FIDO2 · Touch ID · スマホQR",
            linux: "YubiKey · FIDO2 · USB / NFC / BLE · スマホQR",
            win32: "YubiKey · FIDO2 · Windows Hello · スマホQR"
        },
        toastHardwareHandoff: "{domain} のハードウェア / システムセキュリティキーに切り替えています...",
        toastPasskeyCreated: "{domain} のパスキーを認証して保存しました！",
        promptPasskeyCreate: "{domain} の QVault パスキーを作成して保存"
    },
    history: {
        title: "アーカイブ",
        entrySingular: "{count} 件を保存済み",
        entryPlural: "{count} 件を保存済み",
        searchPlaceholder: "アーカイブを検索...",
        clearAllTitle: "すべての閲覧履歴を削除",
        clear: "消去",
        closeTitle: "閉じる (Esc)",
        segments: {
            all: "すべて",
            today: "今日",
            yesterday: "昨日",
            week: "過去7日間",
            older: "それ以前"
        },
        emptySearch: "「{query}」に一致する結果はありません",
        emptyTitle: "アーカイブは空です",
        emptySearchDesc: "スペルを確認するか、別のフィルターを選択してください。",
        emptyDesc: "閲覧したページはここに保存され、すばやく参照できます。",
        itemSingular: "{count} 件",
        itemPlural: "{count} 件",
        copyLinkTitle: "リンクをコピー",
        openNewTabTitle: "新しいタブで開く",
        removeTitle: "アーカイブから削除",
        toastCleared: "アーカイブを消去しました",
        toastCopied: "リンクをコピーしました",
        toastOpenedBg: "バックグラウンドタブで開きました",
        loadMore: "さらに読み込む",
    },
    cookies: {
        title: "Cookie・サイトストレージ エクスプローラー",
        subtitle: "サイトの Cookie やローカルデータを検査・検索・削除",
        filterDomain: "ドメインで絞り込む",
        refreshTitle: "リストを更新",
        allSites: "すべてのサイト",
        clearDomain: "{domain} を削除",
        clearAllData: "すべての閲覧データを削除",
        searchPlaceholder: "名前、ドメイン、値で Cookie を検索...",
        emptyTitle: "Cookie が見つかりません",
        emptyDesc: "検索をクリアするか別のドメインを選択してください",
        secure: "Secure",
        httpOnly: "HttpOnly",
        path: "パス: {path}",
        expires: "有効期限: {date}",
        deleteTitle: "Cookie を削除",
        toastDeleted: "Cookie を削除しました: {name}",
        toastClearedSite: "{domain} の Cookie を {count} 件削除しました",
        toastClearedAll: "閲覧データと Cookie を削除しました"
    },
    resources: {
        title: "タスクマネージャー",
        cpu: "CPU",
        ram: "メモリ",
        asleepCount: "{count} 件スリープ中",
        sleepInactive: "非アクティブをスリープ",
        sleepInactiveTitle: "非アクティブなバックグラウンドタブをスリープしてメモリを解放",
        wakeAll: "すべて復帰",
        wakeAllTitle: "スリープ中のすべてのタブを復帰",
        purgeCacheTitle: "ブラウザのメモリキャッシュをパージ",
        autoRefreshActiveTitle: "自動更新オン（2秒ごと）",
        autoRefreshPausedTitle: "自動更新一時停止中",
        autoRefresh2s: "2秒",
        paused: "一時停止",
        refreshTitle: "プロセスメトリクスを更新",
        closeTitle: "閉じる (ESC)",
        filters: {
            all: "すべて",
            tabs: "タブ",
            processes: "プロセス",
            sleeping: "スリープ中"
        },
        searchPlaceholder: "名前や PID で絞り込み...",
        colTask: "タスク / プロセス",
        colSpace: "スペース / 種別",
        colStatus: "状態",
        colCpu: "CPU",
        colMemory: "メモリ",
        colAction: "操作",
        emptyMatch: "「{query}」に一致するタスクはありません",
        blankTab: "空白のタブ",
        newTabDash: "Zen 新しいタブ ダッシュボード",
        pidSubtitle: "PID {pid} · {type}",
        active: "アクティブ",
        spaceTab: "{space} タブ",
        mainCore: "メインコア",
        sleep: "スリープ",
        live: "稼働中",
        memSaved: "(節約)",
        wakeTabTitle: "タブを復帰",
        activeTabCannotSleep: "アクティブなタブはスリープできません",
        sleepTabTitle: "タブをスリープにする",
        switchTabTitle: "タブへ移動",
        closeTabTitle: "タブを閉じる",
        core: "コア",
        endProcessTitle: "プロセス PID {pid} を終了",
        itemsOf: "{total} 件中 {shown} 件を表示",
        pressEscPrefix: "閉じるには",
        pressEscSuffix: "キーを押してください",
        procMain: "QBrowse メインプロセス",
        procGpu: "GPU プロセス",
        procRenderer: "Webview レンダラー",
        procUtility: "ユーティリティサービス (音声/ストレージ)",
        procZygote: "サンドボックス プリローダー",
        procPepper: "プラグインホスト",
        procChild: "{type} プロセス",
        procChildDefault: "子",
        toastHibernatedSingular: "{count} 件の非アクティブタブをスリープしました（約 {mb} MB 解放）",
        toastHibernatedPlural: "{count} 件の非アクティブタブをスリープしました（約 {mb} MB 解放）",
        toastWokeSingular: "{count} 件のスリープタブを復帰しました",
        toastWokePlural: "{count} 件のスリープタブを復帰しました",
        toastCachePurged: "キャッシュを消去しメモリを最適化しました",
        toastKillUnavailable: "プロセスを終了できません：API が利用不可",
        toastKilled: "プロセス {pid} を終了しました",
        toastKillFailed: "プロセス {pid} を終了できませんでした",
        toastKillError: "プロセス {pid} の終了中にエラーが発生しました"
    },
    docViewer: {
        fallbackName: "ローカルドキュメント",
        fallbackFile: "ファイル",
        preview: "プレビュー",
        raw: "ソース",
        zoomOut: "縮小",
        zoomIn: "拡大",
        resetZoom: "ズームをリセット",
        copyTitle: "ファイル内容をコピー",
        copied: "コピー済み",
        copy: "コピー",
        revealTitle: "システムフォルダで表示",
        loading: "ドキュメントを読み込み中...",
        errorTitle: "ファイルを表示できません",
        readError: "ファイルの読み込みに失敗しました",
        toastCopied: "内容をクリップボードにコピーしました",
        toastRevealed: "システムフォルダでファイルを表示しました"
    },
    pdfViewer: {
        toggleThumbnails: "ページサムネイルを表示/非表示",
        fallbackName: "PDF ドキュメント",
        pageSingular: "{count} ページ",
        pagePlural: "{count} ページ",
        prevPage: "前のページ",
        nextPage: "次のページ",
        zoomOut: "縮小",
        zoomIn: "拡大",
        fitWidth: "幅に合わせる",
        rotate: "時計回りに 90° 回転",
        normalMode: "通常モード",
        darkInvertMode: "ダークリーダー反転モード",
        summarize: "要約",
        revealTitle: "ファイルマネージャーで開く",
        pagesHeader: "ページ",
        pageNum: "{num} ページ",
        loading: "PDF.js でレンダリング中...",
        errorTitle: "ドキュメントを開けません",
        openError: "PDF ドキュメントを開けませんでした",
        extractingToast: "Qu-AI 用にテキストを抽出中...",
        openedAiToast: "ドキュメントのテキストを Qu-AI パネルに読み込みました！",
        extractErrorToast: "テキスト抽出に失敗しました：{error}",
        revealedToast: "システムフォルダでファイルを表示しました",
        fallbackDocName: "ドキュメント",
        pageMarker: "--- {num} ページ ---",
        summaryPrompt: "この PDF ドキュメント（{fileName}）の内容に基づき、簡潔な要約と主要なポイントをまとめてください："
    },
    localDir: {
        parentFolderTitle: "親フォルダへ移動",
        reloadTitle: "フォルダを再読み込み",
        openInFileManager: "ファイルマネージャーで開く",
        filterPlaceholder: "このディレクトリ内のファイルを絞り込む...",
        sortName: "名前",
        sortSize: "サイズ",
        sortDate: "更新日",
        gridViewTitle: "グリッド表示",
        listViewTitle: "リスト表示",
        scanning: "ディレクトリ内容をスキャン中...",
        errorTitle: "フォルダを開けません",
        goParent: "親ディレクトリへ移動",
        emptySearch: "一致するファイルがありません",
        emptySearchHint: "検索フィルターをクリアしてみてください",
        folderType: "フォルダ",
        revealTitle: "ファイルマネージャーで表示",
        colName: "名前",
        colModified: "更新日時",
        colSize: "サイズ",
        itemSingular: "{count} 項目",
        itemPlural: "{count} 項目",
        filtered: "(絞り込み)",
        suiteName: "QBrowse ファイルスイート",
        apiUnavailable: "Electron ディレクトリ API が利用できません",
        openFailed: "ディレクトリを開けませんでした",
        toastOpened: "システムファイルマネージャーで開きました",
        toastRevealed: "表示：{name}"
    },
    tour: {
        welcomeTitle: "QBrowse へようこそ",
        welcomeSubtitle: "ブラウザツアーの体験方法をお選びください：",
        overviewBadge: "概要",
        quickTitle: "クイック概要",
        quickDesc: "レイアウト、ワークスペース、ナビゲーションを分かりやすく短時間で視覚案内します。",
        startQuick: "クイックツアーを開始",
        interactiveBadge: "対話形式",
        interactiveTitle: "インタラクティブ・マスタークラス",
        interactiveDesc: "実際の UI を操作するガイドミッション：ボタン操作、Tor テスト、ショートカットを習得します。",
        startInteractive: "対話ツアーを開始",
        skipWelcome: "ツアーをスキップしてブラウジング開始 (Esc)",
        stepCounter: "ステップ {current} / {total}",
        closeTitle: "ツアーを閉じる (Esc)",
        skipTour: "スキップ",
        back: "戻る",
        finishTour: "ツアー完了",
        nextStep: "次へ",
        exitToast: "ツアーを終了しました。いつでも Ctrl+K で QBrowse を探索できます！",
        topBarShortcut: "上部バー",
        steps: {
            spaces: {
                title: "マルチスペース分離",
                badge: "ワークスペース",
                description: "作業をきれいに分離します。各スペース（個人、仕事、シークレット、Tor）はログイン、Cookie、タブを完全に独立管理します。",
                missionInstruction: "サイドバーの「仕事」スペースをクリックするか Ctrl+2 を押してください",
                missionSuccess: "スペースを切り替えました！タブ・ログイン・Cookie が完全に分離されているのが分かります。"
            },
            splitview: {
                title: "ネイティブ画面分割ビュー",
                badge: "マルチタスク",
                description: "別ウィンドウを開かずに2つのサイトを並べて同時閲覧。調べ物、ドキュメント参照、比較に最適です。",
                missionInstruction: "上部バーの画面分割アイコンをクリックするか Ctrl+\\ を押してください",
                missionSuccess: "画面分割を切り替えました！右側に2つ目のブラウザペインが表示されました。"
            },
            tor: {
                title: "内蔵 Tor オニオンネットワーク",
                badge: "プライバシー & Onion",
                description: "多段リレー暗号化を内蔵。外部プロキシなしで暗号化 Tor リレー経由で .onion ドメインへアクセスできます。",
                missionInstruction: "上部バーの Tor アイコンをクリックして有効なリレー回路を確認してください",
                missionSuccess: "Tor 回路が開きました！中継ノードを確認したりいつでも切り替えたりできます。"
            },
            vault: {
                title: "ゼロ知識 QVault",
                badge: "ハードウェアセキュリティ",
                description: "マスターパスワード、パスキー、カード情報はローカルハードウェアキーと {biometric} で端末内に暗号化保存されます。",
                missionInstruction: "上部バーの QVault アイコンをクリックしてローカル保管庫を開いてください",
                missionSuccess: "QVault が開きました！すべての認証情報は生体認証保護のもとローカルで暗号化されています。"
            },
            shield: {
                title: "ネイティブ広告・トラッカー遮断",
                badge: "保護",
                description: "ハードウェア支援のネットワーク遮断により、テレメトリ、マイナー、フィンガープリンティング、広告を通信前にブロックします。",
                missionInstruction: "上部バーのシールドアイコンをクリックしてブロック済みトラッカーを確認してください",
                missionSuccess: "QShield インスペクターが開きました！ブロックされたドメインをリアルタイムで確認できます。"
            },
            darkmode: {
                title: "スマートダークモード & テーマ",
                badge: "外観",
                description: "洗練されたダークテーマ、明瞭なライトモード、明るい既存サイトを反転するスマート反転を自在に切り替えられます。",
                missionInstruction: "上部バーのテーマアイコンをクリックして外観オプションを確認してください",
                missionSuccess: "テーマパネルが開きました！ダーク・ライト・スマート反転を切り替えられます。"
            },
            toolhub: {
                title: "ToolHub & 永続付箋メモ",
                badge: "リサーチ & ツール",
                description: "ウェブ上のテキストをハイライトして再起動後も残るメモを保存。ローカル AI アシスタントやクリップボード履歴も搭載。",
                missionInstruction: "右端の ToolHub ハンドルをクリックするか Ctrl+J を押してドロワーを開いてください",
                missionSuccess: "ToolHub が開きました！サイトへのメモ添付、クリップ履歴、ローカル AI とのチャットが可能です。"
            },
            omnibox: {
                title: "スマート Omnibox & コマンドパレット",
                badge: "ユニバーサルコマンド",
                description: "あらゆる操作の起点。ショートカット検索 (!yt, @github)、ブラウザコマンド (>pdf, >clear)、計算、ローカル AI 連携に対応。",
                missionInstruction: "Ctrl+K を押すか中央のアドレスバーをクリックして操作してください",
                missionSuccess: "Omnibox が有効になりました！!yt や @github、> コマンドを試してみてください。"
            }
        }
    },
    reader: {
        themes: {
            dark: "ダーク",
            sepia: "セピア",
            light: "ライト",
            midnight: "ミッドナイト"
        },
        fonts: {
            serif: "明朝",
            sans: "ゴシック",
            mono: "等幅",
            dyslexic: "読みやすさ重視"
        },
        widths: {
            compact: "狭い",
            balanced: "標準",
            wide: "広い"
        },
        exitTitle: "リーダーモードを終了 (Esc / Ctrl+Alt+R)",
        backToWebpage: "ページに戻る",
        openOriginalTitle: "元のページを開く: {url}",
        hideAudioTitle: "音声プレーヤーを隠す",
        listenTitle: "記事を聴く（音声読み上げ）",
        listening: "読み上げ中",
        readAloud: "読み上げ",
        themeTitle: "{name}テーマ",
        fontTitle: "{name}フォントを使用",
        decreaseSizeTitle: "文字を小さくする",
        increaseSizeTitle: "文字を大きくする",
        widthTitle: "列幅：{name}",
        closeTitle: "リーダーモードを閉じる",
        byAuthor: "著者：{author}",
        minRead: "約 {minutes} 分",
        wordsCount: "{count} 語",
        prevParaTitle: "前の段落",
        pauseTitle: "一時停止",
        playTitle: "再生",
        nextParaTitle: "次の段落",
        audioNarration: "音声ナレーション",
        blockProgress: "ブロック {current} / {total}",
        speedTitle: "読み上げ速度を変更",
        selectVoiceTitle: "音声を選択",
        voiceFallback: "音声",
        systemVoices: "システム音声",
        stopCloseTitle: "停止して閉じる",
        highlightWithTitle: "{color}でハイライト",
        noteBtn: "メモ",
        copyTextTitle: "テキストをコピー",
        stickyNote: "付箋メモ",
        notePlaceholder: "メモや考えを入力...",
        deleteBtn: "削除",
        saveBtn: "保存"
    },
    toolhub: {
        title: "Tool Hub",
        snip: "切り取り",
        snipTitle: "インタラクティブ画面切り取り（範囲選択）",
        captureViewportTitle: "表示領域をキャプチャ",
        captureFullTitle: "ページ全体をスクロールキャプチャ",
        tabs: {
            notes: "メモ",
            clipboard: "クリップボード",
            ai: "ローカル AI",
            downloads: "ダウンロード"
        },
        webNotesTab: "Web メモ ({count})",
        scratchpadTab: "メモ帳",
        globalScope: "全体",
        spaceScope: "{space} スペース",
        scratchpadTitle: "メモ帳：{name}",
        scratchpadGlobalPlaceholder: "全体のメモやリンクを書き留め... Markdown 対応。",
        scratchpadSpacePlaceholder: "{space} スペース用メモ帳... Markdown 対応。",
        searchNotesPlaceholder: "ハイライト・メモ・ドメインを検索...",
        clearSearchTitle: "検索をクリア",
        allSpaces: "すべて",
        exportMd: "MD 出力",
        exportMdTitle: "メモを Markdown (.md) で書き出す",
        noWebNotesTitle: "保存された Web メモはありません",
        noWebNotesDesc: "ウェブページのテキストを選択して「メモ」をクリックすると、訪問後も残るメモを保存できます。",
        otherDomain: "その他",
        colorTitle: "色：{color}",
        jumpHighlightTitle: "クリックしてページ内のハイライトへ移動",
        editNotePlaceholder: "メモや感想を追加...",
        deleteNote: "メモを削除",
        deleteNoteTitle: "メモテキストを削除",
        cancel: "キャンセル",
        saveNote: "メモを保存",
        clickToEditNote: "クリックしてメモを編集",
        addNoteTitle: "メモを追加",
        noteBtn: "メモ",
        copyQuoteTitle: "引用をコピー",
        jumpBtn: "移動",
        jumpBtnTitle: "ページ上のメモへ移動",
        deleteHighlightTitle: "ハイライトを削除",
        clipboardHeader: "システム クリップボード履歴",
        syncBtn: "同期",
        syncTitle: "クリップボードを同期",
        deleteClipTitle: "履歴を削除",
        clipboardEmptyTitle: "クリップボード履歴は空です",
        clipboardEmptyDesc: "テキストや URL をコピーするとここに表示されます",
        clearClipboard: "クリップボード履歴を消去",
        aiStatusRunning: "llama-server 稼働中 (ポート 8080)",
        aiStatusDownloading: "モデルをダウンロード中 ({progress}%)...",
        aiStatusStarting: "エンジンを起動中...",
        aiStatusReady: "起動準備完了",
        aiStatusDownloaded: "ダウンロード済み",
        aiStatusNotDownloaded: "モデル未ダウンロード",
        cancelDownloadTitle: "ダウンロードを中止",
        downloadModelTitle: "{name} をダウンロード ({size})",
        downloadBtn: "ダウンロード",
        startingBtn: "起動中...",
        stopBtn: "停止",
        startBtn: "起動",
        openWebUiTitle: "llama.cpp Web UI を開く",
        aiConsoleSettingsTitle: "llama.cpp コンソールと詳細設定",
        downloadingFile: "{filename} をダウンロード中",
        downloadingWeights: "重みをダウンロード中...",
        noModelTitle: "AI モデルがダウンロードされていません",
        offlineBadge: "オフライン",
        noModelDesc: "{name} をダウンロードすると、高速でプライベートなローカル AI によるページ要約・コーディング・チャットが利用できます。",
        downloadModelSize: "モデルをダウンロード ({size})",
        settingsBtn: "設定",
        contextBtn: "コンテキスト",
        searchBtn: "検索",
        voiceBtn: "音声",
        summarizeBtn: "要約",
        summarizePrompt: "このウェブページの内容に基づき、主要なポイントと要点を分かりやすく要約してください。",
        attachTitle: "ファイルまたは画像を添付",
        chatPlaceholder: "ローカル Gemma 4 AI に質問、またはファイルをドロップ...",
        voiceInputTitle: "音声入力 (Whisper)",
        downloadsHeader: "進行中・最近のダウンロード",
        itemSingular: "{count} 件",
        itemPlural: "{count} 件",
        openDownloadsFolderTitle: "ダウンロードフォルダを開く",
        clearDownloadsTitle: "すべてのダウンロード履歴を削除",
        downloadedFileFallback: "ダウンロードファイル",
        snipBadge: "切り取り",
        verified: "検証済み",
        unverified: "未検証",
        sha256Prefix: "SHA-256: {hash}",
        saved: "保存済み",
        verifyCopyHashTitle: "SHA-256 チェックサムを検証・コピー",
        copyHashTitle: "SHA-256: {hash} (クリックでコピー)",
        copyImageTitle: "画像をクリップボードにコピー",
        showInFolderTitle: "フォルダに表示",
        deleteDownloadTitle: "ファイルを削除してリストから除外",
        downloadsEmptyTitle: "アクティブなダウンロードはありません",
        downloadsEmptyDesc: "スクリーンショットやダウンロードしたファイルはここに表示されます",
        pdfPageName: "{name} ({page} ページ)",
        pdfImageSize: "PDF 画像",
        toasts: {
            jumpingToNote: "ページ上のメモへ移動中...",
            exportedMarkdown: "Markdown ファイルを書き出しました！",
            copiedNotesMarkdown: "メモを Markdown としてコピーしました！",
            copiedToClipboard: "クリップボードにコピーしました！",
            clipDeleted: "クリップを削除しました",
            clipboardCleared: "クリップボード履歴を消去しました",
            parsingPdf: "PDF を視覚的に解析中: {name}",
            pdfVramLimit: "{name} の最初の 10 ページを画像として読み込みました（VRAM 制限）。",
            pdfVisualFailed: "PDF の視覚解析に失敗しました。テキスト抽出に切り替えます。",
            openPageFirst: "要約するにはまずウェブページを開いてください",
            transcriptionFailed: "音声認識に失敗しました",
            micDenied: "マイクへのアクセスが拒否されました",
            noteRemoved: "メモを削除しました",
            noteUpdated: "メモを更新しました",
            copiedQuote: "引用をコピーしました",
            highlightRemoved: "ハイライトを削除しました",
            downloadsCleared: "ダウンロードリストを消去しました",
            hashCopied: "SHA-256 チェックサムをコピーしました",
            hashMissing: "ハッシュを計算できません — ファイルが見つかりません",
            screenshotCopied: "スクリーンショットをクリップボードにコピーしました",
            downloadDeleted: "ダウンロードとファイルを削除しました"
        },
        cancelled: "キャンセル",
        failed: "失敗"
    },
    fontManager: {
        title: "アプリ タイポグラフィ & フォント",
        active: "使用中：",
        resetTitle: "OS 標準フォントにリセット",
        resetToDefault: "デフォルトに戻す",
        modes: {
            preset: "プリセット",
            google: "Google Fonts",
            system: "システム",
            file: "アップロード"
        },
        categories: {
            all: "すべて",
            sans: "サンセリフ",
            mono: "等幅",
            serif: "セリフ"
        },
        activeFont: "使用中のフォント",
        clickToApply: "クリックして適用",
        googleTitle: "任意の Google Font を使用",
        googleDesc: "fonts.google.com のフォント名を入力して Enter を押すと QBrowse に即時読み込みます。",
        googlePlaceholder: "例: Montserrat, Space Grotesk, Syne, Cinzel...",
        applyFont: "適用",
        popularGoogle: "人気の Google Fonts",
        filterPlaceholder: "リストを絞り込み...",
        systemTitle: "システムフォント選択",
        systemDesc: "OS にインストール済みのフォント名を入力（例: Yu Gothic UI,Hiragino Sans,Segoe UI）。",
        systemPlaceholder: "システムフォント名を入力...",
        installed: "インストール済み",
        notDetected: "未検出",
        notDetectedTitle: "キャンバス計測で検出されませんでしたが、利用可能であれば CSS が適用を試みます",
        commonOsFonts: "一般的な OS フォント",
        dropTitle: "クリックまたはフォントファイルをここにドロップ",
        dropDesc: "TrueType (.ttf)、OpenType (.otf)、WOFF (.woff)、WOFF2 (.woff2) 最大 12MB に対応。",
        selectFile: "ローカルファイルを選択",
        activeCustomFace: "有効なカスタムフォント",
        removeFileTitle: "アップロードしたフォントを削除",
        fineTuning: "タイポグラフィ微調整",
        letterSpacing: "文字間隔 (トラッキング)",
        weightShift: "太さ (ウェイト)",
        fontScale: "UI フォント倍率",
        reset100Title: "100% にリセット",
        specimen: "書体見本",
        specimen1: "いろはにほへと ちりぬるを わかよたれそ",
        specimen2: "Sphinx of black quartz, judge my vow.",
        activeDefault: "システム標準 (Segoe UI / ネイティブ)",
        activeGoogle: "Google Font: {name}",
        activeSystem: "システムフォント: {name}",
        activeFile: "カスタムファイル: {name}",
        customLabel: "カスタム",
        installedOsLabel: "OS インストール済み",
        uploadedFontLabel: "アップロード済み",
        spacing: {
            tight: "狭い",
            normal: "標準",
            relaxed: "広め",
            wide: "広い"
        },
        weight: {
            normal: "標準",
            medium: "中太",
            semibold: "太め"
        },
        osLabels: {
            "Windows 11": "Windows 11",
            Windows: "Windows",
            macOS: "macOS",
            "macOS / Multi": "macOS / マルチ",
            Universal: "汎用",
            "Windows Dev": "Windows 開発",
            "Windows Terminal": "Windows ターミナル",
            Casual: "カジュアル",
            Linux: "Linux",
            GNOME: "GNOME",
            Serif: "セリフ"
        },
        presetDefaultName: "システム標準",
        presets: {
            default: {
                description: "OS ネイティブのタイポグラフィ (Segoe UI / San Francisco)。",
                previewText: "Aa Bb あ 123"
            },
            inter: {
                description: "デジタル画面向けに設計された、明瞭で高可読性なモダンUI書体。",
                previewText: "モダン ネオグロテスク"
            },
            geist: {
                description: "幾何学的な精密さを持つ Vercel の開発者向け書体。",
                previewText: "ミニマルエンジニアリング"
            },
            outfit: {
                description: "ラグジュアリーで洗練された印象のジオメトリック・サンセリフ。",
                previewText: "洗練ジオメトリック"
            },
            "plus-jakarta": {
                description: "プレミアムな Web アプリ向けに作られた親しみやすい現代書体。",
                previewText: "フレンドリーモダン"
            },
            poppins: {
                description: "丸みと活力のあるカーブが特徴的なジオメトリック書体。",
                previewText: "親しみやすい曲線"
            },
            roboto: {
                description: "Android と Material Design を支える Google の定番書体。",
                previewText: "Material デザイン"
            },
            manrope: {
                description: "モダングロテスクと幾何学書体を融合した高い視認性。",
                previewText: "精密セミジオメトリック"
            },
            lexend: {
                description: "目の負担を軽減し読書速度を高めるために科学的に設計された書体。",
                previewText: "快適な可読性"
            },
            "jetbrains-mono": {
                description: "高いエックスハイトにより視認性を高めた開発者向け等幅フォント。",
                previewText: "開発者スタイル"
            },
            "fira-code": {
                description: "プログラミング用リガチャー（合字）を備えた明瞭な等幅フォント。",
                previewText: "=> コード合字"
            },
            "playfair-display": {
                description: "伝統的な欧州印刷を想起させる高コントラストなセリフ書体。",
                previewText: "エディトリアル気品"
            },
            merriweather: {
                description: "長文読解に最適化された温かみのあるクラシックセリフ書体。",
                previewText: "クラシック文学書体"
            }
        },
        errors: {
            invalidFormat: "無効な形式です。.ttf、.otf、.woff、.woff2 を選択してください。",
            tooLarge: "ファイルサイズが大きすぎます。上限は 12MB です。",
            readFailed: "フォントファイルの読み込みに失敗しました。"
        },
        toasts: {
            presetSet: "アプリフォントを {name} に設定しました",
            googleApplied: "Google Font「{name}」を適用しました",
            systemApplied: "システムフォント「{name}」を適用しました",
            fileLoaded: "カスタムフォント「{name}」を読み込みました"
        }
    },
    aiSettings: {
        title: "llama.cpp AI エンジン",
        status: {
            online: "オンライン (llama-server)",
            starting: "起動中...",
            updating: "エンジン更新中...",
            error: "エンジンエラー",
            stopped: "停止中"
        },
        syncTitle: "ネイティブ llama.cpp エンジンを確認・同期 (Gemma 4 対応 b11796)",
        updatingBtn: "更新中...",
        syncBtn: "エンジン同期 (b11796)",
        subtitle: "Gemma 4、Qwen 3.5、Bielik 11B GGUF にネイティブ対応した高速・ゼロ知識ローカル LLM ランナー。",
        downloadingModel: "モデルをダウンロード中 ({progress}%)",
        connectingCdn: "CDN に接続中...",
        cancel: "中止",
        downloadBtn: "{name} をダウンロード ({size})",
        startingBtn: "llama-server を起動中...",
        stopBtn: "llama-server を停止",
        startBtn: "llama-server を起動",
        defaultStartError: "llama-server の起動中にエラーが発生しました。",
        dismiss: "閉じる",
        updateEngineBtn: "AI エンジンを更新",
        genSpeed: "生成速度",
        tokPerSec: "tok/s",
        contextWindow: "コンテキスト長",
        tokens: "トークン",
        gpuOffload: "GPU オフロード",
        layers: "レイヤー",
        activeModelTitle: "アクティブな GGUF モデル",
        loadCustomGguf: "カスタム .GGUF を読み込む...",
        loadCustomProjector: "カスタムプロジェクターを読み込む...",
        customModelPrefix: "カスタムモデル：{path}",
        customProjectorPrefix: "カスタムプロジェクター：{path}",
        reset: "リセット",
        downloadedBadge: "取得済み",
        downloadingTarget: "{target} をダウンロード中",
        visionProjector: "ビジョンプロジェクター...",
        languageModel: "言語モデル...",
        weights: "重みデータ...",
        modelReady: "モデル使用可能",
        downloadModelFile: "モデルをダウンロード ({size})",
        overridesTitle: "llama-server パラメータ",
        autoDetectBtn: "ハードウェア自動検出",
        cpuThreadsLabel: "CPU スレッド (-t)：{threads}",
        contextSizeLabel: "コンテキストサイズ (-c)",
        tokensOption: "{n} トークン",
        contextBadges: {
            compact: "コンパクト",
            default: "標準",
            extended: "拡張",
            max: "最大"
        },
        gpuLayersLabel: "GPU オフロード層 (-ngl)：{layers}",
        dataProcessingTitle: "データ処理",
        parsePdfTitle: "PDF を画像として解析",
        parsePdfDesc: "チャットに PDF をドロップした際、テキスト抽出の代わりに各ページを画像として解析します。Gemma 4 や Qwen 3.5 の視覚理解に最適です。",
        consoleTitle: "llama-server ターミナルコンソール (ライブ出力)",
        copyOutputTitle: "ターミナル出力をコピー",
        clearConsoleTitle: "コンソールを消去",
        consoleEmpty: "[llama-server コンソール初期化完了。サーバー出力を待機中...]",
        modelWord: "モデル",
        visionWord: "ビジョン",
        models: {
            "gemma-4-e2b": "画像解析とチャット向けの完全なマルチモーダル視覚対応 Google Gemma 4 E2B Instruct GGUF モデル。",
            "gemma-4-e4b": "複雑な分析のための完全なマルチモーダル視覚対応・高推論 Google Gemma 4 E4B モデル。",
            "qwen-3.5-4b": "マルチモーダル視覚、推論、コード生成、多言語理解に対応した Alibaba Qwen 3.5 4B モデル。",
            "bielik-11b-v3.1": "高いポーランド語・欧州言語理解と推論能力を備えた SpeakLeash 旗艦 11B モデル。"
        },
        toasts: {
            customModelLoaded: "カスタムモデルを読み込みました：{name}",
            demoModelLoaded: "デモ用カスタムモデルパスを読み込みました！",
            customProjectorLoaded: "ビジョンプロジェクターを読み込みました：{name}",
            demoProjectorLoaded: "デモ用プロジェクターパスを読み込みました！",
            updatingEngine: "ネイティブ llama.cpp エンジンを更新中...",
            engineUpdated: "llama.cpp エンジンが最新ビルド (b11796) に更新されました！",
            engineUpdateFailed: "エンジン更新に失敗しました：{error}",
            unknownError: "不明なエラー",
            logsCopied: "llama-server ログをクリップボードにコピーしました！",
            hardwareDetected: "ハードウェア検出：{threads} スレッド、{ram}GB RAM",
            hardwareDefault: "ハードウェア検出：デフォルト最適化を適用しました",
            resizingContext: "コンテキストウィンドウを {tokens} トークンに変更中..."
        }
    },
    adblockImport: {
        title: "GitHub / Web からブロックリストをインポート",
        subtitle: "hosts ファイル、GitHub raw リスト、Adblock ルールを自動解析して登録します。",
        closeTitle: "閉じる",
        modeUrl: "リモート URL / GitHub",
        modePaste: "テキストを貼り付け",
        urlLabel: "ブロックリスト URL (GitHub raw、Gist、または hosts URL)",
        githubRawBadge: "GitHub Raw",
        githubRawTitle: "GitHub リンクを検出し、raw 形式へ自動変換しました",
        fetching: "取得中...",
        fetchParse: "取得して解析",
        popularLists: "人気のコミュニティリスト",
        pasteLabel: "hosts ファイル、ABP フィルタールール、またはドメインリストを貼り付け",
        pastePlaceholder: "# 下に任意の形式で貼り付け：\n0.0.0.0 tracking.evil.com\n127.0.0.1 ads.adserver.org\n||telemetry.network.io^\nanalytics.badsite.com",
        parsing: "解析中...",
        parseDomains: "ドメインを解析",
        back: "戻る",
        backTitle: "入力ソースに戻る (Esc)",
        readyToImport: "インポート準備完了",
        kbSource: "ソース {kb} KB",
        validDomains: "有効なドメイン",
        newUnique: "新規ユニーク",
        duplicatesFiltered: "除外した重複",
        linesAnalyzed: "解析行数",
        extractedSample: "抽出ドメインのサンプル ({count})",
        searchSamplePlaceholder: "サンプルを検索...",
        moreDomains: "+ 他 {count} 件のドメイン",
        backToSource: "ソースに戻る",
        cancel: "キャンセル",
        replaceList: "リスト全体を置換",
        replaceListTitle: "既存のカスタムブロックリストを解析結果で置き換えます",
        importN: "{count} 件のドメインをインポート",
        importDomains: "ドメインをインポート",
        pastedSourceLabel: "貼り付けテキスト",
        errors: {
            invalidUrl: "有効なブロックリスト URL を入力してください。",
            fetchFailed: "リモートリストの取得に失敗しました",
            noValidFromUrl: "このソースから有効なドメイン名を解析できませんでした。",
            downloadError: "リストのダウンロード中にエラーが発生しました",
            emptyPaste: "先にドメインまたは hosts ルールを貼り付けてください。",
            noValidFromText: "テキストから有効なドメイン名を抽出できませんでした。",
            parseError: "テキストの解析エラー"
        },
        presets: {
            stevenblack: {
                desc: "アドウェアやマルウェアを防ぐ包括的なコミュニティ厳選リスト。",
                badge: "推奨"
            },
            "oisd-basic": {
                desc: "誤検知を抑えつつモバイルとウェブの追跡を遮断する軽量リスト。",
                badge: "低負荷"
            },
            "adguard-trackers": {
                desc: "解析・テレメトリスクリプトに特化したドメインブロックリスト。",
                badge: "プライバシー"
            },
            peterlowe: {
                desc: "長年実績のある標準的な広告サーバーリスト。",
                badge: "高速"
            },
            danpollock: {
                desc: "テレメトリやスパムサイトを遮断する信頼性の高いゼロホストリスト。",
                badge: "クラシック"
            }
        }
    },
    studio: {
        title: "プリセットスタジオ",
        subtitle: "コンポーネントを再配置し、角丸やテーマを調整してカスタムプリセットを管理します。",
        tabCanvas: "キャンバス",
        tabPresets: "プリセット",
        closeAria: "プリセットスタジオを閉じる",
        dockLeftSidebar: "サイドバーを左に配置",
        dockRightSidebar: "サイドバーを右に配置",
        dockTopBar: "ナビゲーションバーを上に配置",
        dockBottomBar: "ナビゲーションバーを下に配置",
        searchBarPlaceholder: "ウェブを検索、またはコマンドを入力...",
        toolhubDockTitle: "ToolHub 配置：{pos}（クリックまたはドラッグで切替）",
        legendDock: "バー：",
        legendBarValue: "{pos}",
        legendSidebar: "サイドバー：",
        legendToolhub: "ToolHub：",
        legendSummary: "角丸: {curvature} · Omnibox: {omnibox} · タブ: {tabs}",
        layoutControls: "レイアウト設定",
        resetTitle: "下書きを現在のブラウザ設定にリセット",
        reset: "リセット",
        editingLabel: "編集中：",
        cancelEditTitle: "編集を中止して新規プリセットを作成",
        cancel: "キャンセル",
        sidebarMode: "サイドバーモード",
        sidebarModes: {
            classic: "クラシック",
            floating: "フローティング",
            compact: "コンパクト",
            hidden: "非表示"
        },
        windowCurvature: "ウィンドウの角丸",
        curvatures: {
            default: "標準",
            cohesive: "統一",
            square: "シャープ"
        },
        omniboxArch: "Omnibox スタイル",
        omniboxStyles: {
            capsule: "カプセル",
            wide: "ワイド",
            minimal: "ミニマル"
        },
        tabPresentation: "タブの表示スタイル",
        tabStyles: {
            pills: "ピル",
            compact: "コンパクト",
            cards: "カード"
        },
        windowControlsStyle: "ウィンドウボタン",
        controlsStyles: {
            mac: "macOS",
            windows: "Windows",
            minimal: "ミニマル"
        },
        windowControlsLayout: "ボタンの並び順",
        controlsOrders: {
            auto: "スマート配置",
            "close-first": "閉じるを先頭",
            "minimize-first": "最小化を先頭"
        },
        themeLabel: "テーマ",
        themes: {
            dark: "ダーク",
            light: "ライト"
        },
        uiScaleLabel: "UI スケール",
        uiScales: {
            comfortable: "標準",
            compact: "コンパクト"
        },
        accentSwatchLabel: "アクセントカラー",
        openColorPickerTitle: "カラーピッカーを開く",
        saveChanges: "変更を保存",
        applyLive: "ライブ適用",
        saveAsNew: "新規として保存",
        applyToBrowser: "ブラウザに適用",
        saveAsCustom: "カスタムプリセットとして保存",
        searchPresetsPlaceholder: "プリセットを検索...",
        filterAll: "すべて",
        filterBuiltin: "内蔵",
        filterCustom: "カスタム ({count})",
        saveActiveSetup: "現在の設定を保存",
        activeBadge: "使用中",
        editingBadge: "(編集中)",
        reapply: "再適用",
        apply: "適用",
        editInStudio: "スタジオで編集",
        customize: "カスタマイズ",
        editPresetTitle: "スタジオでプリセットを編集",
        customizePresetTitle: "スタジオでレイアウトを調整",
        duplicateTitle: "プリセットを複製",
        deleteTitle: "カスタムプリセットを削除",
        editCustomModalTitle: "カスタムプリセットを編集",
        saveCustomModalTitle: "カスタムプリセットとして保存",
        presetNameLabel: "プリセット名",
        presetNamePlaceholder: "例: エルゴノミックフロー、ミニマル Arc",
        presetDescLabel: "説明 / タグライン",
        presetDescPlaceholder: "この構成の短い説明...",
        presetIconLabel: "アイコン",
        createPreset: "プリセットを作成",
        deleteConfirmTitle: "カスタムプリセットを削除しますか？",
        deleteConfirmDescBefore: "カスタムプリセット ",
        deleteConfirmDescAfter: " を削除してもよろしいですか？この操作は元に戻せません。",
        deletePresetBtn: "削除する",
        posTop: "上",
        posBottom: "下",
        posLeft: "左",
        posRight: "右",
        moveTo: "{pos}へ移動",
        draggableNavTitle: "ドラッグ可能なバー：上下にドラッグまたはクリックで切替",
        draggableSidebarTitle: "ドラッグ可能なサイドバー：左右のゾーンにドラッグ",
        swapTo: "{pos}へ切り替え",
        miniTab: "タブ #{num}",
        miniCardView: "カードビュー #{num}",
        miniActiveSpaceTab: "スペースタブ",
        miniSidebarPos: "サイドバー ({pos})",
        layoutTagFormat: "{bar} · {sidebar}",
        layoutSummaryFormat: "{tag} · {toolhub}",
        topBarLabel: "上部バー",
        bottomBarLabel: "下部バー",
        leftSidebarLabel: "左サイドバー",
        rightSidebarLabel: "右サイドバー",
        leftToolhubLabel: "左 ToolHub",
        rightToolhubLabel: "右 ToolHub",
        tabsHighlight: "{style}タブ",
        compactScaleLabel: "コンパクト",
        comfortableScaleLabel: "標準スケール",
        defaultCustomName: "カスタムプリセット",
        defaultCustomDesc: "カスタムユーザー設定",
        defaultNewNameFormat: "{bar} {side}",
        defaultNewNameArc: "Arc",
        defaultNewNameFlow: "Flow",
        defaultNewDescFormat: "カスタム：{bar}、{sidebar}、{tabs}タブ",
        toasts: {
            applied: "レイアウトをブラウザに適用しました！",
            reset: "下書きを現在の設定に戻しました",
            editingPreset: "スタジオで「{name}」を編集中",
            loadedPreset: "「{name}」をキャンバスに読み込みました",
            switchedNewDraft: "新しい下書きに切り替えました"
        }
    },
    setup: {
        strictOfflineTitle: "バックグラウンド通信ゼロ（厳格オフライン）",
        strictOfflineDesc: "すべてのオプションのバックグラウンド通信（更新確認、フィルター更新、ライブ候補、リモートファビコン、クラウド同期）を無効にします。",
        headerTitle: "QBrowse セットアップ",
        headerSubtitle: "パーソナライズアシスタント",
        steps: {
            language: {
                label: "言語",
                desc: "表示言語"
            },
            presets: {
                label: "プリセット",
                desc: "スタイルと外観"
            },
            import: {
                label: "インポート",
                desc: "ブックマーク等"
            },
            privacy: {
                label: "プライバシー",
                desc: "保護と Tor"
            },
            default: {
                label: "既定設定",
                desc: "OS 統合"
            },
            sync: {
                label: "同期・アカウント",
                desc: "クラウド/ローカル"
            }
        },
        chooseSetupTitle: "セットアップを選択",
        chooseSetupDesc: "最適なレイアウトで始めましょう。すべてのパネルは後からいつでも変更できます。",
        customLayoutCta: "細かく調整したいですか？プリセットスタジオ →",
        themeLabel: "テーマ",
        dark: "ダーク",
        light: "ライト",
        accentLabel: "アクセント",
        step2Badge: "ステップ 2 / 5",
        step2Title: "データとパスワード庫を移行",
        step2Desc: "ブックマークを取り込み、Bitwarden、Proton Pass、Chrome、Firefox からパスワードを移行します。",
        tabBookmarks: "ブックマーク",
        tabVault: "パスワード庫",
        bookmarksFound: "{count} 件のブックマークを検出",
        notDetected: "この端末では未検出",
        imported: "インポート済み",
        importing: "インポート中...",
        importBookmarks: "ブックマークを取り込む",
        scanningBrowsers: "インストール済みブラウザをスキャン中...",
        htmlImported: "HTML ファイルを取り込みました ({count} 件)",
        uploadHtml: "ブックマーク HTML ファイルをアップロード (.html)",
        vaultComplete: "移行が完了しました",
        vaultImportedSummary: "{source} から {count} 件を QVault へ取り込みました！",
        importAnother: "別のファイルを取り込む",
        exportCsvJson: ".CSV または .JSON でエクスポート",
        parsingVault: "ファイルを解析中...",
        uploadVault: "エクスポートファイルをアップロード (.csv / .json)",
        compatibleManagers: "Bitwarden、Proton Pass、Google Chrome、Edge、Brave、1Password に対応",
        step3Badge: "ステップ 3 / 5",
        step3Title: "プライバシーを強化",
        step3Desc: "QBrowse は追跡スクリプトを遮断し、煩わしい広告を排除し、Tor ネットワーク経由の通信に対応します。",
        privacyOptimizedBadge: "プリセット：プライバシー最適化済み",
        adblockTitle: "Ghostery ネイティブトラッカー保護",
        adblockDesc: "ページ読み込みを遅くせず、トラッカー・テレメトリ・迷惑広告をブロックします。",
        torTitle: "Tor オニオンルーティングスペース",
        torDesc: "いつでも .onion 閲覧と多段暗号化リレー回路を利用できます。",
        ready: "準備完了",
        step4Badge: "ステップ 4 / 5",
        step4Title: "既定のブラウザに設定",
        step4Desc: "デスクトップのリンクを分離されたスペースで開き、仕事とプライベートを自動で分けます。",
        isDefaultTitle: "QBrowse は既定のブラウザです！",
        makeDefaultTitle: "QBrowse をメインのブラウザに設定しましょう",
        isDefaultDesc: "すべてのリンクとウェブファイルが自動的に QBrowse で開きます。",
        makeDefaultDesc: "http://、https://、HTML ファイルを OS と深く連携して処理します。",
        osLabels: {
            darwin: "システム設定",
            linux: "既定のアプリケーション",
            win32: "Windows 既定のアプリ"
        },
        defaultHint: "「{label}」を開きました — システムウィンドウで QBrowse を選択してください。",
        openOsSettings: "{label} を開く",
        defaultSet: "既定に設定済み",
        openingSettings: "設定を開いています...",
        setAsDefault: "既定のブラウザにする",
        step5Badge: "ステップ 5 / 5 • プロファイルとクラウド同期",
        step5Title: "ブラウジング方法を選択",
        step5Desc: "完全な自己管理：ローカルハードウェア暗号化による完全オフライン利用、または無料クラウド同期アカウントでの複数端末同期を選べます。",
        zeroTelemetry: "テレメトリなし",
        localProfile: "ローカルプロファイル",
        localProfileDesc: "100% オフライン。パスワード・履歴・タブはローカルハードウェアキーで暗号化され端末外に出ません。アカウント不要。",
        e2eEncrypted: "E2E 暗号化",
        cloudSync: "QBrowse クラウド同期",
        cloudSyncDesc: "Firebase 経由でパスワード庫、ワークスペース、固定タブ、ブックマークを端末間でシームレスに同期します。",
        localReadyTitle: "ローカルプロファイルの準備が整いました",
        localReadyDesc: "すべてのデータはテレメトリなしでこの端末内にのみ保存されます。クラウド同期は後から設定でいつでも有効にできます。",
        takeTour: "ライブツアーを体験する",
        startDirectly: "そのままブラウジング開始",
        activeSync: "同期有効",
        cloudLinked: "エンドツーエンド暗号化クラウドと連携済み",
        signOut: "サインアウト",
        activeSyncDesc: "ブックマーク、ワークスペースタブ、暗号化パスワード庫が許可済みデバイス間でリアルタイム同期されています。",
        signIn: "サインイン",
        existingAccount: "(既存アカウント)",
        register: "新規登録",
        newAccount: "(新規アカウント)",
        registerSubtitle: "新しい QBrowse アカウントを作成してデバイス間で同期します。",
        signInSubtitle: "サインインして既存のブックマーク・スペース・保管庫を同期します。",
        switchToSignIn: "サインインに切り替え",
        emailLabel: "メールアドレス",
        emailPlaceholder: "name@example.com",
        createPassLabel: "パスワード作成（6文字以上）",
        accountPassLabel: "アカウントパスワード",
        min6Chars: "6文字以上",
        confirmPassLabel: "パスワード確認",
        passwordsMatch: "パスワードが一致しています",
        passwordsMismatch: "パスワードが一致しません",
        useAccountAsMaster: "アカウントパスワードをマスター暗号化キーに使用",
        masterDerivedDesc: "ログインパスワードから AES-GCM 256-bit クライアントキーを直接導出します。",
        masterSeparateDesc: "別のカスタム暗号化パスフレーズを使用します。",
        customMasterLabel: "カスタムマスター暗号化パスフレーズ",
        customMasterPlaceholder: "保管庫専用の暗号化パスフレーズを入力...",
        creatingAccount: "暗号化アカウントを作成中...",
        signingInSyncing: "サインインして同期中...",
        createAccountBtn: "アカウントを作成して同期を有効化",
        signInBtn: "サインインして同期を有効化",
        alreadyRegistered: "すでに QBrowse に登録済みですか？",
        signInHere: "こちらからサインイン",
        newToSync: "QBrowse クラウド同期は初めてですか？",
        createFreeAccount: "無料アカウントを作成（登録）",
        skipSyncLocal: "クラウド同期をスキップしてローカルプロファイルで続行",
        skipSyncComplete: "同期をスキップして完了",
        vaultModalTitle: "インポートした保管庫を保護",
        vaultModalDesc: "認証情報を暗号化するためのマスターパスワードを入力または作成してください。",
        masterPassLabel: "マスターパスワード",
        masterPassPlaceholder: "マスターパスワードを入力...",
        confirmMasterLabel: "マスターパスワード確認",
        confirmMasterPlaceholder: "パスワードを確認...",
        cancel: "キャンセル",
        encryptImport: "暗号化してインポート",
        bookmarkFallback: "ブックマーク",
        htmlFileFallback: "HTML ファイル",
        toasts: {
            enterEmail: "メールアドレスを入力してください。",
            validEmail: "有効なメールアドレスを入力してください (例: name@domain.com)。",
            passMin6: "パスワードは 6 文字以上である必要があります。",
            confirmPassReq: "パスワードを確認入力してください。",
            passMismatch: "パスワードが一致しません。再入力してください。",
            signedIn: "QBrowse クラウド同期にサインインしました！",
            registered: "アカウントを登録しクラウド同期が有効になりました！",
            bookmarksImported: "{count} 件のブックマークを取り込みました！",
            importFailed: "インポートに失敗しました。",
            couldNotImportBookmarks: "ブックマークを取り込めませんでした。",
            htmlImported: "{filename} から {count} 件のブックマークを取り込みました！",
            htmlImportFailed: "HTML ブックマークの取り込みに失敗しました。",
            noCredentials: "ファイル内に認証情報が見つかりませんでした",
            passwordsImported: "{source} から {count} 件のパスワードを取り込みました！",
            vaultImportFailed: "インポート失敗：{error}",
            passMin4: "パスワードは 4 文字以上にしてください",
            vaultPassMismatch: "パスワードが一致しません",
            incorrectMasterPass: "既存の保管庫に対するマスターパスワードが正しくありません",
            vaultImportError: "インポートエラー：{error}",
            nowDefault: "QBrowse が既定のブラウザに設定されました！",
            openingWinDefault: "Windows 既定のアプリを開きます。QBrowse を選択してください。",
            openingOsDefault: "{label} を開きます。QBrowse を既定のブラウザに選択してください。",
            couldNotOpenDefault: "既定のブラウザ設定を開けませんでした。"
        }
    },
    flags: {
        title: "実験的機能 (Flags)",
        subtitle: "実験的ブラウザ機能、ハードウェア GPU パイプライン、耐量子暗号、Tor ストリーム分離を詳細設定します。",
        resetAll: "すべてデフォルトに戻す",
        warningTitle: "警告：実験的機能が含まれます！",
        warningBody: "これらのスイッチを有効にすると、Chromium V8 の動作やハードウェア合成、TLS パラメータが変更されます。変更を反映するには再起動が必要です。",
        searchPlaceholder: "フラグを検索 (例: GPU, Kyber, QUIC, DoH, bfcache)...",
        tabAvailable: "利用可能 ({count})",
        tabUnavailable: "利用不可 ({count})",
        categories: {
            All: "すべて",
            Performance: "パフォーマンス",
            "Hardware & Graphics": "ハードウェア & グラフィック",
            "Web Standards & Engine": "Web 標準 & エンジン",
            Security: "セキュリティ",
            Networking: "ネットワーク",
            "Media & UI": "メディア & UI",
            "AI & Tools": "AI & ツール",
            Experimental: "実験的"
        },
        statuses: {
            Stable: "安定版",
            Beta: "ベータ",
            Experimental: "実験的"
        },
        options: {
            default: "デフォルト",
            enabled: "有効",
            disabled: "無効"
        },
        emptyMatch: "「{search}」に一致する利用可能なフラグはありません",
        reasonPrefix: "理由：{reason}",
        unavailableBadge: "利用不可",
        relaunchMsg: "変更は次回 QBrowse を再起動したときに有効になります。",
        relaunchBtn: "再起動",
        toasts: {
            reset: "すべての実験的フラグをデフォルトに戻しました",
            relaunching: "更新されたフラグで QBrowse を再起動しています..."
        },
        items: {
            "prefer-high-performance-gpu": {
                name: "高性能 GPU を優先使用",
                description: "複数 GPU 搭載環境で WebGL、Canvas、3D 描画を専用 GPU に割り当てます。省電力モード時は自動無効化されます。"
            },
            "unlock-frame-rate": {
                name: "フレームレート上限解除（ベンチマークモード）",
                description: "V-Sync を無効化し合成 FPS ベンチマーク用に上限を解除します。通常利用時はティアリングや消費電力増の可能性があります。"
            },
            "ignore-gpu-blocklist": {
                name: "GPU ブロックリストを無視",
                description: "Chromium 内蔵のソフトウェア描画リストを無視し、古いドライバーでもハードウェアアクセラレーションを有効にします。"
            },
            "experimental-web-platform": {
                name: "実験的な Web プラットフォーム機能",
                description: "Chromium で開発中の最新 Web API を有効化します。一部 API は不安定な場合があります。"
            },
            "gpu-rasterization": {
                name: "GPU ラスタライズとコンポジター高速化",
                description: "CPU ではなく専用 GPU パイプラインを用いてウェブページのラスタライズと合成を高速化します。"
            },
            "smooth-scrolling": {
                name: "スムーズスクロールエンジン",
                description: "マウスホイール、タッチパッド、矢印キーでのスクロールに滑らかな物理アニメーションを適用します。"
            },
            "zero-copy-rasterizer": {
                name: "ゼロコピー GPU ラスタライザー (GpuMemoryBuffer)",
                description: "CPU メモリへのステージングコピーなしで共有 GPU テクスチャへ直接書き込みます。"
            },
            "enable-vulkan": {
                name: "Vulkan グラフィックス & 合成バックエンド",
                description: "対応 GPU 上でクロスプラットフォーム Vulkan API を使用して高速描画・合成を行います。"
            },
            "back-forward-cache": {
                name: "戻る・進むキャッシュ (bfcache)",
                description: "最近訪れたページのスナップショットをメモリに保持し、瞬時の戻る・進む移動を実現します。"
            },
            "canvas-oop-rasterization": {
                name: "アウトオブプロセス 2D Canvas ラスタライズ",
                description: "HTML5 2D Canvas 描画処理を専用 GPU プロセス内で実行します。"
            },
            "enable-drdc": {
                name: "動的ハイリフレッシュレート検出 (120/144/240Hz)",
                description: "ProMotion や高リフレッシュゲーミングディスプレイに合わせて V-Sync 間隔を動的調整します。"
            },
            "auto-suspend-tabs": {
                name: "タブ自動スリープ省メモリ (V8 GC 制御)",
                description: "15分間非アクティブなバックグラウンドタブを自動解放し、RAM とバッテリーを節約します。"
            },
            "parallel-download-engine": {
                name: "並列マルチスレッド分割ダウンロード",
                description: "大容量ファイルを複数の並列 HTTP レンジリクエストに分割して転送速度を最大化します。"
            },
            "lazy-image-loading": {
                name: "画像・埋め込みフレームの遅延読み込み",
                description: "画面外の画像や iframe をスクロールで表示されるまで読み込まず初期負荷を軽減します。"
            },
            "enable-tls13-kyber": {
                name: "TLS 耐量子暗号 (Kyber768 / ML-KEM)",
                description: "TLS 1.3 ハンドシェイクで耐量子ハイブリッド鍵カプセル化 (X25519Kyber768) を有効にします。"
            },
            "enable-encrypted-client-hello": {
                name: "Encrypted Client Hello (ECH / 暗号化 SNI)",
                description: "TLS 内のサーバー名表示 (SNI) を暗号化し、ISP 等による閲覧ドメイン監視を防ぎます。"
            },
            "strict-origin-isolation": {
                name: "厳格なオリジン単位プロセスサンドボックス",
                description: "オリジンごとに独立した OS プロセスとメモリ空間を割り当て Spectre/Meltdown 攻撃を緩和します。"
            },
            "webrtc-ip-protection": {
                name: "WebRTC ローカル IP・STUN 漏洩防止",
                description: "WebRTC ICE 候補を制限し、不正スクリプトによるローカル・グローバル IP 特定を防ぎます。"
            },
            "enable-dns-over-https": {
                name: "厳格な DNS-over-HTTPS (Cloudflare/Quad9)",
                description: "すべての DNS 名前解決を HTTPS (443) で暗号化し、盗聴や改ざんを防ぎます。"
            },
            "disable-hyperlink-auditing": {
                name: "ハイパーリンク監査 (<a ping>) を無効化",
                description: "リンククリック時に送信される隠しトラッキング POST リクエストを遮断します。"
            },
            "enable-fingerprint-randomization": {
                name: "Canvas / WebAudio フィンガープリント雑音注入",
                description: "ピクセル読取や音声バッファに擬似乱数ノイズを加え、端末固有の指紋追跡を防ぎます。"
            },
            "enable-font-enumeration-shield": {
                name: "ローカルフォント列挙シールド",
                description: "インストール済みフォント一覧を取得して追跡 ID を生成する行為を防ぎます。"
            },
            "aggressive-tracker-blocker": {
                name: "強力な広告・URL トラッキングパラメータ除去",
                description: "utm_source、gclid、fbclid 等の追跡パラメータを自動除去し、追跡ピクセルを遮断します。"
            },
            "enable-subresource-filter": {
                name: "悪質な広告・偽装リンク用サブリソースフィルター",
                description: "クリックジャッキングや透明オーバーレイリンク、不正ダウンロード誘導を検出・抑制します。"
            },
            "enable-quic": {
                name: "実験的 QUIC & HTTP/3 通信プロトコル",
                description: "UDP ベースの HTTP/3 により 0-RTT 接続や多重化ストリーム転送を有効にします。"
            },
            "tor-stream-isolation": {
                name: "Tor ドメイン別回線分離 (IsolateDestAddr)",
                description: "Tor スペース内でドメインごとに異なる出口リレーを使い、サイト間の相関追跡を防ぎます。"
            },
            "dns-prefetching": {
                name: "予測型 DNS 事前解決エンジン",
                description: "ページ内リンクの IP を先読み解決し、クリック時の名前解決遅延を削減します。"
            },
            "heavy-ad-intervention": {
                name: "高負荷広告リソースの自動停止",
                description: "通信量 4MB 超または CPU 時間 60秒超を消費する広告 iframe を自動アンロードします。"
            },
            "cross-origin-isolation": {
                name: "COOP ポリシー & SharedArrayBuffer",
                description: "厳格な Cross-Origin ポリシーにより高精度な WebAssembly 共有メモリを有効化します。"
            },
            "document-pip-api": {
                name: "Document Picture-in-Picture API",
                description: "任意の HTML、動画、ウィジェットを含むフローティング小窓を開けるようにします。"
            },
            "force-dark-contents": {
                name: "ウェブコンテンツ自動ダークモード（Chromium 反転）",
                description: "明るい背景のみ対応するサイトに輝度保持型のダークテーマを自動生成します。"
            },
            "overlay-scrollbars": {
                name: "ミニマルなフローティングスクロールバー",
                description: "停止時に自動でフェードアウトする洗練されたスクロールインジケーターを使用します。"
            },
            "enable-webgpu": {
                name: "次世代 WebGPU グラフィックス & 演算 API",
                description: "ブラウザ内のニューラルネット、3D、シェーダー計算向けに高速な GPU 直接アクセスを提供します。"
            },
            "tab-audio-muting": {
                name: "ワンクリック タブ音声ミュート",
                description: "再生中タブにスピーカーアイコンを表示し、ワンクリックで即座に消音できます。"
            },
            "webrtc-pipewire": {
                name: "PipeWire デスクトップキャプチャ (Linux Wayland)",
                description: "GNOME や KDE Plasma 環境で PipeWire ポータル経由の画面共有を有効にします。"
            },
            "hdr-compositing": {
                name: "ハイダイナミックレンジ (HDR) カラー合成",
                description: "対応 OLED / mini-LED ディスプレイで 10-bit 広色域 (Rec.2020 / DCI-P3) を有効にします。"
            },
            "local-ai-assistant": {
                name: "ローカル GGUF LLM VRAM 高速化 (llama.cpp)",
                description: "Gemma や Llama 3 の重みを GPU VRAM にオフロードし高速・非公開の要約を行います。"
            },
            "experimental-split-screen-gestures": {
                name: "キネティック分割画面スナップ操作",
                description: "タブを画面端へドラッグして瞬時に2画面分割ビューを作成できるようにします。"
            },
            "enable-reader-mode": {
                name: "集中できる記事リーダーモード",
                description: "広告やサイドバーを取り除き、本文とタイポグラフィのみを読みやすく整形します。"
            },
            "auto-password-generation": {
                name: "暗号論的に強力なパスワード自動生成",
                description: "登録フォームを検知して QVault 管理の 128-bit 安全なパスワードを提案します。"
            },
            "tab-groups-auto-clustering": {
                name: "ドメイン・スペース別スマートタブ集約",
                description: "共通のドメインや利用パターンに応じてタブのグループ化を提案します。"
            },
            "touch-ui-layout": {
                name: "タッチスクリーン タブレット UI モード",
                description: "タッチ操作向けにタブバーの高さと余白を広げます。デスクトップ構成では無効です。",
                reason: "タッチデジタイザ ハードウェアの検出が必要です。"
            },
            "eye-tracking-gaze-scroll": {
                name: "視線追跡スクロールナビゲーション",
                description: "視線の位置に応じてスクロールを制御します。専用赤外線センサーが必要です。",
                reason: "対応する視線追跡センサーが検出されませんでした。"
            },
            "cellular-data-saver": {
                name: "モバイルデータ節約モード",
                description: "外部プロキシ経由で画像を圧縮します。プライバシー保護のため無効化されています。",
                reason: "Tor と HTTPS E2E プライバシー保護のため既定で無効です。"
            }
        }
    }
};

const ru = {
    common: {
        incognito: "Инкогнито",
        selectOption: "Выберите вариант...",
        colors: {
            accent: "Акцент",
            yellow: "Жёлтый",
            green: "Зелёный",
            blue: "Синий",
            pink: "Розовый"
        }
    },
    wallpaperPreview: {
        alt: "Предпросмотр обоев",
        badge: "Предпросмотр"
    },
    presets: {
        names: {
            balanced: "Сбалансированный",
            developer: "Разработчик",
            classic_reverse: "Современный Arc",
            bottom_bar: "Эргономичный",
            minimalist: "Минимал-фокус",
            privacy: "Страж приватности"
        },
        taglines: {
            balanced: "Личное и рабочее пространства с поиском Google.",
            developer: "Изолированные пространства и интеграция GitHub Live PR.",
            classic_reverse: "Дерево вкладок справа и чистый холст для чтения.",
            bottom_bar: "Нижняя адресная строка для удобной навигации.",
            minimalist: "Одно пространство с компактным интерфейсом без отвлечений.",
            privacy: "Строгая защита от трекеров и поиск DuckDuckGo."
        },
        descriptions: {
            balanced: "Два пространства (Личное и Работа), стандартная приватность и Google.",
            developer: "Мультипространственная изоляция, GitHub Live PR и инструменты разработки.",
            classic_reverse: "Навигация справа, зеркальная панель и фокус на вкладках.",
            bottom_bar: "Нижняя адресная строка для эргономичной навигации одной рукой.",
            minimalist: "Одно пространство, правая боковая панель и сверхкомпактный вид.",
            privacy: "Жёсткая блокировка трекеров, DuckDuckGo и мгновенная маршрутизация Tor."
        },
        customTaglineFallback: "Пользовательская конфигурация пространства и макета.",
        accents: {
            amberGold: "Янтарное золото",
            ocean: "Океан",
            skyBlue: "Небесно-голубой",
            cyberEmerald: "Кибер-изумруд",
            electricBlue: "Электрический синий",
            royalViolet: "Королевский фиолетовый",
            roseGold: "Розовое золото",
            sunsetOrange: "Закатный оранжевый",
            cyberCyan: "Кибер-циан",
            slateGray: "Грифельно-серый"
        }
    },
    addPin: {
        title: "Закрепить на боковой панели",
        subtitle: "Добавьте ярлык быстрого доступа к приложению или сайту",
        defaultAppName: "Название приложения",
        appNameLabel: "Название / Заголовок",
        appNamePlaceholder: "напр. GitHub, Gemini...",
        urlLabel: "URL / Домен *",
        urlPlaceholder: "напр. github.com или https://gemini.google.com",
        quickPresets: "Быстрые шаблоны",
        cancel: "Отмена",
        pinApp: "Закрепить"
    },
    passkey: {
        biometrics: {
            darwin: "Touch ID",
            linux: "Системная биометрия",
            win32: "Windows Hello"
        },
        hints: {
            darwin: "Приложите палец к Touch ID или введите пароль macOS",
            linux: "Приложите палец к сканеру или введите системный пароль",
            win32: "Приложите палец к сканеру или введите PIN-код Windows"
        },
        cancelDenyTitle: "Отменить и отклонить",
        verifiedTitle: "Личность подтверждена!",
        scanningTitle: "Сканирование {biometric}...",
        autofillTitle: "Автозаполнение сохранённого пароля",
        passkeyTitle: "Аутентификация по ключу доступа",
        verifiedAutofillDesc: "Хранилище разблокировано, данные подставлены",
        verifiedPasskeyDesc: "Ключ доступа подтверждён и подписан",
        requireAutofillDesc: "Требуется проверка для разблокировки и автозаполнения",
        requirePasskeyDesc: "Требуется проверка для входа с ключом доступа",
        passwordBadge: "Пароль",
        passkeyBadge: "Ключ доступа",
        accountLabel: "Аккаунт:",
        savedLogin: "Сохранённый вход",
        passkeyUser: "Пользователь ключа",
        verifyingWith: "Проверка через {biometric}...",
        verifiedBtn: "Подтверждено!",
        verifyWith: "Подтвердить через {biometric}",
        orPassPin: "Или мастер-паролем / PIN",
        orPass: "Или мастер-паролем",
        placeholderPin: "Мастер-пароль или быстрый PIN (4–8 цифр)",
        placeholderPass: "Введите мастер-пароль QVault",
        checking: "Проверка учётных данных...",
        verifyAuth: "Проверить и войти",
        cancelDenyBtn: "Отменить и отклонить запрос",
        websiteFallback: "Сайт",
        theWebsiteFallback: "сайта",
        toastAutofill: "Хранилище разблокировано и данные подставлены для {domain}!",
        toastPasskey: "Ключ доступа подтверждён для {domain}!",
        promptAutofill: "Подтвердите личность для автозаполнения данных {domain}",
        promptPasskey: "Войдите на {domain} с помощью ключа QVault",
        biometricError: "Ошибка биометрии: {error}",
        vaultLockedOut: "Хранилище заблокировано после неудачных попыток. Повтор через {seconds}с.",
        incorrectCreds: "Неверный мастер-пароль или быстрый PIN. Попробуйте ещё раз.",
        verificationFailed: "Ошибка проверки: {error}",
        passkeyCreateTitle: "Создать ключ доступа QVault",
        verifiedPasskeyCreateDesc: "Личность подтверждена — сохранение ключа в QVault",
        requirePasskeyCreateDesc: "Требуется проверка для создания и сохранения этого ключа доступа",
        useHardwareKeyBtn: "Использовать аппаратный / системный ключ",
        useHardwareKeyHint: {
            darwin: "YubiKey · FIDO2 · Touch ID · QR телефона",
            linux: "YubiKey · FIDO2 · USB / NFC / BLE · QR телефона",
            win32: "YubiKey · FIDO2 · Windows Hello · QR телефона"
        },
        toastHardwareHandoff: "Переключение на аппаратный / системный ключ безопасности для {domain}...",
        toastPasskeyCreated: "Ключ доступа подтверждён и сохранён для {domain}!",
        promptPasskeyCreate: "Создать и сохранить ключ доступа QVault для {domain}"
    },
    history: {
        title: "Архив",
        entrySingular: "Сохранена {count} запись",
        entryPlural: "Сохранено записей: {count}",
        searchPlaceholder: "Поиск по архиву...",
        clearAllTitle: "Очистить всю историю просмотров",
        clear: "Очистить",
        closeTitle: "Закрыть (Esc)",
        segments: {
            all: "Все",
            today: "Сегодня",
            yesterday: "Вчера",
            week: "За 7 дней",
            older: "Ранее"
        },
        emptySearch: "Нет результатов по запросу «{query}»",
        emptyTitle: "Архив пуст",
        emptySearchDesc: "Проверьте написание или выберите другой фильтр.",
        emptyDesc: "Посещённые страницы будут сохраняться здесь для быстрого доступа.",
        itemSingular: "{count} элемент",
        itemPlural: "Элементов: {count}",
        copyLinkTitle: "Копировать ссылку",
        openNewTabTitle: "Открыть в новой вкладке",
        removeTitle: "Удалить из архива",
        toastCleared: "Архив очищен",
        toastCopied: "Ссылка скопирована",
        toastOpenedBg: "Открыто в фоновой вкладке",
        loadMore: "Загрузить ещё",
    },
    cookies: {
        title: "Обозреватель файлов cookie и хранилища сайтов",
        subtitle: "Просматривайте, ищите и удаляйте файлы cookie и локальные данные",
        filterDomain: "Фильтр по домену",
        refreshTitle: "Обновить список",
        allSites: "Все сайты",
        clearDomain: "Очистить {domain}",
        clearAllData: "Удалить все данные просмотров",
        searchPlaceholder: "Поиск cookie по имени, домену или значению...",
        emptyTitle: "Файлы cookie не найдены",
        emptyDesc: "Сбросьте поиск или выберите другой домен",
        secure: "Защищённый",
        httpOnly: "HttpOnly",
        path: "Путь: {path}",
        expires: "Истекает: {date}",
        deleteTitle: "Удалить cookie",
        toastDeleted: "Удалён cookie: {name}",
        toastClearedSite: "Удалены cookie ({count}) для {domain}",
        toastClearedAll: "Данные просмотров и cookie очищены"
    },
    resources: {
        title: "Диспетчер задач",
        cpu: "ЦП",
        ram: "ОЗУ",
        asleepCount: "Спят: {count}",
        sleepInactive: "Усыпить неактивные",
        sleepInactiveTitle: "Перевести неактивные фоновые вкладки в сон для освобождения памяти",
        wakeAll: "Разбудить все",
        wakeAllTitle: "Восстановить все спящие вкладки",
        purgeCacheTitle: "Очистить кэш памяти браузера",
        autoRefreshActiveTitle: "Автообновление включено (каждые 2с)",
        autoRefreshPausedTitle: "Автообновление на паузе",
        autoRefresh2s: "2с",
        paused: "Пауза",
        refreshTitle: "Обновить метрики процессов",
        closeTitle: "Закрыть (ESC)",
        filters: {
            all: "Все",
            tabs: "Вкладки",
            processes: "Процессы",
            sleeping: "Спящие"
        },
        searchPlaceholder: "Фильтр по имени, PID...",
        colTask: "Задача / Процесс",
        colSpace: "Пространство / Тип",
        colStatus: "Статус",
        colCpu: "ЦП",
        colMemory: "Память",
        colAction: "Действие",
        emptyMatch: "Нет задач по запросу «{query}»",
        blankTab: "Пустая вкладка",
        newTabDash: "Панель новой вкладки Zen",
        pidSubtitle: "PID {pid} · {type}",
        active: "Активна",
        spaceTab: "Вкладка ({space})",
        mainCore: "Основное ядро",
        sleep: "Сон",
        live: "Активен",
        memSaved: "(Сэкономлено)",
        wakeTabTitle: "Разбудить вкладку",
        activeTabCannotSleep: "Активную вкладку нельзя усыпить",
        sleepTabTitle: "Усыпить вкладку",
        switchTabTitle: "Перейти ко вкладке",
        closeTabTitle: "Закрыть вкладку",
        core: "Ядро",
        endProcessTitle: "Завершить процесс PID {pid}",
        itemsOf: "{shown} из {total} элементов",
        pressEscPrefix: "Нажмите",
        pressEscSuffix: "чтобы закрыть",
        procMain: "Главный процесс QBrowse",
        procGpu: "Процесс GPU",
        procRenderer: "Рендерер Webview",
        procUtility: "Служебный сервис (Аудио/Хранилище)",
        procZygote: "Предзагрузчик песочницы",
        procPepper: "Хост плагинов",
        procChild: "Процесс {type}",
        procChildDefault: "Дочерний",
        toastHibernatedSingular: "Усыплена {count} неактивная вкладка (освобождено ~{mb} МБ ОЗУ)",
        toastHibernatedPlural: "Усыплено неактивных вкладок: {count} (освобождено ~{mb} МБ ОЗУ)",
        toastWokeSingular: "Восстановлена {count} спящая вкладка",
        toastWokePlural: "Восстановлено спящих вкладок: {count}",
        toastCachePurged: "Кэш браузера очищен, память освобождена",
        toastKillUnavailable: "Невозможно завершить процесс: API недоступен",
        toastKilled: "Процесс {pid} завершён",
        toastKillFailed: "Не удалось завершить процесс {pid}",
        toastKillError: "Ошибка завершения процесса {pid}"
    },
    docViewer: {
        fallbackName: "Локальный документ",
        fallbackFile: "Файл",
        preview: "Просмотр",
        raw: "Исходник",
        zoomOut: "Уменьшить",
        zoomIn: "Увеличить",
        resetZoom: "Сбросить масштаб",
        copyTitle: "Копировать содержимое файла",
        copied: "Скопировано",
        copy: "Копировать",
        revealTitle: "Показать в папке",
        loading: "Загрузка документа...",
        errorTitle: "Не удалось отобразить файл",
        readError: "Ошибка чтения файла",
        toastCopied: "Содержимое скопировано в буфер обмена",
        toastRevealed: "Файл показан в системной папке"
    },
    pdfViewer: {
        toggleThumbnails: "Показать/скрыть миниатюры",
        fallbackName: "Документ PDF",
        pageSingular: "{count} стр.",
        pagePlural: "{count} стр.",
        prevPage: "Предыдущая страница",
        nextPage: "Следующая страница",
        zoomOut: "Уменьшить",
        zoomIn: "Увеличить",
        fitWidth: "По ширине",
        rotate: "Повернуть на 90° по часовой",
        normalMode: "Обычный режим",
        darkInvertMode: "Тёмный режим с инверсией",
        summarize: "Пересказать",
        revealTitle: "Открыть в проводнике",
        pagesHeader: "Страницы",
        pageNum: "Стр. {num}",
        loading: "Рендеринг PDF через PDF.js...",
        errorTitle: "Не удалось открыть документ",
        openError: "Ошибка открытия PDF-документа",
        extractingToast: "Извлечение текста документа для Qu-AI...",
        openedAiToast: "Открыто в панели Qu-AI с текстом документа!",
        extractErrorToast: "Ошибка извлечения текста: {error}",
        revealedToast: "Файл показан в системной папке",
        fallbackDocName: "документ",
        pageMarker: "--- Страница {num} ---",
        summaryPrompt: "Сделай краткий структурированный обзор и выдели ключевые тезисы этого PDF-документа ({fileName}):"
    },
    localDir: {
        parentFolderTitle: "На уровень вверх",
        reloadTitle: "Обновить папку",
        openInFileManager: "Открыть в проводнике",
        filterPlaceholder: "Фильтровать файлы в этой папке...",
        sortName: "Имя",
        sortSize: "Размер",
        sortDate: "Дата",
        gridViewTitle: "Сетка",
        listViewTitle: "Список",
        scanning: "Сканирование содержимого папки...",
        errorTitle: "Не удалось открыть папку",
        goParent: "В родительскую папку",
        emptySearch: "Нет файлов, соответствующих запросу",
        emptySearchHint: "Попробуйте очистить строку поиска",
        folderType: "Папка",
        revealTitle: "Показать в проводнике",
        colName: "Имя",
        colModified: "Изменён",
        colSize: "Размер",
        itemSingular: "{count} объект",
        itemPlural: "Объектов: {count}",
        filtered: "(отфильтровано)",
        suiteName: "Файловый пакет QBrowse",
        apiUnavailable: "API каталогов Electron недоступен",
        openFailed: "Не удалось открыть каталог",
        toastOpened: "Открыто в системном файловом менеджере",
        toastRevealed: "Показано: {name}"
    },
    tour: {
        welcomeTitle: "Добро пожаловать в QBrowse",
        welcomeSubtitle: "Выберите удобный формат знакомства с браузером:",
        overviewBadge: "Обзор",
        quickTitle: "Быстрый обзор",
        quickDesc: "Короткий визуальный тур по интерфейсу, пространствам и навигации с пояснениями.",
        startQuick: "Начать быстрый тур",
        interactiveBadge: "Интерактив",
        interactiveTitle: "Интерактивный мастер-класс",
        interactiveDesc: "Практические задания прямо в интерфейсе: нажимайте кнопки, тестируйте Tor и осваивайте горячие клавиши.",
        startInteractive: "Начать интерактивный тур",
        skipWelcome: "Пропустить тур и начать работу (Esc)",
        stepCounter: "Шаг {current} из {total}",
        closeTitle: "Закрыть тур (Esc)",
        skipTour: "Пропустить",
        back: "Назад",
        finishTour: "Завершить тур",
        nextStep: "Далее",
        exitToast: "Тур закрыт. Нажмите Ctrl+K в любой момент для изучения QBrowse!",
        topBarShortcut: "Верхняя панель",
        steps: {
            spaces: {
                title: "Изоляция пространств",
                badge: "Пространства",
                description: "Разделяйте задачи чисто и удобно. Каждое пространство (Личное, Работа, Инкогнито, Tor) полностью изолирует сессии, cookie и вкладки.",
                missionInstruction: "Нажмите «Работа» в переключателе на боковой панели или Ctrl+2",
                missionSuccess: "Пространство переключено! Теперь вкладки, сессии и cookie полностью изолированы."
            },
            splitview: {
                title: "Встроенный разделённый экран",
                badge: "Многозадачность",
                description: "Открывайте два сайта рядом без лишних окон — идеально для исследований, разработки с документацией и сравнений.",
                missionInstruction: "Нажмите значок разделённого экрана сверху или Ctrl+\\",
                missionSuccess: "Режим разделённого экрана включён! Справа открылась вторая панель браузера."
            },
            tor: {
                title: "Встроенная сеть Tor Onion",
                badge: "Приватность и Onion",
                description: "Многоуровневое шифрование маршрута без сторонних прокси. QBrowse направляет трафик через шифрованные узлы Tor к доменам .onion.",
                missionInstruction: "Нажмите значок сети Tor на верхней панели, чтобы увидеть активную цепочку",
                missionSuccess: "Цепочка Tor открыта! Вы видите узлы ретрансляции и можете управлять маршрутизацией."
            },
            vault: {
                title: "Хранилище QVault с нулевым разглашением",
                badge: "Аппаратная защита",
                description: "Мастер-пароли, ключи доступа и карты шифруются локально на устройстве аппаратными ключами и {biometric}. Никакой открытый текст не покидает ПК.",
                missionInstruction: "Нажмите значок QVault на верхней панели, чтобы открыть хранилище",
                missionSuccess: "QVault открыт! Все учётные данные зашифрованы локально с биометрической защитой."
            },
            shield: {
                title: "Встроенный блокировщик рекламы и трекеров",
                badge: "Защита",
                description: "Аппаратная сетевая фильтрация блокирует телеметрию, криптомайнеры, фингерпринтинг и рекламу ещё до загрузки.",
                missionInstruction: "Нажмите значок Щита на верхней панели, чтобы проверить заблокированные трекеры",
                missionSuccess: "Инспектор QShield открыт! Просматривайте блокировки в реальном времени и управляйте защитой."
            },
            darkmode: {
                title: "Умная тёмная тема и оформление",
                badge: "Оформление",
                description: "Переключайтесь между тёмной, светлой темой или умной инверсией, превращающей старые светлые сайты в контрастные тёмные.",
                missionInstruction: "Нажмите значок темы на верхней панели, чтобы увидеть параметры оформления",
                missionSuccess: "Панель тем открыта! Вы можете переключать светлый, тёмный режимы и умную инверсию."
            },
            toolhub: {
                title: "ToolHub и постоянные заметки",
                badge: "Инструменты",
                description: "Выделяйте текст на любых сайтах для закрепления заметок, сохраняющихся после перезапуска. Также внутри — локальный ИИ и буфер обмена.",
                missionInstruction: "Нажмите на язычок ToolHub у правого края экрана или Ctrl+J",
                missionSuccess: "ToolHub открыт! Прикрепляйте заметки к сайтам или общайтесь с локальным ИИ."
            },
            omnibox: {
                title: "Умный Omnibox и палитра команд",
                badge: "Единая команда",
                description: "Универсальный центр запуска: быстрые префиксы (!yt, @github), команды (>pdf, >clear), калькулятор и запросы к локальному ИИ.",
                missionInstruction: "Нажмите Ctrl+K или кликните по центральной адресной строке",
                missionSuccess: "Omnibox активирован! Попробуйте !yt для YouTube, @github для репозиториев или > для команд."
            }
        }
    },
    reader: {
        themes: {
            dark: "Тёмная",
            sepia: "Сепия",
            light: "Светлая",
            midnight: "Полночь"
        },
        fonts: {
            serif: "С засечками",
            sans: "Без засечек",
            mono: "Моноширинный",
            dyslexic: "Для дислексии"
        },
        widths: {
            compact: "Узкая",
            balanced: "Средняя",
            wide: "Широкая"
        },
        exitTitle: "Выйти из режима чтения (Esc / Ctrl+Alt+R)",
        backToWebpage: "К странице",
        openOriginalTitle: "Открыть оригинал: {url}",
        hideAudioTitle: "Скрыть аудиоплеер",
        listenTitle: "Прослушать статью (Озвучивание)",
        listening: "Озвучивается",
        readAloud: "Читать вслух",
        themeTitle: "Тема: {name}",
        fontTitle: "Использовать шрифт {name}",
        decreaseSizeTitle: "Уменьшить размер текста",
        increaseSizeTitle: "Увеличить размер текста",
        widthTitle: "Ширина колонки: {name}",
        closeTitle: "Закрыть режим чтения",
        byAuthor: "Автор: {author}",
        minRead: "{minutes} мин чтения",
        wordsCount: "Слов: {count}",
        prevParaTitle: "Предыдущий абзац",
        pauseTitle: "Пауза",
        playTitle: "Воспроизвести",
        nextParaTitle: "Следующий абзац",
        audioNarration: "Голосовое чтение",
        blockProgress: "Блок {current} из {total}",
        speedTitle: "Изменить скорость речи",
        selectVoiceTitle: "Выбрать голос",
        voiceFallback: "Голос",
        systemVoices: "Системные голоса",
        stopCloseTitle: "Остановить и закрыть чтение",
        highlightWithTitle: "Выделить цветом: {color}",
        noteBtn: "Заметка",
        copyTextTitle: "Копировать текст",
        stickyNote: "Стикер-заметка",
        notePlaceholder: "Введите заметку или мысль...",
        deleteBtn: "Удалить",
        saveBtn: "Сохранить"
    },
    toolhub: {
        title: "Tool Hub",
        snip: "Снимок",
        snipTitle: "Интерактивный снимок экрана (выбор области)",
        captureViewportTitle: "Снять видимую область",
        captureFullTitle: "Снять всю страницу с прокруткой",
        tabs: {
            notes: "Заметки",
            clipboard: "Буфер",
            ai: "Локальный ИИ",
            downloads: "Загрузки"
        },
        webNotesTab: "Веб-заметки ({count})",
        scratchpadTab: "Черновик",
        globalScope: "Общий",
        spaceScope: "Пространство {space}",
        scratchpadTitle: "Черновик: {name}",
        scratchpadGlobalPlaceholder: "Записывайте общие мысли, заметки, ссылки... поддерживается Markdown.",
        scratchpadSpacePlaceholder: "Черновик для пространства {space}... поддерживается Markdown.",
        searchNotesPlaceholder: "Поиск выделений, заметок, доменов...",
        clearSearchTitle: "Очистить поиск",
        allSpaces: "Все",
        exportMd: "Экспорт MD",
        exportMdTitle: "Экспортировать заметки в Markdown (.md)",
        noWebNotesTitle: "Веб-заметок пока нет",
        noWebNotesDesc: "Выделите текст на любой странице и нажмите «Заметка» на панели, чтобы сохранить её навсегда.",
        otherDomain: "Прочее",
        colorTitle: "Цвет: {color}",
        jumpHighlightTitle: "Нажмите, чтобы перейти к выделению на странице",
        editNotePlaceholder: "Добавьте заметку или комментарий...",
        deleteNote: "Удалить заметку",
        deleteNoteTitle: "Удалить текст заметки",
        cancel: "Отмена",
        saveNote: "Сохранить",
        clickToEditNote: "Нажмите, чтобы изменить заметку",
        addNoteTitle: "Добавить заметку",
        noteBtn: "Заметка",
        copyQuoteTitle: "Копировать цитату",
        jumpBtn: "Перейти",
        jumpBtnTitle: "Перейти к заметке на странице",
        deleteHighlightTitle: "Удалить выделение",
        clipboardHeader: "История буфера обмена",
        syncBtn: "Синхр.",
        syncTitle: "Синхронизировать системный буфер",
        deleteClipTitle: "Удалить запись",
        clipboardEmptyTitle: "История буфера пуста",
        clipboardEmptyDesc: "Скопируйте текст или ссылку в любом месте, чтобы увидеть их здесь",
        clearClipboard: "Очистить историю буфера",
        aiStatusRunning: "llama-server активен (Порт 8080)",
        aiStatusDownloading: "Загрузка модели ({progress}%)...",
        aiStatusStarting: "Запуск движка...",
        aiStatusReady: "Готов к запуску",
        aiStatusDownloaded: "Загружена",
        aiStatusNotDownloaded: "Модель не загружена",
        cancelDownloadTitle: "Отменить загрузку",
        downloadModelTitle: "Скачать {name} ({size})",
        downloadBtn: "Скачать",
        startingBtn: "Запуск...",
        stopBtn: "Стоп",
        startBtn: "Старт",
        openWebUiTitle: "Открыть веб-интерфейс llama.cpp",
        aiConsoleSettingsTitle: "Консоль llama.cpp и расширенные настройки",
        downloadingFile: "Загрузка {filename}",
        downloadingWeights: "Загрузка весов...",
        noModelTitle: "ИИ-модель не загружена",
        offlineBadge: "Офлайн",
        noModelDesc: "Скачайте {name}, чтобы запускать быстрый приватный локальный ИИ для пересказа, кода и чата.",
        downloadModelSize: "Скачать модель ({size})",
        settingsBtn: "Настройки",
        contextBtn: "Контекст",
        searchBtn: "Поиск",
        voiceBtn: "Голос",
        summarizeBtn: "Пересказать",
        summarizePrompt: "Сделай чёткий и понятный пересказ этой веб-страницы с главными выводами и ключевыми пунктами на основе её содержимого.",
        attachTitle: "Прикрепить файл или изображение",
        chatPlaceholder: "Спросите локальную Gemma 4 или перетащите файлы...",
        voiceInputTitle: "Голосовой ввод (Whisper)",
        downloadsHeader: "Активные и недавние загрузки",
        itemSingular: "{count} файл",
        itemPlural: "Файлов: {count}",
        openDownloadsFolderTitle: "Открыть папку загрузок",
        clearDownloadsTitle: "Очистить список загрузок",
        downloadedFileFallback: "Загруженный файл",
        snipBadge: "Снимок",
        verified: "Проверен",
        unverified: "Не проверен",
        sha256Prefix: "SHA-256: {hash}",
        saved: "Сохранено",
        verifyCopyHashTitle: "Проверить и копировать SHA-256",
        copyHashTitle: "SHA-256: {hash} (Нажмите для копирования)",
        copyImageTitle: "Копировать изображение в буфер",
        showInFolderTitle: "Показать в папке",
        deleteDownloadTitle: "Удалить файл и убрать из списка",
        downloadsEmptyTitle: "Нет активных загрузок",
        downloadsEmptyDesc: "Скриншоты и загруженные файлы появятся здесь",
        pdfPageName: "{name} (Стр. {page})",
        pdfImageSize: "Страница PDF",
        toasts: {
            jumpingToNote: "Переход к заметке на странице...",
            exportedMarkdown: "Файл Markdown экспортирован!",
            copiedNotesMarkdown: "Заметки скопированы в буфер как Markdown!",
            copiedToClipboard: "Скопировано в буфер обмена!",
            clipDeleted: "Запись удалена",
            clipboardCleared: "История буфера очищена",
            parsingPdf: "Визуальный разбор PDF: {name}",
            pdfVramLimit: "Первые 10 страниц {name} преобразованы в изображения (лимит VRAM).",
            pdfVisualFailed: "Сбой визуального разбора PDF. Используется извлечение текста.",
            openPageFirst: "Сначала откройте веб-страницу для пересказа",
            transcriptionFailed: "Ошибка распознавания речи",
            micDenied: "Доступ к микрофону запрещён",
            noteRemoved: "Заметка удалена",
            noteUpdated: "Заметка обновлена",
            copiedQuote: "Цитата скопирована",
            highlightRemoved: "Выделение удалено",
            downloadsCleared: "Список загрузок очищен",
            hashCopied: "Контрольная сумма SHA-256 скопирована",
            hashMissing: "Невозможно вычислить хэш — файл отсутствует",
            screenshotCopied: "Скриншот скопирован в буфер обмена",
            downloadDeleted: "Загрузка и файл удалены"
        },
        cancelled: "Отменено",
        failed: "Ошибка"
    },
    fontManager: {
        title: "Типографика и шрифт приложения",
        active: "Активен:",
        resetTitle: "Сбросить на системный шрифт по умолчанию",
        resetToDefault: "Сбросить",
        modes: {
            preset: "Готовые шрифты",
            google: "Google Fonts",
            system: "Системные",
            file: "Свой файл"
        },
        categories: {
            all: "Все",
            sans: "Гротески",
            mono: "Моношир.",
            serif: "Антиквы"
        },
        activeFont: "Активный шрифт",
        clickToApply: "Нажмите для применения",
        googleTitle: "Любой шрифт из Google Fonts",
        googleDesc: "Введите название шрифта с fonts.google.com и нажмите Enter для мгновенной загрузки.",
        googlePlaceholder: "напр. Montserrat, Space Grotesk, Syne, Cinzel...",
        applyFont: "Применить",
        popularGoogle: "Популярные Google Fonts",
        filterPlaceholder: "Фильтр списка...",
        systemTitle: "Выбор установленного системного шрифта",
        systemDesc: "Введите название любого шрифта, установленного в ОС (напр. Segoe UI Variable, Calibri, Helvetica).",
        systemPlaceholder: "Название системного шрифта...",
        installed: "Установлен",
        notDetected: "Не найден",
        notDetectedTitle: "Не обнаружен через метрики canvas, но CSS попытается отобразить его при наличии",
        commonOsFonts: "Популярные шрифты ОС",
        dropTitle: "Нажмите или перетащите файл шрифта сюда",
        dropDesc: "Поддерживаются TrueType (.ttf), OpenType (.otf), WOFF (.woff) и WOFF2 (.woff2) до 12 МБ.",
        selectFile: "Выбрать локальный файл",
        activeCustomFace: "Активный пользовательский шрифт",
        removeFileTitle: "Удалить загруженный файл шрифта",
        fineTuning: "Тонкая настройка типографики",
        letterSpacing: "Межбуквенный интервал",
        weightShift: "Насыщенность шрифта",
        fontScale: "Масштаб шрифта UI",
        reset100Title: "Сбросить на 100%",
        specimen: "Образец типографики",
        specimen1: "Съешь же ещё этих мягких французских булок, да выпей чаю",
        specimen2: "В чащах юга жил бы цитрус? Да, но фальшивый экземпляр!",
        activeDefault: "Системный по умолчанию (Segoe UI / Нативный)",
        activeGoogle: "Google Font: {name}",
        activeSystem: "Системный шрифт: {name}",
        activeFile: "Пользовательский файл: {name}",
        customLabel: "Пользовательский",
        installedOsLabel: "Установлен в ОС",
        uploadedFontLabel: "Загруженный шрифт",
        spacing: {
            tight: "Плотный",
            normal: "Обычный",
            relaxed: "Свободный",
            wide: "Широкий"
        },
        weight: {
            normal: "Обычный",
            medium: "Средний",
            semibold: "Полужирный"
        },
        osLabels: {
            "Windows 11": "Windows 11",
            Windows: "Windows",
            macOS: "macOS",
            "macOS / Multi": "macOS / Мульти",
            Universal: "Универсальный",
            "Windows Dev": "Windows Dev",
            "Windows Terminal": "Терминал Windows",
            Casual: "Свободный",
            Linux: "Linux",
            GNOME: "GNOME",
            Serif: "Антиква"
        },
        presetDefaultName: "Системный по умолчанию",
        presets: {
            default: {
                description: "Нативная системная типографика ОС (Segoe UI / San Francisco).",
                previewText: "Аа Бб Вв 123"
            },
            inter: {
                description: "Чистый, сверхчитаемый современный интерфейсный гротеск для экранов.",
                previewText: "Современный Нео-Гротеск"
            },
            geist: {
                description: "Фирменный шрифт Vercel для разработчиков с геометрической точностью.",
                previewText: "Минимализм и код"
            },
            outfit: {
                description: "Изящный геометрический гротеск в эстетике современных брендов.",
                previewText: "Премиум-геометрия"
            },
            "plus-jakarta": {
                description: "Свежий и дружелюбный современный шрифт для веб-приложений.",
                previewText: "Современный и тёплый"
            },
            poppins: {
                description: "Округлый геометрический шрифт без засечек с мягкой динамикой.",
                previewText: "Мягкие линии"
            },
            roboto: {
                description: "Классический шрифт Google для Android и Material Design.",
                previewText: "Архитектура Material"
            },
            manrope: {
                description: "Сочетание современного гротеска и геометрии с высокой чёткостью.",
                previewText: "Точная полугеометрия"
            },
            lexend: {
                description: "Научно разработан для снижения нагрузки на зрение и ускорения чтения.",
                previewText: "Лёгкое чтение"
            },
            "jetbrains-mono": {
                description: "Контрастный моноширинный шрифт с увеличенной высотой букв для кода.",
                previewText: "Эстетика разработчика"
            },
            "fira-code": {
                description: "Моноширинный шрифт с лигатурами программирования и кристальной чёткостью.",
                previewText: "=> Лигатуры кода"
            },
            "playfair-display": {
                description: "Контрастная переходная антиква в духе классической печати.",
                previewText: "Журнальная классика"
            },
            merriweather: {
                description: "Тёплая, приятная книжная антиква для комфортного длинного чтения.",
                previewText: "Литературная классика"
            }
        },
        errors: {
            invalidFormat: "Неверный формат. Загрузите файл .ttf, .otf, .woff или .woff2.",
            tooLarge: "Файл слишком большой. Максимальный размер — 12 МБ.",
            readFailed: "Не удалось прочитать файл шрифта. Попробуйте другой."
        },
        toasts: {
            presetSet: "Шрифт приложения изменён на {name}",
            googleApplied: "Google Font «{name}» применён в QBrowse",
            systemApplied: "Применён системный шрифт «{name}»",
            fileLoaded: "Файл шрифта «{name}» успешно загружен"
        }
    },
    aiSettings: {
        title: "ИИ-движок llama.cpp",
        status: {
            online: "Онлайн (llama-server)",
            starting: "Запуск...",
            updating: "Обновление движка...",
            error: "Ошибка движка",
            stopped: "Остановлен"
        },
        syncTitle: "Проверить и синхронизировать нативный движок llama.cpp (b11796 с поддержкой Gemma 4)",
        updatingBtn: "Обновление...",
        syncBtn: "Синхронизировать (b11796)",
        subtitle: "Быстрый локальный LLM-раннер без телеметрии с нативной поддержкой Gemma 4, Qwen 3.5 и Bielik 11B GGUF.",
        downloadingModel: "Загрузка модели ({progress}%)",
        connectingCdn: "Подключение к CDN...",
        cancel: "Отмена",
        downloadBtn: "Скачать {name} ({size})",
        startingBtn: "Запуск llama-server...",
        stopBtn: "Остановить llama-server",
        startBtn: "Запустить llama-server",
        defaultStartError: "llama-server столкнулся с ошибкой при запуске модели.",
        dismiss: "Скрыть",
        updateEngineBtn: "Обновить движок ИИ",
        genSpeed: "Скорость генерации",
        tokPerSec: "ток/с",
        contextWindow: "Окно контекста",
        tokens: "токенов",
        gpuOffload: "Слои на GPU",
        layers: "слоёв",
        activeModelTitle: "Активная модель GGUF",
        loadCustomGguf: "Загрузить свой .GGUF...",
        loadCustomProjector: "Загрузить свой проектор...",
        customModelPrefix: "Своя модель: {path}",
        customProjectorPrefix: "Свой проектор: {path}",
        reset: "Сбросить",
        downloadedBadge: "Скачана",
        downloadingTarget: "Загрузка: {target}",
        visionProjector: "Визуальный проектор...",
        languageModel: "Языковая модель...",
        weights: "веса модели...",
        modelReady: "Модель готова к работе",
        downloadModelFile: "Скачать файл модели ({size})",
        overridesTitle: "Параметры llama-server",
        autoDetectBtn: "Автоопределение железа",
        cpuThreadsLabel: "Потоки CPU (-t): {threads}",
        contextSizeLabel: "Размер контекста (-c)",
        tokensOption: "{n} токенов",
        contextBadges: {
            compact: "Компактный",
            default: "По умолчанию",
            extended: "Расширенный",
            max: "Макс."
        },
        gpuLayersLabel: "Слои GPU (-ngl): {layers}",
        dataProcessingTitle: "Обработка данных",
        parsePdfTitle: "Обрабатывать PDF как изображения",
        parsePdfDesc: "Преобразует страницы PDF в изображения вместо извлечения сырого текста. Оптимально для визуальных моделей Gemma 4 и Qwen 3.5.",
        consoleTitle: "Терминальная консоль llama-server (Live Stdout)",
        copyOutputTitle: "Копировать вывод терминала",
        clearConsoleTitle: "Очистить консоль",
        consoleEmpty: "[Консоль llama-server готова. Ожидание вывода сервера...]",
        modelWord: "Модель",
        visionWord: "Зрение",
        models: {
            "gemma-4-e2b": "Модель Google Gemma 4 E2B Instruct GGUF с полной мультимодальной поддержкой зрения.",
            "gemma-4-e4b": "Мощная модель Google Gemma 4 E4B с высоким уровнем рассуждений и мультимодальным зрением.",
            "qwen-3.5-4b": "Модель Alibaba Qwen 3.5 4B с мультимодальным зрением, кодом, рассуждением и мультиязычностью.",
            "bielik-11b-v3.1": "Флагманская польская и европейская 11B модель от SpeakLeash с высокой точностью и логикой."
        },
        toasts: {
            customModelLoaded: "Загружена своя модель: {name}",
            demoModelLoaded: "Загружен демонстрационный путь модели!",
            customProjectorLoaded: "Загружен проектор зрения: {name}",
            demoProjectorLoaded: "Загружен демо-путь проектора!",
            updatingEngine: "Обновление нативного движка llama.cpp...",
            engineUpdated: "Движок llama.cpp обновлён до сборки b11796!",
            engineUpdateFailed: "Ошибка обновления движка: {error}",
            unknownError: "Неизвестная ошибка",
            logsCopied: "Логи llama-server скопированы в буфер обмена!",
            hardwareDetected: "Определено железо: {threads} потоков, {ram} ГБ ОЗУ",
            hardwareDefault: "Железо определено: применены стандартные оптимизации",
            resizingContext: "Изменение окна контекста до {tokens} токенов..."
        }
    },
    adblockImport: {
        title: "Импорт списка блокировки из GitHub / Web",
        subtitle: "Автоматический разбор hosts-файлов, списков GitHub raw или правил Adblock.",
        closeTitle: "Закрыть",
        modeUrl: "Удалённый URL / GitHub",
        modePaste: "Вставить текст",
        urlLabel: "URL списка (GitHub raw, Gist или hosts)",
        githubRawBadge: "GitHub Raw",
        githubRawTitle: "Ссылка GitHub обнаружена и преобразована в формат raw",
        fetching: "Загрузка...",
        fetchParse: "Загрузить и разобрать",
        popularLists: "Популярные списки сообщества",
        pasteLabel: "Вставьте файл hosts, правила ABP или список доменов",
        pastePlaceholder: "# Вставьте любой формат ниже:\n0.0.0.0 tracking.evil.com\n127.0.0.1 ads.adserver.org\n||telemetry.network.io^\nanalytics.badsite.com",
        parsing: "Разбор...",
        parseDomains: "Разобрать домены",
        back: "Назад",
        backTitle: "Вернуться к выбору источника (Esc)",
        readyToImport: "Готово к импорту",
        kbSource: "Источник {kb} КБ",
        validDomains: "Корректные домены",
        newUnique: "Новые уникальные",
        duplicatesFiltered: "Отфильтровано дублей",
        linesAnalyzed: "Проверено строк",
        extractedSample: "Образец извлечённых доменов ({count})",
        searchSamplePlaceholder: "Поиск по образцу...",
        moreDomains: "+ ещё {count} доменов",
        backToSource: "Назад к источнику",
        cancel: "Отмена",
        replaceList: "Заменить весь список",
        replaceListTitle: "Заменяет ваш текущий список блокировки разобранными доменами",
        importN: "Импортировать {count} доменов",
        importDomains: "Импортировать домены",
        pastedSourceLabel: "Вставленный текст",
        errors: {
            invalidUrl: "Введите корректный URL списка блокировки.",
            fetchFailed: "Не удалось загрузить удалённый список",
            noValidFromUrl: "В этом источнике не найдено корректных доменов.",
            downloadError: "Ошибка загрузки удалённого списка",
            emptyPaste: "Сначала вставьте домены или правила hosts.",
            noValidFromText: "Из текста не удалось извлечь домены.",
            parseError: "Ошибка разбора текста"
        },
        presets: {
            stevenblack: {
                desc: "Комплексный список сообщества против рекламы и вредоносных сайтов.",
                badge: "Рекомендуем"
            },
            "oisd-basic": {
                desc: "Лёгкий список без ложных срабатываний против веб- и мобильной слежки.",
                badge: "Малая нагрузка"
            },
            "adguard-trackers": {
                desc: "Специализированный список против аналитики и скриптов телеметрии.",
                badge: "Приватность"
            },
            peterlowe: {
                desc: "Проверенный классический список активных рекламных серверов.",
                badge: "Быстрый"
            },
            danpollock: {
                desc: "Надёжный zero-host список от телеметрии, спама и вредных ресурсов.",
                badge: "Классика"
            }
        }
    },
    studio: {
        title: "Студия пресетов",
        subtitle: "Переставляйте панели перетаскиванием, настраивайте скругления, темы и собственные пресеты.",
        tabCanvas: "Холст",
        tabPresets: "Пресеты",
        closeAria: "Закрыть Студию пресетов",
        dockLeftSidebar: "Закрепить боковую панель слева",
        dockRightSidebar: "Закрепить боковую панель справа",
        dockTopBar: "Закрепить панель навигации сверху",
        dockBottomBar: "Закрепить панель навигации снизу",
        searchBarPlaceholder: "Поиск в сети или команда...",
        toolhubDockTitle: "Позиция ToolHub: {pos} (Нажмите или перетащите)",
        legendDock: "Панель:",
        legendBarValue: "{pos}",
        legendSidebar: "Боковая:",
        legendToolhub: "ToolHub:",
        legendSummary: "Скругление: {curvature} · Строка: {omnibox} · Вкладки: {tabs}",
        layoutControls: "Настройки макета",
        resetTitle: "Сбросить черновик к текущим настройкам браузера",
        reset: "Сбросить",
        editingLabel: "Редактирование:",
        cancelEditTitle: "Отменить редактирование и создать новый пресет",
        cancel: "Отмена",
        sidebarMode: "Режим боковой панели",
        sidebarModes: {
            classic: "Классика",
            floating: "Плавающая",
            compact: "Компактная",
            hidden: "Скрыта"
        },
        windowCurvature: "Скругление окна",
        curvatures: {
            default: "Обычное",
            cohesive: "Слитное",
            square: "Прямое"
        },
        omniboxArch: "Стиль адресной строки",
        omniboxStyles: {
            capsule: "Капсула",
            wide: "Широкая",
            minimal: "Минимал"
        },
        tabPresentation: "Вид вкладок",
        tabStyles: {
            pills: "Капсулы",
            compact: "Компактный",
            cards: "Карточки"
        },
        windowControlsStyle: "Кнопки окна",
        controlsStyles: {
            mac: "macOS",
            windows: "Windows",
            minimal: "Минимал"
        },
        windowControlsLayout: "Порядок кнопок окна",
        controlsOrders: {
            auto: "Умный угол",
            "close-first": "Сначала закрыть",
            "minimize-first": "Сначала свернуть"
        },
        themeLabel: "Тема",
        themes: {
            dark: "Тёмная",
            light: "Светлая"
        },
        uiScaleLabel: "Масштаб UI",
        uiScales: {
            comfortable: "Обычный",
            compact: "Компактный"
        },
        accentSwatchLabel: "Акцентный цвет",
        openColorPickerTitle: "Открыть системную палитру",
        saveChanges: "Сохранить изменения",
        applyLive: "Применить сразу",
        saveAsNew: "Сохранить как новый",
        applyToBrowser: "Применить к браузеру",
        saveAsCustom: "Сохранить как свой пресет",
        searchPresetsPlaceholder: "Поиск пресетов...",
        filterAll: "Все",
        filterBuiltin: "Встроенные",
        filterCustom: "Свои ({count})",
        saveActiveSetup: "Сохранить текущую настройку",
        activeBadge: "Активен",
        editingBadge: "(Правка)",
        reapply: "Повторить",
        apply: "Применить",
        editInStudio: "Править в Студии",
        customize: "Настроить",
        editPresetTitle: "Редактировать пресет в студии",
        customizePresetTitle: "Настроить макет в студии",
        duplicateTitle: "Дублировать пресет",
        deleteTitle: "Удалить пользовательский пресет",
        editCustomModalTitle: "Редактировать свой пресет",
        saveCustomModalTitle: "Сохранить как свой пресет",
        presetNameLabel: "Название пресета",
        presetNamePlaceholder: "напр. Эргономичный поток, Минимал Arc",
        presetDescLabel: "Описание",
        presetDescPlaceholder: "Краткое описание конфигурации...",
        presetIconLabel: "Иконка пресета",
        createPreset: "Создать пресет",
        deleteConfirmTitle: "Удалить свой пресет?",
        deleteConfirmDescBefore: "Вы уверены, что хотите удалить ",
        deleteConfirmDescAfter: "? Это действие нельзя отменить.",
        deletePresetBtn: "Удалить",
        posTop: "Сверху",
        posBottom: "Снизу",
        posLeft: "Слева",
        posRight: "Справа",
        moveTo: "Переместить: {pos}",
        draggableNavTitle: "Перетаскиваемая панель: тяните вверх/вниз или нажмите",
        draggableSidebarTitle: "Перетаскиваемая боковая панель: тяните влево или вправо",
        swapTo: "Перенести: {pos}",
        miniTab: "Вкладка #{num}",
        miniCardView: "Карточка #{num}",
        miniActiveSpaceTab: "Активная вкладка",
        miniSidebarPos: "Боковая ({pos})",
        layoutTagFormat: "{bar} · {sidebar}",
        layoutSummaryFormat: "{tag} · {toolhub}",
        topBarLabel: "Верхняя панель",
        bottomBarLabel: "Нижняя панель",
        leftSidebarLabel: "Левая панель",
        rightSidebarLabel: "Правая панель",
        leftToolhubLabel: "ToolHub слева",
        rightToolhubLabel: "ToolHub справа",
        tabsHighlight: "Вкладки: {style}",
        compactScaleLabel: "Компактный масштаб",
        comfortableScaleLabel: "Обычный масштаб",
        defaultCustomName: "Свой пресет",
        defaultCustomDesc: "Пользовательская конфигурация",
        defaultNewNameFormat: "{bar} {side}",
        defaultNewNameArc: "Arc",
        defaultNewNameFlow: "Поток",
        defaultNewDescFormat: "Свой макет: {bar}, {sidebar}, вкладки: {tabs}",
        toasts: {
            applied: "Макет применён к браузеру!",
            reset: "Черновик сброшен к текущим настройкам",
            editingPreset: "Редактирование «{name}» в Студии",
            loadedPreset: "«{name}» загружен на холст",
            switchedNewDraft: "Переключено на новый черновик"
        }
    },
    setup: {
        strictOfflineTitle: "Ноль фоновых запросов (Строгий офлайн)",
        strictOfflineDesc: "Отключите весь необязательный фоновый сетевой трафик (проверку обновлений, обновление фильтров, живые подсказки, удалённые фавиконки и облачную синхронизацию).",
        headerTitle: "Настройка QBrowse",
        headerSubtitle: "Помощник персонализации",
        steps: {
            language: {
                label: "Язык",
                desc: "Язык интерфейса"
            },
            presets: {
                label: "Стиль и темы",
                desc: "Макет и вид"
            },
            import: {
                label: "Импорт",
                desc: "Закладки и пароли"
            },
            privacy: {
                label: "Приватность",
                desc: "Защита и Tor"
            },
            default: {
                label: "По умолчанию",
                desc: "Интеграция с ОС"
            },
            sync: {
                label: "Аккаунт",
                desc: "Облако или локально"
            }
        },
        chooseSetupTitle: "Выберите стиль работы",
        chooseSetupDesc: "Выберите готовый макет для старта. Любую панель можно настроить в любой момент.",
        customLayoutCta: "Нужен свой макет? Студия пресетов →",
        themeLabel: "Тема",
        dark: "Тёмная",
        light: "Светлая",
        accentLabel: "Акцент",
        step2Badge: "Шаг 2 из 5",
        step2Title: "Перенесите данные и пароли",
        step2Desc: "Импортируйте закладки и пароли из Bitwarden, Proton Pass, Chrome или Firefox.",
        tabBookmarks: "Закладки",
        tabVault: "Хранилище паролей",
        bookmarksFound: "Найдено закладок: {count}",
        notDetected: "Не обнаружен на этом устройстве",
        imported: "Импортировано",
        importing: "Импорт...",
        importBookmarks: "Импортировать закладки",
        scanningBrowsers: "Поиск установленных браузеров...",
        htmlImported: "Файл HTML импортирован ({count} шт.)",
        uploadHtml: "Загрузить файл закладок HTML (.html)",
        vaultComplete: "Миграция хранилища завершена",
        vaultImportedSummary: "Успешно импортировано записей ({count}) из {source} в QVault!",
        importAnother: "Импортировать ещё",
        exportCsvJson: "Экспорт в .CSV или .JSON",
        parsingVault: "Разбор файла хранилища...",
        uploadVault: "Загрузить экспорт (.csv или .json)",
        compatibleManagers: "Совместимо с Bitwarden, Proton Pass, Google Chrome, Edge, Brave и 1Password",
        step3Badge: "Шаг 3 из 5",
        step3Title: "Усильте приватность",
        step3Desc: "QBrowse блокирует скрипты слежения, убирает рекламу и направляет трафик через сеть Tor.",
        privacyOptimizedBadge: "Пресет: Максимум приватности",
        adblockTitle: "Встроенный щит трекеров Ghostery",
        adblockDesc: "Блокирует трекеры, телеметрию и рекламу без замедления загрузки страниц.",
        torTitle: "Пространство Tor Onion Routing",
        torDesc: "Открывает доступ к .onion и многоуровневым шифрованным цепочкам ретрансляции.",
        ready: "Готово",
        step4Badge: "Шаг 4 из 5",
        step4Title: "Браузер по умолчанию",
        step4Desc: "Открывайте внешние ссылки в изолированных пространствах, автоматически отделяя работу от личного.",
        isDefaultTitle: "QBrowse установлен браузером по умолчанию!",
        makeDefaultTitle: "Сделайте QBrowse основным браузером",
        isDefaultDesc: "Все внешние ссылки и HTML-файлы будут автоматически открываться в QBrowse.",
        makeDefaultDesc: "Обрабатывает ссылки http://, https:// и файлы HTML с глубокой системной интеграцией.",
        osLabels: {
            darwin: "Системные настройки",
            linux: "Приложения по умолчанию",
            win32: "Приложения по умолчанию Windows"
        },
        defaultHint: "Открыто окно «{label}» — выберите QBrowse в системе для подтверждения.",
        openOsSettings: "Открыть {label}",
        defaultSet: "Установлен по умолчанию",
        openingSettings: "Открытие настроек...",
        setAsDefault: "Сделать браузером по умолчанию",
        step5Badge: "Шаг 5 из 5 • Профиль и облачная синхронизация",
        step5Title: "Выберите режим работы",
        step5Desc: "Полная независимость: работайте на 100% офлайн с локальным аппаратным шифрованием или создайте бесплатный аккаунт Cloud Sync.",
        zeroTelemetry: "Без телеметрии",
        localProfile: "Локальный профиль",
        localProfileDesc: "100% офлайн. Пароли, история и вкладки шифруются локальными аппаратными ключами. Аккаунт не нужен.",
        e2eEncrypted: "E2E-шифрование",
        cloudSync: "QBrowse Cloud Sync",
        cloudSyncDesc: "Синхронизируйте хранилище, пространства, закреплённые вкладки и закладки через Firebase.",
        localReadyTitle: "Локальный профиль готов к запуску",
        localReadyDesc: "Закладки, пароли и пространства останутся только на этом компьютере без телеметрии. Облачную синхронизацию можно включить позже в настройках.",
        takeTour: "Пройти живой тур",
        startDirectly: "Начать работу сразу",
        activeSync: "Синхр. активна",
        cloudLinked: "Подключено сквозное зашифрованное облако",
        signOut: "Выйти",
        activeSyncDesc: "Ваши закладки, вкладки и зашифрованное хранилище синхронизируются между авторизованными устройствами в реальном времени.",
        signIn: "Войти",
        existingAccount: "(Есть аккаунт)",
        register: "Регистрация",
        newAccount: "(Новый аккаунт)",
        registerSubtitle: "Создайте аккаунт QBrowse для синхронизации данных между устройствами.",
        signInSubtitle: "Войдите, чтобы синхронизировать закладки, пространства и хранилище.",
        switchToSignIn: "Перейти ко входу",
        emailLabel: "Электронная почта",
        emailPlaceholder: "name@example.com",
        createPassLabel: "Придумайте пароль (мин. 6 символов)",
        accountPassLabel: "Пароль аккаунта",
        min6Chars: "Минимум 6 символов",
        confirmPassLabel: "Подтвердите пароль",
        passwordsMatch: "Пароли совпадают",
        passwordsMismatch: "Пароли не совпадают",
        useAccountAsMaster: "Использовать пароль аккаунта как мастер-ключ",
        masterDerivedDesc: "Генерирует 256-битные ключи AES-GCM напрямую из вашего пароля входа.",
        masterSeparateDesc: "Используется отдельная пользовательская фраза шифрования.",
        customMasterLabel: "Своя мастер-фраза шифрования",
        customMasterPlaceholder: "Введите уникальную фразу шифрования...",
        creatingAccount: "Создание зашифрованного аккаунта...",
        signingInSyncing: "Вход и синхронизация...",
        createAccountBtn: "Создать аккаунт и включить Cloud Sync",
        signInBtn: "Войти и включить Cloud Sync",
        alreadyRegistered: "Уже зарегистрированы в QBrowse?",
        signInHere: "Войдите здесь",
        newToSync: "Впервые в QBrowse Cloud Sync?",
        createFreeAccount: "Создать бесплатный аккаунт",
        skipSyncLocal: "Пропустить синхронизацию и продолжить с локальным профилем",
        skipSyncComplete: "Пропустить и завершить",
        vaultModalTitle: "Защитите импортированное хранилище",
        vaultModalDesc: "Введите или создайте мастер-пароль для шифрования учётных данных.",
        masterPassLabel: "Мастер-пароль",
        masterPassPlaceholder: "Введите мастер-пароль...",
        confirmMasterLabel: "Подтвердите мастер-пароль",
        confirmMasterPlaceholder: "Подтвердите пароль...",
        cancel: "Отмена",
        encryptImport: "Зашифровать и импортировать",
        bookmarkFallback: "Закладка",
        htmlFileFallback: "HTML-файл",
        toasts: {
            enterEmail: "Введите адрес электронной почты.",
            validEmail: "Введите корректный email (напр. name@domain.com).",
            passMin6: "Пароль должен содержать не менее 6 символов.",
            confirmPassReq: "Подтвердите пароль.",
            passMismatch: "Пароли не совпадают.",
            signedIn: "Вы вошли в QBrowse Cloud Sync!",
            registered: "Аккаунт создан, Cloud Sync активен!",
            bookmarksImported: "Успешно импортировано закладок: {count}!",
            importFailed: "Сбой импорта.",
            couldNotImportBookmarks: "Не удалось импортировать закладки.",
            htmlImported: "Импортировано закладок ({count}) из {filename}!",
            htmlImportFailed: "Ошибка импорта HTML-закладок.",
            noCredentials: "В файле не найдены учётные данные",
            passwordsImported: "Импортировано паролей ({count}) из {source}!",
            vaultImportFailed: "Ошибка импорта: {error}",
            passMin4: "Пароль должен быть не короче 4 символов",
            vaultPassMismatch: "Пароли не совпадают",
            incorrectMasterPass: "Неверный мастер-пароль для существующего хранилища",
            vaultImportError: "Ошибка импорта: {error}",
            nowDefault: "QBrowse теперь ваш браузер по умолчанию!",
            openingWinDefault: "Открытие приложений по умолчанию Windows. Выберите QBrowse.",
            openingOsDefault: "Открытие «{label}». Выберите QBrowse браузером по умолчанию.",
            couldNotOpenDefault: "Не удалось открыть настройки браузера по умолчанию."
        }
    },
    flags: {
        title: "Эксперименты",
        subtitle: "Тонкая настройка экспериментальных функций, аппаратных графических конвейеров, постквантовых шифров и изоляции Tor.",
        resetAll: "Сбросить все настройки",
        warningTitle: "Внимание: экспериментальные функции!",
        warningBody: "Включение этих флагов изменяет параметры Chromium V8, аппаратного композитинга или TLS. Для применения требуется перезапуск.",
        searchPlaceholder: "Поиск флагов (напр. GPU, Kyber, QUIC, DoH, bfcache)...",
        tabAvailable: "Доступные ({count})",
        tabUnavailable: "Недоступные ({count})",
        categories: {
            All: "Все",
            Performance: "Производительность",
            "Hardware & Graphics": "Оборудование и графика",
            "Web Standards & Engine": "Веб-стандарты и движок",
            Security: "Безопасность",
            Networking: "Сеть",
            "Media & UI": "Медиа и интерфейс",
            "AI & Tools": "ИИ и инструменты",
            Experimental: "Экспериментальные"
        },
        statuses: {
            Stable: "Стабильный",
            Beta: "Бета",
            Experimental: "Эксперимент"
        },
        options: {
            default: "По умолчанию",
            enabled: "Включено",
            disabled: "Отключено"
        },
        emptyMatch: "Нет доступных флагов по запросу «{search}»",
        reasonPrefix: "Причина: {reason}",
        unavailableBadge: "Недоступно",
        relaunchMsg: "Изменения вступят в силу при следующем перезапуске QBrowse.",
        relaunchBtn: "Перезапустить",
        toasts: {
            reset: "Все экспериментальные флаги сброшены по умолчанию",
            relaunching: "Перезапуск QBrowse с обновлёнными флагами..."
        },
        items: {
            "prefer-high-performance-gpu": {
                name: "Предпочитать высокопроизводительный GPU",
                description: "Направляет WebGL, Canvas и 3D-рендеринг на дискретную видеокарту. Автоматически отключается в режиме экономии."
            },
            "unlock-frame-rate": {
                name: "Снятие ограничения кадров (Режим бенчмарка)",
                description: "Отключает V-Sync для синтетических тестов FPS. Может вызывать разрывы изображения и повышенное энергопотребление."
            },
            "ignore-gpu-blocklist": {
                name: "Игнорировать чёрный список GPU",
                description: "Игнорирует встроенные списки программного рендеринга Chromium и включает аппаратное ускорение."
            },
            "experimental-web-platform": {
                name: "Экспериментальные функции веб-платформы",
                description: "Включает экспериментальные API Chromium в разработке; некоторые новые интерфейсы могут работать нестабильно."
            },
            "gpu-rasterization": {
                name: "Растеризация GPU и ускорение композитора",
                description: "Ускоряет растеризацию и компоновку веб-страниц через аппаратные конвейеры GPU вместо CPU."
            },
            "smooth-scrolling": {
                name: "Движок плавной прокрутки",
                description: "Включает плавную физическую анимацию при прокрутке колесом мыши, тачпадом или стрелками."
            },
            "zero-copy-rasterizer": {
                name: "Растеризатор GPU Zero-Copy (GpuMemoryBuffer)",
                description: "Записывает данные напрямую в общие текстуры GPU без промежуточного копирования в памяти CPU."
            },
            "enable-vulkan": {
                name: "Графический бэкенд Vulkan",
                description: "Использует кроссплатформенный API Vulkan для компоновки и рендеринга на поддерживаемых GPU."
            },
            "back-forward-cache": {
                name: "Кэш переходов Назад/Вперёд (bfcache)",
                description: "Сохраняет снимки недавно посещённых страниц в ОЗУ для мгновенного возврата."
            },
            "canvas-oop-rasterization": {
                name: "Внепроцессная растеризация 2D Canvas",
                description: "Выполняет операции HTML5 2D Canvas в выделенном процессе GPU вместо рендерера."
            },
            "enable-drdc": {
                name: "Динамическое определение высокой герцовки (120/144/240 Гц)",
                description: "Синхронизирует частоту кадров и V-Sync с дисплеями ProMotion и игровыми мониторами."
            },
            "auto-suspend-tabs": {
                name: "Автоматический сон вкладок (Экономия ОЗУ)",
                description: "Выгружает неактивные фоновые вкладки через 15 минут простоя для экономии памяти и батареи."
            },
            "parallel-download-engine": {
                name: "Параллельная многопоточная загрузка",
                description: "Разбивает крупные файлы на несколько параллельных HTTP-запросов диапазонов для максимальной скорости."
            },
            "lazy-image-loading": {
                name: "Отложенная загрузка изображений и фреймов",
                description: "Откладывает загрузку изображений и iframe за пределами экрана до момента прокрутки."
            },
            "enable-tls13-kyber": {
                name: "Постквантовая криптография для TLS (Kyber768 / ML-KEM)",
                description: "Включает квантово-устойчивый гибридный обмен ключами в TLS 1.3."
            },
            "enable-encrypted-client-hello": {
                name: "Encrypted Client Hello (ECH / Шифрованный SNI)",
                description: "Шифрует имя сервера (SNI) в рукопожатиях TLS от провайдеров и сетевых фильтров."
            },
            "strict-origin-isolation": {
                name: "Строгая изоляция сайтов по процессам",
                description: "Выделяет отдельный процесс ОС с изолированной памятью для каждого домена против Spectre и Meltdown."
            },
            "webrtc-ip-protection": {
                name: "Защита локального IP и утечек STUN в WebRTC",
                description: "Ограничивает кандидатов ICE WebRTC, скрывая ваш реальный локальный или публичный IP-адрес."
            },
            "enable-dns-over-https": {
                name: "Строгий DNS-over-HTTPS (Cloudflare/Quad9)",
                description: "Шифрует все DNS-запросы по HTTPS (порт 443), предотвращая перехват и подмену DNS."
            },
            "disable-hyperlink-auditing": {
                name: "Отключить аудит гиперссылок (<a ping>)",
                description: "Блокирует скрытую отправку отслеживающих POST-запросов при кликах по ссылкам."
            },
            "enable-fingerprint-randomization": {
                name: "Шум против фингерпринтинга Canvas и WebAudio",
                description: "Добавляет криптографический шум при чтении пикселей и аудио для защиты от идентификации устройства."
            },
            "enable-font-enumeration-shield": {
                name: "Защита от сканирования локальных шрифтов",
                description: "Запрещает сайтам собирать список системных шрифтов для отслеживания."
            },
            "aggressive-tracker-blocker": {
                name: "Агрессивная очистка URL от параметров слежки",
                description: "Удаляет utm_source, gclid, fbclid и блокирует известные пиксели отслеживания."
            },
            "enable-subresource-filter": {
                name: "Фильтр ресурсов против навязчивых наложений",
                description: "Выявляет и подавляет кликджекинг, невидимые ссылки и ложные кнопки загрузки."
            },
            "enable-quic": {
                name: "Экспериментальный транспорт QUIC и HTTP/3",
                description: "Включает протокол HTTP/3 поверх UDP для соединений 0-RTT и мультиплексирования."
            },
            "tor-stream-isolation": {
                name: "Изоляция цепочек Tor по доменам (IsolateDestAddr)",
                description: "Назначает отдельный выходной узел для каждого домена в Tor против корреляции трафика."
            },
            "dns-prefetching": {
                name: "Предиктивное предразрешение DNS",
                description: "Заранее определяет IP-адреса видимых на странице ссылок для ускорения переходов."
            },
            "heavy-ad-intervention": {
                name: "Блокировка ресурсоёмкой рекламы",
                description: "Выгружает рекламные фреймы, потребляющие более 4 МБ трафика или 60 секунд процессорного времени."
            },
            "cross-origin-isolation": {
                name: "Политика COOP и SharedArrayBuffer",
                description: "Открывает доступ к высокоточной разделяемой памяти WebAssembly за счёт строгих правил изоляции."
            },
            "document-pip-api": {
                name: "API Document Picture-in-Picture",
                description: "Включает плавающие окна «картинка в картинке» с произвольным HTML, видео и виджетами."
            },
            "force-dark-contents": {
                name: "Автоматическая тёмная тема для сайтов",
                description: "Создаёт тёмное оформление для светлых сайтов с сохранением яркости изображений."
            },
            "overlay-scrollbars": {
                name: "Минималистичные плавающие полосы прокрутки",
                description: "Заменяет громоздкие системные полосы тонкими индикаторами, исчезающими в покое."
            },
            "enable-webgpu": {
                name: "Графический и вычислительный API WebGPU",
                description: "Предоставляет прямой доступ к GPU для нейросетей, 3D-графики и шейдеров в браузере."
            },
            "tab-audio-muting": {
                name: "Отключение звука вкладки в один клик",
                description: "Добавляет интерактивную кнопку динамика на вкладки для мгновенного отключения звука."
            },
            "webrtc-pipewire": {
                name: "Захват экрана PipeWire (Linux Wayland)",
                description: "Включает демонстрацию экрана через портал PipeWire в GNOME и KDE Plasma."
            },
            "hdr-compositing": {
                name: "Композитинг цвета HDR",
                description: "Включает 10-битный широкий цветовой охват (Rec.2020 / DCI-P3) на совместимых экранах."
            },
            "local-ai-assistant": {
                name: "Ускорение локальных моделей GGUF в VRAM (llama.cpp)",
                description: "Выгружает веса Gemma и Llama 3 в видеопамять GPU для быстрого приватного анализа."
            },
            "experimental-split-screen-gestures": {
                name: "Кинетические жесты разделения экрана",
                description: "Позволяет перетаскивать вкладки к краям окна для мгновенного создания двухоконного режима."
            },
            "enable-reader-mode": {
                name: "Режим чтения статей без отвлечений",
                description: "Очищает статьи от рекламы и боковых панелей, оставляя только удобный для чтения текст."
            },
            "auto-password-generation": {
                name: "Криптографическая генерация надёжных паролей",
                description: "Предлагает 128-битные стойкие пароли при регистрации с сохранением в QVault."
            },
            "tab-groups-auto-clustering": {
                name: "Умная группировка вкладок по доменам",
                description: "Предлагает объединять открытые вкладки по общим доменам и рабочим пространствам."
            },
            "touch-ui-layout": {
                name: "Сенсорный режим для планшетов",
                description: "Увеличивает высоту вкладок и отступы под касания. Отключено для ПК с мышью.",
                reason: "Требуется аппаратный сенсорный экран."
            },
            "eye-tracking-gaze-scroll": {
                name: "Прокрутка взглядом (Eye-Tracking)",
                description: "Прокручивает страницу по движению зрачков. Требуются специальные ИК-датчики.",
                reason: "Совместимый датчик отслеживания взгляда не обнаружен."
            },
            "cellular-data-saver": {
                name: "Экономия трафика в мобильных сетях",
                description: "Сжимает изображения через внешние прокси. Отключено ради приватности.",
                reason: "Отключено по умолчанию для сохранения сквозной приватности Tor и HTTPS."
            }
        }
    }
};

const it = {
    common: {
        incognito: "Incognito",
        selectOption: "Seleziona opzione...",
        colors: {
            accent: "Accento",
            yellow: "Giallo",
            green: "Verde",
            blue: "Blu",
            pink: "Rosa"
        }
    },
    wallpaperPreview: {
        alt: "Anteprima sfondo",
        badge: "Anteprima"
    },
    presets: {
        names: {
            balanced: "Bilanciato",
            developer: "Sviluppatore",
            classic_reverse: "Arc Moderno",
            bottom_bar: "Flusso Ergonomico",
            minimalist: "Focus Minimale",
            privacy: "Sentinella Privacy"
        },
        taglines: {
            balanced: "Spazi Personale e Lavoro con ricerca Google.",
            developer: "Spazi isolati con integrazione GitHub Live PR.",
            classic_reverse: "Albero schede a destra e vista pulita.",
            bottom_bar: "Barra indirizzi in basso per una navigazione comoda.",
            minimalist: "Spazio singolo con interfaccia compatta senza distrazioni.",
            privacy: "Protezione anti-tracciamento rigorosa con DuckDuckGo."
        },
        descriptions: {
            balanced: "Doppio spazio (Personale & Lavoro), privacy standard e ricerca Google.",
            developer: "Isolamento multi-spazio con tracciamento PR GitHub Live.",
            classic_reverse: "Albero di navigazione a destra, cassetto specchiato e flusso ordinato.",
            bottom_bar: "Barra indirizzi inferiore ergonomica pensata per l’uso a una mano.",
            minimalist: "Spazio unico, barra laterale destra e design compatto essenziale.",
            privacy: "Blocco severo dei tracker, DuckDuckGo e instradamento Tor immediato."
        },
        customTaglineFallback: "Configurazione personalizzata di spazio e layout.",
        accents: {
            amberGold: "Oro Ambra",
            ocean: "Oceano",
            skyBlue: "Blu Cielo",
            cyberEmerald: "Smeraldo Cyber",
            electricBlue: "Blu Elettrico",
            royalViolet: "Viola Reale",
            roseGold: "Oro Rosa",
            sunsetOrange: "Arancio Tramonto",
            cyberCyan: "Ciano Cyber",
            slateGray: "Grigio Ardesia"
        }
    },
    addPin: {
        title: "Fissa app nella barra laterale",
        subtitle: "Aggiungi una scorciatoia rapida per un’app o un sito web",
        defaultAppName: "Nome App",
        appNameLabel: "Nome / Titolo App",
        appNamePlaceholder: "es. GitHub, Gemini...",
        urlLabel: "URL / Dominio *",
        urlPlaceholder: "es. github.com o https://gemini.google.com",
        quickPresets: "Scorciatoie rapide",
        cancel: "Annulla",
        pinApp: "Fissa App"
    },
    passkey: {
        biometrics: {
            darwin: "Touch ID",
            linux: "Biometria di sistema",
            win32: "Windows Hello"
        },
        hints: {
            darwin: "Tocca il sensore Touch ID o inserisci la password macOS",
            linux: "Tocca il lettore d’impronte o inserisci la password di sistema",
            win32: "Tocca il lettore d’impronte o inserisci il PIN di Windows"
        },
        cancelDenyTitle: "Annulla e rifiuta",
        verifiedTitle: "Identità verificata!",
        scanningTitle: "Scansione {biometric}...",
        autofillTitle: "Compila password salvata",
        passkeyTitle: "Autenticazione con Passkey",
        verifiedAutofillDesc: "Cassaforte sbloccata e credenziali inserite",
        verifiedPasskeyDesc: "Passkey rilasciata e firmata con successo",
        requireAutofillDesc: "Verifica richiesta per sbloccare e compilare",
        requirePasskeyDesc: "Verifica richiesta per accedere con la tua passkey",
        passwordBadge: "Password",
        passkeyBadge: "Passkey",
        accountLabel: "Account:",
        savedLogin: "Accesso salvato",
        passkeyUser: "Utente Passkey",
        verifyingWith: "Verifica con {biometric}...",
        verifiedBtn: "Verificato!",
        verifyWith: "Verifica con {biometric}",
        orPassPin: "Oppure con password principale / PIN",
        orPass: "Oppure con password principale",
        placeholderPin: "Password principale o PIN rapido a 4–8 cifre",
        placeholderPass: "Inserisci la password principale QVault",
        checking: "Controllo credenziali...",
        verifyAuth: "Verifica e autentica",
        cancelDenyBtn: "Annulla e rifiuta richiesta",
        websiteFallback: "Sito web",
        theWebsiteFallback: "il sito web",
        toastAutofill: "Cassaforte sbloccata e credenziali inserite per {domain}!",
        toastPasskey: "Passkey verificata per {domain}!",
        promptAutofill: "Verifica la tua identità per compilare le credenziali di {domain}",
        promptPasskey: "Accedi a {domain} con la tua passkey QVault",
        biometricError: "Errore biometrico: {error}",
        vaultLockedOut: "Cassaforte bloccata dopo tentativi falliti. Riprova tra {seconds}s.",
        incorrectCreds: "Password principale o PIN rapido errati. Riprova.",
        verificationFailed: "Verifica non riuscita: {error}",
        passkeyCreateTitle: "Crea passkey QVault",
        verifiedPasskeyCreateDesc: "Identità verificata — salvataggio passkey in QVault",
        requirePasskeyCreateDesc: "Verifica richiesta per creare e salvare questa passkey",
        useHardwareKeyBtn: "Usa chiave hardware / di sistema",
        useHardwareKeyHint: {
            darwin: "YubiKey · FIDO2 · Touch ID · QR telefono",
            linux: "YubiKey · FIDO2 · USB / NFC / BLE · QR telefono",
            win32: "YubiKey · FIDO2 · Windows Hello · QR telefono"
        },
        toastHardwareHandoff: "Passaggio alla chiave di sicurezza hardware / di sistema per {domain}...",
        toastPasskeyCreated: "Passkey verificata e salvata per {domain}!",
        promptPasskeyCreate: "Crea e salva una passkey QVault per {domain}"
    },
    history: {
        title: "Archivio",
        entrySingular: "{count} voce salvata",
        entryPlural: "{count} voci salvate",
        searchPlaceholder: "Cerca nell’archivio...",
        clearAllTitle: "Cancella tutta la cronologia",
        clear: "Cancella",
        closeTitle: "Chiudi (Esc)",
        segments: {
            all: "Tutto",
            today: "Oggi",
            yesterday: "Ieri",
            week: "Ultimi 7 giorni",
            older: "Meno recenti"
        },
        emptySearch: "Nessun risultato per \"{query}\"",
        emptyTitle: "L’archivio è vuoto",
        emptySearchDesc: "Controlla l’ortografia o seleziona un altro filtro.",
        emptyDesc: "Le pagine visitate verranno salvate qui per un rapido accesso.",
        itemSingular: "{count} elemento",
        itemPlural: "{count} elementi",
        copyLinkTitle: "Copia link",
        openNewTabTitle: "Apri in una nuova scheda",
        removeTitle: "Rimuovi dall’archivio",
        toastCleared: "Archivio svuotato",
        toastCopied: "Link copiato",
        toastOpenedBg: "Aperto in una scheda in background",
        loadMore: "Carica altro",
    },
    cookies: {
        title: "Esplora cookie e archiviazione siti",
        subtitle: "Esamina, cerca ed elimina cookie e dati locali dei siti",
        filterDomain: "Filtra dominio",
        refreshTitle: "Aggiorna elenco",
        allSites: "Tutti i siti",
        clearDomain: "Cancella {domain}",
        clearAllData: "Cancella tutti i dati di navigazione",
        searchPlaceholder: "Cerca cookie per nome, dominio o valore...",
        emptyTitle: "Nessun cookie trovato",
        emptyDesc: "Cancella la ricerca o scegli un altro dominio",
        secure: "Sicuro",
        httpOnly: "HttpOnly",
        path: "Percorso: {path}",
        expires: "Scade: {date}",
        deleteTitle: "Elimina cookie",
        toastDeleted: "Cookie eliminato: {name}",
        toastClearedSite: "Eliminati {count} cookie per {domain}",
        toastClearedAll: "Dati di navigazione e cookie eliminati"
    },
    resources: {
        title: "Task Manager",
        cpu: "CPU",
        ram: "RAM",
        asleepCount: "{count} in sospensione",
        sleepInactive: "Sospendi inattive",
        sleepInactiveTitle: "Sospendi le schede inattive in background per liberare memoria",
        wakeAll: "Risveglia tutte",
        wakeAllTitle: "Ripristina tutte le schede sospese",
        purgeCacheTitle: "Svuota la cache di memoria del browser",
        autoRefreshActiveTitle: "Aggiornamento automatico attivo (ogni 2s)",
        autoRefreshPausedTitle: "Aggiornamento automatico in pausa",
        autoRefresh2s: "2s",
        paused: "In pausa",
        refreshTitle: "Aggiorna metriche dei processi",
        closeTitle: "Chiudi (ESC)",
        filters: {
            all: "Tutto",
            tabs: "Schede",
            processes: "Processi",
            sleeping: "In sospensione"
        },
        searchPlaceholder: "Filtra per nome, PID...",
        colTask: "Attività / Processo",
        colSpace: "Spazio / Tipo",
        colStatus: "Stato",
        colCpu: "CPU",
        colMemory: "Memoria",
        colAction: "Azione",
        emptyMatch: "Nessuna attività corrispondente a \"{query}\"",
        blankTab: "Scheda vuota",
        newTabDash: "Dashboard Nuova Scheda Zen",
        pidSubtitle: "PID {pid} · {type}",
        active: "Attiva",
        spaceTab: "Scheda {space}",
        mainCore: "Core principale",
        sleep: "Sospesa",
        live: "Attivo",
        memSaved: "(Risparmiata)",
        wakeTabTitle: "Risveglia scheda",
        activeTabCannotSleep: "La scheda attiva non può essere sospesa",
        sleepTabTitle: "Sospendi scheda",
        switchTabTitle: "Vai alla scheda",
        closeTabTitle: "Chiudi scheda",
        core: "Core",
        endProcessTitle: "Termina processo PID {pid}",
        itemsOf: "{shown} di {total} elementi",
        pressEscPrefix: "Premi",
        pressEscSuffix: "per chiudere",
        procMain: "Processo Principale QBrowse",
        procGpu: "Processo GPU",
        procRenderer: "Renderer Webview",
        procUtility: "Servizio di utilità (Audio/Archivio)",
        procZygote: "Precaricatore Sandbox",
        procPepper: "Host Plugin",
        procChild: "Processo {type}",
        procChildDefault: "Figlio",
        toastHibernatedSingular: "{count} scheda inattiva sospesa (~{mb} MB di RAM liberati)",
        toastHibernatedPlural: "{count} schede inattive sospese (~{mb} MB di RAM liberati)",
        toastWokeSingular: "{count} scheda sospesa ripristinata",
        toastWokePlural: "{count} schede sospese ripristinate",
        toastCachePurged: "Cache del browser svuotata e memoria ottimizzata",
        toastKillUnavailable: "Impossibile terminare il processo: API non disponibile",
        toastKilled: "Processo {pid} terminato",
        toastKillFailed: "Impossibile terminare il processo {pid}",
        toastKillError: "Errore durante la chiusura del processo {pid}"
    },
    docViewer: {
        fallbackName: "Documento locale",
        fallbackFile: "File",
        preview: "Anteprima",
        raw: "Origine",
        zoomOut: "Riduci zoom",
        zoomIn: "Aumenta zoom",
        resetZoom: "Ripristina zoom",
        copyTitle: "Copia contenuto del file",
        copied: "Copiato",
        copy: "Copia",
        revealTitle: "Mostra nella cartella di sistema",
        loading: "Caricamento documento...",
        errorTitle: "Impossibile visualizzare il file",
        readError: "Impossibile leggere il file",
        toastCopied: "Contenuto copiato negli appunti",
        toastRevealed: "File mostrato nella cartella di sistema"
    },
    pdfViewer: {
        toggleThumbnails: "Mostra/nascondi miniature pagine",
        fallbackName: "Documento PDF",
        pageSingular: "{count} pagina",
        pagePlural: "{count} pagine",
        prevPage: "Pagina precedente",
        nextPage: "Pagina successiva",
        zoomOut: "Riduci zoom",
        zoomIn: "Aumenta zoom",
        fitWidth: "Adatta alla larghezza",
        rotate: "Ruota di 90° in senso orario",
        normalMode: "Modalità normale",
        darkInvertMode: "Modalità scura invertita",
        summarize: "Riassumi",
        revealTitle: "Apri nel gestore file",
        pagesHeader: "Pagine",
        pageNum: "Pagina {num}",
        loading: "Rendering del PDF con PDF.js...",
        errorTitle: "Impossibile aprire il documento",
        openError: "Errore nell’apertura del documento PDF",
        extractingToast: "Estrazione del testo per Qu-AI...",
        openedAiToast: "Aperto nel pannello Qu-AI con il testo del documento!",
        extractErrorToast: "Estrazione testo non riuscita: {error}",
        revealedToast: "File mostrato nella cartella di sistema",
        fallbackDocName: "documento",
        pageMarker: "--- Pagina {num} ---",
        summaryPrompt: "Fornisci un riassunto chiaro e i punti chiave di questo documento PDF ({fileName}):"
    },
    localDir: {
        parentFolderTitle: "Vai alla cartella superiore",
        reloadTitle: "Ricarica cartella",
        openInFileManager: "Apri nel gestore file",
        filterPlaceholder: "Filtra i file in questa cartella...",
        sortName: "Nome",
        sortSize: "Dimensione",
        sortDate: "Data",
        gridViewTitle: "Vista griglia",
        listViewTitle: "Vista elenco",
        scanning: "Scansione del contenuto della cartella...",
        errorTitle: "Impossibile aprire la cartella",
        goParent: "Vai alla cartella superiore",
        emptySearch: "Nessun file corrisponde alla ricerca",
        emptySearchHint: "Prova a cancellare il filtro di ricerca",
        folderType: "Cartella",
        revealTitle: "Mostra nel gestore file",
        colName: "Nome",
        colModified: "Modificato",
        colSize: "Dimensione",
        itemSingular: "{count} elemento",
        itemPlural: "{count} elementi",
        filtered: "(filtrato)",
        suiteName: "Suite File QBrowse",
        apiUnavailable: "API directory di Electron non disponibile",
        openFailed: "Impossibile aprire la directory",
        toastOpened: "Aperto nel gestore file di sistema",
        toastRevealed: "Mostrato: {name}"
    },
    tour: {
        welcomeTitle: "Benvenuto in QBrowse",
        welcomeSubtitle: "Scegli come desideri esplorare la guida del browser:",
        overviewBadge: "Panoramica",
        quickTitle: "Panoramica rapida",
        quickDesc: "Tour visivo veloce di layout, spazi di lavoro e navigazione con spiegazioni chiare.",
        startQuick: "Avvia tour rapido",
        interactiveBadge: "Interattivo",
        interactiveTitle: "Masterclass interattiva",
        interactiveDesc: "Missioni guidate sull’interfaccia reale: clicca i pulsanti, prova Tor e impara le scorciatoie.",
        startInteractive: "Avvia tour interattivo",
        skipWelcome: "Salta il tour e inizia a navigare (Esc)",
        stepCounter: "Passo {current} di {total}",
        closeTitle: "Chiudi tour (Esc)",
        skipTour: "Salta",
        back: "Indietro",
        finishTour: "Termina tour",
        nextStep: "Avanti",
        exitToast: "Tour chiuso. Premi Ctrl+K in qualsiasi momento per esplorare QBrowse!",
        topBarShortcut: "Barra superiore",
        steps: {
            spaces: {
                title: "Isolamento multi-spazio",
                badge: "Spazi",
                description: "Mantieni i flussi separati. Ogni spazio (Personale, Lavoro, Ghost, Tor) isola accessi, cookie e schede.",
                missionInstruction: "Clicca sullo spazio \"Lavoro\" nella barra laterale o premi Ctrl+2",
                missionSuccess: "Spazio cambiato! Schede, accessi e cookie di sessione sono ora perfettamente isolati."
            },
            splitview: {
                title: "Vista divisa nativa",
                badge: "Multitasking",
                description: "Consulta due siti affiancati senza aprire altre finestre. Ideale per ricerca, codice e confronti.",
                missionInstruction: "Clicca l’icona Vista Divisa in alto o premi Ctrl+\\",
                missionSuccess: "Vista divisa attivata! Nota la seconda finestra di navigazione apparsa a destra."
            },
            tor: {
                title: "Rete Tor Onion integrata",
                badge: "Privacy & Onion",
                description: "Naviga nel web decentralizzato con crittografia multi-nodo integrata e supporto ai domini .onion senza proxy esterni.",
                missionInstruction: "Clicca sull’icona Tor in alto per esaminare il circuito attivo",
                missionSuccess: "Circuito Tor aperto! Puoi vedere i nodi di inoltro e gestire la rete in ogni momento."
            },
            vault: {
                title: "QVault Zero-Knowledge",
                badge: "Sicurezza hardware",
                description: "Password, passkey e carte vengono cifrate localmente con chiavi hardware e {biometric}. Nessun dato in chiaro lascia il PC.",
                missionInstruction: "Clicca sull’icona QVault in alto per aprire la tua cassaforte locale",
                missionSuccess: "QVault aperto! Tutte le credenziali sono cifrate localmente con protezione biometrica."
            },
            shield: {
                title: "Blocco nativo di annunci e tracker",
                badge: "Protezione",
                description: "Il blocco accelerato da hardware ferma telemetria, miner, fingerprinting e pubblicità prima ancora del caricamento.",
                missionInstruction: "Clicca sull’icona Scudo in alto per vedere i tracker bloccati",
                missionSuccess: "Ispettore QShield aperto! Visualizza i domini bloccati in tempo reale e gestisci le regole."
            },
            darkmode: {
                title: "Modalità scura smart e temi",
                badge: "Aspetto",
                description: "Personalizza lo stile tra temi scuri eleganti, modalità chiara nitida o inversione intelligente per i siti chiari.",
                missionInstruction: "Clicca sull’icona Tema in alto per esplorare le opzioni visive",
                missionSuccess: "Pannello temi aperto! Passa tra scuro, chiaro e inversione intelligente."
            },
            toolhub: {
                title: "ToolHub e note persistenti",
                badge: "Strumenti",
                description: "Evidenzia qualsiasi testo per salvare note persistenti oltre i riavvii, usa l’assistente IA locale e consulta gli appunti.",
                missionInstruction: "Clicca sulla maniglia ToolHub a destra o premi Ctrl+J per aprire il pannello",
                missionSuccess: "ToolHub aperto! Allega note ai siti o chatta con il tuo assistente IA locale."
            },
            omnibox: {
                title: "Omnibox smart e tavolozza comandi",
                badge: "Comando universale",
                description: "Punto di lancio universale: scorciatoie (!yt, @github), comandi (>pdf, >clear), calcolatrice e accesso all’IA locale.",
                missionInstruction: "Premi Ctrl+K o clicca sulla barra indirizzi centrale per comandare QBrowse",
                missionSuccess: "Omnibox attivata! Scrivi !yt per YouTube, @github per i repository o > per i comandi."
            }
        }
    },
    reader: {
        themes: {
            dark: "Scuro",
            sepia: "Seppia",
            light: "Chiaro",
            midnight: "Mezzanotte"
        },
        fonts: {
            serif: "Serif",
            sans: "Sans",
            mono: "Mono",
            dyslexic: "Dislessia"
        },
        widths: {
            compact: "Compatta",
            balanced: "Bilanciata",
            wide: "Ampia"
        },
        exitTitle: "Esci dalla modalità lettura (Esc / Ctrl+Alt+R)",
        backToWebpage: "Torna alla pagina",
        openOriginalTitle: "Apri originale: {url}",
        hideAudioTitle: "Nascondi lettore audio",
        listenTitle: "Ascolta articolo (Lettura ad alta voce)",
        listening: "In ascolto",
        readAloud: "Leggi ad alta voce",
        themeTitle: "Tema {name}",
        fontTitle: "Usa font {name}",
        decreaseSizeTitle: "Riduci dimensione testo",
        increaseSizeTitle: "Aumenta dimensione testo",
        widthTitle: "Larghezza colonna: {name}",
        closeTitle: "Chiudi modalità lettura",
        byAuthor: "Di {author}",
        minRead: "{minutes} min di lettura",
        wordsCount: "{count} parole",
        prevParaTitle: "Paragrafo precedente",
        pauseTitle: "Pausa",
        playTitle: "Riproduci",
        nextParaTitle: "Paragrafo successivo",
        audioNarration: "Narrazione audio",
        blockProgress: "Blocco {current} di {total}",
        speedTitle: "Cambia velocità di lettura",
        selectVoiceTitle: "Seleziona voce",
        voiceFallback: "Voce",
        systemVoices: "Voci di sistema",
        stopCloseTitle: "Ferma e chiudi narrazione",
        highlightWithTitle: "Evidenzia con {color}",
        noteBtn: "Nota",
        copyTextTitle: "Copia testo",
        stickyNote: "Nota adesiva",
        notePlaceholder: "Scrivi una nota o un pensiero...",
        deleteBtn: "Elimina",
        saveBtn: "Salva"
    },
    toolhub: {
        title: "Tool Hub",
        snip: "Ritaglio",
        snipTitle: "Ritaglio schermo interattivo (Selezione)",
        captureViewportTitle: "Cattura area visibile",
        captureFullTitle: "Cattura intera pagina scorrevole",
        tabs: {
            notes: "Note",
            clipboard: "Appunti",
            ai: "IA Locale",
            downloads: "Download"
        },
        webNotesTab: "Note Web ({count})",
        scratchpadTab: "Blocco note",
        globalScope: "Globale",
        spaceScope: "Spazio {space}",
        scratchpadTitle: "Blocco note: {name}",
        scratchpadGlobalPlaceholder: "Annota pensieri globali, appunti, link... Markdown supportato.",
        scratchpadSpacePlaceholder: "Blocco note per spazio {space}... Markdown supportato.",
        searchNotesPlaceholder: "Cerca evidenziazioni, note, domini...",
        clearSearchTitle: "Cancella ricerca",
        allSpaces: "Tutti gli spazi",
        exportMd: "Esporta MD",
        exportMdTitle: "Esporta note in Markdown (.md)",
        noWebNotesTitle: "Nessuna nota web salvata",
        noWebNotesDesc: "Evidenzia del testo su qualsiasi pagina e clicca \"Nota\" per conservare appunti tra le visite.",
        otherDomain: "Altro",
        colorTitle: "Colore: {color}",
        jumpHighlightTitle: "Clicca per andare a questa evidenziazione nella pagina",
        editNotePlaceholder: "Aggiungi una nota o un pensiero...",
        deleteNote: "Elimina nota",
        deleteNoteTitle: "Elimina testo della nota",
        cancel: "Annulla",
        saveNote: "Salva nota",
        clickToEditNote: "Clicca per modificare la nota",
        addNoteTitle: "Aggiungi nota",
        noteBtn: "Nota",
        copyQuoteTitle: "Copia citazione",
        jumpBtn: "Vai",
        jumpBtnTitle: "Vai alla nota nella pagina",
        deleteHighlightTitle: "Elimina evidenziazione",
        clipboardHeader: "Cronologia appunti di sistema",
        syncBtn: "Sincronizza",
        syncTitle: "Sincronizza appunti di sistema",
        deleteClipTitle: "Elimina elemento",
        clipboardEmptyTitle: "Cronologia appunti vuota",
        clipboardEmptyDesc: "Copia testo o URL ovunque per vederli qui",
        clearClipboard: "Svuota cronologia appunti",
        aiStatusRunning: "llama-server attivo (Porta 8080)",
        aiStatusDownloading: "Download modello ({progress}%)...",
        aiStatusStarting: "Avvio motore...",
        aiStatusReady: "Pronto all’avvio",
        aiStatusDownloaded: "Scaricato",
        aiStatusNotDownloaded: "Modello non scaricato",
        cancelDownloadTitle: "Annulla download",
        downloadModelTitle: "Scarica {name} ({size})",
        downloadBtn: "Scarica",
        startingBtn: "Avvio...",
        stopBtn: "Ferma",
        startBtn: "Avvia",
        openWebUiTitle: "Apri interfaccia web llama.cpp",
        aiConsoleSettingsTitle: "Console llama.cpp e impostazioni avanzate",
        downloadingFile: "Download di {filename}",
        downloadingWeights: "Download pesi...",
        noModelTitle: "Nessun modello IA scaricato",
        offlineBadge: "Offline",
        noModelDesc: "Scarica {name} per eseguire IA locale veloce e privata per riassunti, codice e chat.",
        downloadModelSize: "Scarica modello ({size})",
        settingsBtn: "Impostazioni",
        contextBtn: "Contesto",
        searchBtn: "Cerca",
        voiceBtn: "Voce",
        summarizeBtn: "Riassumi",
        summarizePrompt: "Riassumi chiaramente questa pagina web evidenziando i punti chiave e le conclusioni principali.",
        attachTitle: "Allega file o immagine",
        chatPlaceholder: "Chiedi a Gemma 4 locale o rilascia file...",
        voiceInputTitle: "Input vocale (Whisper)",
        downloadsHeader: "Download attivi e recenti",
        itemSingular: "{count} elemento",
        itemPlural: "{count} elementi",
        openDownloadsFolderTitle: "Apri cartella Download",
        clearDownloadsTitle: "Cancella tutti i download",
        downloadedFileFallback: "File scaricato",
        snipBadge: "Ritaglio",
        verified: "Verificato",
        unverified: "Non verificato",
        sha256Prefix: "SHA-256: {hash}",
        saved: "Salvato",
        verifyCopyHashTitle: "Verifica e copia checksum SHA-256",
        copyHashTitle: "SHA-256: {hash} (Clicca per copiare)",
        copyImageTitle: "Copia immagine negli appunti",
        showInFolderTitle: "Mostra nella cartella",
        deleteDownloadTitle: "Elimina file e rimuovi dall’elenco",
        downloadsEmptyTitle: "Nessun download attivo",
        downloadsEmptyDesc: "Schermate e file scaricati appariranno qui",
        pdfPageName: "{name} (Pag. {page})",
        pdfImageSize: "Immagine PDF",
        toasts: {
            jumpingToNote: "Passaggio alla nota nella pagina...",
            exportedMarkdown: "File Markdown esportato!",
            copiedNotesMarkdown: "Note copiate come Markdown!",
            copiedToClipboard: "Copiato negli appunti!",
            clipDeleted: "Elemento eliminato",
            clipboardCleared: "Cronologia appunti svuotata",
            parsingPdf: "Analisi visiva PDF: {name}",
            pdfVramLimit: "Prime 10 pagine di {name} convertite in immagini (limite VRAM).",
            pdfVisualFailed: "Analisi visiva PDF fallita. Passaggio a estrazione testo.",
            openPageFirst: "Apri prima una pagina web per riassumerla",
            transcriptionFailed: "Trascrizione non riuscita",
            micDenied: "Accesso al microfono negato",
            noteRemoved: "Nota rimossa",
            noteUpdated: "Nota aggiornata",
            copiedQuote: "Citazione copiata",
            highlightRemoved: "Evidenziazione rimossa",
            downloadsCleared: "Elenco download svuotato",
            hashCopied: "Checksum SHA-256 copiato negli appunti",
            hashMissing: "Impossibile calcolare l’hash — file mancante",
            screenshotCopied: "Schermata copiata negli appunti",
            downloadDeleted: "Download e file eliminati"
        },
        cancelled: "Annullato",
        failed: "Non riuscito"
    },
    fontManager: {
        title: "Tipografia e font dell’app",
        active: "Attivo:",
        resetTitle: "Ripristina il font predefinito del sistema",
        resetToDefault: "Ripristina predefinito",
        modes: {
            preset: "Font predefiniti",
            google: "Google Fonts",
            system: "Font di sistema",
            file: "Carica font"
        },
        categories: {
            all: "Tutti",
            sans: "Sans",
            mono: "Mono",
            serif: "Serif"
        },
        activeFont: "Font attivo",
        clickToApply: "Clicca per applicare",
        googleTitle: "Usa qualsiasi Google Font",
        googleDesc: "Digita il nome di un font da fonts.google.com e premi Invio per caricarlo subito.",
        googlePlaceholder: "es. Montserrat, Space Grotesk, Syne, Cinzel...",
        applyFont: "Applica",
        popularGoogle: "Google Fonts popolari",
        filterPlaceholder: "Filtra elenco...",
        systemTitle: "Selettore font di sistema",
        systemDesc: "Inserisci un font installato sul tuo sistema operativo (es. Segoe UI Variable, Calibri, Helvetica).",
        systemPlaceholder: "Nome del font di sistema...",
        installed: "Installato",
        notDetected: "Non rilevato",
        notDetectedTitle: "Non rilevato dalle metriche canvas, ma il CSS proverà comunque a renderizzarlo se presente",
        commonOsFonts: "Font comuni del sistema operativo",
        dropTitle: "Clicca o trascina qui il tuo file font",
        dropDesc: "Supporta TrueType (.ttf), OpenType (.otf), WOFF (.woff) e WOFF2 (.woff2) fino a 12 MB.",
        selectFile: "Seleziona file locale",
        activeCustomFace: "Font personalizzato attivo",
        removeFileTitle: "Rimuovi file font caricato",
        fineTuning: "Regolazione fine tipografia",
        letterSpacing: "Spaziatura lettere",
        weightShift: "Spessore del testo",
        fontScale: "Scala font UI",
        reset100Title: "Ripristina al 100%",
        specimen: "Campione tipografico",
        specimen1: "Ma la volpe col suo balzo ha raggiunto il quieto Fido",
        specimen2: "Quel vituperabile xenofobo zelante assaggia il whisky ed esclama: alleluja!",
        activeDefault: "Predefinito di sistema (Segoe UI / Nativo)",
        activeGoogle: "Google Font: {name}",
        activeSystem: "Font di sistema: {name}",
        activeFile: "File personalizzato: {name}",
        customLabel: "Personalizzato",
        installedOsLabel: "Installato su OS",
        uploadedFontLabel: "Font caricato",
        spacing: {
            tight: "Stretto",
            normal: "Normale",
            relaxed: "Arioso",
            wide: "Ampio"
        },
        weight: {
            normal: "Normale",
            medium: "Medio",
            semibold: "Semibold"
        },
        osLabels: {
            "Windows 11": "Windows 11",
            Windows: "Windows",
            macOS: "macOS",
            "macOS / Multi": "macOS / Multi",
            Universal: "Universale",
            "Windows Dev": "Windows Dev",
            "Windows Terminal": "Terminale Windows",
            Casual: "Informale",
            Linux: "Linux",
            GNOME: "GNOME",
            Serif: "Serif"
        },
        presetDefaultName: "Predefinito di sistema",
        presets: {
            default: {
                description: "Tipografia nativa del sistema operativo (Segoe UI / San Francisco).",
                previewText: "Aa Bb Gg 123"
            },
            inter: {
                description: "Sans moderna, pulita e ad alta leggibilità progettata per gli schermi.",
                previewText: "Neo-Grotesque Moderno"
            },
            geist: {
                description: "Carattere per sviluppatori firmato Vercel con precisione geometrica.",
                previewText: "Ingegneria Minimalista"
            },
            outfit: {
                description: "Sans geometrico raffinato con estetica elegante.",
                previewText: "Geometrico di Lusso"
            },
            "plus-jakarta": {
                description: "Carattere contemporaneo fresco e accogliente per app web moderne.",
                previewText: "Contemporaneo Amichevole"
            },
            poppins: {
                description: "Sans geometrico arrotondato dalle curve armoniose e dinamiche.",
                previewText: "Curve Accessibili"
            },
            roboto: {
                description: "Il celebre carattere Google per Android e Material Design.",
                previewText: "Architettura Material"
            },
            manrope: {
                description: "Incrocio tra grottesco moderno e geometrico di ottima leggibilità.",
                previewText: "Precisione Semigeometrica"
            },
            lexend: {
                description: "Progettato scientificamente per ridurre l’affaticamento visivo e leggere più veloce.",
                previewText: "Lettura Senza Sforzo"
            },
            "jetbrains-mono": {
                description: "Font di programmazione ad alto contrasto con occhio medio ampio.",
                previewText: "Estetica da Sviluppatore"
            },
            "fira-code": {
                description: "Font monospazio con legature di programmazione e nitidezza cristallina.",
                previewText: "=> Legature di Codice"
            },
            "playfair-display": {
                description: "Serif editoriale ad alto contrasto ispirato alla stampa classica europea.",
                previewText: "Eleganza Editoriale"
            },
            merriweather: {
                description: "Serif letterario caldo pensato per letture prolungate.",
                previewText: "Classico Letterario"
            }
        },
        errors: {
            invalidFormat: "Formato non valido. Carica file .ttf, .otf, .woff o .woff2.",
            tooLarge: "File troppo grande. Dimensione massima supportata 12 MB.",
            readFailed: "Impossibile leggere il file font. Riprova con un altro."
        },
        toasts: {
            presetSet: "Font dell’app impostato su {name}",
            googleApplied: "Google Font \"{name}\" applicato a QBrowse",
            systemApplied: "Font di sistema \"{name}\" applicato",
            fileLoaded: "File font \"{name}\" caricato con successo"
        }
    },
    aiSettings: {
        title: "Motore IA llama.cpp",
        status: {
            online: "Online (llama-server)",
            starting: "Avvio...",
            updating: "Aggiornamento motore...",
            error: "Errore motore",
            stopped: "Fermato"
        },
        syncTitle: "Verifica e sincronizza il motore nativo llama.cpp (b11796 con supporto Gemma 4)",
        updatingBtn: "Aggiornamento...",
        syncBtn: "Sincronizza (b11796)",
        subtitle: "Motore LLM locale veloce e privato con supporto nativo per Gemma 4, Qwen 3.5 e Bielik 11B GGUF.",
        downloadingModel: "Download modello ({progress}%)",
        connectingCdn: "Connessione al CDN...",
        cancel: "Annulla",
        downloadBtn: "Scarica {name} ({size})",
        startingBtn: "Avvio llama-server...",
        stopBtn: "Ferma llama-server",
        startBtn: "Avvia motore llama-server",
        defaultStartError: "llama-server ha riscontrato un errore durante l’avvio del modello.",
        dismiss: "Chiudi",
        updateEngineBtn: "Aggiorna motore IA",
        genSpeed: "Velocità generazione",
        tokPerSec: "tok/s",
        contextWindow: "Finestra di contesto",
        tokens: "token",
        gpuOffload: "Carico GPU",
        layers: "livelli",
        activeModelTitle: "Modello GGUF attivo",
        loadCustomGguf: "Carica .GGUF personalizzato...",
        loadCustomProjector: "Carica proiettore...",
        customModelPrefix: "Modello perso: {path}",
        customProjectorPrefix: "Proiettore perso: {path}",
        reset: "Ripristina",
        downloadedBadge: "Scaricato",
        downloadingTarget: "Download di {target}",
        visionProjector: "Proiettore Vision...",
        languageModel: "Modello linguistico...",
        weights: "pesi...",
        modelReady: "Modello pronto all’uso",
        downloadModelFile: "Scarica file modello ({size})",
        overridesTitle: "Parametri llama-server",
        autoDetectBtn: "Rileva hardware",
        cpuThreadsLabel: "Thread CPU (-t): {threads}",
        contextSizeLabel: "Dimensione contesto (-c)",
        tokensOption: "{n} token",
        contextBadges: {
            compact: "Compatto",
            default: "Predefinito",
            extended: "Esteso",
            max: "Max"
        },
        gpuLayersLabel: "Livelli GPU (-ngl): {layers}",
        dataProcessingTitle: "Elaborazione dati",
        parsePdfTitle: "Elabora PDF come immagini",
        parsePdfDesc: "Converte le pagine PDF in immagini nella chat invece di estrarre testo semplice. Ideale per la visione di Gemma 4 e Qwen 3.5.",
        consoleTitle: "Console terminale llama-server (Stdout live)",
        copyOutputTitle: "Copia output terminale",
        clearConsoleTitle: "Svuota console",
        consoleEmpty: "[Console llama-server inizializzata. In attesa dell’output del server...]",
        modelWord: "Modello",
        visionWord: "Visione",
        models: {
            "gemma-4-e2b": "Modello Google Gemma 4 E2B Instruct GGUF con supporto completo alla visione multimodale.",
            "gemma-4-e4b": "Modello Google Gemma 4 E4B ad alto ragionamento con visione multimodale completa.",
            "qwen-3.5-4b": "Modello Alibaba Qwen 3.5 4B con visione multimodale, ragionamento, codice e multilinguismo.",
            "bielik-11b-v3.1": "Modello di punta polacco ed europeo 11B di SpeakLeash con grande precisione e ragionamento."
        },
        toasts: {
            customModelLoaded: "Modello personalizzato caricato: {name}",
            demoModelLoaded: "Percorso modello demo caricato!",
            customProjectorLoaded: "Proiettore vision caricato: {name}",
            demoProjectorLoaded: "Percorso proiettore demo caricato!",
            updatingEngine: "Aggiornamento motore nativo llama.cpp...",
            engineUpdated: "Motore llama.cpp aggiornato alla build b11796!",
            engineUpdateFailed: "Aggiornamento motore fallito: {error}",
            unknownError: "Errore sconosciuto",
            logsCopied: "Log di llama-server copiati negli appunti!",
            hardwareDetected: "Hardware rilevato: {threads} thread, {ram} GB RAM",
            hardwareDefault: "Hardware rilevato: applicate ottimizzazioni predefinite",
            resizingContext: "Ridimensionamento finestra contesto a {tokens} token..."
        }
    },
    adblockImport: {
        title: "Importa lista di blocco da GitHub / Web",
        subtitle: "Analizza automaticamente file hosts, liste GitHub raw o regole Adblock.",
        closeTitle: "Chiudi",
        modeUrl: "URL remoto / GitHub",
        modePaste: "Incolla testo semplice",
        urlLabel: "URL della lista (GitHub raw, Gist o file hosts)",
        githubRawBadge: "GitHub Raw",
        githubRawTitle: "Link GitHub rilevato e convertito automaticamente in formato raw",
        fetching: "Recupero...",
        fetchParse: "Recupera e analizza",
        popularLists: "Liste popolari della community",
        pasteLabel: "Incolla file hosts, filtri ABP o elenco domini",
        pastePlaceholder: "# Incolla qualsiasi formato qui sotto:\n0.0.0.0 tracking.evil.com\n127.0.0.1 ads.adserver.org\n||telemetry.network.io^\nanalytics.badsite.com",
        parsing: "Analisi...",
        parseDomains: "Analizza domini",
        back: "Indietro",
        backTitle: "Torna alla sorgente (Esc)",
        readyToImport: "Pronto per l’importazione",
        kbSource: "Origine {kb} KB",
        validDomains: "Domini validi",
        newUnique: "Nuovi unici",
        duplicatesFiltered: "Duplicati filtrati",
        linesAnalyzed: "Righe analizzate",
        extractedSample: "Anteprima domini estratti ({count})",
        searchSamplePlaceholder: "Cerca nell’anteprima...",
        moreDomains: "+ altri {count} domini",
        backToSource: "Torna alla sorgente",
        cancel: "Annulla",
        replaceList: "Sostituisci intera lista",
        replaceListTitle: "Sostituisce la tua lista personalizzata attuale con i domini analizzati",
        importN: "Importa {count} domini",
        importDomains: "Importa domini",
        pastedSourceLabel: "Testo incollato",
        errors: {
            invalidUrl: "Inserisci un URL valido.",
            fetchFailed: "Impossibile recuperare la lista remota",
            noValidFromUrl: "Nessun dominio valido trovato in questa sorgente.",
            downloadError: "Errore durante il download della lista",
            emptyPaste: "Incolla prima dei domini o regole hosts.",
            noValidFromText: "Nessun dominio valido estratto dal testo.",
            parseError: "Errore nell’analisi del testo"
        },
        presets: {
            stevenblack: {
                desc: "Protezione completa curata dalla community contro adware e malware.",
                badge: "Consigliata"
            },
            "oisd-basic": {
                desc: "Lista leggera senza falsi positivi contro il tracciamento web e mobile.",
                badge: "Basso impatto"
            },
            "adguard-trackers": {
                desc: "Lista dedicata al blocco di script analitici e telemetria.",
                badge: "Privacy"
            },
            peterlowe: {
                desc: "Lista standard storica dei server pubblicitari attivi.",
                badge: "Veloce"
            },
            danpollock: {
                desc: "Lista zero-host affidabile contro telemetria, spam e siti nocivi.",
                badge: "Classica"
            }
        }
    },
    studio: {
        title: "Studio Preset",
        subtitle: "Riposiziona visivamente i pannelli, regola le curvature, personalizza i temi e gestisci i preset.",
        tabCanvas: "Tela",
        tabPresets: "Preset",
        closeAria: "Chiudi Studio Preset",
        dockLeftSidebar: "Aggancia barra laterale a sinistra",
        dockRightSidebar: "Aggancia barra laterale a destra",
        dockTopBar: "Aggancia barra di navigazione in alto",
        dockBottomBar: "Aggancia barra di navigazione in basso",
        searchBarPlaceholder: "Cerca sul web o digita un comando...",
        toolhubDockTitle: "Posizione ToolHub: {pos} (Clicca o trascina per cambiare)",
        legendDock: "Barra:",
        legendBarValue: "{pos}",
        legendSidebar: "Laterale:",
        legendToolhub: "ToolHub:",
        legendSummary: "Curvatura: {curvature} · Omnibox: {omnibox} · Schede: {tabs}",
        layoutControls: "Controlli layout",
        resetTitle: "Ripristina la bozza alle impostazioni correnti",
        reset: "Ripristina",
        editingLabel: "Modifica:",
        cancelEditTitle: "Annulla modifica e crea un nuovo preset",
        cancel: "Annulla",
        sidebarMode: "Modalità barra laterale",
        sidebarModes: {
            classic: "Classica",
            floating: "Flottante",
            compact: "Compatta",
            hidden: "Nascosta"
        },
        windowCurvature: "Curvatura finestra",
        curvatures: {
            default: "Predefinita",
            cohesive: "Coesiva",
            square: "Netta"
        },
        omniboxArch: "Architettura Omnibox",
        omniboxStyles: {
            capsule: "Capsula",
            wide: "Ampia",
            minimal: "Minimale"
        },
        tabPresentation: "Stile schede",
        tabStyles: {
            pills: "Pillole",
            compact: "Compatte",
            cards: "Schede"
        },
        windowControlsStyle: "Stile pulsanti finestra",
        controlsStyles: {
            mac: "macOS",
            windows: "Windows",
            minimal: "Minimale"
        },
        windowControlsLayout: "Ordine pulsanti finestra",
        controlsOrders: {
            auto: "Angolo smart",
            "close-first": "Chiudi per primo",
            "minimize-first": "Riduci per primo"
        },
        themeLabel: "Tema",
        themes: {
            dark: "Scuro",
            light: "Chiaro"
        },
        uiScaleLabel: "Scala UI",
        uiScales: {
            comfortable: "Normale",
            compact: "Compatta"
        },
        accentSwatchLabel: "Colore accento",
        openColorPickerTitle: "Apri selettore colore di sistema",
        saveChanges: "Salva modifiche",
        applyLive: "Applica subito",
        saveAsNew: "Salva come nuovo",
        applyToBrowser: "Applica al browser",
        saveAsCustom: "Salva come preset personalizzato",
        searchPresetsPlaceholder: "Cerca preset...",
        filterAll: "Tutti",
        filterBuiltin: "Integrati",
        filterCustom: "Personali ({count})",
        saveActiveSetup: "Salva configurazione attiva",
        activeBadge: "Attivo",
        editingBadge: "(In modifica)",
        reapply: "Riapplica",
        apply: "Applica",
        editInStudio: "Modifica in Studio",
        customize: "Personalizza",
        editPresetTitle: "Modifica preset nello studio",
        customizePresetTitle: "Personalizza layout nello studio",
        duplicateTitle: "Duplica preset",
        deleteTitle: "Elimina preset personalizzato",
        editCustomModalTitle: "Modifica preset personalizzato",
        saveCustomModalTitle: "Salva come preset personalizzato",
        presetNameLabel: "Nome preset",
        presetNamePlaceholder: "es. Flusso Ergonomico, Arc Minimale",
        presetDescLabel: "Sottotitolo / Descrizione",
        presetDescPlaceholder: "Breve descrizione di questa configurazione...",
        presetIconLabel: "Icona preset",
        createPreset: "Crea preset",
        deleteConfirmTitle: "Eliminare il preset?",
        deleteConfirmDescBefore: "Vuoi davvero eliminare ",
        deleteConfirmDescAfter: "? L’operazione non può essere annullata.",
        deletePresetBtn: "Elimina preset",
        posTop: "Alto",
        posBottom: "Basso",
        posLeft: "Sinistra",
        posRight: "Destra",
        moveTo: "Sposta in {pos}",
        draggableNavTitle: "Barra trascinabile: trascina in alto/basso o clicca per scambiare",
        draggableSidebarTitle: "Barra laterale trascinabile: trascina tra sinistra e destra",
        swapTo: "Sposta a {pos}",
        miniTab: "Scheda #{num}",
        miniCardView: "Vista scheda #{num}",
        miniActiveSpaceTab: "Scheda spazio attivo",
        miniSidebarPos: "Laterale ({pos})",
        layoutTagFormat: "{bar} · {sidebar}",
        layoutSummaryFormat: "{tag} · {toolhub}",
        topBarLabel: "Barra in alto",
        bottomBarLabel: "Barra in basso",
        leftSidebarLabel: "Barra a sinistra",
        rightSidebarLabel: "Barra a destra",
        leftToolhubLabel: "ToolHub a sinistra",
        rightToolhubLabel: "ToolHub a destra",
        tabsHighlight: "Schede {style}",
        compactScaleLabel: "Scala compatta",
        comfortableScaleLabel: "Scala comoda",
        defaultCustomName: "Preset personalizzato",
        defaultCustomDesc: "Configurazione personalizzata",
        defaultNewNameFormat: "{bar} {side}",
        defaultNewNameArc: "Arc",
        defaultNewNameFlow: "Flusso",
        defaultNewDescFormat: "Layout personalizzato: {bar}, {sidebar}, schede {tabs}",
        toasts: {
            applied: "Layout applicato al browser!",
            reset: "Bozza ripristinata alla configurazione corrente",
            editingPreset: "Modifica di \"{name}\" nello Studio",
            loadedPreset: "\"{name}\" caricato nella tela",
            switchedNewDraft: "Passato a nuova bozza"
        }
    },
    setup: {
        strictOfflineTitle: "Zero richieste in background (Offline rigoroso)",
        strictOfflineDesc: "Disattiva tutto il traffico di rete opzionale in background (controllo aggiornamenti, aggiornamento filtri, suggerimenti live, favicon remote e sincronizzazione cloud).",
        headerTitle: "Configurazione QBrowse",
        headerSubtitle: "Assistente alla personalizzazione",
        steps: {
            language: {
                label: "Lingua",
                desc: "Lingua UI"
            },
            presets: {
                label: "Stile e preset",
                desc: "Aspetto"
            },
            import: {
                label: "Importa",
                desc: "Segnalibri e chiavi"
            },
            privacy: {
                label: "Privacy",
                desc: "Scudi e Tor"
            },
            default: {
                label: "Predefinito",
                desc: "Integrazione OS"
            },
            sync: {
                label: "Account e Sync",
                desc: "Cloud o Locale"
            }
        },
        chooseSetupTitle: "Scegli la tua configurazione",
        chooseSetupDesc: "Seleziona un layout iniziale su misura. Potrai modificare ogni pannello in qualsiasi momento.",
        customLayoutCta: "Vuoi un layout su misura? Studio →",
        themeLabel: "Tema",
        dark: "Scuro",
        light: "Chiaro",
        accentLabel: "Accento",
        step2Badge: "Passo 2 di 5",
        step2Title: "Porta i tuoi dati e la cassaforte",
        step2Desc: "Importa i segnalibri e trasferisci le password da Bitwarden, Proton Pass, Chrome o Firefox.",
        tabBookmarks: "Segnalibri",
        tabVault: "Cassaforte Password",
        bookmarksFound: "{count} segnalibri trovati",
        notDetected: "Non rilevato su questo dispositivo",
        imported: "Importato",
        importing: "Importazione...",
        importBookmarks: "Importa segnalibri",
        scanningBrowsers: "Ricerca dei browser installati...",
        htmlImported: "File HTML importato ({count} elementi)",
        uploadHtml: "Carica file HTML segnalibri (.html)",
        vaultComplete: "Migrazione completata",
        vaultImportedSummary: "{count} elementi importati da {source} in QVault!",
        importAnother: "Importa un altro",
        exportCsvJson: "Esporta come .CSV o .JSON",
        parsingVault: "Analisi del file...",
        uploadVault: "Carica esportazione (.csv o .json)",
        compatibleManagers: "Compatibile con Bitwarden, Proton Pass, Google Chrome, Edge, Brave e 1Password",
        step3Badge: "Passo 3 di 5",
        step3Title: "Corazza la tua privacy",
        step3Desc: "QBrowse blocca gli script traccianti, elimina la pubblicità invasiva e instrada il traffico su Tor.",
        privacyOptimizedBadge: "Preset: Privacy ottimizzata",
        adblockTitle: "Scudo nativo Ghostery",
        adblockDesc: "Blocca tracker, telemetria e annunci invasivi senza rallentare le pagine.",
        torTitle: "Spazio Tor Onion Routing",
        torDesc: "Abilita la navigazione .onion e circuiti cifrati multi-nodo in ogni momento.",
        ready: "Pronto",
        step4Badge: "Passo 4 di 5",
        step4Title: "Imposta come browser predefinito",
        step4Desc: "Apri i link esterni in spazi isolati mantenendo separati lavoro e vita privata.",
        isDefaultTitle: "QBrowse è il tuo browser predefinito!",
        makeDefaultTitle: "Rendi QBrowse il tuo accesso principale al web",
        isDefaultDesc: "Tutti i link e file HTML si apriranno automaticamente in QBrowse.",
        makeDefaultDesc: "Gestisce collegamenti http://, https:// e file HTML con integrazione profonda nel sistema.",
        osLabels: {
            darwin: "Impostazioni di Sistema",
            linux: "Applicazioni predefinite",
            win32: "App predefinite di Windows"
        },
        defaultHint: "{label} aperto — seleziona QBrowse nella finestra di sistema per confermare.",
        openOsSettings: "Apri {label}",
        defaultSet: "Impostato come predefinito",
        openingSettings: "Apertura impostazioni...",
        setAsDefault: "Imposta come predefinito",
        step5Badge: "Passo 5 di 5 • Profilo e Cloud Sync",
        step5Title: "Scegli come navigare",
        step5Desc: "Piena sovranità: naviga al 100% offline con crittografia hardware locale oppure crea un account Cloud Sync gratuito.",
        zeroTelemetry: "Zero telemetria",
        localProfile: "Profilo locale",
        localProfileDesc: "100% offline. Password, cronologia e schede restano cifrate localmente con chiavi hardware. Nessun account.",
        e2eEncrypted: "Cifratura E2E",
        cloudSync: "QBrowse Cloud Sync",
        cloudSyncDesc: "Sincronizza cassaforte, spazi, schede fissate e segnalibri tra i tuoi computer via Firebase.",
        localReadyTitle: "Il profilo locale è pronto",
        localReadyDesc: "Segnalibri, credenziali e spazi rimarranno solo su questo computer senza telemetria. Potrai attivare Cloud Sync in seguito dalle Impostazioni.",
        takeTour: "Fai il tour interattivo",
        startDirectly: "Inizia subito a navigare",
        activeSync: "Sync attiva",
        cloudLinked: "Archivio cloud cifrato end-to-end collegato",
        signOut: "Disconnetti",
        activeSyncDesc: "I tuoi segnalibri, schede e cassaforte cifrata sono sincronizzati in tempo reale tra tutti i dispositivi autorizzati.",
        signIn: "Accedi",
        existingAccount: "(Account esistente)",
        register: "Registrati",
        newAccount: "(Nuovo account)",
        registerSubtitle: "Crea un nuovo account QBrowse per sincronizzare i dati.",
        signInSubtitle: "Accedi per sincronizzare segnalibri, spazi e cassaforte.",
        switchToSignIn: "Passa ad Accedi",
        emailLabel: "Indirizzo email",
        emailPlaceholder: "nome@esempio.it",
        createPassLabel: "Crea password (min. 6 caratteri)",
        accountPassLabel: "Password account",
        min6Chars: "Almeno 6 caratteri",
        confirmPassLabel: "Conferma password",
        passwordsMatch: "Le password coincidono",
        passwordsMismatch: "Le password non coincidono",
        useAccountAsMaster: "Usa la password account come chiave principale",
        masterDerivedDesc: "Deriva chiavi AES-GCM a 256 bit direttamente dalla tua password di accesso.",
        masterSeparateDesc: "Utilizzo di una passphrase di crittografia separata.",
        customMasterLabel: "Passphrase principale personalizzata",
        customMasterPlaceholder: "Inserisci una passphrase unica per la cassaforte...",
        creatingAccount: "Creazione account cifrato...",
        signingInSyncing: "Accesso e sincronizzazione...",
        createAccountBtn: "Crea account e attiva Cloud Sync",
        signInBtn: "Accedi e attiva Cloud Sync",
        alreadyRegistered: "Già registrato su QBrowse?",
        signInHere: "Accedi qui",
        newToSync: "Nuovo su QBrowse Cloud Sync?",
        createFreeAccount: "Crea un account gratuito (Registrati)",
        skipSyncLocal: "Salta Cloud Sync e continua con Profilo locale",
        skipSyncComplete: "Salta Sync e completa",
        vaultModalTitle: "Proteggi la cassaforte importata",
        vaultModalDesc: "Inserisci o crea una password principale per cifrare le tue credenziali.",
        masterPassLabel: "Password principale",
        masterPassPlaceholder: "Inserisci password principale...",
        confirmMasterLabel: "Conferma password principale",
        confirmMasterPlaceholder: "Conferma password...",
        cancel: "Annulla",
        encryptImport: "Cifra e importa",
        bookmarkFallback: "Segnalibro",
        htmlFileFallback: "file HTML",
        toasts: {
            enterEmail: "Inserisci un indirizzo email.",
            validEmail: "Inserisci un indirizzo email valido (es. nome@dominio.it).",
            passMin6: "La password deve avere almeno 6 caratteri.",
            confirmPassReq: "Conferma la tua password.",
            passMismatch: "Le password non coincidono.",
            signedIn: "Accesso effettuato a QBrowse Cloud Sync!",
            registered: "Account registrato e Cloud Sync attivo!",
            bookmarksImported: "{count} segnalibri importati con successo!",
            importFailed: "Importazione non riuscita.",
            couldNotImportBookmarks: "Impossibile importare i segnalibri.",
            htmlImported: "{count} segnalibri importati da {filename}!",
            htmlImportFailed: "Importazione segnalibri HTML non riuscita.",
            noCredentials: "Nessuna credenziale trovata nel file",
            passwordsImported: "{count} password importate da {source}!",
            vaultImportFailed: "Errore importazione: {error}",
            passMin4: "La password deve avere almeno 4 caratteri",
            vaultPassMismatch: "Le password non coincidono",
            incorrectMasterPass: "Password principale errata per la cassaforte esistente",
            vaultImportError: "Errore di importazione: {error}",
            nowDefault: "QBrowse è ora il tuo browser predefinito!",
            openingWinDefault: "Apertura App predefinite di Windows. Seleziona QBrowse.",
            openingOsDefault: "Apertura {label}. Scegli QBrowse come browser predefinito.",
            couldNotOpenDefault: "Impossibile aprire le impostazioni del browser predefinito."
        }
    },
    flags: {
        title: "Esperimenti",
        subtitle: "Regola funzioni sperimentali, pipeline grafiche hardware, cifrari post-quantistici e isolamento flussi Tor.",
        resetAll: "Ripristina tutto",
        warningTitle: "Attenzione: funzioni sperimentali!",
        warningBody: "Attivare questi flag modifica l’esecuzione Chromium V8, il compositing hardware o i parametri TLS. È necessario riavviare.",
        searchPlaceholder: "Cerca flag (es. GPU, Kyber, QUIC, DoH, bfcache)...",
        tabAvailable: "Disponibili ({count})",
        tabUnavailable: "Non disponibili ({count})",
        categories: {
            All: "Tutte",
            Performance: "Prestazioni",
            "Hardware & Graphics": "Hardware e Grafica",
            "Web Standards & Engine": "Standard Web e Motore",
            Security: "Sicurezza",
            Networking: "Rete",
            "Media & UI": "Media e Interfaccia",
            "AI & Tools": "IA e Strumenti",
            Experimental: "Sperimentali"
        },
        statuses: {
            Stable: "Stabile",
            Beta: "Beta",
            Experimental: "Sperimentale"
        },
        options: {
            default: "Predefinito",
            enabled: "Attivato",
            disabled: "Disattivato"
        },
        emptyMatch: "Nessun flag disponibile corrisponde a \"{search}\"",
        reasonPrefix: "Motivo: {reason}",
        unavailableBadge: "Non disponibile",
        relaunchMsg: "Le modifiche avranno effetto al prossimo riavvio di QBrowse.",
        relaunchBtn: "Riavvia",
        toasts: {
            reset: "Tutti i flag sperimentali sono stati ripristinati",
            relaunching: "Riavvio di QBrowse con i flag aggiornati..."
        },
        items: {
            "prefer-high-performance-gpu": {
                name: "Preferisci GPU ad alte prestazioni",
                description: "Indirizza il rendering WebGL, Canvas e 3D alla GPU dedicata su sistemi multi-GPU. Disattivato in modalità Eco."
            },
            "unlock-frame-rate": {
                name: "Frequenza fotogrammi sbloccata (Benchmark)",
                description: "Disattiva V-Sync per benchmark FPS sintetici. Può causare tearing e consumi maggiori."
            },
            "ignore-gpu-blocklist": {
                name: "Ignora lista di blocco GPU",
                description: "Ignora gli elenchi di rendering software di Chromium e abilita accelerazione hardware."
            },
            "experimental-web-platform": {
                name: "Funzionalità sperimentali piattaforma Web",
                description: "Abilita API web sperimentali in fase di sviluppo su Chromium."
            },
            "gpu-rasterization": {
                name: "Rasterizzazione GPU e accelerazione compositore",
                description: "Accelera rasterizzazione e compositing tramite pipeline GPU dedicate invece della CPU."
            },
            "smooth-scrolling": {
                name: "Motore di scorrimento fluido",
                description: "Attiva animazioni fisiche fluide durante lo scorrimento con rotella, touchpad o frecce."
            },
            "zero-copy-rasterizer": {
                name: "Rasterizzatore GPU Zero-Copy (GpuMemoryBuffer)",
                description: "Scrive direttamente nelle texture GPU condivise senza copie intermedie in CPU."
            },
            "enable-vulkan": {
                name: "Backend grafico e compositore Vulkan",
                description: "Utilizza l’API Vulkan per compositing e rendering sulle GPU supportate."
            },
            "back-forward-cache": {
                name: "Cache Avanti/Indietro (bfcache)",
                description: "Mantiene istantanee complete in RAM delle pagine recenti per navigazione istantanea."
            },
            "canvas-oop-rasterization": {
                name: "Rasterizzazione 2D Canvas fuori processo",
                description: "Esegue le operazioni HTML5 2D Canvas nel processo GPU dedicato."
            },
            "enable-drdc": {
                name: "Rilevamento dinamico alto refresh rate (120/144/240 Hz)",
                description: "Sincronizza frame pacing e V-Sync con display ProMotion e monitor gaming."
            },
            "auto-suspend-tabs": {
                name: "Sospensione automatica schede (Risparmio RAM)",
                description: "Scarica le schede inattive dopo 15 minuti per risparmiare RAM e batteria."
            },
            "parallel-download-engine": {
                name: "Download paralleli multi-thread",
                description: "Suddivide file grandi in più richieste HTTP simultanee per massimizzare la banda."
            },
            "lazy-image-loading": {
                name: "Caricamento differito immagini e frame",
                description: "Rimanda il caricamento di immagini e iframe fuori schermo finché non vengono raggiunti."
            },
            "enable-tls13-kyber": {
                name: "Crittografia post-quantistica per TLS (Kyber768 / ML-KEM)",
                description: "Attiva scambio chiavi ibrido resistente al calcolo quantistico in TLS 1.3."
            },
            "enable-encrypted-client-hello": {
                name: "Encrypted Client Hello (ECH / SNI cifrato)",
                description: "Cifra il nome server (SNI) nell’handshake TLS proteggendo i domini da ISP e firewall."
            },
            "strict-origin-isolation": {
                name: "Isolamento rigoroso Site-per-Process",
                description: "Assegna processi OS dedicati con memoria isolata per ogni origine contro Spectre/Meltdown."
            },
            "webrtc-ip-protection": {
                name: "Protezione IP locale e perdite STUN WebRTC",
                description: "Limita i candidati ICE WebRTC per nascondere il tuo vero IP locale o pubblico."
            },
            "enable-dns-over-https": {
                name: "DNS-over-HTTPS rigoroso (Cloudflare/Quad9)",
                description: "Cifra tutte le query DNS su HTTPS (porta 443) contro intercettazioni e avvelenamento."
            },
            "disable-hyperlink-auditing": {
                name: "Disattiva controllo collegamenti (<a ping>)",
                description: "Blocca l’invio silenzioso di richieste POST di tracciamento al clic sui link."
            },
            "enable-fingerprint-randomization": {
                name: "Rumore anti-fingerprinting Canvas e WebAudio",
                description: "Aggiunge rumore pseudocasuale per impedire l’identificazione univoca del dispositivo."
            },
            "enable-font-enumeration-shield": {
                name: "Scudo enumerazione font locali",
                description: "Impedisce ai siti di leggere i font installati per creare impronte persistenti."
            },
            "aggressive-tracker-blocker": {
                name: "Rimozione aggressiva parametri URL traccianti",
                description: "Rimuove utm_source, gclid, fbclid e blocca i pixel di tracciamento noti."
            },
            "enable-subresource-filter": {
                name: "Filtro sottorisorse per overlay ingannevoli",
                description: "Rileva e blocca clickjacking, link invisibili e falsi avvisi di download."
            },
            "enable-quic": {
                name: "Protocollo sperimentale QUIC e HTTP/3",
                description: "Abilita il trasporto HTTP/3 su UDP per handshake zero-RTT e flussi multipli."
            },
            "tor-stream-isolation": {
                name: "Isolamento circuito Tor per dominio (IsolateDestAddr)",
                description: "Forza un circuito d’uscita distinto per ogni dominio in Tor contro correlazioni."
            },
            "dns-prefetching": {
                name: "Pre-risoluzione DNS predittiva",
                description: "Risolve in anticipo gli IP dei link visibili riducendo la latenza al clic."
            },
            "heavy-ad-intervention": {
                name: "Intervento contro annunci pesanti",
                description: "Scarica gli iframe pubblicitari che consumano più di 4 MB o 60s di CPU."
            },
            "cross-origin-isolation": {
                name: "Politica COOP e SharedArrayBuffer",
                description: "Abilita operazioni WebAssembly a memoria condivisa ad alta precisione."
            },
            "document-pip-api": {
                name: "API Document Picture-in-Picture",
                description: "Consente finestre flottanti con HTML arbitrario, video e controlli personalizzati."
            },
            "force-dark-contents": {
                name: "Modalità scura automatica per contenuti web",
                description: "Genera automaticamente un tema scuro preservando la luminanza dei siti chiari."
            },
            "overlay-scrollbars": {
                name: "Barre di scorrimento flottanti minimaliste",
                description: "Sostituisce le barre di sistema con indicatori sottili che spariscono automaticamente."
            },
            "enable-webgpu": {
                name: "API grafica e calcolo WebGPU di nuova generazione",
                description: "Accesso diretto a bassa latenza alla GPU per reti neurali, 3D e shader."
            },
            "tab-audio-muting": {
                name: "Disattivazione audio scheda con un clic",
                description: "Aggiunge un’icona altoparlante interattiva sulle schede per silenziarle all’istante."
            },
            "webrtc-pipewire": {
                name: "Cattura desktop PipeWire (Linux Wayland)",
                description: "Abilita la condivisione schermo tramite portale PipeWire su GNOME e KDE."
            },
            "hdr-compositing": {
                name: "Compositing colore HDR",
                description: "Abilita gamma estesa a 10 bit (Rec.2020 / DCI-P3) su schermi compatibili."
            },
            "local-ai-assistant": {
                name: "Accelerazione VRAM per LLM GGUF locali (llama.cpp)",
                description: "Carica i pesi Gemma e Llama 3 in VRAM per riassunti e query private veloci."
            },
            "experimental-split-screen-gestures": {
                name: "Gesti cinetici schermo diviso",
                description: "Trascina le schede ai bordi per creare subito una doppia vista."
            },
            "enable-reader-mode": {
                name: "Modalità lettura senza distrazioni",
                description: "Estrae il testo degli articoli in un layout leggibile senza annunci o barre."
            },
            "auto-password-generation": {
                name: "Generazione crittografica di password forti",
                description: "Propone password sicure a 128 bit protette da QVault nei moduli di registrazione."
            },
            "tab-groups-auto-clustering": {
                name: "Raggruppamento intelligente schede per dominio",
                description: "Suggerisce di raggruppare le schede aperte per dominio e spazio di lavoro."
            },
            "touch-ui-layout": {
                name: "Modalità UI touch per tablet",
                description: "Aumenta altezza schede e margini touch. Disattivata su desktop.",
                reason: "Richiede il rilevamento hardware di uno schermo touch."
            },
            "eye-tracking-gaze-scroll": {
                name: "Navigazione tramite tracciamento oculare",
                description: "Scorre la pagina seguendo lo sguardo. Richiede sensori IR dedicati.",
                reason: "Nessun sensore di tracciamento oculare compatibile rilevato."
            },
            "cellular-data-saver": {
                name: "Risparmio dati su rete cellulare",
                description: "Comprime le immagini tramite proxy remoti. Disattivato per privacy.",
                reason: "Disattivato per proteggere la privacy end-to-end di Tor e HTTPS."
            }
        }
    }
};

const uk = {
    common: {
        incognito: "Інкогніто",
        selectOption: "Оберіть опцію...",
        colors: {
            accent: "Акцент",
            yellow: "Жовтий",
            green: "Зелений",
            blue: "Синій",
            pink: "Рожевий"
        }
    },
    wallpaperPreview: {
        alt: "Попередній перегляд шпалер",
        badge: "Перегляд"
    },
    presets: {
        names: {
            balanced: "Збалансований",
            developer: "Розробник",
            classic_reverse: "Сучасний Arc",
            bottom_bar: "Ергономічний потік",
            minimalist: "Мінімальний фокус",
            privacy: "Вартовий приватності"
        },
        taglines: {
            balanced: "Подвійні простори Особистий і Робочий із пошуком Google.",
            developer: "Ізольовані простори з інтеграцією GitHub Live PR.",
            classic_reverse: "Дерево вкладок праворуч і чисте полотно для читання.",
            bottom_bar: "Нижній адресний рядок для зручної навігації однією рукою.",
            minimalist: "Один простір із компактним інтерфейсом без зайвого.",
            privacy: "Суворий захист від трекерів із пошуком DuckDuckGo."
        },
        descriptions: {
            balanced: "Подвійні простори (Особистий і Робочий), стандартна приватність і пошук Google.",
            developer: "Ізоляція кількох просторів з відстеженням GitHub Live PR та інструментами розробника.",
            classic_reverse: "Правобічне дерево навігації, дзеркальна панель і сфокусований потік вкладок.",
            bottom_bar: "Навігація знизу для ергономічного перегляду однією рукою.",
            minimalist: "Один простір, права бічна панель, компактний вигляд і максимум фокусу.",
            privacy: "Суворий захист від трекерів, дзеркальні елементи, DuckDuckGo та миттєвий Tor."
        },
        customTaglineFallback: "Власна конфігурація просторів і макета.",
        accents: {
            amberGold: "Бурштинове золото",
            ocean: "Океан",
            skyBlue: "Небесно-блакитний",
            cyberEmerald: "Кіберсмарагд",
            electricBlue: "Електрик",
            royalViolet: "Королівський фіолет",
            roseGold: "Рожеве золото",
            sunsetOrange: "Західний помаранч",
            cyberCyan: "Кіберціан",
            slateGray: "Сланцево-сірий"
        }
    },
    addPin: {
        title: "Закріпити застосунок на панелі",
        subtitle: "Додайте швидкий ярлик для вебзастосунку чи сайту",
        defaultAppName: "Назва застосунку",
        appNameLabel: "Назва / заголовок",
        appNamePlaceholder: "напр., GitHub, Gemini...",
        urlLabel: "URL / Домен *",
        urlPlaceholder: "напр., github.com або https://gemini.google.com",
        quickPresets: "Швидкі шаблони",
        cancel: "Скасувати",
        pinApp: "Закріпити"
    },
    passkey: {
        biometrics: {
            darwin: "Touch ID",
            linux: "Системна біометрія",
            win32: "Windows Hello"
        },
        hints: {
            darwin: "Торкніться сенсора Touch ID або введіть пароль macOS",
            linux: "Торкніться сканера відбитків або введіть системний пароль",
            win32: "Торкніться сканера відбитків або введіть PIN-код Windows"
        },
        cancelDenyTitle: "Скасувати та відхилити",
        verifiedTitle: "Особу підтверджено!",
        scanningTitle: "Сканування {biometric}...",
        autofillTitle: "Автозаповнення збереженого пароля",
        passkeyTitle: "Автентифікація ключем доступу",
        verifiedAutofillDesc: "Сховище розблоковано, дані підставлено",
        verifiedPasskeyDesc: "Ключ доступу перевірено та підписано успішно",
        requireAutofillDesc: "Потрібне підтвердження для розблокування та автозаповнення",
        requirePasskeyDesc: "Потрібне підтвердження для входу за ключем доступу",
        passwordBadge: "Пароль",
        passkeyBadge: "Ключ доступу",
        accountLabel: "Акаунт:",
        savedLogin: "Збережений логін",
        passkeyUser: "Користувач ключа",
        verifyingWith: "Перевірка через {biometric}...",
        verifiedBtn: "Підтверджено!",
        verifyWith: "Підтвердити через {biometric}",
        orPassPin: "Або через майстер-пароль / PIN",
        orPass: "Або через майстер-пароль",
        placeholderPin: "Введіть майстер-пароль або 4–8-значний PIN",
        placeholderPass: "Введіть майстер-пароль QVault",
        checking: "Перевірка облікових даних...",
        verifyAuth: "Перевірити та увійти",
        cancelDenyBtn: "Скасувати та відхилити запит",
        websiteFallback: "Вебсайт",
        theWebsiteFallback: "цього сайту",
        toastAutofill: "Сховище розблоковано, дані для {domain} підставлено!",
        toastPasskey: "Ключ доступу для {domain} підтверджено!",
        promptAutofill: "Підтвердіть особу для автозаповнення на {domain}",
        promptPasskey: "Увійдіть на {domain} за допомогою ключа доступу QVault",
        biometricError: "Помилка біометрії: {error}",
        vaultLockedOut: "Сховище заблоковано через невдалі спроби. Повторіть через {seconds} с.",
        incorrectCreds: "Невірний майстер-пароль або швидкий PIN. Спробуйте ще раз.",
        verificationFailed: "Помилка перевірки: {error}",
        passkeyCreateTitle: "Створити ключ доступу QVault",
        verifiedPasskeyCreateDesc: "Особу підтверджено — збереження ключа до QVault",
        requirePasskeyCreateDesc: "Потрібна перевірка для створення та збереження цього ключа доступу",
        useHardwareKeyBtn: "Використати апаратний / системний ключ",
        useHardwareKeyHint: {
            darwin: "YubiKey · FIDO2 · Touch ID · QR телефону",
            linux: "YubiKey · FIDO2 · USB / NFC / BLE · QR телефону",
            win32: "YubiKey · FIDO2 · Windows Hello · QR телефону"
        },
        toastHardwareHandoff: "Перемикання на апаратний / системний ключ безпеки для {domain}...",
        toastPasskeyCreated: "Ключ доступу підтверджено та збережено для {domain}!",
        promptPasskeyCreate: "Створити та зберегти ключ доступу QVault для {domain}"
    },
    history: {
        title: "Архів",
        entrySingular: "Збережено {count} запис",
        entryPlural: "Збережено записів: {count}",
        searchPlaceholder: "Пошук в архіві...",
        clearAllTitle: "Очистити всю історію перегляду",
        clear: "Очистити",
        closeTitle: "Закрити (Esc)",
        segments: {
            all: "Усе",
            today: "Сьогодні",
            yesterday: "Учора",
            week: "Останні 7 днів",
            older: "Раніше"
        },
        emptySearch: "Немає результатів для «{query}»",
        emptyTitle: "Архів порожній",
        emptySearchDesc: "Перевірте правопис або оберіть інший фільтр.",
        emptyDesc: "Відвідані сторінки зберігатимуться тут для швидкого доступу.",
        itemSingular: "{count} елемент",
        itemPlural: "Елементів: {count}",
        copyLinkTitle: "Копіювати посилання",
        openNewTabTitle: "Відкрити в новій вкладці",
        removeTitle: "Видалити з архіву",
        toastCleared: "Архів очищено",
        toastCopied: "Посилання скопійовано",
        toastOpenedBg: "Відкрито у фоновій вкладці",
        loadMore: "Завантажити ще",
    },
    cookies: {
        title: "Оглядач файлів cookie та сховища сайтів",
        subtitle: "Перегляд, пошук і видалення cookie та локальних даних сайтів",
        filterDomain: "Фільтр за доменом",
        refreshTitle: "Оновити список",
        allSites: "Усі сайти",
        clearDomain: "Очистити {domain}",
        clearAllData: "Очистити всі дані перегляду",
        searchPlaceholder: "Пошук cookie за назвою, доменом чи значенням...",
        emptyTitle: "Cookie не знайдено",
        emptyDesc: "Очистіть пошук або оберіть інший домен",
        secure: "Secure",
        httpOnly: "HttpOnly",
        path: "Шлях: {path}",
        expires: "Термін дії: {date}",
        deleteTitle: "Видалити cookie",
        toastDeleted: "Cookie видалено: {name}",
        toastClearedSite: "Видалено cookie ({count}) для {domain}",
        toastClearedAll: "Дані перегляду та cookie очищено"
    },
    resources: {
        title: "Диспетчер завдань",
        cpu: "ЦП",
        ram: "ОЗП",
        asleepCount: "Сплячих: {count}",
        sleepInactive: "Приспати неактивні",
        sleepInactiveTitle: "Приспати неактивні фонові вкладки для звільнення пам’яті",
        wakeAll: "Розбудити всі",
        wakeAllTitle: "Розбудити всі приспані вкладки",
        purgeCacheTitle: "Очистити кеш пам’яті браузера",
        autoRefreshActiveTitle: "Автооновлення активне (кожні 2 с)",
        autoRefreshPausedTitle: "Автооновлення призупинено",
        autoRefresh2s: "2с",
        paused: "Пауза",
        refreshTitle: "Оновити метрики процесів",
        closeTitle: "Закрити (ESC)",
        filters: {
            all: "Усі",
            tabs: "Вкладки",
            processes: "Процеси",
            sleeping: "Сплячі"
        },
        searchPlaceholder: "Фільтр за назвою, PID...",
        colTask: "Завдання / Процес",
        colSpace: "Простір / Тип",
        colStatus: "Статус",
        colCpu: "ЦП",
        colMemory: "Пам’ять",
        colAction: "Дія",
        emptyMatch: "Немає завдань для «{query}»",
        blankTab: "Порожня вкладка",
        newTabDash: "Панель нової вкладки Zen",
        pidSubtitle: "PID {pid} · {type}",
        active: "Активна",
        spaceTab: "Вкладка {space}",
        mainCore: "Головне ядро",
        sleep: "Сон",
        live: "Активно",
        memSaved: "(Збережено)",
        wakeTabTitle: "Розбудити вкладку",
        activeTabCannotSleep: "Активну вкладку не можна приспати",
        sleepTabTitle: "Приспати вкладку",
        switchTabTitle: "Перейти до вкладки",
        closeTabTitle: "Закрити вкладку",
        core: "Ядро",
        endProcessTitle: "Завершити процес PID {pid}",
        itemsOf: "{shown} з {total} елементів",
        pressEscPrefix: "Натисніть",
        pressEscSuffix: "щоб закрити",
        procMain: "Головний процес QBrowse",
        procGpu: "Процес GPU",
        procRenderer: "Рендерер Webview",
        procUtility: "Службовий сервіс (аудіо/сховище)",
        procZygote: "Попередній завантажувач пісочниці",
        procPepper: "Хост плагінів",
        procChild: "Процес {type}",
        procChildDefault: "Дочірній",
        toastHibernatedSingular: "Приспано {count} неактивну вкладку (звільнено ~{mb} МБ ОЗП)",
        toastHibernatedPlural: "Приспано неактивних вкладок: {count} (звільнено ~{mb} МБ ОЗП)",
        toastWokeSingular: "Відновлено {count} сплячу вкладку",
        toastWokePlural: "Відновлено сплячих вкладок: {count}",
        toastCachePurged: "Кеш браузера очищено, пам’ять стиснуто",
        toastKillUnavailable: "Неможливо завершити процес: API недоступний",
        toastKilled: "Процес {pid} завершено",
        toastKillFailed: "Не вдалося завершити процес {pid}",
        toastKillError: "Помилка завершення процесу {pid}"
    },
    docViewer: {
        fallbackName: "Локальний документ",
        fallbackFile: "Файл",
        preview: "Перегляд",
        raw: "Сирий код",
        zoomOut: "Зменшити",
        zoomIn: "Збільшити",
        resetZoom: "Скинути масштаб",
        copyTitle: "Копіювати вміст файлу",
        copied: "Скопійовано",
        copy: "Копіювати",
        revealTitle: "Показати в системній папці",
        loading: "Завантаження документа...",
        errorTitle: "Не вдалося показати файл",
        readError: "Не вдалося прочитати файл",
        toastCopied: "Вміст скопійовано до буфера обміну",
        toastRevealed: "Файл показано в системній папці"
    },
    pdfViewer: {
        toggleThumbnails: "Показати/сховати мініатюри сторінок",
        fallbackName: "Документ PDF",
        pageSingular: "{count} сторінка",
        pagePlural: "Сторінок: {count}",
        prevPage: "Попередня сторінка",
        nextPage: "Наступна сторінка",
        zoomOut: "Зменшити",
        zoomIn: "Збільшити",
        fitWidth: "За шириною",
        rotate: "Повернути на 90° за годинниковою стрілкою",
        normalMode: "Звичайний режим",
        darkInvertMode: "Темна інверсія для читання",
        summarize: "Підсумувати",
        revealTitle: "Відкрити в системному файловому менеджері",
        pagesHeader: "Сторінки",
        pageNum: "Сторінка {num}",
        loading: "Рендеринг PDF через PDF.js...",
        errorTitle: "Не вдалося відкрити документ",
        openError: "Не вдалося відкрити PDF-документ",
        extractingToast: "Витягнення тексту документа для Qu-AI...",
        openedAiToast: "Відкрито в панелі Qu-AI з текстом документа!",
        extractErrorToast: "Не вдалося витягти текст: {error}",
        revealedToast: "Файл показано в системній папці",
        fallbackDocName: "документ",
        pageMarker: "--- Сторінка {num} ---",
        summaryPrompt: "Надай лаконічний, структурований підсумок і ключові тези цього PDF-документа ({fileName}):"
    },
    localDir: {
        parentFolderTitle: "Перейти до батьківської папки",
        reloadTitle: "Оновити папку",
        openInFileManager: "Відкрити у файловому менеджері",
        filterPlaceholder: "Фільтрувати файли в цій папці...",
        sortName: "Назва",
        sortSize: "Розмір",
        sortDate: "Дата",
        gridViewTitle: "Сітка",
        listViewTitle: "Список",
        scanning: "Сканування вмісту папки...",
        errorTitle: "Не вдалося відкрити папку",
        goParent: "До батьківського каталогу",
        emptySearch: "Жоден файл не відповідає запиту",
        emptySearchHint: "Спробуйте очистити фільтр пошуку",
        folderType: "Папка",
        revealTitle: "Показати у файловому менеджері",
        colName: "Назва",
        colModified: "Змінено",
        colSize: "Розмір",
        itemSingular: "{count} елемент",
        itemPlural: "Елементів: {count}",
        filtered: "(відфільтровано)",
        suiteName: "Файловий модуль QBrowse",
        apiUnavailable: "API каталогів Electron недоступний",
        openFailed: "Не вдалося відкрити каталог",
        toastOpened: "Відкрито в системному файловому менеджері",
        toastRevealed: "Показано: {name}"
    },
    tour: {
        welcomeTitle: "Ласкаво просимо до QBrowse",
        welcomeSubtitle: "Оберіть формат ознайомлення з браузером:",
        overviewBadge: "Огляд",
        quickTitle: "Швидкий огляд",
        quickDesc: "Коротка візуальна екскурсія інтерфейсом, просторами та навігацією з чіткими поясненнями.",
        startQuick: "Почати швидкий тур",
        interactiveBadge: "Інтерактив",
        interactiveTitle: "Інтерактивний майстер-клас",
        interactiveDesc: "Реальні керовані завдання в живому інтерфейсі браузера: натискайте кнопки, тестуйте Tor і опануйте клавіші.",
        startInteractive: "Почати інтерактивний тур",
        skipWelcome: "Пропустити тур і почати перегляд (Esc)",
        stepCounter: "Крок {current} з {total}",
        closeTitle: "Закрити тур (Esc)",
        skipTour: "Пропустити тур",
        back: "Назад",
        finishTour: "Завершити тур",
        nextStep: "Далі",
        exitToast: "Тур закрито. Натисніть Ctrl+K у будь-який момент, щоб дослідити QBrowse!",
        topBarShortcut: "Верхня панель",
        steps: {
            spaces: {
                title: "Ізоляція мультипросторів",
                badge: "Простори",
                description: "Тримайте робочі процеси окремо. Кожен простір (Особистий, Робочий, Привид, Tor) має повністю ізольовані логіни, cookie й вкладки.",
                missionInstruction: "Натисніть простір «Робочий» на бічній панелі або комбінацію Ctrl+2",
                missionSuccess: "Простір перемкнено! Ваші вкладки, сесії та cookie тепер повністю ізольовані."
            },
            splitview: {
                title: "Вбудований поділ екрана",
                badge: "Багатозадачність",
                description: "Переглядайте два сайти поруч без відкриття зайвих вікон. Ідеально для досліджень, коду з документацією та порівнянь.",
                missionInstruction: "Натисніть значок Split View на верхній панелі або Ctrl+\\ для поділу екрана",
                missionSuccess: "Режим поділу активовано! Праворуч з’явилася друга панель браузера."
            },
            tor: {
                title: "Вбудована мережа Tor Onion",
                badge: "Приватність і Onion",
                description: "Виходьте в децентралізовану мережу з багатошаровим шифруванням. QBrowse спрямовує трафік через вузли Tor до .onion-сайтів без сторонніх проксі.",
                missionInstruction: "Натисніть значок мережі Tor на верхній панелі, щоб перевірити активний ланцюжок вузлів",
                missionSuccess: "Ланцюжок Tor відкрито! Тут видно ретранслятори та можна керувати маршрутизацією."
            },
            vault: {
                title: "QVault із нульовим розголошенням",
                badge: "Апаратна безпека",
                description: "Майстер-паролі, ключі доступу й автозаповнення шифруються на вашому пристрої за допомогою апаратних ключів та біометрії {biometric}.",
                missionInstruction: "Натисніть значок QVault на верхній панелі, щоб відкрити локальне сховище",
                missionSuccess: "QVault відкрито! Усі облікові дані локально зашифровані на вашому пристрої."
            },
            shield: {
                title: "Перехоплювач реклами й трекерів",
                badge: "Захист",
                description: "Апаратно прискорене блокування зупиняє телеметрію, криптомайнери, збір відбитків і нав’язливу рекламу ще до приходу пакетів.",
                missionInstruction: "Натисніть значок Щита на верхній панелі, щоб переглянути заблоковані трекери",
                missionSuccess: "Інспектор QShield відкрито! Можна переглядати заблоковані домени в реальному часі."
            },
            darkmode: {
                title: "Розумна темна тема й оформлення",
                badge: "Вигляд",
                description: "Легко налаштовуйте естетику: плавна темна тема, чиста світла або розумна інверсія для світлих застарілих сайтів.",
                missionInstruction: "Натисніть значок Теми на верхній панелі, щоб відкрити параметри вигляду",
                missionSuccess: "Панель тем відкрито! Перемикайте темний, світлий і режим розумної інверсії."
            },
            toolhub: {
                title: "ToolHub і постійні нотатки",
                badge: "Нотатки та інструменти",
                description: "Виділяйте текст на будь-якому сайті, щоб закріпити нотатки, які зберігаються після перезапуску. Плюс приватний локальний ШІ й історія буфера.",
                missionInstruction: "Натисніть маркер ToolHub біля правого краю або Ctrl+J, щоб відкрити панель",
                missionSuccess: "ToolHub відкрито! Додавайте нотатки до сайтів, переглядайте буфер чи спілкуйтеся з локальним ШІ."
            },
            omnibox: {
                title: "Розумний Omnibox і палітра команд",
                badge: "Універсальні команди",
                description: "Єдиний центр запуску: шукайте з bang-скороченнями (!yt, @github), виконуйте команди (>pdf, >clear), рахуйте вирази чи питайте локальний ШІ.",
                missionInstruction: "Натисніть Ctrl+K або адресний рядок у центрі, щоб дати команду QBrowse",
                missionSuccess: "Omnibox активовано! Введіть !yt для YouTube, @github для репозиторіїв або > для команд."
            }
        }
    },
    reader: {
        themes: {
            dark: "Темна",
            sepia: "Сепія",
            light: "Світла",
            midnight: "Північ"
        },
        fonts: {
            serif: "Із засічками",
            sans: "Без засічок",
            mono: "Моноширинний",
            dyslexic: "Для дислексії"
        },
        widths: {
            compact: "Компактна",
            balanced: "Збалансована",
            wide: "Широка"
        },
        exitTitle: "Вийти з режиму читання (Esc / Ctrl+Alt+R)",
        backToWebpage: "До вебсторінки",
        openOriginalTitle: "Відкрити оригінал: {url}",
        hideAudioTitle: "Сховати аудіоплеєр",
        listenTitle: "Слухати статтю (озвучення)",
        listening: "Озвучується",
        readAloud: "Читати вголос",
        themeTitle: "Тема: {name}",
        fontTitle: "Шрифт: {name}",
        decreaseSizeTitle: "Зменшити розмір тексту",
        increaseSizeTitle: "Збільшити розмір тексту",
        widthTitle: "Ширина колонки: {name}",
        closeTitle: "Закрити режим читання",
        byAuthor: "Автор: {author}",
        minRead: "{minutes} хв читання",
        wordsCount: "Слів: {count}",
        prevParaTitle: "Попередній абзац",
        pauseTitle: "Пауза",
        playTitle: "Відтворити",
        nextParaTitle: "Наступний абзац",
        audioNarration: "Голосове озвучення",
        blockProgress: "Блок {current} з {total}",
        speedTitle: "Змінити швидкість озвучення",
        selectVoiceTitle: "Обрати голос",
        voiceFallback: "Голос",
        systemVoices: "Системні голоси",
        stopCloseTitle: "Зупинити й закрити озвучення",
        highlightWithTitle: "Виділити кольором: {color}",
        noteBtn: "Нотатка",
        copyTextTitle: "Копіювати текст",
        stickyNote: "Закріплена нотатка",
        notePlaceholder: "Введіть нотатку або думку...",
        deleteBtn: "Видалити",
        saveBtn: "Зберегти"
    },
    toolhub: {
        title: "Tool Hub",
        snip: "Знімок",
        snipTitle: "Інтерактивний знімок області екрана",
        captureViewportTitle: "Знімок видимої області",
        captureFullTitle: "Знімок усієї сторінки з прокруткою",
        tabs: {
            notes: "Нотатки",
            clipboard: "Буфер",
            ai: "Лок. ШІ",
            downloads: "Завант."
        },
        webNotesTab: "Вебнотатки ({count})",
        scratchpadTab: "Чернетка",
        globalScope: "Глобальна",
        spaceScope: "Простір {space}",
        scratchpadTitle: "Чернетка: {name}",
        scratchpadGlobalPlaceholder: "Занотуйте думки, ідеї чи посилання... підтримується Markdown.",
        scratchpadSpacePlaceholder: "Чернетка для простору {space}... підтримується Markdown.",
        searchNotesPlaceholder: "Пошук виділень, нотаток, доменів...",
        clearSearchTitle: "Очистити пошук",
        allSpaces: "Усі простори",
        exportMd: "Експорт MD",
        exportMdTitle: "Експортувати нотатки в Markdown (.md)",
        noWebNotesTitle: "Немає збережених вебнотаток",
        noWebNotesDesc: "Виділіть текст на будь-якій сторінці або натисніть «Нотатка», щоб зберегти нотатки між візитами.",
        otherDomain: "Інше",
        colorTitle: "Колір: {color}",
        jumpHighlightTitle: "Натисніть, щоб перейти до виділення на сторінці",
        editNotePlaceholder: "Додайте нотатку або думку...",
        deleteNote: "Видалити нотатку",
        deleteNoteTitle: "Видалити текст нотатки",
        cancel: "Скасувати",
        saveNote: "Зберегти нотатку",
        clickToEditNote: "Натисніть, щоб редагувати нотатку",
        addNoteTitle: "Додати нотатку",
        noteBtn: "Нотатка",
        copyQuoteTitle: "Копіювати цитату",
        jumpBtn: "Перейти",
        jumpBtnTitle: "Перейти до нотатки на сторінці",
        deleteHighlightTitle: "Видалити виділення",
        clipboardHeader: "Історія системного буфера",
        syncBtn: "Оновити",
        syncTitle: "Синхронізувати із системним буфером",
        deleteClipTitle: "Видалити запис",
        clipboardEmptyTitle: "Історія буфера порожня",
        clipboardEmptyDesc: "Скопіюйте текст або URL будь-де, щоб побачити їх тут",
        clearClipboard: "Очистити історію буфера",
        aiStatusRunning: "llama-server активний (порт 8080)",
        aiStatusDownloading: "Завантаження моделі ({progress}%)...",
        aiStatusStarting: "Запуск рушія...",
        aiStatusReady: "Готово до запуску",
        aiStatusDownloaded: "Завантажено",
        aiStatusNotDownloaded: "Модель не завантажено",
        cancelDownloadTitle: "Скасувати завантаження",
        downloadModelTitle: "Завантажити {name} ({size})",
        downloadBtn: "Завантажити",
        startingBtn: "Запуск...",
        stopBtn: "Зупинити",
        startBtn: "Запустити",
        openWebUiTitle: "Відкрити веб-інтерфейс llama.cpp",
        aiConsoleSettingsTitle: "Консоль і розширені налаштування llama.cpp",
        downloadingFile: "Завантаження {filename}",
        downloadingWeights: "Завантаження ваг...",
        noModelTitle: "Модель ШІ не завантажено",
        offlineBadge: "Офлайн",
        noModelDesc: "Завантажте {name} для швидкого приватного локального ШІ: підсумки сайтів, код і чат.",
        downloadModelSize: "Завантажити модель ({size})",
        settingsBtn: "Налашт.",
        contextBtn: "Контекст",
        searchBtn: "Пошук",
        voiceBtn: "Голос",
        summarizeBtn: "Підсумок",
        summarizePrompt: "Стисло підсумуй цю вебсторінку, виділивши ключові висновки та головні тези на основі її вмісту.",
        attachTitle: "Прикріпити файл або зображення",
        chatPlaceholder: "Запитайте локальний Gemma 4 ШІ або перетягніть файли...",
        voiceInputTitle: "Голосовий ввід (Whisper)",
        downloadsHeader: "Активні й останні завантаження",
        itemSingular: "{count} файл",
        itemPlural: "Файлів: {count}",
        openDownloadsFolderTitle: "Відкрити папку завантажень",
        clearDownloadsTitle: "Очистити всі завантаження",
        downloadedFileFallback: "Завантажений файл",
        snipBadge: "Знімок",
        verified: "Перевірено",
        unverified: "Не перевірено",
        sha256Prefix: "SHA-256: {hash}",
        saved: "Збережено",
        verifyCopyHashTitle: "Перевірити та скопіювати SHA-256",
        copyHashTitle: "SHA-256: {hash} (натисніть для копіювання)",
        copyImageTitle: "Копіювати зображення в буфер",
        showInFolderTitle: "Показати в папці",
        deleteDownloadTitle: "Видалити файл і прибрати зі списку",
        downloadsEmptyTitle: "Немає активних завантажень",
        downloadsEmptyDesc: "Тут з’являтимуться знімки екрана та завантажені файли",
        pdfPageName: "{name} (стор. {page})",
        pdfImageSize: "Зображення PDF",
        toasts: {
            jumpingToNote: "Перехід до нотатки на сторінці...",
            exportedMarkdown: "Файл Markdown експортовано!",
            copiedNotesMarkdown: "Нотатки скопійовано в буфер як Markdown!",
            copiedToClipboard: "Скопійовано в буфер обміну!",
            clipDeleted: "Запис видалено",
            clipboardCleared: "Історію буфера очищено",
            parsingPdf: "Візуальний розбір PDF: {name}",
            pdfVramLimit: "Перші 10 сторінок {name} оброблено як зображення (ліміт VRAM).",
            pdfVisualFailed: "Не вдалося візуально розібрати PDF. Перехід до текстового витягнення.",
            openPageFirst: "Спочатку відкрийте вебсторінку для її підсумування",
            transcriptionFailed: "Помилка розпізнавання мовлення",
            micDenied: "Доступ до мікрофона заборонено",
            noteRemoved: "Нотатку видалено",
            noteUpdated: "Нотатку оновлено",
            copiedQuote: "Цитату скопійовано",
            highlightRemoved: "Виділення видалено",
            downloadsCleared: "Список завантажень очищено",
            hashCopied: "Контрольну суму SHA-256 скопійовано в буфер",
            hashMissing: "Неможливо обчислити хеш — файл відсутній",
            screenshotCopied: "Знімок скопійовано в буфер обміну",
            downloadDeleted: "Завантаження та файл видалено"
        },
        cancelled: "Скасовано",
        failed: "Помилка"
    },
    fontManager: {
        title: "Типографіка та шрифт застосунку",
        active: "Активний:",
        resetTitle: "Скинути шрифт до стандартного шрифту ОС",
        resetToDefault: "Скинути за замовчуванням",
        modes: {
            preset: "Набори шрифтів",
            google: "Google Fonts",
            system: "Системні шрифти",
            file: "Завантажити шрифт"
        },
        categories: {
            all: "Усі",
            sans: "Без засічок",
            mono: "Моно",
            serif: "Із засічками"
        },
        activeFont: "Активний шрифт",
        clickToApply: "Натисніть, щоб застосувати",
        googleTitle: "Будь-який шрифт Google Fonts",
        googleDesc: "Введіть назву будь-якого шрифту з fonts.google.com і натисніть Enter, щоб миттєво завантажити його в QBrowse.",
        googlePlaceholder: "напр., Montserrat, Space Grotesk, Syne, Cinzel...",
        applyFont: "Застосувати шрифт",
        popularGoogle: "Популярні шрифти Google",
        filterPlaceholder: "Фільтр списку...",
        systemTitle: "Вибір установленого системного шрифту",
        systemDesc: "Введіть назву будь-якого шрифту з вашої ОС (напр., Segoe UI Variable, Calibri, Helvetica, Comic Sans MS).",
        systemPlaceholder: "Введіть назву системного шрифту...",
        installed: "Установлено",
        notDetected: "Не виявлено",
        notDetectedTitle: "Шрифт не виявлено перевіркою canvas, але CSS усе одно спробує застосувати його за наявності",
        commonOsFonts: "Типові шрифти операційної системи",
        dropTitle: "Натисніть або перетягніть файл шрифту сюди",
        dropDesc: "Підтримуються TrueType (.ttf), OpenType (.otf), WOFF (.woff) і WOFF2 (.woff2) розміром до 12 МБ.",
        selectFile: "Обрати локальний файл шрифту",
        activeCustomFace: "Активний власний шрифт",
        removeFileTitle: "Видалити завантажений файл шрифту",
        fineTuning: "Точне налаштування типографіки",
        letterSpacing: "Міжлітерний інтервал (трекінг)",
        weightShift: "Зсув насиченості (жирність)",
        fontScale: "Масштаб шрифту інтерфейсу",
        reset100Title: "Скинути до 100%",
        specimen: "Зразок типографіки",
        specimen1: "Жебракують філософи при ґанку церкви в Гадячі, ще й шатро їхнє п’яне знаємо",
        specimen2: "Чуєш їх, доцю, га? Кумедна ж ти, прощайся без ґольфів!",
        activeDefault: "Системний за замовчуванням (Segoe UI / Native)",
        activeGoogle: "Google Font: {name}",
        activeSystem: "Системний шрифт: {name}",
        activeFile: "Власний файл: {name}",
        customLabel: "Власний",
        installedOsLabel: "Системний",
        uploadedFontLabel: "Завантажений шрифт",
        spacing: {
            tight: "Щільний",
            normal: "Звичайний",
            relaxed: "Вільний",
            wide: "Широкий"
        },
        weight: {
            normal: "Звичайний",
            medium: "Середній",
            semibold: "Напівжирний"
        },
        osLabels: {
            "Windows 11": "Windows 11",
            Windows: "Windows",
            macOS: "macOS",
            "macOS / Multi": "macOS / Мульти",
            Universal: "Універсальний",
            "Windows Dev": "Windows Dev",
            "Windows Terminal": "Термінал Windows",
            Casual: "Повсякденний",
            Linux: "Linux",
            GNOME: "GNOME",
            Serif: "Із засічками"
        },
        presetDefaultName: "Системний за замовчуванням",
        presets: {
            default: {
                description: "Рідна типографіка операційної системи (Segoe UI / San Francisco).",
                previewText: "Аа Бб Гг 123"
            },
            inter: {
                description: "Чистий надзвичайно чіткий сучасний інтерфейсний гротеск для екранів.",
                previewText: "Сучасний неогротеск"
            },
            geist: {
                description: "Фірмовий шрифт розробників від Vercel із геометричною точністю.",
                previewText: "Мінімалістична інженерія"
            },
            outfit: {
                description: "Витончений геометричний гротеск із преміальною естетикою.",
                previewText: "Преміальний геометричний"
            },
            "plus-jakarta": {
                description: "Свіжий, теплий і дружній сучасний шрифт для високоякісних вебзастосунків.",
                previewText: "Дружній сучасний стиль"
            },
            poppins: {
                description: "Привітний геометричний округлий гротеск з енергійними формами.",
                previewText: "Округлі форми"
            },
            roboto: {
                description: "Надійний стандартний шрифт Google для Android та Material Design.",
                previewText: "Архітектура Material"
            },
            manrope: {
                description: "Поєднання сучасного гротеску та геометрії з чудовою читабельністю.",
                previewText: "Точний напівгеометричний"
            },
            lexend: {
                description: "Науково розроблений для зниження втоми очей та прискорення читання.",
                previewText: "Легке читання"
            },
            "jetbrains-mono": {
                description: "Контрастний моноширинний шрифт для коду зі збільшеною висотою літер.",
                previewText: "Естетика розробника"
            },
            "fira-code": {
                description: "Моноширинний шрифт із лігатурами програмування та кришталевою чіткістю.",
                previewText: "=> Лігатури коду"
            },
            "playfair-display": {
                description: "Висококонтрастна антиква в дусі європейської книжкової класики.",
                previewText: "Журнальна антиква"
            },
            merriweather: {
                description: "Тепла літературна антиква, створена для комфортного тривалого читання.",
                previewText: "Класична літературна антиква"
            }
        },
        errors: {
            invalidFormat: "Некоректний формат. Завантажте .ttf, .otf, .woff або .woff2.",
            tooLarge: "Файл завеликий. Максимальний розмір — 12 МБ.",
            readFailed: "Не вдалося прочитати файл шрифту. Спробуйте інший файл."
        },
        toasts: {
            presetSet: "Шрифт застосунку змінено на {name}",
            googleApplied: "Шрифт Google «{name}» застосовано до QBrowse",
            systemApplied: "Системний шрифт «{name}» застосовано",
            fileLoaded: "Власний шрифт «{name}» успішно завантажено"
        }
    },
    aiSettings: {
        title: "ШІ-рушій llama.cpp",
        status: {
            online: "Онлайн (llama-server)",
            starting: "Запуск...",
            updating: "Оновлення рушія...",
            error: "Помилка рушія",
            stopped: "Зупинено"
        },
        syncTitle: "Перевірити й синхронізувати нативний рушій llama.cpp (b11796 з підтримкою Gemma 4)",
        updatingBtn: "Оновлення...",
        syncBtn: "Синхр. рушій (b11796)",
        subtitle: "Швидкий локальний виконавець LLM з нульовим розголошенням і нативною підтримкою Gemma 4, Qwen 3.5 і Bielik 11B GGUF.",
        downloadingModel: "Завантаження моделі ({progress}%)",
        connectingCdn: "Підключення до CDN...",
        cancel: "Скасувати",
        downloadBtn: "Завантажити {name} ({size})",
        startingBtn: "Запуск llama-server...",
        stopBtn: "Зупинити llama-server",
        startBtn: "Запустити рушій llama-server",
        defaultStartError: "llama-server зіткнувся з помилкою під час запуску моделі.",
        dismiss: "Приховати",
        updateEngineBtn: "Оновити ШІ-рушій",
        genSpeed: "Швидкість генерації",
        tokPerSec: "ток/с",
        contextWindow: "Вікно контексту",
        tokens: "токенів",
        gpuOffload: "Вивантаження на GPU",
        layers: "шарів",
        activeModelTitle: "Активна модель GGUF",
        loadCustomGguf: "Завантажити власний .GGUF...",
        loadCustomProjector: "Завантажити власний проєктор...",
        customModelPrefix: "Власна модель: {path}",
        customProjectorPrefix: "Власний проєктор: {path}",
        reset: "Скинути",
        downloadedBadge: "Завантажено",
        downloadingTarget: "Завантаження {target}",
        visionProjector: "Проєктора зору...",
        languageModel: "Мовної моделі...",
        weights: "ваг...",
        modelReady: "Модель готова до роботи",
        downloadModelFile: "Завантажити файл моделі ({size})",
        overridesTitle: "Параметри запуску llama-server",
        autoDetectBtn: "Автовизначення заліза",
        cpuThreadsLabel: "Потоки ЦП (-t): {threads}",
        contextSizeLabel: "Розмір контексту (-c)",
        tokensOption: "{n} токенів",
        contextBadges: {
            compact: "Компактний",
            default: "Стандарт",
            extended: "Розширений",
            max: "Макс."
        },
        gpuLayersLabel: "Шари на GPU (-ngl): {layers}",
        dataProcessingTitle: "Обробка даних",
        parsePdfTitle: "Розбирати PDF як зображення",
        parsePdfDesc: "Під час додавання PDF до чату перетворювати сторінки на зображення замість сирого тексту. Ідеально для моделей зору Gemma 4 та Qwen 3.5.",
        consoleTitle: "Термінальна консоль llama-server (Stdout наживо)",
        copyOutputTitle: "Копіювати вивід термінала",
        clearConsoleTitle: "Очистити консоль",
        consoleEmpty: "[Консоль llama-server ініціалізовано. Очікування журналу запуску сервера...]",
        modelWord: "Модель",
        visionWord: "Зір",
        models: {
            "gemma-4-e2b": "Модель Google Gemma 4 E2B Instruct GGUF із повною мультимодальною підтримкою зору для аналізу зображень і чату.",
            "gemma-4-e4b": "Потужна модель міркувань Google Gemma 4 E4B із повною підтримкою мультимодального зору для складного аналізу.",
            "qwen-3.5-4b": "Модель Alibaba Qwen 3.5 4B з підтримкою мультимодального зору, міркуванням, генерацією коду та багатомовністю.",
            "bielik-11b-v3.1": "Флагманська польсько-європейська багатомовна модель 11B від SpeakLeash із глибоким розумінням мови й інструкцій."
        },
        toasts: {
            customModelLoaded: "Завантажено власну модель: {name}",
            demoModelLoaded: "Завантажено демонстраційний шлях моделі!",
            customProjectorLoaded: "Завантажено власний проєктор зору: {name}",
            demoProjectorLoaded: "Завантажено демонстраційний шлях проєктора!",
            updatingEngine: "Оновлення нативного рушія llama.cpp...",
            engineUpdated: "Рушій llama.cpp успішно оновлено до збірки (b11796)!",
            engineUpdateFailed: "Помилка оновлення рушія: {error}",
            unknownError: "Невідома помилка",
            logsCopied: "Журнал llama-server скопійовано в буфер!",
            hardwareDetected: "Залізо визначено: {threads} потоків, {ram} ГБ ОЗП",
            hardwareDefault: "Залізо визначено: застосовано стандартні оптимізації",
            resizingContext: "Зміна вікна контексту llama-server до {tokens} токенів..."
        }
    },
    adblockImport: {
        title: "Імпорт списку блокування з GitHub / мережі",
        subtitle: "Автоматичний розбір hosts-файлів, raw-списків GitHub і правил Adblock у ваш власний список блокування.",
        closeTitle: "Закрити",
        modeUrl: "Віддалений URL / GitHub",
        modePaste: "Вставити сирий текст",
        urlLabel: "URL списку (GitHub raw, Gist або hosts URL)",
        githubRawBadge: "GitHub Raw",
        githubRawTitle: "Виявлено посилання на репозиторій GitHub і автоматично перетворено на raw-формат",
        fetching: "Завантаження...",
        fetchParse: "Отримати та розібрати",
        popularLists: "Популярні списки спільноти",
        pasteLabel: "Вставте hosts-файл, фільтри ABP або список доменів",
        pastePlaceholder: "# Вставте будь-який формат нижче:\n0.0.0.0 tracking.evil.com\n127.0.0.1 ads.adserver.org\n||telemetry.network.io^\nanalytics.badsite.com",
        parsing: "Розбір...",
        parseDomains: "Розібрати домени",
        back: "Назад",
        backTitle: "Повернутися до вибору джерела (Esc)",
        readyToImport: "Готово до імпорту",
        kbSource: "Джерело: {kb} КБ",
        validDomains: "Валідні домени",
        newUnique: "Нові унікальні",
        duplicatesFiltered: "Відсіяно дублікатів",
        linesAnalyzed: "Проаналізовано рядків",
        extractedSample: "Зразок витягнутих доменів ({count})",
        searchSamplePlaceholder: "Пошук у зразку...",
        moreDomains: "+ ще доменів: {count}",
        backToSource: "До джерела",
        cancel: "Скасувати",
        replaceList: "Замінити весь список",
        replaceListTitle: "Замінює наявний власний список блокування розібраними доменами",
        importN: "Імпортувати доменів: {count}",
        importDomains: "Імпортувати домени",
        pastedSourceLabel: "Вставлений текст",
        errors: {
            invalidUrl: "Будь ласка, введіть коректний URL списку блокування.",
            fetchFailed: "Не вдалося завантажити віддалений список блокування",
            noValidFromUrl: "Із цього джерела не вдалося розібрати валідних доменів.",
            downloadError: "Помилка завантаження віддаленого списку",
            emptyPaste: "Спочатку вставте домени або правила hosts.",
            noValidFromText: "Із тексту не вдалося витягти валідних доменних імен.",
            parseError: "Помилка розбору тексту"
        },
        presets: {
            stevenblack: {
                desc: "Комплексний захист від реклами та шкідливого ПЗ, підтримуваний спільнотою.",
                badge: "Рекомендовано"
            },
            "oisd-basic": {
                desc: "Легкий список без хибних спрацювань проти мобільного та вебвідстеження.",
                badge: "Мінімальне навант."
            },
            "adguard-trackers": {
                desc: "Спеціалізований список доменів проти скриптів аналітики й телеметрії.",
                badge: "Приватність"
            },
            peterlowe: {
                desc: "Перевірений часом стандартний список активних рекламних серверів.",
                badge: "Швидкий"
            },
            danpollock: {
                desc: "Надійний zero-host список проти телеметрії, шок-сайтів і спам-мереж.",
                badge: "Класика"
            }
        }
    },
    studio: {
        title: "Студія пресетів",
        subtitle: "Візуально переміщуйте панелі, формуйте заокруглення, налаштовуйте теми та керуйте власними пресетами.",
        tabCanvas: "Полотно",
        tabPresets: "Пресети",
        closeAria: "Закрити Студію пресетів",
        dockLeftSidebar: "Закріпити бічну панель ліворуч",
        dockRightSidebar: "Закріпити бічну панель праворуч",
        dockTopBar: "Закріпити панель навігації зверху",
        dockBottomBar: "Закріпити панель навігації знизу",
        searchBarPlaceholder: "Пошук в інтернеті або команда...",
        toolhubDockTitle: "Док ToolHub: {pos} (натисніть або перетягніть)",
        legendDock: "Док:",
        legendBarValue: "Панель ({pos})",
        legendSidebar: "Бічна панель:",
        legendToolhub: "ToolHub:",
        legendSummary: "Заокруглення: {curvature} · Omnibox: {omnibox} · Вкладки: {tabs}",
        layoutControls: "Керування макетом",
        resetTitle: "Скинути чернетку до поточної конфігурації браузера",
        reset: "Скинути",
        editingLabel: "Редагування:",
        cancelEditTitle: "Скасувати редагування та створити новий пресет",
        cancel: "Скасувати",
        sidebarMode: "Режим бічної панелі",
        sidebarModes: {
            classic: "Класичний",
            floating: "Плавучий",
            compact: "Компактний",
            hidden: "Прихований"
        },
        windowCurvature: "Заокруглення вікон",
        curvatures: {
            default: "Стандарт",
            cohesive: "Моноліт",
            square: "Гострі"
        },
        omniboxArch: "Архітектура Omnibox",
        omniboxStyles: {
            capsule: "Капсула",
            wide: "Широка",
            minimal: "Мінімал"
        },
        tabPresentation: "Відображення вкладок",
        tabStyles: {
            pills: "Пігулки",
            compact: "Компакт",
            cards: "Картки"
        },
        windowControlsStyle: "Стиль кнопок вікна",
        controlsStyles: {
            mac: "macOS",
            windows: "Windows",
            minimal: "Мінімал"
        },
        windowControlsLayout: "Розташування кнопок вікна",
        controlsOrders: {
            auto: "Розумний кут",
            "close-first": "Спочатку закрити",
            "minimize-first": "Спочатку згорнути"
        },
        themeLabel: "Тема",
        themes: {
            dark: "Темна",
            light: "Світла"
        },
        uiScaleLabel: "Масштаб інтерфейсу",
        uiScales: {
            comfortable: "Звичайний",
            compact: "Компактний"
        },
        accentSwatchLabel: "Колір акценту",
        openColorPickerTitle: "Відкрити системну палітру",
        saveChanges: "Зберегти зміни",
        applyLive: "Застосувати наживо",
        saveAsNew: "Зберегти як новий",
        applyToBrowser: "Застосувати до браузера",
        saveAsCustom: "Зберегти як власний пресет",
        searchPresetsPlaceholder: "Пошук пресетів...",
        filterAll: "Усі",
        filterBuiltin: "Вбудовані",
        filterCustom: "Власні ({count})",
        saveActiveSetup: "Зберегти поточну конфігурацію",
        activeBadge: "Активний",
        editingBadge: "(Редагується)",
        reapply: "Повторити",
        apply: "Застосувати",
        editInStudio: "Редагувати в Студії",
        customize: "Налаштувати",
        editPresetTitle: "Редагувати пресет у Студії",
        customizePresetTitle: "Налаштувати макет у Студії",
        duplicateTitle: "Дублювати пресет",
        deleteTitle: "Видалити власний пресет",
        editCustomModalTitle: "Редагувати власний пресет",
        saveCustomModalTitle: "Зберегти як власний пресет",
        presetNameLabel: "Назва пресета",
        presetNamePlaceholder: "напр., Ергономічний потік, Мінімалізм Arc",
        presetDescLabel: "Слоган / Опис",
        presetDescPlaceholder: "Короткий опис цієї конфігурації...",
        presetIconLabel: "Іконка пресета",
        createPreset: "Створити пресет",
        deleteConfirmTitle: "Видалити власний пресет?",
        deleteConfirmDescBefore: "Ви впевнені, що хочете видалити ",
        deleteConfirmDescAfter: "? Цю дію неможливо скасувати.",
        deletePresetBtn: "Видалити пресет",
        posTop: "Верх",
        posBottom: "Низ",
        posLeft: "Ліво",
        posRight: "Право",
        moveTo: "Перемістити: {pos}",
        draggableNavTitle: "Перетягувана панель навігації: перетягніть угору/вниз або натисніть обмін",
        draggableSidebarTitle: "Перетягувана бічна панель: перетягніть між лівим і правим краєм",
        swapTo: "Перенести: {pos}",
        miniTab: "Вкладка №{num}",
        miniCardView: "Картка №{num}",
        miniActiveSpaceTab: "Активна вкладка простору",
        miniSidebarPos: "Панель ({pos})",
        layoutTagFormat: "{bar} · {sidebar}",
        layoutSummaryFormat: "{tag} · {toolhub}",
        topBarLabel: "Верхня панель",
        bottomBarLabel: "Нижня панель",
        leftSidebarLabel: "Ліва панель",
        rightSidebarLabel: "Права панель",
        leftToolhubLabel: "ToolHub ліворуч",
        rightToolhubLabel: "ToolHub праворуч",
        tabsHighlight: "Вкладки: {style}",
        compactScaleLabel: "Компактний масштаб",
        comfortableScaleLabel: "Комфортний масштаб",
        defaultCustomName: "Власний пресет",
        defaultCustomDesc: "Власна конфігурація користувача",
        defaultNewNameFormat: "{bar} {side}",
        defaultNewNameArc: "Arc",
        defaultNewNameFlow: "Потік",
        defaultNewDescFormat: "Власний макет: {bar}, {sidebar}, вкладки — {tabs}",
        toasts: {
            applied: "Макет застосовано до браузера!",
            reset: "Чернетку Студії скинуто до поточної конфігурації",
            editingPreset: "Редагування «{name}» у Студії",
            loadedPreset: "Завантажено «{name}» на полотно Студії",
            switchedNewDraft: "Перемкнуто на нову чернетку"
        }
    },
    setup: {
        strictOfflineTitle: "Нуль фонових запитів (Суворий офлайн)",
        strictOfflineDesc: "Вимкніть увесь необов’язковий фоновий мережевий трафік (перевірку оновлень, оновлення фільтрів, живі підказки, віддалені іконки та хмарну синхронізацію).",
        headerTitle: "Налаштування QBrowse",
        headerSubtitle: "Помічник персоналізації",
        steps: {
            language: {
                label: "Мова",
                desc: "Мова інтерфейсу"
            },
            presets: {
                label: "Пресети й стиль",
                desc: "Вигляд і досвід"
            },
            import: {
                label: "Імпорт",
                desc: "Закладки й паролі"
            },
            privacy: {
                label: "Приватність",
                desc: "Щити й Tor"
            },
            default: {
                label: "За замовч.",
                desc: "Системна інтеграція"
            },
            sync: {
                label: "Синхр. та акаунт",
                desc: "Хмара або локально"
            }
        },
        chooseSetupTitle: "Оберіть свою конфігурацію",
        chooseSetupDesc: "Оберіть готовий макет для старту. Ви будь-коли зможете налаштувати кожну панель.",
        customLayoutCta: "Власний макет? Студія пресетів →",
        themeLabel: "Тема",
        dark: "Темна",
        light: "Світла",
        accentLabel: "Акцент",
        step2Badge: "Крок 2 з 5",
        step2Title: "Перенесіть свої дані та сховище",
        step2Desc: "Імпортуйте закладки та перенесіть паролі з Bitwarden, Proton Pass, Chrome або Firefox.",
        tabBookmarks: "Закладки",
        tabVault: "Сховище паролів",
        bookmarksFound: "Знайдено закладок: {count}",
        notDetected: "Не виявлено на цьому ПК",
        imported: "Імпортовано",
        importing: "Імпорт...",
        importBookmarks: "Імпортувати закладки",
        scanningBrowsers: "Пошук установлених браузерів...",
        htmlImported: "HTML-файл імпортовано ({count} елементів)",
        uploadHtml: "Завантажити HTML-файл закладок (.html)",
        vaultComplete: "Міграцію сховища завершено",
        vaultImportedSummary: "Успішно імпортовано елементів ({count}) із {source} до QVault!",
        importAnother: "Імпортувати ще раз",
        exportCsvJson: "Експортуйте як .CSV або .JSON",
        parsingVault: "Розбір файлу сховища...",
        uploadVault: "Завантажити експорт сховища (.csv або .json)",
        compatibleManagers: "Сумісно з Bitwarden, Proton Pass, Google Chrome, Edge, Brave та 1Password",
        step3Badge: "Крок 3 з 5",
        step3Title: "Зміцніть приватність",
        step3Desc: "QBrowse блокує скрипти стеження, прибирає нав’язливу рекламу й маршрутизує трафік через мережу Tor.",
        privacyOptimizedBadge: "Пресет: Максимум приватності",
        adblockTitle: "Нативний щит Ghostery від трекерів",
        adblockDesc: "Блокує трекери, телеметрію, аналітику та рекламу без уповільнення сторінок.",
        torTitle: "Простір маршрутизації Tor Onion",
        torDesc: "Дозволяє будь-коли відкривати сайти .onion і багатошарові зашифровані ланцюжки.",
        ready: "Готово",
        step4Badge: "Крок 4 з 5",
        step4Title: "Зробити браузером за замовчуванням",
        step4Desc: "Відкривайте посилання з робочого столу в ізольованих просторах, розділяючи роботу й особисте.",
        isDefaultTitle: "QBrowse — ваш браузер за замовчуванням!",
        makeDefaultTitle: "Зробіть QBrowse основним браузером",
        isDefaultDesc: "Усі посилання й вебфайли автоматично відкриватимуться в QBrowse.",
        makeDefaultDesc: "Обробляє http://, https:// та HTML-файли з глибокою інтеграцією в ОС.",
        osLabels: {
            darwin: "Системні параметри",
            linux: "Типові програми",
            win32: "Програми за замовчуванням Windows"
        },
        defaultHint: "{label} відкрито — оберіть QBrowse у системному вікні для підтвердження.",
        openOsSettings: "Відкрити «{label}»",
        defaultSet: "Встановлено за замовчуванням",
        openingSettings: "Відкриття параметрів...",
        setAsDefault: "Зробити основним браузером",
        step5Badge: "Крок 5 з 5 • Профіль і хмарна синхронізація",
        step5Title: "Оберіть спосіб роботи",
        step5Desc: "QBrowse дає повний суверенітет: працюйте офлайн з апаратним шифруванням або створіть безкоштовний акаунт Cloud Sync для синхронізації між пристроями.",
        zeroTelemetry: "Нуль телеметрії",
        localProfile: "Локальний профіль",
        localProfileDesc: "100% офлайн. Паролі, історія та вкладки лишаються зашифрованими на цьому ПК апаратними ключами. Акаунт не потрібен.",
        e2eEncrypted: "E2E-шифрування",
        cloudSync: "Хмарна синхронізація QBrowse",
        cloudSyncDesc: "Безшовно синхронізуйте сховище паролів, простори, закріплені вкладки та закладки між ПК через Firebase.",
        localReadyTitle: "Локальний профіль готовий до запуску",
        localReadyDesc: "Усі закладки, облікові дані та простори залишаться лише на цьому комп’ютері без жодної телеметрії. Ви зможете увімкнути Cloud Sync пізніше в Налаштуваннях.",
        takeTour: "Пройти живий тур",
        startDirectly: "Почати перегляд одразу",
        activeSync: "Синхронізація активна",
        cloudLinked: "Наскрізно зашифроване хмарне сховище підключено",
        signOut: "Вийти",
        activeSyncDesc: "Ваші закладки, вкладки просторів і зашифроване сховище паролів безперервно синхронізуються між авторизованими пристроями.",
        signIn: "Увійти",
        existingAccount: "(Наявний акаунт)",
        register: "Реєстрація",
        newAccount: "(Новий акаунт)",
        registerSubtitle: "Створіть новий акаунт QBrowse для синхронізації між пристроями.",
        signInSubtitle: "Увійдіть, щоб синхронізувати наявні закладки, простори та сховище.",
        switchToSignIn: "Перемкнутися на вхід",
        emailLabel: "Електронна пошта",
        emailPlaceholder: "name@example.com",
        createPassLabel: "Створіть пароль (мін. 6 символів)",
        accountPassLabel: "Пароль акаунта",
        min6Chars: "Щонайменше 6 символів",
        confirmPassLabel: "Підтвердіть пароль",
        passwordsMatch: "Паролі збігаються",
        passwordsMismatch: "Паролі не збігаються",
        useAccountAsMaster: "Використовувати пароль акаунта як майстер-ключ шифрування",
        masterDerivedDesc: "Генерує 256-бітні клієнтські ключі AES-GCM безпосередньо з пароля входу.",
        masterSeparateDesc: "Використовується окрема власна кодова фраза шифрування.",
        customMasterLabel: "Власна майстер-фраза шифрування",
        customMasterPlaceholder: "Введіть унікальну фразу для шифрування сховища...",
        creatingAccount: "Створення зашифрованого акаунта...",
        signingInSyncing: "Вхід і синхронізація...",
        createAccountBtn: "Створити акаунт і увімкнути синхр.",
        signInBtn: "Увійти й увімкнути синхронізацію",
        alreadyRegistered: "Уже зареєстровані в QBrowse?",
        signInHere: "Увійдіть тут",
        newToSync: "Уперше в QBrowse Cloud Sync?",
        createFreeAccount: "Створити безкоштовний акаунт (Реєстрація)",
        skipSyncLocal: "Пропустити хмарну синхронізацію й продовжити з локальним профілем",
        skipSyncComplete: "Пропустити й завершити",
        vaultModalTitle: "Захистіть імпортоване сховище",
        vaultModalDesc: "Введіть або створіть майстер-пароль для шифрування ваших даних.",
        masterPassLabel: "Майстер-пароль",
        masterPassPlaceholder: "Введіть майстер-пароль...",
        confirmMasterLabel: "Підтвердіть майстер-пароль",
        confirmMasterPlaceholder: "Підтвердіть пароль...",
        cancel: "Скасувати",
        encryptImport: "Зашифрувати й імпортувати",
        bookmarkFallback: "Закладка",
        htmlFileFallback: "HTML-файл",
        toasts: {
            enterEmail: "Будь ласка, введіть адресу електронної пошти.",
            validEmail: "Введіть коректну адресу пошти (напр., name@domain.com).",
            passMin6: "Пароль має містити щонайменше 6 символів.",
            confirmPassReq: "Будь ласка, підтвердіть пароль.",
            passMismatch: "Паролі не збігаються. Введіть ще раз.",
            signedIn: "Вхід до QBrowse Cloud Sync виконано!",
            registered: "Акаунт зареєстровано, Cloud Sync активний!",
            bookmarksImported: "Успішно імпортовано закладок: {count}!",
            importFailed: "Помилка імпорту.",
            couldNotImportBookmarks: "Не вдалося імпортувати закладки.",
            htmlImported: "Імпортовано {count} закладок із {filename}!",
            htmlImportFailed: "Помилка імпорту HTML-закладок.",
            noCredentials: "У файлі не знайдено облікових даних",
            passwordsImported: "Імпортовано паролів ({count}) із {source}!",
            vaultImportFailed: "Помилка імпорту: {error}",
            passMin4: "Пароль має містити щонайменше 4 символи",
            vaultPassMismatch: "Паролі не збігаються",
            incorrectMasterPass: "Невірний майстер-пароль для наявного сховища",
            vaultImportError: "Помилка імпорту: {error}",
            nowDefault: "QBrowse тепер ваш браузер за замовчуванням!",
            openingWinDefault: "Відкриття програм за замовчуванням Windows. Натисніть «Встановити за замовчуванням» для QBrowse.",
            openingOsDefault: "Відкриття «{label}». Оберіть QBrowse як основний браузер.",
            couldNotOpenDefault: "Не вдалося відкрити налаштування браузера за замовчуванням."
        }
    },
    flags: {
        title: "Експерименти",
        subtitle: "Тонке налаштування експериментальних функцій браузера, апаратних графічних конвеєрів, постквантового шифрування й ізоляції потоків Tor.",
        resetAll: "Скинути все за замовчуванням",
        warningTitle: "Увага: попереду експериментальні функції!",
        warningBody: "Увімкнення цих перемикачів змінює роботу Chromium V8, апаратний композитинг або параметри TLS. Для набуття чинності потрібен перезапуск.",
        searchPlaceholder: "Пошук прапорців (напр., GPU, Kyber, QUIC, DoH, bfcache)...",
        tabAvailable: "Доступні ({count})",
        tabUnavailable: "Недоступні ({count})",
        categories: {
            All: "Усі",
            Performance: "Продуктивність",
            "Hardware & Graphics": "Апаратура й графіка",
            "Web Standards & Engine": "Вебстандарти й рушій",
            Security: "Безпека",
            Networking: "Мережа",
            "Media & UI": "Медіа й інтерфейс",
            "AI & Tools": "ШІ й інструменти",
            Experimental: "Експериментальні"
        },
        statuses: {
            Stable: "Стабільний",
            Beta: "Бета",
            Experimental: "Експеримент"
        },
        options: {
            default: "За замовчуванням",
            enabled: "Увімкнено",
            disabled: "Вимкнено"
        },
        emptyMatch: "Немає доступних прапорців для «{search}»",
        reasonPrefix: "Причина: {reason}",
        unavailableBadge: "Недоступно",
        relaunchMsg: "Зміни набудуть чинності після наступного перезапуску QBrowse.",
        relaunchBtn: "Перезапустити",
        toasts: {
            reset: "Усі експериментальні прапорці скинуто за замовчуванням",
            relaunching: "Перезапуск QBrowse з оновленими прапорцями..."
        },
        items: {
            "prefer-high-performance-gpu": {
                name: "Надавати перевагу високопродуктивному GPU",
                description: "Спрямовує WebGL, Canvas і 3D-рендеринг на дискретну відеокарту. Автоматично вимикається в режимі економії батареї."
            },
            "unlock-frame-rate": {
                name: "Розблокована частота кадрів (режим бенчмарка)",
                description: "Вимикає V-Sync і ліміт FPS для синтетичних тестів Canvas/WebGL. Може спричиняти розриви кадрів і вище енергоспоживання."
            },
            "ignore-gpu-blocklist": {
                name: "Ігнорувати чорний список GPU",
                description: "Примусово вмикає апаратне прискорення навіть на старіших або некласифікованих відеодрайверах."
            },
            "experimental-web-platform": {
                name: "Експериментальні функції вебплатформи",
                description: "Активує нові API вебплатформи, що ще розробляються в Chromium. Деякі новітні API можуть працювати нестабільно."
            },
            "gpu-rasterization": {
                name: "GPU-растеризація та прискорення композитора",
                description: "Прискорює растеризацію та композитинг сторінок апаратним конвеєром GPU замість програмного рендерингу на ЦП."
            },
            "smooth-scrolling": {
                name: "Рушій плавного прокручування",
                description: "Вмикає плавні фізичні анімації прокручування коліщатком миші, тачпадом чи клавішами."
            },
            "zero-copy-rasterizer": {
                name: "GPU-растеризатор без копіювання (GpuMemoryBuffer)",
                description: "Робітники растеризації пишуть безпосередньо в текстури GPU без проміжного копіювання в системну пам’ять."
            },
            "enable-vulkan": {
                name: "Графічний бекенд Vulkan",
                description: "Використовує кросплатформовий API Vulkan для композитингу й рендерингу на підтримуваних відеокартах."
            },
            "back-forward-cache": {
                name: "Кеш навігації вперед/назад (bfcache)",
                description: "Зберігає знімки нещодавніх сторінок у пам’яті для миттєвого переходу назад і вперед."
            },
            "canvas-oop-rasterization": {
                name: "Позапроцесна растеризація 2D Canvas",
                description: "Виконує рендеринг HTML5 2D Canvas у виділеному процесі GPU замість пісочниці рендерера."
            },
            "enable-drdc": {
                name: "Динамічне визначення високої герцовки (120/144/240 Гц)",
                description: "Адаптує синхронізацію кадрів до дисплеїв ProMotion і високочастотних ігрових моніторів."
            },
            "auto-suspend-tabs": {
                name: "Автоприсипання вкладок (економія пам’яті V8)",
                description: "Автоматично вивантажує неактивні фонові вкладки через 15 хвилин простою для суттєвої економії ОЗП і заряду."
            },
            "parallel-download-engine": {
                name: "Багатопотокове паралельне завантаження",
                description: "Розділяє великі файли на кілька паралельних HTTP-запитів діапазонів для максимальної швидкості."
            },
            "lazy-image-loading": {
                name: "Ліниве завантаження зображень і фреймів",
                description: "Відкладає завантаження зображень і сторонніх iframe поза екраном до моменту прокручування до них."
            },
            "enable-tls13-kyber": {
                name: "Постквантова криптографія TLS (Kyber768 / ML-KEM)",
                description: "Умикає квантово-стійкий гібридний обмін ключами (X25519Kyber768) у TLS 1.3 проти майбутньої дешифровки."
            },
            "enable-encrypted-client-hello": {
                name: "Шифрований Client Hello (ECH / Encrypted SNI)",
                description: "Шифрує поле SNI у TLS-рукостисканні, приховуючи відвідані домени від провайдерів і брандмауерів."
            },
            "strict-origin-isolation": {
                name: "Сувора ізоляція джерел (Site-Per-Process)",
                description: "Виділяє окремий процес ОС з ізольованою пам’яттю для кожного джерела, захищаючи від атак Spectre та Meltdown."
            },
            "webrtc-ip-protection": {
                name: "Захист від витоку локальної IP-адреси в WebRTC",
                description: "Обмежує ICE-кандидати WebRTC, запобігаючи визначенню вашої реальної локальної чи публічної IP-адреси."
            },
            "enable-dns-over-https": {
                name: "Суворий DNS-over-HTTPS (Cloudflare/Quad9)",
                description: "Шифрує всі DNS-запити через HTTPS (порт 443), блокуючи перехоплення та підміну DNS."
            },
            "disable-hyperlink-auditing": {
                name: "Вимкнути аудит гіперпосилань (<a ping>) і маячки",
                description: "Блокує фонові POST-запити відстеження під час кліку на посилання."
            },
            "enable-fingerprint-randomization": {
                name: "Маскування відбитків HTML5 Canvas і WebAudio",
                description: "Додає криптографічний псевдовипадковий шум у читання пікселів і аудіобуферів проти фінгерпринтингу."
            },
            "enable-font-enumeration-shield": {
                name: "Захист від перебору локальних шрифтів",
                description: "Не дає вебсайтам опитувати встановлені системні шрифти для створення унікального ідентифікатора браузера."
            },
            "aggressive-tracker-blocker": {
                name: "Агресивне видалення трекінгових параметрів URL",
                description: "Очищає посилання від utm_source, gclid, fbclid, msclkid і блокує відомі пікселі відстеження."
            },
            "enable-subresource-filter": {
                name: "Фільтр підресурсів проти оманливих банерів",
                description: "Виявляє й пригнічує клікджекінг, невидимі накладки та фальшиві кнопки завантаження."
            },
            "enable-quic": {
                name: "Експериментальний транспорт QUIC та HTTP/3",
                description: "Використовує HTTP/3 на базі UDP для zero-RTT з’єднань і мультиплексування без блокування черги."
            },
            "tor-stream-isolation": {
                name: "Ізоляція ланцюжків Tor за доменом (IsolateDestAddr)",
                description: "Призначає окремий вихідний вузол Tor кожному домену верхнього рівня проти міжсайтової кореляції."
            },
            "dns-prefetching": {
                name: "Попереднє розв’язання DNS для посилань",
                description: "Завчасно визначає IP-адреси видимих на сторінці посилань для зменшення затримки переходу."
            },
            "heavy-ad-intervention": {
                name: "Блокування ресурсомісткої реклами",
                description: "Вивантажує рекламні iframe, що споживають понад 4 МБ трафіку або 60 с процесорного часу."
            },
            "cross-origin-isolation": {
                name: "Cross-Origin Opener Policy (COOP) і SharedArrayBuffer",
                description: "Умикає високоточну спільну пам’ять WebAssembly через суворі політики COOP/COEP."
            },
            "document-pip-api": {
                name: "Document Picture-in-Picture API",
                description: "Дозволяє плаваючі вікна «картинка в картинці» з довільним HTML-вмістом, відео та віджетами."
            },
            "force-dark-contents": {
                name: "Примусова темна тема для вебвмісту",
                description: "Автоматично інвертує світлі вебсайти в темну тему зі збереженням сприйманої яскравості."
            },
            "overlay-scrollbars": {
                name: "Мінімалістичні плавучі смуги прокрутки",
                description: "Замінює громіздкі системні скролбари акуратними індикаторами, що зникають після прокрутки."
            },
            "enable-webgpu": {
                name: "Графічний і обчислювальний API WebGPU",
                description: "Забезпечує прямий низькорівневий доступ до GPU для нейромереж, 3D-симуляцій і шейдерів у браузері."
            },
            "tab-audio-muting": {
                name: "Вимкнення звуку вкладки в один клік",
                description: "Додає інтерактивний значок динаміка на кнопки вкладок для миттєвого приглушення звуку."
            },
            "webrtc-pipewire": {
                name: "Захоплення екрана PipeWire (Linux Wayland)",
                description: "Умикає демонстрацію екрана через портал PipeWire у сучасних середовищах Linux (GNOME, KDE Plasma)."
            },
            "hdr-compositing": {
                name: "Композитинг широкого динамічного діапазону (HDR)",
                description: "Активує 10-бітний колір (Rec.2020 / DCI-P3) і тональне відображення HDR на OLED та mini-LED екранах."
            },
            "local-ai-assistant": {
                name: "Прискорення локальних LLM GGUF через VRAM (llama.cpp)",
                description: "Вивантажує ваги моделей Gemma та Llama безпосередньо у відеопам’ять GPU для миттєвого приватного ШІ."
            },
            "experimental-split-screen-gestures": {
                name: "Жести швидкого поділу екрана",
                description: "Перетягуйте вкладки до країв вікна, щоб миттєво створювати двопанельні робочі сесії."
            },
            "enable-reader-mode": {
                name: "Режим читання статей без відволікань",
                description: "Очищає статті від реклами й бічних панелей, подаючи текст у зручному форматі."
            },
            "auto-password-generation": {
                name: "Криптографічна генерація надійних паролів",
                description: "Виявляє форми реєстрації та пропонує 128-бітні паролі зі збереженням у QVault."
            },
            "tab-groups-auto-clustering": {
                name: "Розумне групування вкладок за доменом",
                description: "Пропонує об’єднувати відкриті вкладки за спільними доменами та просторами роботи."
            },
            "touch-ui-layout": {
                name: "Планшетний сенсорний інтерфейс",
                description: "Збільшує висоту вкладок і зони натискання для сенсорних екранів. Вимкнено на ПК.",
                reason: "Потребує виявлення сенсорного дигітайзера."
            },
            "eye-tracking-gaze-scroll": {
                name: "Навігація поглядом (Eye-Tracking)",
                description: "Прокручує сторінку за рухом зіниць. Потребує спеціального інфрачервоного сенсора.",
                reason: "Сумісний датчик відстеження погляду не виявлено."
            },
            "cellular-data-saver": {
                name: "Економія трафіку мобільної мережі",
                description: "Стискає зображення через проксі-сервери. Вимкнено заради збереження повної приватності.",
                reason: "Вимкнено за замовчуванням для збереження E2E-приватності Tor і HTTPS."
            }
        }
    }
};

const ko = {
    common: {
        incognito: "시크릿",
        selectOption: "옵션 선택...",
        colors: {
            accent: "강조색",
            yellow: "노랑",
            green: "초록",
            blue: "파랑",
            pink: "분홍"
        }
    },
    wallpaperPreview: {
        alt: "배경화면 미리보기",
        badge: "미리보기"
    },
    presets: {
        names: {
            balanced: "밸런스",
            developer: "개발자",
            classic_reverse: "모던 Arc",
            bottom_bar: "인체공학 플로우",
            minimalist: "미니멀 포커스",
            privacy: "프라이버시 센티널"
        },
        taglines: {
            balanced: "개인 및 업무용 이중 워크스페이스와 Google 검색.",
            developer: "GitHub Live PR이 통합된 격리형 개발 워크스페이스.",
            classic_reverse: "오른쪽 정렬 탭 트리와 깔끔한 읽기 캔버스.",
            bottom_bar: "엄지손가락에 편한 하단 주소 표시줄 내비게이션.",
            minimalist: "군더더기 없이 집중할 수 있는 단일 컴팩트 워크스페이스.",
            privacy: "강력한 추적기 차단과 DuckDuckGo 검색."
        },
        descriptions: {
            balanced: "개인 및 업무용 이중 워크스페이스, 표준 개인정보 보호 및 Google 검색.",
            developer: "GitHub Live PR 추적 및 개발자 워크플로가 포함된 다중 워크스페이스 격리.",
            classic_reverse: "오른쪽 정렬 탐색 트리, 반전된 서랍 패널 및 집중형 탭 흐름.",
            bottom_bar: "편안한 한 손 탐색을 위한 하단 주소 표시줄 내비게이션.",
            minimalist: "단일 워크스페이스, 오른쪽 사이드바, 컴팩트 인터페이스 및 무방해 집중 모드.",
            privacy: "엄격한 추적기 차단, 반전 컨트롤, DuckDuckGo 및 즉시 실행 Tor 라우팅."
        },
        customTaglineFallback: "사용자 지정 워크스페이스 및 레이아웃 구성.",
        accents: {
            amberGold: "앰버 골드",
            ocean: "오션",
            skyBlue: "스카이 블루",
            cyberEmerald: "사이버 에메랄드",
            electricBlue: "일렉트릭 블루",
            royalViolet: "로열 바이올렛",
            roseGold: "로즈 골드",
            sunsetOrange: "선셋 오렌지",
            cyberCyan: "사이버 시안",
            slateGray: "슬레이트 그레이"
        }
    },
    addPin: {
        title: "사이드바에 앱 고정",
        subtitle: "빠르게 접근할 웹 앱이나 사이트 바로가기를 추가하세요",
        defaultAppName: "앱 이름",
        appNameLabel: "앱 이름 / 제목",
        appNamePlaceholder: "예: GitHub, Gemini...",
        urlLabel: "URL / 도메인 *",
        urlPlaceholder: "예: github.com 또는 https://gemini.google.com",
        quickPresets: "빠른 프리셋",
        cancel: "취소",
        pinApp: "앱 고정"
    },
    passkey: {
        biometrics: {
            darwin: "Touch ID",
            linux: "시스템 생체 인증",
            win32: "Windows Hello"
        },
        hints: {
            darwin: "Touch ID 센서에 손가락을 대거나 macOS 암호를 입력하세요",
            linux: "지문 센서에 손가락을 대거나 시스템 암호를 입력하세요",
            win32: "지문 센서에 손가락을 대거나 Windows PIN을 입력하세요"
        },
        cancelDenyTitle: "취소 및 거부",
        verifiedTitle: "본인 확인 완료!",
        scanningTitle: "{biometric} 스캔 중...",
        autofillTitle: "저장된 비밀번호 자동 완성",
        passkeyTitle: "패스키 인증",
        verifiedAutofillDesc: "금고가 잠금 해제되고 자격 증명이 입력되었습니다",
        verifiedPasskeyDesc: "패스키가 성공적으로 확인 및 서명되었습니다",
        requireAutofillDesc: "금고 잠금 해제 및 자동 완성을 위해 인증이 필요합니다",
        requirePasskeyDesc: "패스키로 로그인하려면 인증이 필요합니다",
        passwordBadge: "비밀번호",
        passkeyBadge: "패스키",
        accountLabel: "계정:",
        savedLogin: "저장된 로그인",
        passkeyUser: "패스키 사용자",
        verifyingWith: "{biometric}(으)로 확인 중...",
        verifiedBtn: "확인됨!",
        verifyWith: "{biometric}(으)로 확인",
        orPassPin: "또는 마스터 암호 / PIN 사용",
        orPass: "또는 마스터 암호 사용",
        placeholderPin: "마스터 암호 또는 4~8자리 빠른 PIN 입력",
        placeholderPass: "QVault 마스터 암호 입력",
        checking: "자격 증명 확인 중...",
        verifyAuth: "확인 및 인증",
        cancelDenyBtn: "요청 취소 및 거부",
        websiteFallback: "웹사이트",
        theWebsiteFallback: "해당 웹사이트",
        toastAutofill: "{domain}의 금고 잠금 해제 및 자동 완성 완료!",
        toastPasskey: "{domain}의 패스키 인증 완료!",
        promptAutofill: "{domain}의 자격 증명을 자동 완성하려면 본인 확인을 진행하세요",
        promptPasskey: "QVault 패스키로 {domain}에 로그인",
        biometricError: "생체 인증 오류: {error}",
        vaultLockedOut: "실패 횟수 초과로 금고가 잠겼습니다. {seconds}초 후 다시 시도하세요.",
        incorrectCreds: "마스터 암호 또는 빠른 PIN이 올바르지 않습니다. 다시 시도하세요.",
        verificationFailed: "인증 실패: {error}",
        passkeyCreateTitle: "QVault 패스키 만들기",
        verifiedPasskeyCreateDesc: "본인 확인 완료 — QVault에 패스키 저장 중",
        requirePasskeyCreateDesc: "이 패스키를 만들고 저장하려면 인증이 필요합니다",
        useHardwareKeyBtn: "하드웨어 / 시스템 키 사용",
        useHardwareKeyHint: {
            darwin: "YubiKey · FIDO2 · Touch ID · 휴대폰 QR",
            linux: "YubiKey · FIDO2 · USB / NFC / BLE · 휴대폰 QR",
            win32: "YubiKey · FIDO2 · Windows Hello · 휴대폰 QR"
        },
        toastHardwareHandoff: "{domain}의 하드웨어 / 시스템 보안 키로 전환 중...",
        toastPasskeyCreated: "{domain}의 패스키가 확인 및 저장되었습니다!",
        promptPasskeyCreate: "{domain}의 QVault 패스키 생성 및 저장"
    },
    history: {
        title: "아카이브",
        entrySingular: "항목 {count}개 저장됨",
        entryPlural: "항목 {count}개 저장됨",
        searchPlaceholder: "아카이브 검색...",
        clearAllTitle: "모든 탐색 기록 지우기",
        clear: "지우기",
        closeTitle: "닫기 (Esc)",
        segments: {
            all: "전체",
            today: "오늘",
            yesterday: "어제",
            week: "최근 7일",
            older: "이전"
        },
        emptySearch: "\"{query}\"와 일치하는 결과 없음",
        emptyTitle: "아카이브가 비어 있습니다",
        emptySearchDesc: "철자를 확인하거나 다른 필터를 선택해 보세요.",
        emptyDesc: "방문한 페이지가 빠른 참조를 위해 여기에 저장됩니다.",
        itemSingular: "항목 {count}개",
        itemPlural: "항목 {count}개",
        copyLinkTitle: "링크 복사",
        openNewTabTitle: "새 탭에서 열기",
        removeTitle: "아카이브에서 제거",
        toastCleared: "아카이브를 지웠습니다",
        toastCopied: "링크를 복사했습니다",
        toastOpenedBg: "백그라운드 탭에서 열었습니다",
        loadMore: "더 불러오기",
    },
    cookies: {
        title: "쿠키 및 사이트 저장소 탐색기",
        subtitle: "사이트 쿠키 및 로컬 데이터를 검사, 검색 및 삭제합니다",
        filterDomain: "도메인 필터",
        refreshTitle: "목록 새로고침",
        allSites: "모든 사이트",
        clearDomain: "{domain} 지우기",
        clearAllData: "모든 인터넷 사용 기록 삭제",
        searchPlaceholder: "이름, 도메인 또는 값으로 쿠키 검색...",
        emptyTitle: "쿠키를 찾을 수 없습니다",
        emptyDesc: "검색어를 지우거나 다른 도메인을 선택해 보세요",
        secure: "Secure",
        httpOnly: "HttpOnly",
        path: "경로: {path}",
        expires: "만료: {date}",
        deleteTitle: "쿠키 삭제",
        toastDeleted: "쿠키 삭제됨: {name}",
        toastClearedSite: "{domain}의 쿠키 {count}개 삭제됨",
        toastClearedAll: "인터넷 사용 기록 및 쿠키가 삭제되었습니다"
    },
    resources: {
        title: "작업 관리자",
        cpu: "CPU",
        ram: "RAM",
        asleepCount: "절전 {count}개",
        sleepInactive: "비활성 탭 절전",
        sleepInactiveTitle: "메모리 확보를 위해 비활성 백그라운드 탭 절전",
        wakeAll: "모두 깨우기",
        wakeAllTitle: "절전된 모든 탭 깨우기",
        purgeCacheTitle: "브라우저 메모리 캐시 정리",
        autoRefreshActiveTitle: "자동 새로고침 활성 (2초마다)",
        autoRefreshPausedTitle: "자동 새로고침 일시 중지됨",
        autoRefresh2s: "2초",
        paused: "일시 중지",
        refreshTitle: "프로세스 지표 새로고침",
        closeTitle: "닫기 (ESC)",
        filters: {
            all: "전체",
            tabs: "탭",
            processes: "프로세스",
            sleeping: "절전 중"
        },
        searchPlaceholder: "이름, PID로 필터링...",
        colTask: "작업 / 프로세스",
        colSpace: "공간 / 유형",
        colStatus: "상태",
        colCpu: "CPU",
        colMemory: "메모리",
        colAction: "동작",
        emptyMatch: "\"{query}\"와 일치하는 작업 없음",
        blankTab: "빈 탭",
        newTabDash: "Zen 새 탭 대시보드",
        pidSubtitle: "PID {pid} · {type}",
        active: "활성",
        spaceTab: "{space} 탭",
        mainCore: "메인 코어",
        sleep: "절전",
        live: "실행 중",
        memSaved: "(절약됨)",
        wakeTabTitle: "탭 깨우기",
        activeTabCannotSleep: "활성 탭은 절전할 수 없습니다",
        sleepTabTitle: "탭 절전 모드로 전환",
        switchTabTitle: "이 탭으로 전환",
        closeTabTitle: "탭 닫기",
        core: "코어",
        endProcessTitle: "프로세스 PID {pid} 종료",
        itemsOf: "{total}개 중 {shown}개 항목",
        pressEscPrefix: "닫으려면",
        pressEscSuffix: "키를 누르세요",
        procMain: "QBrowse 메인 프로세스",
        procGpu: "GPU 프로세스",
        procRenderer: "웹뷰 렌더러",
        procUtility: "유틸리티 서비스 (오디오/저장소)",
        procZygote: "샌드박스 프리로더",
        procPepper: "플러그인 호스트",
        procChild: "{type} 프로세스",
        procChildDefault: "하위",
        toastHibernatedSingular: "비활성 탭 {count}개 절전 완료 (약 {mb}MB RAM 확보)",
        toastHibernatedPlural: "비활성 탭 {count}개 절전 완료 (약 {mb}MB RAM 확보)",
        toastWokeSingular: "절전 탭 {count}개 복원됨",
        toastWokePlural: "절전 탭 {count}개 복원됨",
        toastCachePurged: "브라우저 캐시 및 메모리를 정리했습니다",
        toastKillUnavailable: "프로세스를 종료할 수 없음: API 사용 불가",
        toastKilled: "프로세스 {pid} 종료됨",
        toastKillFailed: "프로세스 {pid} 종료 실패",
        toastKillError: "프로세스 {pid} 종료 중 오류 발생"
    },
    docViewer: {
        fallbackName: "로컬 문서",
        fallbackFile: "파일",
        preview: "미리보기",
        raw: "원본 텍스트",
        zoomOut: "축소",
        zoomIn: "확대",
        resetZoom: "배율 재설정",
        copyTitle: "파일 내용 복사",
        copied: "복사됨",
        copy: "복사",
        revealTitle: "시스템 폴더에서 보기",
        loading: "문서 불러오는 중...",
        errorTitle: "파일을 표시할 수 없음",
        readError: "파일을 읽지 못했습니다",
        toastCopied: "내용을 클립보드에 복사했습니다",
        toastRevealed: "시스템 폴더에서 파일을 열었습니다"
    },
    pdfViewer: {
        toggleThumbnails: "페이지 썸네일 전환",
        fallbackName: "PDF 문서",
        pageSingular: "{count}페이지",
        pagePlural: "총 {count}페이지",
        prevPage: "이전 페이지",
        nextPage: "다음 페이지",
        zoomOut: "축소",
        zoomIn: "확대",
        fitWidth: "너비에 맞춤",
        rotate: "시계 방향으로 90° 회전",
        normalMode: "일반 모드",
        darkInvertMode: "다크 리더 반전 모드",
        summarize: "요약",
        revealTitle: "시스템 파일 관리자에서 열기",
        pagesHeader: "페이지",
        pageNum: "{num}페이지",
        loading: "PDF.js로 PDF 렌더링 중...",
        errorTitle: "문서를 열지 못함",
        openError: "PDF 문서를 여는 데 실패했습니다",
        extractingToast: "Qu-AI용 문서 텍스트 추출 중...",
        openedAiToast: "문서 텍스트와 함께 Qu-AI 패널에서 열었습니다!",
        extractErrorToast: "텍스트 추출 실패: {error}",
        revealedToast: "시스템 폴더에서 파일을 열었습니다",
        fallbackDocName: "문서",
        pageMarker: "--- {num}페이지 ---",
        summaryPrompt: "이 PDF 문서({fileName})의 내용을 바탕으로 간결하고 핵심적인 요약과 주요 요점을 정리해 주세요:"
    },
    localDir: {
        parentFolderTitle: "상위 폴더로 이동",
        reloadTitle: "폴더 새로고침",
        openInFileManager: "파일 관리자에서 열기",
        filterPlaceholder: "이 디렉터리의 파일 필터링...",
        sortName: "이름",
        sortSize: "크기",
        sortDate: "날짜",
        gridViewTitle: "그리드 보기",
        listViewTitle: "목록 보기",
        scanning: "디렉터리 내용 스캔 중...",
        errorTitle: "폴더를 열 수 없음",
        goParent: "상위 디렉터리로 이동",
        emptySearch: "일치하는 파일이 없습니다",
        emptySearchHint: "검색 필터를 지워 보세요",
        folderType: "폴더",
        revealTitle: "파일 관리자에서 보기",
        colName: "이름",
        colModified: "수정된 날짜",
        colSize: "크기",
        itemSingular: "항목 {count}개",
        itemPlural: "항목 {count}개",
        filtered: "(필터링됨)",
        suiteName: "QBrowse 파일 스위트",
        apiUnavailable: "Electron 디렉터리 API를 사용할 수 없습니다",
        openFailed: "디렉터리를 열지 못했습니다",
        toastOpened: "시스템 파일 관리자에서 열었습니다",
        toastRevealed: "폴더에서 표시됨: {name}"
    },
    tour: {
        welcomeTitle: "QBrowse에 오신 것을 환영합니다",
        welcomeSubtitle: "브라우저 둘러보기 방식을 선택하세요:",
        overviewBadge: "개요",
        quickTitle: "빠른 둘러보기",
        quickDesc: "레이아웃, 워크스페이스, 내비게이션을 명쾌한 설명과 함께 빠르게 시각적으로 살펴봅니다.",
        startQuick: "빠른 투어 시작",
        interactiveBadge: "인터랙티브",
        interactiveTitle: "인터랙티브 마스터클래스",
        interactiveDesc: "실제 브라우저 UI에서 버튼을 누르고, Tor를 테스트하며, 단축키를 익히는 실습형 가이드 미션입니다.",
        startInteractive: "인터랙티브 투어 시작",
        skipWelcome: "투어 건너뛰고 바로 탐색하기 (Esc)",
        stepCounter: "{total}단계 중 {current}단계",
        closeTitle: "투어 닫기 (Esc)",
        skipTour: "투어 건너뛰기",
        back: "뒤로",
        finishTour: "투어 완료",
        nextStep: "다음 단계",
        exitToast: "투어를 닫았습니다. 언제든 Ctrl+K를 눌러 QBrowse를 탐색하세요!",
        topBarShortcut: "상단 표시줄",
        steps: {
            spaces: {
                title: "멀티 스페이스 완전 격리",
                badge: "워크스페이스",
                description: "작업 흐름을 깔끔하게 분리하세요. 각 공간(개인, 업무, 고스트, Tor)은 로그인, 쿠키, 탭을 완전히 독립적으로 유지합니다.",
                missionInstruction: "사이드바 전환기에서 \"업무\" 공간을 클릭하거나 Ctrl+2를 누르세요",
                missionSuccess: "워크스페이스가 전환되었습니다! 탭과 세션, 쿠키가 완전히 격리되었습니다."
            },
            splitview: {
                title: "네이티브 분할 화면 보기",
                badge: "멀티태스킹",
                description: "새 창을 띄우지 않고 두 웹사이트를 나란히 동시에 탐색하세요. 문서 참고 코딩이나 비교 분석에 최적화되어 있습니다.",
                missionInstruction: "상단 표시줄의 분할 보기 아이콘을 클릭하거나 Ctrl+\\를 누르세요",
                missionSuccess: "분할 보기가 전환되었습니다! 오른쪽에 보조 브라우저 창이 나타났습니다."
            },
            tor: {
                title: "내장 Tor 어니언 네트워크",
                badge: "프라이버시 & 어니언",
                description: "다중 홉 회로 암호화가 내장된 분산 웹을 탐색하세요. QBrowse는 암호화된 Tor 릴레이를 통해 .onion 도메인에 직접 연결합니다.",
                missionInstruction: "상단 표시줄의 Tor 네트워크 아이콘을 클릭해 활성 릴레이 회로를 확인하세요",
                missionSuccess: "Tor 회로가 열렸습니다! 다중 홉 중계 노드를 확인하고 언제든 켜고 끌 수 있습니다."
            },
            vault: {
                title: "영지식 로컬 QVault",
                badge: "하드웨어 보안",
                description: "마스터 암호, 패스키, 카드 정보는 로컬 하드웨어 키와 {biometric} 생체 보안으로 기기에 직접 암호화됩니다. 평문은 절대 PC 밖으로 나가지 않습니다.",
                missionInstruction: "상단 표시줄의 QVault 아이콘을 클릭해 로컬 금고를 열어 보세요",
                missionSuccess: "QVault가 열렸습니다! 모든 자격 증명이 하드웨어 생체 보호 아래 로컬 암호화됩니다."
            },
            shield: {
                title: "네이티브 광고 및 추적기 차단기",
                badge: "보호",
                description: "하드웨어 가속 네이티브 네트워크 차단이 서드파티 원격 측정, 크립토마이너, 지문 수집 및 광고 패킷을 사전에 차단합니다.",
                missionInstruction: "상단 표시줄의 방패 아이콘을 클릭해 차단된 추적기와 보호 규칙을 확인하세요",
                missionSuccess: "QShield 검사기가 열렸습니다! 실시간 차단 도메인을 확인하고 차단기를 제어할 수 있습니다."
            },
            darkmode: {
                title: "스마트 다크 모드 & 시스템 테마",
                badge: "디자인",
                description: "시각적 스타일을 손쉽게 조정하세요. 세련된 다크 테마, 깔끔한 라이트 모드 또는 밝은 웹사이트용 스마트 반전 모드를 전환할 수 있습니다.",
                missionInstruction: "상단 표시줄의 테마 아이콘을 클릭해 화면 옵션을 확인하세요",
                missionSuccess: "테마 패널이 열렸습니다! 다크, 라이트, 스마트 반전 모드를 전환할 수 있습니다."
            },
            toolhub: {
                title: "ToolHub & 영구 스티커 메모",
                badge: "리서치 & 도구",
                description: "웹페이지의 원하는 텍스트를 강조 표시해 새로고침 후에도 남는 메모를 고정하세요. 프라이빗 로컬 AI와 클립보드 기록도 함께 제공합니다.",
                missionInstruction: "화면 오른쪽 가장자리의 ToolHub 핸들을 클릭하거나 Ctrl+J를 누르세요",
                missionSuccess: "ToolHub가 열렸습니다! 사이트에 메모를 남기거나 클립보드 및 로컬 AI를 사용할 수 있습니다."
            },
            omnibox: {
                title: "스마트 Omnibox & 명령 팔레트",
                badge: "통합 명령",
                description: "모든 작업의 통합 런치패드입니다. 뱅 단축어(!yt, @github), 브라우저 명령(>pdf, >clear), 수식 계산 및 로컬 AI 질의를 실행하세요.",
                missionInstruction: "Ctrl+K를 누르거나 중앙 주소 표시줄을 클릭해 QBrowse에 명령을 내려 보세요",
                missionSuccess: "Omnibox가 활성화되었습니다! !yt로 YouTube 검색, @github로 저장소 검색, >로 고급 명령을 실행하세요."
            }
        }
    },
    reader: {
        themes: {
            dark: "다크",
            sepia: "세피아",
            light: "라이트",
            midnight: "미드나잇"
        },
        fonts: {
            serif: "명조(세리프)",
            sans: "고딕(산세리프)",
            mono: "고정폭",
            dyslexic: "난독증 보조"
        },
        widths: {
            compact: "좁게",
            balanced: "보통",
            wide: "넓게"
        },
        exitTitle: "읽기 모드 종료 (Esc / Ctrl+Alt+R)",
        backToWebpage: "웹페이지로 돌아가기",
        openOriginalTitle: "원본 열기: {url}",
        hideAudioTitle: "오디오 플레이어 숨기기",
        listenTitle: "기사 듣기 (소리 내어 읽기)",
        listening: "듣는 중",
        readAloud: "소리 내어 읽기",
        themeTitle: "{name} 테마",
        fontTitle: "{name} 글꼴 사용",
        decreaseSizeTitle: "글자 크기 줄이기",
        increaseSizeTitle: "글자 크기 키우기",
        widthTitle: "{name} 열 너비",
        closeTitle: "읽기 모드 닫기",
        byAuthor: "작성자: {author}",
        minRead: "약 {minutes}분 분량",
        wordsCount: "{count}단어",
        prevParaTitle: "이전 문단",
        pauseTitle: "일시 정지",
        playTitle: "재생",
        nextParaTitle: "다음 문단",
        audioNarration: "음성 내레이션",
        blockProgress: "총 {total}블록 중 {current}번째",
        speedTitle: "읽기 속도 변경",
        selectVoiceTitle: "음성 선택",
        voiceFallback: "음성",
        systemVoices: "시스템 음성",
        stopCloseTitle: "중지 및 내레이션 닫기",
        highlightWithTitle: "{color} 색상으로 강조",
        noteBtn: "메모",
        copyTextTitle: "텍스트 복사",
        stickyNote: "스티커 메모",
        notePlaceholder: "메모나 생각을 입력하세요...",
        deleteBtn: "삭제",
        saveBtn: "저장"
    },
    toolhub: {
        title: "Tool Hub",
        snip: "캡처",
        snipTitle: "대화형 화면 영역 캡처",
        captureViewportTitle: "현재 보이는 화면 캡처",
        captureFullTitle: "스크롤 전체 페이지 캡처",
        tabs: {
            notes: "메모",
            clipboard: "클립보드",
            ai: "로컬 AI",
            downloads: "다운로드"
        },
        webNotesTab: "웹 메모 ({count})",
        scratchpadTab: "임시 메모장",
        globalScope: "전체",
        spaceScope: "{space} 공간",
        scratchpadTitle: "메모장: {name}",
        scratchpadGlobalPlaceholder: "전역 아이디어, 메모, 링크를 적어 두세요... 마크다운을 지원합니다.",
        scratchpadSpacePlaceholder: "{space} 공간 전용 메모장... 마크다운을 지원합니다.",
        searchNotesPlaceholder: "하이라이트, 메모, 도메인 검색...",
        clearSearchTitle: "검색 지우기",
        allSpaces: "모든 공간",
        exportMd: "MD 내보내기",
        exportMdTitle: "메모를 Markdown(.md)으로 내보내기",
        noWebNotesTitle: "저장된 웹 메모 없음",
        noWebNotesDesc: "웹페이지의 텍스트를 강조 표시하거나 플로팅 바에서 \"메모\"를 눌러 영구 메모를 남기세요.",
        otherDomain: "기타",
        colorTitle: "색상: {color}",
        jumpHighlightTitle: "클릭하여 페이지의 해당 하이라이트로 이동",
        editNotePlaceholder: "메모나 생각을 추가하세요...",
        deleteNote: "메모 삭제",
        deleteNoteTitle: "메모 텍스트 삭제",
        cancel: "취소",
        saveNote: "메모 저장",
        clickToEditNote: "클릭하여 메모 편집",
        addNoteTitle: "메모 추가",
        noteBtn: "메모",
        copyQuoteTitle: "인용문 복사",
        jumpBtn: "이동",
        jumpBtnTitle: "페이지의 메모 위치로 이동",
        deleteHighlightTitle: "하이라이트 삭제",
        clipboardHeader: "시스템 클립보드 기록",
        syncBtn: "동기화",
        syncTitle: "시스템 클립보드 동기화",
        deleteClipTitle: "항목 삭제",
        clipboardEmptyTitle: "클립보드 기록이 비어 있습니다",
        clipboardEmptyDesc: "어디서든 텍스트나 URL을 복사하면 여기에 표시됩니다",
        clearClipboard: "클립보드 기록 지우기",
        aiStatusRunning: "llama-server 활성 (포트 8080)",
        aiStatusDownloading: "모델 다운로드 중 ({progress}%)...",
        aiStatusStarting: "엔진 시작 중...",
        aiStatusReady: "시작 준비 완료",
        aiStatusDownloaded: "다운로드됨",
        aiStatusNotDownloaded: "모델 미다운로드",
        cancelDownloadTitle: "다운로드 취소",
        downloadModelTitle: "{name} 다운로드 ({size})",
        downloadBtn: "다운로드",
        startingBtn: "시작 중...",
        stopBtn: "중지",
        startBtn: "시작",
        openWebUiTitle: "llama.cpp 웹 UI 열기",
        aiConsoleSettingsTitle: "llama.cpp 콘솔 및 고급 설정",
        downloadingFile: "{filename} 다운로드 중",
        downloadingWeights: "가중치 다운로드 중...",
        noModelTitle: "다운로드된 AI 모델 없음",
        offlineBadge: "오프라인",
        noModelDesc: "{name} 모델을 다운로드하여 웹 요약, 코딩, 채팅을 위한 빠르고 프라이빗한 로컬 AI를 실행하세요.",
        downloadModelSize: "모델 다운로드 ({size})",
        settingsBtn: "설정",
        contextBtn: "컨텍스트",
        searchBtn: "검색",
        voiceBtn: "음성",
        summarizeBtn: "요약",
        summarizePrompt: "이 웹페이지의 내용을 바탕으로 핵심 요점과 주요 사항을 명확하게 요약해 주세요.",
        attachTitle: "파일 또는 이미지 첨부",
        chatPlaceholder: "로컬 Gemma 4 AI에게 질문하거나 파일을 드롭하세요...",
        voiceInputTitle: "음성 입력 (Whisper)",
        downloadsHeader: "진행 중 및 최근 다운로드",
        itemSingular: "항목 {count}개",
        itemPlural: "항목 {count}개",
        openDownloadsFolderTitle: "다운로드 폴더 열기",
        clearDownloadsTitle: "모든 다운로드 목록 지우기",
        downloadedFileFallback: "다운로드된 파일",
        snipBadge: "캡처",
        verified: "검증됨",
        unverified: "미검증",
        sha256Prefix: "SHA-256: {hash}",
        saved: "저장됨",
        verifyCopyHashTitle: "SHA-256 체크섬 확인 및 복사",
        copyHashTitle: "SHA-256: {hash} (클릭하여 복사)",
        copyImageTitle: "클립보드에 이미지 복사",
        showInFolderTitle: "폴더에서 보기",
        deleteDownloadTitle: "파일 삭제 및 목록에서 제거",
        downloadsEmptyTitle: "활성 다운로드 없음",
        downloadsEmptyDesc: "스크린샷과 다운로드한 파일이 여기에 표시됩니다",
        pdfPageName: "{name} ({page}쪽)",
        pdfImageSize: "PDF 이미지",
        toasts: {
            jumpingToNote: "페이지의 메모 위치로 이동 중...",
            exportedMarkdown: "Markdown 파일을 내보냈습니다!",
            copiedNotesMarkdown: "메모를 Markdown으로 클립보드에 복사했습니다!",
            copiedToClipboard: "클립보드에 복사했습니다!",
            clipDeleted: "항목이 삭제되었습니다",
            clipboardCleared: "클립보드 기록을 지웠습니다",
            parsingPdf: "PDF 시각 분석 중: {name}",
            pdfVramLimit: "VRAM 제한으로 {name}의 처음 10페이지를 이미지로 변환했습니다.",
            pdfVisualFailed: "PDF 시각 분석에 실패했습니다. 텍스트 추출로 전환합니다.",
            openPageFirst: "요약하려면 먼저 웹페이지를 여세요",
            transcriptionFailed: "음성 인식 실패",
            micDenied: "마이크 권한이 거부되었습니다",
            noteRemoved: "메모가 삭제되었습니다",
            noteUpdated: "메모가 업데이트되었습니다",
            copiedQuote: "인용문을 복사했습니다",
            highlightRemoved: "하이라이트가 삭제되었습니다",
            downloadsCleared: "다운로드 목록을 지웠습니다",
            hashCopied: "SHA-256 체크섬을 클립보드에 복사했습니다",
            hashMissing: "해시를 계산할 수 없음 - 파일이 없습니다",
            screenshotCopied: "스크린샷을 클립보드에 복사했습니다",
            downloadDeleted: "다운로드 기록과 파일을 삭제했습니다"
        },
        cancelled: "취소됨",
        failed: "실패"
    },
    fontManager: {
        title: "앱 타이포그래피 및 글꼴",
        active: "활성:",
        resetTitle: "운영 체제 기본 글꼴로 재설정",
        resetToDefault: "기본값으로 재설정",
        modes: {
            preset: "프리셋 글꼴",
            google: "Google Fonts",
            system: "시스템 글꼴",
            file: "글꼴 업로드"
        },
        categories: {
            all: "전체",
            sans: "산세리프",
            mono: "고정폭",
            serif: "세리프"
        },
        activeFont: "활성 글꼴",
        clickToApply: "클릭하여 적용",
        googleTitle: "원하는 Google 글꼴 사용",
        googleDesc: "fonts.google.com의 글꼴 이름을 입력하고 Enter를 누르면 QBrowse에 즉시 불러옵니다.",
        googlePlaceholder: "예: Montserrat, Space Grotesk, Syne, Cinzel...",
        applyFont: "글꼴 적용",
        popularGoogle: "인기 Google 글꼴",
        filterPlaceholder: "목록 필터링...",
        systemTitle: "설치된 시스템 글꼴 선택",
        systemDesc: "운영 체제에 설치된 글꼴 이름을 입력하세요 (예: Segoe UI Variable, Calibri, Helvetica, 맑은 고딕).",
        systemPlaceholder: "시스템 글꼴 이름 입력...",
        installed: "설치됨",
        notDetected: "감지되지 않음",
        notDetectedTitle: "캔버스 측정으로는 감지되지 않았지만 설치되어 있다면 CSS가 렌더링을 시도합니다",
        commonOsFonts: "일반 운영 체제 글꼴",
        dropTitle: "클릭하거나 글꼴 파일을 여기에 끌어다 놓으세요",
        dropDesc: "최대 12MB의 TrueType(.ttf), OpenType(.otf), WOFF(.woff), WOFF2(.woff2)를 지원합니다.",
        selectFile: "로컬 글꼴 파일 선택",
        activeCustomFace: "활성 사용자 지정 글꼴",
        removeFileTitle: "업로드한 글꼴 파일 제거",
        fineTuning: "타이포그래피 미세 조정",
        letterSpacing: "자간 (글자 간격)",
        weightShift: "글꼴 굵기 조정",
        fontScale: "UI 글꼴 크기 배율",
        reset100Title: "100%로 재설정",
        specimen: "타이포그래피 견본",
        specimen1: "다람쥐 헌 쳇바퀴에 타고파 · The quick brown fox",
        specimen2: "키스의 고유조건은 입술끼리 만나야 하고 특별한 기술은 필요치 않다.",
        activeDefault: "시스템 기본값 (Segoe UI / 네이티브)",
        activeGoogle: "Google 글꼴: {name}",
        activeSystem: "시스템 글꼴: {name}",
        activeFile: "사용자 지정 파일: {name}",
        customLabel: "사용자 지정",
        installedOsLabel: "설치된 OS 글꼴",
        uploadedFontLabel: "업로드한 글꼴",
        spacing: {
            tight: "좁게",
            normal: "보통",
            relaxed: "여유롭게",
            wide: "넓게"
        },
        weight: {
            normal: "보통",
            medium: "중간",
            semibold: "약간 굵게"
        },
        osLabels: {
            "Windows 11": "Windows 11",
            Windows: "Windows",
            macOS: "macOS",
            "macOS / Multi": "macOS / 멀티",
            Universal: "범용",
            "Windows Dev": "Windows Dev",
            "Windows Terminal": "Windows 터미널",
            Casual: "캐주얼",
            Linux: "Linux",
            GNOME: "GNOME",
            Serif: "세리프"
        },
        presetDefaultName: "시스템 기본값",
        presets: {
            default: {
                description: "운영 체제 기본 타이포그래피 (Segoe UI / San Francisco).",
                previewText: "가나 Aa Bb 123"
            },
            inter: {
                description: "디지털 화면을 위해 설계된 깔끔하고 가독성 높은 현대적 UI 산세리프.",
                previewText: "모던 네오 그로테스크"
            },
            geist: {
                description: "기하학적 정밀함을 갖춘 Vercel의 시그니처 개발자 서체.",
                previewText: "미니멀 엔지니어링"
            },
            outfit: {
                description: "하이패션과 럭셔리 브랜드 감성을 담은 세련된 기하학적 산세리프.",
                previewText: "럭셔리 기하학 서체"
            },
            "plus-jakarta": {
                description: "프리미엄 웹 앱을 위한 산뜻하고 따뜻하며 친근한 현대 서체.",
                previewText: "친근한 현대적 감각"
            },
            poppins: {
                description: "경쾌하고 부드러운 곡선이 돋보이는 친숙한 원형 산세리프.",
                previewText: "부드러운 곡선미"
            },
            roboto: {
                description: "Android와 Material Design을 대표하는 Google의 주력 서체.",
                previewText: "Material 아키텍처"
            },
            manrope: {
                description: "현대적 그로테스크와 기하학 서체가 조화된 뛰어난 가독성.",
                previewText: "정밀한 세미 기하학"
            },
            lexend: {
                description: "시각적 피로를 줄이고 읽기 속도를 높이도록 과학적으로 설계되었습니다.",
                previewText: "편안한 가독성"
            },
            "jetbrains-mono": {
                description: "코딩에 최적화된 높은 가독성과 대비를 갖춘 고정폭 글꼴.",
                previewText: "개발자 미학"
            },
            "fira-code": {
                description: "프로그래밍 합자(Ligature)와 또렷한 선명도를 제공하는 고정폭 서체.",
                previewText: "=> 프로그래밍 합자"
            },
            "playfair-display": {
                description: "유럽 계몽주의 인쇄물을 연상시키는 고대비 세리프 서체.",
                previewText: "에디토리얼 하이패션"
            },
            merriweather: {
                description: "장문 읽기에 쾌적하도록 설계된 따뜻하고 우아한 문학용 세리프.",
                previewText: "클래식 문학 세리프"
            }
        },
        errors: {
            invalidFormat: "올바르지 않은 글꼴 형식입니다. .ttf, .otf, .woff 또는 .woff2 파일을 업로드하세요.",
            tooLarge: "글꼴 파일이 너무 큽니다. 최대 지원 크기는 12MB입니다.",
            readFailed: "글꼴 파일을 읽지 못했습니다. 다른 파일로 시도해 주세요."
        },
        toasts: {
            presetSet: "앱 글꼴이 {name}(으)로 설정되었습니다",
            googleApplied: "Google 글꼴 \"{name}\"을(를) QBrowse에 적용했습니다",
            systemApplied: "시스템 글꼴 \"{name}\"을(를) 적용했습니다",
            fileLoaded: "사용자 글꼴 파일 \"{name}\"을(를) 불러왔습니다"
        }
    },
    aiSettings: {
        title: "llama.cpp AI 엔진",
        status: {
            online: "온라인 (llama-server)",
            starting: "시작 중...",
            updating: "엔진 업데이트 중...",
            error: "엔진 오류",
            stopped: "중지됨"
        },
        syncTitle: "네이티브 llama.cpp 엔진 확인 및 동기화 (Gemma 4 지원 b11796)",
        updatingBtn: "업데이트 중...",
        syncBtn: "엔진 동기화 (b11796)",
        subtitle: "Gemma 4, Qwen 3.5 및 Bielik 11B GGUF를 네이티브 지원하는 초고속 영지식 로컬 LLM 실행기.",
        downloadingModel: "모델 다운로드 중 ({progress}%)",
        connectingCdn: "CDN에 연결 중...",
        cancel: "취소",
        downloadBtn: "{name} 다운로드 ({size})",
        startingBtn: "llama-server 시작 중...",
        stopBtn: "llama-server 중지",
        startBtn: "llama-server 엔진 시작",
        defaultStartError: "모델을 시작하는 동안 llama-server에서 오류가 발생했습니다.",
        dismiss: "닫기",
        updateEngineBtn: "AI 엔진 업데이트",
        genSpeed: "생성 속도",
        tokPerSec: "tok/s",
        contextWindow: "컨텍스트 창",
        tokens: "토큰",
        gpuOffload: "GPU 오프로드",
        layers: "레이어",
        activeModelTitle: "활성 GGUF 모델",
        loadCustomGguf: "사용자 지정 .GGUF 불러오기...",
        loadCustomProjector: "사용자 지정 프로젝터 불러오기...",
        customModelPrefix: "사용자 지정 모델: {path}",
        customProjectorPrefix: "사용자 지정 프로젝터: {path}",
        reset: "재설정",
        downloadedBadge: "다운로드됨",
        downloadingTarget: "{target} 다운로드 중",
        visionProjector: "비전 프로젝터...",
        languageModel: "언어 모델...",
        weights: "가중치...",
        modelReady: "모델 사용 준비 완료",
        downloadModelFile: "모델 파일 다운로드 ({size})",
        overridesTitle: "llama-server 매개변수 재정의",
        autoDetectBtn: "하드웨어 자동 감지",
        cpuThreadsLabel: "CPU 스레드 (-t): {threads}",
        contextSizeLabel: "컨텍스트 크기 (-c)",
        tokensOption: "{n} 토큰",
        contextBadges: {
            compact: "컴팩트",
            default: "기본값",
            extended: "확장",
            max: "최대"
        },
        gpuLayersLabel: "GPU 오프로드 레이어 (-ngl): {layers}",
        dataProcessingTitle: "데이터 처리",
        parsePdfTitle: "PDF를 이미지로 분석",
        parsePdfDesc: "채팅에 PDF를 드롭할 때 원시 텍스트 대신 페이지를 이미지로 변환합니다. Gemma 4 및 Qwen 3.5 비전 모델이 차트와 레이아웃을 \"인식\"하는 데 적합합니다.",
        consoleTitle: "llama-server 터미널 콘솔 (실시간 Stdout)",
        copyOutputTitle: "터미널 출력 복사",
        clearConsoleTitle: "콘솔 지우기",
        consoleEmpty: "[llama-server 콘솔이 초기화되었습니다. 서버 시작 출력을 기다리는 중...]",
        modelWord: "모델",
        visionWord: "비전",
        models: {
            "gemma-4-e2b": "이미지 분석과 채팅을 위한 완전한 멀티모달 비전 지원 Google Gemma 4 E2B Instruct GGUF 모델.",
            "gemma-4-e4b": "복잡한 분석을 위한 완전한 멀티모달 비전 지원 고추론 Google Gemma 4 E4B 모델.",
            "qwen-3.5-4b": "멀티모달 비전, 추론, 코드 생성 및 다국어 이해를 지원하는 Alibaba Qwen 3.5 4B 모델.",
            "bielik-11b-v3.1": "깊이 있는 폴란드어 및 유럽 다국어 이해와 추론을 제공하는 SpeakLeash의 주력 11B 모델."
        },
        toasts: {
            customModelLoaded: "사용자 지정 모델 불러옴: {name}",
            demoModelLoaded: "데모 사용자 지정 모델 경로를 불러왔습니다!",
            customProjectorLoaded: "사용자 지정 비전 프로젝터 불러옴: {name}",
            demoProjectorLoaded: "데모 사용자 지정 프로젝터 경로를 불러왔습니다!",
            updatingEngine: "네이티브 llama.cpp 엔진 업데이트 중...",
            engineUpdated: "llama.cpp 엔진을 최신 빌드(b11796)로 업데이트했습니다!",
            engineUpdateFailed: "엔진 업데이트 실패: {error}",
            unknownError: "알 수 없는 오류",
            logsCopied: "llama-server 로그를 클립보드에 복사했습니다!",
            hardwareDetected: "하드웨어 자동 감지됨: {threads}스레드, {ram}GB RAM",
            hardwareDefault: "하드웨어 자동 감지됨: 기본 최적화 적용",
            resizingContext: "llama-server 컨텍스트 창을 {tokens}토큰으로 조정 중..."
        }
    },
    adblockImport: {
        title: "GitHub / 웹에서 차단 목록 가져오기",
        subtitle: "hosts 파일, GitHub raw 목록 또는 Adblock 규칙을 자동으로 파싱해 사용자 차단 목록에 추가합니다.",
        closeTitle: "닫기",
        modeUrl: "원격 URL / GitHub",
        modePaste: "원시 텍스트 붙여넣기",
        urlLabel: "차단 목록 URL (GitHub raw, Gist 또는 hosts URL)",
        githubRawBadge: "GitHub Raw",
        githubRawTitle: "GitHub 저장소 링크를 감지해 raw 형식으로 자동 변환했습니다",
        fetching: "가져오는 중...",
        fetchParse: "가져오기 및 파싱",
        popularLists: "인기 커뮤니티 차단 목록",
        pasteLabel: "hosts 파일, ABP 필터 규칙 또는 도메인 목록 붙여넣기",
        pastePlaceholder: "# 아래에 원하는 형식을 붙여넣으세요:\n0.0.0.0 tracking.evil.com\n127.0.0.1 ads.adserver.org\n||telemetry.network.io^\nanalytics.badsite.com",
        parsing: "파싱 중...",
        parseDomains: "도메인 파싱",
        back: "뒤로",
        backTitle: "소스 입력으로 돌아가기 (Esc)",
        readyToImport: "가져올 준비 완료",
        kbSource: "{kb} KB 소스",
        validDomains: "유효한 도메인",
        newUnique: "새 고유 도메인",
        duplicatesFiltered: "제외된 중복",
        linesAnalyzed: "분석된 줄 수",
        extractedSample: "추출된 도메인 샘플 ({count})",
        searchSamplePlaceholder: "샘플 검색...",
        moreDomains: "+ {count}개 도메인 더 있음",
        backToSource: "소스로 돌아가기",
        cancel: "취소",
        replaceList: "전체 목록 바꾸기",
        replaceListTitle: "기존 사용자 차단 목록을 파싱한 도메인으로 대체합니다",
        importN: "{count}개 도메인 가져오기",
        importDomains: "도메인 가져오기",
        pastedSourceLabel: "붙여넣은 텍스트",
        errors: {
            invalidUrl: "올바른 차단 목록 URL을 입력하세요.",
            fetchFailed: "원격 차단 목록을 가져오지 못했습니다",
            noValidFromUrl: "이 소스에서 유효한 도메인 이름을 파싱하지 못했습니다.",
            downloadError: "원격 목록 다운로드 오류",
            emptyPaste: "먼저 도메인이나 hosts 규칙을 붙여넣으세요.",
            noValidFromText: "텍스트에서 유효한 도메인 이름을 추출하지 못했습니다.",
            parseError: "텍스트 파싱 오류"
        },
        presets: {
            stevenblack: {
                desc: "커뮤니티가 관리하는 포괄적인 애드웨어 및 멀웨어 차단 목록.",
                badge: "추천"
            },
            "oisd-basic": {
                desc: "오탐 없이 모바일 및 웹 추적을 막는 가벼운 도메인 목록.",
                badge: "저부하"
            },
            "adguard-trackers": {
                desc: "분석 및 원격 측정 스크립트를 겨냥한 특화 도메인 차단 목록.",
                badge: "프라이버시"
            },
            peterlowe: {
                desc: "오랫동안 검증된 활성 광고 서버 표준 일반 목록.",
                badge: "빠름"
            },
            danpollock: {
                desc: "원격 측정, 유해 사이트 및 스팸 네트워크를 차단하는 신뢰받는 zero-host 목록.",
                badge: "클래식"
            }
        }
    },
    studio: {
        title: "프리셋 스튜디오",
        subtitle: "컴포넌트 도킹 위치를 시각적으로 바꾸고, 곡률을 다듬으며, 테마와 사용자 프리셋을 관리하세요.",
        tabCanvas: "캔버스",
        tabPresets: "프리셋",
        closeAria: "프리셋 스튜디오 닫기",
        dockLeftSidebar: "사이드바를 왼쪽에 도킹",
        dockRightSidebar: "사이드바를 오른쪽에 도킹",
        dockTopBar: "탐색 표시줄을 상단에 도킹",
        dockBottomBar: "탐색 표시줄을 하단에 도킹",
        searchBarPlaceholder: "웹 검색 또는 명령 입력...",
        toolhubDockTitle: "ToolHub 도킹: {pos} (클릭하거나 끌어다 교체)",
        legendDock: "도킹:",
        legendBarValue: "{pos} 표시줄",
        legendSidebar: "사이드바:",
        legendToolhub: "ToolHub:",
        legendSummary: "곡률: {curvature} · Omnibox: {omnibox} · 탭: {tabs}",
        layoutControls: "레이아웃 컨트롤",
        resetTitle: "현재 브라우저 설정으로 초안 재설정",
        reset: "재설정",
        editingLabel: "편집 중:",
        cancelEditTitle: "편집 취소하고 새 프리셋 만들기",
        cancel: "취소",
        sidebarMode: "사이드바 모드",
        sidebarModes: {
            classic: "클래식",
            floating: "플로팅",
            compact: "컴팩트",
            hidden: "숨김"
        },
        windowCurvature: "창 곡률",
        curvatures: {
            default: "기본값",
            cohesive: "일체형",
            square: "직각"
        },
        omniboxArch: "Omnibox 구조",
        omniboxStyles: {
            capsule: "캡슐형",
            wide: "와이드",
            minimal: "미니멀"
        },
        tabPresentation: "탭 표시 방식",
        tabStyles: {
            pills: "알약형",
            compact: "컴팩트",
            cards: "카드형"
        },
        windowControlsStyle: "창 제어 버튼 스타일",
        controlsStyles: {
            mac: "macOS",
            windows: "Windows",
            minimal: "미니멀"
        },
        windowControlsLayout: "창 제어 버튼 배치",
        controlsOrders: {
            auto: "스마트 코너",
            "close-first": "닫기 우선",
            "minimize-first": "최소화 우선"
        },
        themeLabel: "테마",
        themes: {
            dark: "다크",
            light: "라이트"
        },
        uiScaleLabel: "UI 배율",
        uiScales: {
            comfortable: "일반",
            compact: "컴팩트"
        },
        accentSwatchLabel: "강조 색상 견본",
        openColorPickerTitle: "시스템 색상 선택기 열기",
        saveChanges: "변경 사항 저장",
        applyLive: "실시간 적용",
        saveAsNew: "새로 저장",
        applyToBrowser: "브라우저에 적용",
        saveAsCustom: "사용자 프리셋으로 저장",
        searchPresetsPlaceholder: "프리셋 검색...",
        filterAll: "전체",
        filterBuiltin: "내장",
        filterCustom: "사용자 지정 ({count})",
        saveActiveSetup: "현재 브라우저 구성 저장",
        activeBadge: "활성",
        editingBadge: "(편집 중)",
        reapply: "다시 적용",
        apply: "적용",
        editInStudio: "스튜디오에서 편집",
        customize: "사용자 지정",
        editPresetTitle: "스튜디오에서 프리셋 편집",
        customizePresetTitle: "스튜디오에서 레이아웃 조정",
        duplicateTitle: "프리셋 복제",
        deleteTitle: "사용자 프리셋 삭제",
        editCustomModalTitle: "사용자 프리셋 편집",
        saveCustomModalTitle: "사용자 프리셋으로 저장",
        presetNameLabel: "프리셋 이름",
        presetNamePlaceholder: "예: 인체공학 워크플로, 미니멀 Arc",
        presetDescLabel: "태그라인 / 설명",
        presetDescPlaceholder: "이 구성에 대한 간단한 설명...",
        presetIconLabel: "프리셋 아이콘",
        createPreset: "프리셋 만들기",
        deleteConfirmTitle: "사용자 프리셋을 삭제할까요?",
        deleteConfirmDescBefore: "정말로 ",
        deleteConfirmDescAfter: "을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
        deletePresetBtn: "프리셋 삭제",
        posTop: "상단",
        posBottom: "하단",
        posLeft: "왼쪽",
        posRight: "오른쪽",
        moveTo: "{pos}(으)로 이동",
        draggableNavTitle: "드래그 가능한 탐색 표시줄: 상단 또는 하단 영역으로 드래그하거나 교체 클릭",
        draggableSidebarTitle: "드래그 가능한 사이드바: 왼쪽과 오른쪽 도킹 영역 사이로 드래그",
        swapTo: "{pos}(으)로 전환",
        miniTab: "탭 #{num}",
        miniCardView: "카드 뷰 #{num}",
        miniActiveSpaceTab: "활성 공간 탭",
        miniSidebarPos: "사이드바 ({pos})",
        layoutTagFormat: "{bar} · {sidebar}",
        layoutSummaryFormat: "{tag} · {toolhub}",
        topBarLabel: "상단 표시줄",
        bottomBarLabel: "하단 표시줄",
        leftSidebarLabel: "왼쪽 사이드바",
        rightSidebarLabel: "오른쪽 사이드바",
        leftToolhubLabel: "왼쪽 ToolHub",
        rightToolhubLabel: "오른쪽 ToolHub",
        tabsHighlight: "{style} 탭",
        compactScaleLabel: "컴팩트 배율",
        comfortableScaleLabel: "여유로운 배율",
        defaultCustomName: "사용자 프리셋",
        defaultCustomDesc: "사용자 지정 구성",
        defaultNewNameFormat: "{bar} {side}",
        defaultNewNameArc: "Arc",
        defaultNewNameFlow: "Flow",
        defaultNewDescFormat: "사용자 레이아웃: {bar}, {sidebar}, {tabs} 탭",
        toasts: {
            applied: "레이아웃을 브라우저에 적용했습니다!",
            reset: "스튜디오 초안을 현재 브라우저 구성으로 재설정했습니다",
            editingPreset: "스튜디오에서 \"{name}\" 편집 중",
            loadedPreset: "스튜디오 캔버스에 \"{name}\"을(를) 불러왔습니다",
            switchedNewDraft: "새 초안으로 전환했습니다"
        }
    },
    setup: {
        strictOfflineTitle: "백그라운드 요청 없음 (엄격한 오프라인)",
        strictOfflineDesc: "모든 선택적 백그라운드 네트워크 트래픽(업데이트 확인, 필터 새로고침, 실시간 추천, 원격 파비콘, 클라우드 동기화)을 비활성화합니다.",
        headerTitle: "QBrowse 설정",
        headerSubtitle: "개인화 도우미",
        steps: {
            language: {
                label: "언어",
                desc: "인터페이스 언어"
            },
            presets: {
                label: "프리셋 & 스타일",
                desc: "환경 및 스타일"
            },
            import: {
                label: "가져오기",
                desc: "북마크 & 비밀번호"
            },
            privacy: {
                label: "프라이버시",
                desc: "방패 & Tor"
            },
            default: {
                label: "기본 앱",
                desc: "시스템 통합"
            },
            sync: {
                label: "동기화 & 계정",
                desc: "클라우드 또는 로컬"
            }
        },
        chooseSetupTitle: "구성을 선택하세요",
        chooseSetupDesc: "시작할 맞춤형 레이아웃을 선택하세요. 모든 패널은 언제든지 바꿀 수 있습니다.",
        customLayoutCta: "직접 구성하시겠어요? 프리셋 스튜디오 →",
        themeLabel: "테마",
        dark: "다크",
        light: "라이트",
        accentLabel: "강조색",
        step2Badge: "5단계 중 2단계",
        step2Title: "데이터 및 금고 가져오기",
        step2Desc: "북마크를 가져오고 Bitwarden, Proton Pass, Chrome 또는 Firefox의 비밀번호를 이전하세요.",
        tabBookmarks: "북마크",
        tabVault: "비밀번호 금고",
        bookmarksFound: "북마크 {count}개 발견",
        notDetected: "이 기기에서 감지되지 않음",
        imported: "가져옴",
        importing: "가져오는 중...",
        importBookmarks: "북마크 가져오기",
        scanningBrowsers: "설치된 브라우저 스캔 중...",
        htmlImported: "HTML 파일 가져옴 ({count}개 항목)",
        uploadHtml: "북마크 HTML 파일 업로드 (.html)",
        vaultComplete: "금고 마이그레이션 완료",
        vaultImportedSummary: "{source}에서 {count}개 항목을 QVault로 가져왔습니다!",
        importAnother: "다른 파일 가져오기",
        exportCsvJson: ".CSV 또는 .JSON으로 내보내기",
        parsingVault: "금고 파일 분석 중...",
        uploadVault: "금고 내보내기 파일 업로드 (.csv 또는 .json)",
        compatibleManagers: "Bitwarden, Proton Pass, Google Chrome, Edge, Brave, 1Password와 호환",
        step3Badge: "5단계 중 3단계",
        step3Title: "개인정보 보호 강화",
        step3Desc: "QBrowse는 추적 스크립트를 차단하고 성가신 광고를 제거하며 Tor 네트워크를 통해 트래픽을 라우팅합니다.",
        privacyOptimizedBadge: "프리셋: 프라이버시 최우선 최적화",
        adblockTitle: "Ghostery 네이티브 추적기 방패",
        adblockDesc: "페이지 속도를 늦추지 않고 추적기, 원격 측정, 분석 및 광고를 차단합니다.",
        torTitle: "Tor 어니언 라우팅 공간",
        torDesc: "언제든지 .onion 다크웹 탐색과 다중 노드 암호화 중계 회로를 사용할 수 있습니다.",
        ready: "준비됨",
        step4Badge: "5단계 중 4단계",
        step4Title: "기본 브라우저로 설정",
        step4Desc: "데스크톱 링크를 격리된 공간에서 열어 업무와 개인 탐색을 자동으로 분리하세요.",
        isDefaultTitle: "QBrowse가 기본 브라우저입니다!",
        makeDefaultTitle: "QBrowse를 기본 웹 브라우저로 지정",
        isDefaultDesc: "모든 데스크톱 링크와 웹 파일이 자동으로 QBrowse에서 열립니다.",
        makeDefaultDesc: "깊은 OS 통합으로 모든 http://, https:// 및 HTML 파일을 처리합니다.",
        osLabels: {
            darwin: "시스템 설정",
            linux: "기본 애플리케이션",
            win32: "Windows 기본 앱"
        },
        defaultHint: "{label}이(가) 열렸습니다 — 시스템 창에서 QBrowse를 선택해 확인하세요.",
        openOsSettings: "{label} 열기",
        defaultSet: "기본 브라우저 설정됨",
        openingSettings: "설정 여는 중...",
        setAsDefault: "기본 브라우저로 설정",
        step5Badge: "5단계 중 5단계 • 프로필 및 클라우드 동기화",
        step5Title: "탐색 방식 선택",
        step5Desc: "QBrowse는 완전한 주권을 제공합니다. 로컬 하드웨어 암호화로 완전히 오프라인 탐색하거나, 무료 Cloud Sync 계정을 만들어 기기 간 금고와 공간을 동기화하세요.",
        zeroTelemetry: "원격 측정 없음",
        localProfile: "로컬 프로필",
        localProfileDesc: "100% 오프라인. 모든 비밀번호, 기록, 워크스페이스 탭은 로컬 하드웨어 키로 이 기기에만 암호화됩니다. 계정이 필요 없습니다.",
        e2eEncrypted: "종단 간 암호화",
        cloudSync: "QBrowse 클라우드 동기화",
        cloudSyncDesc: "Firebase를 통해 모든 컴퓨터에서 비밀번호 금고, 워크스페이스, 고정 탭, 북마크를 끊김 없이 동기화합니다.",
        localReadyTitle: "로컬 프로필을 시작할 준비가 되었습니다",
        localReadyDesc: "모든 북마크, 금고 자격 증명 및 워크스페이스는 원격 측정 없이 이 컴퓨터에만 보관됩니다. 언제든 설정이나 프로필 메뉴에서 클라우드 동기화를 켤 수 있습니다.",
        takeTour: "라이브 투어 시작",
        startDirectly: "바로 탐색 시작",
        activeSync: "활성 동기화",
        cloudLinked: "종단 간 암호화 클라우드 저장소 연결됨",
        signOut: "로그아웃",
        activeSyncDesc: "북마크, 워크스페이스 탭 및 암호화된 비밀번호 금고가 인증된 모든 기기와 실시간으로 지속 동기화됩니다.",
        signIn: "로그인",
        existingAccount: "(기존 계정)",
        register: "회원가입",
        newAccount: "(새 계정)",
        registerSubtitle: "기기 간 데이터를 동기화할 새 QBrowse 계정을 만드세요.",
        signInSubtitle: "로그인하여 기존 북마크, 공간 및 금고를 동기화하세요.",
        switchToSignIn: "로그인으로 전환",
        emailLabel: "이메일 주소",
        emailPlaceholder: "name@example.com",
        createPassLabel: "비밀번호 생성 (최소 6자)",
        accountPassLabel: "계정 비밀번호",
        min6Chars: "최소 6자 이상",
        confirmPassLabel: "비밀번호 확인",
        passwordsMatch: "비밀번호가 일치합니다",
        passwordsMismatch: "비밀번호가 일치하지 않습니다",
        useAccountAsMaster: "계정 비밀번호를 마스터 암호화 키로 사용",
        masterDerivedDesc: "로그인 비밀번호에서 직접 AES-GCM 256비트 클라이언트 키를 파생합니다.",
        masterSeparateDesc: "별도의 사용자 지정 암호화 암호문을 사용합니다.",
        customMasterLabel: "사용자 지정 마스터 암호문",
        customMasterPlaceholder: "고유한 금고 암호화 암호문을 입력하세요...",
        creatingAccount: "암호화된 계정 생성 중...",
        signingInSyncing: "로그인 및 동기화 중...",
        createAccountBtn: "계정 생성 및 동기화 켜기",
        signInBtn: "로그인 및 동기화 켜기",
        alreadyRegistered: "이미 QBrowse에 가입하셨나요?",
        signInHere: "여기서 로그인",
        newToSync: "QBrowse 클라우드 동기화가 처음이신가요?",
        createFreeAccount: "무료 계정 만들기 (회원가입)",
        skipSyncLocal: "클라우드 동기화 건너뛰고 로컬 프로필로 계속 (계정 불필요)",
        skipSyncComplete: "동기화 건너뛰고 완료",
        vaultModalTitle: "가져온 금고 보호",
        vaultModalDesc: "자격 증명을 암호화할 마스터 비밀번호를 입력하거나 새로 만드세요.",
        masterPassLabel: "마스터 비밀번호",
        masterPassPlaceholder: "마스터 비밀번호 입력...",
        confirmMasterLabel: "마스터 비밀번호 확인",
        confirmMasterPlaceholder: "비밀번호 확인...",
        cancel: "취소",
        encryptImport: "암호화 후 가져오기",
        bookmarkFallback: "북마크",
        htmlFileFallback: "HTML 파일",
        toasts: {
            enterEmail: "이메일 주소를 입력하세요.",
            validEmail: "올바른 이메일 주소를 입력하세요 (예: name@domain.com).",
            passMin6: "비밀번호는 최소 6자 이상이어야 합니다.",
            confirmPassReq: "비밀번호를 확인해 주세요.",
            passMismatch: "비밀번호가 일치하지 않습니다. 다시 입력하세요.",
            signedIn: "QBrowse 클라우드 동기화에 로그인했습니다!",
            registered: "계정 등록 및 클라우드 동기화가 활성화되었습니다!",
            bookmarksImported: "북마크 {count}개를 성공적으로 가져왔습니다!",
            importFailed: "가져오기에 실패했습니다.",
            couldNotImportBookmarks: "북마크를 가져오지 못했습니다.",
            htmlImported: "{filename}에서 북마크 {count}개를 가져왔습니다!",
            htmlImportFailed: "HTML 북마크 가져오기에 실패했습니다.",
            noCredentials: "파일에서 자격 증명을 찾지 못했습니다",
            passwordsImported: "{source}에서 비밀번호 {count}개를 가져왔습니다!",
            vaultImportFailed: "가져오기 실패: {error}",
            passMin4: "비밀번호는 최소 4자 이상이어야 합니다",
            vaultPassMismatch: "비밀번호가 일치하지 않습니다",
            incorrectMasterPass: "기존 금고의 마스터 비밀번호가 올바르지 않습니다",
            vaultImportError: "가져오기 오류: {error}",
            nowDefault: "QBrowse가 이제 기본 브라우저입니다!",
            openingWinDefault: "Windows 기본 앱을 여는 중입니다. QBrowse의 \"기본값 설정\"을 클릭하세요.",
            openingOsDefault: "{label}을(를) 여는 중입니다. QBrowse를 기본 브라우저로 선택하세요.",
            couldNotOpenDefault: "기본 브라우저 설정을 열지 못했습니다."
        }
    },
    flags: {
        title: "실험실",
        subtitle: "실험적 브라우저 기능, 하드웨어 그래픽 파이프라인, 양자 내성 암호, Tor 스트림 격리 매개변수를 미세 조정합니다.",
        resetAll: "모두 기본값으로 재설정",
        warningTitle: "주의: 실험적 기능 사용 경고",
        warningBody: "이 실험적 스위치를 활성화하면 Chromium V8 실행, 하드웨어 컴포지팅 또는 TLS 매개변수가 변경됩니다. 변경 사항을 적용하려면 재시작해야 합니다.",
        searchPlaceholder: "플래그 검색 (예: GPU, Kyber, QUIC, DoH, bfcache)...",
        tabAvailable: "사용 가능 ({count})",
        tabUnavailable: "사용 불가 ({count})",
        categories: {
            All: "전체",
            Performance: "성능",
            "Hardware & Graphics": "하드웨어 및 그래픽",
            "Web Standards & Engine": "웹 표준 및 엔진",
            Security: "보안",
            Networking: "네트워크",
            "Media & UI": "미디어 및 UI",
            "AI & Tools": "AI 및 도구",
            Experimental: "실험실"
        },
        statuses: {
            Stable: "안정화",
            Beta: "베타",
            Experimental: "실험적"
        },
        options: {
            default: "기본값",
            enabled: "사용",
            disabled: "사용 안 함"
        },
        emptyMatch: "\"{search}\"와 일치하는 사용 가능 플래그 없음",
        reasonPrefix: "사유: {reason}",
        unavailableBadge: "사용 불가",
        relaunchMsg: "변경 사항은 다음에 QBrowse를 다시 시작할 때 적용됩니다.",
        relaunchBtn: "다시 시작",
        toasts: {
            reset: "모든 실험적 플래그가 기본값으로 복원되었습니다",
            relaunching: "업데이트된 플래그로 QBrowse를 다시 시작하는 중..."
        },
        items: {
            "prefer-high-performance-gpu": {
                name: "고성능 GPU 우선 사용",
                description: "다중 GPU 시스템에서 WebGL, Canvas, 3D 렌더링을 외장 GPU로 보냅니다. 절전 모드에서는 배터리 절약을 위해 자동 비활성화됩니다."
            },
            "unlock-frame-rate": {
                name: "프레임 속도 제한 해제 (벤치마크 모드)",
                description: "합성 Canvas/WebGL FPS 벤치마크를 위해 V-Sync 및 프레임 제한을 끕니다. 일반 탐색 시 화면 찢어짐과 전력 소모가 늘 수 있습니다."
            },
            "ignore-gpu-blocklist": {
                name: "GPU 차단 목록 무시",
                description: "Chromium 기본 소프트웨어 렌더링 목록을 무시하고 구형 또는 미분류 그래픽 드라이버에서도 하드웨어 가속을 강제합니다."
            },
            "experimental-web-platform": {
                name: "실험적 웹 플랫폼 기능",
                description: "Chromium에서 개발 중인 실험적 웹 플랫폼 기능을 켭니다. HTML5Test 호환성이 오르지만 일부 최신 API는 불안정할 수 있습니다."
            },
            "gpu-rasterization": {
                name: "GPU 래스터화 및 컴포지터 가속",
                description: "CPU 소프트웨어 렌더링 대신 전용 GPU 파이프라인으로 웹페이지 래스터화와 합성을 가속합니다."
            },
            "smooth-scrolling": {
                name: "부드러운 스크롤 엔진",
                description: "마우스 휠, 터치패드 또는 방향키로 스크롤할 때 유려한 물리적 감속 애니메이션을 적용합니다."
            },
            "zero-copy-rasterizer": {
                name: "제로 카피 GPU 래스터라이저 (GpuMemoryBuffer)",
                description: "래스터 워커가 CPU 메모리 복사 단계 없이 공유 GPU 텍스처에 직접 기록해 메모리 대역폭 경합을 줄입니다."
            },
            "enable-vulkan": {
                name: "Vulkan 그래픽 및 컴포지팅 백엔드",
                description: "지원되는 GPU에서 합성과 렌더링 파이프라인에 크로스 플랫폼 Vulkan 그래픽 API를 사용합니다."
            },
            "back-forward-cache": {
                name: "뒤로-앞으로 캐시 (bfcache)",
                description: "최근 방문한 웹페이지의 실행 스냅샷을 메모리에 보존해 즉시 뒤로/앞으로 이동할 수 있습니다."
            },
            "canvas-oop-rasterization": {
                name: "프로세스 외부 2D Canvas 래스터화",
                description: "HTML5 2D Canvas 렌더링을 샌드박스 렌더러 대신 전용 GPU 프로세스에서 수행합니다."
            },
            "enable-drdc": {
                name: "동적 고주사율 감지 (120Hz/144Hz/240Hz)",
                description: "ProMotion 및 고주사율 게이밍 디스플레이에 맞춰 프레임 페이싱과 V-Sync 간격을 동적으로 동기화합니다."
            },
            "auto-suspend-tabs": {
                name: "메모리 절약 자동 탭 일시 중지 (V8 GC 조절)",
                description: "15분 이상 비활성 상태인 백그라운드 탭을 자동으로 언로드해 RAM과 배터리를 크게 절약합니다."
            },
            "parallel-download-engine": {
                name: "병렬 멀티스레드 범위 다운로드",
                description: "대용량 파일 다운로드를 여러 병렬 HTTP 범위 요청으로 분할해 대역폭 활용도와 전송 속도를 극대화합니다."
            },
            "lazy-image-loading": {
                name: "지연 이미지 및 임베디드 프레임 로딩",
                description: "화면 밖 이미지와 서드파티 iframe을 스크롤해 보일 때까지 지연 로드해 초기 페이지 부하를 줄입니다."
            },
            "enable-tls13-kyber": {
                name: "TLS용 양자 내성 암호화 (Kyber768 / ML-KEM)",
                description: "TLS 1.3 핸드셰이크에 양자 내성 하이브리드 키 캡슐화(X25519Kyber768)를 적용해 미래 양자 해독 위협으로부터 트래픽을 보호합니다."
            },
            "enable-encrypted-client-hello": {
                name: "암호화된 Client Hello (ECH / Encrypted SNI)",
                description: "TLS 핸드셰이크 내부의 SNI를 암호화해 ISP, 방화벽 및 네트워크 감청으로부터 방문 도메인을 숨깁니다."
            },
            "strict-origin-isolation": {
                name: "엄격한 출처별 프로세스 샌드박싱",
                description: "고유 출처마다 격리된 가상 메모리를 가진 전용 OS 프로세스를 강제해 Spectre 및 Meltdown 취약점을 완화합니다."
            },
            "webrtc-ip-protection": {
                name: "WebRTC 로컬 IP 및 STUN 유출 차단",
                description: "WebRTC ICE 후보를 제한해 악성 스크립트가 사용자의 실제 로컬 LAN 또는 공인 IP를 열거하지 못하게 합니다."
            },
            "enable-dns-over-https": {
                name: "엄격한 DNS-over-HTTPS (Cloudflare/Quad9)",
                description: "모든 DNS 조회를 HTTPS(443 포트)로 암호화해 ISP 도청, DNS 하이재킹 및 도메인 변조를 차단합니다."
            },
            "disable-hyperlink-auditing": {
                name: "하이퍼링크 감사(<a ping>) 및 비콘 차단",
                description: "링크 클릭 시 웹사이트가 몰래 추적 POST 요청을 전송하지 못하게 막습니다."
            },
            "enable-fingerprint-randomization": {
                name: "HTML5 Canvas 및 WebAudio 지문 노이즈 주입",
                description: "픽셀 및 오디오 버퍼 값에 암호학적 의사 난수 노이즈를 미세하게 섞어 하드웨어 지문 추적을 무력화합니다."
            },
            "enable-font-enumeration-shield": {
                name: "로컬 글꼴 열거 및 쿼리 차단",
                description: "웹 앱이 시스템에 설치된 글꼴 목록을 탐색해 브라우저 고유 식별 해시를 만드는 것을 방지합니다."
            },
            "aggressive-tracker-blocker": {
                name: "강력한 광고 및 URL 추적 매개변수 제거 엔진",
                description: "utm_source, gclid, fbclid, msclkid 등의 추적 쿼리를 제거하고 알려진 추적 픽셀을 차단합니다."
            },
            "enable-subresource-filter": {
                name: "악성 및 기만적 삽입 광고 필터",
                description: "신뢰할 수 없는 사이트의 클릭재킹, 투명 오버레이 링크 및 가짜 다운로드 창을 자동으로 차단합니다."
            },
            "enable-quic": {
                name: "실험적 QUIC 및 HTTP/3 전송 프로토콜",
                description: "Zero-RTT 핸드셰이크와 HOL 블로킹 없는 다중 스트림 전송을 위한 UDP 기반 HTTP/3를 사용합니다."
            },
            "tor-stream-isolation": {
                name: "Tor 도메인별 스트림 회로 격리 (IsolateDestAddr)",
                description: "Tor 공간의 각 최상위 도메인이 서로 다른 출구 회로를 거치도록 강제해 교차 사이트 상관 추적을 막습니다."
            },
            "dns-prefetching": {
                name: "예측 DNS 사전 확인 엔진",
                description: "현재 페이지에 보이는 링크의 IP 주소를 미리 확인해 클릭 시 DNS 지연 시간을 줄입니다."
            },
            "heavy-ad-intervention": {
                name: "고부하 네트워크 광고 리소스 차단",
                description: "네트워크 대역폭 4MB 또는 CPU 시간 60초를 초과하는 광고 iframe을 자동으로 언로드합니다."
            },
            "cross-origin-isolation": {
                name: "COOP 및 SharedArrayBuffer 지원",
                description: "엄격한 Cross-Origin Opener/Embedder 정책을 통해 고정밀 WebAssembly 공유 메모리 연산을 활성화합니다."
            },
            "document-pip-api": {
                name: "Document Picture-in-Picture API",
                description: "임의의 HTML 문서, 동영상, 커스텀 플레이어 및 위젯을 담을 수 있는 플로팅 PIP 창을 지원합니다."
            },
            "force-dark-contents": {
                name: "웹 콘텐츠 자동 다크 모드 (Chromium 반전)",
                description: "밝은 배경만 지원하는 웹사이트에 밝기 보존 색상 반전을 적용해 자동으로 다크 테마를 생성합니다."
            },
            "overlay-scrollbars": {
                name: "미니멀 플로팅 오버레이 스크롤바",
                description: "두꺼운 OS 기본 스크롤바를 스크롤 중지 시 자동으로 사라지는 매끄러운 플로팅 표시줄로 대체합니다."
            },
            "enable-webgpu": {
                name: "차세대 WebGPU 그래픽 및 컴퓨트 API",
                description: "브라우저 내 신경망, 3D 시뮬레이션 및 셰이더 연산을 위한 저오버헤드 직접 GPU 접근을 제공합니다."
            },
            "tab-audio-muting": {
                name: "원클릭 탭 오디오 음소거 표시기",
                description: "활성 탭 버튼에 대화형 스피커 배지를 추가해 한 번의 클릭으로 즉시 오디오를 음소거할 수 있습니다."
            },
            "webrtc-pipewire": {
                name: "PipeWire 데스크톱 캡처러 (Linux Wayland)",
                description: "최신 Linux 데스크톱 환경(GNOME, KDE Plasma)에서 PipeWire 포털을 통한 화면 공유를 지원합니다."
            },
            "hdr-compositing": {
                name: "HDR(High Dynamic Range) 색상 컴포지팅",
                description: "호환 OLED 및 mini-LED 디스플레이에서 10비트 광색역(Rec.2020 / DCI-P3)과 HDR 톤 매핑을 활성화합니다."
            },
            "local-ai-assistant": {
                name: "로컬 GGUF LLM VRAM 가속 (llama.cpp)",
                description: "프라이빗 저지연 요약 및 질의를 위해 온디바이스 Gemma 및 Llama 3 모델 가중치를 GPU VRAM에 직접 올립니다."
            },
            "experimental-split-screen-gestures": {
                name: "키네틱 분할 화면 창 및 스냅 제스처",
                description: "탭을 뷰포트 가장자리로 끌어다 놓아 즉시 가로 또는 세로 이중 창 탐색 세션을 만듭니다."
            },
            "enable-reader-mode": {
                name: "방해 요소 없는 기사 읽기 모드",
                description: "사이드바, 광고 및 복잡한 요소를 제거하고 기사 본문을 높은 가독성의 레이아웃으로 추출합니다."
            },
            "auto-password-generation": {
                name: "암호학적 강력 비밀번호 자동 생성",
                description: "회원가입 양식을 자동 감지해 QVault로 보호되는 128비트 암호학적으로 안전한 비밀번호를 제안합니다."
            },
            "tab-groups-auto-clustering": {
                name: "스마트 도메인 및 워크스페이스 탭 클러스터링",
                description: "동일 출처 도메인과 워크스페이스 사용 패턴을 기반으로 열린 탭을 지능적으로 그룹화하도록 제안합니다."
            },
            "touch-ui-layout": {
                name: "터치스크린 태블릿 UI 모드",
                description: "터치 중심 투인원 기기를 위해 탭 높이 및 터치 영역을 넓힙니다. 데스크톱에서는 비활성화됩니다.",
                reason: "터치 디지타이저 하드웨어 감지가 필요합니다."
            },
            "eye-tracking-gaze-scroll": {
                name: "시선 추적(Eye-Tracking) 스크롤 내비게이션",
                description: "동공 시선 좌표를 기반으로 화면을 스크롤합니다. 전용 적외선 하드웨어 센서가 필요합니다.",
                reason: "지원되는 시선 추적 센서가 감지되지 않았습니다."
            },
            "cellular-data-saver": {
                name: "모바일 요금제 데이터 절약기",
                description: "외부 프록시 게이트웨이를 통해 원격 이미지를 압축합니다. 프록시 복호화를 막기 위해 비활성화되었습니다.",
                reason: "Tor 및 HTTPS 종단 간 프라이버시를 보호하기 위해 기본 비활성화되었습니다."
            }
        }
    }
};

export default {
    en, pl, fr, de, es, pt, zh, ja, ru, it, uk, ko
};

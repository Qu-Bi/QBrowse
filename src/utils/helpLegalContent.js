export const QBROWSE_META = {
    name: 'QBrowse',
    version: '1.4.3',
    author: 'QuBI',
    contactEmail: 'qu@qubirpi3b.tk',
    license: 'MIT',
    lastUpdated: 'November 2026'
};

const HELP_LEGAL_ROUTE_MAP = {
    help: 'help',
    shortcuts: 'shortcuts',
    terms: 'terms',
    tos: 'terms',
    privacy: 'privacy',
    licenses: 'licenses',
    credits: 'licenses'
};

const HELP_LEGAL_TITLE_MAP = {
    help: 'QBrowse Help Center',
    shortcuts: 'Keyboard Shortcuts',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    licenses: 'Open-Source Licenses'
};

export function resolveHelpLegalTabFromUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim().toLowerCase();
    if (!trimmed.startsWith('qbrowse://')) return null;
    const slug = trimmed.replace(/^qbrowse:\/\//, '').split(/[/?#]/)[0];
    return HELP_LEGAL_ROUTE_MAP[slug] || null;
}

export function getHelpLegalPageTitle(url) {
    const tab = resolveHelpLegalTabFromUrl(url);
    return tab ? (HELP_LEGAL_TITLE_MAP[tab] || 'QBrowse') : null;
}

export const HELP_TOPICS = [
    {
        id: 'spaces-pins',
        title: 'Spaces & Per-Space Pinned Apps',
        badge: 'Personal · Work · Custom',
        summary: 'Organize browsing into isolated Spaces with independent tab lists and pinned app bars.',
        tips: [
            'Each Space (Personal, Work, and Custom Spaces) keeps its own Pinned Apps in the sidebar.',
            'Pinned Apps stay on their own domain; external links open in a new regular tab.',
            'Press Ctrl+W on a Pinned App to unload its live tab while keeping the pin icon ready.'
        ]
    },
    {
        id: 'split-groups',
        title: 'Multiple Split Groups & 2×2 Quad Split',
        badge: 'Ctrl+\\ · Ctrl+Shift+\\',
        summary: 'Run 2-Col, 2-Row, or 2×2 Quad Split layouts and keep multiple Split Groups in the same space.',
        tips: [
            'Click any inactive Split Group in the sidebar or cycle with Ctrl+Tab to switch instantly.',
            'Double-click a Split Group header (or click the pencil icon) to rename it.',
            'Clicking, scrolling, or typing in any pane auto-focuses it for the TopBar URL and shortcuts.'
        ]
    },
    {
        id: 'ghost-tor',
        title: 'Ghost Incognito & Tor Onion Mode',
        badge: 'Zero Persistence',
        summary: 'Browse ephemerally in Ghost Mode or route traffic through the Tor network.',
        tips: [
            'Ghost and Tor tabs, history, cookies, and Split Groups are never saved to disk or synced.',
            'Leaving Ghost or Tor automatically clears its session data and in-memory state.',
            'Use Tor security levels in Settings to harden JavaScript and media policies.'
        ]
    },
    {
        id: 'omnibox-commands',
        title: 'Command Omnibox & Quick Commands',
        badge: 'Ctrl+K · >help',
        summary: 'Search the web, jump to open tabs, or run browser commands directly from the Omnibox.',
        tips: [
            'Type > to run commands like >split, >settings, >history, >help, >terms, or >privacy.',
            'Use search bangs (e.g. !g, !yt, !gh, !w) to query specific engines immediately.',
            'Enter local paths (e.g. C:\\Users or file:///) to browse folders and files directly.'
        ]
    },
    {
        id: 'local-files',
        title: 'Local File, Markdown & PDF Viewer',
        badge: 'Ctrl+O · Drag & Drop',
        summary: 'Inspect PDFs, Markdown, code, images, audio, video, and folders in-tab.',
        tips: [
            'Drag and drop files into QBrowse or press Ctrl+O to open local files and folders.',
            'Glass PDF Viewer includes zoom, rotation, dark-invert reading, and Qu-AI summarization.',
            'Local HTML files render natively inside a sandboxed tab.'
        ]
    },
    {
        id: 'ai-reader-eraser',
        title: 'Qu-AI, Reader Mode & Element Eraser',
        badge: 'Ctrl+J · Ctrl+Alt+R',
        summary: 'Summarize pages with local Gemma AI, strip clutter with Reader Mode, or hide page elements.',
        tips: [
            'Press Ctrl+J to open the Tool Hub for Qu-AI chat, page notes, and downloads.',
            'Press Ctrl+Alt+R on articles for distraction-free typography and Read Aloud.',
            'Press Ctrl+Shift+X to activate Element Eraser and hide unwanted page overlays.'
        ]
    },
    {
        id: 'profiles-sync',
        title: 'Profiles & Encrypted Cloud Sync',
        badge: 'AES-GCM Encrypted',
        summary: 'Keep separate browser profiles locally or sync tabs, pins, settings, and vault encrypted.',
        tips: [
            'Cloud Sync is strictly optional; QBrowse works 100% offline in Guest Mode.',
            'Sync data is encrypted client-side with your Master Password before leaving your device.',
            'Manage profiles, backups, and Firebase configuration in Settings or User Profile.'
        ]
    },
    {
        id: 'troubleshooting',
        title: 'Troubleshooting & Internal Pages',
        badge: 'F1 · qbrowse://flags',
        summary: 'Quick ways to diagnose performance, clear site data, or customize experimental flags.',
        tips: [
            'Open qbrowse://flags to toggle hardware acceleration, eco mode, or experimental options.',
            'Press Shift+Esc to open the Resource & Task Manager to suspend or inspect heavy tabs.',
            'Use Ctrl+Shift+R for a hard reload that purges cache for the active pane.'
        ]
    }
];

export const TERMS_OF_SERVICE_SECTIONS = [
    {
        id: 'acceptance',
        title: '1. Acceptance & MIT Open-Source License',
        body: 'QBrowse is free, open-source software released under the MIT License by QuBI. By downloading, installing, or using QBrowse, you agree to these Terms of Service and the terms of the MIT License. If you do not agree, you may uninstall and discontinue use at any time.'
    },
    {
        id: 'as-is',
        title: '2. Software Provided "As Is"',
        body: 'QBrowse is provided "AS IS", without warranty of any kind, express or implied, including but not limited to merchantability, fitness for a particular purpose, or non-infringement. To the maximum extent permitted by law, the author and contributors are not liable for any direct, indirect, incidental, or consequential damages resulting from use of the software.'
    },
    {
        id: 'cloud-sync',
        title: '3. Optional Cloud Sync & Account Responsibility',
        body: 'You may use QBrowse completely offline without an account. If you choose to enable Cloud Sync, you are responsible for safeguarding your account credentials and Master Password. Because sync payloads are encrypted client-side, lost Master Passwords cannot be recovered by QBrowse.'
    },
    {
        id: 'tor-network',
        title: '4. Tor Network & Third-Party Services',
        body: 'QBrowse integrates optional Tor onion routing, third-party search engines, and external websites that are not operated or controlled by QBrowse. You are solely responsible for complying with applicable laws and the terms of any websites or networks you access through the browser.'
    },
    {
        id: 'ai-local',
        title: '5. Local AI & User-Generated Content',
        body: 'Built-in AI summaries, translations, and assistance are generated to help your workflow and may occasionally be inaccurate. Always verify critical information independently. You retain full ownership of your local files, notes, bookmarks, and browsing data.'
    },
    {
        id: 'updates-contact',
        title: '6. Updates & Contact',
        body: `We may update QBrowse and these Terms from time to time as features evolve. Material changes will be reflected in the "Last Updated" date inside Help & Legal. Questions or legal notices can be sent to ${QBROWSE_META.contactEmail}.`
    }
];

export const PRIVACY_POLICY_SECTIONS = [
    {
        id: 'zero-telemetry',
        title: '1. Zero Telemetry & Zero Analytics',
        body: 'QBrowse does not collect, sell, rent, or transmit behavioral telemetry, crash analytics, usage tracking, or advertising identifiers. There are no first-party tracking pixels or hidden analytics SDKs in the browser.'
    },
    {
        id: 'local-storage',
        title: '2. Local-First Data Storage',
        body: 'Your tabs, Split Groups, pinned apps, bookmarks, history, settings, presets, and local vault entries are stored locally on your own device in your profile directory. You can inspect, export, or clear this data at any time from Settings → Privacy & Security.'
    },
    {
        id: 'ghost-tor',
        title: '3. Strict Ghost & Tor Isolation',
        body: 'Tabs, history, cookies, Split Groups, and pinned apps opened inside Ghost Mode or Tor Mode are kept strictly in ephemeral memory. They are never written to localStorage, disk history, or Cloud Sync, and are purged immediately when you leave Ghost/Tor or close the app.'
    },
    {
        id: 'encrypted-sync',
        title: '4. Optional Client-Side Encrypted Cloud Sync',
        body: 'If you sign in and enable Cloud Sync, your synced data is encrypted on your device before upload using your Master Password. Neither QBrowse nor your storage provider can read your plaintext browsing data or passwords.'
    },
    {
        id: 'network-services',
        title: '5. Network Requests & Background Kill Switch',
        body: 'Websites you visit, search engines you choose, favicon requests (if enabled), and optional update checks connect directly to those respective endpoints. You can disable optional background requests—including favicon fetching, update checks, and GitHub Live polling—in Settings → Network & Privacy.'
    },
    {
        id: 'local-files-ai',
        title: '6. Local Files & On-Device Processing',
        body: 'Opening local files (PDFs, images, Markdown, code, media) reads them directly on your machine without uploading them. Local AI models run on-device unless you explicitly configure an external API endpoint.'
    },
    {
        id: 'your-rights',
        title: '7. Data Control, Deletion & Contact',
        body: `You can clear browsing data, delete local profiles, or sign out and delete synced cloud data at any time. For privacy questions, contact ${QBROWSE_META.contactEmail}.`
    }
];

export const MIT_LICENSE_TEXT = `MIT License

Copyright (c) 2026 QuBI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export const OPEN_SOURCE_CREDITS = [
    { name: 'Electron & Chromium', license: 'MIT / BSD', role: 'Desktop shell & web rendering engine' },
    { name: 'React & Vite', license: 'MIT', role: 'UI runtime & fast production bundler' },
    { name: 'Tailwind CSS', license: 'MIT', role: 'Utility-first styling system' },
    { name: 'Zustand', license: 'MIT', role: 'Lightweight state management' },
    { name: 'PDF.js (pdfjs-dist)', license: 'Apache-2.0', role: 'In-tab Glass PDF rendering' },
    { name: '@ghostery/adblocker-electron', license: 'MPL-2.0', role: 'Tracker & ad blocking engine' },
    { name: 'Mozilla Readability', license: 'Apache-2.0', role: 'Clean Reader Mode extraction' },
    { name: 'Lucide React', license: 'ISC', role: 'Crisp vector icon set' },
    { name: 'Transformers.js & ONNX Runtime', license: 'Apache-2.0 / MIT', role: 'On-device AI inference' },
    { name: 'Tor Project', license: 'BSD-3-Clause', role: 'Optional anonymous onion routing' }
];

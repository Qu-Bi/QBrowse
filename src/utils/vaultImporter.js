/**
 * Universal Vault Importer for QVault
 * Supports parsing exports from:
 * - Bitwarden (.csv, .json)
 * - Proton Pass (.csv, .json)
 * - Google Chrome / Brave / Edge (.csv)
 * - 1Password (.csv)
 * - QVault Backups (.json, .csv)
 */

export function parseCSV(text) {
    const p = [];
    let row = [''];
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        const next = text[i + 1];
        if (c === '"') {
            if (inQuotes && next === '"') {
                row[row.length - 1] += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c === ',' && !inQuotes) {
            row.push('');
        } else if ((c === '\r' || c === '\n') && !inQuotes) {
            if (c === '\r' && next === '\n') i++;
            p.push(row);
            row = [''];
        } else {
            row[row.length - 1] += c;
        }
    }
    if (row.length > 1 || row[0]) p.push(row);
    return p;
}

export function parseVaultContent(text, filename = '') {
    let parsed = [];
    let sourceName = 'File';

    const trimmed = text.trim();
    if (filename.toLowerCase().endsWith('.json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const json = JSON.parse(text);
            if (json.items && Array.isArray(json.items)) {
                // Bitwarden JSON Export
                sourceName = 'Bitwarden';
                parsed = json.items.map(item => {
                    const login = item.login || {};
                    const uris = login.uris || [];
                    return {
                        title: item.name || uris[0]?.uri || 'Untitled',
                        username: login.username || '',
                        password: login.password || '',
                        url: uris[0]?.uri || '',
                        notes: item.notes || '',
                        type: item.type === 3 ? 'card' : 'login'
                    };
                });
            } else if (json.vaults && Array.isArray(json.vaults)) {
                // Proton Pass JSON Export
                sourceName = 'Proton Pass';
                json.vaults.forEach(v => {
                    (v.items || []).forEach(item => {
                        const content = item.data?.content || {};
                        const metadata = item.data?.metadata || {};
                        parsed.push({
                            title: metadata.name || item.name || 'Untitled',
                            username: content.username || '',
                            password: content.password || '',
                            url: (content.urls && content.urls[0]) || '',
                            notes: metadata.note || '',
                            type: 'login'
                        });
                    });
                });
            } else if (json.qvault_version && Array.isArray(json.items)) {
                // QVault Backup JSON
                sourceName = 'QVault Backup';
                parsed = json.items;
            } else if (Array.isArray(json)) {
                // Generic JSON Array
                sourceName = 'JSON Export';
                parsed = json.map(i => ({
                    title: i.title || i.name || 'Untitled',
                    username: i.username || i.user || i.login || '',
                    password: i.password || i.pass || '',
                    url: i.url || i.uri || i.website || '',
                    notes: i.notes || i.note || '',
                    type: i.type || 'login'
                }));
            }
        } catch (e) {
            console.error('Error parsing JSON vault file:', e);
        }
    } else {
        // CSV Parsing
        const rows = parseCSV(text);
        if (rows.length > 1) {
            const header = rows[0].map(h => (h || '').trim().toLowerCase());
            const colTitle = header.findIndex(h => /^(name|title|folder_name)$/i.test(h));
            const colUrl = header.findIndex(h => /^(url|uri|login_uri|website)$/i.test(h));
            const colUser = header.findIndex(h => /^(username|login_username|user|email|login)$/i.test(h));
            const colPass = header.findIndex(h => /^(password|login_password|pass)$/i.test(h));
            const colNote = header.findIndex(h => /^(note|notes|comment)$/i.test(h));

            if (header.includes('login_username') || header.includes('login_password')) {
                sourceName = 'Bitwarden';
            } else if (header.includes('url') && header.includes('username') && header.includes('note')) {
                sourceName = 'Proton Pass';
            } else if (header.includes('url') && header.includes('username') && header.includes('password')) {
                sourceName = 'Chrome/Browser';
            } else {
                sourceName = 'CSV';
            }

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length < 2) continue;
                const u = colUser !== -1 ? (row[colUser] || '').trim() : '';
                const p = colPass !== -1 ? (row[colPass] || '').trim() : '';
                const t = colTitle !== -1 ? (row[colTitle] || '').trim() : '';
                const url = colUrl !== -1 ? (row[colUrl] || '').trim() : '';
                const note = colNote !== -1 ? (row[colNote] || '').trim() : '';

                if (p || u || t) {
                    parsed.push({
                        title: t || url || u || 'Untitled',
                        username: u,
                        password: p,
                        url: url,
                        notes: note,
                        type: 'login'
                    });
                }
            }
        }
    }

    return { parsed, sourceName };
}

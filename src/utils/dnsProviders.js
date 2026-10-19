/**
 * QBrowse DNS Providers & Configuration Helpers
 */

export const DOH_PROVIDERS = [
    {
        id: 'cloudflare',
        name: 'Cloudflare',
        description: 'Ultra-fast 1.1.1.1 privacy-first DNS over HTTPS',
        url: 'https://cloudflare-dns.com/dns-query',
        ips: ['1.1.1.1', '1.0.0.1'],
        badge: 'Fastest'
    },
    {
        id: 'google',
        name: 'Google Public DNS',
        description: 'High-performance global 8.8.8.8 DoH resolver',
        url: 'https://dns.google/dns-query',
        ips: ['8.8.8.8', '8.8.4.4'],
        badge: 'Global'
    },
    {
        id: 'quad9',
        name: 'Quad9',
        description: 'Blocks malware & phishing with zero logging (Switzerland)',
        url: 'https://dns.quad9.net/dns-query',
        ips: ['9.9.9.9', '149.112.112.112'],
        badge: 'Malware Shield'
    },
    {
        id: 'adguard',
        name: 'AdGuard DNS',
        description: 'Built-in ad-blocking, tracker, and telemetry protection',
        url: 'https://dns.adguard-dns.com/dns-query',
        ips: ['94.140.14.14', '94.140.15.15'],
        badge: 'Ad Blocker'
    },
    {
        id: 'nextdns',
        name: 'NextDNS',
        description: 'Cloud firewall with custom profiles and detailed analytics',
        url: 'https://dns.nextdns.io',
        ips: ['45.90.28.0', '45.90.30.0'],
        badge: 'Customizable'
    },
    {
        id: 'opendns',
        name: 'OpenDNS / Cisco',
        description: 'Enterprise-grade speed with Cisco Umbrella threat filters',
        url: 'https://doh.opendns.com/dns-query',
        ips: ['208.67.222.222', '208.67.220.220']
    },
    {
        id: 'custom',
        name: 'Custom DNS (DoH)',
        description: 'Enter your own custom DNS-over-HTTPS endpoint URL or IP address',
        url: '',
        isCustom: true
    }
];

export const DNS_MODES = [
    {
        id: 'automatic',
        name: 'Automatic (Opportunistic)',
        description: 'Upgrades to encrypted DNS when available; falls back to standard DNS if unreachable.'
    },
    {
        id: 'secure',
        name: 'Secure (Strict Encrypted)',
        description: 'Strictly enforces DNS-over-HTTPS. Prevents ISP leakage and bypasses local filtering.'
    },
    {
        id: 'off',
        name: 'Off (System Default)',
        description: 'Uses your operating system default network DNS servers without encryption.'
    }
];

export function getDohProvider(providerId) {
    if (!providerId) return DOH_PROVIDERS[0];
    return DOH_PROVIDERS.find(p => p.id === providerId) || DOH_PROVIDERS[0];
}

export function formatCustomDohUrl(input) {
    if (!input || typeof input !== 'string') return '';
    let trimmed = input.trim();
    if (!trimmed) return '';
    // If it's an IPv4 address, convert to HTTPS template
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(trimmed)) {
        return `https://${trimmed}/dns-query`;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
        trimmed = 'https://' + trimmed;
    }
    return trimmed;
}

export function isValidDohUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const formatted = formatCustomDohUrl(url);
    try {
        const parsed = new URL(formatted);
        return parsed.protocol === 'https:' && parsed.hostname.length > 0;
    } catch {
        return false;
    }
}

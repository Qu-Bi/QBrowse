import React, { useState, useEffect, useMemo } from 'react';
import { 
    RotateCw, Globe, Globe2, WifiOff, ServerOff, Clock, 
    ShieldAlert, ShieldCheck, AlertTriangle, Search, Compass, 
    ChevronDown, Terminal, Copy, Check, ExternalLink, Lock, Unlock
} from 'lucide-react';

const ERROR_METADATA = {
    // Insecure / HTTP warnings
    'HTTP_INSECURE': {
        category: 'SECURITY WARNING',
        badge: 'UNENCRYPTED HTTP',
        title: 'Unencrypted Connection (HTTP)',
        message: 'This website does not support HTTPS encryption. Attackers on public Wi-Fi or your local network could monitor or steal passwords, messages, and sensitive personal information.',
        icon: ShieldAlert,
        color: 'text-amber-400',
        isInsecure: true,
        risk: 'Lack of TLS encryption allows third parties on the network to intercept or alter network packets.'
    },
    '-200': {
        category: 'SECURITY WARNING',
        badge: 'INVALID CERTIFICATE',
        title: 'Your Connection is Not Private',
        message: 'The security certificate presented by this website does not match the requested domain name. An attacker may be attempting to impersonate this service.',
        icon: ShieldAlert,
        color: 'text-rose-400',
        isInsecure: true,
        risk: 'Common Name / SAN mismatch. The cryptographic identity does not match the host address.'
    },
    '-201': {
        category: 'SECURITY WARNING',
        badge: 'EXPIRED CERTIFICATE',
        title: 'Certificate Expired',
        message: 'The SSL/TLS certificate for this domain has expired or system clock is out of sync. Secure communication cannot be validated.',
        icon: ShieldAlert,
        color: 'text-amber-400',
        isInsecure: true,
        risk: 'Validity period has ended. The certificate authority no longer guarantees domain integrity.'
    },
    '-202': {
        category: 'SECURITY WARNING',
        badge: 'UNTRUSTED CERTIFICATE',
        title: 'Untrusted Certificate Authority',
        message: 'The security certificate was issued by an untrusted or self-signed authority. Your connection could be intercepted by an unauthorized proxy.',
        icon: ShieldAlert,
        color: 'text-rose-400',
        isInsecure: true,
        risk: 'Untrusted root certificate. The cryptographic chain cannot be verified against trusted authorities.'
    },
    '-113': {
        category: 'SECURITY WARNING',
        badge: 'CIPHER MISMATCH',
        title: 'Secure Connection Failed',
        message: 'This website does not support modern secure encryption (SSL/TLS cipher mismatch). The server may only support unencrypted HTTP.',
        icon: ShieldAlert,
        color: 'text-amber-400',
        isInsecure: true,
        risk: 'Client and server do not share a common SSL protocol version or cipher suite. The website may be an unencrypted HTTP-only service.'
    },
    '-107': {
        category: 'SECURITY WARNING',
        badge: 'SSL PROTOCOL ERROR',
        title: 'SSL Protocol Error',
        message: 'A secure SSL connection could not be negotiated. The remote server sent an invalid or unsupported cryptographic response.',
        icon: ShieldAlert,
        color: 'text-amber-400',
        isInsecure: true,
        risk: 'Handshake failure or protocol parsing error during TLS establishment.'
    },
    '-203': {
        category: 'SECURITY WARNING',
        badge: 'CORRUPTED CERTIFICATE',
        title: 'Certificate Contains Errors',
        message: 'The security certificate provided by this site contains errors or is malformed. Connection cannot be securely verified.',
        icon: ShieldAlert,
        color: 'text-rose-400',
        isInsecure: true,
        risk: 'Malformed ASN.1 or cryptographic signatures detected in peer certificate.'
    },
    '-204': {
        category: 'SECURITY WARNING',
        badge: 'NO REVOCATION CHECK',
        title: 'Revocation Mechanism Missing',
        message: 'The certificate lacks revocation verification mechanisms (OCSP/CRL). Certificate status cannot be checked.',
        icon: ShieldAlert,
        color: 'text-amber-400',
        isInsecure: true,
        risk: 'Unable to check if the certificate has been invalidated by the issuer.'
    },
    '-205': {
        category: 'SECURITY WARNING',
        badge: 'REVOCATION UNREACHABLE',
        title: 'Unable to Check Revocation',
        message: 'Could not contact the certificate authority revocation service. Security status is uncertain.',
        icon: ShieldAlert,
        color: 'text-amber-400',
        isInsecure: true,
        risk: 'Network timeout contacting the CRL/OCSP responder.'
    },
    '-206': {
        category: 'SECURITY WARNING',
        badge: 'REVOKED CERTIFICATE',
        title: 'Security Certificate Revoked',
        message: 'This website’s certificate was explicitly revoked by the issuing Certificate Authority. Connecting poses severe danger.',
        icon: ShieldAlert,
        color: 'text-rose-500',
        isInsecure: true,
        risk: 'The private key is compromised or the domain ownership changed. Do not enter credentials.'
    },
    '-207': {
        category: 'SECURITY WARNING',
        badge: 'INVALID CERTIFICATE',
        title: 'Invalid Security Certificate',
        message: 'The certificate presented by this domain is invalid or structurally corrupt.',
        icon: ShieldAlert,
        color: 'text-rose-400',
        isInsecure: true,
        risk: 'X.509 structure validation failed.'
    },
    '-208': {
        category: 'SECURITY WARNING',
        badge: 'WEAK CRYPTOGRAPHY',
        title: 'Weak Signature Algorithm',
        message: 'The certificate uses obsolete or weak cryptographic hashing (such as SHA-1 or MD5).',
        icon: ShieldAlert,
        color: 'text-amber-400',
        isInsecure: true,
        risk: 'Vulnerable to collision attacks and forged certificates.'
    },
    '-210': {
        category: 'SECURITY WARNING',
        badge: 'NON-UNIQUE NAME',
        title: 'Non-Unique Domain Name',
        message: 'The certificate was issued for an internal or non-unique domain name.',
        icon: ShieldAlert,
        color: 'text-amber-400',
        isInsecure: true,
        risk: 'Host matches internal naming conventions not recognized by public roots.'
    },
    '-211': {
        category: 'SECURITY WARNING',
        badge: 'WEAK KEY',
        title: 'Insecure Key Length',
        message: 'The public key in this certificate is too short or uses an insecure curve.',
        icon: ShieldAlert,
        color: 'text-amber-400',
        isInsecure: true,
        risk: 'RSA key length below 2048 bits or weak elliptic curve.'
    },
    '-212': {
        category: 'SECURITY WARNING',
        badge: 'NAME CONSTRAINT',
        title: 'Name Constraint Violation',
        message: 'The certificate violates intermediate certificate authority name constraints.',
        icon: ShieldAlert,
        color: 'text-rose-400',
        isInsecure: true,
        risk: 'Issuer is not authorized to sign certificates for this top-level domain.'
    },
    '-213': {
        category: 'SECURITY WARNING',
        badge: 'EXCESSIVE VALIDITY',
        title: 'Certificate Validity Too Long',
        message: 'The certificate was issued for a duration exceeding browser security standards (over 398 days).',
        icon: ShieldAlert,
        color: 'text-amber-400',
        isInsecure: true,
        risk: 'Lifetime exceeds CA/Browser Forum baseline requirements.'
    },
    '-214': {
        category: 'SECURITY WARNING',
        badge: 'NO TRANSPARENCY',
        title: 'Certificate Transparency Missing',
        message: 'The certificate lacks required Certificate Transparency (CT) log proofs.',
        icon: ShieldAlert,
        color: 'text-rose-400',
        isInsecure: true,
        risk: 'Not logged in public auditing ledgers. Potential rogue certificate.'
    },
    '-217': {
        category: 'SECURITY WARNING',
        badge: 'INTERCEPTION BLOCKED',
        title: 'Known Interception Blocked',
        message: 'Traffic is being intercepted by an untrusted middlebox or corporate inspection tool.',
        icon: ShieldAlert,
        color: 'text-rose-500',
        isInsecure: true,
        risk: 'Man-in-the-middle TLS interception detected.'
    },
    '-501': {
        category: 'SECURITY WARNING',
        badge: 'INSECURE RESPONSE',
        title: 'Insecure Response Blocked',
        message: 'The server returned an insecure response during connection negotiation. The request was blocked to safeguard your credentials.',
        icon: ShieldAlert,
        color: 'text-rose-400',
        isInsecure: true,
        risk: 'Server negotiated an insecure fallback protocol susceptible to downgrade attacks.'
    },
    '-502': {
        category: 'SECURITY WARNING',
        badge: 'SSL PROTOCOL ERROR',
        title: 'SSL Handshake Failed',
        message: 'A secure SSL/TLS connection could not be negotiated with the server. The site may only support unencrypted HTTP.',
        icon: ShieldAlert,
        color: 'text-amber-400',
        isInsecure: true,
        risk: 'Cryptographic cipher handshake failed. Incompatible SSL/TLS cipher suites.'
    },

    // Standard Network & Navigation Errors
    '-105': {
        category: 'DNS RESOLUTION',
        badge: 'HOST NOT FOUND',
        title: 'Server Not Found',
        message: 'The DNS address for this website could not be resolved. Please verify the URL spelling or check your DNS configuration.',
        icon: Globe2,
        color: 'text-amber-400',
        isInsecure: false
    },
    '-106': {
        category: 'NETWORK OFFLINE',
        badge: 'DISCONNECTED',
        title: 'No Internet Connection',
        message: 'Your system is not connected to the internet. Check your network cables, Wi-Fi status, or router.',
        icon: WifiOff,
        color: 'text-red-400',
        isInsecure: false
    },
    '-102': {
        category: 'CONNECTION REFUSED',
        badge: 'PORT CLOSED',
        title: 'Connection Refused',
        message: 'The target server actively rejected the connection request. The site may be down or blocking incoming traffic.',
        icon: ServerOff,
        color: 'text-rose-400',
        isInsecure: false
    },
    '-109': {
        category: 'UNREACHABLE HOST',
        badge: 'NO ROUTE',
        title: 'Host Unreachable',
        message: 'The server address cannot be routed on your current network path. Try checking your VPN or gateway.',
        icon: ServerOff,
        color: 'text-rose-400',
        isInsecure: false
    },
    '-118': {
        category: 'CONNECTION TIMEOUT',
        badge: 'TIMED OUT',
        title: 'Connection Timed Out',
        message: 'The server took too long to respond. The site may be experiencing heavy load or network congestion.',
        icon: Clock,
        color: 'text-amber-400',
        isInsecure: false
    },
    '-101': {
        category: 'CONNECTION RESET',
        badge: 'RESET BY PEER',
        title: 'Connection Reset',
        message: 'The connection was abruptly reset by the remote host or an intermediate network firewall.',
        icon: RotateCw,
        color: 'text-amber-400',
        isInsecure: false
    },
    '-100': {
        category: 'CONNECTION CLOSED',
        badge: 'CLOSED',
        title: 'Connection Closed',
        message: 'The remote server closed the network connection unexpectedly before data transmission finished.',
        icon: ServerOff,
        color: 'text-zinc-400',
        isInsecure: false
    },
    '-104': {
        category: 'CONNECTION FAILED',
        badge: 'SOCKET FAILED',
        title: 'Failed to Connect',
        message: 'Unable to establish a socket connection with the remote server host.',
        icon: WifiOff,
        color: 'text-red-400',
        isInsecure: false
    },
    '-111': {
        category: 'TUNNEL FAILED',
        badge: 'PROXY FAILED',
        title: 'Proxy Tunnel Failed',
        message: 'The proxy server could not establish a tunnel to the target destination.',
        icon: ShieldAlert,
        color: 'text-purple-400',
        isInsecure: false
    },
    '-137': {
        category: 'DNS RESOLUTION',
        badge: 'LOOKUP FAILED',
        title: 'Name Resolution Failed',
        message: 'The host name could not be resolved by your primary domain name server.',
        icon: Globe2,
        color: 'text-amber-400',
        isInsecure: false
    },
    '-300': {
        category: 'INVALID ADDRESS',
        badge: 'BAD URL',
        title: 'Malformed URL',
        message: 'The address format or protocol scheme entered is invalid.',
        icon: AlertTriangle,
        color: 'text-amber-400',
        isInsecure: false
    },
    '-310': {
        category: 'REDIRECT LOOP',
        badge: 'TOO MANY REDIRECTS',
        title: 'Too Many Redirects',
        message: 'The page resulted in an infinite redirection loop. Clearing cookies may resolve this.',
        icon: RotateCw,
        color: 'text-amber-400',
        isInsecure: false
    },
    '-1': {
        category: 'RENDERER HALTED',
        badge: 'CRASHED',
        title: 'Page Process Crashed',
        message: 'The tab renderer encountered a critical error and stopped responding.',
        icon: AlertTriangle,
        color: 'text-red-400',
        isInsecure: false
    },
    '-999': {
        category: 'RENDER PROCESS GONE',
        badge: 'CRASHED',
        title: 'Tab Crashed Unexpectedly',
        message: 'The page renderer process terminated unexpectedly. You can reload this tab to restore your session.',
        icon: AlertTriangle,
        color: 'text-rose-400',
        isInsecure: false
    }
};

export default function WebviewErrorOverlay({
    error,
    tab,
    isBright = false,
    onRetry,
    onSearchWeb,
    onNavigateHome,
    onProceedInsecure
}) {
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [copiedDiag, setCopiedDiag] = useState(false);
    const [isDiagOpen, setIsDiagOpen] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);

    const errorCode = error?.errorCode != null ? String(error.errorCode) : '-1';
    const errorDesc = error?.errorDescription || (error?.isHttpWarning ? 'ERR_UNENCRYPTED_HTTP' : 'ERR_FAILED');
    const targetUrl = error?.validatedURL || tab?.url || '';

    const meta = ERROR_METADATA[errorCode] || {
        category: error?.isHttpWarning ? 'SECURITY WARNING' : 'NAVIGATION ERROR',
        badge: error?.isHttpWarning ? 'UNENCRYPTED HTTP' : 'FAILED',
        title: error?.isHttpWarning ? 'Unencrypted Connection (HTTP)' : 'This Site Can’t Be Reached',
        message: error?.isHttpWarning 
            ? 'This website does not support HTTPS encryption. Passwords, cookies, and sensitive details can be intercepted.' 
            : 'The requested webpage could not be loaded. Please verify your connection and try again.',
        icon: error?.isHttpWarning ? ShieldAlert : AlertTriangle,
        color: error?.isHttpWarning ? 'text-amber-400' : 'text-amber-400',
        isInsecure: !!error?.isHttpWarning
    };

    const StatusIcon = meta.icon;
    const isInsecure = meta.isInsecure;

    // Clean domain query for web search suggestion
    const cleanQuery = useMemo(() => {
        try {
            if (!targetUrl) return '';
            const u = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
            return u.hostname.replace(/^www\./i, '');
        } catch (_) {
            return targetUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || '';
        }
    }, [targetUrl]);

    const handleCopyUrl = (e) => {
        e?.stopPropagation();
        if (!targetUrl) return;
        navigator.clipboard.writeText(targetUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    const handleCopyDiagnostics = (e) => {
        e?.stopPropagation();
        const report = [
            `[QBrowse ${isInsecure ? 'Security' : 'Network'} Diagnostic]`,
            `Status: ${meta.title}`,
            `Category: ${meta.category}`,
            `Code: ${errorCode} (${errorDesc})`,
            `Target URL: ${targetUrl}`,
            `Host: ${cleanQuery}`,
            `Insecure: ${isInsecure ? 'Yes' : 'No'}`,
            `Timestamp: ${new Date(error?.time || Date.now()).toISOString()}`,
            `Platform: Windows / QBrowse Electron`
        ].join('\n');

        navigator.clipboard.writeText(report);
        setCopiedDiag(true);
        setTimeout(() => setCopiedDiag(false), 2000);
    };

    const handleTriggerRetry = () => {
        setIsRetrying(true);
        onRetry?.();
        setTimeout(() => setIsRetrying(false), 800);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleTriggerRetry();
            } else if (e.key === 'F5') {
                e.preventDefault();
                handleTriggerRetry();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onNavigateHome?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onRetry, onNavigateHome]);

    return (
        <div 
            className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-[#070709]/75 backdrop-blur-md select-none overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
        >
            <div 
                data-context-menu
                className={`w-full max-w-[440px] rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-2xl border flex flex-col gap-3 select-none animate-pop-in ${
                    isBright
                        ? 'bg-white/90 border-black/[0.06] text-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.12)]'
                        : 'bg-[#0c0c0f]/94 border-white/[0.06] text-white/90'
                }`}
            >
                {/* Section Header (Matches ContextMenuProvider MenuSectionHeader) */}
                <div className={`flex items-center justify-between pb-2 border-b ${
                    isBright ? 'border-black/[0.06]' : 'border-white/[0.06]'
                }`}>
                    <div className="flex items-center gap-2">
                        <StatusIcon size={14} className={meta.color} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
                            isBright ? 'text-zinc-500' : 'text-white/50'
                        }`}>
                            {meta.category} • {meta.badge || errorDesc}
                        </span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                        isInsecure
                            ? (isBright ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-rose-500/10 border-rose-500/20 text-rose-400')
                            : (isBright ? 'bg-black/[0.03] border-black/[0.08] text-zinc-600' : 'bg-white/[0.04] border-white/10 text-white/50')
                    }`}>
                        {isInsecure ? 'Not Secure' : `Code ${errorCode}`}
                    </span>
                </div>

                {/* Main Heading & Friendly Explanation */}
                <div className="flex flex-col gap-1 pt-0.5">
                    <h2 className={`text-sm font-semibold tracking-tight flex items-center gap-2 ${
                        isBright ? 'text-zinc-900' : 'text-white'
                    }`}>
                        {isInsecure && <Unlock size={14} className="text-amber-400 flex-shrink-0" />}
                        <span>{meta.title}</span>
                    </h2>
                    <p className={`text-xs leading-relaxed ${
                        isBright ? 'text-zinc-600' : 'text-white/60'
                    }`}>
                        {meta.message}
                    </p>
                </div>

                {/* URL Bar (Matches ContextMenuProvider MenuHeaderPills) */}
                {targetUrl && (
                    <div className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border font-mono text-[11px] select-text ${
                        isBright 
                            ? 'bg-black/[0.03] border-black/[0.06] text-zinc-700' 
                            : 'bg-white/[0.04] border-white/[0.06] text-white/70'
                    }`}>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            {isInsecure ? (
                                <Unlock size={13} className="text-amber-400 flex-shrink-0" />
                            ) : (
                                <Globe size={13} className={isBright ? 'text-zinc-400 flex-shrink-0' : 'text-white/40 flex-shrink-0'} />
                            )}
                            <span className="truncate select-text">{targetUrl}</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleCopyUrl}
                            title="Copy URL to clipboard"
                            className={`p-1 rounded-lg transition cursor-pointer flex-shrink-0 flex items-center justify-center ${
                                isBright
                                    ? 'hover:bg-black/5 text-zinc-500 hover:text-zinc-800'
                                    : 'hover:bg-white/10 text-white/40 hover:text-white'
                            }`}
                        >
                            {copiedUrl ? (
                                <Check size={12} className="text-emerald-400" />
                            ) : (
                                <Copy size={12} />
                            )}
                        </button>
                    </div>
                )}

                {/* Divider (Matches ContextMenuProvider MenuDivider) */}
                <div className={`h-px w-full my-0.5 ${isBright ? 'bg-black/[0.06]' : 'bg-white/[0.06]'}`} />

                {/* Action Menu Buttons (Matches ContextMenuProvider MenuItem) */}
                <div className="flex flex-col gap-1">
                    {isInsecure ? (
                        <>
                            {/* Insecure View: Primary Safe Action */}
                            <button
                                type="button"
                                onClick={onNavigateHome}
                                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left w-full group outline-none active:scale-[0.98] border ${
                                    isBright
                                        ? 'text-emerald-800 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/25'
                                        : 'text-accent bg-accent/15 hover:bg-accent/25 border-accent/25 shadow-[0_0_15px_rgba(212,163,115,0.12)]'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <ShieldCheck size={14} className="flex-shrink-0 text-emerald-400" />
                                    <span>Return to Safety (Recommended)</span>
                                </div>
                                <span className={`text-[10px] font-mono ml-2 flex-shrink-0 opacity-60`}>
                                    Esc
                                </span>
                            </button>

                            {/* Secondary Action: Search Web for Secure Site */}
                            {cleanQuery && (
                                <button
                                    type="button"
                                    onClick={onSearchWeb}
                                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer text-left w-full group outline-none active:scale-[0.98] ${
                                        isBright
                                            ? 'text-zinc-700 hover:text-zinc-950 hover:bg-black/5'
                                            : 'text-white/80 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Search size={14} className={isBright ? 'text-zinc-400 group-hover:text-zinc-900' : 'text-white/50 group-hover:text-white'} />
                                        <span className="truncate">Search for secure version</span>
                                    </div>
                                    <span className={`text-[10px] font-mono ml-2 flex-shrink-0 opacity-40 group-hover:opacity-60`}>
                                        ↵
                                    </span>
                                </button>
                            )}

                            {/* Insecure Bypass Action */}
                            {(() => {
                                const isSslDowngrade = targetUrl.startsWith('https://') && ['-113', '-107', '-502'].includes(errorCode);
                                const proceedTarget = isSslDowngrade ? targetUrl.replace(/^https:\/\//i, 'http://') : targetUrl;
                                const buttonLabel = isSslDowngrade
                                    ? `Proceed to ${cleanQuery || 'site'} via HTTP (Unsafe)`
                                    : `Proceed to ${cleanQuery || 'site'} (Unsafe)`;

                                return (
                                    <button
                                        type="button"
                                        onClick={() => onProceedInsecure?.(proceedTarget, cleanQuery)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer text-left w-full group outline-none active:scale-[0.98] border ${
                                            isBright
                                                ? 'text-rose-700 hover:text-rose-800 bg-rose-500/5 hover:bg-rose-500/15 border-rose-500/20'
                                                : 'text-rose-400/90 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/20'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <AlertTriangle size={14} className="flex-shrink-0 text-rose-400" />
                                            <span className="truncate">{buttonLabel}</span>
                                        </div>
                                        <span className={`text-[10px] font-mono ml-2 flex-shrink-0 opacity-40 group-hover:opacity-60`}>
                                            Unsafe
                                        </span>
                                    </button>
                                );
                            })()}
                        </>
                    ) : (
                        <>
                            {/* Standard Error View: Primary Action: Try Again */}
                            <button
                                type="button"
                                onClick={handleTriggerRetry}
                                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left w-full group outline-none active:scale-[0.98] border ${
                                    isBright
                                        ? 'text-amber-800 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/25'
                                        : 'text-accent bg-accent/15 hover:bg-accent/25 border-accent/25 shadow-[0_0_15px_rgba(212,163,115,0.12)]'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <RotateCw 
                                        size={14} 
                                        className={`flex-shrink-0 transition-transform ${isRetrying ? 'animate-spin' : 'group-hover:rotate-45'}`} 
                                    />
                                    <span>Try Again</span>
                                </div>
                                <span className={`text-[10px] font-mono ml-2 flex-shrink-0 opacity-60`}>
                                    Ctrl+R
                                </span>
                            </button>

                            {/* Secondary Action: Search the Web */}
                            {cleanQuery && (
                                <button
                                    type="button"
                                    onClick={onSearchWeb}
                                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer text-left w-full group outline-none active:scale-[0.98] ${
                                        isBright
                                            ? 'text-zinc-700 hover:text-zinc-950 hover:bg-black/5'
                                            : 'text-white/80 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Search size={14} className={isBright ? 'text-zinc-400 group-hover:text-zinc-900' : 'text-white/50 group-hover:text-white'} />
                                        <span className="truncate">Search web for "{cleanQuery}"</span>
                                    </div>
                                    <span className={`text-[10px] font-mono ml-2 flex-shrink-0 opacity-40 group-hover:opacity-60`}>
                                        ↵
                                    </span>
                                </button>
                            )}

                            {/* Tertiary Action: Open New Tab */}
                            <button
                                type="button"
                                onClick={onNavigateHome}
                                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer text-left w-full group outline-none active:scale-[0.98] ${
                                    isBright
                                        ? 'text-zinc-700 hover:text-zinc-950 hover:bg-black/5'
                                        : 'text-white/80 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <Compass size={14} className={isBright ? 'text-zinc-400 group-hover:text-zinc-900' : 'text-white/50 group-hover:text-white'} />
                                    <span>Return to Dashboard</span>
                                </div>
                                <span className={`text-[10px] font-mono ml-2 flex-shrink-0 opacity-40 group-hover:opacity-60`}>
                                    Esc
                                </span>
                            </button>
                        </>
                    )}
                </div>

                {/* Collapsible Diagnostics & Risk Breakdown Section */}
                <div className={`mt-0.5 pt-1 border-t ${isBright ? 'border-black/[0.06]' : 'border-white/[0.06]'}`}>
                    <button
                        type="button"
                        onClick={() => setIsDiagOpen(!isDiagOpen)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition cursor-pointer ${
                            isBright
                                ? 'text-zinc-500 hover:text-zinc-800 hover:bg-black/[0.03]'
                                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <Terminal size={12} className={isBright ? 'text-zinc-400' : 'text-white/40'} />
                            <span>{isInsecure ? 'Security Details & Risk Breakdown' : 'Diagnostics & Recommendations'}</span>
                        </div>
                        <ChevronDown 
                            size={12} 
                            className={`transition-transform duration-200 ${isDiagOpen ? 'rotate-180' : ''}`} 
                        />
                    </button>

                    {isDiagOpen && (
                        <div className={`mt-1.5 p-2.5 rounded-xl border flex flex-col gap-2 animate-fade-in ${
                            isBright 
                                ? 'bg-black/[0.02] border-black/[0.06] text-zinc-600' 
                                : 'bg-white/[0.02] border-white/[0.06] text-white/60'
                        }`}>
                            {/* Checklist or Risk Items */}
                            <div className="flex flex-col gap-1 text-[11px] leading-relaxed">
                                {isInsecure ? (
                                    <>
                                        <div className="flex items-start gap-1.5">
                                            <span className="text-amber-400">•</span>
                                            <span>Passwords, credit cards, and cookies are transmitted in cleartext</span>
                                        </div>
                                        <div className="flex items-start gap-1.5">
                                            <span className="text-amber-400">•</span>
                                            <span>Intermediate Wi-Fi or ISP nodes can view and modify page content</span>
                                        </div>
                                        <div className="flex items-start gap-1.5">
                                            <span className="text-amber-400">•</span>
                                            <span>{meta.risk || 'Website authenticity cannot be cryptographically proven.'}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-start gap-1.5">
                                            <span className="text-accent">•</span>
                                            <span>Check your Wi-Fi, Ethernet, and router cables</span>
                                        </div>
                                        <div className="flex items-start gap-1.5">
                                            <span className="text-accent">•</span>
                                            <span>Verify the host spelling in the address bar</span>
                                        </div>
                                        <div className="flex items-start gap-1.5">
                                            <span className="text-accent">•</span>
                                            <span>Check VPN, proxy, and firewall security permissions</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Raw Technical Parameters */}
                            <div className={`p-2 rounded-lg font-mono text-[10px] flex flex-col gap-0.5 border ${
                                isBright 
                                    ? 'bg-black/[0.03] border-black/[0.06] text-zinc-700' 
                                    : 'bg-black/40 border-white/[0.06] text-white/60'
                            }`}>
                                <div className="flex justify-between">
                                    <span className="opacity-50">Protocol:</span>
                                    <span className={isInsecure ? 'text-amber-400 font-semibold' : 'text-white/80'}>
                                        {isInsecure ? (errorCode === 'HTTP_INSECURE' ? 'HTTP (Port 80 Plaintext)' : 'HTTPS (Untrusted Handshake)') : 'TCP / IP'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="opacity-50">Status:</span>
                                    <span className={`font-semibold ${isInsecure ? 'text-rose-400' : 'text-amber-400'}`}>{errorDesc} ({errorCode})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="opacity-50">Host:</span>
                                    <span className="truncate max-w-[240px]">{cleanQuery || targetUrl || 'Unknown'}</span>
                                </div>
                            </div>

                            {/* Copy Diagnostic Details button */}
                            <button
                                type="button"
                                onClick={handleCopyDiagnostics}
                                className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[10px] font-mono transition cursor-pointer border ${
                                    isBright
                                        ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-700'
                                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
                                }`}
                            >
                                {copiedDiag ? (
                                    <>
                                        <Check size={11} className="text-emerald-400" />
                                        <span>Copied Diagnostic Report</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={11} />
                                        <span>Copy Diagnostic Details</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

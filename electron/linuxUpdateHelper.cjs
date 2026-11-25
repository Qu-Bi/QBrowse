'use strict';

const path = require('path');
const fsSync = require('fs');
const fsPromisesDefault = require('fs/promises');
const { execFileSync: defaultExecFileSync } = require('child_process');
const rustBridge = require('./rustBridge.cjs');

const ARCH_ALIASES = {
    x64: ['x64', 'amd64', 'x86_64'],
    arm64: ['arm64', 'aarch64'],
    ia32: ['ia32', 'i386', 'i686', 'x86'],
    arm: ['armv7l', 'armhf', 'arm']
};

const ALL_ARCH_PATTERNS = [
    { arch: 'arm64', regex: /(?:^|[-_.])(arm64|aarch64)(?:[-_.]|$)/i },
    { arch: 'x64', regex: /(?:^|[-_.])(x86_64|amd64|x64)(?:[-_.]|$)/i },
    { arch: 'arm', regex: /(?:^|[-_.])(armv7l|armhf)(?:[-_.]|$)/i },
    { arch: 'ia32', regex: /(?:^|[-_.])(ia32|i386|i686)(?:[-_.]|$)/i }
];

const INSTALL_TYPE_META = {
    appimage: {
        installType: 'appimage',
        canAutoInstall: true,
        managedExternally: false,
        label: 'AppImage',
        shortLabel: 'AppImage',
        packageExt: '.AppImage'
    },
    deb: {
        installType: 'deb',
        canAutoInstall: false,
        managedExternally: false,
        label: 'Debian / Ubuntu (.deb)',
        shortLabel: '.deb',
        packageExt: '.deb'
    },
    rpm: {
        installType: 'rpm',
        canAutoInstall: false,
        managedExternally: false,
        label: 'Fedora / RHEL / openSUSE (.rpm)',
        shortLabel: '.rpm',
        packageExt: '.rpm'
    },
    pacman: {
        installType: 'pacman',
        canAutoInstall: false,
        managedExternally: false,
        label: 'Arch Linux (.pacman)',
        shortLabel: '.pacman',
        packageExt: '.pacman'
    },
    flatpak: {
        installType: 'flatpak',
        canAutoInstall: false,
        managedExternally: true,
        label: 'Flatpak',
        shortLabel: 'Flatpak',
        packageExt: null
    },
    snap: {
        installType: 'snap',
        canAutoInstall: false,
        managedExternally: true,
        label: 'Snap',
        shortLabel: 'Snap',
        packageExt: null
    },
    tarball: {
        installType: 'tarball',
        canAutoInstall: false,
        managedExternally: false,
        label: 'Portable Archive (.tar.gz)',
        shortLabel: '.tar.gz',
        packageExt: '.tar.gz'
    }
};

function normalizeSemver(ver) {
    if (!ver || typeof ver !== 'string') return '0.0.0';
    // Strip leading v/V and optional +build metadata
    return ver.trim().replace(/^[vV]+/, '').split('+')[0].trim() || '0.0.0';
}

function comparePrerelease(preA, preB) {
    if (!preA && !preB) return 0;
    if (!preA && preB) return 1;  // Release > prerelease
    if (preA && !preB) return -1; // Prerelease < release

    const idsA = preA.split('.');
    const idsB = preB.split('.');
    const len = Math.max(idsA.length, idsB.length);

    for (let i = 0; i < len; i++) {
        if (i >= idsA.length) return -1;
        if (i >= idsB.length) return 1;
        const a = idsA[i];
        const b = idsB[i];
        if (a === b) continue;

        const aIsNum = /^\d+$/.test(a);
        const bIsNum = /^\d+$/.test(b);
        if (aIsNum && bIsNum) {
            const numA = parseInt(a, 10);
            const numB = parseInt(b, 10);
            if (numA !== numB) return numA > numB ? 1 : -1;
        } else if (aIsNum && !bIsNum) {
            return -1; // SemVer 2.0.0: numeric identifiers have lower precedence than non-numeric
        } else if (!aIsNum && bIsNum) {
            return 1;
        } else {
            return a > b ? 1 : -1;
        }
    }
    return 0;
}

function compareSemver(verA, verB) {
    return rustBridge.sysCompareSemver(String(verA || ''), String(verB || ''));
}

function normalizeLinuxArch(arch = process.arch) {
    return rustBridge.sysLinuxNormalizeArch(String(arch || 'x64'));
}

function getLinuxMetadataFileName(arch = process.arch) {
    return rustBridge.sysLinuxMetadataFilename(String(arch || 'x64'));
}

function detectAssetArch(fileName) {
    if (!fileName || typeof fileName !== 'string') return null;
    return rustBridge.sysLinuxDetectAssetArch(fileName) || null;
}

function isNonPackageArtifact(fileName) {
    return rustBridge.sysLinuxIsNonPackageArtifact(String(fileName || ''));
}

function sanitizeUpdateFileName(name, fallback = 'QBrowse-update.bin') {
    if (!name || typeof name !== 'string') return fallback;
    // Take only the basename across both POSIX and Windows separators
    const base = name.replace(/\\/g, '/').split('/').pop() || '';
    // Remove control chars, quotes, shell metacharacters, and collapse whitespace to hyphens
    const cleaned = base
        .replace(/[\x00-\x1f\x7f]/g, '')
        .replace(/["'`$\\|;&<>!?*?{}()[\]]/g, '')
        .replace(/\s+/g, '-')
        .replace(/^\.+/, '');
    if (!cleaned || cleaned === '.' || cleaned === '..') {
        return fallback;
    }
    return cleaned;
}

function detectLinuxInstallType({
    env = process.env,
    execPath = process.execPath,
    arch = process.arch,
    existsSync = fsSync.existsSync,
    execFileSync = defaultExecFileSync
} = {}) {
    const normArch = normalizeLinuxArch(arch);
    const safeEnv = env || {};
    const safeExecPath = String(execPath || '');

    const makeInfo = (type, extra = {}) => ({
        ...INSTALL_TYPE_META[type],
        arch: normArch,
        appImagePath: type === 'appimage' ? safeEnv.APPIMAGE || null : null,
        ...extra
    });

    // 1. AppImage runtime sets APPIMAGE to the absolute path of the .AppImage file
    if (safeEnv.APPIMAGE && typeof safeEnv.APPIMAGE === 'string' && safeEnv.APPIMAGE.trim()) {
        const appImagePath = safeEnv.APPIMAGE.trim();
        const isAbsolute = appImagePath.startsWith('/') && !appImagePath.includes('\0');
        return makeInfo('appimage', {
            appImagePath,
            canAutoInstall: isAbsolute
        });
    }

    // 2. Flatpak sandbox
    if (safeEnv.FLATPAK_ID || safeExists(existsSync, '/.flatpak-info')) {
        return makeInfo('flatpak', {
            flatpakId: safeEnv.FLATPAK_ID || 'com.qbrowse.app'
        });
    }

    // 3. Snap sandbox
    if (safeEnv.SNAP || safeEnv.SNAP_NAME) {
        return makeInfo('snap', {
            snapName: safeEnv.SNAP_NAME || 'qbrowse'
        });
    }

    const isSystemInstallPath = /^\/(opt|usr)\//.test(safeExecPath);

    // 4. Query native package manager ownership for system-installed binaries
    if (isSystemInstallPath && safeExecPath && typeof execFileSync === 'function') {
        if (probePackageOwnership(execFileSync, 'dpkg', ['-S', safeExecPath])) {
            return makeInfo('deb');
        }
        if (probePackageOwnership(execFileSync, 'rpm', ['-qf', safeExecPath])) {
            return makeInfo('rpm');
        }
        if (probePackageOwnership(execFileSync, 'pacman', ['-Qo', safeExecPath])) {
            return makeInfo('pacman');
        }
    }

    // 5. System path heuristic when package-manager query is unavailable
    if (isSystemInstallPath) {
        if (safeExists(existsSync, '/etc/arch-release') || safeExists(existsSync, '/usr/bin/pacman')) {
            return makeInfo('pacman');
        }
        if (
            safeExists(existsSync, '/etc/fedora-release') ||
            safeExists(existsSync, '/etc/redhat-release') ||
            safeExists(existsSync, '/etc/SuSE-release') ||
            safeExists(existsSync, '/usr/bin/rpm')
        ) {
            return makeInfo('rpm');
        }
        if (safeExists(existsSync, '/etc/debian_version') || safeExists(existsSync, '/usr/bin/dpkg')) {
            return makeInfo('deb');
        }
    }

    // 6. Extracted portable archive / custom user-directory installation
    return makeInfo('tarball');
}

function safeExists(existsSyncFn, targetPath) {
    try {
        return Boolean(existsSyncFn && existsSyncFn(targetPath));
    } catch (_) {
        return false;
    }
}

function probePackageOwnership(execFileSyncFn, cmd, args) {
    try {
        execFileSyncFn(cmd, args, {
            stdio: ['ignore', 'pipe', 'ignore'],
            timeout: 1500
        });
        return true;
    } catch (_) {
        return false;
    }
}

function selectLinuxReleaseAsset(assets = [], installType = 'appimage', arch = process.arch, ymlData = null) {
    const normArch = normalizeLinuxArch(arch);
    const validAssets = (Array.isArray(assets) ? assets : []).filter(
        (a) => a && typeof a.name === 'string' && a.browser_download_url && !isNonPackageArtifact(a.name)
    );

    if (installType === 'flatpak' || installType === 'snap') {
        return null;
    }

    const matchesArch = (asset) => {
        const assetArch = detectAssetArch(asset.name);
        if (assetArch) {
            return assetArch === normArch;
        }
        // electron-builder historically omitted arch suffix on x64 AppImages/tarballs/pacman packages
        return normArch === 'x64';
    };

    const archMatched = validAssets.filter(matchesArch);

    const findByExt = (ext) => {
        const lowerExt = ext.toLowerCase();
        // Prefer explicitly arch-tagged assets first, then arch-implicit x64 assets
        const extMatches = archMatched.filter((a) => a.name.toLowerCase().endsWith(lowerExt));
        if (extMatches.length === 0) return null;
        const explicitMatch = extMatches.find((a) => detectAssetArch(a.name) === normArch);
        return explicitMatch || extMatches[0];
    };

    const extPriorityByType = {
        appimage: ['.AppImage', '.tar.gz'],
        deb: ['.deb', '.AppImage', '.tar.gz'],
        rpm: ['.rpm', '.AppImage', '.tar.gz'],
        pacman: ['.pacman', '.AppImage', '.tar.gz'],
        tarball: ['.tar.gz', '.AppImage', '.deb']
    };

    const extPriority = extPriorityByType[installType] || ['.AppImage', '.deb', '.rpm', '.pacman', '.tar.gz'];
    let chosen = null;
    for (const ext of extPriority) {
        chosen = findByExt(ext);
        if (chosen) break;
    }

    if (!chosen) return null;

    let expectedSha512 = null;
    if (ymlData && Array.isArray(ymlData.files) && ymlData.files.length > 0) {
        const normChosen = chosen.name.replace(/[-.\s]+/g, '').toLowerCase();
        const matched = ymlData.files.find(
            (f) => f && f.url && (f.url === chosen.name || f.url.replace(/[-.\s]+/g, '').toLowerCase() === normChosen)
        );
        if (matched && matched.sha512) {
            expectedSha512 = matched.sha512;
        }
    }
    if (!expectedSha512 && chosen.name.toLowerCase().endsWith('.appimage') && ymlData && ymlData.sha512) {
        expectedSha512 = ymlData.sha512;
    }

    return {
        name: chosen.name,
        url: chosen.browser_download_url,
        size: chosen.size || 0,
        sha512: expectedSha512,
        arch: detectAssetArch(chosen.name) || normArch
    };
}

function shellQuotePosix(str) {
    // POSIX-safe single-quoting: replace ' with '\''
    const s = String(str || '').replace(/[\r\n\0]/g, '');
    return `'${s.replace(/'/g, `'\\''`)}'`;
}

function buildLinuxInstallCommand(installType, filePathOrName = '', opts = {}) {
    const rawTarget = String(filePathOrName || '').trim();
    const hasPathSep = rawTarget.includes('/');
    const quotedTarget = rawTarget
        ? (hasPathSep ? shellQuotePosix(rawTarget) : shellQuotePosix(`./${sanitizeUpdateFileName(rawTarget)}`))
        : null;

    switch (installType) {
        case 'flatpak':
            return `flatpak update ${opts.flatpakId || 'com.qbrowse.app'}`;
        case 'snap':
            return `sudo snap refresh ${opts.snapName || 'qbrowse'}`;
        case 'deb':
            return quotedTarget ? `sudo apt install ${quotedTarget}` : 'sudo apt install ./qbrowse.deb';
        case 'rpm':
            return quotedTarget ? `sudo dnf install ${quotedTarget}` : 'sudo dnf install ./qbrowse.rpm';
        case 'pacman':
            return quotedTarget ? `sudo pacman -U ${quotedTarget}` : 'sudo pacman -U ./qbrowse.pacman';
        case 'tarball':
            return quotedTarget ? `tar -xzf ${quotedTarget}` : 'tar -xzf ./qbrowse.tar.gz';
        case 'appimage':
            return quotedTarget ? `chmod +x ${quotedTarget} && ${quotedTarget}` : 'chmod +x ./QBrowse.AppImage && ./QBrowse.AppImage';
        default:
            return quotedTarget ? `xdg-open ${quotedTarget}` : '';
    }
}

async function replaceAppImageAtomically(downloadedFilePath, targetAppImagePath, fsPromises = fsPromisesDefault) {
    if (!targetAppImagePath || typeof targetAppImagePath !== 'string' || !targetAppImagePath.startsWith('/') || targetAppImagePath.includes('\0')) {
        throw new Error(`Invalid target AppImage path: ${targetAppImagePath}`);
    }
    if (!downloadedFilePath || typeof downloadedFilePath !== 'string') {
        throw new Error('Missing downloaded AppImage file path');
    }

    const targetDir = path.posix.dirname(targetAppImagePath);
    const stagedPath = path.posix.join(
        targetDir,
        `.qbrowse-update-${process.pid}-${Date.now()}.AppImage`
    );

    try {
        await fsPromises.copyFile(downloadedFilePath, stagedPath);
        await fsPromises.chmod(stagedPath, 0o755);
        // POSIX rename atomically swaps the directory entry without ETXTBSY on the running AppImage
        await fsPromises.rename(stagedPath, targetAppImagePath);
        return targetAppImagePath;
    } catch (err) {
        try {
            await fsPromises.unlink(stagedPath);
        } catch (_) {}
        throw err;
    }
}

function resolveLinuxDesktopEntryState({
    env = process.env,
    existsSync = fsSync.existsSync
} = {}) {
    const safeEnv = env || {};
    if (safeEnv.FLATPAK_ID || safeExists(existsSync, '/.flatpak-info')) {
        return { shouldWriteUserEntry: false, desktopId: `${safeEnv.FLATPAK_ID || 'com.qbrowse.app'}.desktop` };
    }
    if (safeEnv.SNAP || safeEnv.SNAP_NAME) {
        return { shouldWriteUserEntry: false, desktopId: `${safeEnv.SNAP_NAME || 'qbrowse'}_${safeEnv.SNAP_NAME || 'qbrowse'}.desktop` };
    }
    // If running a system-installed package (.deb / .rpm / .pacman) rather than an AppImage,
    // prefer the existing system .desktop entry to avoid duplicate app launcher icons.
    if (!safeEnv.APPIMAGE) {
        const systemCandidates = [
            { file: '/usr/share/applications/QBrowse.desktop', id: 'QBrowse.desktop' },
            { file: '/usr/share/applications/qbrowse.desktop', id: 'qbrowse.desktop' }
        ];
        for (const candidate of systemCandidates) {
            if (safeExists(existsSync, candidate.file)) {
                return { shouldWriteUserEntry: false, desktopId: candidate.id };
            }
        }
    }
    return { shouldWriteUserEntry: true, desktopId: 'qbrowse.desktop' };
}

module.exports = {
    ARCH_ALIASES,
    INSTALL_TYPE_META,
    normalizeSemver,
    compareSemver,
    normalizeLinuxArch,
    getLinuxMetadataFileName,
    detectAssetArch,
    isNonPackageArtifact,
    sanitizeUpdateFileName,
    detectLinuxInstallType,
    selectLinuxReleaseAsset,
    shellQuotePosix,
    buildLinuxInstallCommand,
    replaceAppImageAtomically,
    resolveLinuxDesktopEntryState
};

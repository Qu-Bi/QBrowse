'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
    normalizeSemver,
    compareSemver,
    normalizeLinuxArch,
    getLinuxMetadataFileName,
    detectAssetArch,
    sanitizeUpdateFileName,
    detectLinuxInstallType,
    selectLinuxReleaseAsset,
    buildLinuxInstallCommand,
    replaceAppImageAtomically,
    resolveLinuxDesktopEntryState
} = require('./electron/linuxUpdateHelper.cjs');

let passed = 0;
async function test(name, fn) {
    try {
        await fn();
        console.log(`  PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`  FAIL: ${name}`);
        console.error(err);
        process.exitCode = 1;
    }
}

async function run() {
    console.log('Running Linux install/update compatibility tests...\n');

    // 1. Install-type detection
    await test('detects AppImage when APPIMAGE env is set', () => {
        const res = detectLinuxInstallType({
            env: { APPIMAGE: '/home/user/Applications/QBrowse-1.4.3-x86_64.AppImage' },
            execPath: '/tmp/.mount_QBrowse/QBrowse',
            arch: 'x64',
            existsSync: () => false,
            execFileSync: () => { throw new Error('unused'); }
        });
        assert.strictEqual(res.installType, 'appimage');
        assert.strictEqual(res.canAutoInstall, true);
        assert.strictEqual(res.managedExternally, false);
        assert.strictEqual(res.packageExt, '.AppImage');
        assert.strictEqual(res.appImagePath, '/home/user/Applications/QBrowse-1.4.3-x86_64.AppImage');
    });

    await test('detects Flatpak via FLATPAK_ID or /.flatpak-info', () => {
        const resEnv = detectLinuxInstallType({
            env: { FLATPAK_ID: 'com.qbrowse.app' },
            execPath: '/app/qbrowse/QBrowse',
            arch: 'x64',
            existsSync: () => false,
            execFileSync: () => { throw new Error('unused'); }
        });
        assert.strictEqual(resEnv.installType, 'flatpak');
        assert.strictEqual(resEnv.canAutoInstall, false);
        assert.strictEqual(resEnv.managedExternally, true);

        const resFile = detectLinuxInstallType({
            env: {},
            execPath: '/app/qbrowse/QBrowse',
            arch: 'x64',
            existsSync: (p) => p === '/.flatpak-info',
            execFileSync: () => { throw new Error('unused'); }
        });
        assert.strictEqual(resFile.installType, 'flatpak');
    });

    await test('detects Snap via SNAP / SNAP_NAME', () => {
        const res = detectLinuxInstallType({
            env: { SNAP: '/snap/qbrowse/current', SNAP_NAME: 'qbrowse' },
            execPath: '/snap/qbrowse/current/QBrowse',
            arch: 'x64',
            existsSync: () => false,
            execFileSync: () => { throw new Error('unused'); }
        });
        assert.strictEqual(res.installType, 'snap');
        assert.strictEqual(res.canAutoInstall, false);
        assert.strictEqual(res.managedExternally, true);
    });

    await test('detects deb via dpkg -S ownership of /opt/QBrowse/QBrowse', () => {
        const res = detectLinuxInstallType({
            env: {},
            execPath: '/opt/QBrowse/QBrowse',
            arch: 'x64',
            existsSync: () => false,
            execFileSync: (cmd) => {
                if (cmd === 'dpkg') return 'qbrowse: /opt/QBrowse/QBrowse';
                throw new Error('not owned');
            }
        });
        assert.strictEqual(res.installType, 'deb');
        assert.strictEqual(res.canAutoInstall, false);
        assert.strictEqual(res.packageExt, '.deb');
    });

    await test('detects rpm via rpm -qf ownership of /opt/QBrowse/QBrowse', () => {
        const res = detectLinuxInstallType({
            env: {},
            execPath: '/opt/QBrowse/QBrowse',
            arch: 'x64',
            existsSync: () => false,
            execFileSync: (cmd) => {
                if (cmd === 'rpm') return 'qbrowse-1.4.3-1.x86_64';
                throw new Error('not owned');
            }
        });
        assert.strictEqual(res.installType, 'rpm');
        assert.strictEqual(res.canAutoInstall, false);
        assert.strictEqual(res.packageExt, '.rpm');
    });

    await test('detects pacman via pacman -Qo ownership of /opt/QBrowse/QBrowse', () => {
        const res = detectLinuxInstallType({
            env: {},
            execPath: '/opt/QBrowse/QBrowse',
            arch: 'x64',
            existsSync: () => false,
            execFileSync: (cmd) => {
                if (cmd === 'pacman') return '/opt/QBrowse/QBrowse is owned by qbrowse 1.4.3-1';
                throw new Error('not owned');
            }
        });
        assert.strictEqual(res.installType, 'pacman');
        assert.strictEqual(res.canAutoInstall, false);
        assert.strictEqual(res.packageExt, '.pacman');
    });

    await test('detects unpacked/tarball install in user home even on Debian distro', () => {
        const res = detectLinuxInstallType({
            env: {},
            execPath: '/home/user/Downloads/QBrowse-1.4.3/QBrowse',
            arch: 'x64',
            existsSync: (p) => p === '/etc/debian_version' || p === '/usr/bin/dpkg',
            execFileSync: () => { throw new Error('should not query dpkg for home dir'); }
        });
        assert.strictEqual(res.installType, 'tarball');
        assert.strictEqual(res.canAutoInstall, false);
        assert.strictEqual(res.packageExt, '.tar.gz');
    });

    // 2. Semver comparison
    await test('compares semver accurately across stable, v-prefixed, prerelease, and build metadata', () => {
        assert.strictEqual(normalizeSemver('v1.4.4+build.9'), '1.4.4');
        assert.strictEqual(compareSemver('1.4.4', '1.4.3'), 1);
        assert.strictEqual(compareSemver('1.4.3', '1.4.4'), -1);
        assert.strictEqual(compareSemver('v1.4.3', '1.4.3'), 0);
        assert.strictEqual(compareSemver('1.5.0', 'v1.5.0-beta.1'), 1);
        assert.strictEqual(compareSemver('v1.5.0-beta.1', '1.5.0'), -1);
        assert.strictEqual(compareSemver('1.5.0-beta.10', '1.5.0-beta.2'), 1);
        assert.strictEqual(compareSemver('1.5.0-beta.1', '1.4.9'), 1);
        assert.strictEqual(compareSemver('2.0.0', '1.99.99'), 1);
    });

    // 3. Architecture & metadata filename resolution
    await test('resolves arch aliases and arch-specific latest-linux metadata filenames', () => {
        assert.strictEqual(normalizeLinuxArch('x64'), 'x64');
        assert.strictEqual(normalizeLinuxArch('amd64'), 'x64');
        assert.strictEqual(normalizeLinuxArch('x86_64'), 'x64');
        assert.strictEqual(normalizeLinuxArch('aarch64'), 'arm64');
        assert.strictEqual(getLinuxMetadataFileName('x64'), 'latest-linux.yml');
        assert.strictEqual(getLinuxMetadataFileName('arm64'), 'latest-linux-arm64.yml');
        assert.strictEqual(detectAssetArch('qbrowse_1.4.4_amd64.deb'), 'x64');
        assert.strictEqual(detectAssetArch('qbrowse_1.4.4_arm64.deb'), 'arm64');
        assert.strictEqual(detectAssetArch('qbrowse-1.4.4.aarch64.rpm'), 'arm64');
        assert.strictEqual(detectAssetArch('QBrowse-1.4.4-x86_64.AppImage'), 'x64');
    });

    // 4. Asset selection for deb / rpm / pacman / appimage / tarball on x64 and arm64
    const mockAssets = [
        { name: 'latest-linux.yml', browser_download_url: 'https://example.test/latest-linux.yml', size: 400 },
        { name: 'QBrowse-Setup-1.4.4.exe', browser_download_url: 'https://example.test/QBrowse-Setup-1.4.4.exe', size: 100000 },
        { name: 'QBrowse-1.4.4-arm64.AppImage', browser_download_url: 'https://example.test/QBrowse-1.4.4-arm64.AppImage', size: 110000 },
        { name: 'QBrowse-1.4.4-x86_64.AppImage', browser_download_url: 'https://example.test/QBrowse-1.4.4-x86_64.AppImage', size: 120000 },
        { name: 'QBrowse-1.4.4-x86_64.AppImage.blockmap', browser_download_url: 'https://example.test/QBrowse-1.4.4-x86_64.AppImage.blockmap', size: 5000 },
        { name: 'qbrowse_1.4.4_arm64.deb', browser_download_url: 'https://example.test/qbrowse_1.4.4_arm64.deb', size: 95000 },
        { name: 'qbrowse_1.4.4_amd64.deb', browser_download_url: 'https://example.test/qbrowse_1.4.4_amd64.deb', size: 96000 },
        { name: 'qbrowse-1.4.4.aarch64.rpm', browser_download_url: 'https://example.test/qbrowse-1.4.4.aarch64.rpm', size: 97000 },
        { name: 'qbrowse-1.4.4.x86_64.rpm', browser_download_url: 'https://example.test/qbrowse-1.4.4.x86_64.rpm', size: 98000 },
        { name: 'qbrowse-1.4.4-x64.pacman', browser_download_url: 'https://example.test/qbrowse-1.4.4-x64.pacman', size: 99000 },
        { name: 'QBrowse-1.4.4-arm64.tar.gz', browser_download_url: 'https://example.test/QBrowse-1.4.4-arm64.tar.gz', size: 101000 },
        { name: 'QBrowse-1.4.4-x64.tar.gz', browser_download_url: 'https://example.test/QBrowse-1.4.4-x64.tar.gz', size: 102000 }
    ];
    const mockYml = {
        version: '1.4.4',
        sha512: 'APPIMAGE_X64_SHA512',
        files: [{ url: 'QBrowse-1.4.4-x86_64.AppImage', sha512: 'APPIMAGE_X64_SHA512', size: 120000 }]
    };

    await test('selects exact package format and architecture on x64', () => {
        const appImg = selectLinuxReleaseAsset(mockAssets, 'appimage', 'x64', mockYml);
        assert.strictEqual(appImg.name, 'QBrowse-1.4.4-x86_64.AppImage');
        assert.strictEqual(appImg.sha512, 'APPIMAGE_X64_SHA512');

        assert.strictEqual(selectLinuxReleaseAsset(mockAssets, 'deb', 'x64', mockYml).name, 'qbrowse_1.4.4_amd64.deb');
        assert.strictEqual(selectLinuxReleaseAsset(mockAssets, 'rpm', 'x64', mockYml).name, 'qbrowse-1.4.4.x86_64.rpm');
        assert.strictEqual(selectLinuxReleaseAsset(mockAssets, 'pacman', 'x64', mockYml).name, 'qbrowse-1.4.4-x64.pacman');
        assert.strictEqual(selectLinuxReleaseAsset(mockAssets, 'tarball', 'x64', mockYml).name, 'QBrowse-1.4.4-x64.tar.gz');
    });

    await test('selects exact package format and architecture on arm64 (never picks x64)', () => {
        assert.strictEqual(selectLinuxReleaseAsset(mockAssets, 'appimage', 'arm64', null).name, 'QBrowse-1.4.4-arm64.AppImage');
        assert.strictEqual(selectLinuxReleaseAsset(mockAssets, 'deb', 'arm64', null).name, 'qbrowse_1.4.4_arm64.deb');
        assert.strictEqual(selectLinuxReleaseAsset(mockAssets, 'rpm', 'arm64', null).name, 'qbrowse-1.4.4.aarch64.rpm');
        assert.strictEqual(selectLinuxReleaseAsset(mockAssets, 'tarball', 'arm64', null).name, 'QBrowse-1.4.4-arm64.tar.gz');

        // When only x64 assets exist, arm64 must return null rather than downloading incompatible x64 binary
        const x64Only = mockAssets.filter(a => !/arm64|aarch64/i.test(a.name));
        assert.strictEqual(selectLinuxReleaseAsset(x64Only, 'deb', 'arm64', null), null);
    });

    await test('returns null asset for externally managed Flatpak and Snap', () => {
        assert.strictEqual(selectLinuxReleaseAsset(mockAssets, 'flatpak', 'x64', mockYml), null);
        assert.strictEqual(selectLinuxReleaseAsset(mockAssets, 'snap', 'x64', mockYml), null);
    });

    // 5. Filename sanitization & install command generation
    await test('sanitizes unsafe filenames and builds shell-safe install commands', () => {
        assert.strictEqual(sanitizeUpdateFileName('../../evil;rm -rf qbrowse_1.4.4.deb'), 'evilrm--rf-qbrowse_1.4.4.deb');
        assert.strictEqual(sanitizeUpdateFileName('QBrowse 1.4.4 x86_64.AppImage'), 'QBrowse-1.4.4-x86_64.AppImage');
        assert.strictEqual(sanitizeUpdateFileName('../../../..', 'fallback.deb'), 'fallback.deb');

        assert.strictEqual(
            buildLinuxInstallCommand('deb', '/home/user/Downloads/qbrowse_1.4.4_amd64.deb'),
            "sudo apt install '/home/user/Downloads/qbrowse_1.4.4_amd64.deb'"
        );
        assert.strictEqual(
            buildLinuxInstallCommand('rpm', '/home/user/Downloads/qbrowse-1.4.4.x86_64.rpm'),
            "sudo dnf install '/home/user/Downloads/qbrowse-1.4.4.x86_64.rpm'"
        );
        assert.strictEqual(
            buildLinuxInstallCommand('pacman', '/home/user/Downloads/qbrowse-1.4.4-x64.pacman'),
            "sudo pacman -U '/home/user/Downloads/qbrowse-1.4.4-x64.pacman'"
        );
        assert.strictEqual(
            buildLinuxInstallCommand('tarball', '/home/user/Downloads/QBrowse-1.4.4-x64.tar.gz'),
            "tar -xzf '/home/user/Downloads/QBrowse-1.4.4-x64.tar.gz'"
        );
        assert.strictEqual(
            buildLinuxInstallCommand('flatpak'),
            'flatpak update com.qbrowse.app'
        );
        assert.strictEqual(
            buildLinuxInstallCommand('snap'),
            'sudo snap refresh qbrowse'
        );
    });

    // 6. Atomic AppImage replacement (stages in target dir -> chmod -> rename)
    await test('replaceAppImageAtomically stages, chmods 0755, and atomically renames', async () => {
        const ops = [];
        const mockFs = {
            copyFile: async (src, dst) => ops.push(['copyFile', src, dst]),
            chmod: async (p, mode) => ops.push(['chmod', p, mode]),
            rename: async (src, dst) => ops.push(['rename', src, dst]),
            unlink: async (p) => ops.push(['unlink', p])
        };
        const result = await replaceAppImageAtomically('/tmp/update.AppImage', '/home/user/Apps/QBrowse.AppImage', mockFs);
        assert.strictEqual(result, '/home/user/Apps/QBrowse.AppImage');
        assert.strictEqual(ops.length, 3);
        assert.strictEqual(ops[0][0], 'copyFile');
        assert.ok(ops[0][2].startsWith('/home/user/Apps/.qbrowse-update-'));
        assert.strictEqual(ops[1][0], 'chmod');
        assert.strictEqual(ops[1][2], 0o755);
        assert.strictEqual(ops[2][0], 'rename');
        assert.strictEqual(ops[2][1], ops[0][2]);
        assert.strictEqual(ops[2][2], '/home/user/Apps/QBrowse.AppImage');
    });

    // 7. Desktop entry state resolution
    await test('resolveLinuxDesktopEntryState avoids duplicating system .desktop and skips Flatpak/Snap', () => {
        assert.strictEqual(
            resolveLinuxDesktopEntryState({ env: { FLATPAK_ID: 'com.qbrowse.app' }, existsSync: () => false }).shouldWriteUserEntry,
            false
        );
        const debEntry = resolveLinuxDesktopEntryState({
            env: {},
            existsSync: (p) => p === '/usr/share/applications/QBrowse.desktop'
        });
        assert.strictEqual(debEntry.shouldWriteUserEntry, false);
        assert.strictEqual(debEntry.desktopId, 'QBrowse.desktop');

        const appImgEntry = resolveLinuxDesktopEntryState({
            env: { APPIMAGE: '/home/user/QBrowse.AppImage' },
            existsSync: (p) => p === '/usr/share/applications/QBrowse.desktop'
        });
        assert.strictEqual(appImgEntry.shouldWriteUserEntry, true);
        assert.strictEqual(appImgEntry.desktopId, 'qbrowse.desktop');
    });

    // 8. Validate package.json build.linux configuration
    await test('package.json build.linux has valid targets, space-free artifactNames, icon, StartupWMClass, and MimeType', () => {
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
        const build = pkg.build;
        assert.ok(build && build.linux, 'build.linux must exist');

        // Icon bundled in files
        assert.ok(Array.isArray(build.files) && build.files.includes('icon.png'), 'icon.png must be included in build.files');
        assert.ok(Array.isArray(build.asarUnpack) && build.asarUnpack.includes('**/*.node'), 'native .node addons must be unpacked from asar');

        // Required targets
        const targets = build.linux.target.map(t => (typeof t === 'string' ? t : t.target));
        for (const reqTarget of ['AppImage', 'deb', 'rpm', 'pacman', 'tar.gz']) {
            assert.ok(targets.includes(reqTarget), `build.linux.target must include ${reqTarget}`);
        }

        // No spaces in any Linux artifactName
        const artifactNames = [
            build.linux.artifactName,
            build.appImage?.artifactName,
            build.deb?.artifactName,
            build.rpm?.artifactName,
            build.pacman?.artifactName
        ];
        for (const pattern of artifactNames) {
            assert.ok(typeof pattern === 'string' && pattern.length > 0, 'artifactName must be defined');
            assert.strictEqual(/\s/.test(pattern), false, `artifactName must not contain spaces: ${pattern}`);
        }

        // Desktop entry & MIME types
        assert.strictEqual(build.linux.desktop?.entry?.StartupWMClass, 'QBrowse');
        assert.ok(Array.isArray(build.linux.mimeTypes), 'build.linux.mimeTypes must be an array');
        assert.ok(build.linux.mimeTypes.includes('x-scheme-handler/http'));
        assert.ok(build.linux.mimeTypes.includes('x-scheme-handler/https'));
        assert.ok(build.linux.mimeTypes.includes('text/html'));
    });

    await test('keeps Standard and Experimental Rust edition metadata and assets strictly isolated', () => {
        assert.strictEqual(getLinuxMetadataFileName('x64', 'standard'), 'latest-linux.yml');
        assert.strictEqual(getLinuxMetadataFileName('x64', 'rust'), 'rust-linux.yml');
        assert.strictEqual(getLinuxMetadataFileName('arm64', 'rust'), 'rust-linux-arm64.yml');

        const mixedAssets = [
            { name: 'QBrowse-1.5.0-x86_64.AppImage', browser_download_url: 'https://example.com/std.AppImage', size: 100 },
            { name: 'QBrowse-Rust-1.5.0-x86_64.AppImage', browser_download_url: 'https://example.com/rust.AppImage', size: 110 },
            { name: 'qbrowse_1.5.0_amd64.deb', browser_download_url: 'https://example.com/std.deb', size: 100 },
            { name: 'qbrowse_rust_1.5.0_amd64.deb', browser_download_url: 'https://example.com/rust.deb', size: 110 }
        ];

        const stdAppImage = selectLinuxReleaseAsset(mixedAssets, 'appimage', 'x64', null, 'standard');
        const rustAppImage = selectLinuxReleaseAsset(mixedAssets, 'appimage', 'x64', null, 'rust');
        assert.strictEqual(stdAppImage?.name, 'QBrowse-1.5.0-x86_64.AppImage');
        assert.strictEqual(rustAppImage?.name, 'QBrowse-Rust-1.5.0-x86_64.AppImage');

        const stdDeb = selectLinuxReleaseAsset(mixedAssets, 'deb', 'x64', null, 'standard');
        const rustDeb = selectLinuxReleaseAsset(mixedAssets, 'deb', 'x64', null, 'rust');
        assert.strictEqual(stdDeb?.name, 'qbrowse_1.5.0_amd64.deb');
        assert.strictEqual(rustDeb?.name, 'qbrowse_rust_1.5.0_amd64.deb');
    });

    console.log(`\n${passed} tests passed.`);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});

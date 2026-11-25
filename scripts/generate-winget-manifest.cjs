#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const MANIFEST_VERSION = '1.9.0';
const PACKAGE_ID = 'QuBI.QBrowse';
const ZERO_SHA256 = '0'.repeat(64);

function parseArgs(argv) {
    const opts = { version: null, installer: null };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--version' && argv[i + 1]) {
            opts.version = argv[++i].replace(/^v/i, '').trim();
        } else if (arg.startsWith('--version=')) {
            opts.version = arg.slice('--version='.length).replace(/^v/i, '').trim();
        } else if (arg === '--installer' && argv[i + 1]) {
            opts.installer = argv[++i];
        } else if (arg.startsWith('--installer=')) {
            opts.installer = arg.slice('--installer='.length);
        }
    }
    return opts;
}

function computeFileSha256(filePath) {
    const hash = crypto.createHash('sha256');
    hash.update(fs.readFileSync(filePath));
    return hash.digest('hex').toUpperCase();
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
    const version = args.version || String(pkg.version || '1.5.1').replace(/^v/i, '').trim();

    const defaultInstallerPath = path.join(ROOT_DIR, 'dist_electron', `QBrowse-Setup-${version}-x64.exe`);
    const installerPath = args.installer ? path.resolve(args.installer) : defaultInstallerPath;

    let sha256 = ZERO_SHA256;
    let shaSource = 'placeholder (installer not found locally)';
    if (fs.existsSync(installerPath)) {
        sha256 = computeFileSha256(installerPath);
        shaSource = installerPath;
    } else if (args.installer) {
        throw new Error(`Installer file not found: ${installerPath}`);
    }

    const outDir = path.join(ROOT_DIR, 'winget', 'manifests', 'q', 'Qu-Bi', 'QBrowse', version);
    fs.mkdirSync(outDir, { recursive: true });

    const installerUrl = `https://github.com/Qu-Bi/QBrowse/releases/download/v${version}/QBrowse-Setup-${version}-x64.exe`;

    const versionYaml = [
        '# yaml-language-server: $schema=https://aka.ms/winget-manifest.version.1.9.0.schema.json',
        '',
        `PackageIdentifier: ${PACKAGE_ID}`,
        `PackageVersion: ${version}`,
        'DefaultLocale: en-US',
        'ManifestType: version',
        `ManifestVersion: ${MANIFEST_VERSION}`,
        ''
    ].join('\n');

    const installerYaml = [
        '# yaml-language-server: $schema=https://aka.ms/winget-manifest.installer.1.9.0.schema.json',
        '',
        `PackageIdentifier: ${PACKAGE_ID}`,
        `PackageVersion: ${version}`,
        'InstallerType: nullsoft',
        'Scope: user',
        'UpgradeBehavior: install',
        'Protocols:',
        '  - http',
        '  - https',
        'Installers:',
        '  - Architecture: x64',
        `    InstallerUrl: ${installerUrl}`,
        `    InstallerSha256: ${sha256}`,
        'ManifestType: installer',
        `ManifestVersion: ${MANIFEST_VERSION}`,
        ''
    ].join('\n');

    const localeYaml = [
        '# yaml-language-server: $schema=https://aka.ms/winget-manifest.defaultLocale.1.9.0.schema.json',
        '',
        `PackageIdentifier: ${PACKAGE_ID}`,
        `PackageVersion: ${version}`,
        'PackageLocale: en-US',
        'Publisher: QuBI',
        'PublisherUrl: https://github.com/Qu-Bi/QBrowse',
        'PublisherSupportUrl: https://github.com/Qu-Bi/QBrowse/issues',
        'PackageName: QBrowse',
        'PackageUrl: https://github.com/Qu-Bi/QBrowse',
        'License: MIT',
        'LicenseUrl: https://github.com/Qu-Bi/QBrowse/blob/main/LICENSE',
        'ShortDescription: Next-generation privacy-first browser with built-in Tor onion routing, local Gemma AI, and encrypted cloud sync.',
        'Tags:',
        '  - browser',
        '  - privacy',
        '  - tor',
        '  - ai',
        '  - electron',
        '  - rust',
        `ReleaseNotesUrl: https://github.com/Qu-Bi/QBrowse/releases/tag/v${version}`,
        'ManifestType: defaultLocale',
        `ManifestVersion: ${MANIFEST_VERSION}`,
        ''
    ].join('\n');

    fs.writeFileSync(path.join(outDir, `${PACKAGE_ID}.yaml`), versionYaml, 'utf8');
    fs.writeFileSync(path.join(outDir, `${PACKAGE_ID}.installer.yaml`), installerYaml, 'utf8');
    fs.writeFileSync(path.join(outDir, `${PACKAGE_ID}.locale.en-US.yaml`), localeYaml, 'utf8');

    console.log(`Generated WinGet ${MANIFEST_VERSION} manifests for ${PACKAGE_ID} v${version} in ${outDir}`);
    console.log(`InstallerSha256: ${sha256} (from ${shaSource})`);
}

main();

<div align="center">
  <img src="icon.png" alt="QBrowse" width="112" height="112" />
  <h1>QBrowse</h1>
  <p>Privacy-first desktop browser with isolated spaces, built-in Tor routing, local AI, and zero-knowledge sync.</p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![GitHub Release](https://img.shields.io/github/v/release/Qu-Bi/QBrowse)](https://github.com/Qu-Bi/QBrowse/releases)
  [![Platforms](https://img.shields.io/badge/Platforms-Windows%20%7C%20Linux-lightgrey)](#downloads)
</div>

---

QBrowse is a desktop browser built on Electron, React, and Chromium, focused on keeping tracking, sessions, AI, and credential storage under your control without giving up modern web compatibility.

Every release ships in **two editions** for Windows and Linux:

| Edition | Branch | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Standard** | `main` | Stable | Classic Node.js / Electron backend (`QBrowse-Setup-*.exe`, `QBrowse-*.AppImage`, `.deb`, `.rpm`, `.pacman`, `.tar.gz`) |
| **Rust Edition** | `rust-edition` | **Experimental** | Moves adblock/shield, SQLite FTS5 history, QVault crypto, sync encryption, reader mode, PDF/DOCX/OCR, media streaming, Tor control, and OS helpers into an in-process Rust `napi-rs` core for lower RAM and faster startup (`QBrowse-Rust-*`) |

Both editions use separate auto-update channels (`latest*.yml` vs `rust*.yml`), so installing one will never overwrite you with the other during in-app updates.

---

## What's Inside

- **Spaces & Session Isolation**: Separate persistent cookie/storage partitions per space (`Personal`, `Work`, etc.), plus an ephemeral `Ghost` space and a `Tor` space that keep zero history or site permissions on disk.
- **Built-in Tor Mode**: Launches Tor on demand, inspects live 3-hop circuits (guard, middle, exit with country & IP), verifies SOCKS5h exit IP, and supports `NEWNYM` circuit rotation.
- **Native Ad & Tracker Shield**: Blocks ads and trackers at the network layer, strips third-party tracking cookies, enforces HTTPS-Only mode, handles cosmetic element collapsing, and supports per-site pausing.
- **Local AI (`llama.cpp`)**: Runs GGUF models (e.g. Gemma, Qwen, Bielik) locally on your CPU or GPU with vision (`mmproj`), PDF/DOCX/image OCR attachment parsing, voice input, and optional DuckDuckGo web context.
- **QVault & Passkeys**: Encrypted local credential manager with master password, PIN lockout, Windows Hello unlock, TOTP authenticator codes, WebAuthn passkeys, and CSV/JSON import from Bitwarden, Proton Pass, 1Password, Chrome, and Firefox.
- **Zero-Knowledge Cloud Sync**: End-to-end AES-256-GCM encryption (with PBKDF2 key derivation and Brotli payload compression in Rust Edition) before anything touches sync storage.
- **Browsing Tools**: Split/quad pane view, Reader Mode with Read Aloud highlighting, page highlighter & sticky notes, element eraser, local file/PDF/media viewer, and GitHub Work Mode.

---

## Downloads

Prebuilt installers and packages are available on the [Releases](https://github.com/Qu-Bi/QBrowse/releases) page:

- **Windows**: `.exe` (NSIS installer — `QBrowse-Setup-*` for Standard, `QBrowse-Rust-*` for Experimental Rust Edition)
- **Linux**: `.AppImage` (with in-app self-update), `.deb` (Debian/Ubuntu/Mint), `.rpm` (Fedora/RHEL/openSUSE), `.pacman` (Arch/Manjaro), and `.tar.gz`

---

## Building from Source

### Prerequisites
- **Node.js** 20+ and `npm`
- **Rust toolchain** (`rustup` / `cargo` stable) — *only required if building the `rust-edition` branch*
  - On Windows: Visual Studio Build Tools (MSVC C++).
  - On Linux: `build-essential` and `pkg-config`.

### Standard Edition (`main`)
```bash
git clone https://github.com/Qu-Bi/QBrowse.git
cd QBrowse
npm install
npm run electron:dev
```

### Rust Edition (`rust-edition`, Experimental)
```bash
git clone -b rust-edition https://github.com/Qu-Bi/QBrowse.git
cd QBrowse
npm install
npm run electron:start
```

### Packaging Installers
```bash
npm run build:win    # Windows NSIS .exe
npm run build:linux  # Linux .AppImage, .deb, .rpm, .pacman, .tar.gz
```

---

## Code Signing & License

- Official Windows releases are signed with certificates from the [SignPath Foundation](https://signpath.org). See [CODE_SIGNING.md](CODE_SIGNING.md) for policy details.
- Licensed under the [MIT License](LICENSE).

<h1 align="center">Scrcpy Manager</h1>

<p align="center">
  A sleek, modern Electron-based graphical interface for <a href="https://github.com/Genymobile/scrcpy">Scrcpy</a> — control your Android device wirelessly with one click.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.1.0-10b981.svg?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/electron-^42.0.1-47848F.svg?style=for-the-badge&logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/platform-Windows-0078D6.svg?style=for-the-badge&logo=windows&logoColor=white" alt="Windows">
  <img src="https://img.shields.io/badge/android-11%2B-3DDC84.svg?style=for-the-badge&logo=android&logoColor=white" alt="Android 11+">
</p>

---

## ✨ Features

### 📱 Device Management
View and manage all connected devices in one place — both USB and Wi-Fi devices are listed with clear status indicators.

### 🔗 Android 11+ Wireless Pairing (Pairing Code)
Pair your Android phone over Wi-Fi without a USB cable using the native **6-digit Pairing Code** workflow, powered by ADB mDNS broadcast (`_adb-tls-pairing._tcp`).

### ⚡ Smart Auto-Connect
Automatically scans your local network via mDNS (`_adb-tls-connect._tcp`) to detect if a previously paired device is **Online** — and connects instantly with one click. No manual port hunting required.

> If mDNS is blocked on your network, a manual port input fallback modal is available as a safety net.

### 🎛️ Scrcpy Quick Toggles
Launch mirroring with instant options:
| Toggle | Description |
|---|---|
| Turn Screen Off | Turns off the phone display while mirroring |
| Always on Top | Keeps the Scrcpy window above all others |
| Borderless Window | Launches Scrcpy without a window title bar |

### 🎬 Screen Recording
Record your Android device's screen directly from the app. Saves to `.mp4` or `.mkv` — just provide a filename and hit record.

### 🌙 Modern Dark UI
Built with a **Glassmorphism** dark theme using smooth animations and micro-interactions, powered by pure HTML/CSS/JS — no UI framework bloat.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- Windows OS

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/HansNura/scrcpy-gui.git
cd scrcpy-gui

# 2. Install dependencies
npm install

# 3. Run the app
npm start
```

> Scrcpy binaries (`scrcpy.exe`, `adb.exe`, and all required DLLs) are already bundled inside `vendor/scrcpy/`. No separate Scrcpy installation needed.

---

## 📁 Project Structure

```
scrcpy-gui/
├── vendor/
│   └── scrcpy/          ← Bundled scrcpy + adb binaries (Windows)
├── main.js              ← Electron main process & IPC handlers
├── preload.js           ← Secure IPC bridge (contextBridge)
├── renderer.js          ← UI logic & mDNS auto-discovery
├── index.html           ← App layout & modals
├── styles.css           ← Dark glassmorphism theme
└── paired-devices.json  ← Local storage for paired devices (auto-created)
```

---

## 📋 Changelog

### v1.1.0 — Wireless Debugging Overhaul
- ✅ Added **mDNS Auto-Discovery** for one-click wireless connection
- ✅ Added **Wireless Pairing** via 6-digit Pairing Code
- ✅ Added **🟢 ONLINE / Paired** status indicators on device list
- ✅ Added **Manual Port Fallback** modal for restrictive networks
- ✅ Added **Screen Recording** tab (`.mp4` / `.mkv`)
- ✅ Cleaned up QR Code tab (not supported natively by ADB CLI)
- 🔧 Fixed `preload.js` IPC bridge missing 6 critical methods
- 🔧 Fixed modal CSS overlay not rendering
- 🔧 Fixed mDNS raw strings leaking into device list UI

### v1.0.0 — Initial Release
- Basic USB device listing
- Scrcpy launch with toggle options

---

## 📝 License

ISC License © [HansNura](https://github.com/HansNura)

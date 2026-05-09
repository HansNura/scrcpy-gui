<h1 align="center">Scrcpy Pro Control Center</h1>

<p align="center">
  A sleek, modern, and professional Electron-based graphical interface for <a href="https://github.com/Genymobile/scrcpy">Scrcpy</a> — transforming basic mirroring into a full-featured Android control center.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.2.0_Pro-10b981.svg?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/electron-^42.0.1-47848F.svg?style=for-the-badge&logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/platform-Windows-0078D6.svg?style=for-the-badge&logo=windows&logoColor=white" alt="Windows">
  <img src="https://img.shields.io/badge/android-11%2B-3DDC84.svg?style=for-the-badge&logo=android&logoColor=white" alt="Android 11+">
</p>

---

## ✨ Key Features

### 🎨 Modern Pro UI
- **Dark Glassmorphism**: A stunning, hardware-accelerated aesthetic with a sleek sidebar navigation, smooth animations, and interactive micro-transitions.
- **Smart Device Table**: The device list is now a professional data table automatically extracting and displaying the real **Device Brand, Model, and Android Version**.

### ⚡ Performance Control
- **Video Codec Selection**: Choose between H.264, H.265 (HEVC), and AV1 for optimal streaming quality and latency.
- **Bitrate & FPS Tuning**: Push up to 32Mbps video bitrate and limit Max FPS directly from the UI.
- **Audio Forwarding**: Seamlessly toggle Android 11+ audio forwarding on or off.

### 🛠 Advanced Modes
- **Camera Mode (Webcam)**: Use your Android phone's camera as a high-quality PC webcam (`video-source=camera`).
- **OTG Mode**: Control your device seamlessly using your PC's keyboard and mouse without mirroring the display (simulates physical HID peripherals).

### 🔗 Smart Connectivity & Management
- **One-Click Wi-Fi Pairing**: Pair and connect wirelessly via Android's native 6-digit pairing code and mDNS auto-discovery.
- **Clean Deduplication**: An intelligent parser automatically cleans mDNS raw names and prevents duplicate device listings.
- **Disconnect & Forget**: Safely disconnect Wi-Fi devices or delete paired devices with native confirmation modals.

### 🛡 Safe Management
- **Single Process Lock**: A built-in safety mechanism that ensures only **one** Scrcpy process runs at a time. The UI dynamically tracks the process state, intelligently disabling conflicting buttons and turning the Start button into a red **STOP MIRRORING** switch.

### 🎬 Enhanced Recording
- **Multi-Format Export**: Record your session directly to `.mp4` or `.mkv`.
- **Record Background**: Record the Android screen silently without popping up the mirroring window.

### 📟 Diagnostic Tools
- **Built-in Real-Time Console**: A live terminal logs standard output and errors from Scrcpy and ADB in real-time, making troubleshooting and connection debugging effortless.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- Windows OS
- An Android Device (Android 11+ recommended for wireless features)

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

> **Note**: Scrcpy binaries (`scrcpy.exe`, `adb.exe`, and required DLLs) are bundled inside `vendor/scrcpy/`. No separate installation is needed!

---

## 🎛️ Advanced Usage

### Performance Tweaks
Navigate to the **Performance** tab to adjust streaming quality. If you experience lag over Wi-Fi, try lowering the **Bitrate** to `8 Mbps` or `4 Mbps`, and setting **Max FPS** to `30`. If your device supports it, switching the **Video Codec** to `H.265` provides better quality at lower bandwidths.

### Advanced Modes
In the **Advanced** tab, you can override standard mirroring:
- **Camera Mode**: Turns your phone into a webcam. *Note: You must grant "Shell" camera permissions on your Android device for this to work.*
- **OTG Mode**: Connects PC peripherals directly to the phone via USB HID. *Note: Only works via USB connection.*

---

## 🔧 Troubleshooting

If your device isn't connecting or mirroring fails to start:
1. **Toggle the Console**: Click the `Toggle Console` button in the bottom-left corner of the sidebar.
2. **Read the Logs**: The console provides real-time `adb` and `scrcpy` output. Look for errors like `adb: error: failed to get feature set` (usually meaning USB debugging is off or unauthorized) or `ERROR: Could not find any ADB device`.
3. **Network Constraints**: If Wireless Pairing fails, ensure your PC and phone are on the exact same Wi-Fi subnet and that your router allows mDNS multicast traffic.

---

## 🏗 Architecture

**Scrcpy Pro Control Center** adheres strictly to modern Electron security standards:
- **Main Process (`main.js`)**: Handles process spawning (`child_process`), ADB commands, and state tracking.
- **Preload Script (`preload.js`)**: Uses `contextBridge` to expose a heavily isolated IPC API (`window.scrcpyAPI`).
- **Renderer Process (`renderer.js`)**: Pure Vanilla JavaScript (No frameworks) handling the Dark Glassmorphism DOM, Event Listeners, and UI state.
- **Scrcpy Version**: Powered by Scrcpy v3.3.4.

---

## 📝 License

ISC License © [HansNura](https://github.com/HansNura)

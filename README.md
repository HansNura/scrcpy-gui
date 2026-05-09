<h1 align="center">
  Scrcpy Manager
</h1>

<p align="center">
  A sleek, modern Electron-based graphical interface for Scrcpy.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.1.0-blue.svg?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/electron-^42.0.1-47848F.svg?style=for-the-badge&logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/platform-windows-blueviolet.svg?style=for-the-badge&logo=windows" alt="Windows">
</p>

## ✨ Features

- **Modern Interface**: A stunning UI featuring a Dark Theme and Glassmorphism effects.
- **Device Management**: Easily view and manage currently active (USB/Wi-Fi) and previously paired devices.
- **Android 11+ Wireless Pairing**: True wireless setup using the native Android 6-digit Pairing Code via ADB mDNS broadcast.
- **Smart Auto-Connect**: Magically scans the network (mDNS `_adb-tls-connect._tcp`) to detect if Paired Devices are Online. Connect instantly with one click—no manual port typing required! (Includes a manual port fallback if mDNS is blocked).
- **Scrcpy Toggles**: Quickly toggle mirroring options:
  - Turn Screen Off
  - Always on Top
  - Borderless Window
- **Screen Recording**: Native support for recording your device's screen directly to `.mp4` or `.mkv`.

## 🚀 Installation & Usage

1. **Prerequisites**: Ensure you have [Node.js](https://nodejs.org/) installed.
2. **Clone the repository**:
   ```bash
   git clone https://github.com/HansNura/scrcpy-gui.git
   cd scrcpy-gui
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Start the App**:
   ```bash
   npm start
   ```

## 🛠️ Architecture

This project strictly utilizes the **Vendor/Bundling Architecture**:
All Scrcpy binaries (`adb.exe`, `scrcpy.exe`, and required DLLs) are bundled locally within the `vendor/scrcpy/` folder. This ensures the app is fully portable and doesn't rely on global environment variables or external installations.

## 📝 License

ISC License.

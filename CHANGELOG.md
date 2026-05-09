# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2024-05-09 (The "Pro Control Center" Update)

### Added
- **Modern UI**: Completely redesigned interface featuring a Dark Glassmorphism theme and a sleek Sidebar Navigation.
- **Performance Tab**: Fine-grained configuration for Video Codec (H.264, H.265/HEVC, AV1), Bitrate controls, Max FPS limiters, and Audio Forwarding toggle.
- **Advanced Tab**: Introduced Camera Mode (use Android phone as a PC Webcam) and OTG Mode (control phone via PC keyboard/mouse without screen mirroring).
- **Diagnostic Tools**: Built-in "Terminal Log Console" for real-time debugging of ADB and Scrcpy outputs.
- **Smart Device Table**: Replaced the basic list with an informative data table that automatically detects and displays the Device Model, Brand, and Android Version.
- **Device Management**: Added a dedicated "Disconnect" button for active Wi-Fi connections and confirmation modals before deleting paired devices.
- **Process Lock System**: Implemented an intelligent locking mechanism to prevent multiple mirroring windows from launching simultaneously.

### Fixed
- Fixed an issue where Scrcpy DLLs failed to load on Windows due to incorrect CWD (Current Working Directory) bindings.
- Resolved a "Silent Hang" issue during Wi-Fi connections by conditionally forcing ADB Forwarding when necessary.
- Fixed a bug where mDNS scan results would duplicate the same device multiple times in the pairing modal.

## [1.1.0] - Stability Update

### Added
- Initial implementation of the Wireless Pairing workflow using the Android 11+ 6-digit code.

### Fixed
- Improved mDNS auto-discovery reliability for detecting wireless devices on the local network.

## [1.0.0] - Initial Base

### Added
- Basic screen mirroring functionality via USB.
- Standard screen recording capabilities.

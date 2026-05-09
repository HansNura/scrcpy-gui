const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scrcpyAPI', {
  getDevices: () => ipcRenderer.invoke('get-devices'),
  runScrcpy: (options) => ipcRenderer.invoke('run-scrcpy', options),
  getPairedDevices: () => ipcRenderer.invoke('get-paired-devices'),
  savePairedDevice: (device) => ipcRenderer.invoke('save-paired-device', device),
  removePairedDevice: (ip) => ipcRenderer.invoke('remove-paired-device', ip),
  scanMdnsDevices: () => ipcRenderer.invoke('scan-mdns-devices'),
  adbConnect: (ip) => ipcRenderer.invoke('adb-connect', ip),
  adbDisconnect: (ip) => ipcRenderer.invoke('adb-disconnect', ip),
  adbPair: (data) => ipcRenderer.invoke('adb-pair', data),
  onScrcpyLog: (callback) => ipcRenderer.on('scrcpy-log', (event, data) => callback(data)),
  stopScrcpy: () => ipcRenderer.invoke('stop-scrcpy'),
  onScrcpyStatus: (callback) => ipcRenderer.on('scrcpy-status', (event, status) => callback(status))
});

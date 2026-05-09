const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scrcpyAPI', {
  getDevices: () => ipcRenderer.invoke('get-devices'),
  runScrcpy: (options) => ipcRenderer.invoke('run-scrcpy', options),
  getPairedDevices: () => ipcRenderer.invoke('get-paired-devices'),
  savePairedDevice: (device) => ipcRenderer.invoke('save-paired-device', device),
  removePairedDevice: (ip) => ipcRenderer.invoke('remove-paired-device', ip),
  scanMdnsDevices: () => ipcRenderer.invoke('scan-mdns-devices'),
  adbConnect: (ip) => ipcRenderer.invoke('adb-connect', ip),
  adbPair: (data) => ipcRenderer.invoke('adb-pair', data)
});

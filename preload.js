const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scrcpyAPI', {
  getDevices: () => ipcRenderer.invoke('get-devices'),
  runScrcpy: (options) => ipcRenderer.invoke('run-scrcpy', options)
});

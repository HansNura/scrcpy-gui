const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');

let mainWindow;

// Path to scrcpy executables (bundled in vendor/scrcpy/)
const SCRCPY_DIR = path.join(__dirname, 'vendor', 'scrcpy');
const SCRCPY_EXE = path.join(SCRCPY_DIR, 'scrcpy.exe');
const ADB_EXE = path.join(SCRCPY_DIR, 'adb.exe');

// Paired devices store
const PAIRED_DEVICES_FILE = path.join(__dirname, 'paired-devices.json');

function getPairedDevicesStore() {
  try {
    if (fs.existsSync(PAIRED_DEVICES_FILE)) {
      return JSON.parse(fs.readFileSync(PAIRED_DEVICES_FILE, 'utf-8'));
    }
  } catch (e) { /* ignore */ }
  return [];
}

function savePairedDevicesStore(devices) {
  fs.writeFileSync(PAIRED_DEVICES_FILE, JSON.stringify(devices, null, 2));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Scrcpy Manager',
    backgroundColor: '#0f172a', // dark theme background
    autoHideMenuBar: true
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('get-devices', async () => {
  return new Promise((resolve, reject) => {
    execFile(ADB_EXE, ['devices'], (error, stdout, stderr) => {
      if (error) {
        console.error('Error running adb devices:', error);
        resolve([]);
        return;
      }

      const lines = stdout.split('\n');
      const devices = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && line.includes('device') && !line.includes('offline')) {
          const parts = line.split('\t');
          if (parts.length > 0) {
            devices.push(parts[0]);
          }
        }
      }
      resolve(devices);
    });
  });
});

ipcMain.handle('scan-mdns-devices', async () => {
  return new Promise((resolve) => {
    execFile(ADB_EXE, ['mdns', 'services'], (error, stdout) => {
      if (error) {
        resolve({ pairing: [], connect: [] });
        return;
      }
      const lines = stdout.split('\n');
      const pairing = [];
      const connect = [];
      for (const line of lines) {
        if (line.includes('_adb-tls-')) {
          const tokens = line.trim().split(/\s+/);
          let ipPort = '';
          let name = '';
          tokens.forEach(token => {
            if (token.includes(':') && !token.includes('_adb')) {
              ipPort = token;
            } else if (!token.includes('_adb') && token.length > 0) {
              name = token;
            }
          });
          if (ipPort) {
            if (line.includes('_adb-tls-pairing')) {
              pairing.push({ name: name || ipPort, ipPort });
            } else if (line.includes('_adb-tls-connect')) {
              connect.push({ name: name || ipPort, ipPort });
            }
          }
        }
      }
      resolve({ pairing, connect });
    });
  });
});

ipcMain.handle('adb-connect', async (event, ip) => {
  return new Promise((resolve) => {
    execFile(ADB_EXE, ['connect', ip], (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, message: stderr || error.message });
      } else {
        const output = stdout.trim();
        const success = output.includes('connected') && !output.includes('unable');
        resolve({ success, message: output });
      }
    });
  });
});

ipcMain.handle('get-paired-devices', async () => {
  return getPairedDevicesStore();
});

ipcMain.handle('save-paired-device', async (event, device) => {
  const store = getPairedDevicesStore();
  // Avoid duplicates by base IP
  const baseIp = device.ip.split(':')[0];
  const exists = store.find(d => d.ip.split(':')[0] === baseIp);
  if (!exists) {
    store.push(device);
    savePairedDevicesStore(store);
  }
  return store;
});

ipcMain.handle('remove-paired-device', async (event, ip) => {
  const baseIp = ip.split(':')[0];
  const store = getPairedDevicesStore().filter(d => d.ip.split(':')[0] !== baseIp);
  savePairedDevicesStore(store);
  return store;
});

ipcMain.handle('adb-pair', async (event, { ip, code }) => {
  return new Promise((resolve) => {
    execFile(ADB_EXE, ['pair', ip, code], (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, message: stderr || error.message });
      } else {
        // Extract base IP from pairing IP:port
        const baseIp = ip.split(':')[0];
        resolve({ success: true, message: stdout.trim(), baseIp });
      }
    });
  });
});

ipcMain.handle('run-scrcpy', async (event, options) => {
  const args = [];

  if (options.deviceId) {
    args.push('-s', options.deviceId);
  }
  if (options.turnScreenOff) {
    args.push('--turn-screen-off');
  }
  if (options.alwaysOnTop) {
    args.push('--always-on-top');
  }
  if (options.borderless) {
    args.push('--window-borderless');
  }
  if (options.recordPath) {
    args.push('--record', options.recordPath);
  }

  return new Promise((resolve, reject) => {
    const scrcpyProcess = spawn(SCRCPY_EXE, args);

    scrcpyProcess.on('error', (err) => {
      console.error('Failed to start scrcpy:', err);
      reject(err.message);
    });

    resolve(true);
  });
});

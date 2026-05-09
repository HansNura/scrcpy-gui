const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');

let mainWindow;
let activeScrcpyProcess = null;

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
const util = require('util');
const execFileAsync = util.promisify(execFile);

ipcMain.handle('get-devices', async () => {
  try {
    const { stdout } = await execFileAsync(ADB_EXE, ['devices']);
    const lines = stdout.split('\n');
    const deviceIds = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && line.includes('device') && !line.includes('offline')) {
        const parts = line.split('\t');
        if (parts.length > 0) {
          deviceIds.push(parts[0]);
        }
      }
    }

    const devices = [];
    for (const id of deviceIds) {
      const isWifi = id.includes(':');
      let name = 'Unknown Device';
      try {
        const { stdout: propOut } = await execFileAsync(ADB_EXE, ['-s', id, 'shell', 'getprop']);
        const getPropVal = (key) => {
          const match = propOut.match(new RegExp(`\\[${key}\\]: \\[(.*?)\\]`));
          return match ? match[1] : '';
        };
        const brand = getPropVal('ro.product.brand');
        const model = getPropVal('ro.product.model');
        const release = getPropVal('ro.build.version.release');
        
        if (brand || model) {
          const CapitalizedBrand = brand ? (brand.charAt(0).toUpperCase() + brand.slice(1)) : 'Unknown';
          name = `[${CapitalizedBrand}] ${model} (Android ${release})`;
        }
      } catch (err) {
        console.error(`Failed to getprop for ${id}`, err);
      }
      devices.push({ id, name, isWifi });
    }
    return devices;
  } catch (err) {
    console.error('Error running adb devices:', err);
    return [];
  }
});

ipcMain.handle('scan-mdns-devices', async () => {
  return new Promise((resolve) => {
    execFile(ADB_EXE, ['mdns', 'services'], (error, stdout) => {
      if (error) {
        resolve({ pairing: [], connect: [] });
        return;
      }
      
      const lines = stdout.split('\n');
      const pairingMap = new Map();
      const connectMap = new Map();

      for (const line of lines) {
        if (line.includes('_adb-tls-')) {
          const tokens = line.trim().split(/\s+/);
          let ipPort = '';
          let name = '';
          
          tokens.forEach(token => {
            if (token.match(/^\d+\.\d+\.\d+\.\d+:\d+$/)) {
              // Validasi format IPv4:Port
              ipPort = token;
            } else if (token.includes('_adb-tls-')) {
              // Hapus suffix mDNS untuk mendapatkan nama murni
              name = token.replace(/\._adb-tls-(pairing|connect)\._tcp\.?/g, '');
            } else if (!token.includes(':') && token.length > 0) {
              // Fallback
              name = token;
            }
          });

          if (ipPort) {
            const deviceObj = { name: name || ipPort, ipPort };
            if (line.includes('_adb-tls-pairing')) {
              if (!pairingMap.has(ipPort)) pairingMap.set(ipPort, deviceObj);
            } else if (line.includes('_adb-tls-connect')) {
              if (!connectMap.has(ipPort)) connectMap.set(ipPort, deviceObj);
            }
          }
        }
      }
      
      resolve({ 
        pairing: Array.from(pairingMap.values()), 
        connect: Array.from(connectMap.values()) 
      });
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

ipcMain.handle('adb-disconnect', async (event, ip) => {
  return new Promise((resolve) => {
    execFile(ADB_EXE, ['disconnect', ip], (error, stdout) => {
      resolve({ success: !error });
    });
  });
});

ipcMain.handle('stop-scrcpy', async (event) => {
  if (activeScrcpyProcess) {
    activeScrcpyProcess.kill('SIGINT');
    activeScrcpyProcess = null;
    return true;
  }
  return false;
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

  // Camera dan OTG modes otomatis men-disable fitur "control" di Scrcpy
  if (options.cameraMode) {
    args.push('--video-source=camera');
    // Tambahkan resolusi aman agar tidak blank screen (karena resolusi default sering terlalu besar)
    args.push('--camera-size=1920x1080');
  }
  if (options.otgMode) {
    args.push('--otg');
  }

  // Only push control-related flags if control is NOT disabled
  const isControlDisabled = options.cameraMode || options.otgMode;

  if (!isControlDisabled) {
    if (options.turnScreenOff) {
      args.push('--turn-screen-off');
    }
    if (options.stayAwake) {
      args.push('--stay-awake');
    }
    if (options.showTouches) {
      args.push('--show-touches');
    }
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
  if (options.videoCodec) {
    args.push('--video-codec', options.videoCodec);
  }
  if (options.bitrate) {
    args.push('--video-bit-rate', options.bitrate + 'M');
  }
  if (options.maxFps) {
    args.push('--max-fps', options.maxFps);
  }
  if (options.audioForwarding === false) {
    args.push('--no-audio');
  }
  if (options.recordBackground) {
    args.push('--no-playback');
  }

  return new Promise((resolve, reject) => {
    if (event && event.sender) {
      event.sender.send('scrcpy-log', `> scrcpy ${args.join(' ')}\n`);
    }

    // 2. SPAWN OPTIONS FIX:
    // - windowsHide: true ternyata MENYEMBUNYIKAN GUI window SDL2 juga di Windows! Jadi harus dihapus.
    // - stdio: ['ignore', 'pipe', 'pipe'] menutup pintu stdin agar Scrcpy tidak menggantung (hang) menunggu input console.
    const spawnOptions = {
      cwd: SCRCPY_DIR,
      stdio: ['ignore', 'pipe', 'pipe']
    };

    const scrcpyProcess = spawn(SCRCPY_EXE, args, spawnOptions);
    activeScrcpyProcess = scrcpyProcess;
    
    if (event && event.sender) {
      event.sender.send('scrcpy-status', { running: true });
    }

    scrcpyProcess.stdout.on('data', (data) => {
      if (event && event.sender) event.sender.send('scrcpy-log', data.toString());
    });

    scrcpyProcess.stderr.on('data', (data) => {
      if (event && event.sender) event.sender.send('scrcpy-log', data.toString());
    });

    scrcpyProcess.on('error', (err) => {
      console.error('Failed to start scrcpy:', err);
      if (event && event.sender) {
        event.sender.send('scrcpy-log', `ERROR: ${err.message}\n`);
        event.sender.send('scrcpy-status', { running: false });
      }
      activeScrcpyProcess = null;
      reject(err.message);
    });

    scrcpyProcess.on('close', (code) => {
      if (event && event.sender) {
        event.sender.send('scrcpy-log', `[Process exited with code ${code}]\n`);
        event.sender.send('scrcpy-status', { running: false });
      }
      activeScrcpyProcess = null;
    });

    resolve(true);
  });
});

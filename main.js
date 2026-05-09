const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn, execFile } = require('child_process');

let mainWindow;

// Path to scrcpy executables
const SCRCPY_DIR = path.join(__dirname, '..', 'scrcpy-win64-v3.3.4');
const SCRCPY_EXE = path.join(SCRCPY_DIR, 'scrcpy.exe');
const ADB_EXE = path.join(SCRCPY_DIR, 'adb.exe');

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

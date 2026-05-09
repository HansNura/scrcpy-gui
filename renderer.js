let selectedDevice = null;

// DOM Elements
const deviceList = document.getElementById('device-list');
const refreshBtn = document.getElementById('refresh-btn');
const startBtn = document.getElementById('start-btn');
const recordBtn = document.getElementById('record-btn');
const navBtns = document.querySelectorAll('.nav-btn');
const viewSections = document.querySelectorAll('.view-section');

// Navigation
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    viewSections.forEach(v => v.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
  });
});

// Load Devices
async function loadDevices() {
  deviceList.innerHTML = '<li class="empty-state">Scanning for devices...</li>';
  startBtn.disabled = true;
  recordBtn.disabled = true;
  selectedDevice = null;
  
  try {
    const devices = await window.scrcpyAPI.getDevices();
    
    if (devices.length === 0) {
      deviceList.innerHTML = '<li class="empty-state">No devices found. Connect via USB.</li>';
      return;
    }
    
    deviceList.innerHTML = '';
    devices.forEach(device => {
      const li = document.createElement('li');
      li.textContent = device;
      li.onclick = () => selectDevice(li, device);
      deviceList.appendChild(li);
    });
    
    // Auto select first device
    if (devices.length > 0) {
      selectDevice(deviceList.firstChild, devices[0]);
    }
  } catch (error) {
    deviceList.innerHTML = '<li class="empty-state" style="color:#ef4444;">Error checking devices.</li>';
  }
}

function selectDevice(element, deviceId) {
  document.querySelectorAll('.device-list li').forEach(li => li.classList.remove('selected'));
  element.classList.add('selected');
  selectedDevice = deviceId;
  startBtn.disabled = false;
  recordBtn.disabled = false;
}

// Start Scrcpy
startBtn.addEventListener('click', async () => {
  if (!selectedDevice) return;
  
  const options = {
    deviceId: selectedDevice,
    turnScreenOff: document.getElementById('opt-turn-screen-off').checked,
    alwaysOnTop: document.getElementById('opt-always-on-top').checked,
    borderless: document.getElementById('opt-borderless').checked
  };
  
  // Visual feedback
  const originalText = startBtn.textContent;
  startBtn.textContent = 'STARTING...';
  
  try {
    await window.scrcpyAPI.runScrcpy(options);
    setTimeout(() => { startBtn.textContent = originalText; }, 2000);
  } catch (err) {
    alert('Error starting Scrcpy: ' + err);
    startBtn.textContent = originalText;
  }
});

// Record Screen
recordBtn.addEventListener('click', async () => {
  if (!selectedDevice) return;
  
  let filename = document.getElementById('record-filename').value.trim();
  if (!filename) {
    filename = 'recording_' + Date.now() + '.mp4';
  } else if (!filename.endsWith('.mp4') && !filename.endsWith('.mkv')) {
    filename += '.mp4';
  }
  
  const options = {
    deviceId: selectedDevice,
    recordPath: filename
  };
  
  const originalText = recordBtn.textContent;
  recordBtn.textContent = 'STARTING RECORDING...';
  
  try {
    await window.scrcpyAPI.runScrcpy(options);
    alert('Recording started! Scrcpy window will open. Close the Scrcpy window to stop recording.');
    setTimeout(() => { recordBtn.textContent = originalText; }, 2000);
  } catch (err) {
    alert('Error starting Scrcpy: ' + err);
    recordBtn.textContent = originalText;
  }
});

// Init
refreshBtn.addEventListener('click', loadDevices);
loadDevices();

let selectedDevice = null;
window.availableMdnsDevices = []; // Tracks raw mDNS strings e.g. 'adb-XXXX._adb-tls-connect._tcp'

// DOM Elements
const deviceList = document.getElementById('device-list');
const refreshBtn = document.getElementById('refresh-btn');
const startBtn = document.getElementById('start-btn');
const recordBtn = document.getElementById('record-btn');
const navBtns = document.querySelectorAll('nav .nav-btn');
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

const SVG_WIFI = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path fill="currentColor" d="M9 8a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/><path fill="currentColor" fill-rule="evenodd" d="M9.68 5.26a.75.75 0 0 1 1.06 0a3.875 3.875 0 0 1 0 5.48a.75.75 0 1 1-1.06-1.06a2.375 2.375 0 0 0 0-3.36a.75.75 0 0 1 0-1.06m-3.36 0a.75.75 0 0 1 0 1.06a2.375 2.375 0 0 0 0 3.36a.75.75 0 1 1-1.06 1.06a3.875 3.875 0 0 1 0-5.48a.75.75 0 0 1 1.06 0" clip-rule="evenodd"/><path fill="currentColor" fill-rule="evenodd" d="M11.89 3.05a.75.75 0 0 1 1.06 0a7 7 0 0 1 0 9.9a.75.75 0 1 1-1.06-1.06a5.5 5.5 0 0 0 0-7.78a.75.75 0 0 1 0-1.06m-7.78 0a.75.75 0 0 1 0 1.06a5.5 5.5 0 0 0 0 7.78a.75.75 0 1 1-1.06 1.06a7 7 0 0 1 0-9.9a.75.75 0 0 1 1.06 0" clip-rule="evenodd"/></svg>`;
const SVG_PHONE = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><rect width="12.5" height="18.5" x="5.75" y="2.75" rx="3"/><path d="M11 17.75h2"/></g></svg>`;

let isMirroring = false;

window.scrcpyAPI.onScrcpyStatus((status) => {
  isMirroring = status.running;
  if (isMirroring) {
    startBtn.textContent = 'STOP MIRRORING';
    startBtn.style.background = '#ef4444'; // Red color
    startBtn.style.borderColor = '#dc2626';
    if (recordBtn) recordBtn.disabled = true;
  } else {
    startBtn.textContent = 'START MIRRORING';
    startBtn.style.background = ''; // Revert to CSS default
    startBtn.style.borderColor = '';
    if (recordBtn) recordBtn.disabled = !selectedDevice;
  }
});

// Load Devices
async function loadDevices() {
  deviceList.innerHTML = '<li class="empty-state">Scanning for devices...</li>';
  startBtn.disabled = true;
  if (recordBtn) recordBtn.disabled = true;
  selectedDevice = null;
  window.availableMdnsDevices = []; // Reset on each load

  try {
    const connectedDevices = await window.scrcpyAPI.getDevices();
    const pairedDevices = await window.scrcpyAPI.getPairedDevices();

    // Separate raw mDNS entries (auto-detected by ADB) from real connectable devices
    const mdnsRaw = connectedDevices.filter(d => d.id.includes('._adb-tls-connect'));
    const visibleConnected = connectedDevices.filter(d => !d.id.includes('._adb-tls-connect'));
    window.availableMdnsDevices = mdnsRaw.map(d => d.id);

    deviceList.innerHTML = '';

    if (visibleConnected.length === 0 && pairedDevices.length === 0) {
      const emptyTr = document.createElement('tr');
      emptyTr.innerHTML = '<td colspan="4" class="empty-state" style="padding: 20px; text-align: center; color: #64748b;">No devices. Connect via USB or pair a Wi-Fi device.</td>';
      deviceList.appendChild(emptyTr);
    }

    // 1. Show only clean connected devices (USB & already-connected Wi-Fi)
    visibleConnected.forEach(device => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.style.transition = 'all 0.2s';
      tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
      
      tr.onmouseover = () => { if(!tr.classList.contains('selected')) tr.style.background = 'rgba(255,255,255,0.05)'; };
      tr.onmouseout = () => { if(!tr.classList.contains('selected')) tr.style.background = 'transparent'; };
      tr.onclick = () => selectDevice(tr, device.id);

      tr.innerHTML = `
        <td style="padding: 12px; text-align: center; vertical-align: middle;">
          <span style="font-size: 20px; display: inline-flex; align-items: center; justify-content: center; color: ${device.isWifi ? '#10b981' : '#3b82f6'}">${device.isWifi ? SVG_WIFI : SVG_PHONE}</span>
        </td>
        <td style="padding: 12px; vertical-align: middle;">
          <div style="font-weight: 600; font-size: 14px; color: #f8fafc;">${device.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px; font-family: monospace;">${device.id}</div>
        </td>
        <td style="padding: 12px; vertical-align: middle;">
          <span style="font-size: 11px; padding: 4px 8px; background: rgba(16,185,129,0.15); color: #10b981; border-radius: 4px; font-weight: 600; border: 1px solid rgba(16,185,129,0.3);">CONNECTED</span>
        </td>
        <td style="padding: 12px; vertical-align: middle; text-align: right;">
          ${device.isWifi ? `
            <button onclick="event.stopPropagation(); window.disconnectDevice('${device.id}')"
              style="font-size: 11px; padding: 6px 10px; background: rgba(245,158,11,0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); border-radius: 6px; cursor: pointer; transition: background 0.2s;" title="Disconnect Wi-Fi Device">
              DISCONNECT
            </button>
          ` : ''}
        </td>
      `;
      deviceList.appendChild(tr);
    });

    // 2. Show stored paired devices not already visibly connected
    const connectedBaseIps = visibleConnected.map(d => d.id.split(':')[0]);
    pairedDevices.forEach(paired => {
      const baseIp = paired.ip.split(':')[0];
      if (connectedBaseIps.includes(baseIp)) return; // already shown above

      // Check if this paired device is ONLINE via mDNS (raw string contains paired.name)
      const matchedMdns = window.availableMdnsDevices.find(raw => raw.includes(paired.name));
      const isOnline = !!matchedMdns;

      const onlineBadge = isOnline
        ? `<span style="font-size: 11px; color: #10b981; margin-left: 8px;">🟢 ONLINE</span>`
        : `<span style="font-size: 11px; color: #64748b; margin-left: 8px;">⚫ OFFLINE</span>`;

      const tr = document.createElement('tr');
      tr.style.cursor = 'default';
      tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
      tr.style.opacity = isOnline ? '1' : '0.6';

      tr.innerHTML = `
        <td style="padding: 12px; text-align: center; vertical-align: middle;">
          <span style="font-size: 20px; display: inline-flex; align-items: center; justify-content: center; color: ${isOnline ? '#10b981' : '#64748b'};">${SVG_WIFI}</span>
        </td>
        <td style="padding: 12px; vertical-align: middle;">
          <div style="font-weight: 600; font-size: 14px; color: #f8fafc;">${paired.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px; font-family: monospace;">${baseIp}</div>
        </td>
        <td style="padding: 12px; vertical-align: middle;">
          ${onlineBadge}
        </td>
        <td style="padding: 12px; vertical-align: middle; text-align: right;">
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button onclick="event.stopPropagation(); connectPairedDevice('${baseIp}', this, '${paired.name}')"
              style="font-size: 11px; padding: 6px 12px; background: ${isOnline ? '#10b981' : '#334155'}; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: opacity 0.2s;">
              CONNECT
            </button>
            <button onclick="event.stopPropagation(); forgetPairedDevice('${paired.ip}')"
              style="font-size: 11px; padding: 6px 10px; background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; cursor: pointer; transition: background 0.2s;" title="Remove from list">
              ✕
            </button>
          </div>
        </td>
      `;
      deviceList.appendChild(tr);
    });

    // Auto-select first visible connected device
    if (visibleConnected.length > 0) {
      selectDevice(deviceList.querySelector('tr'), visibleConnected[0].id);
    }
  } catch (error) {
    deviceList.innerHTML = '<tr><td colspan="4" class="empty-state" style="padding: 20px; text-align: center; color:#ef4444;">Error checking devices.</td></tr>';
  }
}


async function connectPairedDevice(baseIp, btnElement, pairedName = '') {
  const originalText = btnElement.textContent.trim();

  // Helper to restore button state
  const resetBtn = () => { btnElement.textContent = originalText; btnElement.disabled = false; };

  // Helper to open fallback manual modal
  const openManualModal = async () => {
    resetBtn();
    const modal = document.getElementById('connect-port-modal');
    const label = document.getElementById('connect-port-ip-label');
    const input = document.getElementById('connect-port-input');
    const cancelBtn = document.getElementById('connect-port-cancel');
    const submitBtn = document.getElementById('connect-port-submit');

    label.textContent = `IP: ${baseIp}`;
    input.value = '';
    modal.classList.add('active');
    setTimeout(() => input.focus(), 100);

    const port = await new Promise((resolve) => {
      const onSubmit = () => { cleanup(); resolve(input.value.trim()); };
      const onCancel = () => { cleanup(); resolve(null); };
      const onKey = (e) => { if (e.key === 'Enter') onSubmit(); if (e.key === 'Escape') onCancel(); };
      function cleanup() {
        submitBtn.removeEventListener('click', onSubmit);
        cancelBtn.removeEventListener('click', onCancel);
        input.removeEventListener('keydown', onKey);
        modal.classList.remove('active');
      }
      submitBtn.addEventListener('click', onSubmit);
      cancelBtn.addEventListener('click', onCancel);
      input.addEventListener('keydown', onKey);
    });

    if (!port) return;

    btnElement.textContent = 'CONNECTING...';
    btnElement.disabled = true;
    try {
      const res = await window.scrcpyAPI.adbConnect(`${baseIp}:${port}`);
      if (res.success) {
        await loadDevices();
      } else {
        alert(`Could not connect to ${baseIp}:${port}.\n\nMake sure Wireless Debugging is enabled.\n\n${res.message}`);
        resetBtn();
      }
    } catch (err) {
      alert('Error: ' + err);
      resetBtn();
    }
  };

  // --- STEP 1: Scan mDNS to get real IP:PORT ---
  btnElement.textContent = 'SCANNING...';
  btnElement.disabled = true;

  let target = null;
  try {
    const scanRes = await window.scrcpyAPI.scanMdnsDevices();

    // Find by pairedName match (preferred) OR by baseIp prefix
    if (pairedName) {
      target = scanRes.connect.find(d => d.name === pairedName || pairedName.includes(d.name));
    }
    if (!target) {
      target = scanRes.connect.find(d => d.ipPort.startsWith(`${baseIp}:`));
    }
  } catch (err) {
    console.error('mDNS scan failed', err);
  }

  // --- STEP 2: Auto-Connect with real IP:PORT if found ---
  if (target) {
    btnElement.textContent = 'CONNECTING...';
    try {
      const res = await window.scrcpyAPI.adbConnect(target.ipPort);
      if (res.success) {
        await loadDevices();
      } else {
        alert(`Auto-connect failed for ${target.ipPort}.\n\n${res.message}`);
        resetBtn();
      }
    } catch (err) {
      alert('Error: ' + err);
      resetBtn();
    }
    return;
  }

  // --- STEP 3: Fallback Manual Modal ---
  await openManualModal();
}


window.forgetPairedDevice = async function(ip) {
  if (confirm(`Are you sure you want to forget the paired device ${ip}?`)) {
    await window.scrcpyAPI.removePairedDevice(ip);
    loadDevices();
  }
};

window.disconnectDevice = async function(ip) {
  if (confirm(`Are you sure you want to disconnect from ${ip}?`)) {
    await window.scrcpyAPI.adbDisconnect(ip);
    loadDevices();
  }
};

function selectDevice(element, deviceId) {
  document.querySelectorAll('#device-list tr').forEach(tr => {
    tr.classList.remove('selected');
    tr.style.background = 'transparent';
    tr.style.borderColor = 'rgba(255,255,255,0.05)';
  });
  element.classList.add('selected');
  element.style.background = 'rgba(16, 185, 129, 0.1)';
  selectedDevice = deviceId;
  startBtn.disabled = false;
  if (recordBtn) recordBtn.disabled = false;
}

// Start Scrcpy
startBtn.addEventListener('click', async () => {
  if (isMirroring) {
    await window.scrcpyAPI.stopScrcpy();
    return;
  }

  if (!selectedDevice) return;

  const options = {
    deviceId: selectedDevice,
    turnScreenOff: document.getElementById('opt-turn-screen-off').checked,
    alwaysOnTop: document.getElementById('opt-always-on-top').checked,
    borderless: document.getElementById('opt-borderless').checked,
    stayAwake: document.getElementById('opt-stay-awake').checked,
    showTouches: document.getElementById('opt-show-touches').checked,
    videoCodec: document.getElementById('perf-video-codec').value,
    bitrate: document.getElementById('perf-bitrate').value,
    maxFps: document.getElementById('perf-max-fps').value,
    audioForwarding: document.getElementById('perf-audio-forwarding').checked,
    cameraMode: document.getElementById('adv-camera-mode').checked,
    otgMode: document.getElementById('adv-otg-mode').checked
  };

  // Visual feedback
  const originalText = startBtn.textContent;
  startBtn.textContent = 'STARTING...';

  try {
    await window.scrcpyAPI.runScrcpy(options);
  } catch (err) {
    alert('Error starting Scrcpy: ' + err);
    startBtn.textContent = originalText;
  }
});

// Record Screen
if (recordBtn) {
  recordBtn.addEventListener('click', async () => {
    if (!selectedDevice) return;

    let filename = document.getElementById('record-filename').value.trim();
    const format = document.getElementById('record-format').value;

    if (!filename) {
      filename = 'recording_' + Date.now() + '.' + format;
    } else if (!filename.endsWith('.mp4') && !filename.endsWith('.mkv')) {
      filename += '.' + format;
    }

    const options = {
      deviceId: selectedDevice,
      recordPath: filename,
      turnScreenOff: document.getElementById('opt-turn-screen-off').checked,
      alwaysOnTop: document.getElementById('opt-always-on-top').checked,
      borderless: document.getElementById('opt-borderless').checked,
      stayAwake: document.getElementById('opt-stay-awake').checked,
      showTouches: document.getElementById('opt-show-touches').checked,
      videoCodec: document.getElementById('perf-video-codec').value,
      bitrate: document.getElementById('perf-bitrate').value,
      maxFps: document.getElementById('perf-max-fps').value,
      audioForwarding: document.getElementById('perf-audio-forwarding').checked,
      cameraMode: document.getElementById('adv-camera-mode').checked,
      otgMode: document.getElementById('adv-otg-mode').checked,
      recordBackground: document.getElementById('opt-record-background').checked
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
}

// Init
refreshBtn.addEventListener('click', loadDevices);

// Performance Bitrate Slider
const perfBitrate = document.getElementById('perf-bitrate');
const bitrateDisplay = document.getElementById('bitrate-display');
if (perfBitrate && bitrateDisplay) {
  perfBitrate.addEventListener('input', (e) => {
    bitrateDisplay.textContent = `${e.target.value} Mbps`;
  });
}

// Wireless Pairing & Connection
const openPairModalBtn = document.getElementById('open-pair-modal-btn');
const closePairModalBtn = document.getElementById('close-pair-modal');
const closePairModalBtnBottom = document.getElementById('close-pair-modal-btn');
const pairModal = document.getElementById('pair-modal');
const pairingDeviceList = document.getElementById('pairing-device-list');
const scanLoader = document.getElementById('scan-loader');


let scanInterval = null;

async function performScan() {
  scanLoader.style.display = 'inline-block';
  scanLoader.style.animation = 'spin 1s linear infinite';
  try {
    const res = await window.scrcpyAPI.scanMdnsDevices();
    const devices = res.pairing;

    if (devices.length === 0) {
      pairingDeviceList.innerHTML = '<tr><td colspan="3" class="empty-state" style="padding: 40px 20px; text-align: center; color: #64748b; font-size: 13px;">Searching for devices...</td></tr>';
    } else {
      pairingDeviceList.innerHTML = '';
      devices.forEach(device => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        tr.style.cursor = 'pointer';
        tr.style.transition = 'background 0.2s';
        tr.style.display = 'table';
        tr.style.width = '100%';
        tr.style.tableLayout = 'fixed';

        tr.innerHTML = `
          <td style="padding: 12px; text-align: center; vertical-align: middle; width: 60px;">
            <span style="font-size: 18px; color: #3b82f6;">${SVG_PHONE}</span>
          </td>
          <td style="padding: 12px; vertical-align: middle;">
            <div style="font-weight: 600; color: #f8fafc; font-size: 14px;">${device.name}</div>
            <div style="color: #64748b; font-size: 11px; margin-top: 4px; font-family: monospace;">${device.ipPort}</div>
          </td>
          <td style="padding: 12px; vertical-align: middle; text-align: right;">
            <span style="color: #10b981; font-size: 12px; font-weight: 600; padding: 6px 12px; background: rgba(16,185,129,0.1); border-radius: 6px;">PAIR</span>
          </td>
        `;

        tr.onmouseover = () => { tr.style.background = 'rgba(255,255,255,0.05)'; };
        tr.onmouseout = () => { tr.style.background = 'transparent'; };
        tr.onclick = () => openEnterCodeModal(device);

        pairingDeviceList.appendChild(tr);
      });
    }
  } catch (err) {
    pairingDeviceList.innerHTML = '<tr><td colspan="3" class="empty-state" style="padding: 40px 20px; text-align: center; color: #ef4444; font-size: 13px;">Error scanning devices.</td></tr>';
  }
}

function startScanning() {
  performScan();
  scanInterval = setInterval(performScan, 3000); // Scan every 3 seconds
}

function stopScanning() {
  if (scanInterval) clearInterval(scanInterval);
  scanLoader.style.display = 'none';
  scanLoader.style.animation = 'none';
}

if (openPairModalBtn) {
  openPairModalBtn.addEventListener('click', () => {
    pairModal.classList.add('active');
    startScanning();
  });
}

function closeMainModal() {
  pairModal.classList.remove('active');
  stopScanning();
}

if (closePairModalBtn) closePairModalBtn.addEventListener('click', closeMainModal);
if (closePairModalBtnBottom) closePairModalBtnBottom.addEventListener('click', closeMainModal);


// Enter Code Modal Elements
const enterCodeModal = document.getElementById('enter-code-modal');
const modalTarget = document.getElementById('pair-modal-target');
const modalCodeInput = document.getElementById('modal-pair-code');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalSubmitBtn = document.getElementById('modal-submit-btn');

let currentPairingIp = null;
let currentDevice = null;

function openEnterCodeModal(device) {
  currentPairingIp = device.ipPort;
  currentDevice = device;
  modalTarget.textContent = `Pairing with: ${device.name} (${device.ipPort})`;
  modalCodeInput.value = '';
  enterCodeModal.classList.add('active');
  modalCodeInput.focus();
}

modalCancelBtn.addEventListener('click', () => {
  enterCodeModal.classList.remove('active');
  currentPairingIp = null;
});

modalSubmitBtn.addEventListener('click', async () => {
  const code = modalCodeInput.value.trim();
  if (!code) {
    alert('Please enter the 6-digit pairing code.');
    return;
  }

  const originalText = modalSubmitBtn.textContent;
  modalSubmitBtn.textContent = 'PAIRING...';
  modalSubmitBtn.disabled = true;

  try {
    const res = await window.scrcpyAPI.adbPair({ ip: currentPairingIp, code });
    if (res.success) {
      // Save to paired devices store using the scanned device name & base IP
      const baseIp = res.baseIp || currentPairingIp.split(':')[0];
      await window.scrcpyAPI.savePairedDevice({
        name: currentDevice ? currentDevice.name : baseIp,
        ip: currentPairingIp
      });

      enterCodeModal.classList.remove('active');
      closeMainModal();
      loadDevices(); // refresh — paired device will now appear in list
    } else {
      alert('Pairing failed: ' + res.message);
    }
  } catch (err) {
    alert('Error: ' + err);
  } finally {
    modalSubmitBtn.textContent = originalText;
    modalSubmitBtn.disabled = false;
  }
});

// Console Logic
const consolePanel = document.getElementById('console-panel');
const consoleOutput = document.getElementById('console-output');
const toggleConsoleBtn = document.getElementById('toggle-console-btn');
const closeConsoleBtn = document.getElementById('close-console-btn');

function toggleConsole() {
  if (consolePanel.style.display === 'none') {
    consolePanel.style.display = 'flex';
  } else {
    consolePanel.style.display = 'none';
  }
}

if (toggleConsoleBtn) toggleConsoleBtn.addEventListener('click', toggleConsole);
if (closeConsoleBtn) closeConsoleBtn.addEventListener('click', () => consolePanel.style.display = 'none');

if (window.scrcpyAPI.onScrcpyLog) {
  window.scrcpyAPI.onScrcpyLog((data) => {
    if (data.includes('ERROR:')) {
      consolePanel.style.display = 'flex';
    }
    const span = document.createElement('span');
    span.textContent = data;
    if (data.includes('ERROR:')) {
      span.style.color = '#ef4444';
    } else if (data.startsWith('> scrcpy')) {
      span.style.color = '#3b82f6';
      span.style.fontWeight = 'bold';
      // Add visual separator for new commands
      const hr = document.createElement('hr');
      hr.style.borderColor = 'rgba(255,255,255,0.1)';
      hr.style.margin = '8px 0';
      consoleOutput.appendChild(hr);
    }
    consoleOutput.appendChild(span);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  });
}

loadDevices();

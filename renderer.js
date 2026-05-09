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
    const mdnsRaw = connectedDevices.filter(d => d.includes('._adb-tls-connect'));
    const visibleConnected = connectedDevices.filter(d => !d.includes('._adb-tls-connect'));
    window.availableMdnsDevices = mdnsRaw;

    deviceList.innerHTML = '';

    if (visibleConnected.length === 0 && pairedDevices.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'empty-state';
      emptyLi.textContent = 'No devices. Connect via USB or pair a Wi-Fi device.';
      deviceList.appendChild(emptyLi);
    }

    // 1. Show only clean connected devices (USB & already-connected Wi-Fi)
    visibleConnected.forEach(device => {
      const isWifi = device.includes(':');
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 18px; color: ${isWifi ? '#10b981' : '#3b82f6'}">${isWifi ? '📶' : '📱'}</span>
          <div>
            <div style="font-weight: 500; font-size: 14px;">${device}</div>
            <div style="font-size: 11px; color: #64748b;">${isWifi ? 'Wi-Fi' : 'USB'} • Ready to mirror</div>
          </div>
        </div>
        <span style="font-size: 11px; padding: 3px 8px; background: rgba(16,185,129,0.15); color: #10b981; border-radius: 4px; font-weight: 600; border: 1px solid rgba(16,185,129,0.3);">CONNECTED</span>
      `;
      li.onclick = () => selectDevice(li, device);
      deviceList.appendChild(li);
    });

    // 2. Show stored paired devices not already visibly connected
    const connectedBaseIps = visibleConnected.map(d => d.split(':')[0]);
    pairedDevices.forEach(paired => {
      const baseIp = paired.ip.split(':')[0];
      if (connectedBaseIps.includes(baseIp)) return; // already shown above

      // Check if this paired device is ONLINE via mDNS (raw string contains paired.name)
      const matchedMdns = window.availableMdnsDevices.find(raw => raw.includes(paired.name));
      const isOnline = !!matchedMdns;

      const onlineBadge = isOnline
        ? `<span style="font-size: 11px; color: #10b981; margin-left: 6px;">🟢 ONLINE</span>`
        : '';

      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.cursor = 'default';

      li.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; opacity: ${isOnline ? '1' : '0.7'};">
          <span style="font-size: 18px; color: ${isOnline ? '#10b981' : '#64748b'};">📶</span>
          <div>
            <div style="font-weight: 500; font-size: 14px;">${paired.name}${onlineBadge}</div>
            <div style="font-size: 11px; color: #64748b;">${baseIp} • Paired, not connected</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button onclick="event.stopPropagation(); connectPairedDevice('${baseIp}', this, '${paired.name}')"
            style="font-size: 11px; padding: 5px 12px; background: ${isOnline ? '#10b981' : '#3b82f6'}; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: opacity 0.2s;">
            CONNECT
          </button>
          <button onclick="event.stopPropagation(); forgetPairedDevice('${paired.ip}')"
            style="font-size: 11px; padding: 5px 8px; background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; cursor: pointer;" title="Remove from list">
            ✕
          </button>
        </div>
      `;
      deviceList.appendChild(li);
    });

    // Auto-select first visible connected device
    if (visibleConnected.length > 0) {
      selectDevice(deviceList.firstChild, visibleConnected[0]);
    }
  } catch (error) {
    deviceList.innerHTML = '<li class="empty-state" style="color:#ef4444;">Error checking devices.</li>';
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


async function forgetPairedDevice(ip) {
  await window.scrcpyAPI.removePairedDevice(ip);
  loadDevices();
}

function selectDevice(element, deviceId) {
  document.querySelectorAll('.device-list li').forEach(li => li.classList.remove('selected'));
  element.classList.add('selected');
  selectedDevice = deviceId;
  startBtn.disabled = false;
  if (recordBtn) recordBtn.disabled = false;
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
if (recordBtn) {
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
}

// Init
refreshBtn.addEventListener('click', loadDevices);

// Wireless Pairing & Connection
const openPairModalBtn = document.getElementById('open-pair-modal-btn');
const closePairModalBtn = document.getElementById('close-pair-modal');
const closePairModalBtnBottom = document.getElementById('close-pair-modal-btn');
const pairModal = document.getElementById('pair-modal');
const pairingDeviceList = document.getElementById('pairing-device-list');
const scanLoader = document.getElementById('scan-loader');

// Tabs in Pair Modal
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => { b.classList.remove('active'); b.style.color = '#94a3b8'; b.style.borderColor = 'transparent'; });
    tabContents.forEach(c => { c.style.display = 'none'; c.classList.remove('active'); });

    btn.classList.add('active');
    btn.style.color = '#10b981';
    btn.style.borderColor = '#10b981';

    const target = document.getElementById(btn.dataset.tab);
    target.style.display = 'block';
    target.classList.add('active');
  });
});

let scanInterval = null;

async function performScan() {
  scanLoader.style.display = 'inline-block';
  scanLoader.style.animation = 'spin 1s linear infinite';
  try {
    const res = await window.scrcpyAPI.scanMdnsDevices();
    const devices = res.pairing;

    if (devices.length === 0) {
      pairingDeviceList.innerHTML = '<li class="empty-state" style="padding: 40px 20px; text-align: center; color: #64748b; font-size: 13px;">Searching for devices...</li>';
    } else {
      pairingDeviceList.innerHTML = '';
      devices.forEach(device => {
        const li = document.createElement('li');
        li.style.padding = '16px 20px';
        li.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        li.style.cursor = 'pointer';
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.transition = 'background 0.2s';

        li.innerHTML = `
          <div>
            <div style="font-weight: 500; color: #f8fafc; font-size: 14px;">${device.name}</div>
            <div style="color: #64748b; font-size: 12px; margin-top: 4px;">${device.ipPort}</div>
          </div>
          <div style="color: #10b981; font-size: 12px; font-weight: 600;">PAIR</div>
        `;

        li.onmouseover = () => { li.style.background = 'rgba(255,255,255,0.05)'; };
        li.onmouseout = () => { li.style.background = 'transparent'; };
        li.onclick = () => openEnterCodeModal(device);

        pairingDeviceList.appendChild(li);
      });
    }
  } catch (err) {
    pairingDeviceList.innerHTML = '<li class="empty-state" style="padding: 40px 20px; text-align: center; color: #ef4444; font-size: 13px;">Error scanning devices.</li>';
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

loadDevices();

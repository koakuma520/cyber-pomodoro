const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;

// --- Helpers ---------------------------------------------------------------

const DATA_FILE = path.join(app.getPath('userData'), 'pomodoro-data.json');

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (_) { /* ignore */ }
  return { settings: getDefaultSettings(), stats: getDefaultStats() };
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (_) { /* ignore */ }
}

function getDefaultSettings() {
  return {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakInterval: 4,
    volume: 0.5,
    muted: false,
    alwaysOnTop: true,
    autoStartBreak: false,
    autoStartWork: false
  };
}

function getDefaultStats() {
  const today = new Date().toISOString().slice(0, 10);
  return { daily: { date: today, count: 0, minutes: 0 } };
}

// --- Window ----------------------------------------------------------------

function createWindow() {
  const data = loadData();

  mainWindow = new BrowserWindow({
    width: 520,
    height: 700,
    resizable: true,
    minWidth: 380,
    minHeight: 500,
    frame: false,
    transparent: false,
    backgroundColor: '#0A0A1C',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setAlwaysOnTop(data.settings.alwaysOnTop, 'normal');
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Allow hidden title bar dragging via IPC
  mainWindow.on('maximize', () => mainWindow.webContents.send('window-maximized', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window-maximized', false));
}

// --- Tray ------------------------------------------------------------------

function createTray() {
  // Create a simple 16x16 tray icon
  const iconSize = 16;
  const canvas = nativeImage.createFromBuffer(createTrayIconBuffer(iconSize), { width: iconSize, height: iconSize });
  const resized = canvas.resize({ width: 16, height: 16 });

  tray = new Tray(resized);
  tray.setToolTip('赛博番茄钟');

  const ctxMenu = Menu.buildFromTemplate([
    { label: '显示/隐藏', click: () => toggleWindow() },
    { type: 'separator' },
    { label: '退出', click: () => { mainWindow?.destroy(); app.quit(); } }
  ]);
  tray.setContextMenu(ctxMenu);
  tray.on('double-click', () => toggleWindow());
}

function createTrayIconBuffer(size) {
  // Generate a simple neon-colored PNG buffer for the tray
  // Cyan circle on transparent background
  const { createCanvas } = (() => {
    try { return require('canvas'); } catch { return null; }
  })() || {};
  if (!createCanvas) {
    // Fallback: return a minimal valid 16x16 transparent PNG
    return createMinimalPNG(size);
  }
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#00F0FF';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.fill();
  return canvas.toBuffer('image/png');
}

function createMinimalPNG(size) {
  // Minimal PNG: 16x16 RGBA, all transparent with one cyan pixel
  // This is a valid PNG with a single pixel marker
  const raw = Buffer.alloc(size * size * 4, 0);
  // Set center pixel to cyan
  const center = (Math.floor(size / 2) * size + Math.floor(size / 2)) * 4;
  raw[center] = 0; raw[center + 1] = 240; raw[center + 2] = 255; raw[center + 3] = 255;
  return raw;
}

function toggleWindow() {
  if (mainWindow?.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow?.show();
    mainWindow?.focus();
  }
}

// --- IPC -------------------------------------------------------------------

ipcMain.handle('load-data', () => loadData());
ipcMain.handle('save-data', (_, data) => { saveData(data); return true; });

ipcMain.handle('show-notification', (_, { title, body }) => {
  if (Notification.isSupported()) {
    const notif = new Notification({ title, body, icon: path.join(__dirname, 'assets', 'icon.png') });
    notif.show();
    notif.on('click', () => toggleWindow());
  }
});

ipcMain.handle('set-always-on-top', (_, val) => {
  mainWindow?.setAlwaysOnTop(val, 'normal');
});

ipcMain.handle('window-action', (_, action) => {
  if (!mainWindow) return;
  if (action === 'minimize') mainWindow.minimize();
  else if (action === 'maximize') mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  else if (action === 'close') mainWindow.close();
});

// --- App lifecycle ---------------------------------------------------------

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
  else mainWindow.show();
});

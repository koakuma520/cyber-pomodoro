const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pomodoroAPI', {
  // Data persistence
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),

  // Notifications
  showNotification: (opts) => ipcRenderer.invoke('show-notification', opts),

  // Window controls
  setAlwaysOnTop: (val) => ipcRenderer.invoke('set-always-on-top', val),
  windowAction: (action) => ipcRenderer.invoke('window-action', action),

  // Window state
  onMaximized: (callback) => {
    ipcRenderer.on('window-maximized', (_, val) => callback(val));
  }
});

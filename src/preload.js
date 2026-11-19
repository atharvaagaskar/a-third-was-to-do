const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  getCfg: () => ipcRenderer.invoke('cfg:get'),
  setCfg: p => ipcRenderer.invoke('cfg:set', p),
  events: (from, to) => ipcRenderer.invoke('events', from, to),
  onShown: f => ipcRenderer.on('shown', f),
});

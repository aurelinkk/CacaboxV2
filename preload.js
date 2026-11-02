const { contextBridge, ipcRenderer } = require('electron');
const CHANNELS = ['blague', 'clear', 'status', 'config', 'presence', 'displays'];
contextBridge.exposeInMainWorld('livekgb', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (c) => ipcRenderer.invoke('save-config', c),
  send: (m) => ipcRenderer.invoke('send', m),
  panic: () => ipcRenderer.send('panic'),
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  saveDisplay: (d) => ipcRenderer.invoke('save-display', d),
  preview: () => ipcRenderer.send('preview'),
  on: (ch, cb) => { if (CHANNELS.includes(ch)) ipcRenderer.on(ch, (_e, d) => cb(d)); }
});

const { contextBridge, ipcRenderer } = require('electron');
const CHANNELS = ['blague', 'clear', 'status', 'config', 'presence'];
contextBridge.exposeInMainWorld('cacabox', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (c) => ipcRenderer.invoke('save-config', c),
  send: (m) => ipcRenderer.invoke('send', m),
  panic: () => ipcRenderer.send('panic'),
  on: (ch, cb) => { if (CHANNELS.includes(ch)) ipcRenderer.on(ch, (_e, d) => cb(d)); }
});

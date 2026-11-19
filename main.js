const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { fetchEvents } = require('./src/calendar');

let tray, win;
const cfgPath = () => path.join(app.getPath('userData'), 'config.json');
const readCfg = () => { try { return JSON.parse(fs.readFileSync(cfgPath(), 'utf8')); } catch { return {}; } };
const writeCfg = c => fs.writeFileSync(cfgPath(), JSON.stringify(c));

const W = 360, H = 540;

function createWindow() {
  win = new BrowserWindow({
    width: W, height: H, show: false, frame: false, resizable: false,
    fullscreenable: false, skipTaskbar: true, alwaysOnTop: true,
    transparent: false, backgroundColor: '#18181b',
    webPreferences: { preload: path.join(__dirname, 'src', 'preload.js'), contextIsolation: true },
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.on('blur', () => { if (!win.webContents.isDevToolsOpened()) win.hide(); });
}

function toggle() {
  if (win.isVisible()) return win.hide();
  const t = tray.getBounds();
  const d = screen.getDisplayMatching(t).workArea;
  let x = Math.round(t.x + t.width / 2 - W / 2);
  x = Math.max(d.x + 8, Math.min(x, d.x + d.width - W - 8));
  win.setPosition(x, Math.round(t.y + t.height + 4), false);
  win.show();
  win.focus();
  win.webContents.send('shown');
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') app.dock.hide();
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'iconTemplate.png'));
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip('A Third Was To Do');
  tray.on('click', toggle);
  tray.on('right-click', () => tray.popUpContextMenu(Menu.buildFromTemplate([
    { label: 'Open', click: toggle },
    { label: 'Launch at login', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin,
      click: i => app.setLoginItemSettings({ openAtLogin: i.checked }) },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ])));
  createWindow();

  ipcMain.handle('cfg:get', () => readCfg());
  ipcMain.handle('cfg:set', (_, patch) => { const c = { ...readCfg(), ...patch }; writeCfg(c); return c; });
  ipcMain.handle('events', async (_, from, to) => {
    const { icalUrl } = readCfg();
    if (!icalUrl) return { needsSetup: true, events: [] };
    try { return { events: await fetchEvents(icalUrl, new Date(from), new Date(to)) }; }
    catch (e) { return { error: e.message, events: [] }; }
  });
});

app.on('window-all-closed', e => e.preventDefault());

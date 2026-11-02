const path = require('node:path')
const { app, BrowserWindow } = require('electron')

const developmentUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173'

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 375,
    minHeight: 640,
    title: 'Ascend HMS',
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'public', 'brand', 'hms-desktop.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (app.isPackaged) {
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  } else {
    window.loadURL(developmentUrl)
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.ascendtechnologies.hms')
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

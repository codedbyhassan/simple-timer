// Exposes a minimal, read-only surface to the renderer. No Node APIs are exposed.
const { contextBridge } = require('electron')
contextBridge.exposeInMainWorld('hmsDesktop', { isDesktop: true, platform: process.platform })

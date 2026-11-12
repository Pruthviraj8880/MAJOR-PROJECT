const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      // We only use browser APIs (fetch, localStorage), so no Node needed
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Always start at the login page
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'login.html'));
}

// Electron is ready → open the window
app.whenReady().then(createWindow);

// Quit when all windows are closed (except on macOS where apps stay in dock)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// macOS: re-create window when dock icon is clicked and no windows exist
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});


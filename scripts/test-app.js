const fs = require('fs');
const path = require('path');
const logFile = path.join(process.cwd(), 'icon-gen.log');

try {
  fs.writeFileSync(logFile, 'Started\n');
  const electron = require('electron');
  fs.appendFileSync(logFile, 'Electron loaded: ' + typeof electron + '\n');
  const { app, BrowserWindow } = electron;
  if (!app) {
    fs.appendFileSync(logFile, 'No app object!\n');
    process.exit(1);
  }
  app.whenReady().then(async () => {
    fs.appendFileSync(logFile, 'App ready!\n');
    app.quit();
  });
} catch (e) {
  fs.appendFileSync(logFile, 'Error: ' + e.stack + '\n');
}


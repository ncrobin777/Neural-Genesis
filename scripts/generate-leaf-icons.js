const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
  try {
    const svgPath = path.join(process.cwd(), 'leaf-svgrepo-com.svg');
    const svg = fs.readFileSync(svgPath, 'utf-8');

    const sizes = [16, 24, 32, 48, 64, 128, 256];
    const pngBuffers = {};

    for (const size of sizes) {
      const win = new BrowserWindow({
        width: size,
        height: size,
        show: false,
        frame: false,
        transparent: true,
        webPreferences: {
          offscreen: true
        }
      });

      const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width: 100%; height: 100%; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    svg { width: 100%; height: 100%; }
  </style>
</head>
<body>
  ${svg}
</body>
</html>`;

      await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
      await new Promise((r) => setTimeout(r, 400));
      const image = await win.webContents.capturePage();
      pngBuffers[size] = image.toPNG();
      win.destroy();
    }

    // Save 256x256 PNG as standard icon.png
    fs.writeFileSync(path.join(process.cwd(), 'build', 'icon.png'), pngBuffers[256]);
    fs.writeFileSync(path.join(process.cwd(), 'resources', 'icon.png'), pngBuffers[256]);
    console.log('Saved icon.png (256x256) successfully');

    // Build multi-res Windows .ico file using resedit
    const resedit = require('resedit');
    const iconFile = new resedit.Data.IconFile();
    iconFile.icons = [];

    // Order: 16, 32, 48, 64, 128, 256
    for (const sz of [16, 32, 48, 64, 128, 256]) {
      const pngBuf = pngBuffers[sz];
      // create IconItem from PNG (standard Windows Vista+ format supported by resedit)
      const item = resedit.Data.IconItem.createFrom(pngBuf, sz, sz, null);
      iconFile.icons.push(item);
    }

    const icoBytes = iconFile.generate();
    fs.writeFileSync(path.join(process.cwd(), 'build', 'icon.ico'), Buffer.from(icoBytes));
    console.log('Saved build/icon.ico successfully with sizes:', Object.keys(pngBuffers));
  } catch (err) {
    console.error('Error generating icons:', err);
  } finally {
    app.quit();
  }
});


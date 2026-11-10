const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      width: 512,
      height: 512,
      show: false,
      transparent: true,
      frame: false,
      webPreferences: { offscreen: true }
    });

    const svgPath = path.join(__dirname, 'leaf-svgrepo-com.svg');
    let svgContent = fs.readFileSync(svgPath, 'utf-8');
    // Ensure viewBox and 100% width/height
    svgContent = svgContent.replace(/<svg[^>]*>/, '<svg viewBox="0 0 512.001 512.001" width="512" height="512" xmlns="http://www.w3.org/2000/svg">');

    const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 512px; height: 512px; background: transparent; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    svg { width: 480px; height: 480px; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    // Wait slightly for render
    await new Promise((r) => setTimeout(r, 800));

    const image = await win.webContents.capturePage();
    const pngBuffer = image.toPNG();

    const resIconPath = path.join(__dirname, 'resources', 'icon.png');
    const buildIconPath = path.join(__dirname, 'build', 'icon.png');

    fs.writeFileSync(resIconPath, pngBuffer);
    fs.writeFileSync(buildIconPath, pngBuffer);
    console.log('Successfully generated icon.png, length:', pngBuffer.length);

    // Now generate icon.ico using resedit if possible, or basic ico wrapper
    try {
      const resedit = require('resedit');
      const iconFile = resedit.Data.IconFile.createEmpty();
      const item = resedit.Data.IconItem.createFrom(pngBuffer, 256, 256, null);
      iconFile.icons.push(item);
      const icoBuffer = Buffer.from(iconFile.generate());
      fs.writeFileSync(path.join(__dirname, 'build', 'icon.ico'), icoBuffer);
      console.log('Successfully generated icon.ico, length:', icoBuffer.length);
    } catch (e) {
      console.warn('resedit icon.ico error:', e.message);
    }
  } catch (err) {
    console.error('Error in convert-icon:', err);
  } finally {
    app.quit();
  }
});


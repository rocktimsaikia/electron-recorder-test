const {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  systemPreferences,
} = require("electron");
const path = require("path");
const IS_OSX = process.platform === "darwin";

// Enable logging
app.commandLine.appendSwitch("enable-logging");
app.commandLine.appendSwitch("v", "1");

// Add necessary Chromium flags
app.commandLine.appendSwitch("enable-features", "WebRTCPipeWireCapturer");
app.commandLine.appendSwitch("enable-usermedia-screen-capturing");

// Log Electron version
console.log("Electron version:", process.versions.electron);

async function createWindow() {
  if (IS_OSX) {
    try {
      await systemPreferences.askForMediaAccess("screen");
    } catch (error) {
      console.error("Error requesting screen capture permission:", error);
    }
  }

  const win = new BrowserWindow({
    icon: path.join(__dirname, "build/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
    },
    height: 450,
    width: 600,
    resizable: false,
    autoHideMenuBar: true,
  });

  win.loadFile("index.html");
}

app.on("ready", createWindow);

app.on("render-process-gone", (event, webContents, details) => {
  console.error("Render process gone:", details);
});

ipcMain.handle("electronMain:openScreenSecurity", async () => {
  try {
    if (IS_OSX) {
      return await systemPreferences.openSystemPreferences(
        "security",
        "Privacy_ScreenCapture",
      );
    }
    console.log("openScreenSecurity not implemented for this platform");
    return false;
  } catch (error) {
    console.error("Error opening screen security preferences:", error);
    throw error;
  }
});

ipcMain.handle("electronMain:getScreenAccess", () => {
  try {
    if (IS_OSX) {
      return systemPreferences.getMediaAccessStatus("screen") === "granted";
    }
    return true; // Assume access is granted on non-macOS platforms
  } catch (error) {
    console.error("Error getting screen access status:", error);
    throw error;
  }
});

ipcMain.on("electronMain:screen:getSources", async (event) => {
  try {
    const sources = await desktopCapturer.getSources({ types: ["screen", "audio"] });
    event.returnValue = sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnailURL: source.thumbnail.toDataURL(),
    }));
  } catch (error) {
    console.error("Error getting screen sources:", error);
    event.returnValue = { error: error.message };
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

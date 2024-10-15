const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronApi", {
  main: {
    openScreenSecurity: () => ipcRenderer.invoke("electronMain:openScreenSecurity"),
    getScreenAccess: () => ipcRenderer.invoke("electronMain:getScreenAccess"),
    getScreenSources: () => ipcRenderer.sendSync("electronMain:screen:getSources"),
  },
});

import { app, BrowserWindow, shell } from "electron";
import path from "path";
import { spawn, type ChildProcess } from "child_process";

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

const SERVER_PORT = 5173;
const isDev = process.env.NODE_ENV === "development";

function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverPath = isDev
      ? path.join(__dirname, "..", "server", "index.ts")
      : path.join(__dirname, "..", "dist", "index.cjs");

    const cmd = isDev ? "npx" : "node";
    const args = isDev
      ? ["tsx", serverPath]
      : [serverPath];

    const env = {
      ...process.env,
      PORT: String(SERVER_PORT),
      NODE_ENV: isDev ? "development" : "production",
    };

    serverProcess = spawn(cmd, args, {
      cwd: path.join(__dirname, ".."),
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    serverProcess.stdout?.on("data", (data) => {
      const msg = data.toString();
      console.log("[server]", msg);
      if (msg.includes("serving on port")) {
        resolve();
      }
    });

    serverProcess.stderr?.on("data", (data) => {
      console.error("[server]", data.toString());
    });

    serverProcess.on("error", (err) => {
      console.error("Failed to start server:", err);
      reject(err);
    });

    serverProcess.on("exit", (code) => {
      console.log(`Server exited with code ${code}`);
    });

    // Timeout - resolve anyway after 10 seconds
    setTimeout(resolve, 10000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "PTTAVM Sigorta Bot",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  console.log("Starting PTTAVM Sigorta Bot...");
  await startServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
  }
});

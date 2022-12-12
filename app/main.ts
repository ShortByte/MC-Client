import { app, BrowserWindow, ipcMain, screen } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { BotInstance } from './bot';
import { Database } from './database';

export interface Account {
  id?: string;
  uuid?: string;
  displayName: string;
  username: string;
  password?: string;
  type: 'mojang' | 'microsoft' | 'offline';
  hostname: string;
  port: number;
  version: string;
}

export interface InstanceEvent {
  id: string;
  type: 'START' | 'STOP' | 'SEND_MESSAGE' | 'OPEN_VIEWER';
  data: Object | any;
}

export class Main {

  args: string[];
  serve: boolean;

  window: BrowserWindow = undefined;

  database: Database;

  instances: Map<string, BotInstance> = new Map();

  constructor() {
    this.args = process.argv.slice(1);
    this.serve = this.args.some((value) => value === '--serve');
    
    this.database = new Database(this);

    this.initListeners();
  }

  createWindow() {
    const size = screen.getPrimaryDisplay().workAreaSize;

    this.window = new BrowserWindow({
      x: 0,
      y: 0,
      width: (size.width / 4) * 3,
      height: (size.height / 4) * 3,
      webPreferences: {
        nodeIntegration: true,
        allowRunningInsecureContent: this.serve,
        contextIsolation: false
      }
    });

    this.window.removeMenu();

    if (this.serve) {
      this.window.webContents.openDevTools();

      const debug = require('electron-debug');
      debug();

      require('electron-reloader')(module);
      this.window.loadURL('http://localhost:4200');
    } else {
      let pathIndex = './index.html';

      if (fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
        pathIndex = '../dist/index.html';
      }
      this.window.loadURL(new URL(path.join('file:', __dirname, pathIndex)).href);
    }

    this.window.on('closed', () => this.window = undefined);
  }

  private initListeners() {
    ipcMain.on('initial', (_) => {
      this.window.webContents.send('accounts', JSON.stringify(this.database.getAccounts));
      this.instances.forEach((instance) => instance.initial());
    });

    ipcMain.on('account-insert', (_, data) => {
      const account: Account = JSON.parse(data);
      this.database.insertAccount(account);
    });

    ipcMain.on('account-update', (_, data) => {
      const account: Account = JSON.parse(data);
      this.database.updateAccount(account);
    });

    ipcMain.on('account-delete', (_, data) => {
      const account: Account = JSON.parse(data);
      this.database.deleteAccount(account);
    })

    ipcMain.on('instance', (_, data) => {
      const response: InstanceEvent = JSON.parse(data);

      if(!(this.instances.has(response.id)))
        return;
      const instance = this.instances.get(response.id);

      switch(response.type) {
        case 'START': {
          instance.startBot();
          break;
        }
        case 'STOP': {
          instance.stopBot();
          break;
        }
        case 'SEND_MESSAGE': {
          const data = JSON.parse(response.data);
          instance.sendMessage(data.message);
          break;
        }
        case 'OPEN_VIEWER': {
          instance.startViewer();
          break;
        }
      }
    });
  }

  sendToWindow(channel: string, args: any) {
    this.window.webContents.send(channel, JSON.stringify(args));
  }
}

const main = new Main();

try {
  app.disableHardwareAcceleration();
  
  app.on('ready', () => setTimeout(() => main.createWindow(), 400));

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (main.window === null) {
      main.createWindow();
    }
  });
} catch (e) {
  // Catch Error
  // throw e;
}

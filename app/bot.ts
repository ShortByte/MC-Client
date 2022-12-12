import { BrowserWindow } from "electron";
import { Bot, createBot } from "mineflayer";
import { getPort } from "portfinder";
import { mineflayer as mineflayerViewer } from "prismarine-viewer";
import { Account, Main } from "./main";

export interface Log {
  type: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  createdAt: number;
}

export interface MessageLog {
  username: string;
  message: string;
  jsonMessage: string;
  createdAt: number;
}

export class BotInstance {

  private main: Main;

  private account: Account;

  private bot?: Bot;

  constructor(main: Main, account: Account) {
    this.main = main;
    this.account = account;
  }

  initial() {
    this.main.database.all('SELECT * FROM messages WHERE id = ? ORDER BY createdAt DESC LIMIT 50', [this.account.id], (error, rows) => {
      if(error)
        return console.error(`[SQLite] Error: ${error.message}`);
      this.main.sendToWindow('messages', rows);
    });

    this.main.database.all('SELECT * FROM logs WHERE id = ? ORDER BY createdAt DESC LIMIT 50', [this.account.id], (error, rows) => {
      if(error)
        return console.error(`[SQLite] Error: ${error.message}`);
      this.main.sendToWindow('logs', rows);
    });

    this.main.sendToWindow('status', {
      id: this.account.id,
      status: 'OFFLINE',
      startedAt: 0
    });
  }

  startBot() {
    if(this.bot) {
      this.stopBot();
    }
    this.bot = createBot({
      host: this.account.hostname,
      port: this.account.port,
      version: this.account.version,
      username: this.account.username,
      password: this.account.password,
      auth: this.account.type
    });
    
    this.main.sendToWindow('status', {
      id: this.account.id,
      status: 'ONLINE',
      startedAt: Date.now()
    });

    this.bot.on('kicked', (reason, loggedIn) => {
      this.log('WARN', `Bot kicked.. (Reason: ${reason})`);
    });

    this.bot.on('error', (error) => {
      this.log('ERROR', `Error: ${error.message}`);
    });

    this.bot.on('end', (reason) => {
      this.log('INFO', `Bot stopped. (Reason: ${reason})`);
      this.stopBot(false);
    });

    this.bot.once('spawn', () => {
      this.log('INFO', `Bot connected! (Username: ${this.bot.username})`);

      if(!(this.account.uuid)) {
        this.account.uuid = this.bot.player.uuid;
        this.main.database.updateAccount(this.account);
      }
    });

    this.bot.on('chat', async (username, message, translate, jsonMsg) => {
      this.main.sendToWindow('message', {
        id: this.account.id,
        username: username,
        message: message,
        jsonMessage: JSON.stringify(jsonMsg),
        createdAt: Date.now()
      });

      this.main.database.run('INSERT INTO messages (id, username, message, jsonMessage, createdAt) VALUES (?, ?, ?, ?, ?)', [
        this.account.id,
        username,
        message,
        JSON.stringify(jsonMsg),
        Date.now()
      ]);
    });
  }

  stopBot(quit = true) {
    if(this.bot && quit)
      this.bot.quit('Shutdown');
    this.bot = undefined;

    this.main.sendToWindow('status', {
      id: this.account.id,
      status: 'OFFLINE',
      startedAt: 0
    });
  }

  startViewer(): void {
    getPort({
      port: 3000,
      stopPort: 3999
    }, (error, port) => {
      if(error) {
        console.error(error);
        return;
      }  
      mineflayerViewer(this.bot, { 
        port: port, 
        firstPerson: true
      });
      
      const window = new BrowserWindow({ 
        parent: this.main.window,
        show: true
      });

      window.removeMenu();

      window.loadURL(`http://localhost:${port}`);

      if(this.main.serve)
        window.webContents.openDevTools();

      window.on('closed', () => {
        (this.bot as any).viewer.close();
      });
    });
  }

  sendMessage(message: string) {
    this.bot.chat(message);
  }

  private async log(type: 'INFO' | 'WARN' | 'ERROR', message: string) {
    this.main.sendToWindow('log', {
      id: this.account.id,
      type: type,
      message: message,
      createdAt: Date.now()
    });

    this.main.database.run('INSERT INTO logs (id, type, message, createdAt) VALUES (?, ?, ?, ?)', [
      this.account.id,
      type,
      message,
      Date.now()
    ]);

    if(this.main.serve)
      console.log(`${this.account.displayName} | Type: ${type} | Message: ${message}`);
  }
}
import { app } from "electron";
import { Database as SQL, Statement } from 'sqlite3';
import { BotInstance } from "./bot";
import { Account, Main } from "./main";

export class Database {
  
  private database: SQL;

  private accounts: Account[] = [];

  constructor(private main: Main) {
    this.init();
  }

  private init() {
    this.database = new SQL(`${app.getPath('userData')}/database.db`, (error) => {
      if(error) {
        console.error(error.message);
        return;
      }
      console.log('[SQLite] Successful connected to database!');
    });

    this.database.serialize(() => {
      this.database.run('CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, uuid TEXT, displayName TEXT, username TEXT, password TEXT, type TEXT, hostname TEXT, port INTEGER, version TEXT)');
      this.database.run('CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, username TEXT, message TEXT, jsonMessage TEXT, createdAt BIGINT)')
      this.database.run('CREATE TABLE IF NOT EXISTS logs (id text PRIMARY KEY, type TEXT, message TEXT, createdAt BIGINT)');
    });

    this.loadAccounts();
  }

  private loadAccounts() {
    this.database.all('SELECT * FROM accounts', [], (error, rows) => {
      if(error)
        return console.error(`[SQLite] Error: ${error.message}`);
      this.accounts = rows;

      this.accounts.forEach((account) => {
        if(this.main.instances.has(account.id))
          return;
        this.main.instances.set(account.id, new BotInstance(this.main, account));
      });
      console.log(`[SQLite] Loaded ${this.accounts.length} accounts!`);
    });
  }

  get getAccounts() {
    return this.accounts;
  }

  insertAccount(account: Account) {
    const set = [
     'id', 'uuid', 'displayName', 'username', 'password', 'type', 'hostname', 'port', 'version'
    ];

    this.run(`INSERT INTO accounts (${set.join(', ')}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      account.id,
      account.uuid ?? '',
      account.displayName,
      account.username,
      account.password,
      account.type,
      account.hostname,
      account.port,
      account.version
    ]);
    this.accounts.push(account);
    this.main.instances.set(account.id, new BotInstance(this.main, account));
    this.main.sendToWindow('accounts', this.accounts);
  }

  updateAccount(account: Account) {
    const set = [
      'uuid = ?', 'displayName = ?', 'username = ?', 'password = ?', 'type = ?', 'hostname = ?', 'port = ?', 'version = ?'
    ];

    this.run(`UPDATE accounts SET ${set.join(', ')} WHERE id = ?`, [
      account.uuid ?? '',
      account.displayName,
      account.username,
      account.password,
      account.type,
      account.hostname,
      account.port,
      account.version,
      account.id
    ]);
    this.main.sendToWindow('accounts', this.accounts);
  }

  deleteAccount(account: Account) {
    this.run('DELETE FROM accounts WHERE id = ?', [account.id]);

    const index = this.accounts.findIndex((x) => x.id === account.id);
    this.accounts.splice(index, 1);

    const instance = this.main.instances.get(account.id);

    if(instance)
      instance.stopBot();
    this.main.instances.delete(account.id);
    this.main.sendToWindow('accounts', this.accounts);
  }

  run(sql: string, params: any) {
    this.database.run(sql, params, (error) => {
      if(error)
        console.error(error.message);
    });
  }

  all(sql: string, params: any, callback?: (this: Statement, err: Error, rows: any[]) => void) {
    this.database.all(sql, params, callback);
  }
}
import { Injectable } from '@angular/core';
import * as childProcess from 'child_process';
import { ipcRenderer, webFrame } from 'electron';
import * as fs from 'fs';
import { BehaviorSubject } from 'rxjs';
import { Account, InstanceEvent, Log, Message, Status } from '../../entities';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {

  interval: NodeJS.Timer;

  ipcRenderer: typeof ipcRenderer;
  webFrame: typeof webFrame;
  childProcess: typeof childProcess;
  fs: typeof fs;

  accounts: BehaviorSubject<Account[]> = new BehaviorSubject([]);

  logs: Map<string, BehaviorSubject<Log[]>> = new Map();
  messages: Map<string, BehaviorSubject<Message[]>> = new Map();

  status: Map<string, BehaviorSubject<Status>> = new Map();

  selectedAccount: string;

  constructor() {
    if (this.isElectron) {
      this.ipcRenderer = window.require('electron').ipcRenderer;
      this.webFrame = window.require('electron').webFrame;

      this.fs = window.require('fs');

      this.childProcess = window.require('child_process');

      this.ipcRenderer.on('accounts', (_, data) => {
        const accounts: Account[] = JSON.parse(data);

        this.accounts.next(accounts);

        accounts.forEach((account) => {
          if(!(this.logs.has(account.id)))
            this.logs.set(account.id, new BehaviorSubject([]));
          if(!(this.messages.has(account.id)))
            this.messages.set(account.id, new BehaviorSubject([]));
          if(!(this.status.has(account.id)))
            this.status.set(account.id, new BehaviorSubject({
              id: account.id,
              status: 'OFFLINE',
              startedAt: 0
            }));
        });
      });

      this.ipcRenderer.on('messages', (_, response) => {
        const messages: Message[] = JSON.parse(response);

        if (messages.length !== 0)
          this.messages.set(messages[0].id, new BehaviorSubject(messages));
      });

      this.ipcRenderer.on('message', (_, response) => {
        const message: Message = JSON.parse(response);

        if (this.messages.has(message.id)) {
          const subject = this.messages.get(message.id);
          const value = subject.value.concat([message]);
          subject.next(value);
          return;
        }
        this.messages.set(message.id, new BehaviorSubject([message]));
      });

      this.ipcRenderer.on('logs', (_, response) => {
        const logs: Log[] = JSON.parse(response);

        if (logs.length !== 0)
          this.logs.set(logs[0].id, new BehaviorSubject(logs));
      });

      this.ipcRenderer.on('log', (_, response) => {
        const log: Log = JSON.parse(response);

        if (this.logs.has(log.id)) {
          const subject = this.logs.get(log.id);
          const value = subject.value.concat([log]);
          subject.next(value);
          return;
        }
        this.logs.set(log.id, new BehaviorSubject([log]));
      });

      this.ipcRenderer.on('status', (_, response) => {
        const status: Status = JSON.parse(response);

        if (this.status.has(status.id)) {
          this.status.get(status.id).next(status);
          return;
        }
        this.status.set(status.id, new BehaviorSubject(status));
      });

      setTimeout(() => {
        this.ipcRenderer.send('initial');
      }, 250);
    }
  }

  get isElectron(): boolean {
    return !!(window && window.process && window.process.type);
  }

  insertAccount(account: Account) {
    this.ipcRenderer.send('account-insert', JSON.stringify(account));
  }

  updateAccount(account: Account) {
    this.ipcRenderer.send('account-update', JSON.stringify(account));
  }

  deleteAccount(account: Account) {
    this.ipcRenderer.send('account-delete', JSON.stringify(account));
  }

  getAccount(id: string): Account | undefined {
    const accounts = this.accounts.value;

    if (!(accounts))
      return undefined;
    return accounts.find((x) => x.id === id);
  }

  sendEvent(type: 'START' | 'STOP' | 'SEND_MESSAGE' | 'OPEN_VIEWER', data: Object | any = undefined) {
    if (!(this.selectedAccount))
      return;
    const event: InstanceEvent = {
      id: this.selectedAccount,
      type: type,
      data: JSON.stringify(data)
    };

    this.ipcRenderer.send('instance', JSON.stringify(event));
  }
}

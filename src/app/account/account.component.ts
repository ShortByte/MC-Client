import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Inject, OnInit, Renderer2, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Account, Extra, JsonMessage, Log, Message, Status } from '../@core/entities';
import { ElectronService } from '../@core/services';
import { translation } from './translation';

export interface Menu {
  title: string;
  value: number;
}

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class AccountComponent implements OnInit {

  menu: Menu[] = [{
    title: 'Console Logs',
    value: 0
  }, {
    title: 'Chat Messages',
    value: 1
  }, {
    title: 'Settings',
    value: 2
  }];

  selectedMenu: number = this.menu[0].value;

  private interval: NodeJS.Timer;

  @ViewChild('messagesContainer') private messagesContainer: ElementRef;
  @ViewChild('messages') private messagesElement: ElementRef;

  @ViewChild('logsContainer') private logsContainer: ElementRef;
  @ViewChild('logs') private logsElement: ElementRef;

  id: string;

  account?: Account;

  private logs: Log[] = [];
  private messages: Message[] = [];

  status?: Status;

  chatInput: FormControl = new FormControl();

  uptime: string = '0 h, 0 min, 0 s';

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2,
    private route: ActivatedRoute,
    private electronService: ElectronService) {

  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((response) => {
      const id = response.get('id');

      if (this.id !== id) {
        clearInterval(this.interval);
        this.messages = [];
        this.logs = [];

        setTimeout(() => {
          this.selectMenu(this.menu[0].value);
        }, 250);
      }
      this.id = id;

      if (!(this.id))
        return;
      this.electronService.selectedAccount = this.id;

      const account = this.electronService.getAccount(this.id);

      if (!(account)) {
        console.log('NOT FOUND')
        return;
      }

      if (this.electronService.logs.has(account.id)) {
        this.electronService.logs.get(account.id).subscribe((response) => {
          this.logs = response.sort((a, b) => a.createdAt - b.createdAt);

          if (this.selectedMenu === 0 && this.logs.length !== 0)
            this.addLog(this.logs[this.logs.length - 1]);
        });
      }

      if (this.electronService.messages.has(account.id)) {
        this.electronService.messages.get(account.id).subscribe((response) => {
          this.messages = response.sort((a, b) => a.createdAt - b.createdAt);

          if (this.selectedMenu === 1 && this.messages.length !== 0)
            this.addMessage(this.messages[this.messages.length - 1]);
        });
      }

      if (this.electronService.status.has(account.id)) {
        this.electronService.status.get(account.id).subscribe((response) => {
          this.status = response;
        });
      }

      this.interval = setInterval(() => {
        if (!(this.status) || !(this.status.startedAt))
          return;
        const time = (Date.now() - this.status.startedAt) / 1000;

        const hours = Math.floor(time / 3600);
        const minutes = Math.floor(time % 3600 / 60);
        const seconds = Math.floor(time % 3600 % 60);

        let timeString = '';

        timeString += `${hours} h, `;
        timeString += `${minutes} min, `;
        timeString += `${seconds} s`;
        this.uptime = timeString;
      }, 1000);
    });
  }

  selectMenu(selected: number) {
    this.selectedMenu = selected;

    switch (selected) {
      case 0: {
        if (this.logsElement && this.logsElement.nativeElement)
          this.logsElement.nativeElement.textContent = '';

        this.logs.forEach((log) => {
          this.addLog(log, false);
        });
        this.scrollDown('LOGS');
        break;
      }
      case 1: {
        if (this.messagesElement && this.messagesElement.nativeElement)
          this.messagesElement.nativeElement.textContent = '';

        this.messages.forEach((message) => {
          this.addMessage(message, false);
        });
        this.scrollDown('MESSAGES');
        break;
      }
    }
  }

  
  startBot() {
    if (this.status?.status === 'ONLINE')
      return;
    this.electronService.sendEvent('START');
  }

  stopBot() {
    if (this.status?.status === 'OFFLINE')
      return;
    this.electronService.sendEvent('STOP');
  }

  openViewer() {
    if (this.status?.status !== 'ONLINE')
      return;
    this.electronService.sendEvent('OPEN_VIEWER');
  }

  sendMessage() {
    if (!(this.status) || this.status.status !== 'ONLINE')
      return;
    const input = this.chatInput.value;

    if (!(input) || input.length === 0)
      return;
    this.chatInput.setValue('');
    this.electronService.sendEvent('SEND_MESSAGE', {
      message: input
    });
  }

  private addMessage(message: Message, scroll = true) {
    const jsonMessage: JsonMessage = JSON.parse(message.jsonMessage);

    const child = this.document.createElement('li');

    const span = this.document.createElement('span');
    span.innerText = `[${this.getDateString(new Date(message.createdAt))}] `;
    child.append(span);

    if (jsonMessage.translate) {
      let translate: string = translation[jsonMessage.translate];

      const span = this.getMessageSpan(jsonMessage);

      jsonMessage.with?.forEach((item) => {
        if (item.text) {
          translate = translate.replace('%s', item.text);
        }
        if (item.translate) {
          let subTranslate: string = translation[item.translate];

          item.with?.forEach((item) => {
            if (item.text)
              subTranslate = subTranslate.replace('%s', item.text);
            if (item.translate)
              subTranslate = subTranslate.replace('%s', translation[item.translate]);
          });
          translate = translate.replace('%s', subTranslate);
        }
      });

      span.innerText = translate;
      child.append(span);
    }

    jsonMessage.extra?.forEach((item) => {
      const span = this.getMessageSpan(item);

      if (item.extra) {
        item.extra.forEach((subItem) => {
          const subSpan = this.getMessageSpan(subItem);
          span.append(subSpan);
        });
      }

      child.appendChild(span);
    });

    this.renderer.appendChild(this.messagesElement.nativeElement, child);

    if (scroll)
      this.scrollDown('MESSAGES');
  }

  private getMessageSpan(item: JsonMessage | Extra) {
    const span = this.document.createElement('span');

    if (item.text)
      span.innerText = item.text;
    if (item.color)
      span.classList.add(`text-${item.color}`);
    if (item.bold)
      span.classList.add('text-bold');
    if (item.italic)
      span.classList.add('text-italic');
    if (item.obfuscated)
      span.classList.add('text-obfuscated');
    if (item.strikethrough)
      span.classList.add('text-strikethrough');
    if (item.underlined)
      span.classList.add('text-underlined');

    return span;
  }

  private addLog(log: Log, scroll = true) {
    const child = this.document.createElement('li');

    const date = this.document.createElement('span');
    date.innerText = `[${this.getDateString(new Date(log.createdAt))}] `;
    child.append(date);

    const type = this.document.createElement('span');
    type.innerText = `[${log.type.toUpperCase()}]`;
    type.classList.add(log.type.toLowerCase());
    child.append(type);

    const message = this.document.createElement('span');
    message.innerText = `: ${log.message}`;
    child.append(message);

    this.renderer.appendChild(this.logsElement.nativeElement, child);

    if (scroll)
      this.scrollDown('LOGS');
  }

  private getDateString(date: Date) {
    let response = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getFullYear())}`;
    response += ` ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    return response;
  }

  private scrollDown(type: 'LOGS' | 'MESSAGES') {
    setTimeout(() => {
      switch (type) {
        case 'LOGS': {
          if (this.logsContainer && this.logsContainer.nativeElement)
            this.logsContainer.nativeElement.scrollTop = this.logsContainer.nativeElement.scrollHeight;
          break;
        }
        case 'MESSAGES': {
          if (this.messagesContainer && this.messagesContainer.nativeElement)
            this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
          break;
        }
      }
    }, 100);
  }
}

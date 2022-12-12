import { Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { APP_CONFIG } from '../../../environments/environment';
import { Account } from '../../@core/entities';
import { ElectronService } from '../../@core/services';

@Component({
  selector: 'sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

  accounts: Account[];

  version: string;

  constructor(private electronService: ElectronService, private zone: NgZone, private router: Router) { }

  ngOnInit(): void {
    this.electronService.accounts.subscribe((response) => {
      this.zone.run(() => {
        this.accounts = response;
      });
    });

    const config = APP_CONFIG;
    this.version = `Version: v${config.version}`;
  }

  deleteAccount(account: Account) {
    this.electronService.deleteAccount(account);
  }

}

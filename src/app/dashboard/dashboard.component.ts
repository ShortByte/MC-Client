import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { v4 as uuidv4 } from 'uuid';
import { TYPES, VERSIONS } from '../@core/entities';
import { ElectronService } from '../@core/services';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  form: FormGroup;

  versions = VERSIONS;
  types = TYPES;

  constructor(private electronService: ElectronService, private formBuilder: FormBuilder) {

  }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      displayName: ['', Validators.required],
      username: ['', Validators.required],
      password: [''],
      type: ['microsoft', Validators.required],
      hostname: ['', Validators.required],
      port: [25565, Validators.required],
      version: ['1.19.2', Validators.required]
    });
  }

  addAccount() {
    if (!(this.form.valid))
      return;
    this.form.disable();

    const account = this.form.getRawValue();
    
    this.electronService.insertAccount({
      id: uuidv4(),
      displayName: account.displayName,
      username: account.username,
      password: account.password,
      type: account.type,
      hostname: account.hostname,
      port: account.port,
      version: account.version
    });
  }
}

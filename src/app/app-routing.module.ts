import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PageNotFoundComponent } from './shared/components';

import { AccountComponent } from './account/account.component';
import { DashboardComponent } from './dashboard/dashboard.component';

const routes: Routes = [{
  path: '',
  redirectTo: 'dashboard',
  pathMatch: 'full'
}, {
  path: 'dashboard',
  component: DashboardComponent
}, {
  path: 'account/:id',
  component: AccountComponent
}, {
  path: '**',
  component: PageNotFoundComponent
}];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { 
      relativeLinkResolution: 'legacy',
      useHash: true
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { 
  
}

import { Routes } from '@angular/router';
import { LoginComponent } from './components/login.component';
import { RegisterComponent } from './components/register.component';
import { DashboardComponent } from './components/dashboard.component';
import { ManagerDashboardComponent } from './components/manager-dashboard.component';
import { CreateEventComponent } from './components/create-event.component';
import { ManagerEventsComponent } from './components/manager-events.component';
import { ManagerQrDisplayComponent } from './components/manager-qr-display.component';
import { ManagerProfileComponent } from './components/manager-profile.component';
import { AdminDashboardComponent } from './components/admin-dashboard.component';
import { EventParticipantsComponent } from './components/event-participants.component';
import { AttendanceHistoryComponent } from './components/attendance-history.component';
import { DebugComponent } from './components/debug.component';
import { authGuard, loginGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  
  // User Dashboard (default)
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [authGuard, RoleGuard],
    data: { roles: ['User'] }
  },
  
  // Manager routes
  {
    path: 'manager',
    component: ManagerDashboardComponent,
    canActivate: [authGuard, RoleGuard],
    data: { roles: ['Manager'] }
  },
  {
    path: 'manager/create-event',
    component: CreateEventComponent,
    canActivate: [authGuard, RoleGuard],
    data: { roles: ['Manager'] }
  },
  {
    path: 'manager/events',
    component: ManagerEventsComponent,
    canActivate: [authGuard, RoleGuard],
    data: { roles: ['Manager'] }
  },
  {
    path: 'manager/events/:id',
    loadComponent: () => import('./components/event-detail.component').then(m => m.EventDetailComponent),
    canActivate: [authGuard, RoleGuard],
    data: { roles: ['Manager'] }
  },
  {
    path: 'manager/events/:id/edit',
    loadComponent: () => import('./components/event-edit.component').then(m => m.EventEditComponent),
    canActivate: [authGuard, RoleGuard],
    data: { roles: ['Manager'] }
  },
  {
    path: 'manager/events/:id/qr',
    component: ManagerQrDisplayComponent,
    canActivate: [authGuard, RoleGuard],
    data: { roles: ['Manager'] }
  },
  {
    path: 'manager/events/:id/participants',
    component: EventParticipantsComponent,
    canActivate: [authGuard, RoleGuard],
    data: { roles: ['Manager'] }
  },
  {
    path: 'manager/events/:id/attendance',
    loadComponent: () => import('./components/event-attendance.component').then(m => m.EventAttendanceComponent),
    canActivate: [authGuard, RoleGuard],
    data: { roles: ['Manager'] }
  },
  {
    path: 'manager/profile',
    component: ManagerProfileComponent,
    canActivate: [authGuard, RoleGuard],
    data: { roles: ['Manager'] }
  },
  
  // User Routes
  { 
    path: 'attendance-history', 
    component: AttendanceHistoryComponent, 
    canActivate: [authGuard, RoleGuard],
    data: { roles: ['User'] }
  },
  
  // Debug Route (no guards)
  { 
    path: 'debug', 
    component: DebugComponent
  },
  
  // Admin Routes
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [authGuard, RoleGuard],
    data: { roles: ['Admin'] }
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./components/admin-users.component').then(m => m.AdminUsersComponent),
    canActivate: [authGuard, RoleGuard],
    data: { roles: ['Admin'] }
  },
  {
    path: 'admin/organizations',
    loadComponent: () => import('./components/admin-organizations.component').then(m => m.AdminOrganizationsComponent),
    canActivate: [authGuard, RoleGuard],
    data: { roles: ['Admin'] }
  },
  {
    path: 'admin/events',
    loadComponent: () => import('./components/admin-events.component').then(m => m.AdminEventsComponent),
    canActivate: [authGuard, RoleGuard],
    data: { roles: ['Admin'] }
  },
  {
    path: 'admin/attendance',
    loadComponent: () => import('./components/admin-attendance.component').then(m => m.AdminAttendanceComponent),
    canActivate: [authGuard, RoleGuard],
    data: { roles: ['Admin'] }
  },
  {
    path: 'admin/stats',
    loadComponent: () => import('./components/admin-stats.component').then(m => m.AdminStatsComponent),
    canActivate: [authGuard, RoleGuard],
    data: { roles: ['Admin'] }
  },
  {
    path: 'admin/profile',
    component: ManagerProfileComponent, // Reuse manager profile component
    canActivate: [authGuard, RoleGuard],
    data: { roles: ['Admin'] }
  },
  
  { path: '**', redirectTo: '/login' }
];
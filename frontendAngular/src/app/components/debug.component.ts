import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-debug',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  template: `
    <div style="padding: 20px;">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Debug Information</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <h3>Authentication Status</h3>
          <p><strong>Is Authenticated:</strong> {{ isAuthenticated }}</p>
          <p><strong>Token:</strong> {{ token || 'None' }}</p>
          
          <h3>Current User</h3>
          <pre>{{ currentUser | json }}</pre>
          
          <h3>User Role</h3>
          <p><strong>Role:</strong> {{ userRole || 'None' }}</p>
          <p><strong>Dashboard Route:</strong> {{ dashboardRoute }}</p>
          
          <h3>Actions</h3>
          <button mat-raised-button color="primary" (click)="goToLogin()">Go to Login</button>
          <button mat-raised-button color="accent" (click)="goToDashboard()">Go to Dashboard</button>
          <button mat-raised-button color="warn" (click)="logout()">Logout</button>
          <button mat-raised-button (click)="debugAuth()">Debug Auth State</button>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class DebugComponent implements OnInit {
  isAuthenticated = false;
  token: string | null = null;
  currentUser: any = null;
  userRole: string | null = null;
  dashboardRoute = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDebugInfo();
  }

  loadDebugInfo(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
    this.token = this.authService.getToken();
    this.currentUser = this.authService.getCurrentUser();
    this.userRole = this.currentUser?.role ? 
      (typeof this.currentUser.role === 'object' ? this.currentUser.role.name : this.currentUser.role) : 
      null;
    this.dashboardRoute = this.authService.getDashboardRoute();
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToDashboard(): void {
    this.router.navigate([this.dashboardRoute]);
  }

  logout(): void {
    this.authService.logout();
    this.loadDebugInfo();
  }

  debugAuth(): void {
    this.authService.debugAuthState();
    this.loadDebugInfo();
  }
}
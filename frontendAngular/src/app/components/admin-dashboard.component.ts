import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../services/auth.service';
import { AdminService } from '../services/admin.service';
import { User } from '../models/api.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatTooltipModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private userSubscription?: Subscription;
  
  stats = {
    totalUsers: 0,
    totalEvents: 0,
    totalOrganizations: 0,
    pendingVerifications: 0
  };
  
  isLoading = false;

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to currentUser$ to get automatic updates
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    
    // Also get current user immediately
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Check if user is Admin
    const roleData = this.currentUser.role || (this.currentUser as any).Role;
    let userRole: string;
    
    if (typeof roleData === 'object' && roleData) {
      userRole = roleData.Name || roleData.name || '';
    } else {
      userRole = roleData || '';
    }
    
    if (userRole !== 'Admin') {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    
    // Load real data from API
    this.adminService.getDashboardStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.stats = response.data;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
        // Fallback to default values on error
        this.stats = {
          totalUsers: 0,
          totalEvents: 0,
          totalOrganizations: 0,
          pendingVerifications: 0
        };
        this.isLoading = false;
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Navigation methods
  goToUsers(): void {
    this.router.navigate(['/admin/users']);
  }

  goToOrganizations(): void {
    this.router.navigate(['/admin/organizations']);
  }

  goToEvents(): void {
    this.router.navigate(['/admin/events']);
  }

  goToAttendance(): void {
    this.router.navigate(['/admin/attendance']);
  }

  goToStats(): void {
    this.router.navigate(['/admin/stats']);
  }

  goToProfile(): void {
    this.router.navigate(['/admin/profile']);
  }

  getUserDisplayName(): string {
    if (!this.currentUser) return '';
    
    const fullName = (this.currentUser as any).fullName || (this.currentUser as any).FullName || 'Admin';
    const role = this.currentUser.role || (this.currentUser as any).Role;
    
    let roleName = '';
    if (typeof role === 'object' && role) {
      roleName = role.Name || role.name || '';
    } else if (typeof role === 'string') {
      roleName = role;
    }
    
    return roleName ? `${fullName} (${roleName})` : fullName;
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { EventService } from '../services/event.service';
import { User } from '../models/api.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatBadgeModule,
    MatTooltipModule
  ],
  templateUrl: './manager-dashboard.component.html',
  styleUrls: ['./manager-dashboard.component.css']
})
export class ManagerDashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private userSubscription?: Subscription;
  stats = {
    totalEvents: 0,
    activeEvents: 0,
    totalParticipants: 0,
    todayAttendance: 0
  };
  
  recentEvents: any[] = [];
  isLoading = true;

  constructor(
    private authService: AuthService,
    private eventService: EventService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to currentUser$ to get automatic updates
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      console.log('ManagerDashboard: User updated', user);
      this.currentUser = user;
    });
    
    // Also get current user immediately
    this.currentUser = this.authService.getCurrentUser();
    console.log('ManagerDashboard: Current user', this.currentUser);
    
    if (!this.currentUser) {
      console.log('ManagerDashboard: No user found, redirecting');
      this.router.navigate(['/dashboard']);
      return;
    }
    
    // Extract role name from different formats
    const roleData = this.currentUser.role || (this.currentUser as any).Role;
    let userRole: string;
    
    if (typeof roleData === 'object' && roleData) {
      userRole = roleData.Name || roleData.name || '';
    } else {
      userRole = roleData || '';
    }
    
    console.log('ManagerDashboard: Extracted user role:', userRole);
    
    if (userRole !== 'Manager') {
      console.log('ManagerDashboard: User is not a manager, redirecting');
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    // Unsubscribe to prevent memory leaks
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    
    // Load events created by this manager
    this.eventService.getEvents(1, 10).subscribe({
      next: (response) => {
        console.log('ManagerDashboard: Events loaded', response);
        if (response.success && response.data) {
          this.recentEvents = response.data.events || [];
          this.updateStats();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('ManagerDashboard: Error loading events', error);
        this.isLoading = false;
      }
    });
  }

  private updateStats(): void {
    this.stats.totalEvents = this.recentEvents.length;
    this.stats.activeEvents = this.recentEvents.filter(e => e.status === 'Active').length;
    
    // Calculate total participants
    this.stats.totalParticipants = this.recentEvents.reduce((sum, event) => 
      sum + (event.participantCount || 0), 0);
    
    // Calculate today's attendance
    this.stats.todayAttendance = this.recentEvents.reduce((sum, event) => 
      sum + (event.attendanceCount || 0), 0);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Navigation methods
  goToCreateEvent(): void {
    this.router.navigate(['/manager/create-event']);
  }

  goToEventList(): void {
    this.router.navigate(['/manager/events']);
  }

  goToProfile(): void {
    this.router.navigate(['/manager/profile']);
  }

  // Event management methods
  viewEvent(eventId: string): void {
    this.router.navigate(['/manager/events', eventId]);
  }

  editEvent(eventId: string): void {
    this.router.navigate(['/manager/events', eventId, 'edit']);
  }

  showQrCode(eventId: string): void {
    this.router.navigate(['/manager/events', eventId, 'qr']);
  }

  viewAttendance(eventId: string): void {
    this.router.navigate(['/manager/events', eventId, 'attendance']);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getUserDisplayName(): string {
    if (!this.currentUser) return '';
    
    // Handle both camelCase and PascalCase
    const fullName = (this.currentUser as any).fullName || (this.currentUser as any).FullName || 'User';
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
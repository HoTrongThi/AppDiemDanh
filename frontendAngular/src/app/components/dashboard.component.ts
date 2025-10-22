import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../services/auth.service';
import { EventService } from '../services/event.service';
import { Event, User } from '../models/api.models';
import { EventListComponent } from './event-list.component';
import { QrDisplayComponent } from './qr-display.component';
import { QrScannerComponent } from './qr-scanner.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTabsModule,
    MatTooltipModule,
    EventListComponent,
    QrDisplayComponent,
    QrScannerComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  totalEvents = 0;
  totalAttendance = 0;
  activeQrSessions = 0;
  private subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private eventService: EventService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Get current user
    this.subscription.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
      })
    );

    // Load statistics if admin
    if (this.isAdmin) {
      this.loadStatistics();
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  logout(): void {
    this.authService.logout();
    this.snackBar.open('Đã đăng xuất thành công', 'Đóng', {
      duration: 3000
    });
    this.router.navigate(['/login']);
  }

  goToAttendanceHistory(): void {
    this.router.navigate(['/attendance-history']);
  }

  private loadStatistics(): void {
    // Load events to get count
    this.subscription.add(
      this.eventService.getEvents(1, 100).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.totalEvents = response.data.pagination.totalCount;
            // Calculate total attendance from events
            this.totalAttendance = response.data.events.reduce(
              (sum, event) => sum + event.attendanceCount, 0
            );
          }
        },
        error: (error) => {
          console.error('Error loading statistics:', error);
        }
      })
    );

    // For now, set active QR sessions to a placeholder
    // In a real app, you'd have an API endpoint for this
    this.activeQrSessions = 0;
  }
}
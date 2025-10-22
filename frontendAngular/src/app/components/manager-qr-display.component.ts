import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { QrDisplayComponent } from './qr-display.component';
import { EventService } from '../services/event.service';
import { AuthService } from '../services/auth.service';
import { Event } from '../models/api.models';

@Component({
  selector: 'app-manager-qr-display',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    QrDisplayComponent
  ],
  templateUrl: './manager-qr-display.component.html',
  styleUrls: ['./manager-qr-display.component.css']
})
export class ManagerQrDisplayComponent implements OnInit, OnDestroy {
  eventId: string = '';
  event: Event | null = null;
  isLoading = true;
  isFullscreen = false;
  refreshInterval: any;
  attendanceCount = 0;
  lastRefreshTime = new Date();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user || !user.role) {
      this.router.navigate(['/dashboard']);
      return;
    }
    
    const userRole = typeof user.role === 'object' ? user.role.name : user.role;
    if (userRole !== 'Manager') {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.eventId = this.route.snapshot.params['id'];
    if (!this.eventId) {
      this.router.navigate(['/manager/events']);
      return;
    }

    this.loadEvent();
    this.startRefreshTimer();
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private loadEvent(): void {
    this.isLoading = true;
    
    this.eventService.getEvent(this.eventId).subscribe({
      next: (response) => {
        console.log('ManagerQrDisplay: Event loaded', response);
        if (response.success && response.data) {
          this.event = response.data;
        } else {
          this.snackBar.open('Không tìm thấy sự kiện', 'Đóng', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.router.navigate(['/manager/events']);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('ManagerQrDisplay: Error loading event', error);
        this.snackBar.open('Có lỗi khi tải thông tin sự kiện', 'Đóng', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.isLoading = false;
      }
    });
  }

  private startRefreshTimer(): void {
    // Refresh attendance count every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.refreshAttendanceCount();
      this.lastRefreshTime = new Date();
    }, 30000);
  }

  private refreshAttendanceCount(): void {
    // TODO: Call API to get real-time attendance count
    // For now, simulate random updates
    if (this.event) {
      // Simulate attendance updates (remove this in real implementation)
      const maxIncrease = Math.floor(Math.random() * 3);
      this.attendanceCount = Math.min(
        this.attendanceCount + maxIncrease,
        this.event.participantCount || 0
      );
    }
  }

  // Navigation methods
  goBack(): void {
    this.router.navigate(['/manager/events']);
  }

  goToEventDetail(): void {
    this.router.navigate(['/manager/events', this.eventId]);
  }

  goToAttendance(): void {
    this.router.navigate(['/manager/events', this.eventId, 'attendance']);
  }

  // Display controls
  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.isFullscreen = true;
      }).catch(err => {
        console.error('Error entering fullscreen:', err);
        this.snackBar.open('Không thể chuyển sang chế độ toàn màn hình', 'Đóng', {
          duration: 3000
        });
      });
    } else {
      document.exitFullscreen().then(() => {
        this.isFullscreen = false;
      });
    }
  }

  refreshQr(): void {
    // Force QR refresh by updating timestamp
    this.lastRefreshTime = new Date();
    this.snackBar.open('Đã làm mới mã QR', 'Đóng', {
      duration: 2000,
      panelClass: ['success-snackbar']
    });
  }

  // Utility methods
  formatTime(date: Date): string {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatEventStartTime(): string {
    if (!this.event) return '';
    return this.formatTime(new Date(this.event.startTime));
  }

  formatEventEndTime(): string {
    if (!this.event) return '';
    return this.formatTime(new Date(this.event.endTime));
  }

  getEventStatus(): string {
    if (!this.event) return '';
    
    const now = new Date();
    const startTime = new Date(this.event.startTime);
    const endTime = new Date(this.event.endTime);
    
    if (now < startTime) {
      return 'Chưa bắt đầu';
    } else if (now >= startTime && now <= endTime) {
      return 'Đang diễn ra';
    } else {
      return 'Đã kết thúc';
    }
  }

  getEventStatusColor(): string {
    const status = this.getEventStatus();
    switch (status) {
      case 'Đang diễn ra': return 'primary';
      case 'Chưa bắt đầu': return 'accent';
      case 'Đã kết thúc': return 'warn';
      default: return 'basic';
    }
  }

  isEventActive(): boolean {
    return this.getEventStatus() === 'Đang diễn ra';
  }

  getAttendanceRate(): number {
    if (!this.event || !this.event.participantCount) return 0;
    return Math.round((this.attendanceCount / this.event.participantCount) * 100);
  }

  // Keyboard shortcuts
  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'F11':
        event.preventDefault();
        this.toggleFullscreen();
        break;
      case 'F5':
        event.preventDefault();
        this.refreshQr();
        break;
      case 'Escape':
        if (this.isFullscreen) {
          document.exitFullscreen();
        } else {
          this.goBack();
        }
        break;
    }
  }
}
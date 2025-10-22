import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EventService } from '../services/event.service';
import { Event } from '../models/api.models';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.css']
})
export class EventDetailComponent implements OnInit {
  event: Event | null = null;
  isLoading = true;
  eventId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.eventId = this.route.snapshot.params['id'];
    if (this.eventId) {
      this.loadEvent();
    }
  }

  loadEvent(): void {
    this.isLoading = true;
    this.eventService.getEvent(this.eventId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.event = response.data;
        } else {
          this.snackBar.open('Không thể tải thông tin sự kiện', 'Đóng', { duration: 3000 });
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading event:', error);
        this.snackBar.open('Lỗi khi tải thông tin sự kiện', 'Đóng', { duration: 3000 });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/manager/events']);
  }

  editEvent(): void {
    this.router.navigate(['/manager/events', this.eventId, 'edit']);
  }

  showQrCode(): void {
    this.router.navigate(['/manager/events', this.eventId, 'qr']);
  }

  viewParticipants(): void {
    this.router.navigate(['/manager/events', this.eventId, 'participants']);
  }

  viewAttendance(): void {
    this.router.navigate(['/manager/events', this.eventId, 'attendance']);
  }

  // Utility methods
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': return 'primary';
      case 'draft': return 'accent';
      case 'completed': return 'warn';
      case 'cancelled': return '';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': return 'Đang hoạt động';
      case 'draft': return 'Bản nháp';
      case 'completed': return 'Đã hoàn thành';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  }

  isEventActive(): boolean {
    if (!this.event) return false;
    const now = new Date();
    const start = new Date(this.event.startTime);
    const end = new Date(this.event.endTime);
    return now >= start && now <= end;
  }

  isEventUpcoming(): boolean {
    if (!this.event) return false;
    const now = new Date();
    const start = new Date(this.event.startTime);
    return now < start;
  }

  isEventPast(): boolean {
    if (!this.event) return false;
    const now = new Date();
    const end = new Date(this.event.endTime);
    return now > end;
  }

  getEventTimeStatus(): string {
    if (this.isEventUpcoming()) return 'Sắp diễn ra';
    if (this.isEventActive()) return 'Đang diễn ra';
    if (this.isEventPast()) return 'Đã kết thúc';
    return '';
  }

  getEventTimeStatusIcon(): string {
    if (this.isEventUpcoming()) return 'schedule';
    if (this.isEventActive()) return 'play_circle';
    if (this.isEventPast()) return 'check_circle';
    return 'event';
  }

  formatLocation(): string {
    if (!this.event) return '';
    if (this.event.locationName) {
      return this.event.locationName;
    }
    if (this.event.location) {
      return `${this.event.location.latitude}, ${this.event.location.longitude}`;
    }
    return 'Chưa xác định';
  }

  hasGpsLocation(): boolean {
    return !!(this.event?.location?.latitude && this.event?.location?.longitude);
  }

  getAttendanceRate(): number {
    if (!this.event || this.event.participantCount === 0) return 0;
    return Math.round((this.event.attendanceCount / this.event.participantCount) * 100);
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EventService } from '../services/event.service';
import { AuthService } from '../services/auth.service';
import { Event } from '../models/api.models';

@Component({
  selector: 'app-manager-events',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule
  ],
  templateUrl: './manager-events.component.html',
  styleUrls: ['./manager-events.component.css']
})
export class ManagerEventsComponent implements OnInit {
  events: Event[] = [];
  filteredEvents: Event[] = [];
  isLoading = true;
  
  displayedColumns: string[] = [
    'name', 
    'status', 
    'startTime', 
    'location', 
    'participants', 
    'attendance', 
    'actions'
  ];

  statusFilter = '';
  searchText = '';

  statusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'Draft', label: 'Nháp' },
    { value: 'Active', label: 'Đang diễn ra' },
    { value: 'Completed', label: 'Hoàn thành' },
    { value: 'Cancelled', label: 'Đã hủy' }
  ];

  constructor(
    private eventService: EventService,
    private authService: AuthService,
    private router: Router,
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

    this.loadEvents();
  }

  private loadEvents(): void {
    this.isLoading = true;
    
    // Load all events (in real app, filter by current manager)
    this.eventService.getEvents(1, 100).subscribe({
      next: (response) => {
        console.log('ManagerEvents: Events loaded', response);
        if (response.success && response.data) {
          this.events = response.data.events || [];
          this.applyFilters();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('ManagerEvents: Error loading events', error);
        this.snackBar.open('Có lỗi khi tải danh sách sự kiện', 'Đóng', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredEvents = this.events.filter(event => {
      const matchesStatus = !this.statusFilter || event.status === this.statusFilter;
      const matchesSearch = !this.searchText || 
        event.name.toLowerCase().includes(this.searchText.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(this.searchText.toLowerCase())) ||
        (event.locationName && event.locationName.toLowerCase().includes(this.searchText.toLowerCase()));
      
      return matchesStatus && matchesSearch;
    });
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  // Navigation methods
  goBack(): void {
    this.router.navigate(['/manager']);
  }

  createNewEvent(): void {
    this.router.navigate(['/manager/create-event']);
  }

  // Event actions
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

  viewParticipants(eventId: string): void {
    this.router.navigate(['/manager/events', eventId, 'participants']);
  }

  deleteEvent(eventId: string): void {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;
    
    const confirmDialog = confirm(`Bạn có chắc chắn muốn xóa sự kiện "${event.name}"?\n\nHành động này không thể hoàn tác!`);
    if (confirmDialog) {
      // TODO: Implement actual deletion logic
      this.snackBar.open('Chức năng xóa sự kiện đang phát triển', 'Đóng', {
        duration: 3000
      });
    }
  }

  // Utility methods
  getStatusColor(status: string): string {
    switch (status) {
      case 'Active': return 'primary';
      case 'Draft': return 'accent';
      case 'Completed': return 'basic';
      case 'Cancelled': return 'warn';
      default: return 'basic';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'Active': return 'Đang diễn ra';
      case 'Draft': return 'Nháp';
      case 'Completed': return 'Hoàn thành';
      case 'Cancelled': return 'Đã hủy';
      default: return status;
    }
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

  formatLocation(event: Event): string {
    if (event.locationName) {
      return event.locationName;
    }
    if (event.location?.latitude && event.location?.longitude) {
      return `${event.location.latitude.toFixed(4)}, ${event.location.longitude.toFixed(4)}`;
    }
    return 'Chưa xác định';
  }

  getParticipantCount(event: any): number {
    return event.participantCount || 0;
  }

  getAttendanceCount(event: any): number {
    return event.attendanceCount || 0;
  }

  getAttendanceRate(event: any): number {
    const participants = this.getParticipantCount(event);
    const attendance = this.getAttendanceCount(event);
    return participants > 0 ? Math.round((attendance / participants) * 100) : 0;
  }

  isEventActive(event: Event): boolean {
    const now = new Date();
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    return now >= startTime && now <= endTime && event.status === 'Active';
  }

  isEventUpcoming(event: Event): boolean {
    const now = new Date();
    const startTime = new Date(event.startTime);
    return now < startTime;
  }

  isEventPast(event: Event): boolean {
    const now = new Date();
    const endTime = new Date(event.endTime);
    return now > endTime;
  }
}
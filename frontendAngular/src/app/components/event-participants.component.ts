import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { EventService } from '../services/event.service';
import { AuthService } from '../services/auth.service';
import { Event } from '../models/api.models';

interface Participant {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
  invitedAt: string;
  status: 'Invited' | 'Confirmed' | 'Declined';
  attendanceStatus: 'Present' | 'Absent' | 'Late' | 'Pending';
  checkInTime?: string;
  checkInMethod?: string;
  gpsLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

@Component({
  selector: 'app-event-participants',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatTableModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    MatBadgeModule
  ],
  templateUrl: './event-participants.component.html',
  styleUrls: ['./event-participants.component.css']
})
export class EventParticipantsComponent implements OnInit {
  eventId: string = '';
  event: Event | null = null;
  participants: Participant[] = [];
  filteredParticipants: Participant[] = [];
  isLoading = true;
  
  displayedColumns: string[] = [
    'fullName', 
    'email', 
    'role',
    'invitationStatus',
    'attendanceStatus', 
    'checkInTime',
    'actions'
  ];

  // Filters
  attendanceFilter = '';
  invitationFilter = '';
  searchText = '';

  attendanceOptions = [
    { value: '', label: 'Tất cả trạng thái điểm danh' },
    { value: 'Present', label: 'Có mặt' },
    { value: 'Late', label: 'Muộn' },
    { value: 'Absent', label: 'Vắng mặt' },
    { value: 'Pending', label: 'Chưa điểm danh' }
  ];

  invitationOptions = [
    { value: '', label: 'Tất cả lời mời' },
    { value: 'Invited', label: 'Đã mời' },
    { value: 'Confirmed', label: 'Đã xác nhận' },
    { value: 'Declined', label: 'Từ chối' }
  ];

  // Stats
  stats = {
    total: 0,
    confirmed: 0,
    present: 0,
    late: 0,
    absent: 0,
    pending: 0
  };

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

    this.loadEventAndParticipants();
  }

  private loadEventAndParticipants(): void {
    this.isLoading = true;
    
    // Load event info
    this.eventService.getEvent(this.eventId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.event = response.data;
          this.loadParticipants();
        } else {
          this.showError('Không tìm thấy sự kiện');
          this.router.navigate(['/manager/events']);
        }
      },
      error: (error) => {
        console.error('Error loading event:', error);
        this.showError('Có lỗi khi tải thông tin sự kiện');
        this.isLoading = false;
      }
    });
  }

  private loadParticipants(): void {
    // Load participants from API
    this.eventService.getEventParticipants(this.eventId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.participants = response.data;
          this.applyFilters();
          this.updateStats();
        } else {
          this.participants = [];
          this.filteredParticipants = [];
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading participants:', error);
        this.participants = [];
        this.filteredParticipants = [];
        this.isLoading = false;
        this.snackBar.open('Không thể tải danh sách người tham gia', 'Đóng', { duration: 3000 });
      }
    });
  }



  applyFilters(): void {
    this.filteredParticipants = this.participants.filter(participant => {
      const matchesAttendance = !this.attendanceFilter || participant.attendanceStatus === this.attendanceFilter;
      const matchesInvitation = !this.invitationFilter || participant.status === this.invitationFilter;
      const matchesSearch = !this.searchText || 
        participant.fullName.toLowerCase().includes(this.searchText.toLowerCase()) ||
        participant.email.toLowerCase().includes(this.searchText.toLowerCase()) ||
        participant.role.toLowerCase().includes(this.searchText.toLowerCase());
      
      return matchesAttendance && matchesInvitation && matchesSearch;
    });
  }

  private updateStats(): void {
    this.stats.total = this.participants.length;
    this.stats.confirmed = this.participants.filter(p => p.status === 'Confirmed').length;
    this.stats.present = this.participants.filter(p => p.attendanceStatus === 'Present').length;
    this.stats.late = this.participants.filter(p => p.attendanceStatus === 'Late').length;
    this.stats.absent = this.participants.filter(p => p.attendanceStatus === 'Absent').length;
    this.stats.pending = this.participants.filter(p => p.attendanceStatus === 'Pending').length;
  }

  onAttendanceFilterChange(): void {
    this.applyFilters();
  }

  onInvitationFilterChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  // Navigation methods
  goBack(): void {
    this.router.navigate(['/manager/events']);
  }

  goToEventDetail(): void {
    this.router.navigate(['/manager/events', this.eventId]);
  }

  showQrCode(): void {
    this.router.navigate(['/manager/events', this.eventId, 'qr']);
  }

  // Participant actions
  resendInvitation(participant: Participant): void {
    this.snackBar.open(`Đã gửi lại lời mời cho ${participant.fullName}`, 'Đóng', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  markAsPresent(participant: Participant): void {
    participant.attendanceStatus = 'Present';
    participant.checkInTime = new Date().toISOString();
    participant.checkInMethod = 'MANUAL';
    this.updateStats();
    this.snackBar.open(`Đã đánh dấu ${participant.fullName} có mặt`, 'Đóng', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  markAsAbsent(participant: Participant): void {
    participant.attendanceStatus = 'Absent';
    participant.checkInTime = undefined;
    participant.checkInMethod = undefined;
    this.updateStats();
    this.snackBar.open(`Đã đánh dấu ${participant.fullName} vắng mặt`, 'Đóng', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  removeParticipant(participant: Participant): void {
    const index = this.participants.findIndex(p => p.id === participant.id);
    if (index > -1) {
      this.participants.splice(index, 1);
      this.applyFilters();
      this.updateStats();
      this.snackBar.open(`Đã xóa ${participant.fullName} khỏi danh sách`, 'Đóng', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    }
  }

  viewParticipantDetail(participant: Participant): void {
    // TODO: Implement participant detail view
    this.snackBar.open('Chức năng xem chi tiết đang phát triển', 'Đóng', {
      duration: 3000
    });
  }

  // Utility methods
  getInvitationStatusColor(status: string): string {
    switch (status) {
      case 'Confirmed': return 'primary';
      case 'Invited': return 'accent';
      case 'Declined': return 'warn';
      default: return 'basic';
    }
  }

  getInvitationStatusLabel(status: string): string {
    switch (status) {
      case 'Confirmed': return 'Đã xác nhận';
      case 'Invited': return 'Đã mời';
      case 'Declined': return 'Từ chối';
      default: return status;
    }
  }

  getAttendanceStatusColor(status: string): string {
    switch (status) {
      case 'Present': return 'primary';
      case 'Late': return 'accent';
      case 'Absent': return 'warn';
      case 'Pending': return 'basic';
      default: return 'basic';
    }
  }

  getAttendanceStatusLabel(status: string): string {
    switch (status) {
      case 'Present': return 'Có mặt';
      case 'Late': return 'Muộn';
      case 'Absent': return 'Vắng mặt';
      case 'Pending': return 'Chưa điểm danh';
      default: return status;
    }
  }

  getCheckInMethodLabel(method?: string): string {
    if (!method) return '-';
    switch (method) {
      case 'QR_WIFI': return 'QR + Wi-Fi';
      case 'QR_GPS': return 'QR + GPS';
      case 'MANUAL': return 'Thủ công';
      default: return method;
    }
  }

  formatDateTime(dateString?: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Đóng', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // Export functionality
  exportToCSV(): void {
    const csvData = this.generateCSVData();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `participants-${this.event?.name || 'event'}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.snackBar.open('Đã xuất danh sách ra file CSV', 'Đóng', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private generateCSVData(): string {
    const headers = ['Họ tên', 'Email', 'Vai trò', 'Trạng thái lời mời', 'Trạng thái điểm danh', 'Thời gian điểm danh', 'Phương thức'];
    const rows = this.filteredParticipants.map(p => [
      p.fullName,
      p.email,
      p.role,
      this.getInvitationStatusLabel(p.status),
      this.getAttendanceStatusLabel(p.attendanceStatus),
      this.formatDateTime(p.checkInTime),
      this.getCheckInMethodLabel(p.checkInMethod)
    ]);
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }
}
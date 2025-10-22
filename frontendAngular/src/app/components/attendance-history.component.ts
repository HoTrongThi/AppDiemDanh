import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { EventService } from '../services/event.service';
import { AuthService } from '../services/auth.service';
import { AttendanceService } from '../services/attendance.service';
import { User, AttendanceRecord } from '../models/api.models';

@Component({
  selector: 'app-attendance-history',
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
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './attendance-history.component.html',
  styleUrls: ['./attendance-history.component.css']
})
export class AttendanceHistoryComponent implements OnInit {
  currentUser: User | null = null;
  attendanceRecords: AttendanceRecord[] = [];
  filteredRecords: AttendanceRecord[] = [];
  isLoading = true;
  
  displayedColumns: string[] = [
    'eventName', 
    'eventDate', 
    'eventLocation',
    'status', 
    'checkInTime',
    'checkInMethod',
    'actions'
  ];

  // Filters
  statusFilter = '';
  searchText = '';
  startDate: Date | null = null;
  endDate: Date | null = null;

  statusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'Present', label: 'Có mặt' },
    { value: 'Late', label: 'Muộn' },
    { value: 'Absent', label: 'Vắng mặt' },
    { value: 'Pending', label: 'Chưa điểm danh' }
  ];

  // Stats
  stats = {
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    pending: 0,
    attendanceRate: 0
  };

  constructor(
    private eventService: EventService,
    private authService: AuthService,
    private attendanceService: AttendanceService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // Set default date range (last 3 months)
    this.endDate = new Date();
    this.startDate = new Date();
    this.startDate.setMonth(this.startDate.getMonth() - 3);

    this.loadAttendanceHistory();
  }

  private loadAttendanceHistory(): void {
    this.isLoading = true;
    
    // Load attendance history from API
    this.attendanceService.getUserAttendanceHistory(this.currentUser?.id, 1, 100).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.attendanceRecords = response.data.records;
          this.applyFilters();
          this.updateStats();
        } else {
          this.attendanceRecords = [];
          this.filteredRecords = [];
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading attendance history:', error);
        this.attendanceRecords = [];
        this.filteredRecords = [];
        this.isLoading = false;
        this.snackBar.open('Không thể tải lịch sử điểm danh', 'Đóng', { duration: 3000 });
      }
    });
  }



  applyFilters(): void {
    this.filteredRecords = this.attendanceRecords.filter(record => {
      const matchesStatus = !this.statusFilter || record.status === this.statusFilter;
      const matchesSearch = !this.searchText || 
        (record.eventName && record.eventName.toLowerCase().includes(this.searchText.toLowerCase())) ||
        (record.eventLocation && record.eventLocation.toLowerCase().includes(this.searchText.toLowerCase()));
      
      let matchesDate = true;
      if (this.startDate || this.endDate) {
        const recordDate = new Date(record.eventDate || record.timestamp);
        if (this.startDate) {
          matchesDate = matchesDate && recordDate >= this.startDate;
        }
        if (this.endDate) {
          matchesDate = matchesDate && recordDate <= this.endDate;
        }
      }
      
      return matchesStatus && matchesSearch && matchesDate;
    });
  }

  private updateStats(): void {
    this.stats.total = this.attendanceRecords.length;
    this.stats.present = this.attendanceRecords.filter(r => r.status === 'Present').length;
    this.stats.late = this.attendanceRecords.filter(r => r.status === 'Late').length;
    this.stats.absent = this.attendanceRecords.filter(r => r.status === 'Absent').length;
    this.stats.pending = this.attendanceRecords.filter(r => r.status === 'Pending').length;
    
    const attendedEvents = this.stats.present + this.stats.late;
    this.stats.attendanceRate = this.stats.total > 0 ? 
      Math.round((attendedEvents / this.stats.total) * 100) : 0;
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onDateRangeChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.searchText = '';
    this.startDate = new Date();
    this.startDate.setMonth(this.startDate.getMonth() - 3);
    this.endDate = new Date();
    this.applyFilters();
  }

  // Navigation methods
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  viewEventDetail(record: AttendanceRecord): void {
    // TODO: Navigate to event detail if user has permission
    this.snackBar.open('Chức năng xem chi tiết sự kiện đang phát triển', 'Đóng', {
      duration: 3000
    });
  }

  // Utility methods
  getStatusColor(status: string): string {
    switch (status) {
      case 'Present': return 'primary';
      case 'Late': return 'accent';
      case 'Absent': return 'warn';
      case 'Pending': return 'basic';
      default: return 'basic';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'Present': return 'Có mặt';
      case 'Late': return 'Muộn';
      case 'Absent': return 'Vắng mặt';
      case 'Pending': return 'Chưa điểm danh';
      default: return status;
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Present': return 'check_circle';
      case 'Late': return 'schedule';
      case 'Absent': return 'cancel';
      case 'Pending': return 'pending';
      default: return 'help';
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

  getCheckInMethodIcon(method?: string): string {
    if (!method) return '';
    switch (method) {
      case 'QR_WIFI': return 'wifi';
      case 'QR_GPS': return 'location_on';
      case 'MANUAL': return 'edit';
      default: return 'help';
    }
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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

  formatTime(dateString?: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isLateCheckIn(record: AttendanceRecord): boolean {
    return record.status === 'Late';
  }

  hasGpsLocation(record: AttendanceRecord): boolean {
    return !!record.gpsLocation;
  }

  // Export functionality
  exportToCSV(): void {
    const csvData = this.generateCSVData();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance-history-${this.currentUser?.username}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.snackBar.open('Đã xuất lịch sử điểm danh ra file CSV', 'Đóng', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private generateCSVData(): string {
    const headers = ['Tên sự kiện', 'Ngày', 'Địa điểm', 'Trạng thái', 'Thời gian điểm danh', 'Phương thức', 'Ghi chú'];
    const rows = this.filteredRecords.map(r => [
      r.eventName || '',
      this.formatDate(r.eventDate || r.timestamp),
      r.eventLocation || '',
      this.getStatusLabel(r.status),
      this.formatDateTime(r.checkInTime),
      this.getCheckInMethodLabel(r.checkInMethod),
      r.notes || ''
    ]);
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EventService } from '../services/event.service';
import { Event, AttendanceRecord } from '../models/api.models';

@Component({
  selector: 'app-event-attendance',
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
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './event-attendance.component.html',
  styleUrls: ['./event-attendance.component.css']
})
export class EventAttendanceComponent implements OnInit {
  event: Event | null = null;
  attendanceRecords: AttendanceRecord[] = [];
  filteredRecords: AttendanceRecord[] = [];
  isLoading = true;
  eventId: string = '';
  
  // Filters
  searchText = '';
  statusFilter = '';
  methodFilter = '';
  
  // Table
  displayedColumns: string[] = ['userName', 'status', 'checkInMethod', 'timestamp', 'location'];
  
  // Filter options
  statusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'Present', label: 'Có mặt' },
    { value: 'Late', label: 'Muộn' },
    { value: 'Absent', label: 'Vắng mặt' },
    { value: 'PendingVerification', label: 'Chờ xác nhận' }
  ];
  
  methodOptions = [
    { value: '', label: 'Tất cả phương thức' },
    { value: 'QrCodeWifi', label: 'QR + WiFi' },
    { value: 'QrCodeGps', label: 'QR + GPS' },
    { value: 'Manual', label: 'Thủ công' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.eventId = this.route.snapshot.params['id'];
    if (this.eventId) {
      this.loadEventAndAttendance();
    }
  }

  loadEventAndAttendance(): void {
    this.isLoading = true;
    this.eventService.getEvent(this.eventId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.event = response.data;
          // Load attendance data from API
          this.loadAttendanceData();
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

  loadAttendanceData(): void {
    // Load attendance data from API
    this.eventService.getEventAttendance(this.eventId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.attendanceRecords = response.data;
          this.applyFilters();
        } else {
          this.attendanceRecords = [];
          this.filteredRecords = [];
        }
      },
      error: (error) => {
        console.error('Error loading attendance data:', error);
        this.attendanceRecords = [];
        this.filteredRecords = [];
        this.snackBar.open('Không thể tải dữ liệu điểm danh', 'Đóng', { duration: 3000 });
      }
    });
  }

  applyFilters(): void {
    this.filteredRecords = this.attendanceRecords.filter(record => {
      const matchesSearch = !this.searchText || 
        (record.userName && record.userName.toLowerCase().includes(this.searchText.toLowerCase()));
      const matchesStatus = !this.statusFilter || record.status === this.statusFilter;
      const matchesMethod = !this.methodFilter || record.checkInMethod === this.methodFilter;
      
      return matchesSearch && matchesStatus && matchesMethod;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  onMethodFilterChange(): void {
    this.applyFilters();
  }

  goBack(): void {
    this.router.navigate(['/manager/events', this.eventId]);
  }

  exportAttendance(): void {
    if (this.filteredRecords.length === 0) {
      this.snackBar.open('Không có dữ liệu để xuất', 'Đóng', { duration: 3000 });
      return;
    }

    const csvContent = this.generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `diem-danh-${this.event?.name || 'event'}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.snackBar.open('Đã xuất file CSV thành công', 'Đóng', { duration: 3000 });
    }
  }

  private generateCSV(): string {
    const headers = ['Họ tên', 'Trạng thái', 'Phương thức', 'Thời gian', 'Độ chính xác GPS (m)'];
    const rows = this.filteredRecords.map(record => [
      record.userName || 'Không xác định',
      this.getStatusLabel(record.status),
      this.getMethodLabel(record.checkInMethod),
      this.formatDateTime(record.timestamp),
      record.gpsAccuracyMeters?.toString() || 'N/A'
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field || ''}"`).join(','))
      .join('\n');
    
    return '\uFEFF' + csvContent; // Add BOM for UTF-8
  }

  // Utility methods
  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'Present': return 'Có mặt';
      case 'Late': return 'Muộn';
      case 'Absent': return 'Vắng mặt';
      case 'PendingVerification': return 'Chờ xác nhận';
      default: return status;
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Present': return 'primary';
      case 'Late': return 'accent';
      case 'Absent': return 'warn';
      case 'PendingVerification': return '';
      default: return '';
    }
  }

  getMethodLabel(method: string): string {
    switch (method) {
      case 'QrCodeWifi': return 'QR + WiFi';
      case 'QrCodeGps': return 'QR + GPS';
      case 'Manual': return 'Thủ công';
      default: return method;
    }
  }

  getMethodIcon(method: string): string {
    switch (method) {
      case 'QrCodeWifi': return 'wifi';
      case 'QrCodeGps': return 'gps_fixed';
      case 'Manual': return 'edit';
      default: return 'help';
    }
  }

  // Statistics
  getTotalCount(): number {
    return this.attendanceRecords.length;
  }

  getPresentCount(): number {
    return this.attendanceRecords.filter(r => r.status === 'Present').length;
  }

  getLateCount(): number {
    return this.attendanceRecords.filter(r => r.status === 'Late').length;
  }

  getAbsentCount(): number {
    return this.attendanceRecords.filter(r => r.status === 'Absent').length;
  }

  getPendingCount(): number {
    return this.attendanceRecords.filter(r => r.status === 'PendingVerification').length;
  }

  getAttendanceRate(): number {
    const total = this.getTotalCount();
    if (total === 0) return 0;
    const attended = this.getPresentCount() + this.getLateCount();
    return Math.round((attended / total) * 100);
  }
}
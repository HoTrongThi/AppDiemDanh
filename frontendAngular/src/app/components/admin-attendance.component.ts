import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { Router } from '@angular/router';
import { AdminService } from '../services/admin.service';

interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  eventId: string;
  eventName: string;
  status: string;
  checkInMethod: string;
  timestamp: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracyMeters?: number;
  verifiedBy?: string;
  verificationNotes?: string;
  deviceInfo?: any;
  metadata?: any;
}

interface PendingStats {
  total: number;
  wifi: number;
  gps: number;
  manual: number;
}

@Component({
  selector: 'app-admin-attendance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatBadgeModule
  ],
  templateUrl: './admin-attendance.component.html',
  styleUrls: ['./admin-attendance.component.css']
})
export class AdminAttendanceComponent implements OnInit {
  // Data
  pendingRecords: AttendanceRecord[] = [];
  allRecords: AttendanceRecord[] = [];
  
  // Pagination
  totalRecords = 0;
  pageSize = 10;
  currentPage = 1;
  
  // Filters
  statusFilter = 'PendingVerification';
  checkInMethodFilter = '';
  searchQuery = '';
  selectedEventId = '';
  
  // Events for filter
  events: any[] = [];
  
  // Stats
  stats: PendingStats = {
    total: 0,
    wifi: 0,
    gps: 0,
    manual: 0
  };
  
  // UI State
  loading = false;
  displayedColumns: string[] = [
    'userName',
    'eventName',
    'checkInMethod',
    'timestamp',
    'gpsInfo',
    'status',
    'actions'
  ];

  constructor(
    private adminService: AdminService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadEvents();
    this.loadPendingRecords();
    this.loadStats();
  }

  loadEvents(): void {
    this.adminService.getAdminEvents(1, 1000)
      .subscribe({
        next: (response) => {
          if (response.success && response.data?.events) {
            this.events = response.data.events;
          }
        },
        error: (error) => {
          console.error('Error loading events:', error);
        }
      });
  }

  loadPendingRecords(): void {
    this.loading = true;

    this.adminService.getPendingAttendance(
      this.currentPage,
      this.pageSize,
      this.statusFilter,
      this.checkInMethodFilter,
      this.searchQuery,
      this.selectedEventId
    ).subscribe({
      next: (response) => {
        this.loading = false;
        
        if (response.success) {
          this.pendingRecords = this.mapRecords(response.data?.records || response.data || []);
          this.totalRecords = response.data?.pagination?.totalCount || this.pendingRecords.length;
        } else {
          this.showError('Không thể tải danh sách điểm danh');
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading pending records:', error);
        this.showError('Lỗi khi tải danh sách điểm danh');
      }
    });
  }

  loadStats(): void {
    this.adminService.getAttendanceStats()
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.stats = {
              total: response.data.totalPending || 0,
              wifi: response.data.wifiPending || 0,
              gps: response.data.gpsPending || 0,
              manual: response.data.manualPending || 0
            };
          }
        },
        error: (error) => {
          console.error('Error loading stats:', error);
        }
      });
  }

  mapRecords(records: any[]): AttendanceRecord[] {
    return records.map(record => ({
      id: record.id || record.Id,
      userId: record.userId || record.UserId,
      userName: record.userName || record.UserName || 'N/A',
      userEmail: record.userEmail || record.UserEmail || '',
      eventId: record.eventId || record.EventId,
      eventName: record.eventName || record.EventName || 'N/A',
      status: record.status || record.Status,
      checkInMethod: record.checkInMethod || record.CheckInMethod,
      timestamp: record.timestamp || record.Timestamp,
      gpsLatitude: record.gpsLatitude || record.GpsLatitude,
      gpsLongitude: record.gpsLongitude || record.GpsLongitude,
      gpsAccuracyMeters: record.gpsAccuracyMeters || record.GpsAccuracyMeters,
      verifiedBy: record.verifiedBy || record.VerifiedBy,
      verificationNotes: record.verificationNotes || record.VerificationNotes,
      deviceInfo: record.deviceInfo || record.DeviceInfo,
      metadata: record.metadata || record.Metadata
    }));
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadPendingRecords();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadPendingRecords();
  }

  clearFilters(): void {
    this.statusFilter = 'PendingVerification';
    this.checkInMethodFilter = '';
    this.searchQuery = '';
    this.selectedEventId = '';
    this.currentPage = 1;
    this.loadPendingRecords();
  }

  verifyAttendance(record: AttendanceRecord, status: 'Present' | 'Absent', notes?: string): void {
    const dialogRef = this.dialog.open(VerifyAttendanceDialog, {
      width: '500px',
      data: { record, status, notes }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.performVerification(record.id, result.status, result.notes);
      }
    });
  }

  performVerification(attendanceId: string, status: string, notes?: string): void {
    this.loading = true;

    this.adminService.verifyAttendance(attendanceId, status, notes)
      .subscribe({
        next: (response) => {
          this.loading = false;
          
          if (response.success) {
            this.showSuccess(`Đã xác thực điểm danh: ${status}`);
            this.loadPendingRecords();
            this.loadStats();
          } else {
            this.showError(response.message || 'Không thể xác thực điểm danh');
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error verifying attendance:', error);
          this.showError('Lỗi khi xác thực điểm danh');
        }
      });
  }

  viewDetails(record: AttendanceRecord): void {
    this.dialog.open(AttendanceDetailsDialog, {
      width: '700px',
      data: record
    });
  }

  viewOnMap(record: AttendanceRecord): void {
    if (record.gpsLatitude && record.gpsLongitude) {
      const url = `https://www.google.com/maps?q=${record.gpsLatitude},${record.gpsLongitude}`;
      window.open(url, '_blank');
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Present': return 'primary';
      case 'Late': return 'accent';
      case 'Absent': return 'warn';
      case 'PendingVerification': return 'warn';
      default: return '';
    }
  }

  getMethodIcon(method: string): string {
    switch (method) {
      case 'WiFi': return 'wifi';
      case 'GPS': return 'location_on';
      case 'Manual': return 'edit';
      case 'Admin': return 'admin_panel_settings';
      default: return 'help';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'Present': return 'Có mặt';
      case 'Late': return 'Muộn';
      case 'Absent': return 'Vắng';
      case 'PendingVerification': return 'Chờ xác thực';
      default: return status;
    }
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString('vi-VN');
  }

  showSuccess(message: string): void {
    this.snackBar.open(message, 'Đóng', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Đóng', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}

// Verify Attendance Dialog Component
@Component({
  selector: 'verify-attendance-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>Xác thực điểm danh</h2>
    <mat-dialog-content>
      <p><strong>Người dùng:</strong> {{ data.record.userName }}</p>
      <p><strong>Sự kiện:</strong> {{ data.record.eventName }}</p>
      <p><strong>Phương thức:</strong> {{ data.record.checkInMethod }}</p>
      <p><strong>Thời gian:</strong> {{ formatTime(data.record.timestamp) }}</p>
      
      <mat-form-field appearance="outline" style="width: 100%; margin-top: 16px;">
        <mat-label>Trạng thái</mat-label>
        <mat-select [(ngModel)]="status" required>
          <mat-option value="Present">Có mặt</mat-option>
          <mat-option value="Late">Muộn</mat-option>
          <mat-option value="Absent">Vắng</mat-option>
        </mat-select>
      </mat-form-field>
      
      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Ghi chú (tùy chọn)</mat-label>
        <textarea matInput [(ngModel)]="notes" rows="3" placeholder="Nhập ghi chú..."></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Hủy</button>
      <button mat-raised-button color="primary" (click)="onConfirm()" [disabled]="!status">
        Xác nhận
      </button>
    </mat-dialog-actions>
  `
})
export class VerifyAttendanceDialog {
  status: string;
  notes: string = '';

  constructor(
    public dialogRef: MatDialogRef<VerifyAttendanceDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.status = data.status || 'Present';
    this.notes = data.notes || '';
  }

  formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString('vi-VN');
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.dialogRef.close({ status: this.status, notes: this.notes });
  }
}

// Attendance Details Dialog Component
@Component({
  selector: 'attendance-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>info</mat-icon>
      Chi tiết điểm danh
    </h2>
    <mat-dialog-content>
      <div class="detail-section">
        <h3>Thông tin người dùng</h3>
        <p><strong>Tên:</strong> {{ data.userName }}</p>
        <p><strong>Email:</strong> {{ data.userEmail }}</p>
      </div>
      
      <div class="detail-section">
        <h3>Thông tin sự kiện</h3>
        <p><strong>Sự kiện:</strong> {{ data.eventName }}</p>
        <p><strong>Thời gian check-in:</strong> {{ formatTime(data.timestamp) }}</p>
      </div>
      
      <div class="detail-section">
        <h3>Phương thức điểm danh</h3>
        <mat-chip-set>
          <mat-chip [color]="getMethodColor(data.checkInMethod)">
            {{ data.checkInMethod }}
          </mat-chip>
        </mat-chip-set>
      </div>
      
      <div class="detail-section" *ngIf="data.gpsLatitude && data.gpsLongitude">
        <h3>Thông tin GPS</h3>
        <p><strong>Vĩ độ:</strong> {{ data.gpsLatitude }}</p>
        <p><strong>Kinh độ:</strong> {{ data.gpsLongitude }}</p>
        <p><strong>Độ chính xác:</strong> {{ data.gpsAccuracyMeters }} mét</p>
        <button mat-stroked-button color="primary" (click)="viewOnMap()">
          <mat-icon>map</mat-icon>
          Xem trên bản đồ
        </button>
      </div>
      
      <div class="detail-section" *ngIf="data.deviceInfo">
        <h3>Thông tin thiết bị</h3>
        <pre>{{ formatJson(data.deviceInfo) }}</pre>
      </div>
      
      <div class="detail-section" *ngIf="data.verificationNotes">
        <h3>Ghi chú xác thực</h3>
        <p>{{ data.verificationNotes }}</p>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" (click)="onClose()">Đóng</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .detail-section {
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .detail-section:last-child {
      border-bottom: none;
    }
    
    .detail-section h3 {
      margin-top: 0;
      color: #1976d2;
      font-size: 16px;
    }
    
    .detail-section p {
      margin: 8px 0;
    }
    
    pre {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
    }
  `]
})
export class AttendanceDetailsDialog {
  constructor(
    public dialogRef: MatDialogRef<AttendanceDetailsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: AttendanceRecord
  ) {}

  formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString('vi-VN');
  }

  formatJson(obj: any): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }

  getMethodColor(method: string): string {
    switch (method) {
      case 'WiFi': return 'primary';
      case 'GPS': return 'accent';
      default: return '';
    }
  }

  viewOnMap(): void {
    if (this.data.gpsLatitude && this.data.gpsLongitude) {
      const url = `https://www.google.com/maps?q=${this.data.gpsLatitude},${this.data.gpsLongitude}`;
      window.open(url, '_blank');
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}

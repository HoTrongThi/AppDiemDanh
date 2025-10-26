import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './admin-stats.component.html',
  styleUrls: ['./admin-stats.component.css']
})
export class AdminStatsComponent implements OnInit {
  // Date range
  startDate: Date;
  endDate: Date;
  
  // Loading states
  loadingOverview = false;
  loadingOrganizations = false;
  loadingEvents = false;
  loadingPerformers = false;
  
  // Overview stats
  overviewStats: any = null;
  
  // Organization stats
  organizationStats: any[] = [];
  orgDisplayedColumns = ['name', 'type', 'members', 'attendance', 'rate'];
  
  // Event stats
  eventStats: any[] = [];
  eventDisplayedColumns = ['name', 'date', 'participants', 'present', 'late', 'rate'];
  
  // Top performers
  topPerformers: any[] = [];
  performersDisplayedColumns = ['rank', 'name', 'email', 'total', 'present', 'rate'];
  
  // Poor attendance
  poorPerformers: any[] = [];
  poorDisplayedColumns = ['rank', 'name', 'email', 'total', 'absent', 'rate'];
  
  // Trends
  trends: any[] = [];
  groupBy = 'day';

  constructor(
    private router: Router,
    private adminService: AdminService,
    private snackBar: MatSnackBar
  ) {
    // Default to last 30 days
    this.endDate = new Date();
    this.startDate = new Date();
    this.startDate.setDate(this.startDate.getDate() - 30);
  }

  ngOnInit(): void {
    this.loadAllStats();
  }

  loadAllStats(): void {
    this.loadOverviewStats();
    this.loadOrganizationStats();
    this.loadEventStats();
    this.loadTopPerformers();
    this.loadPoorPerformers();
  }

  loadOverviewStats(): void {
    this.loadingOverview = true;
    
    this.adminService.getOverviewStats(
      this.startDate.toISOString(),
      this.endDate.toISOString()
    ).subscribe({
      next: (response) => {
        this.loadingOverview = false;
        if (response.success) {
          this.overviewStats = response.data;
        }
      },
      error: (error) => {
        this.loadingOverview = false;
        console.error('Error loading overview stats:', error);
        this.showError('Không thể tải thống kê tổng quan');
      }
    });
  }

  loadOrganizationStats(): void {
    this.loadingOrganizations = true;
    
    this.adminService.getStatsByOrganization(
      this.startDate.toISOString(),
      this.endDate.toISOString()
    ).subscribe({
      next: (response) => {
        this.loadingOrganizations = false;
        if (response.success) {
          this.organizationStats = response.data.organizations || [];
        }
      },
      error: (error) => {
        this.loadingOrganizations = false;
        console.error('Error loading organization stats:', error);
        this.showError('Không thể tải thống kê đơn vị');
      }
    });
  }

  loadEventStats(): void {
    this.loadingEvents = true;
    
    this.adminService.getStatsByEvent(
      this.startDate.toISOString(),
      this.endDate.toISOString()
    ).subscribe({
      next: (response) => {
        this.loadingEvents = false;
        if (response.success) {
          this.eventStats = response.data.events || [];
        }
      },
      error: (error) => {
        this.loadingEvents = false;
        console.error('Error loading event stats:', error);
        this.showError('Không thể tải thống kê sự kiện');
      }
    });
  }

  loadTopPerformers(): void {
    this.loadingPerformers = true;
    
    this.adminService.getTopPerformers(
      this.startDate.toISOString(),
      this.endDate.toISOString(),
      10
    ).subscribe({
      next: (response) => {
        this.loadingPerformers = false;
        if (response.success) {
          this.topPerformers = response.data.topPerformers || [];
        }
      },
      error: (error) => {
        this.loadingPerformers = false;
        console.error('Error loading top performers:', error);
      }
    });
  }

  loadPoorPerformers(): void {
    this.adminService.getPoorAttendance(
      this.startDate.toISOString(),
      this.endDate.toISOString(),
      10,
      50
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.poorPerformers = response.data.poorPerformers || [];
        }
      },
      error: (error) => {
        console.error('Error loading poor performers:', error);
      }
    });
  }

  applyDateFilter(): void {
    this.loadAllStats();
  }

  resetDateFilter(): void {
    this.endDate = new Date();
    this.startDate = new Date();
    this.startDate.setDate(this.startDate.getDate() - 30);
    this.loadAllStats();
  }

  exportReport(type: string): void {
    this.adminService.getExportData(
      type,
      this.startDate.toISOString(),
      this.endDate.toISOString()
    ).subscribe({
      next: (response) => {
        if (response.success) {
          // Convert to CSV and download
          this.downloadCSV(response.data.data, `${type}_report_${Date.now()}.csv`);
          this.showSuccess('Đã xuất báo cáo thành công');
        }
      },
      error: (error) => {
        console.error('Error exporting report:', error);
        this.showError('Không thể xuất báo cáo');
      }
    });
  }

  downloadCSV(data: any[], filename: string): void {
    if (!data || data.length === 0) {
      this.showError('Không có dữ liệu để xuất');
      return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    let csv = headers.join(',') + '\n';
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Handle values with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csv += values.join(',') + '\n';
    });

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('vi-VN');
  }

  formatDateTime(date: string | Date): string {
    return new Date(date).toLocaleString('vi-VN');
  }

  getAttendanceRateColor(rate: number): string {
    if (rate >= 80) return 'success';
    if (rate >= 60) return 'warning';
    return 'danger';
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

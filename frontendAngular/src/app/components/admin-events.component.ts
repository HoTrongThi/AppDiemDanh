import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-admin-events',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div style="padding: 24px; max-width: 1400px; margin: 0 auto;">
      <mat-card style="margin-bottom: 24px;">
        <mat-card-header style="display: flex; align-items: center; padding: 16px;">
          <mat-card-title style="display: flex; align-items: center; gap: 12px; margin: 0;">
            <button mat-icon-button (click)="goBack()">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <mat-icon>event</mat-icon>
            <span>Quản lý Events</span>
          </mat-card-title>
        </mat-card-header>
      </mat-card>

      <mat-card>
        <mat-card-content>
          <div *ngIf="isLoading" style="text-align: center; padding: 60px;">
            <mat-spinner diameter="40" style="margin: 0 auto;"></mat-spinner>
            <p>Đang tải...</p>
          </div>

          <div *ngIf="!isLoading && events.length === 0" style="text-align: center; padding: 60px; color: #999;">
            <mat-icon style="font-size: 80px; width: 80px; height: 80px; opacity: 0.5;">event_busy</mat-icon>
            <h3>Chưa có sự kiện nào</h3>
          </div>

          <div *ngIf="!isLoading && events.length > 0">
            <table mat-table [dataSource]="events" style="width: 100%;">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Tên sự kiện</th>
                <td mat-cell *matCellDef="let event">
                  <strong>{{ event.name }}</strong>
                  <div style="font-size: 12px; color: #666;">{{ event.location }}</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="time">
                <th mat-header-cell *matHeaderCellDef>Thời gian</th>
                <td mat-cell *matCellDef="let event">
                  <div>{{ formatDate(event.startTime) }}</div>
                  <div style="font-size: 12px; color: #666;">đến {{ formatDate(event.endTime) }}</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="creator">
                <th mat-header-cell *matHeaderCellDef>Người tạo</th>
                <td mat-cell *matCellDef="let event">{{ event.creator?.fullName }}</td>
              </ng-container>

              <ng-container matColumnDef="participants">
                <th mat-header-cell *matHeaderCellDef>Tham gia</th>
                <td mat-cell *matCellDef="let event">
                  {{ event.attendanceCount || 0 }} / {{ event.participantCount || 0 }}
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
                <td mat-cell *matCellDef="let event">
                  <mat-chip [style.background-color]="getStatusColor(event.status)" style="color: white;">
                    {{ getStatusLabel(event.status) }}
                  </mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Thao tác</th>
                <td mat-cell *matCellDef="let event">
                  <button mat-icon-button color="warn" (click)="deleteEvent(event)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            <mat-paginator 
              [length]="totalCount"
              [pageSize]="pageSize"
              [pageSizeOptions]="[10, 25, 50]"
              [pageIndex]="page - 1"
              (page)="onPageChange($event)">
            </mat-paginator>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class AdminEventsComponent implements OnInit {
  displayedColumns = ['name', 'time', 'creator', 'participants', 'status', 'actions'];
  events: any[] = [];
  totalCount = 0;
  page = 1;
  pageSize = 10;
  isLoading = false;

  constructor(
    private adminService: AdminService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.isLoading = true;
    this.adminService.getAdminEvents(this.page, this.pageSize).subscribe({
      next: (response) => {
        if (response.success) {
          this.events = response.data.events;
          this.totalCount = response.data.totalCount;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error:', error);
        this.snackBar.open('Lỗi khi tải events', 'Đóng', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadEvents();
  }

  deleteEvent(event: any): void {
    if (confirm(`Xóa sự kiện "${event.name}"?`)) {
      this.adminService.deleteAdminEvent(event.id).subscribe({
        next: () => {
          this.snackBar.open('Đã xóa sự kiện', 'Đóng', { duration: 3000 });
          this.loadEvents();
        },
        error: (error) => {
          this.snackBar.open('Lỗi khi xóa', 'Đóng', { duration: 3000 });
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }

  formatDate(date: any): string {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      'Draft': 'Nháp',
      'Active': 'Đang diễn ra',
      'Completed': 'Đã kết thúc',
      'Cancelled': 'Đã hủy'
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: any = {
      'Draft': '#9e9e9e',
      'Active': '#4caf50',
      'Completed': '#2196f3',
      'Cancelled': '#f44336'
    };
    return colors[status] || '#9e9e9e';
  }
}

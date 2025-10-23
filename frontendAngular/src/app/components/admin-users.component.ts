import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminService, AdminUser, Role } from '../services/admin.service';
import { AdminUserDialogComponent } from './admin-user-dialog.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent implements OnInit {
  displayedColumns: string[] = ['username', 'fullName', 'email', 'role', 'status', 'lastLogin', 'actions'];
  users: AdminUser[] = [];
  roles: Role[] = [];
  
  // Pagination
  totalCount = 0;
  page = 1;
  pageSize = 10;
  
  // Filters
  searchText = '';
  roleFilter = '';
  statusFilter: boolean | undefined = undefined;
  
  isLoading = false;

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
  }

  loadRoles(): void {
    this.adminService.getRoles().subscribe({
      next: (response) => {
        if (response.success) {
          this.roles = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading roles:', error);
      }
    });
  }

  loadUsers(): void {
    this.isLoading = true;
    
    console.log('Loading users with params:', {
      page: this.page,
      pageSize: this.pageSize,
      search: this.searchText,
      roleFilter: this.roleFilter,
      statusFilter: this.statusFilter
    });
    
    this.adminService.getUsers(
      this.page,
      this.pageSize,
      this.searchText || undefined,
      this.roleFilter || undefined,
      this.statusFilter
    ).subscribe({
      next: (response) => {
        console.log('API Response:', response);
        if (response.success) {
          this.users = response.data.users;
          this.totalCount = response.data.totalCount;
          console.log('Loaded users:', this.users);
          console.log('Total count:', this.totalCount);
        } else {
          console.error('API returned success=false:', response);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        console.error('Error details:', error.error);
        this.snackBar.open('Lỗi khi tải danh sách users', 'Đóng', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadUsers();
  }

  onSearch(): void {
    this.page = 1; // Reset to first page
    this.loadUsers();
  }

  onFilterChange(): void {
    this.page = 1; // Reset to first page
    this.loadUsers();
  }

  clearFilters(): void {
    this.searchText = '';
    this.roleFilter = '';
    this.statusFilter = undefined;
    this.page = 1;
    this.loadUsers();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(AdminUserDialogComponent, {
      width: '550px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      autoFocus: false,
      data: { mode: 'create', roles: this.roles }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createUser(result);
      }
    });
  }

  openEditDialog(user: AdminUser): void {
    const dialogRef = this.dialog.open(AdminUserDialogComponent, {
      width: '550px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      autoFocus: false,
      data: { mode: 'edit', user: user, roles: this.roles }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateUser(user.id, result);
      }
    });
  }

  createUser(userData: any): void {
    this.adminService.createUser(userData).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Tạo user thành công!', 'Đóng', { duration: 3000 });
          this.loadUsers();
        }
      },
      error: (error) => {
        console.error('Error creating user:', error);
        const message = error.error?.message || 'Lỗi khi tạo user';
        this.snackBar.open(message, 'Đóng', { duration: 3000 });
      }
    });
  }

  updateUser(id: string, userData: any): void {
    this.adminService.updateUser(id, userData).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Cập nhật user thành công!', 'Đóng', { duration: 3000 });
          this.loadUsers();
        }
      },
      error: (error) => {
        console.error('Error updating user:', error);
        const message = error.error?.message || 'Lỗi khi cập nhật user';
        this.snackBar.open(message, 'Đóng', { duration: 3000 });
      }
    });
  }

  toggleUserStatus(user: AdminUser): void {
    const newStatus = !user.isActive;
    const action = newStatus ? 'kích hoạt' : 'vô hiệu hóa';
    
    if (confirm(`Bạn có chắc muốn ${action} user "${user.username}"?`)) {
      this.adminService.updateUser(user.id, { isActive: newStatus }).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open(`${action.charAt(0).toUpperCase() + action.slice(1)} user thành công!`, 'Đóng', { duration: 3000 });
            this.loadUsers();
          }
        },
        error: (error) => {
          console.error('Error toggling user status:', error);
          this.snackBar.open(`Lỗi khi ${action} user`, 'Đóng', { duration: 3000 });
        }
      });
    }
  }

  deleteUser(user: AdminUser): void {
    if (confirm(`Bạn có chắc muốn XÓA user "${user.username}"? Hành động này không thể hoàn tác!`)) {
      this.adminService.deleteUser(user.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('Xóa user thành công!', 'Đóng', { duration: 3000 });
            this.loadUsers();
          }
        },
        error: (error) => {
          console.error('Error deleting user:', error);
          const message = error.error?.message || 'Lỗi khi xóa user';
          this.snackBar.open(message, 'Đóng', { duration: 3000 });
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'Chưa đăng nhập';
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

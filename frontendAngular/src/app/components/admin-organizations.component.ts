import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminService } from '../services/admin.service';
import { AdminOrganizationDialogComponent } from './admin-organization-dialog.component';

@Component({
  selector: 'app-admin-organizations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './admin-organizations.component.html',
  styleUrls: ['./admin-organizations.component.css']
})
export class AdminOrganizationsComponent implements OnInit {
  displayedColumns: string[] = ['name', 'type', 'code', 'parent', 'members', 'status', 'actions'];
  organizations: any[] = [];
  
  searchText = '';
  typeFilter = '';
  statusFilter: boolean | undefined = undefined;
  
  isLoading = false;

  organizationTypes = [
    { value: 'Faculty', label: 'Khoa' },
    { value: 'Department', label: 'Phòng ban' },
    { value: 'Class', label: 'Lớp học' },
    { value: 'Group', label: 'Nhóm' },
    { value: 'Other', label: 'Khác' }
  ];

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOrganizations();
  }

  loadOrganizations(): void {
    this.isLoading = true;
    
    this.adminService.getOrganizations().subscribe({
      next: (response) => {
        if (response.success) {
          this.organizations = response.data;
          this.applyFilters();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading organizations:', error);
        this.snackBar.open('Lỗi khi tải danh sách đơn vị', 'Đóng', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    // Client-side filtering
    let filtered = [...this.organizations];

    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(org =>
        org.name.toLowerCase().includes(search) ||
        (org.code && org.code.toLowerCase().includes(search))
      );
    }

    if (this.typeFilter) {
      filtered = filtered.filter(org => org.type === this.typeFilter);
    }

    if (this.statusFilter !== undefined) {
      filtered = filtered.filter(org => org.isActive === this.statusFilter);
    }

    this.organizations = filtered;
  }

  onSearch(): void {
    this.loadOrganizations();
  }

  clearFilters(): void {
    this.searchText = '';
    this.typeFilter = '';
    this.statusFilter = undefined;
    this.loadOrganizations();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(AdminOrganizationDialogComponent, {
      width: '550px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      autoFocus: false,
      data: { mode: 'create', organizations: this.organizations }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createOrganization(result);
      }
    });
  }

  openEditDialog(org: any): void {
    const dialogRef = this.dialog.open(AdminOrganizationDialogComponent, {
      width: '550px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      autoFocus: false,
      data: { mode: 'edit', organization: org, organizations: this.organizations }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateOrganization(org.id, result);
      }
    });
  }

  createOrganization(data: any): void {
    this.adminService.createOrganization(data).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Tạo đơn vị thành công!', 'Đóng', { duration: 3000 });
          this.loadOrganizations();
        }
      },
      error: (error) => {
        console.error('Error creating organization:', error);
        const message = error.error?.message || 'Lỗi khi tạo đơn vị';
        this.snackBar.open(message, 'Đóng', { duration: 3000 });
      }
    });
  }

  updateOrganization(id: string, data: any): void {
    this.adminService.updateOrganization(id, data).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Cập nhật đơn vị thành công!', 'Đóng', { duration: 3000 });
          this.loadOrganizations();
        }
      },
      error: (error) => {
        console.error('Error updating organization:', error);
        const message = error.error?.message || 'Lỗi khi cập nhật đơn vị';
        this.snackBar.open(message, 'Đóng', { duration: 3000 });
      }
    });
  }

  toggleStatus(org: any): void {
    const newStatus = !org.isActive;
    const action = newStatus ? 'kích hoạt' : 'vô hiệu hóa';
    
    if (confirm(`Bạn có chắc muốn ${action} đơn vị "${org.name}"?`)) {
      this.adminService.updateOrganization(org.id, { isActive: newStatus }).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open(`${action.charAt(0).toUpperCase() + action.slice(1)} đơn vị thành công!`, 'Đóng', { duration: 3000 });
            this.loadOrganizations();
          }
        },
        error: (error) => {
          console.error('Error toggling status:', error);
          this.snackBar.open(`Lỗi khi ${action} đơn vị`, 'Đóng', { duration: 3000 });
        }
      });
    }
  }

  deleteOrganization(org: any): void {
    if (confirm(`Bạn có chắc muốn XÓA đơn vị "${org.name}"? Hành động này không thể hoàn tác!`)) {
      this.adminService.deleteOrganization(org.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('Xóa đơn vị thành công!', 'Đóng', { duration: 3000 });
            this.loadOrganizations();
          }
        },
        error: (error) => {
          console.error('Error deleting organization:', error);
          const message = error.error?.message || 'Lỗi khi xóa đơn vị';
          this.snackBar.open(message, 'Đóng', { duration: 3000 });
        }
      });
    }
  }

  viewMembers(org: any): void {
    this.router.navigate(['/admin/organizations', org.id, 'members']);
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }

  getTypeLabel(type: string): string {
    const found = this.organizationTypes.find(t => t.value === type);
    return found ? found.label : type;
  }
}

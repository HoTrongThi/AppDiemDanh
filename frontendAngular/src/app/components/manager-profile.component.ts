import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { User } from '../models/api.models';

@Component({
  selector: 'app-manager-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './manager-profile.component.html',
  styleUrls: ['./manager-profile.component.css']
})
export class ManagerProfileComponent implements OnInit, AfterViewInit {
  currentUser: User | null = null;
  profileForm: FormGroup;
  isEditing = false;
  isLoading = false; // Start with false to show content immediately
  isSaving = false;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private formBuilder: FormBuilder,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.profileForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: ['', [Validators.pattern(/^[0-9]{10,11}$/)]],
      role: [''] // Remove disabled: true
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Extract role name from different formats
    const roleData = this.currentUser.role || (this.currentUser as any).Role;
    let userRole: string = '';
    
    if (typeof roleData === 'object' && roleData) {
      userRole = roleData.Name || roleData.name || '';
    } else if (typeof roleData === 'string') {
      userRole = roleData;
    }
    
    // Allow Manager and Admin to access this page
    if (userRole !== 'Manager' && userRole !== 'Admin') {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Initialize immediately
    this.initializeFormData();
  }

  ngAfterViewInit(): void {
    // Re-initialize after view is ready to ensure form is populated
    setTimeout(() => {
      this.initializeFormData();
    }, 100);
  }

  private initializeFormData(): void {
    // Re-fetch user from auth service to ensure we have latest data
    this.currentUser = this.authService.getCurrentUser();
    
    // Initialize form with current user data
    this.initializeForm();
    
    // Set isLoading to false to show the form
    this.isLoading = false;
    
    // Load fresh data from API (only once)
    if (!this.currentUser || !(this.currentUser as any)._apiLoaded) {
      this.loadUserProfile();
    }
  }

  private initializeForm(): void {
    if (this.currentUser) {
      // Handle both camelCase and PascalCase property names
      const username = (this.currentUser as any).username || (this.currentUser as any).Username || '';
      const email = (this.currentUser as any).email || (this.currentUser as any).Email || '';
      const fullName = (this.currentUser as any).fullName || (this.currentUser as any).FullName || '';
      const phoneNumber = (this.currentUser as any).phoneNumber || (this.currentUser as any).PhoneNumber || '';
      const role = this.currentUser.role || (this.currentUser as any).Role;
      const roleName = this.getRoleName(role);
      
      // Set form values
      try {
        this.profileForm.setValue({
          username: username || '',
          email: email || '',
          fullName: fullName || '',
          phoneNumber: phoneNumber || '',
          role: roleName || ''
        });
      } catch (error) {
        console.error('Error setting form values:', error);
        this.profileForm.patchValue({
          username: username,
          email: email,
          fullName: fullName,
          phoneNumber: phoneNumber,
          role: roleName
        });
      }
      
      // Force form controls to update
      Object.keys(this.profileForm.controls).forEach(key => {
        this.profileForm.get(key)?.updateValueAndValidity();
      });
      
      // Force Angular to detect changes
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }
  }

  private loadUserProfile(): void {
    // Load user profile from API
    this.userService.getCurrentUserProfile().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Update current user data
          this.currentUser = response.data;
          this.authService.updateCurrentUser(this.currentUser);
          
          // Handle both camelCase and PascalCase
          const username = (this.currentUser as any).username || (this.currentUser as any).Username || '';
          const email = (this.currentUser as any).email || (this.currentUser as any).Email || '';
          const fullName = (this.currentUser as any).fullName || (this.currentUser as any).FullName || '';
          const phoneNumber = (this.currentUser as any).phoneNumber || (this.currentUser as any).PhoneNumber || '';
          const role = this.currentUser.role || (this.currentUser as any).Role;
          const roleName = this.getRoleName(role);
          
          // Update form with latest data
          this.profileForm.patchValue({
            username: username,
            email: email,
            fullName: fullName,
            phoneNumber: phoneNumber,
            role: roleName
          });
          
          // Force change detection
          this.cdr.detectChanges();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
        this.isLoading = false;
        this.snackBar.open('Không thể tải thông tin mới nhất từ server', 'Đóng', {
          duration: 3000
        });
      }
    });
  }

  toggleEdit(): void {
    if (this.isEditing) {
      // Cancel editing - reset form to original values
      this.loadUserProfile();
      this.isEditing = false;
    } else {
      // Start editing
      this.isEditing = true;
    }
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched();
      this.snackBar.open('Vui lòng kiểm tra lại thông tin đã nhập', 'Đóng', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.isSaving = true;
    const formData = this.profileForm.getRawValue(); // Use getRawValue to get all fields

    // Call API to update user profile
    this.userService.updateUserProfile({
      username: formData.username,
      email: formData.email,
      fullName: formData.fullName,
      phoneNumber: formData.phoneNumber
    }).subscribe({
      next: (response) => {
        console.log('Save profile response:', response);
        if (response.success && response.data) {
          // Update current user data with response from server
          this.currentUser = response.data;
          this.authService.updateCurrentUser(this.currentUser);
          
          // Handle both camelCase and PascalCase from API response
          const username = (this.currentUser as any).username || (this.currentUser as any).Username || '';
          const email = (this.currentUser as any).email || (this.currentUser as any).Email || '';
          const fullName = (this.currentUser as any).fullName || (this.currentUser as any).FullName || '';
          const phoneNumber = (this.currentUser as any).phoneNumber || (this.currentUser as any).PhoneNumber || '';
          const role = this.currentUser.role || (this.currentUser as any).Role;
          const roleName = this.getRoleName(role);
          
          // Update form with latest data from server
          this.profileForm.patchValue({
            username: username,
            email: email,
            fullName: fullName,
            phoneNumber: phoneNumber,
            role: roleName
          });
          
          // Force change detection
          this.cdr.detectChanges();
          
          this.isEditing = false;
          this.snackBar.open('Cập nhật thông tin thành công!', 'Đóng', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        } else {
          // Handle error message properly
          const errorMessage = typeof response.message === 'string' 
            ? response.message 
            : 'Có lỗi xảy ra khi cập nhật thông tin';
          this.snackBar.open(errorMessage, 'Đóng', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.isSaving = false;
        
        // Extract error message properly
        let errorMessage = 'Có lỗi xảy ra khi cập nhật thông tin';
        if (error.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.title) {
            errorMessage = error.error.title;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.snackBar.open(errorMessage, 'Đóng', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.profileForm.controls).forEach(key => {
      const control = this.profileForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.profileForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} là bắt buộc`;
      }
      if (control.errors['email']) {
        return 'Email không hợp lệ';
      }
      if (control.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} phải có ít nhất ${control.errors['minlength'].requiredLength} ký tự`;
      }
      if (control.errors['pattern']) {
        return 'Số điện thoại không hợp lệ (10-11 số)';
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      username: 'Tên đăng nhập',
      email: 'Email',
      fullName: 'Họ và tên',
      phoneNumber: 'Số điện thoại'
    };
    return labels[fieldName] || fieldName;
  }

  goBack(): void {
    const dashboardRoute = this.authService.getDashboardRoute();
    this.router.navigate([dashboardRoute]);
  }

  getRoleName(role: any): string {
    if (!role) return '';
    
    if (typeof role === 'object' && role) {
      return role.Name || role.name || '';
    } else {
      return role || '';
    }
  }

  getDisplayName(): string {
    if (!this.currentUser) return 'Chưa có tên';
    return (this.currentUser as any).fullName || (this.currentUser as any).FullName || 'Chưa có tên';
  }

  getDisplayEmail(): string {
    if (!this.currentUser) return 'Chưa có email';
    return (this.currentUser as any).email || (this.currentUser as any).Email || 'Chưa có email';
  }

  getDisplayRole(): string {
    if (!this.currentUser) return 'Chưa có vai trò';
    const role = this.currentUser.role || (this.currentUser as any).Role;
    return this.getRoleName(role) || 'Chưa có vai trò';
  }


  formatDate(date: Date | string | undefined): string {
    if (!date) return 'Chưa xác định';
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
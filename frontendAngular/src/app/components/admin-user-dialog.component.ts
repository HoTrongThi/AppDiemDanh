import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';
import { AdminUser, Role } from '../services/admin.service';

export interface DialogData {
  mode: 'create' | 'edit';
  user?: AdminUser;
  roles: Role[];
}

@Component({
  selector: 'app-admin-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule,
    MatStepperModule
  ],
  template: `
    <div class="modern-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <div class="header-content">
          <div class="icon-wrapper">
            <mat-icon>{{ data.mode === 'create' ? 'person_add' : 'edit' }}</mat-icon>
          </div>
          <div class="header-text">
            <h2>{{ data.mode === 'create' ? 'Tạo User Mới' : 'Chỉnh sửa User' }}</h2>
            <p>{{ data.mode === 'create' ? 'Thêm người dùng mới vào hệ thống' : 'Cập nhật thông tin người dùng' }}</p>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <div class="dialog-body">
        <form [formGroup]="userForm">
          <!-- Account Information Section -->
          <div class="form-section">
            <div class="section-header">
              <mat-icon>account_circle</mat-icon>
              <h3>Thông tin tài khoản</h3>
            </div>
            
            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Username</mat-label>
                <input matInput formControlName="username" placeholder="Nhập username">
                <mat-icon matPrefix>person</mat-icon>
                <mat-hint>Tên đăng nhập duy nhất</mat-hint>
                <mat-error *ngIf="userForm.get('username')?.hasError('required')">
                  Username là bắt buộc
                </mat-error>
                <mat-error *ngIf="userForm.get('username')?.hasError('minlength')">
                  Tối thiểu 3 ký tự
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email" placeholder="example@email.com">
                <mat-icon matPrefix>email</mat-icon>
                <mat-hint>Email liên hệ</mat-hint>
                <mat-error *ngIf="userForm.get('email')?.hasError('required')">
                  Email là bắt buộc
                </mat-error>
                <mat-error *ngIf="userForm.get('email')?.hasError('email')">
                  Email không hợp lệ
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-row" *ngIf="data.mode === 'create'">
              <mat-form-field appearance="outline" class="form-field full-width">
                <mat-label>Mật khẩu</mat-label>
                <input matInput 
                       [type]="hidePassword ? 'password' : 'text'" 
                       formControlName="password" 
                       placeholder="Nhập mật khẩu">
                <mat-icon matPrefix>lock</mat-icon>
                <button mat-icon-button matSuffix (click)="hidePassword = !hidePassword" type="button">
                  <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                <mat-hint>Tối thiểu 6 ký tự</mat-hint>
                <mat-error *ngIf="userForm.get('password')?.hasError('required')">
                  Mật khẩu là bắt buộc
                </mat-error>
                <mat-error *ngIf="userForm.get('password')?.hasError('minlength')">
                  Tối thiểu 6 ký tự
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <mat-divider></mat-divider>

          <!-- Personal Information Section -->
          <div class="form-section">
            <div class="section-header">
              <mat-icon>badge</mat-icon>
              <h3>Thông tin cá nhân</h3>
            </div>
            
            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Họ và tên</mat-label>
                <input matInput formControlName="fullName" placeholder="Nguyễn Văn A">
                <mat-icon matPrefix>person_outline</mat-icon>
                <mat-error *ngIf="userForm.get('fullName')?.hasError('required')">
                  Họ và tên là bắt buộc
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Số điện thoại</mat-label>
                <input matInput formControlName="phoneNumber" placeholder="0912345678">
                <mat-icon matPrefix>phone</mat-icon>
                <mat-error *ngIf="userForm.get('phoneNumber')?.hasError('pattern')">
                  Số điện thoại không hợp lệ
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <mat-divider></mat-divider>

          <!-- Role Section -->
          <div class="form-section">
            <div class="section-header">
              <mat-icon>admin_panel_settings</mat-icon>
              <h3>Phân quyền</h3>
            </div>
            
            <mat-form-field appearance="outline" class="form-field full-width">
              <mat-label>Vai trò</mat-label>
              <mat-select formControlName="roleId">
                <mat-option *ngFor="let role of data.roles" [value]="role.id">
                  <div class="role-option">
                    <strong>{{ role.displayName }}</strong>
                    <span class="role-desc">{{ role.description }}</span>
                  </div>
                </mat-option>
              </mat-select>
              <mat-icon matPrefix>security</mat-icon>
              <mat-hint>Chọn vai trò phù hợp</mat-hint>
              <mat-error *ngIf="userForm.get('roleId')?.hasError('required')">
                Vai trò là bắt buộc
              </mat-error>
            </mat-form-field>
          </div>
        </form>
      </div>

      <!-- Footer -->
      <div class="dialog-footer">
        <button mat-stroked-button (click)="onCancel()" class="cancel-btn">
          <mat-icon>close</mat-icon>
          Hủy bỏ
        </button>
        <button mat-raised-button 
                color="primary" 
                (click)="onSave()"
                [disabled]="!userForm.valid"
                class="save-btn">
          <mat-icon>{{ data.mode === 'create' ? 'add' : 'save' }}</mat-icon>
          {{ data.mode === 'create' ? 'Tạo User' : 'Lưu thay đổi' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .modern-dialog {
      display: flex;
      flex-direction: column;
      width: 550px;
      max-height: 75vh;
    }

    /* Header */
    .dialog-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 20px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .header-content {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
    }

    .icon-wrapper mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: white;
    }

    .header-text h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.5px;
    }

    .header-text p {
      margin: 4px 0 0 0;
      font-size: 12px;
      opacity: 0.9;
      font-weight: 400;
    }

    .close-btn {
      color: white;
      margin-top: -4px;
    }

    /* Body */
    .dialog-body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 16px 20px;
      background: #fafafa;
    }

    .form-section {
      margin-bottom: 16px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      color: #333;
    }

    .section-header mat-icon {
      color: #667eea;
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .section-header h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: #333;
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 10px;
    }

    @media (min-width: 600px) {
      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
    }

    .form-field {
      width: 100%;
    }

    .form-field.full-width {
      grid-column: 1 / -1;
    }

    mat-divider {
      margin: 12px 0;
    }

    /* Role Option */
    .role-option {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .role-desc {
      font-size: 12px;
      color: #666;
    }

    /* Footer */
    .dialog-footer {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 16px 24px;
      background: white;
      border-top: 1px solid #e0e0e0;
      box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
    }

    .cancel-btn,
    .save-btn {
      min-width: 120px;
      height: 40px;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      border-radius: 6px;
    }

    .save-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    /* Scrollbar */
    .dialog-body::-webkit-scrollbar {
      width: 6px;
    }

    .dialog-body::-webkit-scrollbar-track {
      background: #f1f1f1;
    }

    .dialog-body::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 3px;
    }

    .dialog-body::-webkit-scrollbar-thumb:hover {
      background: #555;
    }

    /* Material overrides */
    ::ng-deep .mat-mdc-dialog-container {
      padding: 0 !important;
      border-radius: 16px !important;
      overflow: hidden;
    }

    ::ng-deep .mat-mdc-form-field {
      font-size: 13px;
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-text-field-wrapper {
      padding-bottom: 0;
    }

    ::ng-deep .mat-mdc-text-field-wrapper {
      background: white;
    }
  `]
})
export class AdminUserDialogComponent implements OnInit {
  userForm: FormGroup;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AdminUserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      fullName: ['', [Validators.required]],
      phoneNumber: ['', [Validators.pattern(/^[0-9]{10,11}$/)]],
      roleId: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    if (this.data.mode === 'create') {
      this.userForm.get('password')?.setValidators([
        Validators.required,
        Validators.minLength(6)
      ]);
    } else if (this.data.mode === 'edit' && this.data.user) {
      this.userForm.patchValue({
        username: this.data.user.username,
        email: this.data.user.email,
        fullName: this.data.user.fullName,
        phoneNumber: this.data.user.phoneNumber || '',
        roleId: this.data.user.role?.id || ''
      });
      this.userForm.removeControl('password');
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.userForm.valid) {
      const formValue = this.userForm.value;
      if (!formValue.phoneNumber) {
        delete formValue.phoneNumber;
      }
      this.dialogRef.close(formValue);
    }
  }
}

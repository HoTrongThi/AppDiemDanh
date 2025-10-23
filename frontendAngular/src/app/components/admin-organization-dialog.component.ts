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

export interface DialogData {
  mode: 'create' | 'edit';
  organization?: any;
  organizations: any[];
}

@Component({
  selector: 'app-admin-organization-dialog',
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
    MatDividerModule
  ],
  template: `
    <div class="modern-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <div class="header-content">
          <div class="icon-wrapper">
            <mat-icon>{{ data.mode === 'create' ? 'add_business' : 'edit' }}</mat-icon>
          </div>
          <div class="header-text">
            <h2>{{ data.mode === 'create' ? 'Tạo Đơn vị Mới' : 'Chỉnh sửa Đơn vị' }}</h2>
            <p>{{ data.mode === 'create' ? 'Thêm đơn vị mới vào hệ thống' : 'Cập nhật thông tin đơn vị' }}</p>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <div class="dialog-body">
        <form [formGroup]="orgForm">
          <!-- Basic Information -->
          <div class="form-section">
            <div class="section-header">
              <mat-icon>info</mat-icon>
              <h3>Thông tin cơ bản</h3>
            </div>
            
            <mat-form-field appearance="outline" class="form-field full-width">
              <mat-label>Tên đơn vị</mat-label>
              <input matInput formControlName="name" placeholder="Nhập tên đơn vị">
              <mat-icon matPrefix>business</mat-icon>
              <mat-error *ngIf="orgForm.get('name')?.hasError('required')">
                Tên đơn vị là bắt buộc
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field full-width">
              <mat-label>Mô tả</mat-label>
              <textarea matInput 
                        formControlName="description" 
                        placeholder="Nhập mô tả về đơn vị"
                        rows="3"></textarea>
              <mat-icon matPrefix>description</mat-icon>
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Loại đơn vị</mat-label>
                <mat-select formControlName="type">
                  <mat-option value="Faculty">Khoa</mat-option>
                  <mat-option value="Department">Phòng ban</mat-option>
                  <mat-option value="Class">Lớp học</mat-option>
                  <mat-option value="Group">Nhóm</mat-option>
                  <mat-option value="Other">Khác</mat-option>
                </mat-select>
                <mat-icon matPrefix>category</mat-icon>
                <mat-error *ngIf="orgForm.get('type')?.hasError('required')">
                  Loại đơn vị là bắt buộc
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Mã đơn vị</mat-label>
                <input matInput formControlName="code" placeholder="VD: CNTT, K01">
                <mat-icon matPrefix>tag</mat-icon>
              </mat-form-field>
            </div>
          </div>

          <mat-divider></mat-divider>

          <!-- Hierarchy -->
          <div class="form-section">
            <div class="section-header">
              <mat-icon>account_tree</mat-icon>
              <h3>Cấu trúc tổ chức</h3>
            </div>
            
            <mat-form-field appearance="outline" class="form-field full-width">
              <mat-label>Đơn vị cha</mat-label>
              <mat-select formControlName="parentId">
                <mat-option [value]="null">Không có (đơn vị gốc)</mat-option>
                <mat-option *ngFor="let org of availableParents" [value]="org.id">
                  {{ org.name }} ({{ getTypeLabel(org.type) }})
                </mat-option>
              </mat-select>
              <mat-icon matPrefix>corporate_fare</mat-icon>
              <mat-hint>Chọn đơn vị cha nếu đây là đơn vị con</mat-hint>
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
                [disabled]="!orgForm.valid"
                class="save-btn">
          <mat-icon>{{ data.mode === 'create' ? 'add' : 'save' }}</mat-icon>
          {{ data.mode === 'create' ? 'Tạo Đơn vị' : 'Lưu thay đổi' }}
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
    }

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

    ::ng-deep .mat-mdc-dialog-container {
      padding: 0 !important;
      border-radius: 16px !important;
      overflow: hidden;
    }

    ::ng-deep .mat-mdc-form-field {
      font-size: 13px;
    }

    ::ng-deep .mat-mdc-text-field-wrapper {
      background: white;
    }
  `]
})
export class AdminOrganizationDialogComponent implements OnInit {
  orgForm: FormGroup;
  availableParents: any[] = [];

  organizationTypes = [
    { value: 'Faculty', label: 'Khoa' },
    { value: 'Department', label: 'Phòng ban' },
    { value: 'Class', label: 'Lớp học' },
    { value: 'Group', label: 'Nhóm' },
    { value: 'Other', label: 'Khác' }
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AdminOrganizationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.orgForm = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      type: ['', [Validators.required]],
      code: [''],
      parentId: [null]
    });
  }

  ngOnInit(): void {
    // Filter available parents (exclude self if editing)
    if (this.data.mode === 'edit' && this.data.organization) {
      this.availableParents = this.data.organizations.filter(
        org => org.id !== this.data.organization.id
      );

      // Populate form
      this.orgForm.patchValue({
        name: this.data.organization.name,
        description: this.data.organization.description || '',
        type: this.data.organization.type,
        code: this.data.organization.code || '',
        parentId: this.data.organization.parentId || null
      });
    } else {
      this.availableParents = this.data.organizations;
    }
  }

  getTypeLabel(type: string): string {
    const found = this.organizationTypes.find(t => t.value === type);
    return found ? found.label : type;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.orgForm.valid) {
      const formValue = this.orgForm.value;
      
      // Convert to backend format (PascalCase)
      const data = {
        Name: formValue.name,
        Description: formValue.description || null,
        Type: formValue.type,
        Code: formValue.code || null,
        ParentId: formValue.parentId || null
      };
      
      this.dialogRef.close(data);
    }
  }
}

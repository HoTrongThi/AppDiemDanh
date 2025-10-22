import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EventService } from '../services/event.service';
import { AuthService } from '../services/auth.service';
import { Event } from '../models/api.models';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
    MatTooltipModule
  ],
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.css']
})
export class CreateEventComponent implements OnInit {
  eventForm: FormGroup;
  isLoading = false;
  minDate = new Date();

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.eventForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      locationName: ['', [Validators.required, Validators.maxLength(255)]],
      latitude: ['', [Validators.pattern(/^-?([1-8]?[0-9](\.[0-9]+)?|90(\.0+)?)$/)]],
      longitude: ['', [Validators.pattern(/^-?((1[0-7]|[0-9])?[0-9](\.[0-9]+)?|180(\.0+)?)$/)]],
      radiusMeters: [100, [Validators.required, Validators.min(10), Validators.max(10000)]],
      startDate: ['', Validators.required],
      startTime: ['', Validators.required],
      endDate: ['', Validators.required],
      endTime: ['', Validators.required],
      maxParticipants: [''],
      requireGps: [true],
      allowLateCheckin: [false],
      lateCheckinMinutes: [15],
      qrRefreshIntervalSeconds: [300, [Validators.required, Validators.min(10), Validators.max(3600)]]
    });
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user || !user.role) {
      this.router.navigate(['/dashboard']);
      return;
    }
    
    const userRole = typeof user.role === 'object' ? user.role.name : user.role;
    if (userRole !== 'Manager') {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Set default values
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    this.eventForm.patchValue({
      startDate: tomorrow,
      endDate: tomorrow,
      startTime: '09:00',
      endTime: '17:00'
    });
  }

  onSubmit(): void {
    if (this.eventForm.valid) {
      this.isLoading = true;
      
      const formValue = this.eventForm.value;
      
      // Combine date and time
      const startDateTime = this.combineDateTime(formValue.startDate, formValue.startTime);
      const endDateTime = this.combineDateTime(formValue.endDate, formValue.endTime);
      
      // Validate dates
      if (startDateTime >= endDateTime) {
        this.snackBar.open('Thời gian kết thúc phải sau thời gian bắt đầu', 'Đóng', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.isLoading = false;
        return;
      }

      // Prepare location object if coordinates are provided
      const location = (formValue.latitude && formValue.longitude) ? {
        latitude: parseFloat(formValue.latitude),
        longitude: parseFloat(formValue.longitude)
      } : undefined;

      const eventData = {
        name: formValue.name,
        description: formValue.description,
        location: location,
        locationName: formValue.locationName,
        radiusMeters: formValue.radiusMeters,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        maxParticipants: formValue.maxParticipants ? parseInt(formValue.maxParticipants) : null,
        requireGps: formValue.requireGps,
        allowLateCheckin: formValue.allowLateCheckin,
        lateCheckinMinutes: formValue.allowLateCheckin ? formValue.lateCheckinMinutes : null,
        qrRefreshIntervalSeconds: formValue.qrRefreshIntervalSeconds
      };

      console.log('Creating event:', eventData);

      this.eventService.createEvent(eventData as Partial<Event>).subscribe({
        next: (response) => {
          console.log('Event created:', response);
          this.isLoading = false;
          
          if (response.success) {
            this.snackBar.open('Sự kiện đã được tạo thành công!', 'Đóng', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.router.navigate(['/manager']);
          } else {
            this.snackBar.open(response.message || 'Có lỗi xảy ra khi tạo sự kiện', 'Đóng', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        },
        error: (error) => {
          console.error('Error creating event:', error);
          this.isLoading = false;
          this.snackBar.open('Có lỗi xảy ra khi tạo sự kiện', 'Đóng', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private combineDateTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.eventForm.controls).forEach(key => {
      const control = this.eventForm.get(key);
      control?.markAsTouched();
    });
  }

  goBack(): void {
    this.router.navigate(['/manager']);
  }

  // Helper methods for form validation
  getErrorMessage(fieldName: string): string {
    const control = this.eventForm.get(fieldName);
    if (control?.hasError('required')) {
      return 'Trường này là bắt buộc';
    }
    if (control?.hasError('maxlength')) {
      return 'Vượt quá độ dài cho phép';
    }
    if (control?.hasError('min')) {
      return 'Giá trị quá nhỏ';
    }
    if (control?.hasError('max')) {
      return 'Giá trị quá lớn';
    }
    if (control?.hasError('pattern')) {
      if (fieldName === 'latitude') {
        return 'Vĩ độ không hợp lệ (-90 đến 90)';
      }
      if (fieldName === 'longitude') {
        return 'Kinh độ không hợp lệ (-180 đến 180)';
      }
    }
    return '';
  }

  // Get current location
  getCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.eventForm.patchValue({
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          });
          this.snackBar.open('Đã lấy vị trí hiện tại', 'Đóng', {
            duration: 2000,
            panelClass: ['success-snackbar']
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          this.snackBar.open('Không thể lấy vị trí hiện tại', 'Đóng', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      );
    } else {
      this.snackBar.open('Trình duyệt không hỗ trợ định vị', 'Đóng', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }
}
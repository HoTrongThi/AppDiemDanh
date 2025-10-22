import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
import { Event } from '../models/api.models';

@Component({
  selector: 'app-event-edit',
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
  templateUrl: './event-edit.component.html',
  styleUrls: ['./event-edit.component.css']
})
export class EventEditComponent implements OnInit {
  eventForm: FormGroup;
  isLoading = false;
  isSaving = false;
  eventId: string = '';
  event: Event | null = null;
  minDate = new Date();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
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
      requireGps: [true],
      allowLateCheckin: [false],
      lateCheckinMinutes: [15],
      qrRefreshIntervalSeconds: [300, [Validators.required, Validators.min(10), Validators.max(3600)]]
    });
  }

  ngOnInit(): void {
    this.eventId = this.route.snapshot.params['id'];
    if (this.eventId) {
      this.loadEvent();
    }
  }

  loadEvent(): void {
    this.isLoading = true;
    this.eventService.getEvent(this.eventId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.event = response.data;
          this.populateForm();
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

  populateForm(): void {
    if (!this.event) return;

    const startDate = new Date(this.event.startTime);
    const endDate = new Date(this.event.endTime);

    this.eventForm.patchValue({
      name: this.event.name,
      description: this.event.description || '',
      locationName: this.event.locationName || '',
      latitude: this.event.location?.latitude?.toString() || '',
      longitude: this.event.location?.longitude?.toString() || '',
      radiusMeters: this.event.radiusMeters,
      startDate: startDate,
      startTime: this.formatTimeForInput(startDate),
      endDate: endDate,
      endTime: this.formatTimeForInput(endDate),
      requireGps: this.event.requireGps,
      allowLateCheckin: this.event.allowLateCheckin,
      lateCheckinMinutes: this.event.lateCheckinMinutes || 15,
      qrRefreshIntervalSeconds: this.event.qrRefreshIntervalSeconds
    });
  }

  formatTimeForInput(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  onSubmit(): void {
    if (this.eventForm.valid) {
      this.isSaving = true;
      
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
        this.isSaving = false;
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
        requireGps: formValue.requireGps,
        allowLateCheckin: formValue.allowLateCheckin,
        lateCheckinMinutes: formValue.allowLateCheckin ? formValue.lateCheckinMinutes : null,
        qrRefreshIntervalSeconds: formValue.qrRefreshIntervalSeconds
      };

      console.log('Updating event:', eventData);

      // Call actual update API
      this.eventService.updateEvent(this.eventId, eventData).subscribe({
        next: (response) => {
          console.log('Event updated:', response);
          this.isSaving = false;
          
          if (response.success) {
            this.snackBar.open('Sự kiện đã được cập nhật thành công!', 'Đóng', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.router.navigate(['/manager/events', this.eventId]);
          } else {
            this.snackBar.open(response.message || 'Có lỗi xảy ra khi cập nhật sự kiện', 'Đóng', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        },
        error: (error) => {
          console.error('Error updating event:', error);
          this.isSaving = false;
          
          let errorMessage = 'Có lỗi xảy ra khi cập nhật sự kiện';
          if (error.status === 403) {
            errorMessage = 'Không có quyền cập nhật sự kiện này';
          } else if (error.status === 404) {
            errorMessage = 'Không tìm thấy sự kiện';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          this.snackBar.open(errorMessage, 'Đóng', {
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
    this.router.navigate(['/manager/events', this.eventId]);
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
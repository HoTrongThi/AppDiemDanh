import { Component, OnInit, OnDestroy, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { QrService } from '../services/qr.service';
import { EventService } from '../services/event.service';
import { Event, QrSession } from '../models/api.models';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-qr-display',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './qr-display.component.html',
  styleUrls: ['./qr-display.component.css']
})
export class QrDisplayComponent implements OnInit, OnDestroy, OnChanges {
  @Input() eventId: string = '';
  @Input() size: number = 300;
  @Input() showEventInfo: boolean = true;
  events: Event[] = [];
  selectedEventId: string = '';
  selectedEventName: string = '';
  currentQrSession: QrSession | null = null;
  qrCodeImage: string = '';
  isGenerating = false;
  timeRemaining = '';
  isExpired = false;
  
  private subscriptions = new Subscription();
  private countdownInterval: any;

  constructor(
    private qrService: QrService,
    private eventService: EventService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (this.eventId) {
      // If eventId is provided as input, use it directly
      this.selectedEventId = this.eventId;
      this.loadEventInfo();
      this.generateQr();
    } else {
      // Otherwise load events for selection
      this.loadEvents();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId'] && changes['eventId'].currentValue) {
      this.selectedEventId = changes['eventId'].currentValue;
      this.loadEventInfo();
      this.generateQr();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.clearCountdown();
    this.qrService.stopAutoRefresh();
  }

  loadEvents(): void {
    this.subscriptions.add(
      this.eventService.getEvents(1, 50).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.events = response.data.events.filter(e => e.status === 'Active');
          }
        },
        error: (error) => {
          console.error('Error loading events:', error);
          this.snackBar.open('Lỗi khi tải danh sách sự kiện', 'Đóng', { duration: 3000 });
        }
      })
    );
  }

  onEventChange(): void {
    const selectedEvent = this.events.find(e => e.id === this.selectedEventId);
    this.selectedEventName = selectedEvent?.name || '';
    this.stopDisplay();
  }

  generateQr(): void {
    if (!this.selectedEventId) {
      console.warn('QrDisplay: No event ID selected');
      return;
    }
    
    console.log('QrDisplay: Generating QR for event:', this.selectedEventId);
    this.isGenerating = true;
    
    this.subscriptions.add(
      this.qrService.generateQrSession(this.selectedEventId).subscribe({
        next: (response) => {
          console.log('QrDisplay: Generate QR response:', response);
          this.isGenerating = false;
          
          if (response.success && response.data) {
            this.currentQrSession = response.data;
            console.log('QrDisplay: QR session created:', this.currentQrSession);
            this.generateQrImage();
            this.startCountdown();
            this.startAutoRefresh();
            this.snackBar.open('QR Code đã được tạo thành công', 'Đóng', { duration: 3000 });
          } else {
            console.error('QrDisplay: Invalid response format:', response);
            this.snackBar.open('Lỗi: Phản hồi không hợp lệ', 'Đóng', { duration: 3000 });
          }
        },
        error: (error) => {
          this.isGenerating = false;
          console.error('QrDisplay: Error generating QR:', error);
          
          let errorMessage = 'Lỗi khi tạo QR Code';
          if (error.status === 403) {
            errorMessage = 'Không có quyền tạo QR Code';
          } else if (error.status === 404) {
            errorMessage = 'Không tìm thấy sự kiện';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          this.snackBar.open(errorMessage, 'Đóng', { duration: 5000 });
        }
      })
    );
  }

  refreshQr(): void {
    if (!this.selectedEventId) return;
    
    this.isGenerating = true;
    this.subscriptions.add(
      this.qrService.refreshQrSession(this.selectedEventId).subscribe({
        next: (response) => {
          this.isGenerating = false;
          if (response.success && response.data) {
            this.currentQrSession = response.data;
            this.generateQrImage();
            this.startCountdown();
            this.snackBar.open('QR Code đã được làm mới', 'Đóng', { duration: 2000 });
          }
        },
        error: (error) => {
          this.isGenerating = false;
          console.error('Error refreshing QR:', error);
          this.snackBar.open('Lỗi khi làm mới QR Code', 'Đóng', { duration: 3000 });
        }
      })
    );
  }

  stopDisplay(): void {
    this.currentQrSession = null;
    this.qrCodeImage = '';
    this.clearCountdown();
    this.qrService.stopAutoRefresh();
  }

  private async generateQrImage(): Promise<void> {
    if (!this.currentQrSession) {
      console.warn('QrDisplay: No current QR session available');
      return;
    }
    
    try {
      console.log('QrDisplay: Current QR session:', this.currentQrSession);
      console.log('QrDisplay: QR data (camelCase):', this.currentQrSession.qrData);
      console.log('QrDisplay: QR data (PascalCase):', (this.currentQrSession as any).QrData);
      console.log('QrDisplay: QR size:', this.size);
      
      // Handle both QrData (backend) and qrData (frontend) property names
      const qrData = this.currentQrSession.qrData || (this.currentQrSession as any).QrData;
      this.qrCodeImage = await this.qrService.generateQrCodeImage(qrData, this.size);
      console.log('QrDisplay: QR image generated successfully');
    } catch (error) {
      console.error('QrDisplay: Error generating QR image:', error);
      this.snackBar.open(`Lỗi khi tạo hình ảnh QR: ${error instanceof Error ? error.message : 'Unknown error'}`, 'Đóng', { duration: 5000 });
    }
  }

  private loadEventInfo(): void {
    if (!this.selectedEventId) return;
    
    this.subscriptions.add(
      this.eventService.getEvent(this.selectedEventId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.selectedEventName = response.data.name;
          }
        },
        error: (error) => {
          console.error('Error loading event info:', error);
        }
      })
    );
  }

  private startCountdown(): void {
    this.clearCountdown();
    
    this.countdownInterval = setInterval(() => {
      if (!this.currentQrSession) {
        this.clearCountdown();
        return;
      }
      
      const now = new Date().getTime();
      const expiresAt = this.currentQrSession.expiresAt || (this.currentQrSession as any).ExpiresAt;
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;
      
      if (diff <= 0) {
        this.timeRemaining = 'Đã hết hạn';
        this.isExpired = true;
        this.clearCountdown();
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        this.timeRemaining = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        this.isExpired = false;
      }
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private startAutoRefresh(): void {
    if (!this.selectedEventId) return;
    
    this.subscriptions.add(
      this.qrService.startAutoRefresh(this.selectedEventId).subscribe({
        next: (qrSession) => {
          this.currentQrSession = qrSession;
          this.generateQrImage();
          this.startCountdown();
        },
        error: (error) => {
          console.error('Auto-refresh error:', error);
        }
      })
    );
  }

  formatDateTime(dateTime?: string): string {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getExpiresAt(): string {
    if (!this.currentQrSession) return '';
    return this.currentQrSession.expiresAt || (this.currentQrSession as any).ExpiresAt || '';
  }
}
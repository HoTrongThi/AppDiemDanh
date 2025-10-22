import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { QrService } from '../services/qr.service';
import { LocationService } from '../services/location.service';
import { LocationData } from '../models/api.models';
import { firstValueFrom } from 'rxjs';

// For now, we'll use a simple QR scanner implementation
// In production, you would use a proper QR scanner library

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './qr-scanner.component.html',
  styleUrls: ['./qr-scanner.component.css']
})
export class QrScannerComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  
  isCameraActive = false;
  isProcessing = false;
  processingMessage = '';
  locationData: LocationData | null = null;
  scanResult: {
    success: boolean;
    message: string;
    eventInfo?: {
      eventName: string;
      locationName: string;
    };
  } | null = null;
  
  private stream: MediaStream | null = null;

  constructor(
    private qrService: QrService,
    private locationService: LocationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.requestLocationPermission();
  }

  ngOnDestroy(): void {
    this.stopScanning();
  }

  async startScanning(): Promise<void> {
    try {
      this.scanResult = null;
      this.isCameraActive = true;
      
      // Get camera stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
      }
      
      this.snackBar.open('Camera đã sẵn sàng. Hướng camera vào QR code để quét.', 'Đóng', { 
        duration: 3000 
      });
      
    } catch (error) {
      console.error('Error starting camera:', error);
      this.snackBar.open('Không thể truy cập camera', 'Đóng', { duration: 3000 });
      this.isCameraActive = false;
    }
  }

  stopScanning(): void {
    this.isCameraActive = false;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.videoElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
  }

  // Simulate QR code detection (for demo purposes)
  simulateQrScan(): void {
    // TODO: Remove this simulation method when using real QR codes
    console.log('QR simulation disabled - use real QR codes from backend');
  }

  private async onQrCodeDetected(qrText: string): Promise<void> {
    this.stopScanning();
    this.isProcessing = true;
    this.processingMessage = 'Đang phân tích QR code...';
    
    try {
      // Parse QR data
      const qrData = this.qrService.parseQrData(qrText);
      
      if (!this.qrService.isValidQrData(qrData)) {
        throw new Error('QR code không hợp lệ');
      }
      
      // Check if QR is expired
      if (this.qrService.isQrExpired(qrData.expiresAt)) {
        throw new Error('QR code đã hết hạn');
      }
      
      this.processingMessage = 'Đang xác thực QR code...';
      
      // Validate QR with server
      const validationResponse = await firstValueFrom(this.qrService.validateQrSession({
        sessionId: qrData.sessionId,
        signature: qrData.signature || ''
      }));
      
      if (!validationResponse?.success) {
        throw new Error(validationResponse?.message || 'QR code không hợp lệ');
      }
      
      // Get location if required
      if (validationResponse.data?.requireGps) {
        this.processingMessage = 'Đang lấy vị trí GPS...';
        await this.getCurrentLocation();
        
        if (!this.locationData) {
          throw new Error('Không thể lấy vị trí GPS');
        }
        
        // Check if within radius (simplified check)
        if (this.locationData.accuracy > 100) {
          this.snackBar.open('Độ chính xác GPS thấp, vui lòng thử lại', 'Đóng', { duration: 3000 });
        }
      }
      
      this.processingMessage = 'Đang thực hiện điểm danh...';
      
      // TODO: Call attendance API
      // For now, just show success
      this.scanResult = {
        success: true,
        message: 'Điểm danh thành công! Bạn đã được ghi nhận tham dự sự kiện.',
        eventInfo: {
          eventName: validationResponse.data?.eventName || 'Sự kiện',
          locationName: validationResponse.data?.locationName || 'Không xác định'
        }
      };
      
    } catch (error: any) {
      console.error('QR processing error:', error);
      this.scanResult = {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi xử lý QR code'
      };
    } finally {
      this.isProcessing = false;
      this.processingMessage = '';
    }
  }

  private async getCurrentLocation(): Promise<void> {
    try {
      const location = await firstValueFrom(this.locationService.getCurrentLocation());
      this.locationData = location || null;
    } catch (error) {
      console.error('Location error:', error);
      this.locationData = null;
      throw new Error('Không thể lấy vị trí GPS. Vui lòng bật GPS và thử lại.');
    }
  }

  private async requestLocationPermission(): Promise<void> {
    try {
      const permission = await this.locationService.requestLocationPermission();
      if (permission === 'denied') {
        this.snackBar.open('Cần quyền truy cập vị trí để điểm danh', 'Đóng', { duration: 5000 });
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  }
}
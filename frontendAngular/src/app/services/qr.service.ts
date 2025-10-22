import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, switchMap, takeWhile, BehaviorSubject } from 'rxjs';
import { QrSession, QrValidationRequest, QrValidationResponse, ApiResponse } from '../models/api.models';
import { environment } from '../../environments/environment';
import * as QRCode from 'qrcode';

@Injectable({
  providedIn: 'root'
})
export class QrService {
  private readonly API_URL = environment.apiUrl;
  private qrRefreshSubject = new BehaviorSubject<QrSession | null>(null);
  public currentQr$ = this.qrRefreshSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Admin functions
  generateQrSession(eventId: string): Observable<ApiResponse<QrSession>> {
    return this.http.post<ApiResponse<QrSession>>(`${this.API_URL}/qr/generate/${eventId}`, {});
  }

  getActiveQrSession(eventId: string): Observable<ApiResponse<QrSession>> {
    return this.http.get<ApiResponse<QrSession>>(`${this.API_URL}/qr/active/${eventId}`);
  }

  refreshQrSession(eventId: string): Observable<ApiResponse<QrSession>> {
    return this.http.post<ApiResponse<QrSession>>(`${this.API_URL}/qr/refresh/${eventId}`, {});
  }

  // Public functions
  getQrForDisplay(eventId: string): Observable<ApiResponse<{
    qrData: string;
    expiresAt: string;
    refreshIntervalSeconds: number;
  }>> {
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/qr/display/${eventId}`);
  }

  validateQrSession(request: QrValidationRequest): Observable<QrValidationResponse> {
    return this.http.post<QrValidationResponse>(`${this.API_URL}/qr/validate`, request);
  }

  // Auto-refresh QR for admin display
  startAutoRefresh(eventId: string): Observable<QrSession> {
    return this.getActiveQrSession(eventId).pipe(
      switchMap(response => {
        if (response.success && response.data) {
          const qrSession = response.data;
          this.qrRefreshSubject.next(qrSession);
          
          // Start auto-refresh interval
          return interval(qrSession.refreshIntervalSeconds * 1000).pipe(
            switchMap(() => this.refreshQrSession(eventId)),
            takeWhile(() => true), // Keep refreshing until unsubscribed
            switchMap(refreshResponse => {
              if (refreshResponse.success && refreshResponse.data) {
                this.qrRefreshSubject.next(refreshResponse.data);
                return [refreshResponse.data];
              }
              return [];
            })
          );
        }
        return [];
      })
    );
  }

  // Generate QR code image
  async generateQrCodeImage(data: string, size: number = 256): Promise<string> {
    try {
      console.log('QrService: Generating QR code for data:', data);
      console.log('QrService: QR size:', size);
      
      if (!data || typeof data !== 'string') {
        throw new Error('Invalid QR data: data must be a non-empty string');
      }
      
      // Check if QRCode is available
      if (!QRCode || typeof QRCode.toDataURL !== 'function') {
        console.error('QrService: QRCode library not available');
        return this.generateFallbackQr(data, size);
      }
      
      const qrDataUrl = await QRCode.toDataURL(data, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      console.log('QrService: QR code generated successfully');
      return qrDataUrl;
    } catch (error) {
      console.error('QrService: Error generating QR code:', error);
      console.error('QrService: Data that failed:', data);
      
      // Try fallback method
      try {
        console.log('QrService: Trying fallback QR generation');
        return this.generateFallbackQr(data, size);
      } catch (fallbackError) {
        console.error('QrService: Fallback also failed:', fallbackError);
        throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // Fallback QR generation using online service
  private generateFallbackQr(data: string, size: number): string {
    console.log('QrService: Using fallback QR generation');
    
    // Use QR Server API as fallback
    const encodedData = encodeURIComponent(data);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`;
    
    // Create a canvas and draw the QR code URL as data URL
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Canvas context not available');
    }
    
    canvas.width = size;
    canvas.height = size;
    
    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    
    // Add text indicating this is a fallback
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code', size / 2, size / 2 - 10);
    ctx.fillText('(Fallback)', size / 2, size / 2 + 10);
    
    return canvas.toDataURL();
  }

  // Parse QR data
  parseQrData(qrText: string): any {
    try {
      return JSON.parse(qrText);
    } catch (error) {
      console.error('Error parsing QR data:', error);
      return null;
    }
  }

  // Validate QR data format
  isValidQrData(data: any): boolean {
    return data && 
           typeof data.sessionId === 'string' &&
           typeof data.eventId === 'string' &&
           typeof data.nonce === 'string' &&
           typeof data.timestamp === 'string' &&
           typeof data.expiresAt === 'string';
  }

  // Check if QR is expired
  isQrExpired(expiresAt: string): boolean {
    return new Date(expiresAt) <= new Date();
  }

  // Cleanup
  stopAutoRefresh(): void {
    this.qrRefreshSubject.next(null);
  }

  cleanupExpiredSessions(): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/qr/cleanup`, {});
  }
}
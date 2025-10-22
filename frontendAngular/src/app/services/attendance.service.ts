import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AttendanceRecord, ApiResponse } from '../models/api.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUserAttendanceHistory(userId?: string, page: number = 1, pageSize: number = 10): Observable<ApiResponse<{
    records: AttendanceRecord[];
    pagination: {
      currentPage: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
    };
  }>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (userId) {
      params = params.set('userId', userId);
    }

    console.log('AttendanceService: Getting user attendance history', { userId, page, pageSize });
    
    return this.http.get<any>(`${this.API_URL}/attendance/history`, { params })
      .pipe(
        map(response => {
          console.log('AttendanceService: Attendance history response', response);
          
          if (response.success !== undefined) {
            return response;
          } else if (Array.isArray(response)) {
            return {
              success: true,
              message: 'Attendance history retrieved successfully',
              data: {
                records: response,
                pagination: {
                  currentPage: page,
                  pageSize: pageSize,
                  totalCount: response.length,
                  totalPages: Math.ceil(response.length / pageSize)
                }
              }
            };
          } else {
            return {
              success: true,
              message: 'Attendance history retrieved successfully',
              data: {
                records: response.data || response.records || [],
                pagination: response.pagination || {
                  currentPage: page,
                  pageSize: pageSize,
                  totalCount: 0,
                  totalPages: 0
                }
              }
            };
          }
        }),
        catchError(error => {
          console.error('AttendanceService: Error getting attendance history', error);
          return of({
            success: false,
            message: error.message || 'Failed to load attendance history',
            data: {
              records: [],
              pagination: {
                currentPage: page,
                pageSize: pageSize,
                totalCount: 0,
                totalPages: 0
              }
            }
          });
        })
      );
  }

  getAttendanceRecord(recordId: string): Observable<ApiResponse<AttendanceRecord>> {
    console.log('AttendanceService: Getting attendance record', recordId);
    
    return this.http.get<any>(`${this.API_URL}/attendance/${recordId}`)
      .pipe(
        map(response => {
          console.log('AttendanceService: Attendance record response', response);
          
          if (response.success !== undefined) {
            return response;
          } else {
            return {
              success: true,
              message: 'Attendance record retrieved successfully',
              data: response
            };
          }
        }),
        catchError(error => {
          console.error('AttendanceService: Error getting attendance record', error);
          return of({
            success: false,
            message: error.message || 'Failed to load attendance record'
          });
        })
      );
  }

  updateAttendanceRecord(recordId: string, updates: Partial<AttendanceRecord>): Observable<ApiResponse<AttendanceRecord>> {
    console.log('AttendanceService: Updating attendance record', { recordId, updates });
    
    return this.http.put<any>(`${this.API_URL}/attendance/${recordId}`, updates)
      .pipe(
        map(response => {
          console.log('AttendanceService: Update attendance record response', response);
          
          if (response.success !== undefined) {
            return response;
          } else {
            return {
              success: true,
              message: 'Attendance record updated successfully',
              data: response
            };
          }
        }),
        catchError(error => {
          console.error('AttendanceService: Error updating attendance record', error);
          return of({
            success: false,
            message: error.error?.message || error.message || 'Failed to update attendance record'
          });
        })
      );
  }

  getAttendanceStats(userId?: string, startDate?: string, endDate?: string): Observable<ApiResponse<{
    totalEvents: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    attendanceRate: number;
  }>> {
    let params = new HttpParams();
    
    if (userId) params = params.set('userId', userId);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    console.log('AttendanceService: Getting attendance stats', { userId, startDate, endDate });
    
    return this.http.get<any>(`${this.API_URL}/attendance/stats`, { params })
      .pipe(
        map(response => {
          console.log('AttendanceService: Attendance stats response', response);
          
          if (response.success !== undefined) {
            return response;
          } else {
            return {
              success: true,
              message: 'Attendance stats retrieved successfully',
              data: response
            };
          }
        }),
        catchError(error => {
          console.error('AttendanceService: Error getting attendance stats', error);
          return of({
            success: false,
            message: error.message || 'Failed to load attendance stats',
            data: {
              totalEvents: 0,
              presentCount: 0,
              lateCount: 0,
              absentCount: 0,
              attendanceRate: 0
            }
          });
        })
      );
  }
}
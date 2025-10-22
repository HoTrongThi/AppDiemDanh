import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Event, ApiResponse, AttendanceRecord } from '../models/api.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getEvents(page: number = 1, pageSize: number = 10): Observable<ApiResponse<{
    events: Event[];
    pagination: {
      currentPage: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
    };
  }>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    console.log('EventService: Getting events from backend', { page, pageSize });
    
    return this.http.get<any>(`${this.API_URL}/events`, { params })
      .pipe(
        map(response => {
          console.log('EventService: Raw backend response', response);
          
          // Handle different response formats
          if (response.success !== undefined) {
            // Already in ApiResponse format
            return response;
          } else if (Array.isArray(response)) {
            // Direct array response
            return {
              success: true,
              message: 'Events retrieved successfully',
              data: {
                events: response,
                pagination: {
                  currentPage: page,
                  pageSize: pageSize,
                  totalCount: response.length,
                  totalPages: Math.ceil(response.length / pageSize)
                }
              }
            };
          } else if (response.data || response.events) {
            // Wrapped response
            const events = response.data || response.events || [];
            return {
              success: true,
              message: 'Events retrieved successfully',
              data: {
                events: events,
                pagination: response.pagination || {
                  currentPage: page,
                  pageSize: pageSize,
                  totalCount: events.length,
                  totalPages: Math.ceil(events.length / pageSize)
                }
              }
            };
          } else {
            // Unknown format
            console.warn('EventService: Unknown response format', response);
            return {
              success: true,
              message: 'Events retrieved successfully',
              data: {
                events: [],
                pagination: {
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
          console.error('EventService: Error getting events', error);
          
          // Return empty result instead of throwing error
          return of({
            success: false,
            message: error.message || 'Failed to load events',
            data: {
              events: [],
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

  getEvent(id: string): Observable<ApiResponse<Event>> {
    console.log('EventService: Getting event by id', id);
    
    return this.http.get<any>(`${this.API_URL}/events/${id}`)
      .pipe(
        map(response => {
          console.log('EventService: Get event response', response);
          
          if (response.success !== undefined) {
            return response;
          } else {
            return {
              success: true,
              message: 'Event retrieved successfully',
              data: response
            };
          }
        }),
        catchError(error => {
          console.error('EventService: Error getting event', error);
          return of({
            success: false,
            message: error.message || 'Failed to load event'
          });
        })
      );
  }

  createEvent(event: Partial<Event>): Observable<ApiResponse<{ id: string }>> {
    console.log('EventService: Creating event', event);
    
    return this.http.post<any>(`${this.API_URL}/events`, event)
      .pipe(
        map(response => {
          console.log('EventService: Create event response', response);
          
          if (response.success !== undefined) {
            return response;
          } else {
            return {
              success: true,
              message: 'Event created successfully',
              data: { id: response.id || response }
            };
          }
        }),
        catchError(error => {
          console.error('EventService: Error creating event', error);
          return of({
            success: false,
            message: error.message || 'Failed to create event'
          });
        })
      );
  }

  updateEvent(id: string, event: Partial<Event>): Observable<ApiResponse<Event>> {
    console.log('EventService: Updating event', { id, event });
    
    return this.http.put<any>(`${this.API_URL}/events/${id}`, event)
      .pipe(
        map(response => {
          console.log('EventService: Update event response', response);
          
          if (response.success !== undefined) {
            return response;
          } else {
            return {
              success: true,
              message: 'Event updated successfully',
              data: response
            };
          }
        }),
        catchError(error => {
          console.error('EventService: Error updating event', error);
          return of({
            success: false,
            message: error.error?.message || error.message || 'Failed to update event'
          });
        })
      );
  }

  getNearbyEvents(latitude: number, longitude: number, radiusKm: number = 5): Observable<ApiResponse<Event[]>> {
    const params = new HttpParams()
      .set('latitude', latitude.toString())
      .set('longitude', longitude.toString())
      .set('radiusKm', radiusKm.toString());

    console.log('EventService: Getting nearby events', { latitude, longitude, radiusKm });
    
    return this.http.get<any>(`${this.API_URL}/events/nearby`, { params })
      .pipe(
        map(response => {
          console.log('EventService: Nearby events response', response);
          
          if (response.success !== undefined) {
            return response;
          } else if (Array.isArray(response)) {
            return {
              success: true,
              message: 'Nearby events retrieved successfully',
              data: response
            };
          } else {
            return {
              success: true,
              message: 'Nearby events retrieved successfully',
              data: response.data || []
            };
          }
        }),
        catchError(error => {
          console.error('EventService: Error getting nearby events', error);
          return of({
            success: false,
            message: error.message || 'Failed to load nearby events',
            data: []
          });
        })
      );
  }

  getEventAttendance(eventId: string): Observable<ApiResponse<AttendanceRecord[]>> {
    console.log('EventService: Getting event attendance', eventId);
    
    return this.http.get<any>(`${this.API_URL}/events/${eventId}/attendance`)
      .pipe(
        map(response => {
          console.log('EventService: Event attendance response', response);
          
          if (response.success !== undefined) {
            return response;
          } else if (Array.isArray(response)) {
            return {
              success: true,
              message: 'Attendance records retrieved successfully',
              data: response
            };
          } else {
            return {
              success: true,
              message: 'Attendance records retrieved successfully',
              data: response.data || []
            };
          }
        }),
        catchError(error => {
          console.error('EventService: Error getting event attendance', error);
          return of({
            success: false,
            message: error.message || 'Failed to load attendance records',
            data: []
          });
        })
      );
  }

  getEventParticipants(eventId: string, status?: string): Observable<ApiResponse<any[]>> {
    console.log('EventService: Getting event participants', eventId);
    
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    
    return this.http.get<any>(`${this.API_URL}/events/${eventId}/participants`, { params })
      .pipe(
        map(response => {
          console.log('EventService: Event participants response', response);
          
          if (response.success !== undefined) {
            return response;
          } else if (Array.isArray(response)) {
            return {
              success: true,
              message: 'Participants retrieved successfully',
              data: response
            };
          } else {
            return {
              success: true,
              message: 'Participants retrieved successfully',
              data: response.data || []
            };
          }
        }),
        catchError(error => {
          console.error('EventService: Error getting event participants', error);
          return of({
            success: false,
            message: error.message || 'Failed to load participants',
            data: []
          });
        })
      );
  }

  addParticipants(eventId: string, userIds: string[]): Observable<ApiResponse<any>> {
    console.log('EventService: Adding participants', { eventId, userIds });
    
    return this.http.post<any>(`${this.API_URL}/events/${eventId}/participants`, { userIds })
      .pipe(
        map(response => {
          console.log('EventService: Add participants response', response);
          return response.success !== undefined ? response : {
            success: true,
            message: 'Participants added successfully',
            data: response
          };
        }),
        catchError(error => {
          console.error('EventService: Error adding participants', error);
          return of({
            success: false,
            message: error.error?.message || error.message || 'Failed to add participants'
          });
        })
      );
  }

  removeParticipant(eventId: string, participantId: string): Observable<ApiResponse<any>> {
    console.log('EventService: Removing participant', { eventId, participantId });
    
    return this.http.delete<any>(`${this.API_URL}/events/${eventId}/participants/${participantId}`)
      .pipe(
        map(response => {
          console.log('EventService: Remove participant response', response);
          return response.success !== undefined ? response : {
            success: true,
            message: 'Participant removed successfully'
          };
        }),
        catchError(error => {
          console.error('EventService: Error removing participant', error);
          return of({
            success: false,
            message: error.error?.message || error.message || 'Failed to remove participant'
          });
        })
      );
  }

  updateParticipantStatus(eventId: string, participantId: string, status: string): Observable<ApiResponse<any>> {
    console.log('EventService: Updating participant status', { eventId, participantId, status });
    
    return this.http.patch<any>(`${this.API_URL}/events/${eventId}/participants/${participantId}/status`, { status })
      .pipe(
        map(response => {
          console.log('EventService: Update participant status response', response);
          return response.success !== undefined ? response : {
            success: true,
            message: 'Participant status updated successfully',
            data: response
          };
        }),
        catchError(error => {
          console.error('EventService: Error updating participant status', error);
          return of({
            success: false,
            message: error.error?.message || error.message || 'Failed to update participant status'
          });
        })
      );
  }

  getAvailableUsers(eventId: string, search?: string): Observable<ApiResponse<any[]>> {
    console.log('EventService: Getting available users', { eventId, search });
    
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    
    return this.http.get<any>(`${this.API_URL}/events/${eventId}/participants/available`, { params })
      .pipe(
        map(response => {
          console.log('EventService: Available users response', response);
          return response.success !== undefined ? response : {
            success: true,
            message: 'Available users retrieved successfully',
            data: response.data || response || []
          };
        }),
        catchError(error => {
          console.error('EventService: Error getting available users', error);
          return of({
            success: false,
            message: error.message || 'Failed to load available users',
            data: []
          });
        })
      );
  }

  updateEventStatus(eventId: string, status: string): Observable<ApiResponse<any>> {
    console.log('EventService: Updating event status', { eventId, status });
    
    return this.http.patch<any>(`${this.API_URL}/events/${eventId}/status`, { status })
      .pipe(
        map(response => {
          console.log('EventService: Update event status response', response);
          return response.success !== undefined ? response : {
            success: true,
            message: 'Event status updated successfully',
            data: response
          };
        }),
        catchError(error => {
          console.error('EventService: Error updating event status', error);
          return of({
            success: false,
            message: error.error?.message || error.message || 'Failed to update event status'
          });
        })
      );
  }

  deleteEvent(eventId: string): Observable<ApiResponse<any>> {
    console.log('EventService: Deleting event', eventId);
    
    return this.http.delete<any>(`${this.API_URL}/events/${eventId}`)
      .pipe(
        map(response => {
          console.log('EventService: Delete event response', response);
          return response.success !== undefined ? response : {
            success: true,
            message: 'Event deleted successfully'
          };
        }),
        catchError(error => {
          console.error('EventService: Error deleting event', error);
          return of({
            success: false,
            message: error.error?.message || error.message || 'Failed to delete event'
          });
        })
      );
  }

  exportAttendanceCSV(eventId: string): Observable<Blob> {
    console.log('EventService: Exporting attendance CSV', eventId);
    
    return this.http.get(`${this.API_URL}/reports/event/${eventId}/attendance/csv`, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('EventService: Error exporting attendance CSV', error);
        throw error;
      })
    );
  }

  exportParticipantsCSV(eventId: string): Observable<Blob> {
    console.log('EventService: Exporting participants CSV', eventId);
    
    return this.http.get(`${this.API_URL}/reports/event/${eventId}/participants/csv`, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('EventService: Error exporting participants CSV', error);
        throw error;
      })
    );
  }

  getEventSummary(eventId: string): Observable<ApiResponse<any>> {
    console.log('EventService: Getting event summary', eventId);
    
    return this.http.get<any>(`${this.API_URL}/reports/event/${eventId}/summary`)
      .pipe(
        map(response => {
          console.log('EventService: Event summary response', response);
          return response.success !== undefined ? response : {
            success: true,
            message: 'Event summary retrieved successfully',
            data: response
          };
        }),
        catchError(error => {
          console.error('EventService: Error getting event summary', error);
          return of({
            success: false,
            message: error.message || 'Failed to load event summary'
          });
        })
      );
  }

  getManagerStatistics(): Observable<ApiResponse<any>> {
    console.log('EventService: Getting manager statistics');
    
    return this.http.get<any>(`${this.API_URL}/reports/manager/statistics`)
      .pipe(
        map(response => {
          console.log('EventService: Manager statistics response', response);
          return response.success !== undefined ? response : {
            success: true,
            message: 'Manager statistics retrieved successfully',
            data: response
          };
        }),
        catchError(error => {
          console.error('EventService: Error getting manager statistics', error);
          return of({
            success: false,
            message: error.message || 'Failed to load manager statistics'
          });
        })
      );
  }
}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { User, ApiResponse } from '../models/api.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCurrentUserProfile(): Observable<ApiResponse<User>> {
    console.log('UserService: Getting current user profile');
    
    return this.http.get<User>(`${this.API_URL}/users/profile`)
      .pipe(
        map(response => {
          console.log('UserService: Get profile response', response);
          return {
            success: true,
            message: 'Profile retrieved successfully',
            data: response
          };
        }),
        catchError(error => {
          console.error('UserService: Error getting profile', error);
          return of({
            success: false,
            message: error.error || error.message || 'Failed to load profile'
          });
        })
      );
  }

  updateUserProfile(profileData: Partial<User>): Observable<ApiResponse<User>> {
    console.log('UserService: Updating user profile', profileData);
    
    // Convert to PascalCase for backend
    const payload = {
      Username: profileData.username,
      Email: profileData.email,
      FullName: profileData.fullName,
      PhoneNumber: profileData.phoneNumber
    };
    
    console.log('UserService: Sending payload', payload);
    
    return this.http.put<User>(`${this.API_URL}/users/profile`, payload)
      .pipe(
        map(response => {
          console.log('UserService: Update profile response', response);
          return {
            success: true,
            message: 'Profile updated successfully',
            data: response
          };
        }),
        catchError(error => {
          console.error('UserService: Error updating profile', error);
          console.error('UserService: Error details:', {
            status: error.status,
            statusText: error.statusText,
            error: error.error,
            message: error.message
          });
          
          // Extract error message properly
          let errorMessage = 'Failed to update profile';
          
          if (error.error) {
            // Check for validation errors (ASP.NET Core format)
            if (error.error.errors) {
              const validationErrors = error.error.errors;
              const errorMessages = Object.keys(validationErrors)
                .map(key => `${key}: ${validationErrors[key].join(', ')}`)
                .join('; ');
              errorMessage = errorMessages || error.error.title || 'Validation failed';
            } else if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.title) {
              errorMessage = error.error.title;
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          console.error('UserService: Final error message:', errorMessage);
          
          return of({
            success: false,
            message: errorMessage
          });
        })
      );
  }

  getUserById(userId: string): Observable<ApiResponse<User>> {
    console.log('UserService: Getting user by ID', userId);
    
    return this.http.get<User>(`${this.API_URL}/users/${userId}`)
      .pipe(
        map(response => {
          console.log('UserService: Get user response', response);
          return {
            success: true,
            message: 'User retrieved successfully',
            data: response
          };
        }),
        catchError(error => {
          console.error('UserService: Error getting user', error);
          return of({
            success: false,
            message: error.error || error.message || 'Failed to load user'
          });
        })
      );
  }


}
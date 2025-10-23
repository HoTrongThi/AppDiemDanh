import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: {
    id: string;
    name: string;
    displayName: string;
  };
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  roleId: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
}

export interface UsersResponse {
  success: boolean;
  data: {
    users: AdminUser[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  message?: string;
}

export interface UserResponse {
  success: boolean;
  data: AdminUser;
  message?: string;
}

export interface RolesResponse {
  success: boolean;
  data: Role[];
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Get all users with pagination and filters
  getUsers(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    roleFilter?: string,
    isActive?: boolean
  ): Observable<UsersResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }
    if (roleFilter) {
      params = params.set('roleFilter', roleFilter);
    }
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }

    return this.http.get<any>(`${this.API_URL}/admin/users`, { params }).pipe(
      map((response: any) => {
        if (response.success && response.data && response.data.users) {
          // Map PascalCase to camelCase
          response.data.users = response.data.users.map((user: any) => ({
            id: user.Id,
            username: user.Username,
            email: user.Email,
            fullName: user.FullName,
            phoneNumber: user.PhoneNumber,
            role: {
              id: user.Role?.Id,
              name: user.Role?.Name,
              displayName: user.Role?.DisplayName
            },
            isActive: user.IsActive,
            emailVerified: user.EmailVerified,
            lastLoginAt: user.LastLoginAt,
            createdAt: user.CreatedAt,
            updatedAt: user.UpdatedAt
          }));
        }
        return response;
      })
    );
  }

  // Get user by ID
  getUser(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.API_URL}/admin/users/${id}`);
  }

  // Create new user
  createUser(user: CreateUserRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.API_URL}/admin/users`, user);
  }

  // Update user
  updateUser(id: string, user: UpdateUserRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.API_URL}/admin/users/${id}`, user);
  }

  // Delete user
  deleteUser(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/admin/users/${id}`);
  }

  // Get all roles
  getRoles(): Observable<RolesResponse> {
    return this.http.get<any>(`${this.API_URL}/admin/users/roles`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          // Map PascalCase to camelCase
          response.data = response.data.map((role: any) => ({
            id: role.Id,
            name: role.Name,
            displayName: role.DisplayName,
            description: role.Description
          }));
        }
        return response;
      })
    );
  }

  // Get dashboard statistics
  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/admin/stats/dashboard`);
  }

  // Organization Management
  getOrganizations(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/admin/organizations`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          response.data = response.data.map((org: any) => ({
            id: org.Id,
            name: org.Name,
            description: org.Description,
            type: org.Type,
            code: org.Code,
            parentId: org.ParentId,
            parentName: org.ParentName,
            isActive: org.IsActive,
            memberCount: org.MemberCount,
            createdAt: org.CreatedAt,
            updatedAt: org.UpdatedAt
          }));
        }
        return response;
      })
    );
  }

  getOrganization(id: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/admin/organizations/${id}`);
  }

  createOrganization(data: any): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/admin/organizations`, data);
  }

  updateOrganization(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/admin/organizations/${id}`, data);
  }

  deleteOrganization(id: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/admin/organizations/${id}`);
  }

  getOrganizationMembers(id: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/admin/organizations/${id}/members`);
  }

  addOrganizationMember(id: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/admin/organizations/${id}/members`, data);
  }

  removeOrganizationMember(id: string, userId: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/admin/organizations/${id}/members/${userId}`);
  }

  // Event Management
  getAdminEvents(page: number = 1, pageSize: number = 10, search?: string, status?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);
    
    return this.http.get<any>(`${this.API_URL}/admin/events`, { params }).pipe(
      map((response: any) => {
        if (response.success && response.data && response.data.events) {
          response.data.events = response.data.events.map((event: any) => ({
            id: event.Id,
            name: event.Name,
            description: event.Description,
            location: event.Location,
            startTime: event.StartTime,
            endTime: event.EndTime,
            status: event.Status,
            requireGps: event.RequireGps,
            radiusMeters: event.RadiusMeters,
            creator: {
              id: event.Creator?.Id,
              username: event.Creator?.Username,
              fullName: event.Creator?.FullName
            },
            participantCount: event.ParticipantCount,
            attendanceCount: event.AttendanceCount,
            createdAt: event.CreatedAt,
            updatedAt: event.UpdatedAt
          }));
        }
        return response;
      })
    );
  }

  getAdminEvent(id: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/admin/events/${id}`);
  }

  updateAdminEvent(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/admin/events/${id}`, data);
  }

  deleteAdminEvent(id: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/admin/events/${id}`);
  }

  getEventAttendance(id: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/admin/events/${id}/attendance`);
  }
}

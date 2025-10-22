import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { LoginRequest, LoginResponse, RegisterRequest, User, ApiResponse, FlexibleLoginResponse } from '../models/api.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();

  constructor(
    private http: HttpClient
  ) {
    // Load user from localStorage on service init
    const savedUser = localStorage.getItem('currentUser');
    const savedToken = localStorage.getItem('token');
    
    console.log('AuthService: Initializing with saved data', { savedUser, savedToken });
    
    if (savedUser && savedToken) {
      try {
        const user = JSON.parse(savedUser);
        this.currentUserSubject.next(user);
        this.tokenSubject.next(savedToken);
        console.log('AuthService: Restored auth state', { user, token: savedToken });
      } catch (error) {
        console.error('AuthService: Error parsing saved user data', error);
        this.clearAuthData();
      }
    }
  }

  register(userData: RegisterRequest): Observable<ApiResponse<{ message: string }>> {
    console.log('AuthService: Using backend API for register');
    return this.http.post<ApiResponse<{ message: string }>>(`${this.API_URL}/auth/register`, userData);
  }

  login(credentials: LoginRequest): Observable<FlexibleLoginResponse> {
    console.log('AuthService: Using backend API for login');
    return this.http.post<FlexibleLoginResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap((response: FlexibleLoginResponse) => {
          console.log('AuthService: Processing login response', response);
          
          // Handle different response formats from backend
          let token: string;
          let user: any;
          
          if (response.success && response.data) {
            // Standard ApiResponse format
            token = response.data.token;
            user = response.data.user;
          } else if (response.token && response.user) {
            // Direct response format
            token = response.token;
            user = response.user;
          } else if (response.token) {
            // Token only format - need to decode or make another call for user info
            token = response.token;
            user = this.decodeTokenUser(token) || {
              id: 'unknown',
              username: credentials.username,
              email: credentials.username,
              fullName: 'User',
              role: 'User',
              permissions: {}
            };
          } else {
            console.error('AuthService: Unexpected response format', response);
            return;
          }
          
          console.log('AuthService: Saving token and user', { token, user });
          
          // Save to localStorage
          localStorage.setItem('token', token);
          localStorage.setItem('currentUser', JSON.stringify(user));
          
          // Update subjects
          this.tokenSubject.next(token);
          this.currentUserSubject.next(user);
          
          console.log('AuthService: Auth state updated, isAuthenticated:', this.isAuthenticated());
        })
      );
  }

  logout(): void {
    console.log('AuthService: Logging out user');
    this.clearAuthData();
  }

  private clearAuthData(): void {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    
    // Clear subjects
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
    
    console.log('AuthService: Auth data cleared');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const isAuth = !!token;
    console.log('AuthService: isAuthenticated check', { token, isAuth });
    return isAuth;
  }

  getToken(): string | null {
    return this.tokenSubject.value || localStorage.getItem('token');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    const roleData = user.role || (user as any).Role;
    let role: string;
    
    if (typeof roleData === 'object' && roleData) {
      role = roleData.Name || roleData.name || '';
    } else {
      role = roleData || '';
    }
    
    return role === 'Admin' || role === 'SuperAdmin';
  }

  isSuperAdmin(): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    const roleData = user.role || (user as any).Role;
    let role: string;
    
    if (typeof roleData === 'object' && roleData) {
      role = roleData.Name || roleData.name || '';
    } else {
      role = roleData || '';
    }
    
    return role === 'SuperAdmin';
  }

  testDatabase(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/auth/test-db`);
  }

  // Debug method to check auth state
  debugAuthState(): void {
    console.log('=== AUTH STATE DEBUG ===');
    console.log('Token from subject:', this.tokenSubject.value);
    console.log('User from subject:', this.currentUserSubject.value);
    console.log('Token from localStorage:', localStorage.getItem('token'));
    console.log('User from localStorage:', localStorage.getItem('currentUser'));
    console.log('isAuthenticated():', this.isAuthenticated());
    console.log('========================');
  }

  // Get appropriate dashboard route based on user role
  getDashboardRoute(): string {
    const user = this.getCurrentUser();
    if (!user) return '/login';
    
    console.log('AuthService: getDashboardRoute - user:', user);
    
    // Extract role name from different formats
    const roleData = user.role || (user as any).Role;
    let role: string;
    
    if (typeof roleData === 'object' && roleData) {
      // Handle object format: {Name: "Manager"} or {name: "Manager"}
      role = roleData.Name || roleData.name || '';
    } else {
      // Handle string format
      role = roleData || '';
    }
    
    console.log('AuthService: getDashboardRoute - extracted role:', role);
    
    switch (role) {
      case 'Admin':
        return '/admin';
      case 'Manager':
        return '/manager';
      case 'User':
      default:
        return '/dashboard';
    }
  }

  // Update current user data
  updateCurrentUser(user: User): void {
    console.log('AuthService: Updating current user', user);
    
    // Normalize user data to camelCase format
    const normalizedUser: any = {
      id: (user as any).id || (user as any).Id,
      username: (user as any).username || (user as any).Username,
      email: (user as any).email || (user as any).Email,
      fullName: (user as any).fullName || (user as any).FullName,
      phoneNumber: (user as any).phoneNumber || (user as any).PhoneNumber,
      role: (user as any).role || (user as any).Role,
      permissions: (user as any).permissions || (user as any).Permissions || {},
      isActive: (user as any).isActive !== undefined ? (user as any).isActive : (user as any).IsActive,
      emailVerified: (user as any).emailVerified !== undefined ? (user as any).emailVerified : (user as any).EmailVerified,
      lastLoginAt: (user as any).lastLoginAt || (user as any).LastLoginAt,
      createdAt: (user as any).createdAt || (user as any).CreatedAt,
      updatedAt: (user as any).updatedAt || (user as any).UpdatedAt
    };
    
    // Normalize role if it's an object
    if (typeof normalizedUser.role === 'object' && normalizedUser.role) {
      const roleName = normalizedUser.role.Name || normalizedUser.role.name;
      normalizedUser.role = roleName; // Convert to string for consistency
    }
    
    console.log('AuthService: Normalized user', normalizedUser);
    
    // Update localStorage
    localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
    
    // Update subject
    this.currentUserSubject.next(normalizedUser);
    
    console.log('AuthService: Current user updated successfully');
  }

  // Decode user info from JWT token (basic implementation)
  private decodeTokenUser(token: string): any {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      console.log('AuthService: Decoded token payload', decoded);
      
      // Extract user info from token claims
      return {
        id: decoded.sub || decoded.userId || 'unknown',
        username: decoded.username || decoded.name || 'user',
        email: decoded.email || '',
        fullName: decoded.fullName || decoded.name || 'User',
        role: decoded.role || 'User',
        permissions: decoded.permissions || {}
      };
    } catch (error) {
      console.error('AuthService: Error decoding token', error);
      return null;
    }
  }
}
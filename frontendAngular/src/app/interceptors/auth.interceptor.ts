import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Get the auth token from the service
  const authToken = authService.getToken();

  // Clone the request and add the authorization header if token exists
  let authReq = req;
  if (authToken) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${authToken}`
      }
    });
  }

  // Send the cloned request with header to the next handler
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      console.log('AuthInterceptor: HTTP Error', {
        status: error.status,
        url: error.url,
        message: error.message
      });
      
      // Handle 401 Unauthorized errors
      if (error.status === 401) {
        console.warn('AuthInterceptor: 401 Unauthorized - Token might be expired or invalid');
        
        // Only logout if this is an auth-related endpoint
        if (error.url?.includes('/auth/') || error.url?.includes('/user/')) {
          console.log('AuthInterceptor: Auth endpoint failed, logging out');
          authService.logout();
          setTimeout(() => router.navigate(['/login']), 0);
        } else {
          console.log('AuthInterceptor: Non-auth endpoint failed, not logging out');
        }
      }
      
      return throwError(() => error);
    })
  );
};
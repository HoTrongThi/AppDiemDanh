import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('AuthGuard: Checking authentication...');
  
  const isAuth = authService.isAuthenticated();
  console.log('AuthGuard: Authentication status:', isAuth);
  
  if (isAuth) {
    console.log('AuthGuard: User is authenticated, allowing access');
    return true;
  } else {
    console.log('AuthGuard: User not authenticated, redirecting to login');
    router.navigate(['/login']);
    return false;
  }
};

export const loginGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('LoginGuard: Checking if user should access login page...');
  
  const isAuth = authService.isAuthenticated();
  console.log('LoginGuard: Authentication status:', isAuth);
  
  if (isAuth) {
    console.log('LoginGuard: User already authenticated, redirecting to appropriate dashboard');
    const dashboardRoute = authService.getDashboardRoute();
    console.log('LoginGuard: Redirecting to:', dashboardRoute);
    
    // Use immediate navigation without setTimeout to avoid timing issues
    router.navigate([dashboardRoute]);
    return false;
  } else {
    console.log('LoginGuard: User not authenticated, allowing access to login');
    return true;
  }
};
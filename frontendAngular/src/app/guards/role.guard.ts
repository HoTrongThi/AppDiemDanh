import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  private redirectCount = 0;
  private maxRedirects = 3;
  private lastRedirectTime = 0;
  private redirectResetInterval = 5000; // 5 seconds

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    console.log('RoleGuard: canActivate called for route:', route.routeConfig?.path);
    console.log('RoleGuard: Redirect count:', this.redirectCount);
    
    // Reset redirect count if enough time has passed
    const now = Date.now();
    if (now - this.lastRedirectTime > this.redirectResetInterval) {
      console.log('RoleGuard: Resetting redirect count due to time interval');
      this.redirectCount = 0;
    }
    
    // Prevent infinite redirect loops
    if (this.redirectCount >= this.maxRedirects) {
      console.error('RoleGuard: Max redirects reached, stopping to prevent infinite loop');
      this.redirectCount = 0;
      this.router.navigate(['/login']);
      return false;
    }
    
    const user = this.authService.getCurrentUser();
    const requiredRoles = route.data['roles'] as string[];
    
    console.log('RoleGuard: User from auth service:', user);
    console.log('RoleGuard: Required roles:', requiredRoles);

    // Check for role in different formats
    const hasRole = user && (user.role || (user as any).Role);
    
    if (!user || !hasRole) {
      console.log('RoleGuard: No user or role found, redirecting to login');
      console.log('RoleGuard: User exists:', !!user);
      console.log('RoleGuard: User role exists:', !!user?.role);
      console.log('RoleGuard: User Role (PascalCase) exists:', !!(user as any)?.Role);
      this.redirectCount++;
      this.lastRedirectTime = now;
      this.router.navigate(['/login']);
      return false;
    }
    
    // Extract role name from different formats
    const roleData = user.role || (user as any).Role;
    let userRole: string;
    
    if (typeof roleData === 'object' && roleData) {
      // Handle object format: {Name: "Manager"} or {name: "Manager"}
      userRole = roleData.Name || roleData.name || '';
    } else {
      // Handle string format
      userRole = roleData || '';
    }
    
    console.log('RoleGuard: Role data:', roleData);
    console.log('RoleGuard: Extracted user role:', userRole);
    
    console.log('RoleGuard: Checking role access', {
      route: route.routeConfig?.path,
      user: user.username,
      userRole: userRole,
      requiredRoles: requiredRoles
    });

    if (!requiredRoles || requiredRoles.length === 0) {
      console.log('RoleGuard: No role requirements, allowing access');
      return true;
    }

    const hasRequiredRole = requiredRoles.includes(userRole);
    
    if (!hasRequiredRole) {
      console.log('RoleGuard: User does not have required role, redirecting to appropriate dashboard');
      // Redirect to appropriate dashboard based on user role
      this.redirectCount++;
      this.lastRedirectTime = now;
      this.redirectToRoleDashboard(userRole);
      return false;
    }

    console.log('RoleGuard: User has required role, allowing access');
    // Reset redirect count on successful access
    this.redirectCount = 0;
    return true;
  }

  private redirectToRoleDashboard(userRole: string): void {
    console.log('RoleGuard: Redirecting user with role', userRole);
    
    // Use AuthService to get the correct dashboard route
    const dashboardRoute = this.authService.getDashboardRoute();
    console.log('RoleGuard: Redirecting to', dashboardRoute);
    
    // Add a small delay to prevent immediate re-triggering
    setTimeout(() => {
      this.router.navigate([dashboardRoute]);
    }, 100);
  }
}
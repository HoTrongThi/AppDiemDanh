import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  hidePassword = true;
  apiUrl = environment.apiUrl;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Check if user is already authenticated
    if (this.authService.isAuthenticated()) {
      console.log('User already authenticated, redirecting to dashboard');
      const dashboardRoute = this.authService.getDashboardRoute();
      this.router.navigate([dashboardRoute]);
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      console.log('Attempting login with:', this.loginForm.value);
      
      this.authService.login(this.loginForm.value).subscribe({
        next: (response) => {
          this.isLoading = false;
          console.log('Login response:', response);
          
          // Check if login was successful based on different response formats
          const isSuccess = response.success === true || 
                           (response.token && (response.user || response.data?.user)) ||
                           response.token; // Token-only response
          
          if (isSuccess) {
            this.snackBar.open('Đăng nhập thành công!', 'Đóng', {
              duration: 2000,
              panelClass: ['success-snackbar']
            });
            
            // Navigate to appropriate dashboard based on user role
            console.log('Login successful, navigating to dashboard...');
            this.authService.debugAuthState();
            const dashboardRoute = this.authService.getDashboardRoute();
            console.log('Redirecting to:', dashboardRoute);
            this.router.navigate([dashboardRoute]);
          } else {
            const errorMessage = response.message || 
                                response.error?.message || 
                                'Đăng nhập thất bại';
            this.snackBar.open(errorMessage, 'Đóng', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Login error:', error);
          const errorMessage = error.error?.message || 'Có lỗi xảy ra khi đăng nhập';
          this.snackBar.open(errorMessage, 'Đóng', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  goToRegister(): void {
    console.log('Navigating to register...');
    this.router.navigate(['/register']).then(success => {
      console.log('Register navigation success:', success);
    }).catch(error => {
      console.error('Register navigation error:', error);
    });
  }


}
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div style="padding: 24px;">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>assessment</mat-icon>
            Thống kê & Báo cáo
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Chức năng đang được phát triển...</p>
          <button mat-raised-button color="primary" (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Quay lại
          </button>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class AdminStatsComponent {
  constructor(private router: Router) {}
  
  goBack(): void {
    this.router.navigate(['/admin']);
  }
}

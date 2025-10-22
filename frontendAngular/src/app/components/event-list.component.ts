import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EventService } from '../services/event.service';
import { AuthService } from '../services/auth.service';
import { Event } from '../models/api.models';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.css']
})
export class EventListComponent implements OnInit {
  events: Event[] = [];
  isLoading = false;

  constructor(
    private eventService: EventService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  loadEvents(): void {
    this.isLoading = true;
    this.eventService.getEvents(1, 50).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.events = response.data.events;
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading events:', error);
      }
    });
  }

  viewEvent(event: Event): void {
    // TODO: Navigate to event detail page
    console.log('View event:', event);
  }

  generateQr(event: Event): void {
    // TODO: Navigate to QR generation for this event
    console.log('Generate QR for event:', event);
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': return 'primary';
      case 'completed': return 'accent';
      case 'cancelled': return 'warn';
      default: return 'basic';
    }
  }

  getStatusText(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': return 'Đang diễn ra';
      case 'completed': return 'Đã kết thúc';
      case 'cancelled': return 'Đã hủy';
      case 'draft': return 'Nháp';
      default: return status;
    }
  }

  formatDateTime(dateTime: string): string {
    const date = new Date(dateTime);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
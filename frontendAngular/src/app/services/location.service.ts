import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { LocationData } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private readonly HIGH_ACCURACY_OPTIONS: PositionOptions = {
    enableHighAccuracy: true,
    timeout: this.DEFAULT_TIMEOUT,
    maximumAge: 60000 // 1 minute
  };

  constructor() {}

  getCurrentLocation(): Observable<LocationData> {
    return from(this.getCurrentLocationPromise());
  }

  private getCurrentLocationPromise(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          resolve(locationData);
        },
        (error) => {
          let errorMessage = 'Unknown location error';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        this.HIGH_ACCURACY_OPTIONS
      );
    });
  }

  watchLocation(): Observable<LocationData> {
    return new Observable(observer => {
      if (!navigator.geolocation) {
        observer.error(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          observer.next(locationData);
        },
        (error) => {
          observer.error(error);
        },
        this.HIGH_ACCURACY_OPTIONS
      );

      // Cleanup function
      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    });
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  isLocationAccurate(accuracy: number, threshold: number = 50): boolean {
    return accuracy <= threshold;
  }

  isWithinRadius(userLat: number, userLon: number, eventLat: number, eventLon: number, radiusMeters: number): boolean {
    const distance = this.calculateDistance(userLat, userLon, eventLat, eventLon);
    return distance <= radiusMeters;
  }

  requestLocationPermission(): Promise<PermissionState> {
    if ('permissions' in navigator) {
      return navigator.permissions.query({ name: 'geolocation' })
        .then(result => result.state);
    }
    
    // Fallback for browsers that don't support permissions API
    return Promise.resolve('prompt' as PermissionState);
  }
}
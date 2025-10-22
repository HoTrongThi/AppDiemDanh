// API Response Models
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// Authentication Models
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  password: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Flexible login response to handle different backend formats
export interface FlexibleLoginResponse {
  success?: boolean;
  message?: string;
  data?: {
    token: string;
    user: User;
  };
  token?: string;
  user?: User;
  error?: {
    message?: string;
    [key: string]: any;
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: {
    name: string;
    id: string;
  } | string;
  permissions?: any;
  isActive?: boolean;
  emailVerified?: boolean;
  lastLoginAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// Event Models
export interface Event {
  id: string;
  name: string;
  description?: string;
  locationName?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  radiusMeters: number;
  startTime: string;
  endTime: string;
  status: string;
  createdBy: string;
  participantCount: number;
  attendanceCount: number;
  qrRefreshIntervalSeconds: number;
  requireGps: boolean;
  allowLateCheckin: boolean;
  lateCheckinMinutes?: number;
}

// QR Code Models
export interface QrSession {
  sessionId: string;
  nonce: string;
  signature: string;
  expiresAt: string;
  qrData: string;
  refreshIntervalSeconds: number;
  // Backend uses PascalCase
  SessionId?: string;
  Nonce?: string;
  Signature?: string;
  ExpiresAt?: string;
  QrData?: string;
  RefreshIntervalSeconds?: number;
}

export interface QrValidationRequest {
  sessionId: string;
  signature: string;
}

export interface QrValidationResponse {
  success: boolean;
  message: string;
  isExpired?: boolean;
  isAlreadyUsed?: boolean;
  data?: {
    sessionId: string;
    eventId: string;
    eventName: string;
    locationName?: string;
    requireGps: boolean;
    radiusMeters: number;
  };
}

// Attendance Models
export interface AttendanceRecord {
  id: string;
  userId: string;
  eventId: string;
  userName?: string;
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;
  status: string;
  checkInMethod: string;
  timestamp: string;
  checkInTime?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracyMeters?: number;
  gpsLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  verifierTokenHash?: string;
  deviceInfo?: any;
  metadata?: any;
  verifiedBy?: string;
  verificationNotes?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CheckInRequest {
  sessionId: string;
  signature: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracy?: number;
  deviceInfo?: any;
}

// Location Models
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}
# 🔲 QR Code Service Documentation

## Overview
Dynamic QR code generation service với HMAC signature và nonce để chống replay attacks.

## Features
- ✅ Dynamic QR generation với expiry time
- ✅ HMAC-SHA256 signature validation
- ✅ Nonce-based replay attack prevention
- ✅ Session management và cleanup
- ✅ Role-based access control
- ✅ Audit logging

## API Endpoints

### 1. Generate QR Session
```http
POST /api/qr/generate/{eventId}
Authorization: Bearer {jwt_token}
Roles: Admin, SuperAdmin
```

**Response:**
```json
{
  "success": true,
  "message": "QR session generated successfully",
  "data": {
    "sessionId": "a1b2c3d4e5f6g7h8",
    "nonce": "base64-encoded-nonce",
    "signature": "hmac-sha256-signature",
    "expiresAt": "2024-01-15T10:30:00Z",
    "qrData": "{\"sessionId\":\"...\",\"eventId\":\"...\"}",
    "refreshIntervalSeconds": 30
  }
}
```

### 2. Get Active QR Session
```http
GET /api/qr/active/{eventId}
Authorization: Bearer {jwt_token}
Roles: Admin, SuperAdmin
```

### 3. Refresh QR Session
```http
POST /api/qr/refresh/{eventId}
Authorization: Bearer {jwt_token}
Roles: Admin, SuperAdmin
```

### 4. Validate QR Session
```http
POST /api/qr/validate
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "sessionId": "a1b2c3d4e5f6g7h8",
  "signature": "hmac-sha256-signature"
}
```

### 5. Get QR for Display (Public)
```http
GET /api/qr/display/{eventId}
```

### 6. Cleanup Expired Sessions
```http
POST /api/qr/cleanup
Authorization: Bearer {jwt_token}
Roles: SuperAdmin
```

## QR Data Format

```json
{
  "sessionId": "a1b2c3d4e5f6g7h8",
  "eventId": "12345678-1234-1234-1234-123456789012",
  "nonce": "base64-encoded-random-bytes",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "expiresAt": "2024-01-15T10:30:00.000Z"
}
```

## Security Features

### HMAC Signature
- Algorithm: HMAC-SHA256
- Key: Configurable secret key
- Data: JSON payload của QR data
- Prevents tampering với QR content

### Nonce System
- 16-byte random nonce per session
- Base64 encoded
- Prevents replay attacks
- Unique per QR generation

### Session Management
- Automatic expiry based on event settings
- Mark as used after successful check-in
- Cleanup expired sessions
- Audit trail

## Configuration

### appsettings.json
```json
{
  "QrSettings": {
    "SecretKey": "your-super-secret-qr-key-change-in-production",
    "DefaultRefreshIntervalSeconds": 30,
    "MaxRefreshIntervalSeconds": 300,
    "MinRefreshIntervalSeconds": 10
  }
}
```

## Usage Flow

### Admin Side (QR Generation)
1. Admin login và get JWT token
2. Call `POST /api/qr/generate/{eventId}`
3. Display QR code từ `qrData` field
4. Auto-refresh theo `refreshIntervalSeconds`

### User Side (QR Scanning)
1. User scan QR code
2. Parse JSON data từ QR
3. Call `POST /api/qr/validate` với sessionId và signature
4. If valid, proceed với check-in process

### Display Screen (Public)
1. Call `GET /api/qr/display/{eventId}`
2. Display QR code
3. Auto-refresh theo interval

## Error Handling

### Common Errors
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing/invalid JWT token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Event/session not found
- `500 Internal Server Error`: Server error

### Validation Errors
- QR session expired
- QR session already used
- Invalid signature
- Session not found

## Testing

### Manual Testing
```bash
# Run the test script
test-qr-service.bat
```

### Unit Testing
```csharp
// Test QR generation
var qrService = new QrCodeService(context, config, logger);
var result = await qrService.GenerateQrSessionAsync(eventId, userId);
Assert.NotNull(result.SessionId);

// Test signature validation
var validation = await qrService.ValidateQrSessionAsync(sessionId, signature, userId);
Assert.True(validation.IsValid);
```

## Performance Considerations

### Database Optimization
- Index on `session_id` for fast lookup
- Index on `expires_at` for cleanup queries
- Cleanup expired sessions regularly

### Caching
- Cache active QR sessions in Redis (future)
- Cache event settings
- Minimize database calls

### Security
- Rotate secret keys regularly
- Monitor for suspicious activity
- Rate limit QR generation
- Log all QR operations

## Future Enhancements

### Planned Features
- [ ] QR code image generation (PNG/SVG)
- [ ] Batch QR generation
- [ ] QR analytics và reporting
- [ ] Custom QR designs
- [ ] Multi-language QR data

### Security Improvements
- [ ] Key rotation mechanism
- [ ] Advanced fraud detection
- [ ] Geofencing validation
- [ ] Device fingerprinting

## Troubleshooting

### Common Issues
1. **Invalid signature**: Check secret key configuration
2. **Session expired**: Increase refresh interval
3. **Permission denied**: Check user roles
4. **Database errors**: Check connection string

### Debug Mode
Enable detailed logging in appsettings.json:
```json
{
  "Logging": {
    "LogLevel": {
      "backendDOTNET.Services.QrCodeService": "Debug"
    }
  }
}
```
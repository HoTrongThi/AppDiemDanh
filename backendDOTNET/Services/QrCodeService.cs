using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using backendDOTNET.Data;
using backendDOTNET.Models;

namespace backendDOTNET.Services
{
    public class QrCodeService : IQrCodeService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<QrCodeService> _logger;

        public QrCodeService(AppDbContext context, IConfiguration configuration, ILogger<QrCodeService> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<QrSessionResponse> GenerateQrSessionAsync(Guid eventId, Guid userId)
        {
            try
            {
                // Get event details
                var eventItem = await _context.Events.FindAsync(eventId);
                if (eventItem == null)
                {
                    throw new ArgumentException("Event not found", nameof(eventId));
                }

                // Check if user has permission to generate QR for this event
                var isCreator = eventItem.CreatedBy == userId;
                var isManagerOrAdmin = await IsUserManagerOrAdminAsync(userId);
                
                if (!isCreator && !isManagerOrAdmin)
                {
                    throw new UnauthorizedAccessException("User does not have permission to generate QR for this event");
                }

                // Generate session data
                var sessionId = GenerateSessionId();
                var nonce = GenerateNonce();
                var timestamp = DateTime.UtcNow;
                var expiresAt = timestamp.AddSeconds(eventItem.QrRefreshIntervalSeconds);

                // Create QR data payload
                var qrData = new
                {
                    sessionId,
                    eventId,
                    nonce,
                    timestamp = timestamp.ToString("O"), // ISO 8601 format
                    expiresAt = expiresAt.ToString("O")
                };

                var qrDataJson = JsonSerializer.Serialize(qrData);
                var signature = GenerateSignature(qrDataJson);

                // Save to database
                var qrSession = new QrSession
                {
                    EventId = eventId,
                    SessionId = sessionId,
                    Nonce = nonce,
                    Signature = signature,
                    ExpiresAt = expiresAt
                };

                _context.QrSessions.Add(qrSession);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Generated QR session {sessionId} for event {eventId} by user {userId}");

                return new QrSessionResponse
                {
                    SessionId = sessionId,
                    Nonce = nonce,
                    Signature = signature,
                    ExpiresAt = expiresAt,
                    QrData = qrDataJson,
                    RefreshIntervalSeconds = eventItem.QrRefreshIntervalSeconds
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error generating QR session for event {eventId}");
                throw;
            }
        }

        public async Task<QrValidationResult> ValidateQrSessionAsync(string sessionId, string signature, Guid userId)
        {
            try
            {
                var session = await _context.QrSessions
                    .Include(qs => qs.Event)
                    .FirstOrDefaultAsync(qs => qs.SessionId == sessionId);

                if (session == null)
                {
                    return new QrValidationResult
                    {
                        IsValid = false,
                        ErrorMessage = "QR session not found"
                    };
                }

                // Check if expired
                if (session.ExpiresAt <= DateTime.UtcNow)
                {
                    return new QrValidationResult
                    {
                        IsValid = false,
                        ErrorMessage = "QR session has expired",
                        Session = session,
                        Event = session.Event,
                        IsExpired = true
                    };
                }

                // Check if already used
                if (session.UsedAt.HasValue)
                {
                    return new QrValidationResult
                    {
                        IsValid = false,
                        ErrorMessage = "QR session has already been used",
                        Session = session,
                        Event = session.Event,
                        IsAlreadyUsed = true
                    };
                }

                // Validate signature
                var qrData = new
                {
                    sessionId = session.SessionId,
                    eventId = session.EventId,
                    nonce = session.Nonce,
                    timestamp = session.CreatedAt.ToString("O"),
                    expiresAt = session.ExpiresAt.ToString("O")
                };

                var qrDataJson = JsonSerializer.Serialize(qrData);
                var expectedSignature = GenerateSignature(qrDataJson);

                if (signature != expectedSignature)
                {
                    _logger.LogWarning($"Invalid QR signature for session {sessionId} by user {userId}");
                    return new QrValidationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Invalid QR signature",
                        Session = session,
                        Event = session.Event
                    };
                }

                return new QrValidationResult
                {
                    IsValid = true,
                    Session = session,
                    Event = session.Event
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error validating QR session {sessionId}");
                return new QrValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "Internal error during validation"
                };
            }
        }

        public async Task<QrSessionResponse?> GetActiveQrSessionAsync(Guid eventId)
        {
            try
            {
                var session = await _context.QrSessions
                    .Include(qs => qs.Event)
                    .Where(qs => qs.EventId == eventId && qs.ExpiresAt > DateTime.UtcNow && !qs.UsedAt.HasValue)
                    .OrderByDescending(qs => qs.CreatedAt)
                    .FirstOrDefaultAsync();

                if (session == null)
                {
                    return null;
                }

                var qrData = new
                {
                    sessionId = session.SessionId,
                    eventId = session.EventId,
                    nonce = session.Nonce,
                    timestamp = session.CreatedAt.ToString("O"),
                    expiresAt = session.ExpiresAt.ToString("O")
                };

                return new QrSessionResponse
                {
                    SessionId = session.SessionId,
                    Nonce = session.Nonce,
                    Signature = session.Signature,
                    ExpiresAt = session.ExpiresAt,
                    QrData = JsonSerializer.Serialize(qrData),
                    RefreshIntervalSeconds = session.Event.QrRefreshIntervalSeconds
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting active QR session for event {eventId}");
                return null;
            }
        }

        public async Task<QrSessionResponse> RefreshQrSessionAsync(Guid eventId, Guid userId)
        {
            try
            {
                // Mark existing sessions as expired
                var existingSessions = await _context.QrSessions
                    .Where(qs => qs.EventId == eventId && qs.ExpiresAt > DateTime.UtcNow)
                    .ToListAsync();

                foreach (var session in existingSessions)
                {
                    session.ExpiresAt = DateTime.UtcNow; // Mark as expired
                }

                await _context.SaveChangesAsync();

                // Generate new session
                return await GenerateQrSessionAsync(eventId, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error refreshing QR session for event {eventId}");
                throw;
            }
        }

        public async Task MarkQrSessionAsUsedAsync(string sessionId, Guid userId)
        {
            try
            {
                var session = await _context.QrSessions
                    .FirstOrDefaultAsync(qs => qs.SessionId == sessionId);

                if (session != null)
                {
                    session.UsedAt = DateTime.UtcNow;
                    session.UsedByUserId = userId;
                    await _context.SaveChangesAsync();

                    _logger.LogInformation($"Marked QR session {sessionId} as used by user {userId}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error marking QR session {sessionId} as used");
                throw;
            }
        }

        public async Task<int> CleanupExpiredSessionsAsync()
        {
            try
            {
                var expiredSessions = await _context.QrSessions
                    .Where(qs => qs.ExpiresAt <= DateTime.UtcNow.AddHours(-1)) // Keep for 1 hour after expiry for audit
                    .ToListAsync();

                _context.QrSessions.RemoveRange(expiredSessions);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Cleaned up {expiredSessions.Count} expired QR sessions");
                return expiredSessions.Count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cleaning up expired QR sessions");
                return 0;
            }
        }

        #region Private Methods

        private string GenerateSessionId()
        {
            return Guid.NewGuid().ToString("N")[..16]; // 16 character session ID
        }

        private string GenerateNonce()
        {
            using var rng = RandomNumberGenerator.Create();
            var bytes = new byte[16];
            rng.GetBytes(bytes);
            return Convert.ToBase64String(bytes);
        }

        private string GenerateSignature(string data)
        {
            var secretKey = _configuration["QrSettings:SecretKey"] ?? "default-secret-key-change-in-production";
            var keyBytes = Encoding.UTF8.GetBytes(secretKey);
            var dataBytes = Encoding.UTF8.GetBytes(data);

            using var hmac = new HMACSHA256(keyBytes);
            var hashBytes = hmac.ComputeHash(dataBytes);
            return Convert.ToBase64String(hashBytes);
        }

        private async Task<bool> IsUserManagerOrAdminAsync(Guid userId)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == userId);

            return user?.Role.Name == "Manager" || user?.Role.Name == "Admin" || user?.Role.Name == "SuperAdmin";
        }

        #endregion
    }
}
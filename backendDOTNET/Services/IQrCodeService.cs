using backendDOTNET.Models;

namespace backendDOTNET.Services
{
    public interface IQrCodeService
    {
        /// <summary>
        /// Generate a new QR session for an event
        /// </summary>
        Task<QrSessionResponse> GenerateQrSessionAsync(Guid eventId, Guid userId);
        
        /// <summary>
        /// Validate QR session and signature
        /// </summary>
        Task<QrValidationResult> ValidateQrSessionAsync(string sessionId, string signature, Guid userId);
        
        /// <summary>
        /// Get current active QR session for an event
        /// </summary>
        Task<QrSessionResponse?> GetActiveQrSessionAsync(Guid eventId);
        
        /// <summary>
        /// Refresh QR session (generate new nonce and signature)
        /// </summary>
        Task<QrSessionResponse> RefreshQrSessionAsync(Guid eventId, Guid userId);
        
        /// <summary>
        /// Mark QR session as used
        /// </summary>
        Task MarkQrSessionAsUsedAsync(string sessionId, Guid userId);
        
        /// <summary>
        /// Clean up expired QR sessions
        /// </summary>
        Task<int> CleanupExpiredSessionsAsync();
    }

    public class QrSessionResponse
    {
        public string SessionId { get; set; } = string.Empty;
        public string Nonce { get; set; } = string.Empty;
        public string Signature { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public string QrData { get; set; } = string.Empty; // JSON data for QR code
        public int RefreshIntervalSeconds { get; set; }
    }

    public class QrValidationResult
    {
        public bool IsValid { get; set; }
        public string? ErrorMessage { get; set; }
        public QrSession? Session { get; set; }
        public Event? Event { get; set; }
        public bool IsExpired { get; set; }
        public bool IsAlreadyUsed { get; set; }
    }
}
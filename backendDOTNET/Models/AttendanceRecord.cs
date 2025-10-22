using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace backendDOTNET.Models
{
    public class AttendanceRecord : BaseEntity
    {
        [Required]
        public Guid UserId { get; set; }
        
        [Required]
        public Guid EventId { get; set; }
        
        public AttendanceStatus Status { get; set; } = AttendanceStatus.PendingVerification;
        
        public CheckInMethod CheckInMethod { get; set; }
        
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        
        // Simple GPS coordinates (will upgrade to PostGIS later)
        public double? GpsLatitude { get; set; }
        public double? GpsLongitude { get; set; }
        
        // GPS accuracy in meters
        public float? GpsAccuracyMeters { get; set; }
        
        [StringLength(255)]
        public string? VerifierTokenHash { get; set; }
        
        // Device fingerprint and info
        public JsonDocument? DeviceInfo { get; set; }
        
        // Additional check-in metadata
        public JsonDocument? Metadata { get; set; }
        
        // Admin who verified if manual
        public Guid? VerifiedBy { get; set; }
        
        public string? VerificationNotes { get; set; }
        
        // Navigation properties
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;
        
        [ForeignKey("EventId")]
        public virtual Event Event { get; set; } = null!;
        
        [ForeignKey("VerifiedBy")]
        public virtual User? Verifier { get; set; }
    }
}
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Net;
using System.Text.Json;

namespace backendDOTNET.Models
{
    public class AuditLog : BaseEntity
    {
        public Guid? UserId { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Action { get; set; } = string.Empty; // LOGIN, CHECKIN, QR_GENERATE, etc.
        
        [StringLength(50)]
        public string? EntityType { get; set; } // User, Event, Attendance
        
        public Guid? EntityId { get; set; }
        
        public JsonDocument? Details { get; set; }
        
        public IPAddress? IpAddress { get; set; }
        
        public string? UserAgent { get; set; }
        
        public bool Success { get; set; } = true;
        
        public string? ErrorMessage { get; set; }
        
        // Navigation properties
        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }
}
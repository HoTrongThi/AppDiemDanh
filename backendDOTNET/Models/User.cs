using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace backendDOTNET.Models
{
    public class User : BaseEntity
    {
        [Required]
        [StringLength(50)]
        public string Username { get; set; } = string.Empty;
        
        [Required]
        [StringLength(255)]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        [StringLength(255)]
        [JsonIgnore]
        public string PasswordHash { get; set; } = string.Empty;
        
        [Required]
        [StringLength(255)]
        public string FullName { get; set; } = string.Empty;
        
        [StringLength(20)]
        public string? PhoneNumber { get; set; }
        
        [Required]
        [JsonIgnore]
        public Guid RoleId { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public bool EmailVerified { get; set; } = false;
        
        public DateTime? LastLoginAt { get; set; }
        
        // Navigation properties
        [ForeignKey("RoleId")]
        public virtual Role Role { get; set; } = null!;
        
        [JsonIgnore]
        public virtual ICollection<Event> CreatedEvents { get; set; } = new List<Event>();
        
        [JsonIgnore]
        public virtual ICollection<EventParticipant> EventParticipants { get; set; } = new List<EventParticipant>();
        
        [JsonIgnore]
        public virtual ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();
        
        [JsonIgnore]
        public virtual ICollection<DeviceAttestation> DeviceAttestations { get; set; } = new List<DeviceAttestation>();
        
        [JsonIgnore]
        public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    }
}
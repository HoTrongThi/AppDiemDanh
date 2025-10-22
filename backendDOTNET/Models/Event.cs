using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backendDOTNET.Models
{
    public class Event : BaseEntity
    {
        [Required]
        [StringLength(255)]
        public string Name { get; set; } = string.Empty;
        
        public string? Description { get; set; }
        
        // Simple GPS coordinates (will upgrade to PostGIS later)
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        
        [StringLength(255)]
        public string? LocationName { get; set; }
        
        [Range(1, 10000)]
        public int RadiusMeters { get; set; } = 100;
        
        [Required]
        public DateTime StartTime { get; set; }
        
        [Required]
        public DateTime EndTime { get; set; }
        
        [Required]
        public Guid CreatedBy { get; set; }
        
        public EventStatus Status { get; set; } = EventStatus.Draft;
        
        [Range(10, 300)]
        public int QrRefreshIntervalSeconds { get; set; } = 30;
        
        public int? MaxParticipants { get; set; }
        
        public bool RequireGps { get; set; } = true;
        
        public bool AllowLateCheckin { get; set; } = false;
        
        public int? LateCheckinMinutes { get; set; } = 15;
        
        // Navigation properties
        [ForeignKey("CreatedBy")]
        public virtual User Creator { get; set; } = null!;
        
        public virtual ICollection<EventParticipant> Participants { get; set; } = new List<EventParticipant>();
        
        public virtual ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();
        
        public virtual ICollection<QrSession> QrSessions { get; set; } = new List<QrSession>();
    }
}
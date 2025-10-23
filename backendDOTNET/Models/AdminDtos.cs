using System.ComponentModel.DataAnnotations;

namespace backendDOTNET.Models
{
    // User Management DTOs
    public class CreateUserDto
    {
        [Required]
        [StringLength(50)]
        public string Username { get; set; } = string.Empty;
        
        [Required]
        [EmailAddress]
        [StringLength(255)]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        [StringLength(255)]
        public string Password { get; set; } = string.Empty;
        
        [Required]
        [StringLength(255)]
        public string FullName { get; set; } = string.Empty;
        
        [StringLength(20)]
        public string? PhoneNumber { get; set; }
        
        [Required]
        public Guid RoleId { get; set; }
        
        public List<Guid>? OrganizationIds { get; set; }
    }
    
    public class UpdateUserDto
    {
        [StringLength(50)]
        public string? Username { get; set; }
        
        [EmailAddress]
        [StringLength(255)]
        public string? Email { get; set; }
        
        [StringLength(255)]
        public string? FullName { get; set; }
        
        [StringLength(20)]
        public string? PhoneNumber { get; set; }
        
        public Guid? RoleId { get; set; }
        
        public bool? IsActive { get; set; }
        
        public List<Guid>? OrganizationIds { get; set; }
    }
    
    // Organization DTOs
    public class CreateOrganizationDto
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        [Required]
        [StringLength(50)]
        public string Type { get; set; } = string.Empty;
        
        [StringLength(50)]
        public string? Code { get; set; }
        
        public Guid? ParentId { get; set; }
    }
    
    public class UpdateOrganizationDto
    {
        [StringLength(100)]
        public string? Name { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        [StringLength(50)]
        public string? Type { get; set; }
        
        [StringLength(50)]
        public string? Code { get; set; }
        
        public Guid? ParentId { get; set; }
        
        public bool? IsActive { get; set; }
    }
    
    // Statistics DTOs
    public class AttendanceStatsDto
    {
        public int TotalEvents { get; set; }
        public int TotalUsers { get; set; }
        public int TotalAttendance { get; set; }
        public int PendingVerification { get; set; }
        public double AverageAttendanceRate { get; set; }
        public List<OrganizationStatsDto> OrganizationStats { get; set; } = new();
        public List<EventStatsDto> RecentEventStats { get; set; } = new();
    }
    
    public class OrganizationStatsDto
    {
        public Guid OrganizationId { get; set; }
        public string OrganizationName { get; set; } = string.Empty;
        public int TotalMembers { get; set; }
        public int TotalEvents { get; set; }
        public int TotalAttendance { get; set; }
        public double AttendanceRate { get; set; }
    }
    
    public class EventStatsDto
    {
        public Guid EventId { get; set; }
        public string EventName { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public int TotalParticipants { get; set; }
        public int TotalAttended { get; set; }
        public double AttendanceRate { get; set; }
    }
}

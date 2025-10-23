using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace backendDOTNET.Models
{
    public class Organization : BaseEntity
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        [Required]
        [StringLength(50)]
        public string Type { get; set; } = string.Empty; // Class, Department, Faculty, etc.
        
        [StringLength(50)]
        public string? Code { get; set; } // Mã lớp, mã khoa
        
        public Guid? ParentId { get; set; } // For hierarchical structure
        
        public bool IsActive { get; set; } = true;
        
        // Navigation properties
        [ForeignKey("ParentId")]
        public virtual Organization? Parent { get; set; }
        
        [JsonIgnore]
        public virtual ICollection<Organization> Children { get; set; } = new List<Organization>();
        
        [JsonIgnore]
        public virtual ICollection<UserOrganization> UserOrganizations { get; set; } = new List<UserOrganization>();
    }
    
    // Junction table for many-to-many relationship between Users and Organizations
    public class UserOrganization : BaseEntity
    {
        [Required]
        public Guid UserId { get; set; }
        
        [Required]
        public Guid OrganizationId { get; set; }
        
        [StringLength(50)]
        public string? Role { get; set; } // Role within the organization (Student, Teacher, etc.)
        
        // Navigation properties
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;
        
        [ForeignKey("OrganizationId")]
        public virtual Organization Organization { get; set; } = null!;
    }
}

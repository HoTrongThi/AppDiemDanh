using System.ComponentModel.DataAnnotations;

namespace backendDOTNET.Models
{
    public class UpdateProfileDto
    {
        [StringLength(50)]
        public string? Username { get; set; }
        
        [StringLength(255)]
        [EmailAddress]
        public string? Email { get; set; }
        
        [StringLength(255)]
        public string? FullName { get; set; }
        
        [StringLength(20)]
        public string? PhoneNumber { get; set; }
    }
}

using System.ComponentModel.DataAnnotations;

namespace backendDOTNET.Models
{
    public class RateLimit : BaseEntity
    {
        [Required]
        [StringLength(255)]
        public string Identifier { get; set; } = string.Empty; // IP address or user_id
        
        [Required]
        [StringLength(50)]
        public string ActionType { get; set; } = string.Empty; // QR_SCAN, LOGIN, etc.
        
        public int AttemptCount { get; set; } = 1;
        
        public DateTime WindowStart { get; set; } = DateTime.UtcNow;
        
        public DateTime? BlockedUntil { get; set; }
    }
}
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Net;
using System.Text.Json;

namespace backendDOTNET.Models
{
    public class DeviceAttestation : BaseEntity
    {
        [Required]
        public Guid UserId { get; set; }
        
        [Required]
        [StringLength(255)]
        public string DeviceFingerprint { get; set; } = string.Empty;
        
        [Required]
        public JsonDocument AttestationData { get; set; } = JsonDocument.Parse("{}");
        
        [Required]
        [StringLength(50)]
        public string Platform { get; set; } = string.Empty; // Web, Android, iOS
        
        public string? UserAgent { get; set; }
        
        public IPAddress? IpAddress { get; set; }
        
        public bool IsTrusted { get; set; } = false;
        
        public DateTime LastUsedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;
    }
}
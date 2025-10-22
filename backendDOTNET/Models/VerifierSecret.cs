using System.ComponentModel.DataAnnotations;

namespace backendDOTNET.Models
{
    public class VerifierSecret : BaseEntity
    {
        [Required]
        [StringLength(512)]
        public string SecretKey { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50)]
        public string Algorithm { get; set; } = "HMAC-SHA256";
        
        [Required]
        public DateTime ExpiresAt { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public int RotationVersion { get; set; } = 1;
    }
}
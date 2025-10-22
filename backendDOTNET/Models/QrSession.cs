using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backendDOTNET.Models
{
    public class QrSession : BaseEntity
    {
        [Required]
        public Guid EventId { get; set; }
        
        [Required]
        [StringLength(255)]
        public string SessionId { get; set; } = string.Empty;
        
        [Required]
        [StringLength(255)]
        public string Nonce { get; set; } = string.Empty;
        
        [Required]
        [StringLength(512)]
        public string Signature { get; set; } = string.Empty;
        
        [Required]
        public DateTime ExpiresAt { get; set; }
        
        public DateTime? UsedAt { get; set; }
        
        public Guid? UsedByUserId { get; set; }
        
        // Navigation properties
        [ForeignKey("EventId")]
        public virtual Event Event { get; set; } = null!;
        
        [ForeignKey("UsedByUserId")]
        public virtual User? UsedByUser { get; set; }
    }
}
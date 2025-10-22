using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backendDOTNET.Models
{
    public class EventParticipant : BaseEntity
    {
        [Required]
        public Guid EventId { get; set; }
        
        [Required]
        public Guid UserId { get; set; }
        
        public DateTime InvitedAt { get; set; } = DateTime.UtcNow;
        
        public ParticipantStatus Status { get; set; } = ParticipantStatus.Invited;
        
        public Guid? InvitedBy { get; set; }
        
        // Navigation properties
        [ForeignKey("EventId")]
        public virtual Event Event { get; set; } = null!;
        
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;
        
        [ForeignKey("InvitedBy")]
        public virtual User? Inviter { get; set; }
    }
}
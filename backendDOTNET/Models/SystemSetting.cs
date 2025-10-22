using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace backendDOTNET.Models
{
    public class SystemSetting : BaseEntity
    {
        [Required]
        [StringLength(100)]
        public string Key { get; set; } = string.Empty;
        
        [Required]
        public JsonDocument Value { get; set; } = JsonDocument.Parse("{}");
        
        public string? Description { get; set; }
        
        public bool IsPublic { get; set; } = false; // Can be accessed by frontend
    }
}
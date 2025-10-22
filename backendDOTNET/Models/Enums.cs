using System.ComponentModel;

namespace backendDOTNET.Models
{
    public enum AttendanceStatus
    {
        [Description("Present")]
        Present,
        
        [Description("Absent")]
        Absent,
        
        [Description("Late")]
        Late,
        
        [Description("Pending Verification")]
        PendingVerification
    }

    public enum CheckInMethod
    {
        [Description("Wi-Fi")]
        WiFi,
        
        [Description("GPS")]
        GPS,
        
        [Description("Manual")]
        Manual,
        
        [Description("Admin")]
        Admin
    }

    public enum EventStatus
    {
        [Description("Draft")]
        Draft,
        
        [Description("Active")]
        Active,
        
        [Description("Completed")]
        Completed,
        
        [Description("Cancelled")]
        Cancelled
    }

    public enum ParticipantStatus
    {
        [Description("Invited")]
        Invited,
        
        [Description("Confirmed")]
        Confirmed,
        
        [Description("Declined")]
        Declined
    }

    public enum UserRole
    {
        [Description("Admin")]
        Admin,
        
        [Description("User")]
        User,
        
        [Description("Verifier")]
        Verifier,
        
        [Description("Super Admin")]
        SuperAdmin
    }
}
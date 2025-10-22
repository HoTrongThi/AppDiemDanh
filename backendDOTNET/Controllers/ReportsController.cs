using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using backendDOTNET.Data;
using backendDOTNET.Models;
using System.Security.Claims;
using System.Text;

namespace backendDOTNET.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,SuperAdmin,Manager")]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ReportsController> _logger;

        public ReportsController(AppDbContext context, ILogger<ReportsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Export attendance report for an event as CSV
        /// </summary>
        [HttpGet("event/{eventId}/attendance/csv")]
        public async Task<IActionResult> ExportAttendanceCsv(Guid eventId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var userRole = await GetCurrentUserRole();

                var eventItem = await _context.Events
                    .Include(e => e.Creator)
                    .FirstOrDefaultAsync(e => e.Id == eventId);

                if (eventItem == null)
                {
                    return NotFound(new { success = false, message = "Event not found" });
                }

                // Check permission
                if (userRole == "Manager" && eventItem.CreatedBy != userId)
                {
                    return Forbid("You can only export reports for events you created");
                }

                // Get all participants and their attendance
                var participants = await _context.EventParticipants
                    .Include(ep => ep.User)
                    .Where(ep => ep.EventId == eventId)
                    .OrderBy(ep => ep.User.FullName)
                    .ToListAsync();

                var attendanceRecords = await _context.AttendanceRecords
                    .Where(ar => ar.EventId == eventId)
                    .ToListAsync();

                var csv = new StringBuilder();
                
                // Header
                csv.AppendLine("STT,Họ và tên,Email,Số điện thoại,Trạng thái,Phương thức,Thời gian điểm danh,Độ chính xác GPS (m),Ghi chú");

                // Data rows
                int stt = 1;
                foreach (var participant in participants)
                {
                    var attendance = attendanceRecords.FirstOrDefault(ar => ar.UserId == participant.UserId);
                    
                    var status = attendance?.Status.ToString() ?? "Absent";
                    var method = attendance?.CheckInMethod.ToString() ?? "-";
                    var timestamp = attendance?.Timestamp.ToString("dd/MM/yyyy HH:mm:ss") ?? "-";
                    var gpsAccuracy = attendance?.GpsAccuracyMeters?.ToString() ?? "-";
                    var notes = attendance?.VerificationNotes ?? "";

                    csv.AppendLine($"{stt}," +
                        $"\"{participant.User.FullName}\"," +
                        $"\"{participant.User.Email}\"," +
                        $"\"{participant.User.PhoneNumber ?? "-"}\"," +
                        $"\"{status}\"," +
                        $"\"{method}\"," +
                        $"\"{timestamp}\"," +
                        $"\"{gpsAccuracy}\"," +
                        $"\"{notes.Replace("\"", "\"\"")}\"");
                    
                    stt++;
                }

                var fileName = $"DiemDanh_{SanitizeFileName(eventItem.Name)}_{DateTime.Now:yyyyMMdd_HHmmss}.csv";
                var bytes = Encoding.UTF8.GetBytes(csv.ToString());
                
                // Add BOM for Excel UTF-8 support
                var bom = Encoding.UTF8.GetPreamble();
                var result = new byte[bom.Length + bytes.Length];
                Buffer.BlockCopy(bom, 0, result, 0, bom.Length);
                Buffer.BlockCopy(bytes, 0, result, bom.Length, bytes.Length);

                _logger.LogInformation($"Exported attendance CSV for event {eventId} by user {userId}");

                return File(result, "text/csv", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error exporting attendance CSV for event {eventId}");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Export participants list for an event as CSV
        /// </summary>
        [HttpGet("event/{eventId}/participants/csv")]
        public async Task<IActionResult> ExportParticipantsCsv(Guid eventId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var userRole = await GetCurrentUserRole();

                var eventItem = await _context.Events.FirstOrDefaultAsync(e => e.Id == eventId);
                if (eventItem == null)
                {
                    return NotFound(new { success = false, message = "Event not found" });
                }

                // Check permission
                if (userRole == "Manager" && eventItem.CreatedBy != userId)
                {
                    return Forbid("You can only export reports for events you created");
                }

                var participants = await _context.EventParticipants
                    .Include(ep => ep.User)
                    .Where(ep => ep.EventId == eventId)
                    .OrderBy(ep => ep.User.FullName)
                    .ToListAsync();

                var csv = new StringBuilder();
                
                // Header
                csv.AppendLine("STT,Họ và tên,Email,Số điện thoại,Trạng thái,Ngày mời");

                // Data rows
                int stt = 1;
                foreach (var participant in participants)
                {
                    csv.AppendLine($"{stt}," +
                        $"\"{participant.User.FullName}\"," +
                        $"\"{participant.User.Email}\"," +
                        $"\"{participant.User.PhoneNumber ?? "-"}\"," +
                        $"\"{participant.Status}\"," +
                        $"\"{participant.InvitedAt:dd/MM/yyyy HH:mm:ss}\"");
                    
                    stt++;
                }

                var fileName = $"DanhSachThamGia_{SanitizeFileName(eventItem.Name)}_{DateTime.Now:yyyyMMdd_HHmmss}.csv";
                var bytes = Encoding.UTF8.GetBytes(csv.ToString());
                
                // Add BOM for Excel UTF-8 support
                var bom = Encoding.UTF8.GetPreamble();
                var result = new byte[bom.Length + bytes.Length];
                Buffer.BlockCopy(bom, 0, result, 0, bom.Length);
                Buffer.BlockCopy(bytes, 0, result, bom.Length, bytes.Length);

                _logger.LogInformation($"Exported participants CSV for event {eventId} by user {userId}");

                return File(result, "text/csv", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error exporting participants CSV for event {eventId}");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get summary report for an event
        /// </summary>
        [HttpGet("event/{eventId}/summary")]
        public async Task<IActionResult> GetEventSummary(Guid eventId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var userRole = await GetCurrentUserRole();

                var eventItem = await _context.Events
                    .Include(e => e.Creator)
                    .Include(e => e.Participants)
                    .FirstOrDefaultAsync(e => e.Id == eventId);

                if (eventItem == null)
                {
                    return NotFound(new { success = false, message = "Event not found" });
                }

                // Check permission
                if (userRole == "Manager" && eventItem.CreatedBy != userId)
                {
                    return Forbid("You can only view reports for events you created");
                }

                var attendanceRecords = await _context.AttendanceRecords
                    .Where(ar => ar.EventId == eventId)
                    .ToListAsync();

                var totalParticipants = eventItem.Participants.Count;
                var presentCount = attendanceRecords.Count(ar => ar.Status == AttendanceStatus.Present);
                var lateCount = attendanceRecords.Count(ar => ar.Status == AttendanceStatus.Late);
                var absentCount = totalParticipants - presentCount - lateCount;
                var pendingCount = attendanceRecords.Count(ar => ar.Status == AttendanceStatus.PendingVerification);

                var checkInMethodStats = attendanceRecords
                    .GroupBy(ar => ar.CheckInMethod)
                    .Select(g => new
                    {
                        method = g.Key.ToString(),
                        count = g.Count(),
                        percentage = totalParticipants > 0 ? Math.Round((double)g.Count() / totalParticipants * 100, 2) : 0
                    })
                    .ToList();

                var attendanceRate = totalParticipants > 0 
                    ? Math.Round((double)(presentCount + lateCount) / totalParticipants * 100, 2) 
                    : 0;

                var summary = new
                {
                    eventInfo = new
                    {
                        id = eventItem.Id,
                        name = eventItem.Name,
                        description = eventItem.Description,
                        locationName = eventItem.LocationName,
                        startTime = eventItem.StartTime,
                        endTime = eventItem.EndTime,
                        status = eventItem.Status.ToString(),
                        createdBy = eventItem.Creator.FullName
                    },
                    statistics = new
                    {
                        totalParticipants,
                        presentCount,
                        lateCount,
                        absentCount,
                        pendingCount,
                        attendanceRate,
                        checkInMethodStats
                    },
                    generatedAt = DateTime.UtcNow,
                    generatedBy = userId
                };

                return Ok(new
                {
                    success = true,
                    data = summary
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting event summary for event {eventId}");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get manager's overall statistics
        /// </summary>
        [HttpGet("manager/statistics")]
        public async Task<IActionResult> GetManagerStatistics()
        {
            try
            {
                var userId = GetCurrentUserId();
                var userRole = await GetCurrentUserRole();

                IQueryable<Event> eventsQuery = _context.Events.Include(e => e.Participants);

                // Filter by creator if Manager
                if (userRole == "Manager")
                {
                    eventsQuery = eventsQuery.Where(e => e.CreatedBy == userId);
                }

                var events = await eventsQuery.ToListAsync();
                var eventIds = events.Select(e => e.Id).ToList();

                var attendanceRecords = await _context.AttendanceRecords
                    .Where(ar => eventIds.Contains(ar.EventId))
                    .ToListAsync();

                var totalEvents = events.Count;
                var activeEvents = events.Count(e => e.Status == EventStatus.Active);
                var completedEvents = events.Count(e => e.Status == EventStatus.Completed);
                var totalParticipants = events.Sum(e => e.Participants.Count);
                var totalAttendance = attendanceRecords.Count(ar => 
                    ar.Status == AttendanceStatus.Present || ar.Status == AttendanceStatus.Late);

                var overallAttendanceRate = totalParticipants > 0 
                    ? Math.Round((double)totalAttendance / totalParticipants * 100, 2) 
                    : 0;

                var eventsByStatus = events
                    .GroupBy(e => e.Status)
                    .Select(g => new
                    {
                        status = g.Key.ToString(),
                        count = g.Count()
                    })
                    .ToList();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        totalEvents,
                        activeEvents,
                        completedEvents,
                        totalParticipants,
                        totalAttendance,
                        overallAttendanceRate,
                        eventsByStatus,
                        generatedAt = DateTime.UtcNow
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting manager statistics");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        private string SanitizeFileName(string fileName)
        {
            var invalidChars = Path.GetInvalidFileNameChars();
            var sanitized = new string(fileName.Select(c => invalidChars.Contains(c) ? '_' : c).ToArray());
            return sanitized.Length > 50 ? sanitized.Substring(0, 50) : sanitized;
        }

        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.Parse(userIdClaim ?? throw new UnauthorizedAccessException("User ID not found"));
        }

        private async Task<string> GetCurrentUserRole()
        {
            var userId = GetCurrentUserId();
            var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == userId);
            return user?.Role.Name ?? "User";
        }
    }
}

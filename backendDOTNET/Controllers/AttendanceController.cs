using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using backendDOTNET.Data;
using backendDOTNET.Models;
using System.Security.Claims;
using System.Text.Json;

namespace backendDOTNET.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AttendanceController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AttendanceController> _logger;

        public AttendanceController(AppDbContext context, ILogger<AttendanceController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Get attendance records for an event
        /// </summary>
        [HttpGet("event/{eventId}")]
        public async Task<IActionResult> GetEventAttendance(
            Guid eventId,
            [FromQuery] string? status = null,
            [FromQuery] string? checkInMethod = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var userId = GetCurrentUserId();
                var userRole = await GetCurrentUserRole();

                var eventItem = await _context.Events.FindAsync(eventId);
                if (eventItem == null)
                {
                    return NotFound(new { success = false, message = "Event not found" });
                }

                // Check permission
                if (userRole == "User")
                {
                    // Users can only see their own attendance
                    var record = await _context.AttendanceRecords
                        .Include(ar => ar.User)
                        .Include(ar => ar.Event)
                        .FirstOrDefaultAsync(ar => ar.EventId == eventId && ar.UserId == userId);

                    if (record == null)
                    {
                        return Ok(new { success = true, data = new List<object>(), total = 0 });
                    }

                    return Ok(new
                    {
                        success = true,
                        data = new[] { MapAttendanceRecord(record) },
                        total = 1
                    });
                }

                // Manager/Admin can see all attendance
                if (userRole == "Manager" && eventItem.CreatedBy != userId)
                {
                    return Forbid("You can only view attendance for events you created");
                }

                var query = _context.AttendanceRecords
                    .Include(ar => ar.User)
                    .Include(ar => ar.Event)
                    .Where(ar => ar.EventId == eventId);

                // Apply filters
                if (!string.IsNullOrEmpty(status) && Enum.TryParse<AttendanceStatus>(status, true, out var attendanceStatus))
                {
                    query = query.Where(ar => ar.Status == attendanceStatus);
                }

                if (!string.IsNullOrEmpty(checkInMethod) && Enum.TryParse<CheckInMethod>(checkInMethod, true, out var method))
                {
                    query = query.Where(ar => ar.CheckInMethod == method);
                }

                var totalCount = await query.CountAsync();
                var records = await query
                    .OrderByDescending(ar => ar.Timestamp)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    data = records.Select(MapAttendanceRecord),
                    pagination = new
                    {
                        currentPage = page,
                        pageSize,
                        totalCount,
                        totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting attendance for event {eventId}");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get attendance statistics for an event
        /// </summary>
        [HttpGet("event/{eventId}/statistics")]
        [Authorize(Roles = "Admin,SuperAdmin,Manager")]
        public async Task<IActionResult> GetAttendanceStatistics(Guid eventId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var userRole = await GetCurrentUserRole();

                var eventItem = await _context.Events
                    .Include(e => e.Participants)
                    .FirstOrDefaultAsync(e => e.Id == eventId);

                if (eventItem == null)
                {
                    return NotFound(new { success = false, message = "Event not found" });
                }

                // Check permission
                if (userRole == "Manager" && eventItem.CreatedBy != userId)
                {
                    return Forbid("You can only view statistics for events you created");
                }

                var totalParticipants = eventItem.Participants.Count;
                var attendanceRecords = await _context.AttendanceRecords
                    .Where(ar => ar.EventId == eventId)
                    .ToListAsync();

                var presentCount = attendanceRecords.Count(ar => ar.Status == AttendanceStatus.Present);
                var lateCount = attendanceRecords.Count(ar => ar.Status == AttendanceStatus.Late);
                var absentCount = totalParticipants - presentCount - lateCount;
                var pendingCount = attendanceRecords.Count(ar => ar.Status == AttendanceStatus.PendingVerification);

                var checkInMethods = attendanceRecords
                    .GroupBy(ar => ar.CheckInMethod)
                    .Select(g => new
                    {
                        method = g.Key.ToString(),
                        count = g.Count()
                    })
                    .ToList();

                var attendanceRate = totalParticipants > 0 
                    ? Math.Round((double)(presentCount + lateCount) / totalParticipants * 100, 2) 
                    : 0;

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        totalParticipants,
                        presentCount,
                        lateCount,
                        absentCount,
                        pendingCount,
                        attendanceRate,
                        checkInMethods,
                        lastUpdated = DateTime.UtcNow
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting attendance statistics for event {eventId}");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Verify pending attendance (Admin/Manager only)
        /// </summary>
        [HttpPost("{attendanceId}/verify")]
        [Authorize(Roles = "Admin,SuperAdmin,Manager")]
        public async Task<IActionResult> VerifyAttendance(
            Guid attendanceId,
            [FromBody] VerifyAttendanceRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var userRole = await GetCurrentUserRole();

                var attendance = await _context.AttendanceRecords
                    .Include(ar => ar.Event)
                    .FirstOrDefaultAsync(ar => ar.Id == attendanceId);

                if (attendance == null)
                {
                    return NotFound(new { success = false, message = "Attendance record not found" });
                }

                // Check permission
                if (userRole == "Manager" && attendance.Event.CreatedBy != userId)
                {
                    return Forbid("You can only verify attendance for events you created");
                }

                if (!Enum.TryParse<AttendanceStatus>(request.Status, true, out var newStatus))
                {
                    return BadRequest(new { success = false, message = "Invalid status" });
                }

                attendance.Status = newStatus;
                attendance.VerifiedBy = userId;
                attendance.VerificationNotes = request.Notes;
                attendance.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Attendance {attendanceId} verified by user {userId} with status {newStatus}");

                return Ok(new
                {
                    success = true,
                    message = "Attendance verified successfully",
                    data = MapAttendanceRecord(attendance)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error verifying attendance {attendanceId}");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Manual check-in (Admin/Manager only)
        /// </summary>
        [HttpPost("manual-checkin")]
        [Authorize(Roles = "Admin,SuperAdmin,Manager")]
        public async Task<IActionResult> ManualCheckIn([FromBody] ManualCheckInRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var userRole = await GetCurrentUserRole();

                var eventItem = await _context.Events.FindAsync(request.EventId);
                if (eventItem == null)
                {
                    return NotFound(new { success = false, message = "Event not found" });
                }

                // Check permission
                if (userRole == "Manager" && eventItem.CreatedBy != userId)
                {
                    return Forbid("You can only manually check-in for events you created");
                }

                // Check if user is a participant
                var participant = await _context.EventParticipants
                    .FirstOrDefaultAsync(ep => ep.EventId == request.EventId && ep.UserId == request.UserId);

                if (participant == null)
                {
                    return BadRequest(new { success = false, message = "User is not a participant of this event" });
                }

                // Check if already checked in
                var existingRecord = await _context.AttendanceRecords
                    .FirstOrDefaultAsync(ar => ar.EventId == request.EventId && ar.UserId == request.UserId);

                if (existingRecord != null)
                {
                    return BadRequest(new { success = false, message = "User has already checked in" });
                }

                // Create attendance record
                var attendance = new AttendanceRecord
                {
                    UserId = request.UserId,
                    EventId = request.EventId,
                    Status = AttendanceStatus.Present,
                    CheckInMethod = CheckInMethod.Manual,
                    Timestamp = DateTime.UtcNow,
                    VerifiedBy = userId,
                    VerificationNotes = request.Notes,
                    Metadata = JsonDocument.Parse(JsonSerializer.Serialize(new
                    {
                        manualCheckIn = true,
                        checkedInBy = userId,
                        reason = request.Notes
                    }))
                };

                _context.AttendanceRecords.Add(attendance);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Manual check-in for user {request.UserId} in event {request.EventId} by {userId}");

                return Ok(new
                {
                    success = true,
                    message = "Manual check-in successful",
                    data = MapAttendanceRecord(attendance)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during manual check-in");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get user's attendance history
        /// </summary>
        [HttpGet("user/history")]
        public async Task<IActionResult> GetUserAttendanceHistory(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var userId = GetCurrentUserId();

                var query = _context.AttendanceRecords
                    .Include(ar => ar.Event)
                    .Where(ar => ar.UserId == userId);

                var totalCount = await query.CountAsync();
                var records = await query
                    .OrderByDescending(ar => ar.Timestamp)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    data = records.Select(ar => new
                    {
                        id = ar.Id,
                        eventId = ar.EventId,
                        eventName = ar.Event.Name,
                        status = ar.Status.ToString(),
                        checkInMethod = ar.CheckInMethod.ToString(),
                        timestamp = ar.Timestamp,
                        locationName = ar.Event.LocationName
                    }),
                    pagination = new
                    {
                        currentPage = page,
                        pageSize,
                        totalCount,
                        totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user attendance history");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        private object MapAttendanceRecord(AttendanceRecord ar)
        {
            return new
            {
                id = ar.Id,
                userId = ar.UserId,
                userName = ar.User?.FullName,
                userEmail = ar.User?.Email,
                eventId = ar.EventId,
                eventName = ar.Event?.Name,
                status = ar.Status.ToString(),
                checkInMethod = ar.CheckInMethod.ToString(),
                timestamp = ar.Timestamp,
                gpsLatitude = ar.GpsLatitude,
                gpsLongitude = ar.GpsLongitude,
                gpsAccuracyMeters = ar.GpsAccuracyMeters,
                verifiedBy = ar.VerifiedBy,
                verificationNotes = ar.VerificationNotes,
                createdAt = ar.CreatedAt
            };
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

    public class VerifyAttendanceRequest
    {
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }

    public class ManualCheckInRequest
    {
        public Guid EventId { get; set; }
        public Guid UserId { get; set; }
        public string? Notes { get; set; }
    }
}

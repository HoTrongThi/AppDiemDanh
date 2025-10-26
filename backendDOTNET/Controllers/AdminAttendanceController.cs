using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backendDOTNET.Data;
using backendDOTNET.Models;
using System.Security.Claims;

namespace backendDOTNET.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/admin/attendance")]
    public class AdminAttendanceController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AdminAttendanceController> _logger;

        public AdminAttendanceController(AppDbContext context, ILogger<AdminAttendanceController> logger)
        {
            _context = context;
            _logger = logger;
        }

        private async Task<bool> IsAdminAsync()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return false;

            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == Guid.Parse(userId));

            return user?.Role?.Name == "Admin";
        }

        /// <summary>
        /// Get pending attendance records for verification
        /// </summary>
        [HttpGet("pending")]
        public async Task<ActionResult<object>> GetPendingAttendance(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? status = null,
            [FromQuery] string? checkInMethod = null,
            [FromQuery] string? search = null,
            [FromQuery] Guid? eventId = null)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var query = _context.AttendanceRecords
                    .Include(ar => ar.User)
                    .Include(ar => ar.Event)
                    .AsQueryable();

                // Apply status filter (default to PendingVerification)
                if (!string.IsNullOrEmpty(status))
                {
                    if (Enum.TryParse<AttendanceStatus>(status, true, out var attendanceStatus))
                    {
                        query = query.Where(ar => ar.Status == attendanceStatus);
                    }
                }
                else
                {
                    // Default: show only pending verification
                    query = query.Where(ar => ar.Status == AttendanceStatus.PendingVerification);
                }

                // Apply check-in method filter
                if (!string.IsNullOrEmpty(checkInMethod))
                {
                    if (Enum.TryParse<CheckInMethod>(checkInMethod, true, out var method))
                    {
                        query = query.Where(ar => ar.CheckInMethod == method);
                    }
                }

                // Apply event filter
                if (eventId.HasValue)
                {
                    query = query.Where(ar => ar.EventId == eventId.Value);
                }

                // Apply search filter
                if (!string.IsNullOrEmpty(search))
                {
                    query = query.Where(ar =>
                        ar.User.FullName.Contains(search) ||
                        ar.User.Email.Contains(search) ||
                        ar.User.Username.Contains(search) ||
                        ar.Event.Name.Contains(search));
                }

                // Get total count
                var totalCount = await query.CountAsync();

                // Apply pagination and ordering
                var records = await query
                    .OrderByDescending(ar => ar.Timestamp)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(ar => new
                    {
                        ar.Id,
                        ar.UserId,
                        UserName = ar.User.FullName,
                        UserEmail = ar.User.Email,
                        ar.EventId,
                        EventName = ar.Event.Name,
                        Status = ar.Status.ToString(),
                        CheckInMethod = ar.CheckInMethod.ToString(),
                        ar.Timestamp,
                        ar.GpsLatitude,
                        ar.GpsLongitude,
                        ar.GpsAccuracyMeters,
                        ar.VerifiedBy,
                        ar.VerificationNotes,
                        ar.DeviceInfo,
                        ar.Metadata,
                        ar.CreatedAt,
                        ar.UpdatedAt
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        records,
                        pagination = new
                        {
                            currentPage = page,
                            pageSize,
                            totalCount,
                            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting pending attendance records");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get attendance statistics for admin dashboard
        /// </summary>
        [HttpGet("stats")]
        public async Task<ActionResult<object>> GetAttendanceStats()
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var totalPending = await _context.AttendanceRecords
                    .Where(ar => ar.Status == AttendanceStatus.PendingVerification)
                    .CountAsync();

                var wifiPending = await _context.AttendanceRecords
                    .Where(ar => ar.Status == AttendanceStatus.PendingVerification && ar.CheckInMethod == CheckInMethod.WiFi)
                    .CountAsync();

                var gpsPending = await _context.AttendanceRecords
                    .Where(ar => ar.Status == AttendanceStatus.PendingVerification && ar.CheckInMethod == CheckInMethod.GPS)
                    .CountAsync();

                var manualPending = await _context.AttendanceRecords
                    .Where(ar => ar.Status == AttendanceStatus.PendingVerification && ar.CheckInMethod == CheckInMethod.Manual)
                    .CountAsync();

                var totalPresent = await _context.AttendanceRecords
                    .Where(ar => ar.Status == AttendanceStatus.Present)
                    .CountAsync();

                var totalLate = await _context.AttendanceRecords
                    .Where(ar => ar.Status == AttendanceStatus.Late)
                    .CountAsync();

                var totalAbsent = await _context.AttendanceRecords
                    .Where(ar => ar.Status == AttendanceStatus.Absent)
                    .CountAsync();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        totalPending,
                        wifiPending,
                        gpsPending,
                        manualPending,
                        totalPresent,
                        totalLate,
                        totalAbsent,
                        totalRecords = totalPending + totalPresent + totalLate + totalAbsent
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting attendance stats");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Verify attendance record (approve/reject)
        /// </summary>
        [HttpPost("{attendanceId}/verify")]
        public async Task<ActionResult<object>> VerifyAttendance(
            Guid attendanceId,
            [FromBody] VerifyAttendanceDto dto)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                var attendance = await _context.AttendanceRecords
                    .Include(ar => ar.User)
                    .Include(ar => ar.Event)
                    .FirstOrDefaultAsync(ar => ar.Id == attendanceId);

                if (attendance == null)
                {
                    return NotFound(new { success = false, message = "Attendance record not found" });
                }

                // Parse and validate status
                if (!Enum.TryParse<AttendanceStatus>(dto.Status, true, out var newStatus))
                {
                    return BadRequest(new { success = false, message = "Invalid status" });
                }

                // Update attendance record
                attendance.Status = newStatus;
                attendance.VerifiedBy = Guid.Parse(userId);
                attendance.VerificationNotes = dto.Notes;
                attendance.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "Admin {AdminId} verified attendance {AttendanceId} with status {Status}",
                    userId, attendanceId, newStatus);

                return Ok(new
                {
                    success = true,
                    message = $"Attendance verified as {newStatus}",
                    data = new
                    {
                        attendance.Id,
                        attendance.UserId,
                        UserName = attendance.User.FullName,
                        attendance.EventId,
                        EventName = attendance.Event.Name,
                        Status = attendance.Status.ToString(),
                        CheckInMethod = attendance.CheckInMethod.ToString(),
                        attendance.Timestamp,
                        attendance.VerifiedBy,
                        attendance.VerificationNotes,
                        attendance.UpdatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying attendance {AttendanceId}", attendanceId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Bulk verify attendance records
        /// </summary>
        [HttpPost("bulk-verify")]
        public async Task<ActionResult<object>> BulkVerifyAttendance([FromBody] BulkVerifyDto dto)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                if (dto.AttendanceIds == null || !dto.AttendanceIds.Any())
                {
                    return BadRequest(new { success = false, message = "No attendance IDs provided" });
                }

                if (!Enum.TryParse<AttendanceStatus>(dto.Status, true, out var newStatus))
                {
                    return BadRequest(new { success = false, message = "Invalid status" });
                }

                var records = await _context.AttendanceRecords
                    .Where(ar => dto.AttendanceIds.Contains(ar.Id))
                    .ToListAsync();

                if (!records.Any())
                {
                    return NotFound(new { success = false, message = "No attendance records found" });
                }

                var adminId = Guid.Parse(userId);
                var now = DateTime.UtcNow;

                foreach (var record in records)
                {
                    record.Status = newStatus;
                    record.VerifiedBy = adminId;
                    record.VerificationNotes = dto.Notes;
                    record.UpdatedAt = now;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "Admin {AdminId} bulk verified {Count} attendance records with status {Status}",
                    userId, records.Count, newStatus);

                return Ok(new
                {
                    success = true,
                    message = $"Successfully verified {records.Count} attendance records",
                    data = new
                    {
                        verifiedCount = records.Count,
                        status = newStatus.ToString()
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error bulk verifying attendance");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get attendance record details
        /// </summary>
        [HttpGet("{attendanceId}")]
        public async Task<ActionResult<object>> GetAttendanceDetails(Guid attendanceId)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var attendance = await _context.AttendanceRecords
                    .Include(ar => ar.User)
                        .ThenInclude(u => u.Role)
                    .Include(ar => ar.Event)
                    .Include(ar => ar.Verifier)
                    .FirstOrDefaultAsync(ar => ar.Id == attendanceId);

                if (attendance == null)
                {
                    return NotFound(new { success = false, message = "Attendance record not found" });
                }

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        attendance.Id,
                        User = new
                        {
                            attendance.User.Id,
                            attendance.User.Username,
                            attendance.User.FullName,
                            attendance.User.Email,
                            attendance.User.PhoneNumber,
                            Role = attendance.User.Role.DisplayName
                        },
                        Event = new
                        {
                            attendance.Event.Id,
                            attendance.Event.Name,
                            attendance.Event.Description,
                            attendance.Event.LocationName,
                            attendance.Event.Latitude,
                            attendance.Event.Longitude,
                            attendance.Event.RadiusMeters,
                            attendance.Event.StartTime,
                            attendance.Event.EndTime
                        },
                        Status = attendance.Status.ToString(),
                        CheckInMethod = attendance.CheckInMethod.ToString(),
                        attendance.Timestamp,
                        GpsLocation = attendance.GpsLatitude.HasValue && attendance.GpsLongitude.HasValue
                            ? new
                            {
                                latitude = attendance.GpsLatitude.Value,
                                longitude = attendance.GpsLongitude.Value,
                                accuracy = attendance.GpsAccuracyMeters
                            }
                            : null,
                        attendance.DeviceInfo,
                        attendance.Metadata,
                        Verifier = attendance.Verifier != null
                            ? new
                            {
                                attendance.Verifier.Id,
                                attendance.Verifier.FullName,
                                attendance.Verifier.Email
                            }
                            : null,
                        attendance.VerificationNotes,
                        attendance.CreatedAt,
                        attendance.UpdatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting attendance details {AttendanceId}", attendanceId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get attendance verification history
        /// </summary>
        [HttpGet("verification-history")]
        public async Task<ActionResult<object>> GetVerificationHistory(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var query = _context.AttendanceRecords
                    .Include(ar => ar.User)
                    .Include(ar => ar.Event)
                    .Include(ar => ar.Verifier)
                    .Where(ar => ar.VerifiedBy != null)
                    .AsQueryable();

                if (startDate.HasValue)
                {
                    query = query.Where(ar => ar.UpdatedAt >= startDate.Value);
                }

                if (endDate.HasValue)
                {
                    query = query.Where(ar => ar.UpdatedAt <= endDate.Value);
                }

                var totalCount = await query.CountAsync();

                var records = await query
                    .OrderByDescending(ar => ar.UpdatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(ar => new
                    {
                        ar.Id,
                        UserName = ar.User.FullName,
                        EventName = ar.Event.Name,
                        Status = ar.Status.ToString(),
                        CheckInMethod = ar.CheckInMethod.ToString(),
                        ar.Timestamp,
                        VerifiedBy = ar.Verifier != null ? ar.Verifier.FullName : null,
                        ar.VerificationNotes,
                        ar.UpdatedAt
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        records,
                        pagination = new
                        {
                            currentPage = page,
                            pageSize,
                            totalCount,
                            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting verification history");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }
    }

    // DTOs
    public class VerifyAttendanceDto
    {
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }

    public class BulkVerifyDto
    {
        public List<Guid> AttendanceIds { get; set; } = new();
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }
}

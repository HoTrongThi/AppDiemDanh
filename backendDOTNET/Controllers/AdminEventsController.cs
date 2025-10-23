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
    [Route("api/admin/events")]
    public class AdminEventsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AdminEventsController> _logger;

        public AdminEventsController(AppDbContext context, ILogger<AdminEventsController> logger)
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

        // GET: api/admin/events
        [HttpGet]
        public async Task<ActionResult<object>> GetEvents(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? status = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var query = _context.Events
                    .Include(e => e.Creator)
                    .AsQueryable();

                // Apply search filter
                if (!string.IsNullOrEmpty(search))
                {
                    query = query.Where(e =>
                        e.Name.Contains(search) ||
                        (e.Description != null && e.Description.Contains(search)) ||
                        (e.LocationName != null && e.LocationName.Contains(search)));
                }

                // Apply status filter
                if (!string.IsNullOrEmpty(status) && Enum.TryParse<EventStatus>(status, out var eventStatus))
                {
                    query = query.Where(e => e.Status == eventStatus);
                }

                // Apply date range filter
                if (startDate.HasValue)
                {
                    query = query.Where(e => e.StartTime >= startDate.Value);
                }

                if (endDate.HasValue)
                {
                    query = query.Where(e => e.EndTime <= endDate.Value);
                }

                // Get total count
                var totalCount = await query.CountAsync();

                // Apply pagination
                var events = await query
                    .OrderByDescending(e => e.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(e => new
                    {
                        e.Id,
                        e.Name,
                        e.Description,
                        Location = e.LocationName,
                        e.Latitude,
                        e.Longitude,
                        e.RadiusMeters,
                        e.StartTime,
                        e.EndTime,
                        e.Status,
                        e.RequireGps,
                        e.QrRefreshIntervalSeconds,
                        e.MaxParticipants,
                        e.AllowLateCheckin,
                        e.LateCheckinMinutes,
                        Creator = new
                        {
                            e.Creator.Id,
                            e.Creator.Username,
                            e.Creator.FullName
                        },
                        ParticipantCount = e.Participants.Count,
                        AttendanceCount = e.AttendanceRecords.Count(ar => ar.Status == AttendanceStatus.Present),
                        e.CreatedAt,
                        e.UpdatedAt
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        events,
                        totalCount,
                        page,
                        pageSize,
                        totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting events");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // GET: api/admin/events/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetEvent(Guid id)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var eventData = await _context.Events
                    .Include(e => e.Creator)
                    .Include(e => e.Participants)
                        .ThenInclude(ep => ep.User)
                    .Include(e => e.AttendanceRecords)
                        .ThenInclude(ar => ar.User)
                    .Where(e => e.Id == id)
                    .Select(e => new
                    {
                        e.Id,
                        e.Name,
                        e.Description,
                        Location = e.LocationName,
                        e.Latitude,
                        e.Longitude,
                        e.RadiusMeters,
                        e.StartTime,
                        e.EndTime,
                        e.Status,
                        e.RequireGps,
                        e.QrRefreshIntervalSeconds,
                        e.MaxParticipants,
                        e.AllowLateCheckin,
                        e.LateCheckinMinutes,
                        Creator = new
                        {
                            e.Creator.Id,
                            e.Creator.Username,
                            e.Creator.FullName,
                            e.Creator.Email
                        },
                        Participants = e.Participants.Select(ep => new
                        {
                            UserId = ep.User.Id,
                            ep.User.Username,
                            ep.User.FullName,
                            ep.User.Email,
                            ep.Status,
                            ep.InvitedAt
                        }).ToList(),
                        AttendanceRecords = e.AttendanceRecords.Select(ar => new
                        {
                            ar.Id,
                            UserId = ar.User.Id,
                            ar.User.Username,
                            ar.User.FullName,
                            ar.Status,
                            ar.CheckInMethod,
                            ar.Timestamp
                        }).ToList(),
                        e.CreatedAt,
                        e.UpdatedAt
                    })
                    .FirstOrDefaultAsync();

                if (eventData == null)
                {
                    return NotFound(new { success = false, message = "Event not found" });
                }

                return Ok(new { success = true, data = eventData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting event {Id}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // PUT: api/admin/events/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<object>> UpdateEvent(Guid id, [FromBody] UpdateEventDto dto)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var eventData = await _context.Events.FindAsync(id);
                if (eventData == null)
                {
                    return NotFound(new { success = false, message = "Event not found" });
                }

                // Update fields
                if (!string.IsNullOrEmpty(dto.Name))
                    eventData.Name = dto.Name;

                if (dto.Description != null)
                    eventData.Description = dto.Description;

                if (!string.IsNullOrEmpty(dto.Location))
                    eventData.LocationName = dto.Location;

                if (dto.StartTime.HasValue)
                    eventData.StartTime = dto.StartTime.Value;

                if (dto.EndTime.HasValue)
                    eventData.EndTime = dto.EndTime.Value;

                if (!string.IsNullOrEmpty(dto.Status) && Enum.TryParse<EventStatus>(dto.Status, out var status))
                    eventData.Status = status;

                if (dto.RequireGPS.HasValue)
                    eventData.RequireGps = dto.RequireGPS.Value;

                if (dto.RadiusMeters.HasValue)
                    eventData.RadiusMeters = dto.RadiusMeters.Value;

                eventData.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Event updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating event {Id}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // DELETE: api/admin/events/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult<object>> DeleteEvent(Guid id)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var eventData = await _context.Events
                    .Include(e => e.Participants)
                    .Include(e => e.AttendanceRecords)
                    .Include(e => e.QrSessions)
                    .FirstOrDefaultAsync(e => e.Id == id);

                if (eventData == null)
                {
                    return NotFound(new { success = false, message = "Event not found" });
                }

                // Remove related data
                _context.EventParticipants.RemoveRange(eventData.Participants);
                _context.AttendanceRecords.RemoveRange(eventData.AttendanceRecords);
                _context.QrSessions.RemoveRange(eventData.QrSessions);

                _context.Events.Remove(eventData);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Event deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting event {Id}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // GET: api/admin/events/{id}/attendance
        [HttpGet("{id}/attendance")]
        public async Task<ActionResult<object>> GetEventAttendance(Guid id)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var attendance = await _context.AttendanceRecords
                    .Where(ar => ar.EventId == id)
                    .Include(ar => ar.User)
                    .Select(ar => new
                    {
                        ar.Id,
                        User = new
                        {
                            ar.User.Id,
                            ar.User.Username,
                            ar.User.FullName,
                            ar.User.Email
                        },
                        ar.Status,
                        ar.CheckInMethod,
                        ar.Timestamp,
                        ar.GpsLatitude,
                        ar.GpsLongitude,
                        ar.GpsAccuracyMeters
                    })
                    .OrderBy(ar => ar.Timestamp)
                    .ToListAsync();

                return Ok(new { success = true, data = attendance });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting event attendance {Id}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }
    }

    // DTOs
    public class UpdateEventDto
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public string? Location { get; set; }
        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public string? Status { get; set; }
        public bool? RequireGPS { get; set; }
        public int? RadiusMeters { get; set; }
    }
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using backendDOTNET.Data;
using backendDOTNET.Models;
using System.Security.Claims;

namespace backendDOTNET.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EventsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<EventsController> _logger;

        public EventsController(AppDbContext context, ILogger<EventsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetEvents([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            try
            {
                var userId = GetCurrentUserId();
                var userRole = await GetCurrentUserRole();

                IQueryable<Event> query = _context.Events
                    .Include(e => e.Creator)
                    .Include(e => e.Participants)
                    .ThenInclude(p => p.User);

                // If User role, only show events user is participating in
                // Manager and Admin can see all events
                if (userRole == "User")
                {
                    query = query.Where(e => e.Participants.Any(p => p.UserId == userId));
                }

                var totalCount = await query.CountAsync();
                var events = await query
                    .OrderByDescending(e => e.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(e => new
                    {
                        id = e.Id,
                        name = e.Name,
                        description = e.Description,
                        locationName = e.LocationName,
                        location = e.Latitude.HasValue && e.Longitude.HasValue ? new
                        {
                            latitude = e.Latitude.Value,
                            longitude = e.Longitude.Value
                        } : null,
                        radiusMeters = e.RadiusMeters,
                        startTime = e.StartTime,
                        endTime = e.EndTime,
                        status = e.Status.ToString(),
                        createdBy = e.Creator.FullName,
                        participantCount = e.Participants.Count,
                        attendanceCount = e.AttendanceRecords.Count(ar => ar.Status == AttendanceStatus.Present || ar.Status == AttendanceStatus.Late)
                    })
                    .ToListAsync();

                return Ok(new
                {
                    events,
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
                _logger.LogError(ex, "Error getting events");
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetEvent(Guid id)
        {
            try
            {
                var userId = GetCurrentUserId();
                var userRole = await GetCurrentUserRole();

                var eventQuery = _context.Events
                    .Include(e => e.Creator)
                    .Include(e => e.Participants)
                    .ThenInclude(p => p.User)
                    .Include(e => e.AttendanceRecords)
                    .ThenInclude(ar => ar.User)
                    .Where(e => e.Id == id);

                // If User role, check if user is participant
                // Manager and Admin can see all events
                if (userRole == "User")
                {
                    eventQuery = eventQuery.Where(e => e.Participants.Any(p => p.UserId == userId));
                }

                var eventItem = await eventQuery.FirstOrDefaultAsync();

                if (eventItem == null)
                {
                    return NotFound(new { message = "Event not found" });
                }

                var result = new
                {
                    id = eventItem.Id,
                    name = eventItem.Name,
                    description = eventItem.Description,
                    locationName = eventItem.LocationName,
                    location = eventItem.Latitude.HasValue && eventItem.Longitude.HasValue ? new
                    {
                        latitude = eventItem.Latitude.Value,
                        longitude = eventItem.Longitude.Value
                    } : null,
                    radiusMeters = eventItem.RadiusMeters,
                    startTime = eventItem.StartTime,
                    endTime = eventItem.EndTime,
                    status = eventItem.Status.ToString(),
                    qrRefreshIntervalSeconds = eventItem.QrRefreshIntervalSeconds,
                    requireGps = eventItem.RequireGps,
                    allowLateCheckin = eventItem.AllowLateCheckin,
                    lateCheckinMinutes = eventItem.LateCheckinMinutes,
                    createdBy = eventItem.Creator.FullName,
                    participants = eventItem.Participants.Select(p => new
                    {
                        id = p.Id,
                        userId = p.UserId,
                        userName = p.User.FullName,
                        email = p.User.Email,
                        status = p.Status.ToString(),
                        invitedAt = p.InvitedAt
                    }),
                    attendanceRecords = eventItem.AttendanceRecords.Select(ar => new
                    {
                        id = ar.Id,
                        userId = ar.UserId,
                        userName = ar.User.FullName,
                        status = ar.Status.ToString(),
                        checkInMethod = ar.CheckInMethod.ToString(),
                        timestamp = ar.Timestamp,
                        gpsAccuracyMeters = ar.GpsAccuracyMeters
                    })
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting event {EventId}", id);
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,SuperAdmin,Manager")]
        public async Task<IActionResult> UpdateEvent(Guid id, [FromBody] UpdateEventRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var userRole = await GetCurrentUserRole();

                var eventItem = await _context.Events.FirstOrDefaultAsync(e => e.Id == id);
                if (eventItem == null)
                {
                    return NotFound(new { message = "Event not found" });
                }

                // Check if user has permission to update this event
                // Manager can only update their own events, Admin can update any
                if (userRole == "Manager" && eventItem.CreatedBy != userId)
                {
                    return Forbid("You can only update events you created");
                }

                // Validate input
                if (string.IsNullOrEmpty(request.Name) || 
                    request.StartTime >= request.EndTime)
                {
                    return BadRequest(new { message = "Invalid event data" });
                }

                // Update event properties
                eventItem.Name = request.Name;
                eventItem.Description = request.Description;
                eventItem.Latitude = request.Location?.Latitude;
                eventItem.Longitude = request.Location?.Longitude;
                eventItem.LocationName = request.LocationName;
                eventItem.RadiusMeters = request.RadiusMeters ?? 100;
                eventItem.StartTime = request.StartTime;
                eventItem.EndTime = request.EndTime;
                eventItem.QrRefreshIntervalSeconds = request.QrRefreshIntervalSeconds ?? 30;
                eventItem.RequireGps = request.RequireGps ?? true;
                eventItem.AllowLateCheckin = request.AllowLateCheckin ?? false;
                eventItem.LateCheckinMinutes = request.LateCheckinMinutes ?? 15;
                eventItem.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Event updated: {eventItem.Name} by user {userId}");

                return Ok(new { 
                    success = true,
                    message = "Event updated successfully",
                    data = new {
                        id = eventItem.Id,
                        name = eventItem.Name,
                        description = eventItem.Description,
                        locationName = eventItem.LocationName,
                        location = eventItem.Latitude.HasValue && eventItem.Longitude.HasValue ? new
                        {
                            latitude = eventItem.Latitude.Value,
                            longitude = eventItem.Longitude.Value
                        } : null,
                        radiusMeters = eventItem.RadiusMeters,
                        startTime = eventItem.StartTime,
                        endTime = eventItem.EndTime,
                        status = eventItem.Status.ToString(),
                        qrRefreshIntervalSeconds = eventItem.QrRefreshIntervalSeconds,
                        requireGps = eventItem.RequireGps,
                        allowLateCheckin = eventItem.AllowLateCheckin,
                        lateCheckinMinutes = eventItem.LateCheckinMinutes
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating event {EventId}", id);
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        [HttpPost]
        [Authorize(Roles = "Admin,SuperAdmin,Manager")]
        public async Task<IActionResult> CreateEvent([FromBody] CreateEventRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                // Validate input
                if (string.IsNullOrEmpty(request.Name) || 
                    request.StartTime >= request.EndTime)
                {
                    return BadRequest(new { message = "Invalid event data" });
                }

                var eventItem = new Event
                {
                    Name = request.Name,
                    Description = request.Description,
                    Latitude = request.Location?.Latitude,
                    Longitude = request.Location?.Longitude,
                    LocationName = request.LocationName,
                    RadiusMeters = request.RadiusMeters ?? 100,
                    StartTime = request.StartTime,
                    EndTime = request.EndTime,
                    CreatedBy = userId,
                    Status = EventStatus.Draft,
                    QrRefreshIntervalSeconds = request.QrRefreshIntervalSeconds ?? 30,
                    RequireGps = request.RequireGps ?? true,
                    AllowLateCheckin = request.AllowLateCheckin ?? false,
                    LateCheckinMinutes = request.LateCheckinMinutes ?? 15
                };

                _context.Events.Add(eventItem);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Event created: {eventItem.Name} by user {userId}");

                return CreatedAtAction(nameof(GetEvent), new { id = eventItem.Id }, new { id = eventItem.Id, message = "Event created successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating event");
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        [HttpGet("nearby")]
        public async Task<IActionResult> GetNearbyEvents([FromQuery] double latitude, [FromQuery] double longitude, [FromQuery] int radiusKm = 5)
        {
            try
            {
                // Simple distance calculation (will upgrade to PostGIS later)
                var nearbyEvents = await _context.Events
                    .Where(e => e.Latitude.HasValue && e.Longitude.HasValue && e.Status == EventStatus.Active)
                    .ToListAsync();

                var result = nearbyEvents
                    .Select(e => new
                    {
                        id = e.Id,
                        name = e.Name,
                        locationName = e.LocationName,
                        startTime = e.StartTime,
                        endTime = e.EndTime,
                        distance = CalculateDistance(latitude, longitude, e.Latitude!.Value, e.Longitude!.Value)
                    })
                    .Where(e => e.distance <= radiusKm * 1000) // Convert km to meters
                    .OrderBy(e => e.distance)
                    .ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting nearby events");
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        /// <summary>
        /// Update event status (Manager/Admin only)
        /// </summary>
        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Admin,SuperAdmin,Manager")]
        public async Task<IActionResult> UpdateEventStatus(Guid id, [FromBody] UpdateEventStatusRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var userRole = await GetCurrentUserRole();

                var eventItem = await _context.Events.FirstOrDefaultAsync(e => e.Id == id);
                if (eventItem == null)
                {
                    return NotFound(new { success = false, message = "Event not found" });
                }

                // Check permission
                if (userRole == "Manager" && eventItem.CreatedBy != userId)
                {
                    return Forbid("You can only update status for events you created");
                }

                if (!Enum.TryParse<EventStatus>(request.Status, true, out var newStatus))
                {
                    return BadRequest(new { success = false, message = "Invalid status" });
                }

                // Validate status transitions
                var validTransition = ValidateStatusTransition(eventItem.Status, newStatus);
                if (!validTransition)
                {
                    return BadRequest(new { 
                        success = false, 
                        message = $"Cannot transition from {eventItem.Status} to {newStatus}" 
                    });
                }

                eventItem.Status = newStatus;
                eventItem.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Event {id} status updated to {newStatus} by user {userId}");

                return Ok(new
                {
                    success = true,
                    message = "Event status updated successfully",
                    data = new
                    {
                        id = eventItem.Id,
                        status = eventItem.Status.ToString()
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating event {id} status");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Delete event (Manager/Admin only)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,SuperAdmin,Manager")]
        public async Task<IActionResult> DeleteEvent(Guid id)
        {
            try
            {
                var userId = GetCurrentUserId();
                var userRole = await GetCurrentUserRole();

                var eventItem = await _context.Events.FirstOrDefaultAsync(e => e.Id == id);
                if (eventItem == null)
                {
                    return NotFound(new { success = false, message = "Event not found" });
                }

                // Check permission
                if (userRole == "Manager" && eventItem.CreatedBy != userId)
                {
                    return Forbid("You can only delete events you created");
                }

                // Only allow deletion of Draft or Cancelled events
                if (eventItem.Status != EventStatus.Draft && eventItem.Status != EventStatus.Cancelled)
                {
                    return BadRequest(new { 
                        success = false, 
                        message = "Can only delete Draft or Cancelled events" 
                    });
                }

                _context.Events.Remove(eventItem);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Event {id} deleted by user {userId}");

                return Ok(new
                {
                    success = true,
                    message = "Event deleted successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting event {id}");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        private bool ValidateStatusTransition(EventStatus currentStatus, EventStatus newStatus)
        {
            // Define valid status transitions
            return (currentStatus, newStatus) switch
            {
                (EventStatus.Draft, EventStatus.Active) => true,
                (EventStatus.Draft, EventStatus.Cancelled) => true,
                (EventStatus.Active, EventStatus.Completed) => true,
                (EventStatus.Active, EventStatus.Cancelled) => true,
                _ when currentStatus == newStatus => true, // Allow same status
                _ => false
            };
        }

        // Simple distance calculation using Haversine formula
        private static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371000; // Earth's radius in meters
            var dLat = (lat2 - lat1) * Math.PI / 180;
            var dLon = (lon2 - lon1) * Math.PI / 180;
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return R * c;
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

    public class CreateEventRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public LocationDto? Location { get; set; }
        public string? LocationName { get; set; }
        public int? RadiusMeters { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public int? QrRefreshIntervalSeconds { get; set; }
        public bool? RequireGps { get; set; }
        public bool? AllowLateCheckin { get; set; }
        public int? LateCheckinMinutes { get; set; }
    }

    public class UpdateEventRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public LocationDto? Location { get; set; }
        public string? LocationName { get; set; }
        public int? RadiusMeters { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public int? QrRefreshIntervalSeconds { get; set; }
        public bool? RequireGps { get; set; }
        public bool? AllowLateCheckin { get; set; }
        public int? LateCheckinMinutes { get; set; }
    }

    public class LocationDto
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }

    public class UpdateEventStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }
}
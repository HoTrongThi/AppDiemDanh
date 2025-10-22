using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using backendDOTNET.Data;
using backendDOTNET.Models;
using System.Security.Claims;

namespace backendDOTNET.Controllers
{
    [ApiController]
    [Route("api/events/{eventId}/participants")]
    [Authorize]
    public class EventParticipantsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<EventParticipantsController> _logger;

        public EventParticipantsController(AppDbContext context, ILogger<EventParticipantsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Get all participants for an event
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetParticipants(Guid eventId, [FromQuery] string? status = null)
        {
            try
            {
                var eventItem = await _context.Events.FindAsync(eventId);
                if (eventItem == null)
                {
                    return NotFound(new { success = false, message = "Event not found" });
                }

                var query = _context.EventParticipants
                    .Include(ep => ep.User)
                    .Where(ep => ep.EventId == eventId);

                // Filter by status if provided
                if (!string.IsNullOrEmpty(status) && Enum.TryParse<ParticipantStatus>(status, true, out var participantStatus))
                {
                    query = query.Where(ep => ep.Status == participantStatus);
                }

                var participants = await query
                    .OrderBy(ep => ep.User.FullName)
                    .Select(ep => new
                    {
                        id = ep.Id,
                        userId = ep.UserId,
                        userName = ep.User.FullName,
                        email = ep.User.Email,
                        phoneNumber = ep.User.PhoneNumber,
                        status = ep.Status.ToString(),
                        invitedAt = ep.InvitedAt,
                        invitedBy = ep.InvitedBy,
                        hasAttended = _context.AttendanceRecords.Any(ar => 
                            ar.EventId == eventId && 
                            ar.UserId == ep.UserId && 
                            (ar.Status == AttendanceStatus.Present || ar.Status == AttendanceStatus.Late))
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    data = participants,
                    total = participants.Count
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting participants for event {eventId}");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Add participants to an event (Manager/Admin only)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin,SuperAdmin,Manager")]
        public async Task<IActionResult> AddParticipants(Guid eventId, [FromBody] AddParticipantsRequest request)
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
                if (userRole == "Manager" && eventItem.CreatedBy != userId)
                {
                    return Forbid("You can only add participants to events you created");
                }

                if (request.UserIds == null || !request.UserIds.Any())
                {
                    return BadRequest(new { success = false, message = "No user IDs provided" });
                }

                var addedCount = 0;
                var alreadyExistCount = 0;
                var errors = new List<string>();

                foreach (var participantUserId in request.UserIds)
                {
                    // Check if user exists
                    var user = await _context.Users.FindAsync(participantUserId);
                    if (user == null)
                    {
                        errors.Add($"User {participantUserId} not found");
                        continue;
                    }

                    // Check if already a participant
                    var existingParticipant = await _context.EventParticipants
                        .FirstOrDefaultAsync(ep => ep.EventId == eventId && ep.UserId == participantUserId);

                    if (existingParticipant != null)
                    {
                        alreadyExistCount++;
                        continue;
                    }

                    // Add participant
                    var participant = new EventParticipant
                    {
                        EventId = eventId,
                        UserId = participantUserId,
                        InvitedAt = DateTime.UtcNow,
                        InvitedBy = userId,
                        Status = ParticipantStatus.Invited
                    };

                    _context.EventParticipants.Add(participant);
                    addedCount++;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Added {addedCount} participants to event {eventId} by user {userId}");

                return Ok(new
                {
                    success = true,
                    message = $"Added {addedCount} participants successfully",
                    data = new
                    {
                        addedCount,
                        alreadyExistCount,
                        errors
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error adding participants to event {eventId}");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Remove a participant from an event (Manager/Admin only)
        /// </summary>
        [HttpDelete("{participantId}")]
        [Authorize(Roles = "Admin,SuperAdmin,Manager")]
        public async Task<IActionResult> RemoveParticipant(Guid eventId, Guid participantId)
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
                if (userRole == "Manager" && eventItem.CreatedBy != userId)
                {
                    return Forbid("You can only remove participants from events you created");
                }

                var participant = await _context.EventParticipants
                    .FirstOrDefaultAsync(ep => ep.Id == participantId && ep.EventId == eventId);

                if (participant == null)
                {
                    return NotFound(new { success = false, message = "Participant not found" });
                }

                _context.EventParticipants.Remove(participant);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Removed participant {participantId} from event {eventId} by user {userId}");

                return Ok(new
                {
                    success = true,
                    message = "Participant removed successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error removing participant {participantId} from event {eventId}");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Update participant status (Manager/Admin only)
        /// </summary>
        [HttpPatch("{participantId}/status")]
        [Authorize(Roles = "Admin,SuperAdmin,Manager")]
        public async Task<IActionResult> UpdateParticipantStatus(
            Guid eventId, 
            Guid participantId, 
            [FromBody] UpdateParticipantStatusRequest request)
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
                if (userRole == "Manager" && eventItem.CreatedBy != userId)
                {
                    return Forbid("You can only update participants in events you created");
                }

                var participant = await _context.EventParticipants
                    .FirstOrDefaultAsync(ep => ep.Id == participantId && ep.EventId == eventId);

                if (participant == null)
                {
                    return NotFound(new { success = false, message = "Participant not found" });
                }

                if (!Enum.TryParse<ParticipantStatus>(request.Status, true, out var newStatus))
                {
                    return BadRequest(new { success = false, message = "Invalid status" });
                }

                participant.Status = newStatus;
                participant.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Updated participant {participantId} status to {newStatus} in event {eventId}");

                return Ok(new
                {
                    success = true,
                    message = "Participant status updated successfully",
                    data = new
                    {
                        id = participant.Id,
                        status = participant.Status.ToString()
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating participant {participantId} status in event {eventId}");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get available users to add as participants (not already in event)
        /// </summary>
        [HttpGet("available")]
        [Authorize(Roles = "Admin,SuperAdmin,Manager")]
        public async Task<IActionResult> GetAvailableUsers(Guid eventId, [FromQuery] string? search = null)
        {
            try
            {
                var eventItem = await _context.Events.FindAsync(eventId);
                if (eventItem == null)
                {
                    return NotFound(new { success = false, message = "Event not found" });
                }

                // Get users who are not already participants
                var existingParticipantIds = await _context.EventParticipants
                    .Where(ep => ep.EventId == eventId)
                    .Select(ep => ep.UserId)
                    .ToListAsync();

                var query = _context.Users
                    .Where(u => u.IsActive && !existingParticipantIds.Contains(u.Id));

                // Apply search filter
                if (!string.IsNullOrEmpty(search))
                {
                    query = query.Where(u => 
                        u.FullName.Contains(search) || 
                        u.Email.Contains(search) || 
                        u.Username.Contains(search));
                }

                var availableUsers = await query
                    .OrderBy(u => u.FullName)
                    .Take(50) // Limit to 50 results
                    .Select(u => new
                    {
                        id = u.Id,
                        username = u.Username,
                        fullName = u.FullName,
                        email = u.Email,
                        phoneNumber = u.PhoneNumber
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    data = availableUsers
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting available users for event {eventId}");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
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

    public class AddParticipantsRequest
    {
        public List<Guid> UserIds { get; set; } = new();
    }

    public class UpdateParticipantStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }
}

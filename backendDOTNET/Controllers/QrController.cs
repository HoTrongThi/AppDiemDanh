using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using backendDOTNET.Services;

namespace backendDOTNET.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class QrController : ControllerBase
    {
        private readonly IQrCodeService _qrCodeService;
        private readonly ILogger<QrController> _logger;

        public QrController(IQrCodeService qrCodeService, ILogger<QrController> logger)
        {
            _qrCodeService = qrCodeService;
            _logger = logger;
        }

        /// <summary>
        /// Generate a new QR code session for an event
        /// </summary>
        [HttpPost("generate/{eventId}")]
        [Authorize(Roles = "Admin,SuperAdmin,Manager")]
        public async Task<IActionResult> GenerateQrSession(Guid eventId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var qrSession = await _qrCodeService.GenerateQrSessionAsync(eventId, userId);

                return Ok(new
                {
                    success = true,
                    message = "QR session generated successfully",
                    data = qrSession
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error generating QR session for event {eventId}");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get the current active QR session for an event
        /// </summary>
        [HttpGet("active/{eventId}")]
        [Authorize(Roles = "Admin,SuperAdmin,Manager")]
        public async Task<IActionResult> GetActiveQrSession(Guid eventId)
        {
            try
            {
                var qrSession = await _qrCodeService.GetActiveQrSessionAsync(eventId);

                if (qrSession == null)
                {
                    return NotFound(new { success = false, message = "No active QR session found for this event" });
                }

                return Ok(new
                {
                    success = true,
                    data = qrSession
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting active QR session for event {eventId}");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Refresh QR session (generate new nonce and signature)
        /// </summary>
        [HttpPost("refresh/{eventId}")]
        [Authorize(Roles = "Admin,SuperAdmin,Manager")]
        public async Task<IActionResult> RefreshQrSession(Guid eventId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var qrSession = await _qrCodeService.RefreshQrSessionAsync(eventId, userId);

                return Ok(new
                {
                    success = true,
                    message = "QR session refreshed successfully",
                    data = qrSession
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error refreshing QR session for event {eventId}");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Validate QR session (used by mobile app during check-in)
        /// </summary>
        [HttpPost("validate")]
        public async Task<IActionResult> ValidateQrSession([FromBody] ValidateQrRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.SessionId) || string.IsNullOrEmpty(request.Signature))
                {
                    return BadRequest(new { success = false, message = "SessionId and Signature are required" });
                }

                var userId = GetCurrentUserId();
                var validationResult = await _qrCodeService.ValidateQrSessionAsync(request.SessionId, request.Signature, userId);

                if (!validationResult.IsValid)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = validationResult.ErrorMessage,
                        isExpired = validationResult.IsExpired,
                        isAlreadyUsed = validationResult.IsAlreadyUsed
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "QR session is valid",
                    data = new
                    {
                        sessionId = validationResult.Session?.SessionId,
                        eventId = validationResult.Event?.Id,
                        eventName = validationResult.Event?.Name,
                        locationName = validationResult.Event?.LocationName,
                        requireGps = validationResult.Event?.RequireGps,
                        radiusMeters = validationResult.Event?.RadiusMeters
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating QR session");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get QR session info for display (public endpoint for QR display screens)
        /// </summary>
        [HttpGet("display/{eventId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetQrForDisplay(Guid eventId)
        {
            try
            {
                var qrSession = await _qrCodeService.GetActiveQrSessionAsync(eventId);

                if (qrSession == null)
                {
                    return NotFound(new { success = false, message = "No active QR session found" });
                }

                // Return only necessary data for QR display
                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        qrData = qrSession.QrData,
                        expiresAt = qrSession.ExpiresAt,
                        refreshIntervalSeconds = qrSession.RefreshIntervalSeconds
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting QR for display for event {eventId}");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Cleanup expired QR sessions (admin only)
        /// </summary>
        [HttpPost("cleanup")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> CleanupExpiredSessions()
        {
            try
            {
                var cleanedCount = await _qrCodeService.CleanupExpiredSessionsAsync();

                return Ok(new
                {
                    success = true,
                    message = $"Cleaned up {cleanedCount} expired QR sessions"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cleaning up expired QR sessions");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.Parse(userIdClaim ?? throw new UnauthorizedAccessException("User ID not found"));
        }
    }

    public class ValidateQrRequest
    {
        public string SessionId { get; set; } = string.Empty;
        public string Signature { get; set; } = string.Empty;
    }
}
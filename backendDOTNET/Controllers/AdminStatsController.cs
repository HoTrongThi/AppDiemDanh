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
    [Route("api/admin/stats")]
    public class AdminStatsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AdminStatsController> _logger;

        public AdminStatsController(AppDbContext context, ILogger<AdminStatsController> logger)
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

        [HttpGet("dashboard")]
        public async Task<ActionResult<object>> GetDashboardStats()
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var totalUsers = await _context.Users.CountAsync();
                var totalEvents = await _context.Events.CountAsync();
                var totalOrganizations = 0;
                var pendingVerifications = await _context.AttendanceRecords
                    .Where(ar => ar.Status == AttendanceStatus.PendingVerification)
                    .CountAsync();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        totalUsers,
                        totalEvents,
                        totalOrganizations,
                        pendingVerifications
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting dashboard stats");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }
    }
}

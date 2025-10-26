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
    [Route("api/admin/reports")]
    public class AdminReportsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AdminReportsController> _logger;

        public AdminReportsController(AppDbContext context, ILogger<AdminReportsController> logger)
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
        /// Get overall system statistics
        /// </summary>
        [HttpGet("overview")]
        public async Task<ActionResult<object>> GetOverviewStats(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var start = startDate ?? DateTime.UtcNow.AddMonths(-1);
                var end = endDate ?? DateTime.UtcNow;

                // Total counts
                var totalUsers = await _context.Users.CountAsync();
                var totalEvents = await _context.Events.CountAsync();
                var totalOrganizations = await _context.Organizations.CountAsync();
                var totalAttendance = await _context.AttendanceRecords.CountAsync();

                // Active counts
                var activeUsers = await _context.Users.Where(u => u.IsActive).CountAsync();
                var activeEvents = await _context.Events
                    .Where(e => e.Status == EventStatus.Active)
                    .CountAsync();

                // Attendance stats
                var attendanceInPeriod = await _context.AttendanceRecords
                    .Where(ar => ar.Timestamp >= start && ar.Timestamp <= end)
                    .ToListAsync();

                var presentCount = attendanceInPeriod.Count(ar => ar.Status == AttendanceStatus.Present);
                var lateCount = attendanceInPeriod.Count(ar => ar.Status == AttendanceStatus.Late);
                var absentCount = attendanceInPeriod.Count(ar => ar.Status == AttendanceStatus.Absent);
                var pendingCount = attendanceInPeriod.Count(ar => ar.Status == AttendanceStatus.PendingVerification);

                var attendanceRate = attendanceInPeriod.Count > 0
                    ? Math.Round((double)(presentCount + lateCount) / attendanceInPeriod.Count * 100, 2)
                    : 0;

                // Check-in methods
                var wifiCount = attendanceInPeriod.Count(ar => ar.CheckInMethod == CheckInMethod.WiFi);
                var gpsCount = attendanceInPeriod.Count(ar => ar.CheckInMethod == CheckInMethod.GPS);
                var manualCount = attendanceInPeriod.Count(ar => ar.CheckInMethod == CheckInMethod.Manual);
                var adminCount = attendanceInPeriod.Count(ar => ar.CheckInMethod == CheckInMethod.Admin);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        period = new { start, end },
                        totals = new
                        {
                            users = totalUsers,
                            events = totalEvents,
                            organizations = totalOrganizations,
                            attendance = totalAttendance
                        },
                        active = new
                        {
                            users = activeUsers,
                            events = activeEvents
                        },
                        attendance = new
                        {
                            total = attendanceInPeriod.Count,
                            present = presentCount,
                            late = lateCount,
                            absent = absentCount,
                            pending = pendingCount,
                            attendanceRate
                        },
                        checkInMethods = new
                        {
                            wifi = wifiCount,
                            gps = gpsCount,
                            manual = manualCount,
                            admin = adminCount
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting overview stats");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get attendance trends over time
        /// </summary>
        [HttpGet("attendance-trends")]
        public async Task<ActionResult<object>> GetAttendanceTrends(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] string groupBy = "day") // day, week, month
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var start = startDate ?? DateTime.UtcNow.AddMonths(-1);
                var end = endDate ?? DateTime.UtcNow;

                var records = await _context.AttendanceRecords
                    .Where(ar => ar.Timestamp >= start && ar.Timestamp <= end)
                    .OrderBy(ar => ar.Timestamp)
                    .ToListAsync();

                var trends = new List<object>();

                if (groupBy.ToLower() == "day")
                {
                    trends = records
                        .GroupBy(ar => ar.Timestamp.Date)
                        .Select(g => new
                        {
                            date = g.Key,
                            total = g.Count(),
                            present = g.Count(ar => ar.Status == AttendanceStatus.Present),
                            late = g.Count(ar => ar.Status == AttendanceStatus.Late),
                            absent = g.Count(ar => ar.Status == AttendanceStatus.Absent),
                            pending = g.Count(ar => ar.Status == AttendanceStatus.PendingVerification)
                        })
                        .Cast<object>()
                        .ToList();
                }
                else if (groupBy.ToLower() == "week")
                {
                    trends = records
                        .GroupBy(ar => new
                        {
                            Year = ar.Timestamp.Year,
                            Week = System.Globalization.CultureInfo.CurrentCulture.Calendar.GetWeekOfYear(
                                ar.Timestamp, 
                                System.Globalization.CalendarWeekRule.FirstDay, 
                                DayOfWeek.Monday)
                        })
                        .Select(g => new
                        {
                            year = g.Key.Year,
                            week = g.Key.Week,
                            total = g.Count(),
                            present = g.Count(ar => ar.Status == AttendanceStatus.Present),
                            late = g.Count(ar => ar.Status == AttendanceStatus.Late),
                            absent = g.Count(ar => ar.Status == AttendanceStatus.Absent),
                            pending = g.Count(ar => ar.Status == AttendanceStatus.PendingVerification)
                        })
                        .Cast<object>()
                        .ToList();
                }
                else // month
                {
                    trends = records
                        .GroupBy(ar => new { ar.Timestamp.Year, ar.Timestamp.Month })
                        .Select(g => new
                        {
                            year = g.Key.Year,
                            month = g.Key.Month,
                            total = g.Count(),
                            present = g.Count(ar => ar.Status == AttendanceStatus.Present),
                            late = g.Count(ar => ar.Status == AttendanceStatus.Late),
                            absent = g.Count(ar => ar.Status == AttendanceStatus.Absent),
                            pending = g.Count(ar => ar.Status == AttendanceStatus.PendingVerification)
                        })
                        .Cast<object>()
                        .ToList();
                }

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        period = new { start, end },
                        groupBy,
                        trends
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting attendance trends");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get statistics by organization
        /// </summary>
        [HttpGet("by-organization")]
        public async Task<ActionResult<object>> GetStatsByOrganization(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var start = startDate ?? DateTime.UtcNow.AddMonths(-1);
                var end = endDate ?? DateTime.UtcNow;

                var organizations = await _context.Organizations
                    .Where(o => o.IsActive)
                    .ToListAsync();

                var stats = new List<object>();

                foreach (var org in organizations)
                {
                    // Get users in this organization
                    var userIds = await _context.UserOrganizations
                        .Where(uo => uo.OrganizationId == org.Id)
                        .Select(uo => uo.UserId)
                        .ToListAsync();

                    if (!userIds.Any())
                        continue;

                    var attendanceRecords = await _context.AttendanceRecords
                        .Where(ar => userIds.Contains(ar.UserId) &&
                                   ar.Timestamp >= start &&
                                   ar.Timestamp <= end)
                        .ToListAsync();

                    var totalMembers = userIds.Count;
                    var totalAttendance = attendanceRecords.Count;
                    var presentCount = attendanceRecords.Count(ar => ar.Status == AttendanceStatus.Present);
                    var lateCount = attendanceRecords.Count(ar => ar.Status == AttendanceStatus.Late);
                    var absentCount = attendanceRecords.Count(ar => ar.Status == AttendanceStatus.Absent);

                    var attendanceRate = totalAttendance > 0
                        ? Math.Round((double)(presentCount + lateCount) / totalAttendance * 100, 2)
                        : 0;

                    stats.Add(new
                    {
                        organizationId = org.Id,
                        organizationName = org.Name,
                        organizationType = org.Type,
                        organizationCode = org.Code,
                        totalMembers,
                        totalAttendance,
                        present = presentCount,
                        late = lateCount,
                        absent = absentCount,
                        attendanceRate
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        period = new { start, end },
                        organizations = stats
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting stats by organization");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get statistics by event
        /// </summary>
        [HttpGet("by-event")]
        public async Task<ActionResult<object>> GetStatsByEvent(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] string? status = null)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var start = startDate ?? DateTime.UtcNow.AddMonths(-1);
                var end = endDate ?? DateTime.UtcNow;

                var query = _context.Events
                    .Include(e => e.Creator)
                    .Include(e => e.Participants)
                    .Include(e => e.AttendanceRecords)
                    .Where(e => e.StartTime >= start && e.EndTime <= end)
                    .AsQueryable();

                if (!string.IsNullOrEmpty(status) && Enum.TryParse<EventStatus>(status, out var eventStatus))
                {
                    query = query.Where(e => e.Status == eventStatus);
                }

                var events = await query.ToListAsync();

                var stats = events.Select(e =>
                {
                    var totalParticipants = e.Participants.Count;
                    var totalAttendance = e.AttendanceRecords.Count;
                    var presentCount = e.AttendanceRecords.Count(ar => ar.Status == AttendanceStatus.Present);
                    var lateCount = e.AttendanceRecords.Count(ar => ar.Status == AttendanceStatus.Late);
                    var absentCount = totalParticipants - presentCount - lateCount;
                    var pendingCount = e.AttendanceRecords.Count(ar => ar.Status == AttendanceStatus.PendingVerification);

                    var attendanceRate = totalParticipants > 0
                        ? Math.Round((double)(presentCount + lateCount) / totalParticipants * 100, 2)
                        : 0;

                    return new
                    {
                        eventId = e.Id,
                        eventName = e.Name,
                        eventStatus = e.Status.ToString(),
                        startTime = e.StartTime,
                        endTime = e.EndTime,
                        location = e.LocationName,
                        creator = new
                        {
                            e.Creator.Id,
                            e.Creator.FullName
                        },
                        totalParticipants,
                        totalAttendance,
                        present = presentCount,
                        late = lateCount,
                        absent = absentCount,
                        pending = pendingCount,
                        attendanceRate
                    };
                }).ToList();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        period = new { start, end },
                        events = stats
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting stats by event");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get top performers (users with best attendance)
        /// </summary>
        [HttpGet("top-performers")]
        public async Task<ActionResult<object>> GetTopPerformers(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] int limit = 10)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var start = startDate ?? DateTime.UtcNow.AddMonths(-1);
                var end = endDate ?? DateTime.UtcNow;

                var userStats = await _context.AttendanceRecords
                    .Where(ar => ar.Timestamp >= start && ar.Timestamp <= end)
                    .Include(ar => ar.User)
                    .GroupBy(ar => ar.UserId)
                    .Select(g => new
                    {
                        userId = g.Key,
                        user = g.First().User,
                        totalAttendance = g.Count(),
                        present = g.Count(ar => ar.Status == AttendanceStatus.Present),
                        late = g.Count(ar => ar.Status == AttendanceStatus.Late),
                        absent = g.Count(ar => ar.Status == AttendanceStatus.Absent)
                    })
                    .ToListAsync();

                var topPerformers = userStats
                    .Select(us => new
                    {
                        userId = us.userId,
                        userName = us.user.FullName,
                        userEmail = us.user.Email,
                        totalAttendance = us.totalAttendance,
                        present = us.present,
                        late = us.late,
                        absent = us.absent,
                        attendanceRate = us.totalAttendance > 0
                            ? Math.Round((double)(us.present + us.late) / us.totalAttendance * 100, 2)
                            : 0
                    })
                    .OrderByDescending(us => us.attendanceRate)
                    .ThenByDescending(us => us.totalAttendance)
                    .Take(limit)
                    .ToList();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        period = new { start, end },
                        topPerformers
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting top performers");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get users with poor attendance
        /// </summary>
        [HttpGet("poor-attendance")]
        public async Task<ActionResult<object>> GetPoorAttendance(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] int limit = 10,
            [FromQuery] double threshold = 50.0)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var start = startDate ?? DateTime.UtcNow.AddMonths(-1);
                var end = endDate ?? DateTime.UtcNow;

                var userStats = await _context.AttendanceRecords
                    .Where(ar => ar.Timestamp >= start && ar.Timestamp <= end)
                    .Include(ar => ar.User)
                    .GroupBy(ar => ar.UserId)
                    .Select(g => new
                    {
                        userId = g.Key,
                        user = g.First().User,
                        totalAttendance = g.Count(),
                        present = g.Count(ar => ar.Status == AttendanceStatus.Present),
                        late = g.Count(ar => ar.Status == AttendanceStatus.Late),
                        absent = g.Count(ar => ar.Status == AttendanceStatus.Absent)
                    })
                    .ToListAsync();

                var poorPerformers = userStats
                    .Select(us => new
                    {
                        userId = us.userId,
                        userName = us.user.FullName,
                        userEmail = us.user.Email,
                        totalAttendance = us.totalAttendance,
                        present = us.present,
                        late = us.late,
                        absent = us.absent,
                        attendanceRate = us.totalAttendance > 0
                            ? Math.Round((double)(us.present + us.late) / us.totalAttendance * 100, 2)
                            : 0
                    })
                    .Where(us => us.attendanceRate < threshold)
                    .OrderBy(us => us.attendanceRate)
                    .Take(limit)
                    .ToList();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        period = new { start, end },
                        threshold,
                        poorPerformers
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting poor attendance");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Export report data (for Excel/PDF generation on frontend)
        /// </summary>
        [HttpGet("export-data")]
        public async Task<ActionResult<object>> GetExportData(
            [FromQuery] string reportType = "overview", // overview, events, organizations, users
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var start = startDate ?? DateTime.UtcNow.AddMonths(-1);
                var end = endDate ?? DateTime.UtcNow;

                object data = reportType.ToLower() switch
                {
                    "events" => await GetEventExportData(start, end),
                    "organizations" => await GetOrganizationExportData(start, end),
                    "users" => await GetUserExportData(start, end),
                    _ => await GetOverviewExportData(start, end)
                };

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        reportType,
                        period = new { start, end },
                        generatedAt = DateTime.UtcNow,
                        data
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting export data");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        private async Task<object> GetOverviewExportData(DateTime start, DateTime end)
        {
            var records = await _context.AttendanceRecords
                .Where(ar => ar.Timestamp >= start && ar.Timestamp <= end)
                .Include(ar => ar.User)
                .Include(ar => ar.Event)
                .Select(ar => new
                {
                    ar.Id,
                    UserName = ar.User.FullName,
                    UserEmail = ar.User.Email,
                    EventName = ar.Event.Name,
                    Status = ar.Status.ToString(),
                    CheckInMethod = ar.CheckInMethod.ToString(),
                    Timestamp = ar.Timestamp,
                    ar.GpsLatitude,
                    ar.GpsLongitude
                })
                .ToListAsync();

            return records;
        }

        private async Task<object> GetEventExportData(DateTime start, DateTime end)
        {
            var events = await _context.Events
                .Where(e => e.StartTime >= start && e.EndTime <= end)
                .Include(e => e.Creator)
                .Include(e => e.Participants)
                .Include(e => e.AttendanceRecords)
                .Select(e => new
                {
                    e.Id,
                    e.Name,
                    e.Description,
                    Location = e.LocationName,
                    e.StartTime,
                    e.EndTime,
                    Status = e.Status.ToString(),
                    Creator = e.Creator.FullName,
                    TotalParticipants = e.Participants.Count,
                    TotalAttendance = e.AttendanceRecords.Count,
                    Present = e.AttendanceRecords.Count(ar => ar.Status == AttendanceStatus.Present),
                    Late = e.AttendanceRecords.Count(ar => ar.Status == AttendanceStatus.Late)
                })
                .ToListAsync();

            return events;
        }

        private async Task<object> GetOrganizationExportData(DateTime start, DateTime end)
        {
            var organizations = await _context.Organizations
                .Where(o => o.IsActive)
                .Select(o => new
                {
                    o.Id,
                    o.Name,
                    o.Type,
                    o.Code,
                    MemberCount = o.UserOrganizations.Count
                })
                .ToListAsync();

            return organizations;
        }

        private async Task<object> GetUserExportData(DateTime start, DateTime end)
        {
            var users = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.AttendanceRecords)
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.FullName,
                    u.Email,
                    Role = u.Role.DisplayName,
                    TotalAttendance = u.AttendanceRecords.Count(ar => ar.Timestamp >= start && ar.Timestamp <= end),
                    Present = u.AttendanceRecords.Count(ar => ar.Timestamp >= start && ar.Timestamp <= end && ar.Status == AttendanceStatus.Present),
                    Late = u.AttendanceRecords.Count(ar => ar.Timestamp >= start && ar.Timestamp <= end && ar.Status == AttendanceStatus.Late),
                    Absent = u.AttendanceRecords.Count(ar => ar.Timestamp >= start && ar.Timestamp <= end && ar.Status == AttendanceStatus.Absent)
                })
                .ToListAsync();

            return users;
        }
    }
}

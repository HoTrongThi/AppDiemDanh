using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backendDOTNET.Data;
using backendDOTNET.Models;
using System.Security.Claims;
using BCrypt.Net;

namespace backendDOTNET.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/admin/users")]
    public class AdminUsersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AdminUsersController> _logger;

        public AdminUsersController(AppDbContext context, ILogger<AdminUsersController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // Helper method to get current user ID
        private string? GetCurrentUserId()
        {
            return User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }

        // Helper method to check if user is Admin
        private async Task<bool> IsAdminAsync()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId)) return false;

            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == Guid.Parse(userId));

            return user?.Role?.Name == "Admin";
        }

        // GET: api/admin/users
        [HttpGet]
        public async Task<ActionResult<object>> GetUsers(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? roleFilter = null,
            [FromQuery] bool? isActive = null)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var query = _context.Users
                    .Include(u => u.Role)
                    .AsQueryable();

                // Apply search filter
                if (!string.IsNullOrEmpty(search))
                {
                    query = query.Where(u =>
                        u.Username.Contains(search) ||
                        u.Email.Contains(search) ||
                        u.FullName.Contains(search));
                }

                // Apply role filter
                if (!string.IsNullOrEmpty(roleFilter))
                {
                    query = query.Where(u => u.Role.Name == roleFilter);
                }

                // Apply active status filter
                if (isActive.HasValue)
                {
                    query = query.Where(u => u.IsActive == isActive.Value);
                }

                // Get total count
                var totalCount = await query.CountAsync();

                // Apply pagination
                var users = await query
                    .OrderBy(u => u.Username)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(u => new
                    {
                        u.Id,
                        u.Username,
                        u.Email,
                        u.FullName,
                        u.PhoneNumber,
                        Role = new
                        {
                            u.Role.Id,
                            u.Role.Name,
                            u.Role.DisplayName
                        },
                        u.IsActive,
                        u.EmailVerified,
                        u.LastLoginAt,
                        u.CreatedAt,
                        u.UpdatedAt
                    })
                    .ToListAsync();

                _logger.LogInformation("Returning {Count} users out of {Total}", users.Count, totalCount);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        users,
                        totalCount,
                        page,
                        pageSize,
                        totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting users");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // GET: api/admin/users/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetUser(Guid id)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var user = await _context.Users
                    .Include(u => u.Role)
                    .Where(u => u.Id == id)
                    .Select(u => new
                    {
                        u.Id,
                        u.Username,
                        u.Email,
                        u.FullName,
                        u.PhoneNumber,
                        Role = new
                        {
                            u.Role.Id,
                            u.Role.Name,
                            u.Role.DisplayName
                        },
                        u.IsActive,
                        u.EmailVerified,
                        u.LastLoginAt,
                        u.CreatedAt,
                        u.UpdatedAt
                    })
                    .FirstOrDefaultAsync();

                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                return Ok(new { success = true, data = user });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user {UserId}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // POST: api/admin/users
        [HttpPost]
        public async Task<ActionResult<object>> CreateUser([FromBody] CreateUserDto dto)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                // Check if username already exists
                if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
                {
                    return BadRequest(new { success = false, message = "Username already exists" });
                }

                // Check if email already exists
                if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                {
                    return BadRequest(new { success = false, message = "Email already exists" });
                }

                // Check if role exists
                var role = await _context.Roles.FindAsync(dto.RoleId);
                if (role == null)
                {
                    return BadRequest(new { success = false, message = "Invalid role" });
                }

                // Create new user
                var user = new User
                {
                    Id = Guid.NewGuid(),
                    Username = dto.Username,
                    Email = dto.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                    FullName = dto.FullName,
                    PhoneNumber = dto.PhoneNumber,
                    RoleId = dto.RoleId,
                    IsActive = true,
                    EmailVerified = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                // Return created user
                var createdUser = await _context.Users
                    .Include(u => u.Role)
                    .Where(u => u.Id == user.Id)
                    .Select(u => new
                    {
                        u.Id,
                        u.Username,
                        u.Email,
                        u.FullName,
                        u.PhoneNumber,
                        Role = new
                        {
                            u.Role.Id,
                            u.Role.Name,
                            u.Role.DisplayName
                        },
                        u.IsActive,
                        u.EmailVerified,
                        u.CreatedAt
                    })
                    .FirstOrDefaultAsync();

                return Ok(new { success = true, data = createdUser, message = "User created successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating user");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // PUT: api/admin/users/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<object>> UpdateUser(Guid id, [FromBody] UpdateUserDto dto)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var user = await _context.Users.FindAsync(id);
                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                // Check username uniqueness if changed
                if (!string.IsNullOrEmpty(dto.Username) && dto.Username != user.Username)
                {
                    if (await _context.Users.AnyAsync(u => u.Username == dto.Username && u.Id != id))
                    {
                        return BadRequest(new { success = false, message = "Username already exists" });
                    }
                    user.Username = dto.Username;
                }

                // Check email uniqueness if changed
                if (!string.IsNullOrEmpty(dto.Email) && dto.Email != user.Email)
                {
                    if (await _context.Users.AnyAsync(u => u.Email == dto.Email && u.Id != id))
                    {
                        return BadRequest(new { success = false, message = "Email already exists" });
                    }
                    user.Email = dto.Email;
                }

                // Update other fields
                if (!string.IsNullOrEmpty(dto.FullName))
                    user.FullName = dto.FullName;

                if (dto.PhoneNumber != null)
                    user.PhoneNumber = dto.PhoneNumber;

                if (dto.RoleId.HasValue)
                {
                    var role = await _context.Roles.FindAsync(dto.RoleId.Value);
                    if (role == null)
                    {
                        return BadRequest(new { success = false, message = "Invalid role" });
                    }
                    user.RoleId = dto.RoleId.Value;
                }

                if (dto.IsActive.HasValue)
                    user.IsActive = dto.IsActive.Value;

                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Return updated user
                var updatedUser = await _context.Users
                    .Include(u => u.Role)
                    .Where(u => u.Id == id)
                    .Select(u => new
                    {
                        u.Id,
                        u.Username,
                        u.Email,
                        u.FullName,
                        u.PhoneNumber,
                        Role = new
                        {
                            u.Role.Id,
                            u.Role.Name,
                            u.Role.DisplayName
                        },
                        u.IsActive,
                        u.EmailVerified,
                        u.UpdatedAt
                    })
                    .FirstOrDefaultAsync();

                return Ok(new { success = true, data = updatedUser, message = "User updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user {UserId}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // DELETE: api/admin/users/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult<object>> DeleteUser(Guid id)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var user = await _context.Users.FindAsync(id);
                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                // Prevent deleting yourself
                var currentUserId = GetCurrentUserId();
                if (user.Id.ToString() == currentUserId)
                {
                    return BadRequest(new { success = false, message = "Cannot delete your own account" });
                }

                _context.Users.Remove(user);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "User deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting user {UserId}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // GET: api/admin/users/roles
        [HttpGet("roles")]
        public async Task<ActionResult<object>> GetRoles()
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var roles = await _context.Roles
                    .Where(r => r.IsActive)
                    .Select(r => new
                    {
                        r.Id,
                        r.Name,
                        r.DisplayName,
                        r.Description
                    })
                    .ToListAsync();

                return Ok(new { success = true, data = roles });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting roles");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }
    }
}

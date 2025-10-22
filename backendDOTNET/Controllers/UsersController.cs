using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using backendDOTNET.Data;
using backendDOTNET.Models;

namespace backendDOTNET.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<UsersController> _logger;

        public UsersController(AppDbContext context, ILogger<UsersController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("profile")]
        public async Task<ActionResult<User>> GetCurrentUserProfile()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("User not authenticated");
                }

                var user = await _context.Users
                    .Include(u => u.Role)
                    .Select(u => new User
                    {
                        Id = u.Id,
                        Username = u.Username,
                        Email = u.Email,
                        FullName = u.FullName,
                        PhoneNumber = u.PhoneNumber,
                        IsActive = u.IsActive,
                        EmailVerified = u.EmailVerified,
                        LastLoginAt = u.LastLoginAt,
                        CreatedAt = u.CreatedAt,
                        UpdatedAt = u.UpdatedAt,
                        Role = new Role
                        {
                            Id = u.Role.Id,
                            Name = u.Role.Name,
                            DisplayName = u.Role.DisplayName
                        }
                    })
                    .FirstOrDefaultAsync(u => u.Id == Guid.Parse(userId));

                if (user == null)
                {
                    return NotFound("User not found");
                }

                return Ok(user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user profile");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPut("profile")]
        public async Task<ActionResult<User>> UpdateUserProfile([FromBody] UpdateProfileDto updateUser)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("User not authenticated");
                }

                var user = await _context.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u => u.Id == Guid.Parse(userId));

                if (user == null)
                {
                    return NotFound("User not found");
                }

                // Check if username is already taken by another user
                if (!string.IsNullOrEmpty(updateUser.Username) && updateUser.Username != user.Username)
                {
                    var existingUser = await _context.Users
                        .FirstOrDefaultAsync(u => u.Username == updateUser.Username && u.Id != user.Id);
                    
                    if (existingUser != null)
                    {
                        return BadRequest("Username already exists");
                    }
                }

                // Check if email is already taken by another user
                if (!string.IsNullOrEmpty(updateUser.Email) && updateUser.Email != user.Email)
                {
                    var existingUser = await _context.Users
                        .FirstOrDefaultAsync(u => u.Email == updateUser.Email && u.Id != user.Id);
                    
                    if (existingUser != null)
                    {
                        return BadRequest("Email already exists");
                    }
                }

                // Update user properties
                if (!string.IsNullOrEmpty(updateUser.Username))
                    user.Username = updateUser.Username;
                
                if (!string.IsNullOrEmpty(updateUser.Email))
                    user.Email = updateUser.Email;
                
                if (!string.IsNullOrEmpty(updateUser.FullName))
                    user.FullName = updateUser.FullName;
                
                if (!string.IsNullOrEmpty(updateUser.PhoneNumber))
                    user.PhoneNumber = updateUser.PhoneNumber;

                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Return updated user without circular references
                var updatedUser = await _context.Users
                    .Include(u => u.Role)
                    .Select(u => new User
                    {
                        Id = u.Id,
                        Username = u.Username,
                        Email = u.Email,
                        FullName = u.FullName,
                        PhoneNumber = u.PhoneNumber,
                        IsActive = u.IsActive,
                        EmailVerified = u.EmailVerified,
                        LastLoginAt = u.LastLoginAt,
                        CreatedAt = u.CreatedAt,
                        UpdatedAt = u.UpdatedAt,
                        Role = new Role
                        {
                            Id = u.Role.Id,
                            Name = u.Role.Name,
                            DisplayName = u.Role.DisplayName
                        }
                    })
                    .FirstOrDefaultAsync(u => u.Id == user.Id);

                return Ok(updatedUser);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user profile");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<User>> GetUserById(string id)
        {
            try
            {
                if (!Guid.TryParse(id, out var userId))
                {
                    return BadRequest("Invalid user ID format");
                }

                var user = await _context.Users
                    .Include(u => u.Role)
                    .Select(u => new User
                    {
                        Id = u.Id,
                        Username = u.Username,
                        Email = u.Email,
                        FullName = u.FullName,
                        PhoneNumber = u.PhoneNumber,
                        IsActive = u.IsActive,
                        EmailVerified = u.EmailVerified,
                        LastLoginAt = u.LastLoginAt,
                        CreatedAt = u.CreatedAt,
                        UpdatedAt = u.UpdatedAt,
                        Role = new Role
                        {
                            Id = u.Role.Id,
                            Name = u.Role.Name,
                            DisplayName = u.Role.DisplayName
                        }
                    })
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    return NotFound("User not found");
                }

                return Ok(user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user by ID");
                return StatusCode(500, "Internal server error");
            }
        }

        private string? GetCurrentUserId()
        {
            return User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }
    }
}
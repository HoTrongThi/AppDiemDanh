using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backendDOTNET.Data;
using backendDOTNET.Models;
using BCrypt.Net;

namespace backendDOTNET.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;

        public AuthController(AppDbContext context, IConfiguration configuration, ILogger<AuthController> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
                {
                    return BadRequest(new { message = "Username and password are required" });
                }

                // Find user by username or email
                var user = await _context.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u => u.Username == request.Username || u.Email == request.Username);

                if (user == null || !user.IsActive)
                {
                    _logger.LogWarning($"Login attempt failed for user: {request.Username}");
                    return Unauthorized(new { message = "Invalid credentials" });
                }

                // Verify password
                if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                {
                    _logger.LogWarning($"Invalid password for user: {request.Username}");
                    return Unauthorized(new { message = "Invalid credentials" });
                }

                // Update last login
                user.LastLoginAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                // Generate JWT token
                var token = GenerateJwtToken(user);

                _logger.LogInformation($"User {user.Username} logged in successfully");

                return Ok(new
                {
                    token,
                    user = new
                    {
                        id = user.Id,
                        username = user.Username,
                        email = user.Email,
                        fullName = user.FullName,
                        role = user.Role.Name,
                        permissions = user.Role.Permissions
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login");
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            try
            {
                // Validate input
                if (string.IsNullOrEmpty(request.Username) || 
                    string.IsNullOrEmpty(request.Email) || 
                    string.IsNullOrEmpty(request.Password) ||
                    string.IsNullOrEmpty(request.FullName))
                {
                    return BadRequest(new { message = "All fields are required" });
                }

                // Check if user already exists
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Username == request.Username || u.Email == request.Email);

                if (existingUser != null)
                {
                    return BadRequest(new { message = "Username or email already exists" });
                }

                // Get requested role or default to User
                var roleName = !string.IsNullOrEmpty(request.Role) ? request.Role : "User";
                var userRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
                
                if (userRole == null)
                {
                    // If requested role doesn't exist, try to get User role as fallback
                    userRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "User");
                    if (userRole == null)
                    {
                        _logger.LogError($"Role '{roleName}' not found and User role also not found");
                        return StatusCode(500, new { message = $"Role '{roleName}' not found. Please contact administrator." });
                    }
                    _logger.LogWarning($"Role '{roleName}' not found, using User role as fallback");
                }

                // Create new user
                var user = new User
                {
                    Username = request.Username,
                    Email = request.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                    FullName = request.FullName,
                    PhoneNumber = request.PhoneNumber,
                    RoleId = userRole.Id,
                    IsActive = true,
                    EmailVerified = false
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"New user registered: {user.Username}");

                return Ok(new { message = "User registered successfully", userId = user.Id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during registration");
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        [HttpGet("test-db")]
        public async Task<IActionResult> TestDatabase()
        {
            try
            {
                var canConnect = await _context.Database.CanConnectAsync();
                if (!canConnect)
                {
                    return StatusCode(500, new { message = "Cannot connect to database" });
                }

                var stats = new
                {
                    rolesCount = await _context.Roles.CountAsync(),
                    usersCount = await _context.Users.CountAsync(),
                    eventsCount = await _context.Events.CountAsync(),
                    attendanceCount = await _context.AttendanceRecords.CountAsync()
                };

                return Ok(new
                {
                    message = "Database connection successful",
                    stats,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database test failed");
                return StatusCode(500, new { message = "Database test failed", error = ex.Message });
            }
        }

        private string GenerateJwtToken(User user)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");
            var issuer = jwtSettings["Issuer"] ?? "AppDiemDanh";
            var audience = jwtSettings["Audience"] ?? "AppDiemDanh-Users";
            var expiryHours = int.Parse(jwtSettings["ExpiryHours"] ?? "24");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role.Name),
                new Claim("full_name", user.FullName)
            };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(expiryHours),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class RegisterRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string Role { get; set; } = "User"; // Default to User role
    }
}
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
    [Route("api/admin/organizations")]
    public class AdminOrganizationsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AdminOrganizationsController> _logger;

        public AdminOrganizationsController(AppDbContext context, ILogger<AdminOrganizationsController> logger)
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

        // GET: api/admin/organizations
        [HttpGet]
        public async Task<ActionResult<object>> GetOrganizations()
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var organizations = await _context.Organizations
                    .Include(o => o.Parent)
                    .Include(o => o.UserOrganizations)
                    .OrderBy(o => o.Name)
                    .Select(o => new
                    {
                        o.Id,
                        o.Name,
                        o.Description,
                        o.Type,
                        o.Code,
                        o.ParentId,
                        ParentName = o.Parent != null ? o.Parent.Name : null,
                        o.IsActive,
                        MemberCount = o.UserOrganizations.Count,
                        o.CreatedAt,
                        o.UpdatedAt
                    })
                    .ToListAsync();

                return Ok(new { success = true, data = organizations });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting organizations");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // GET: api/admin/organizations/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetOrganization(Guid id)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var organization = await _context.Organizations
                    .Include(o => o.Parent)
                    .Include(o => o.UserOrganizations)
                        .ThenInclude(uo => uo.User)
                    .Where(o => o.Id == id)
                    .Select(o => new
                    {
                        o.Id,
                        o.Name,
                        o.Description,
                        o.Type,
                        o.Code,
                        o.ParentId,
                        ParentName = o.Parent != null ? o.Parent.Name : null,
                        o.IsActive,
                        Members = o.UserOrganizations.Select(uo => new
                        {
                            uo.User.Id,
                            uo.User.Username,
                            uo.User.FullName,
                            uo.User.Email,
                            uo.Role
                        }).ToList(),
                        o.CreatedAt,
                        o.UpdatedAt
                    })
                    .FirstOrDefaultAsync();

                if (organization == null)
                {
                    return NotFound(new { success = false, message = "Organization not found" });
                }

                return Ok(new { success = true, data = organization });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting organization {Id}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // POST: api/admin/organizations
        [HttpPost]
        public async Task<ActionResult<object>> CreateOrganization([FromBody] CreateOrganizationDto dto)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                // Check if parent exists
                if (dto.ParentId.HasValue)
                {
                    var parentExists = await _context.Organizations.AnyAsync(o => o.Id == dto.ParentId.Value);
                    if (!parentExists)
                    {
                        return BadRequest(new { success = false, message = "Parent organization not found" });
                    }
                }

                var organization = new Organization
                {
                    Id = Guid.NewGuid(),
                    Name = dto.Name,
                    Description = dto.Description,
                    Type = dto.Type,
                    Code = dto.Code,
                    ParentId = dto.ParentId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Organizations.Add(organization);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        organization.Id,
                        organization.Name,
                        organization.Description,
                        organization.Type,
                        organization.Code,
                        organization.ParentId,
                        organization.IsActive,
                        organization.CreatedAt
                    },
                    message = "Organization created successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating organization");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // PUT: api/admin/organizations/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<object>> UpdateOrganization(Guid id, [FromBody] UpdateOrganizationDto dto)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var organization = await _context.Organizations.FindAsync(id);
                if (organization == null)
                {
                    return NotFound(new { success = false, message = "Organization not found" });
                }

                // Check if parent exists and prevent circular reference
                if (dto.ParentId.HasValue)
                {
                    if (dto.ParentId.Value == id)
                    {
                        return BadRequest(new { success = false, message = "Organization cannot be its own parent" });
                    }

                    var parentExists = await _context.Organizations.AnyAsync(o => o.Id == dto.ParentId.Value);
                    if (!parentExists)
                    {
                        return BadRequest(new { success = false, message = "Parent organization not found" });
                    }
                }

                if (!string.IsNullOrEmpty(dto.Name))
                    organization.Name = dto.Name;

                if (dto.Description != null)
                    organization.Description = dto.Description;

                if (!string.IsNullOrEmpty(dto.Type))
                    organization.Type = dto.Type;

                if (dto.Code != null)
                    organization.Code = dto.Code;

                if (dto.ParentId.HasValue)
                    organization.ParentId = dto.ParentId;

                if (dto.IsActive.HasValue)
                    organization.IsActive = dto.IsActive.Value;

                organization.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        organization.Id,
                        organization.Name,
                        organization.Description,
                        organization.Type,
                        organization.Code,
                        organization.ParentId,
                        organization.IsActive,
                        organization.UpdatedAt
                    },
                    message = "Organization updated successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating organization {Id}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // DELETE: api/admin/organizations/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult<object>> DeleteOrganization(Guid id)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var organization = await _context.Organizations
                    .Include(o => o.Children)
                    .Include(o => o.UserOrganizations)
                    .FirstOrDefaultAsync(o => o.Id == id);

                if (organization == null)
                {
                    return NotFound(new { success = false, message = "Organization not found" });
                }

                // Check if has children
                if (organization.Children.Any())
                {
                    return BadRequest(new { success = false, message = "Cannot delete organization with sub-organizations" });
                }

                // Remove all user associations
                _context.UserOrganizations.RemoveRange(organization.UserOrganizations);

                _context.Organizations.Remove(organization);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Organization deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting organization {Id}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // GET: api/admin/organizations/{id}/members
        [HttpGet("{id}/members")]
        public async Task<ActionResult<object>> GetOrganizationMembers(Guid id)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var members = await _context.UserOrganizations
                    .Where(uo => uo.OrganizationId == id)
                    .Include(uo => uo.User)
                        .ThenInclude(u => u.Role)
                    .Select(uo => new
                    {
                        uo.Id,
                        uo.UserId,
                        uo.User.Username,
                        uo.User.FullName,
                        uo.User.Email,
                        Role = new
                        {
                            uo.User.Role.Id,
                            uo.User.Role.Name,
                            uo.User.Role.DisplayName
                        },
                        OrganizationRole = uo.Role,
                        uo.CreatedAt
                    })
                    .ToListAsync();

                return Ok(new { success = true, data = members });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting organization members {Id}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // POST: api/admin/organizations/{id}/members
        [HttpPost("{id}/members")]
        public async Task<ActionResult<object>> AddMember(Guid id, [FromBody] AddMemberDto dto)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var organization = await _context.Organizations.FindAsync(id);
                if (organization == null)
                {
                    return NotFound(new { success = false, message = "Organization not found" });
                }

                var user = await _context.Users.FindAsync(dto.UserId);
                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                // Check if already member
                var exists = await _context.UserOrganizations
                    .AnyAsync(uo => uo.OrganizationId == id && uo.UserId == dto.UserId);

                if (exists)
                {
                    return BadRequest(new { success = false, message = "User is already a member" });
                }

                var userOrg = new UserOrganization
                {
                    Id = Guid.NewGuid(),
                    UserId = dto.UserId,
                    OrganizationId = id,
                    Role = dto.Role,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.UserOrganizations.Add(userOrg);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Member added successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding member to organization {Id}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // DELETE: api/admin/organizations/{id}/members/{userId}
        [HttpDelete("{id}/members/{userId}")]
        public async Task<ActionResult<object>> RemoveMember(Guid id, Guid userId)
        {
            try
            {
                if (!await IsAdminAsync())
                {
                    return Forbid();
                }

                var userOrg = await _context.UserOrganizations
                    .FirstOrDefaultAsync(uo => uo.OrganizationId == id && uo.UserId == userId);

                if (userOrg == null)
                {
                    return NotFound(new { success = false, message = "Member not found" });
                }

                _context.UserOrganizations.Remove(userOrg);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Member removed successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing member from organization {Id}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }
    }

    // DTOs
    public class AddMemberDto
    {
        public Guid UserId { get; set; }
        public string? Role { get; set; }
    }
}

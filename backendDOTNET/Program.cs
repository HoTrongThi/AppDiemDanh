using Microsoft.EntityFrameworkCore;
using backendDOTNET.Data;
using backendDOTNET.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

// Configure Entity Framework with PostgreSQL (without PostGIS for now)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
    ));

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
    {
        policy.WithOrigins("http://localhost:4200") // Angular dev server
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey is not configured");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// Register application services
builder.Services.AddScoped<IQrCodeService, QrCodeService>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Configure JSON serialization for better API responses
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
        options.JsonSerializerOptions.WriteIndented = true;
    });

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { 
        Title = "App Điểm Danh API", 
        Version = "v1",
        Description = "API for QR-based attendance system with Wi-Fi/GPS verification"
    });
    
    // Configure JWT in Swagger
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Add logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "App Điểm Danh API v1");
        c.RoutePrefix = string.Empty; // Set Swagger UI at app's root
    });
}

app.UseHttpsRedirection();

// Enable CORS
app.UseCors("AllowAngularApp");

// Enable Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Test database connection and seed data on startup
try
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    
    // Test connection
    await context.Database.CanConnectAsync();
    app.Logger.LogInformation("✅ Database connection successful!");
    
    // Seed default roles if they don't exist
    await SeedDefaultRoles(context, app.Logger);
    
    // Log some basic info
    var rolesCount = await context.Roles.CountAsync();
    var usersCount = await context.Users.CountAsync();
    var eventsCount = await context.Events.CountAsync();
    
    app.Logger.LogInformation($"📊 Database stats: {rolesCount} roles, {usersCount} users, {eventsCount} events");
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "❌ Database connection failed!");
}

app.Logger.LogInformation("🚀 App Điểm Danh API is starting...");
app.Logger.LogInformation("📖 Swagger UI available at: https://localhost:7xxx (check your port)");

app.Run();

// Helper method to seed default roles
static async Task SeedDefaultRoles(AppDbContext context, ILogger logger)
{
    try
    {
        var defaultRoles = new[]
        {
            new { Name = "User", DisplayName = "Người dùng", Description = "Người dùng thông thường, có thể tham gia sự kiện và điểm danh" },
            new { Name = "Manager", DisplayName = "Quản lý", Description = "Quản lý sự kiện, có thể tạo và quản lý sự kiện" },
            new { Name = "Admin", DisplayName = "Quản trị viên", Description = "Quản trị toàn hệ thống, có toàn quyền" }
        };

        foreach (var roleData in defaultRoles)
        {
            var existingRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == roleData.Name);
            if (existingRole == null)
            {
                var role = new backendDOTNET.Models.Role
                {
                    Name = roleData.Name,
                    DisplayName = roleData.DisplayName,
                    Description = roleData.Description,
                    IsActive = true,
                    Permissions = System.Text.Json.JsonDocument.Parse("{}") // Empty permissions for now
                };
                
                context.Roles.Add(role);
                logger.LogInformation($"🔧 Created role: {roleData.Name}");
            }
        }
        
        var changes = await context.SaveChangesAsync();
        if (changes > 0)
        {
            logger.LogInformation($"✅ Seeded {changes} default roles");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "❌ Error seeding default roles");
    }
}

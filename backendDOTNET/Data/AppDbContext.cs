using Microsoft.EntityFrameworkCore;
using backendDOTNET.Models;
using System.Text.Json;

namespace backendDOTNET.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // DbSets
        public DbSet<Role> Roles { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Event> Events { get; set; }
        public DbSet<EventParticipant> EventParticipants { get; set; }
        public DbSet<AttendanceRecord> AttendanceRecords { get; set; }
        public DbSet<QrSession> QrSessions { get; set; }
        public DbSet<VerifierSecret> VerifierSecrets { get; set; }
        public DbSet<DeviceAttestation> DeviceAttestations { get; set; }
        public DbSet<RateLimit> RateLimits { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<SystemSetting> SystemSettings { get; set; }
        public DbSet<Organization> Organizations { get; set; }
        public DbSet<UserOrganization> UserOrganizations { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure table names to match PostgreSQL convention
            modelBuilder.Entity<Role>().ToTable("roles");
            modelBuilder.Entity<User>().ToTable("users");
            modelBuilder.Entity<Event>().ToTable("events");
            modelBuilder.Entity<EventParticipant>().ToTable("event_participants");
            modelBuilder.Entity<AttendanceRecord>().ToTable("attendance_records");
            modelBuilder.Entity<QrSession>().ToTable("qr_sessions");
            modelBuilder.Entity<VerifierSecret>().ToTable("verifier_secrets");
            modelBuilder.Entity<DeviceAttestation>().ToTable("device_attestations");
            modelBuilder.Entity<RateLimit>().ToTable("rate_limits");
            modelBuilder.Entity<AuditLog>().ToTable("audit_logs");
            modelBuilder.Entity<SystemSetting>().ToTable("system_settings");
            modelBuilder.Entity<Organization>().ToTable("organizations");
            modelBuilder.Entity<UserOrganization>().ToTable("user_organizations");

            // Configure column names to match PostgreSQL snake_case convention
            ConfigureColumnNames(modelBuilder);

            // Configure relationships
            ConfigureRelationships(modelBuilder);

            // Configure constraints and indexes
            ConfigureConstraints(modelBuilder);

            // Configure enums
            ConfigureEnums(modelBuilder);

            // Configure JSON columns
            ConfigureJsonColumns(modelBuilder);

            // Configure PostGIS spatial columns
            ConfigureSpatialColumns(modelBuilder);
        }

        private void ConfigureColumnNames(ModelBuilder modelBuilder)
        {
            // Role entity
            modelBuilder.Entity<Role>(entity =>
            {
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Name).HasColumnName("name");
                entity.Property(e => e.DisplayName).HasColumnName("display_name");
                entity.Property(e => e.Permissions).HasColumnName("permissions");
                entity.Property(e => e.Description).HasColumnName("description");
                entity.Property(e => e.IsActive).HasColumnName("is_active");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            });

            // User entity
            modelBuilder.Entity<User>(entity =>
            {
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Username).HasColumnName("username");
                entity.Property(e => e.Email).HasColumnName("email");
                entity.Property(e => e.PasswordHash).HasColumnName("password_hash");
                entity.Property(e => e.FullName).HasColumnName("full_name");
                entity.Property(e => e.PhoneNumber).HasColumnName("phone_number");
                entity.Property(e => e.RoleId).HasColumnName("role_id");
                entity.Property(e => e.IsActive).HasColumnName("is_active");
                entity.Property(e => e.EmailVerified).HasColumnName("email_verified");
                entity.Property(e => e.LastLoginAt).HasColumnName("last_login_at");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            });

            // Event entity
            modelBuilder.Entity<Event>(entity =>
            {
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Name).HasColumnName("name");
                entity.Property(e => e.Description).HasColumnName("description");
                entity.Property(e => e.Latitude).HasColumnName("latitude");
                entity.Property(e => e.Longitude).HasColumnName("longitude");
                entity.Property(e => e.LocationName).HasColumnName("location_name");
                entity.Property(e => e.RadiusMeters).HasColumnName("radius_meters");
                entity.Property(e => e.StartTime).HasColumnName("start_time");
                entity.Property(e => e.EndTime).HasColumnName("end_time");
                entity.Property(e => e.CreatedBy).HasColumnName("created_by");
                entity.Property(e => e.Status).HasColumnName("status");
                entity.Property(e => e.QrRefreshIntervalSeconds).HasColumnName("qr_refresh_interval_seconds");
                entity.Property(e => e.MaxParticipants).HasColumnName("max_participants");
                entity.Property(e => e.RequireGps).HasColumnName("require_gps");
                entity.Property(e => e.AllowLateCheckin).HasColumnName("allow_late_checkin");
                entity.Property(e => e.LateCheckinMinutes).HasColumnName("late_checkin_minutes");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            });

            // Continue with other entities...
            ConfigureOtherEntityColumnNames(modelBuilder);
        }

        private void ConfigureOtherEntityColumnNames(ModelBuilder modelBuilder)
        {
            // EventParticipant entity
            modelBuilder.Entity<EventParticipant>(entity =>
            {
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.EventId).HasColumnName("event_id");
                entity.Property(e => e.UserId).HasColumnName("user_id");
                entity.Property(e => e.InvitedAt).HasColumnName("invited_at");
                entity.Property(e => e.Status).HasColumnName("status");
                entity.Property(e => e.InvitedBy).HasColumnName("invited_by");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            });

            // AttendanceRecord entity
            modelBuilder.Entity<AttendanceRecord>(entity =>
            {
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id");
                entity.Property(e => e.EventId).HasColumnName("event_id");
                entity.Property(e => e.Status).HasColumnName("status");
                entity.Property(e => e.CheckInMethod).HasColumnName("check_in_method");
                entity.Property(e => e.Timestamp).HasColumnName("timestamp");
                entity.Property(e => e.GpsLatitude).HasColumnName("gps_latitude");
                entity.Property(e => e.GpsLongitude).HasColumnName("gps_longitude");
                entity.Property(e => e.GpsAccuracyMeters).HasColumnName("gps_accuracy_meters");
                entity.Property(e => e.VerifierTokenHash).HasColumnName("verifier_token_hash");
                entity.Property(e => e.DeviceInfo).HasColumnName("device_info");
                entity.Property(e => e.Metadata).HasColumnName("metadata");
                entity.Property(e => e.VerifiedBy).HasColumnName("verified_by");
                entity.Property(e => e.VerificationNotes).HasColumnName("verification_notes");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            });

            // QrSession entity
            modelBuilder.Entity<QrSession>(entity =>
            {
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.EventId).HasColumnName("event_id");
                entity.Property(e => e.SessionId).HasColumnName("session_id");
                entity.Property(e => e.Nonce).HasColumnName("nonce");
                entity.Property(e => e.Signature).HasColumnName("signature");
                entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
                entity.Property(e => e.UsedAt).HasColumnName("used_at");
                entity.Property(e => e.UsedByUserId).HasColumnName("used_by_user_id");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            });

            // Continue with remaining entities...
            ConfigureRemainingEntityColumnNames(modelBuilder);
        }

        private void ConfigureRemainingEntityColumnNames(ModelBuilder modelBuilder)
        {
            // VerifierSecret entity
            modelBuilder.Entity<VerifierSecret>(entity =>
            {
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.SecretKey).HasColumnName("secret_key");
                entity.Property(e => e.Algorithm).HasColumnName("algorithm");
                entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
                entity.Property(e => e.IsActive).HasColumnName("is_active");
                entity.Property(e => e.RotationVersion).HasColumnName("rotation_version");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            });

            // DeviceAttestation entity
            modelBuilder.Entity<DeviceAttestation>(entity =>
            {
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id");
                entity.Property(e => e.DeviceFingerprint).HasColumnName("device_fingerprint");
                entity.Property(e => e.AttestationData).HasColumnName("attestation_data");
                entity.Property(e => e.Platform).HasColumnName("platform");
                entity.Property(e => e.UserAgent).HasColumnName("user_agent");
                entity.Property(e => e.IpAddress).HasColumnName("ip_address");
                entity.Property(e => e.IsTrusted).HasColumnName("is_trusted");
                entity.Property(e => e.LastUsedAt).HasColumnName("last_used_at");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            });

            // RateLimit entity
            modelBuilder.Entity<RateLimit>(entity =>
            {
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Identifier).HasColumnName("identifier");
                entity.Property(e => e.ActionType).HasColumnName("action_type");
                entity.Property(e => e.AttemptCount).HasColumnName("attempt_count");
                entity.Property(e => e.WindowStart).HasColumnName("window_start");
                entity.Property(e => e.BlockedUntil).HasColumnName("blocked_until");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            });

            // AuditLog entity
            modelBuilder.Entity<AuditLog>(entity =>
            {
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id");
                entity.Property(e => e.Action).HasColumnName("action");
                entity.Property(e => e.EntityType).HasColumnName("entity_type");
                entity.Property(e => e.EntityId).HasColumnName("entity_id");
                entity.Property(e => e.Details).HasColumnName("details");
                entity.Property(e => e.IpAddress).HasColumnName("ip_address");
                entity.Property(e => e.UserAgent).HasColumnName("user_agent");
                entity.Property(e => e.Success).HasColumnName("success");
                entity.Property(e => e.ErrorMessage).HasColumnName("error_message");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            });

            // SystemSetting entity
            modelBuilder.Entity<SystemSetting>(entity =>
            {
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Key).HasColumnName("key");
                entity.Property(e => e.Value).HasColumnName("value");
                entity.Property(e => e.Description).HasColumnName("description");
                entity.Property(e => e.IsPublic).HasColumnName("is_public");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            });
        }

        private void ConfigureRelationships(ModelBuilder modelBuilder)
        {
            // User -> Role relationship
            modelBuilder.Entity<User>()
                .HasOne(u => u.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RoleId)
                .OnDelete(DeleteBehavior.Restrict);

            // Event -> User (Creator) relationship
            modelBuilder.Entity<Event>()
                .HasOne(e => e.Creator)
                .WithMany(u => u.CreatedEvents)
                .HasForeignKey(e => e.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);

            // EventParticipant relationships
            modelBuilder.Entity<EventParticipant>()
                .HasOne(ep => ep.Event)
                .WithMany(e => e.Participants)
                .HasForeignKey(ep => ep.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<EventParticipant>()
                .HasOne(ep => ep.User)
                .WithMany(u => u.EventParticipants)
                .HasForeignKey(ep => ep.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // AttendanceRecord relationships
            modelBuilder.Entity<AttendanceRecord>()
                .HasOne(ar => ar.User)
                .WithMany(u => u.AttendanceRecords)
                .HasForeignKey(ar => ar.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<AttendanceRecord>()
                .HasOne(ar => ar.Event)
                .WithMany(e => e.AttendanceRecords)
                .HasForeignKey(ar => ar.EventId)
                .OnDelete(DeleteBehavior.Restrict);

            // QrSession -> Event relationship
            modelBuilder.Entity<QrSession>()
                .HasOne(qs => qs.Event)
                .WithMany(e => e.QrSessions)
                .HasForeignKey(qs => qs.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            // DeviceAttestation -> User relationship
            modelBuilder.Entity<DeviceAttestation>()
                .HasOne(da => da.User)
                .WithMany(u => u.DeviceAttestations)
                .HasForeignKey(da => da.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // AuditLog -> User relationship
            modelBuilder.Entity<AuditLog>()
                .HasOne(al => al.User)
                .WithMany(u => u.AuditLogs)
                .HasForeignKey(al => al.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        }

        private void ConfigureConstraints(ModelBuilder modelBuilder)
        {
            // Unique constraints
            modelBuilder.Entity<Role>()
                .HasIndex(r => r.Name)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<EventParticipant>()
                .HasIndex(ep => new { ep.EventId, ep.UserId })
                .IsUnique();

            modelBuilder.Entity<AttendanceRecord>()
                .HasIndex(ar => new { ar.UserId, ar.EventId })
                .IsUnique();

            modelBuilder.Entity<QrSession>()
                .HasIndex(qs => qs.SessionId)
                .IsUnique();

            modelBuilder.Entity<QrSession>()
                .HasIndex(qs => qs.Nonce)
                .IsUnique();

            modelBuilder.Entity<DeviceAttestation>()
                .HasIndex(da => new { da.UserId, da.DeviceFingerprint })
                .IsUnique();

            modelBuilder.Entity<RateLimit>()
                .HasIndex(rl => new { rl.Identifier, rl.ActionType })
                .IsUnique();

            modelBuilder.Entity<SystemSetting>()
                .HasIndex(ss => ss.Key)
                .IsUnique();
        }

        private void ConfigureEnums(ModelBuilder modelBuilder)
        {
            // Configure enum conversions to match PostgreSQL enum types
            modelBuilder.Entity<Event>()
                .Property(e => e.Status)
                .HasConversion<string>();

            modelBuilder.Entity<EventParticipant>()
                .Property(ep => ep.Status)
                .HasConversion<string>();

            modelBuilder.Entity<AttendanceRecord>()
                .Property(ar => ar.Status)
                .HasConversion<string>();

            modelBuilder.Entity<AttendanceRecord>()
                .Property(ar => ar.CheckInMethod)
                .HasConversion<string>();
        }

        private void ConfigureJsonColumns(ModelBuilder modelBuilder)
        {
            // Configure JSON columns
            modelBuilder.Entity<Role>()
                .Property(r => r.Permissions)
                .HasColumnType("jsonb");

            modelBuilder.Entity<AttendanceRecord>()
                .Property(ar => ar.DeviceInfo)
                .HasColumnType("jsonb");

            modelBuilder.Entity<AttendanceRecord>()
                .Property(ar => ar.Metadata)
                .HasColumnType("jsonb");

            modelBuilder.Entity<DeviceAttestation>()
                .Property(da => da.AttestationData)
                .HasColumnType("jsonb");

            modelBuilder.Entity<AuditLog>()
                .Property(al => al.Details)
                .HasColumnType("jsonb");

            modelBuilder.Entity<SystemSetting>()
                .Property(ss => ss.Value)
                .HasColumnType("jsonb");
        }

        private void ConfigureSpatialColumns(ModelBuilder modelBuilder)
        {
            // Temporarily disable PostGIS spatial columns for testing
            // Will re-enable after basic functionality works
            
            // modelBuilder.Entity<Event>()
            //     .Property(e => e.Location)
            //     .HasColumnType("geometry(Point,4326)");

            // modelBuilder.Entity<AttendanceRecord>()
            //     .Property(ar => ar.GpsCoordinates)
            //     .HasColumnType("geometry(Point,4326)");
        }
    }
}
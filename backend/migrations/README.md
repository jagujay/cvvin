# Database Migrations

This folder contains all SQL migration scripts for the CVVIN Platform database.

## 🛠️ Migration Tools

- **`run-migration.js`** - Node.js migration runner script
  - Run all migrations automatically
  - Run specific migrations
  - Supports environment variables for configuration

## 📋 Migration Files

### Combined Migration
- **`000_COMBINED_ALL_MIGRATIONS.sql`** - Complete database setup (all migrations combined)
  - Use this for **fresh database installations**
  - Contains all migrations in chronological order

### Individual Migrations (Chronological Order)

1. **`001_initial_database_setup.sql`** - Initial database schema
   - Creates core tables: `users`, `user_profiles`, `files`, `resume_analyses`, `interview_sessions`, `session_components`
   - Sets up indexes and triggers
   - Enables UUID extension

2. **`002_fix_files_table.sql`** - Files table enhancement
   - Adds `created_at` and `updated_at` columns to files table
   - Creates trigger for automatic timestamp updates

3. **`003_create_proctoring_violations_table.sql`** - Proctoring system
   - Creates `proctoring_violations` table
   - Tracks interview violations (tab switches, multiple faces, etc.)
   - Includes severity levels and metadata

4. **`004_add_violation_count_column.sql`** - Violation tracking enhancement
   - Adds `count` column to track repeated violations

5. **`005_add_unique_constraint_session_components.sql`** - Data integrity
   - Ensures unique component types per session
   - (Note: Already included in initial schema)

6. **`006_add_target_roles.sql`** - User profile enhancement
   - Adds `target_roles` JSONB column to user_profiles
   - Allows users to specify target job roles

## 🚀 How to Use

### Option 1: Using the Migration Runner (Recommended)

We provide a Node.js migration runner script for easy execution:

```bash
# Navigate to migrations folder
cd backend/migrations

# Run all migrations in order
node run-migration.js --all

# Run the combined migration (fresh install)
node run-migration.js --combined

# Run a specific migration
node run-migration.js 002_fix_files_table.sql
```

**Environment Variables** (optional):
```bash
export DB_USER=postgres
export DB_HOST=localhost
export DB_NAME=cvvin
export DB_PASSWORD=your_password
export DB_PORT=5432

node run-migration.js --all
```

### Option 2: Using psql (Command Line)

If you're setting up a **new database from scratch**:

```bash
# Run the combined migration file
psql -U postgres -d cvvin -f backend/migrations/000_COMBINED_ALL_MIGRATIONS.sql
```

For **incremental migrations**:

```bash
# Run migrations in order
psql -U postgres -d cvvin -f backend/migrations/001_initial_database_setup.sql
psql -U postgres -d cvvin -f backend/migrations/002_fix_files_table.sql
psql -U postgres -d cvvin -f backend/migrations/003_create_proctoring_violations_table.sql
# ... and so on
```

### Option 3: Using pgAdmin4 (GUI)

1. Open pgAdmin4
2. Connect to your database
3. Open Query Tool
4. Load the desired migration file
5. Execute the script

## 📊 Database Schema Overview

### Core Tables

- **`users`** - User authentication and profile data
- **`user_profiles`** - Extended user information (skills, experience, education)
- **`files`** - File storage (resumes, profile images)
- **`resume_analyses`** - AI-powered resume analysis results
- **`interview_sessions`** - Interview session tracking
- **`session_components`** - Individual components of interview sessions (MCQ, Coding, HR)
- **`proctoring_violations`** - Proctoring system violation logs

### Key Features

✅ **UUID Support** - All tables use UUIDs for primary keys  
✅ **JSONB Storage** - Flexible storage for skills, preferences, feedback  
✅ **Automatic Timestamps** - `created_at` and `updated_at` with triggers  
✅ **Foreign Key Constraints** - Data integrity with CASCADE deletes  
✅ **Optimized Indexes** - GIN indexes for JSONB, B-tree for common queries  
✅ **File Storage** - Hybrid approach (database + filesystem)  

## 🔧 Prerequisites

1. **PostgreSQL 12+** installed
2. **Database created**: `cvvin`
3. **User with permissions** to create tables and extensions

## 📝 Creating the Database

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE cvvin;

-- Create user (optional)
CREATE USER cvvin_user WITH PASSWORD 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE cvvin TO cvvin_user;

-- Connect to the database
\c cvvin

-- Now run the migrations
```

## ⚠️ Important Notes

1. **Backup First**: Always backup your database before running migrations
2. **Test Environment**: Test migrations in a development environment first
3. **Order Matters**: Run individual migrations in numerical order
4. **Idempotent**: Most migrations use `IF NOT EXISTS` for safety
5. **No Rollback**: These scripts don't include rollback procedures

## 🔍 Verifying Migrations

After running migrations, verify the schema:

```sql
-- List all tables
\dt

-- Check specific table structure
\d users
\d interview_sessions
\d proctoring_violations

-- Verify indexes
\di

-- Check constraints
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'session_components'::regclass;
```

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JSONB Data Type](https://www.postgresql.org/docs/current/datatype-json.html)
- [UUID Extension](https://www.postgresql.org/docs/current/uuid-ossp.html)

## 🐛 Troubleshooting

### Error: "extension uuid-ossp does not exist"
```sql
-- Run as superuser
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error: "relation already exists"
- This is normal if tables already exist
- Migrations use `IF NOT EXISTS` to prevent errors

### Error: "permission denied"
```sql
-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cvvin_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cvvin_user;
```

## 📞 Support

For issues or questions, refer to the main project documentation or contact the development team.


# Database Setup Guide

## Prerequisites

1. PostgreSQL installed and running
2. Node.js and npm installed
3. All dependencies installed (`npm install`)

## Step 1: Configure Database Connection

1. Open `.env` file in the project root
2. Update `DATABASE_URL` with your PostgreSQL connection string:

```
DATABASE_URL="postgresql://username:password@localhost:5432/eventmap?schema=public"
```

Replace:
- `username` with your PostgreSQL username
- `password` with your PostgreSQL password
- `localhost:5432` with your database host and port (if different)
- `eventmap` with your database name (or create a new database)

## Step 2: Create Database (if not exists)

Connect to PostgreSQL and create the database:

```sql
CREATE DATABASE eventmap;
```

Or using psql command line:
```bash
psql -U postgres
CREATE DATABASE eventmap;
\q
```

## Step 3: Run Database Setup

### Option 1: Using PowerShell (Windows)
```powershell
.\setup-database.ps1
```

### Option 2: Using Bash (Linux/Mac)
```bash
chmod +x setup-database.sh
./setup-database.sh
```

### Option 3: Manual Steps
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database
npm run prisma:seed
```

## Step 4: Verify Setup

1. Check that tables are created:
```bash
npx prisma studio
```

2. Or connect to database and check:
```sql
\dt
```

## Default Admin Account

After seeding, you can login with:
- Email: `admin@eventmap.com`
- Password: `admin123`

**Important:** Change the admin password after first login!

## Troubleshooting

### Connection Error
- Check PostgreSQL is running
- Verify DATABASE_URL in .env file
- Check firewall settings

### Migration Errors
- Drop database and recreate
- Check Prisma schema for errors
- Ensure all dependencies are installed

### Seed Errors
- Check database connection
- Verify Prisma Client is generated
- Check seed.js file for errors

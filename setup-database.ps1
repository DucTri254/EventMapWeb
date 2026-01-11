# PowerShell script to setup database
Write-Host "Setting up Event Map Database..." -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "Please update DATABASE_URL in .env file with your PostgreSQL connection string" -ForegroundColor Yellow
    Write-Host "Example: DATABASE_URL=postgresql://user:password@localhost:5432/eventmap" -ForegroundColor Cyan
    Write-Host ""
}

# Generate Prisma Client
Write-Host "Generating Prisma Client..." -ForegroundColor Green
npx prisma generate

# Run migrations
Write-Host "Running database migrations..." -ForegroundColor Green
npx prisma migrate dev --name init

# Seed database
Write-Host "Seeding database..." -ForegroundColor Green
npm run prisma:seed

Write-Host ""
Write-Host "Database setup completed!" -ForegroundColor Green
Write-Host "You can now start the development server with: npm run dev" -ForegroundColor Cyan

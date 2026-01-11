# Auto setup database with common PostgreSQL configurations
Write-Host "=== Auto Database Setup ===" -ForegroundColor Green
Write-Host ""

# Common PostgreSQL configurations to try
$configs = @(
    @{ user = "postgres"; password = "postgres"; host = "localhost"; port = "5432" },
    @{ user = "postgres"; password = ""; host = "localhost"; port = "5432" },
    @{ user = "postgres"; password = "root"; host = "localhost"; port = "5432" },
    @{ user = "postgres"; password = "admin"; host = "localhost"; port = "5432" }
)

$dbName = "eventmap"
$success = $false

foreach ($config in $configs) {
    Write-Host "Trying: $($config.user)@$($config.host):$($config.port)..." -ForegroundColor Yellow
    
    $databaseUrl = "postgresql://$($config.user):$($config.password)@$($config.host):$($config.port)/$dbName?schema=public"
    
    # Test connection
    $env:PGPASSWORD = $config.password
    try {
        $testResult = & psql -U $config.user -h $config.host -p $config.port -d postgres -c "SELECT 1;" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Connection successful!" -ForegroundColor Green
            
            # Update .env file
            $envContent = Get-Content .env -ErrorAction SilentlyContinue
            if ($null -eq $envContent) {
                $envContent = Get-Content env.example -ErrorAction SilentlyContinue
            }
            
            $updatedContent = @()
            $found = $false
            
            foreach ($line in $envContent) {
                if ($line -match "^DATABASE_URL=") {
                    $updatedContent += "DATABASE_URL=`"$databaseUrl`""
                    $found = $true
                } else {
                    $updatedContent += $line
                }
            }
            
            if (-not $found) {
                $updatedContent += "DATABASE_URL=`"$databaseUrl`""
            }
            
            $updatedContent | Set-Content .env
            Write-Host "[OK] .env file updated!" -ForegroundColor Green
            
            # Create database
            Write-Host "Creating database '$dbName'..." -ForegroundColor Yellow
            $createResult = & psql -U $config.user -h $config.host -p $config.port -d postgres -c "CREATE DATABASE $dbName;" 2>&1
            if ($LASTEXITCODE -eq 0 -or $createResult -match "already exists") {
                Write-Host "[OK] Database ready!" -ForegroundColor Green
                $success = $true
                break
            }
        }
    } catch {
        # Continue to next config
    }
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

if (-not $success) {
    Write-Host ""
    Write-Host "[ERROR] Could not auto-connect to PostgreSQL" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run: .\update-database-config.ps1" -ForegroundColor Yellow
    Write-Host "Or manually edit .env file with your DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Running Prisma migrations..." -ForegroundColor Yellow
npx prisma migrate dev --name init

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Seeding database..." -ForegroundColor Yellow
    npm run prisma:seed
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=== Database Setup Completed Successfully! ===" -ForegroundColor Green
        Write-Host ""
        Write-Host "Default admin account:" -ForegroundColor Cyan
        Write-Host "  Email: admin@eventmap.com" -ForegroundColor White
        Write-Host "  Password: admin123" -ForegroundColor White
        Write-Host ""
        Write-Host "You can now start the server with: npm run dev" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Seeding failed" -ForegroundColor Red
    }
} else {
    Write-Host "[ERROR] Migration failed" -ForegroundColor Red
}

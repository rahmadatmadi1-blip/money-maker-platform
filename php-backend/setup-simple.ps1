# Simple PHP Backend Setup Script
# This script provides instructions and basic setup without requiring admin privileges

Write-Host "Money Maker Platform - PHP Backend Setup" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check PHP installation
if (Test-Command "php") {
    Write-Host "PHP is installed:" -ForegroundColor Green
    php -v
} else {
    Write-Host "PHP is not installed. Please install PHP 8.2 or higher." -ForegroundColor Red
    Write-Host "Download from: https://windows.php.net/download/" -ForegroundColor Yellow
    Write-Host "Or use XAMPP: https://www.apachefriends.org/" -ForegroundColor Yellow
    exit 1
}

# Check Composer installation
if (Test-Command "composer") {
    Write-Host "Composer is installed:" -ForegroundColor Green
    composer --version
} else {
    Write-Host "Composer is not installed. Please install Composer." -ForegroundColor Red
    Write-Host "Download from: https://getcomposer.org/download/" -ForegroundColor Yellow
    exit 1
}

# Navigate to project directory
Set-Location -Path $PSScriptRoot

# Install PHP dependencies
Write-Host "Installing PHP dependencies..." -ForegroundColor Yellow
composer install --no-dev --optimize-autoloader

if ($LASTEXITCODE -eq 0) {
    Write-Host "Dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "Failed to install dependencies. Trying with dev dependencies..." -ForegroundColor Yellow
    composer install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install dependencies. Please check the error messages above." -ForegroundColor Red
        exit 1
    }
}

# Copy environment file
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host ".env file created." -ForegroundColor Green
} else {
    Write-Host ".env file already exists." -ForegroundColor Green
}

# Try to generate application key
try {
    Write-Host "Generating application key..." -ForegroundColor Yellow
    php artisan key:generate --force
    Write-Host "Application key generated successfully!" -ForegroundColor Green
} catch {
    Write-Host "Could not generate application key. Please run 'php artisan key:generate' manually." -ForegroundColor Yellow
}

# Try to generate JWT secret
try {
    Write-Host "Generating JWT secret..." -ForegroundColor Yellow
    php artisan jwt:secret --force
    Write-Host "JWT secret generated successfully!" -ForegroundColor Green
} catch {
    Write-Host "Could not generate JWT secret. Please run 'php artisan jwt:secret' manually." -ForegroundColor Yellow
}

Write-Host "" -ForegroundColor White
Write-Host "Setup completed!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update your .env file with database credentials" -ForegroundColor White
Write-Host "2. Install MySQL/PostgreSQL if not already installed" -ForegroundColor White
Write-Host "3. Run 'php artisan migrate' to create database tables" -ForegroundColor White
Write-Host "4. Run 'php artisan serve' to start the development server" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "Database Setup:" -ForegroundColor Cyan
Write-Host "- MySQL: Create database 'money_maker'" -ForegroundColor White
Write-Host "- Update DB_* variables in .env file" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "For detailed instructions, see README.md" -ForegroundColor Cyan
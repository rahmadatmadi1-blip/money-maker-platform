# Money Maker Platform - PHP Backend Setup Script for Windows
# This script will install PHP, Composer, and setup the Laravel environment

Write-Host "Money Maker Platform - PHP Backend Setup" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This script requires Administrator privileges. Please run as Administrator." -ForegroundColor Red
    exit 1
}

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check and install Chocolatey if not present
if (-not (Test-Command "choco")) {
    Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    refreshenv
} else {
    Write-Host "Chocolatey is already installed." -ForegroundColor Green
}

# Install PHP if not present
if (-not (Test-Command "php")) {
    Write-Host "Installing PHP 8.2..." -ForegroundColor Yellow
    choco install php -y
    refreshenv
} else {
    Write-Host "PHP is already installed." -ForegroundColor Green
    php -v
}

# Install Composer if not present
if (-not (Test-Command "composer")) {
    Write-Host "Installing Composer..." -ForegroundColor Yellow
    choco install composer -y
    refreshenv
} else {
    Write-Host "Composer is already installed." -ForegroundColor Green
    composer --version
}

# Install MySQL if not present
if (-not (Test-Command "mysql")) {
    Write-Host "Installing MySQL..." -ForegroundColor Yellow
    choco install mysql -y
    refreshenv
} else {
    Write-Host "MySQL is already installed." -ForegroundColor Green
}

# Install Redis (optional)
if (-not (Test-Command "redis-server")) {
    Write-Host "Installing Redis..." -ForegroundColor Yellow
    choco install redis-64 -y
    refreshenv
} else {
    Write-Host "Redis is already installed." -ForegroundColor Green
}

# Navigate to project directory
Set-Location -Path $PSScriptRoot

Write-Host "Installing PHP dependencies..." -ForegroundColor Yellow
composer install

if ($LASTEXITCODE -eq 0) {
    Write-Host "Dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "Failed to install dependencies. Please check the error messages above." -ForegroundColor Red
    exit 1
}

# Copy environment file
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host ".env file created. Please update it with your configuration." -ForegroundColor Green
} else {
    Write-Host ".env file already exists." -ForegroundColor Green
}

# Generate application key
Write-Host "Generating application key..." -ForegroundColor Yellow
php artisan key:generate

# Generate JWT secret
Write-Host "Generating JWT secret..." -ForegroundColor Yellow
php artisan jwt:secret

Write-Host "" -ForegroundColor White
Write-Host "Setup completed successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update your .env file with database credentials" -ForegroundColor White
Write-Host "2. Run 'php artisan migrate' to create database tables" -ForegroundColor White
Write-Host "3. Run 'php artisan serve' to start the development server" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "For production deployment, please refer to the README.md file." -ForegroundColor Cyan
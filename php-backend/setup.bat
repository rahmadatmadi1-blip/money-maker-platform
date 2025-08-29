@echo off
echo Money Maker Platform - PHP Backend Setup
echo =========================================
echo.

REM Check if PHP is installed
php -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PHP is not installed or not in PATH
    echo Please install PHP 8.2 or higher from:
    echo https://windows.php.net/download/
    echo Or use XAMPP: https://www.apachefriends.org/
    pause
    exit /b 1
)

echo PHP is installed:
php -v
echo.

REM Check if Composer is installed
composer --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Composer is not installed or not in PATH
    echo Please install Composer from:
    echo https://getcomposer.org/download/
    pause
    exit /b 1
)

echo Composer is installed:
composer --version
echo.

REM Install PHP dependencies
echo Installing PHP dependencies...
composer install --no-dev --optimize-autoloader
if %errorlevel% neq 0 (
    echo Failed with production dependencies, trying with dev dependencies...
    composer install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo Dependencies installed successfully!
echo.

REM Copy environment file
if not exist ".env" (
    echo Creating .env file...
    copy ".env.example" ".env"
    echo .env file created.
) else (
    echo .env file already exists.
)
echo.

REM Generate application key
echo Generating application key...
php artisan key:generate --force
if %errorlevel% neq 0 (
    echo Warning: Could not generate application key automatically
    echo Please run 'php artisan key:generate' manually
)
echo.

REM Generate JWT secret
echo Generating JWT secret...
php artisan jwt:secret --force
if %errorlevel% neq 0 (
    echo Warning: Could not generate JWT secret automatically
    echo Please run 'php artisan jwt:secret' manually
)
echo.

echo Setup completed!
echo =========================================
echo Next steps:
echo 1. Update your .env file with database credentials
echo 2. Install MySQL/PostgreSQL if not already installed
echo 3. Run 'php artisan migrate' to create database tables
echo 4. Run 'php artisan serve' to start the development server
echo.
echo Database Setup:
echo - MySQL: Create database 'money_maker'
echo - Update DB_* variables in .env file
echo.
echo For detailed instructions, see README.md
echo.
pause
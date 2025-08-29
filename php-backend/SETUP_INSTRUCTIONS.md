# Money Maker Platform - PHP Backend Setup Instructions

## Prerequisites

Sebelum menjalankan aplikasi PHP Laravel ini, Anda perlu menginstal beberapa komponen:

### 1. Install PHP 8.1 atau lebih tinggi

**Opsi A: Download PHP Manual**
- Download PHP dari: https://windows.php.net/download/
- Extract ke folder (misal: `C:\php`)
- Tambahkan `C:\php` ke PATH environment variable
- Copy `php.ini-development` menjadi `php.ini`
- Enable extensions yang diperlukan di `php.ini`:
  ```ini
  extension=curl
  extension=fileinfo
  extension=gd
  extension=mbstring
  extension=openssl
  extension=pdo_mysql
  extension=zip
  ```

**Opsi B: Install XAMPP (Recommended)**
- Download XAMPP dari: https://www.apachefriends.org/
- Install XAMPP dengan Apache, MySQL, dan PHP
- Tambahkan `C:\xampp\php` ke PATH environment variable

### 2. Install Composer

- Download Composer dari: https://getcomposer.org/download/
- Jalankan installer dan ikuti petunjuk
- Pastikan `composer` dapat dijalankan dari command line

### 3. Install MySQL/MariaDB

**Jika menggunakan XAMPP:**
- MySQL sudah termasuk dalam XAMPP
- Start MySQL service dari XAMPP Control Panel

**Jika install manual:**
- Download MySQL dari: https://dev.mysql.com/downloads/mysql/
- Install dan setup root password

### 4. Install Redis (Optional tapi Recommended)

- Download Redis untuk Windows dari: https://github.com/microsoftarchive/redis/releases
- Extract dan jalankan `redis-server.exe`

## Setup Project

### 1. Install Dependencies

```bash
cd D:\FB\php-backend
composer install
```

### 2. Setup Environment

```bash
# Copy environment file
copy .env.example .env

# Generate application key
php artisan key:generate

# Generate JWT secret
php artisan jwt:secret
```

### 3. Database Setup

1. Buat database MySQL:
   ```sql
   CREATE DATABASE money_maker_platform;
   ```

2. Update file `.env` dengan kredensial database:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=money_maker_platform
   DB_USERNAME=root
   DB_PASSWORD=your_password
   ```

3. Jalankan migrasi database:
   ```bash
   php artisan migrate
   ```

4. Seed database dengan data awal:
   ```bash
   php artisan db:seed
   ```

### 4. Start Development Server

```bash
php artisan serve
```

Aplikasi akan berjalan di: http://localhost:8000

## Testing API

Setelah server berjalan, Anda dapat test API endpoints:

- Health Check: `GET http://localhost:8000/api/health/basic`
- Register: `POST http://localhost:8000/api/register`
- Login: `POST http://localhost:8000/api/login`

## Troubleshooting

### Error: "Class 'PDO' not found"
- Enable `extension=pdo_mysql` di php.ini
- Restart web server

### Error: "JWT secret not set"
- Jalankan: `php artisan jwt:secret`

### Error: "Application key not set"
- Jalankan: `php artisan key:generate`

### Error: Database connection failed
- Pastikan MySQL service berjalan
- Periksa kredensial database di file `.env`
- Test koneksi: `php artisan tinker` kemudian `DB::connection()->getPdo()`

## Production Deployment

Untuk deployment production, lihat file `README.md` untuk instruksi lengkap.

## Support

Jika mengalami masalah, periksa:
1. PHP version: `php -v`
2. Composer version: `composer --version`
3. Laravel version: `php artisan --version`
4. Database connection: `php artisan migrate:status`
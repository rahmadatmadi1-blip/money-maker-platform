# Money Maker Platform - PHP Backend

This is the PHP Laravel backend for the Money Maker Platform, migrated from Node.js.

## Features

- **User Management**: Registration, authentication, profile management
- **Premium Memberships**: Subscription-based premium features
- **Affiliate System**: Referral tracking and commission management
- **E-commerce**: Product catalog, shopping cart, order processing
- **Payment Integration**: Stripe and PayPal support
- **Content Management**: Blog posts, categories, media uploads
- **Marketplace**: Service listings and bookings
- **Analytics**: Revenue tracking, user analytics, performance metrics
- **Admin Panel**: User management, system monitoring
- **API Documentation**: Comprehensive REST API

## Tech Stack

- **Framework**: Laravel 11
- **Database**: MySQL/PostgreSQL
- **Cache**: Redis
- **Authentication**: JWT + Laravel Sanctum
- **Payment**: Stripe, PayPal
- **Email**: Laravel Mail + PHPMailer
- **Image Processing**: Intervention Image
- **Queue**: Redis-based job queues
- **API**: RESTful API with rate limiting

## Installation

### Prerequisites

- PHP 8.2 or higher
- Composer
- MySQL/PostgreSQL
- Redis (optional, for caching and queues)
- Node.js (for frontend integration)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd php-backend
   ```

2. **Install dependencies**
   ```bash
   composer install
   ```

3. **Environment configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   - Database credentials
   - JWT secret
   - Payment gateway keys
   - Email configuration
   - Redis configuration

4. **Generate application key**
   ```bash
   php artisan key:generate
   ```

5. **Generate JWT secret**
   ```bash
   php artisan jwt:secret
   ```

6. **Run database migrations**
   ```bash
   php artisan migrate
   ```

7. **Seed the database (optional)**
   ```bash
   php artisan db:seed
   ```

8. **Start the development server**
   ```bash
   php artisan serve
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/verify-email` - Verify email address

### Users
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `POST /api/user/avatar` - Upload avatar
- `GET /api/user/earnings` - Get user earnings
- `GET /api/user/referrals` - Get referral statistics
- `POST /api/user/upgrade-premium` - Upgrade to premium

### Health Check
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system status

## Configuration

### Database
Configure your database connection in `.env`:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=money_maker
DB_USERNAME=root
DB_PASSWORD=
```

### JWT Authentication
```env
JWT_SECRET=your-jwt-secret
JWT_TTL=60
JWT_REFRESH_TTL=20160
```

### Payment Gateways
```env
STRIPE_KEY=your-stripe-key
STRIPE_SECRET=your-stripe-secret
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-secret
```

### Redis (Optional)
```env
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

## Development

### Running Tests
```bash
php artisan test
```

### Code Style
```bash
composer run-script format
```

### Queue Workers
```bash
php artisan queue:work
```

### Scheduled Tasks
```bash
php artisan schedule:run
```

## Deployment

### Production Setup
1. Set `APP_ENV=production` in `.env`
2. Set `APP_DEBUG=false`
3. Configure proper database and cache settings
4. Set up SSL certificates
5. Configure web server (Apache/Nginx)
6. Set up process manager for queue workers
7. Configure cron jobs for scheduled tasks

### Web Server Configuration

#### Apache
Ensure `.htaccess` is properly configured in the `public` directory.

#### Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/your/project/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

## Security

- JWT tokens for API authentication
- CORS configuration for frontend integration
- Rate limiting on API endpoints
- Input validation and sanitization
- SQL injection protection via Eloquent ORM
- XSS protection
- CSRF protection for web routes

## Monitoring

- Health check endpoints for system monitoring
- Error logging and reporting
- Performance metrics tracking
- Database query optimization

## Support

For support and questions, please refer to the documentation or contact the development team.

## License

This project is proprietary software. All rights reserved.
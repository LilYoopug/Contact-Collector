# Contact Collector - Backend

A Laravel 12 API backend for the Contact Collector application, providing authentication, contact management, and API key-based public endpoints.

## 🚀 Tech Stack

- **PHP 8.2+** - Programming language
- **Laravel 12** - PHP framework
- **Laravel Sanctum** - API token authentication
- **SQLite/MySQL** - Database (SQLite default)
- **Scramble** - Automatic API documentation
- **Midtrans** - Payment gateway integration
- **PHPUnit** - Testing framework

## 📋 Features

### Authentication & Authorization
- 🔐 **User Authentication** - Register, login, logout with Sanctum tokens
- 🔑 **Password Reset** - Email-based password recovery
- 📧 **Email Verification** - Optional email verification
- 👥 **Role-Based Access** - User and Admin roles
- 🛡️ **Rate Limiting** - Protection against abuse

### Contact Management
- 📇 **Full CRUD** - Create, read, update, delete contacts
- 📦 **Batch Operations** - Bulk create, update, delete (rate limited)
- 🔍 **Search & Filter** - Search by name, filter by source, date range
- 📊 **Pagination** - Efficient data loading

### API Key System
- 🔑 **Key Generation** - Create API keys for public endpoints
- 🔄 **Key Regeneration** - Rotate API keys
- 🗑️ **Key Revocation** - Delete compromised keys
- 📊 **Usage Tracking** - Monitor API key usage

### Admin Features
- 👥 **User Management** - Full CRUD for user accounts
- 📊 **Dashboard Stats** - System-wide statistics
- 📈 **Analytics** - User activity and contact metrics

## 📁 Project Structure

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/
│   │   │   │   ├── ApiKeyController.php
│   │   │   │   ├── ContactController.php
│   │   │   │   ├── PublicContactController.php
│   │   │   │   ├── UserController.php
│   │   │   │   └── Auth/
│   │   │   │       └── AuthController.php
│   │   │   └── Auth/              # Breeze auth controllers
│   │   ├── Middleware/
│   │   │   ├── ApiKeyAuth.php
│   │   │   ├── EnsureEmailIsVerified.php
│   │   │   └── RoleMiddleware.php
│   │   ├── Requests/              # Form request validation
│   │   └── Resources/             # API resources
│   ├── Models/
│   │   ├── ApiKey.php
│   │   ├── Contact.php
│   │   └── User.php
│   └── Services/
│       ├── DuplicateDetectionService.php
│       └── PhoneNormalizationService.php
├── config/                        # Configuration files
├── database/
│   ├── factories/                 # Model factories
│   ├── migrations/                # Database migrations
│   └── seeders/                   # Database seeders
├── routes/
│   ├── api.php                    # API routes
│   ├── auth.php                   # Auth routes
│   └── web.php                    # Web routes
└── tests/
    ├── Feature/                   # Feature tests
    │   ├── Auth/
    │   ├── Contact/
    │   └── User/
    └── Unit/                      # Unit tests
```

## 🛠️ Installation

### Prerequisites
- PHP 8.2+
- Composer
- SQLite or MySQL

### Quick Setup

```bash
# Install dependencies and setup
composer setup
```

This runs:
1. `composer install`
2. Copy `.env.example` to `.env`
3. Generate application key
4. Run migrations

### Manual Setup

1. **Install dependencies:**
   ```bash
   composer install
   ```

2. **Environment configuration:**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

3. **Configure database:**
   
   Default is SQLite. For MySQL, update `.env`:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=contact_collector
   DB_USERNAME=root
   DB_PASSWORD=
   ```

4. **Run migrations:**
   ```bash
   php artisan migrate
   ```

5. **Start development server:**
   ```bash
   php artisan serve
   ```

### Development Mode (with hot reload)

```bash
composer dev
```

This starts:
- Laravel server (`php artisan serve`)
- Queue worker (`php artisan queue:listen`)
- Log viewer (`php artisan pail`)
- Vite dev server (`npm run dev`)

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_URL` | Application URL | `http://localhost` |
| `FRONTEND_URL` | Frontend URL (CORS) | - |
| `DB_CONNECTION` | Database driver | `sqlite` |
| `RECAPTCHA_ENABLED` | Enable reCAPTCHA | `true` |
| `RECAPTCHA_SITE_KEY` | reCAPTCHA site key | - |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA secret | - |
| `MIDTRANS_*` | Payment gateway config | - |

### CORS Configuration

Update `config/cors.php` or set `FRONTEND_URL` in `.env`:
```env
FRONTEND_URL=http://localhost:5173
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register new user |
| POST | `/api/login` | Login user |
| POST | `/api/logout` | Logout user (auth required) |
| POST | `/api/forgot-password` | Request password reset |
| POST | `/api/reset-password` | Reset password |

### User (Authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user` | Get current user |
| POST | `/api/user/avatar` | Upload avatar |

### Contacts (Authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contacts` | List contacts (with filters) |
| POST | `/api/contacts` | Create contact |
| GET | `/api/contacts/{id}` | Get contact |
| PUT | `/api/contacts/{id}` | Update contact |
| DELETE | `/api/contacts/{id}` | Delete contact |
| POST | `/api/contacts/batch` | Batch create |
| PATCH | `/api/contacts/batch` | Batch update |
| DELETE | `/api/contacts/batch` | Batch delete |

### API Keys (Authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/api-keys` | List API keys |
| POST | `/api/api-keys` | Create API key |
| POST | `/api/api-keys/{id}/regenerate` | Regenerate key |
| DELETE | `/api/api-keys/{id}` | Delete key |

### Admin (Admin Role Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create user |
| GET | `/api/users/{id}` | Get user |
| PUT | `/api/users/{id}` | Update user |
| DELETE | `/api/users/{id}` | Delete user |
| GET | `/api/dashboard/stats` | Dashboard statistics |

### Public API (API Key Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/public/contacts` | Submit contact (form submission) |

## 🔒 Rate Limiting

| Endpoint Type | Limit |
|--------------|-------|
| Batch operations | 10 requests/minute/user |
| Public API | 100 requests/minute/API key |
| General API | Standard Laravel limits |

## 🧪 Testing

```bash
# Run all tests
composer test

# Run specific test
php artisan test --filter=ContactTest

# Run with coverage
php artisan test --coverage
```

## 📚 API Documentation

API documentation is auto-generated by Scramble:
```
GET /docs/api
```

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `composer setup` | Full initial setup |
| `composer dev` | Start dev environment |
| `composer test` | Run tests |
| `php artisan migrate` | Run migrations |
| `php artisan db:seed` | Seed database |

## 🔗 Related

- [Frontend README](../frontend/README.md) - React SPA documentation
- [Main README](../README.md) - Project overview

## 📄 License

MIT License

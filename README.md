# Zekolah Backend - Educational Management System

Backend API for Zekolah - a school/education management system built with Fastify, TypeScript, MySQL, and JWT authentication.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Fastify v5
- **Language**: TypeScript
- **Database**: MySQL / MariaDB
- **ORM/QueryBuilder**: Knex.js
- **Auth**: JWT + Passport (local strategy)
- **Validation**: Zod
- **Password Hashing**: bcryptjs
- **Security**: Helmet, CORS

## Getting Started

### Prerequisites

- Node.js >= 18
- MySQL / MariaDB server running

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env with your database credentials

# 3. Create MySQL database
mysql -u root -p -e "CREATE DATABASE zekolah CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Run database migrations
npm run migrate

# 5. Seed initial admin user (optional)
npm run seed

# 6. Start development server
npm run dev

# 7. Build for production
npm run build && npm start
```

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### Auth (Public)
| Method | Endpoint           | Description         |
|--------|--------------------|---------------------|
| POST   | `/api/v1/auth/register` | Register new user |
| POST   | `/api/v1/auth/login`    | Login             |
| GET    | `/api/v1/auth/me`       | Get current user    |

### Auth (Protected)
| Method | Endpoint           | Description         |
|--------|--------------------|---------------------|
| GET    | `/api/v1/users`   | List all users      |
| GET    | `/api/v1/users/:id`| Get user by ID      |
| PATCH  | `/api/v1/users/:id`| Update user         |
| DELETE | `/api/v1/users/:id`| Deactivate user     |

### Schools (Protected)
| Method | Endpoint           | Description         |
|--------|--------------------|---------------------|
| GET    | `/api/v1/schools` | List schools        |
| GET    | `/api/v1/schools/:id`| Get school by ID    |
| POST   | `/api/v1/schools` | Create school       |
| PATCH  | `/api/v1/schools/:id`| Update school     |
| DELETE | `/api/v1/schools/:id`| Delete school     |

### Students (Protected)
| Method | Endpoint           | Description         |
|--------|--------------------|---------------------|
| GET    | `/api/v1/students` | List students (paginated) |
| GET    | `/api/v1/students/:id`| Get student by ID  |
| POST   | `/api/v1/students` | Create student      |
| PATCH  | `/api/v1/students/:id`| Update student    |
| DELETE | `/api/v1/students/:id`| Delete student    |

### Teachers (Protected)
| Method | Endpoint           | Description         |
|--------|--------------------|---------------------|
| GET    | `/api/v1/teachers` | List teachers       |
| GET    | `/api/v1/teachers/:id`| Get teacher by ID  |
| POST   | `/api/v1/teachers` | Create teacher      |
| PATCH  | `/api/v1/teachers/:id`| Update teacher    |
| DELETE | `/api/v1/teachers/:id`| Delete teacher    |

### Classes (Protected)
| Method | Endpoint           | Description         |
|--------|--------------------|---------------------|
| GET    | `/api/v1/classes` | List classes        |
| GET    | `/api/v1/classes/:id`| Get class by ID    |
| POST   | `/api/v1/classes` | Create class        |
| PATCH  | `/api/v1/classes/:id`| Update class      |
| DELETE | `/api/v1/classes/:id`| Delete class      |

### Subjects (Protected)
| Method | Endpoint           | Description         |
|--------|--------------------|---------------------|
| GET    | `/api/v1/subjects`| List subjects       |
| GET    | `/api/v1/subjects/:id`| Get subject by ID  |
| POST   | `/api/v1/subjects`| Create subject      |
| PATCH  | `/api/v1/subjects/:id`| Update subject    |
| DELETE | `/api/v1/subjects/:id`| Delete subject    |

### Health Check (Public)
| Method | Endpoint           | Description         |
|--------|--------------------|---------------------|
| GET    | `/health`       | Server health check |
| GET    | `/api/v1/ping`  | API ping            |

## Default Credentials (After Seeding)

| Role  | Email                  | Password      |
|-------|------------------------|---------------|
| Admin | admin@zekolah.id       | Admin@12345   |
| Teacher | teacher@zekolah.id   | Admin@12345   |
| Student | student@zekolah.id   | Admin@12345   |

**⚠️ Change these credentials immediately in production!**

## Project Structure

```
backend/
├── src/
│   ├── config/          # App config, DB, Passport
│   ├── controllers/     # Request handlers (if needed)
│   ├── middlewares/     # Custom middlewares
│   ├── models/          # Data models
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   ├── types/           # TypeScript declarations
│   ├── utils/           # Utilities
│   └── validators/      # Zod schemas
├── migrations/          # Database migrations
��── seeds/               # Database seeds
├── scripts/             # Helper scripts
├── uploads/             # Uploaded files
├── package.json
├── tsconfig.json
├── knexfile.js
└── .env.example
```

## Environment Variables

See `.env.example` for required variables. Key variables:

| Variable        | Description              | Default       |
|-----------------|--------------------------|---------------|
| PORT            | Server port              | `3000`        |
| DB_HOST         | Database host            | `localhost`   |
| DB_NAME         | Database name            | `zekolah`     |
| DB_USER         | Database user            | `root`        |
| DB_PASS         | Database password        | (empty)       |
| JWT_SECRET      | JWT signing secret       | (required)    |
| JWT_EXPIRES_IN  | JWT expiration time      | `7d`          |
| CORS_ORIGIN     | Allowed CORS origins     | Comma-separated list |

## Scripts

| Command                | Description                 |
|------------------------|-----------------------------|
| `npm run dev`          | Start dev server with hot reload |
| `npm run build`        | Compile TypeScript to dist/ |
| `npm start`            | Start production server     |
| `npm run migrate`      | Run database migrations     |
| `npm run migrate:rollback` | Rollback last migration  |
| `npm run seed`         | Seed database               |
| `npm run lint`         | Run ESLint                  |
| `npm run format`       | Format with Prettier        |
| `npm test`             | Run Jest tests              |

## License

MIT

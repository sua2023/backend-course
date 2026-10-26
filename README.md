# Backend Course: Shop API

A REST API for a small online shop, built with **NestJS 11, TypeORM and MySQL**. It is the project for the 8-week backend course.

- **Customers** and **staff** are stored in **separate tables** and log in at separate endpoints.
- JWT authentication. Staff have roles (`admin`, `staff`).
- Categories, products (pagination, filter, sort) and orders (transaction, stock check, idempotency key).
- Swagger docs, health check, validation, rate limiting, safe error responses.
- Migrations, seed data, unit tests, Dockerfile and Docker Compose.

---

## 1. Requirements

| Tool | Version | Check |
| --- | --- | --- |
| Node.js | 22 LTS | `node -v` |
| npm | 10+ | `npm -v` |
| MySQL | 8.x or 9.x | `mysql --version` |
| Docker (optional) | latest | `docker --version` |

## 2. Run locally (MySQL on your machine)

### 2.1 Install dependencies

```bash
cd backend-course
npm install
```

### 2.2 Configure `.env`

Copy the example and edit it:

```bash
cp .env.example .env
```

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=backend-course

JWT_SECRET=change-this-to-a-long-random-secret   # at least 16 characters
JWT_EXPIRES_IN=3600                              # seconds
```

Generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The app checks `.env` at startup and stops with a clear message if something is missing.

### 2.3 Create the database

The name contains a hyphen, so it must be wrapped in backticks:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS \`backend-course\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

(Leave out `-p` if root has no password.)

### 2.4 Create the tables (migrations)

```bash
npm run migration:run
```

This creates `customers`, `staff`, `categories`, `products`, `orders`, `order_items` and the `migrations` history table.

### 2.5 Seed the first admin and a demo catalog

```bash
npm run seed
```

| Account | Email | Password |
| --- | --- | --- |
| Admin (staff table) | `admin@shop.local` | `Admin@12345` |

Change them with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env` **before** seeding. You can run the seed more than once; it only adds what is missing.

### 2.6 Start the API

```bash
npm run start:dev
```

| URL | What |
| --- | --- |
| http://localhost:3000/api/v1 | API base |
| http://localhost:3000/docs | Swagger UI (try every endpoint in the browser) |
| http://localhost:3000/api/v1/health | Health check (`"database": {"status": "up"}`) |

## 3. Try the authentication flow

### Customer: register → login → call a customer endpoint

```bash
# Register (returns a token right away)
curl -X POST http://localhost:3000/api/v1/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@example.com","password":"Secret123","fullName":"Ana"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/customer/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@example.com","password":"Secret123"}'
# → { "accessToken": "eyJ...", "tokenType": "Bearer", "expiresIn": 3600, "account": {...} }

CUSTOMER_TOKEN=eyJ...   # paste the accessToken

# Place an order (same Idempotency-Key again = same order, no double charge)
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Idempotency-Key: 7b1f0e2a-order-1" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":1,"quantity":2},{"productId":4,"quantity":1}]}'

# My orders
curl http://localhost:3000/api/v1/orders/me -H "Authorization: Bearer $CUSTOMER_TOKEN"
```

### Staff: login → manage the shop

```bash
curl -X POST http://localhost:3000/api/v1/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@shop.local","password":"Admin@12345"}'

STAFF_TOKEN=eyJ...

# Create another staff account (admin only)
curl -X POST http://localhost:3000/api/v1/staff \
  -H "Authorization: Bearer $STAFF_TOKEN" -H "Content-Type: application/json" \
  -d '{"email":"noy@shop.local","password":"Staff@12345","fullName":"Noy","role":"staff"}'

# Mark an order as paid
curl -X PATCH http://localhost:3000/api/v1/orders/1/status \
  -H "Authorization: Bearer $STAFF_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"paid"}'
```

### How customer and staff are kept apart

| | Customer | Staff |
| --- | --- | --- |
| Table | `customers` | `staff` (with `role`, `is_active`) |
| Sign up | `POST /auth/customer/register` | No self sign-up. An admin uses `POST /staff` |
| Login | `POST /auth/customer/login` | `POST /auth/staff/login` |
| Token payload | `{ sub, type: "customer" }` | `{ sub, type: "staff" }` |
| Profile | `GET /auth/customer/me` | `GET /auth/staff/me` |

Every token carries `type`, so customer id 1 and staff id 1 are never mixed up. Controllers declare who is allowed in:

```ts
@Auth('customer')                 // any logged-in customer
@Auth('staff')                    // any active staff member
@Auth('staff', StaffRole.Admin)   // admins only
```

On every request, `JwtStrategy` loads the account again. A disabled staff member or a changed role takes effect right away, without waiting for the token to expire.

## 4. Endpoints

All paths start with `/api/v1`.

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| GET | `/health` | public | API + database status |
| POST | `/auth/customer/register` | public | 5 requests/min per IP |
| POST | `/auth/customer/login` | public | 5 requests/min per IP |
| GET | `/auth/customer/me` | customer | |
| POST | `/auth/staff/login` | public | 5 requests/min per IP |
| GET | `/auth/staff/me` | staff | |
| GET | `/staff` · `/staff/:id` | admin | |
| POST | `/staff` | admin | create staff or admin |
| PATCH | `/staff/:id` | admin | name, role, `isActive` |
| GET | `/customers` · `/customers/:id` | staff | paginated |
| GET | `/categories` · `/categories/:id` | public | |
| POST / PATCH | `/categories` · `/categories/:id` | staff | slug generated from name |
| DELETE | `/categories/:id` | admin | refused while it has products |
| GET | `/products` | public | `?page=1&limit=20&search=mouse&categoryId=1&minPrice=10&maxPrice=50&sort=price:asc` |
| GET | `/products/:id` | public | active products only |
| POST / PATCH | `/products` · `/products/:id` | staff | |
| DELETE | `/products/:id` | staff | archives (`isActive=false`); old orders keep the product |
| POST | `/orders` | customer | optional `Idempotency-Key` header |
| GET | `/orders/me` · `/orders/me/:id` | customer | own orders only; others return 404 |
| POST | `/orders/me/:id/cancel` | customer | returns stock |
| GET | `/orders` · `/orders/:id` | staff | `?status=pending&customerId=3` |
| PATCH | `/orders/:id/status` | staff | `pending→paid→shipped`, cancel before shipped |

Error responses always have the same shape:

```json
{ "statusCode": 409, "error": "Conflict", "message": "Not enough stock for \"Clean Code\" (available 2, requested 5)", "path": "/api/v1/orders", "timestamp": "..." }
```

## 5. Scripts

| Command | What it does |
| --- | --- |
| `npm run start:dev` | Start with reload on save |
| `npm run build` / `npm run start:prod` | Compile to `dist/` and run it |
| `npm test` / `npm run test:cov` | Unit tests / with coverage |
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:revert` | Undo the last migration |
| `npm run migration:show` | List migrations and whether they ran |
| `npm run migration:generate --name=AddPhoneToStaff` | Create a migration from entity changes |
| `npm run migration:create --name=Something` | Create an empty migration |
| `npm run seed` | Create the admin + demo catalog |

`synchronize` is always `false`. To change the schema, edit the entity, run `migration:generate`, review the SQL, then run `migration:run`.

## 6. Project structure

```text
src/
  main.ts                    # helmet, CORS, /api/v1 prefix, validation, Swagger
  app.module.ts              # config, TypeORM, rate limit, feature modules
  config/
    env.validation.ts        # checks .env at startup
    database.config.ts       # shared by the app and the TypeORM CLI
  database/
    data-source.ts           # TypeORM CLI entry (migrations, seed)
    migrations/              # schema history
    seeds/seed.ts
  common/
    dto/pagination-query.dto.ts
    entities/timestamped.entity.ts
    filters/all-exceptions.filter.ts
    transformers/decimal.transformer.ts
    utils/                   # password hashing, slugify, db errors
  modules/
    auth/                    # login/register, JWT strategy, guards, @Auth()
    customers/               # customers table
    staff/                   # staff table + admin management
    categories/
    products/
    orders/                  # orders + order_items, transactions
    health/
```

## 7. Database

```text
customers 1──N orders 1──N order_items N──1 products N──1 categories
staff (separate; manages the catalog and orders)
```

| Table | Key columns |
| --- | --- |
| customers | email (unique), password_hash, full_name, phone |
| staff | email (unique), password_hash, full_name, role `admin/staff`, is_active |
| categories | name (unique), slug (unique) |
| products | category_id (FK), name, price `DECIMAL(10,2)`, stock, is_active |
| orders | customer_id (FK), status, total, idempotency_key (unique per customer) |
| order_items | order_id (FK, cascade), product_id (FK), quantity, unit_price |

## 8. Docker (Dockerfile + Compose)

Docker is not required for local development. The files are ready for W7 of the course.

```bash
docker compose up -d --build        # build the API image, start MySQL + API
docker compose logs -f api          # watch logs (migrations run on start)
docker compose exec api npm run seed:prod   # create admin + demo data
docker compose down                 # stop (data stays in the mysql_data volume)
docker compose down -v              # stop and DELETE the database volume
```

- In Compose, the API connects to `DB_HOST=mysql` (the service name), not `localhost`.
- MySQL is published on host port **3307**, so it does not clash with a local MySQL on 3306.
- Set the MySQL root password with `DOCKER_DB_PASSWORD` (default `secret`).
- The container runs `migration:run:prod` before starting, and Docker checks `/api/v1/health`.

## 9. Troubleshooting

| Problem | Fix |
| --- | --- |
| `Invalid environment variables: JWT_SECRET ...` | Set a secret of 16+ characters in `.env` |
| `ER_BAD_DB_ERROR: Unknown database 'backend-course'` | Run step 2.3 |
| `ER_ACCESS_DENIED_ERROR` | Check `DB_USER` / `DB_PASSWORD`; leave `DB_PASSWORD=` empty if root has none |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL is not running: `brew services start mysql` (macOS) |
| `Table 'customers' doesn't exist` | Run `npm run migration:run` |
| `401 Unauthorized` | Token missing or expired. Log in again and send `Authorization: Bearer <token>` |
| `403 Only staff accounts can use this endpoint` | You used a customer token on a staff endpoint (or the reverse) |
| `429 Too Many Requests` | Login rate limit; wait one minute |
| Port 3000 in use | Change `PORT` in `.env` |
# backend-course

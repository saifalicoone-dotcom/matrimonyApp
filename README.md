# Matrimonial Web Application - Backend

Node.js + Express backend for Matrimonial Web Application using Prisma ORM with PostgreSQL.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt
- **File Storage:** Cloudflare R2

## Setup Instructions

### 1. Install Dependencies

```bash
npm install express prisma @prisma/client jsonwebtoken bcrypt dotenv cors

# For development
npm install --save-dev nodemon
```

Or install all at once:

```bash
npm install express prisma @prisma/client jsonwebtoken bcrypt dotenv cors nodemon
```

### 2. Database Setup

1. Install PostgreSQL if not already installed
2. Create a new database:
   ```sql
   CREATE DATABASE matrimonial_db;
   ```

3. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` file with your database credentials:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/matrimonial_db?schema=public"
   ```

### 3. Prisma Setup

1. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

2. Run database migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

   Or push schema directly (for development):
   ```bash
   npx prisma db push
   ```

3. (Optional) Open Prisma Studio to view data:
   ```bash
   npx prisma studio
   ```

### 4. Run the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server will run on `http://localhost:3000` (or PORT specified in .env)

## Project Structure

```
.
├── src/
│   ├── controllers/           # Route controllers
│   ├── routes/                # API routes
│   ├── middleware/            # Express middleware
│   └── utils/                 # Utility functions
├── prisma/
│   └── schema.prisma          # Prisma schema definition
├── server.js                  # Express server entry point
├── package.json               # Dependencies and scripts
├── .env.example               # Environment variables template
└── README.md                  # This file
```

## Database Schema

The schema includes the following models:
- **User** - Authentication and basic user info
- **Profile** - Comprehensive user profile details
- **Photo** - Profile photos management
- **Interest** - User interests/requests
- **Shortlist** - Favorite profiles
- **Message** - Chat messages
- **Subscription** - Premium subscriptions
- **BlockList** - Blocked users
- **Notification** - User notifications

## API Endpoints

(To be implemented based on PRD requirements)

- Authentication: `/api/auth/*`
- Users: `/api/users/*`
- Profiles: `/api/profiles/*`
- Photos: `/api/photos/*`
- Search: `/api/search/*`
- Messages: `/api/messages/*`
- Subscriptions: `/api/subscriptions/*`
- Admin: `/api/admin/*`

## Environment Variables

See `.env.example` for all required environment variables.

### Cloudflare R2 Setup

1. Create a Cloudflare R2 bucket
2. Get your R2 credentials:
   - Account ID
   - Access Key ID
   - Secret Access Key
   - Bucket Name
3. (Optional) Set up a custom domain for public access
4. Add credentials to `.env` file:
   ```
   R2_ACCOUNT_ID="your_account_id"
   R2_ACCESS_KEY_ID="your_access_key_id"
   R2_SECRET_ACCESS_KEY="your_secret_access_key"
   R2_BUCKET_NAME="your_bucket_name"
   R2_ENDPOINT="https://your_account_id.r2.cloudflarestorage.com"
   R2_PUBLIC_URL="https://your-custom-domain.com"  # Optional: custom domain
   ```

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:push` - Push schema to database (dev only)
- `npm run prisma:studio` - Open Prisma Studio

## License

ISC


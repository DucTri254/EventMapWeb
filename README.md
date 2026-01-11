# Event Map Web Application

A comprehensive event discovery and management platform built with Next.js, Express.js, and PostgreSQL.

## Features

### User Features
- Browse and search events
- Filter events by category, region, and status
- View event details on interactive map
- Mark events as interested
- View favorite events
- User profile management

### Event Creator Features
- Create and manage events
- Edit own events
- View interested users
- Receive notifications when users show interest

### Admin Features
- Manage all users and events
- Approve/reject permission requests
- View statistics and analytics
- Edit any event or user account

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Prisma ORM
- **Maps**: Google Maps API
- **Email**: Nodemailer with Gmail SMTP
- **Authentication**: JWT tokens

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Google Maps API key

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd EventMapWeb
```

2. Install dependencies
```bash
npm install
```

3. Setup environment variables
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `SMTP_*`: Email configuration (already configured)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Your Google Maps API key

4. Setup database
```bash
npx prisma generate
npx prisma migrate dev
```

5. Run the development server
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Project Structure

```
EventMapWeb/
├── app/                 # Next.js app directory
├── components/          # React components
├── lib/                 # Utilities and helpers
├── server/              # Express.js backend
├── prisma/              # Prisma schema and migrations
├── public/              # Static files
└── types/              # TypeScript types
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/verify` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Events
- `GET /api/events` - Get all events (with filters)
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event (Event Creator/Admin)
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/:id/interested` - Toggle interest

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/role-request` - Request role change

### Admin
- `GET /api/admin/stats` - Get statistics
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/events` - Get all events
- `PUT /api/admin/events/:id` - Update event
- `DELETE /api/admin/events/:id` - Delete event

## Database Schema

See `prisma/schema.prisma` for the complete database schema.

## External Data Integration

The application automatically scrapes events from:
- https://sansukien.com/
- https://ticketbox.vn/

Scraping runs daily via cron job.

## License

MIT

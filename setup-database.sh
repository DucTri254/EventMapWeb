#!/bin/bash

# Bash script to setup database
echo "Setting up Event Map Database..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please update DATABASE_URL in .env file with your PostgreSQL connection string"
    echo "Example: DATABASE_URL=postgresql://user:password@localhost:5432/eventmap"
    echo ""
fi

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "Running database migrations..."
npx prisma migrate dev --name init

# Seed database
echo "Seeding database..."
npm run prisma:seed

echo ""
echo "Database setup completed!"
echo "You can now start the development server with: npm run dev"

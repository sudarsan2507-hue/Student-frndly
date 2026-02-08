# Skill Decay & Knowledge Half-Life Tracker

A full-stack application to track skill decay and knowledge retention over time.

## Features

- ✅ **Authentication**: JWT-based login system with protected routes
- ✅ **Skill Tracking**: Create and track skills with time-based decay (5% per day)
- ✅ **Practice Logging**: Mark skills as practiced to reset decay timer
- ⏳ **Knowledge Decay Analysis**: Coming soon

## Architecture

- **Backend**: Node.js/Express with DB-agnostic data access layer
- **Frontend**: React with Vite and React Router
- **Storage**: In-memory/JSON (MySQL/Docker can be added later without changing API contracts)

## Project Structure

```
├── backend/          # Express API server
│   ├── src/
│   │   ├── storage/      # DB-agnostic data layer (in-memory, JSON)
│   │   ├── services/     # Business logic (auth, skills, decay calculations)
│   │   ├── controllers/  # Request handlers
│   │   ├── routes/       # API endpoints
│   │   ├── middleware/   # Auth, validation, error handling
│   │   └── models/       # Data models
│   └── data/             # JSON storage files
├── frontend/         # React application
│   └── src/
│       ├── pages/        # Page components (Login, Dashboard, etc.)
│       ├── components/   # Reusable UI components
│       ├── services/     # API client and services
│       └── context/      # React context (Auth)
└── shared/           # Shared types and utilities
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

   The backend will run on `http://localhost:3000`

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will run on `http://localhost:5173`

## Mock User Credentials

For testing the authentication system, use these credentials:

| Email | Password | Role |
|-------|----------|------|
| student@test.com | password123 | student |
| admin@test.com | admin123 | admin |

## API Documentation

### Authentication

#### POST `/api/auth/login`

Login with email and password.

**Request:**
```json
{
  "email": "student@test.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "1",
      "email": "student@test.com",
      "name": "Test Student",
      "role": "student"
    }
  }
}
```

### Skills (Protected)

> **Note**: All skill endpoints require authentication. Include JWT token in Authorization header.

#### POST `/api/skills`

Create a new skill for the authenticated user.

**Request:**
```json
{
  "name": "React Development",
  "category": "Programming",
  "initialProficiency": 80
}
```

**Response:**
```json
{
  "success": true,
  "message": "Skill created successfully",
  "data": {
    "id": "1707155234567",
    "userId": "1",
    "name": "React Development",
    "category": "Programming",
    "initialProficiency": 80,
    "lastPracticedAt": "2026-02-05T17:40:34.567Z",
    "currentStrength": 80,
    "daysSinceLastPractice": 0,
    "createdAt": "2026-02-05T17:40:34.567Z",
    "updatedAt": "2026-02-05T17:40:34.567Z"
  }
}
```

#### GET `/api/skills`

Get all skills for the authenticated user with real-time decay calculations.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1707155234567",
      "userId": "1",
      "name": "React Development",
      "category": "Programming",
      "initialProficiency": 80,
      "lastPracticedAt": "2026-02-01T17:40:34.567Z",
      "currentStrength": 64,
      "daysSinceLastPractice": 4,
      "createdAt": "2026-02-05T17:40:34.567Z",
      "updatedAt": "2026-02-05T17:40:34.567Z"
    }
  ]
}
```

#### PATCH `/api/skills/:id/practice`

Mark a skill as practiced (resets decay timer).

**Response:**
```json
{
  "success": true,
  "message": "Skill marked as practiced",
  "data": {
    "id": "1707155234567",
    "userId": "1",
    "name": "React Development",
    "category": "Programming",
    "initialProficiency": 80,
    "lastPracticedAt": "2026-02-05T17:45:00.000Z",
    "currentStrength": 80,
    "daysSinceLastPractice": 0,
    "updatedAt": "2026-02-05T17:45:00.000Z"
  }
}
```

#### DELETE `/api/skills/:id`

Delete a skill.

**Response:**
```json
{
  "success": true,
  "message": "Skill deleted successfully"
}
```

### Protected Routes

Protected endpoints require the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Health Check

#### GET `/api/health`

Check if the server is running.

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

## Environment Variables

### Backend (.env)

```
PORT=3000
NODE_ENV=development
STORAGE_TYPE=json
JSON_STORAGE_PATH=./data

# JWT Configuration
JWT_SECRET=dev-secret-key-change-in-production-2026
JWT_EXPIRES_IN=24h
```

## Development

- Backend uses **nodemon** for hot-reload during development
- Frontend uses **Vite** for fast HMR (Hot Module Replacement)
- All API calls from frontend are proxied through Vite to avoid CORS issues

## Authentication Flow

1. User enters credentials on `/login` page
2. Frontend sends POST request to `/api/auth/login`
3. Backend validates credentials using bcrypt
4. Backend generates JWT token and returns user data
5. Frontend stores token in localStorage
6. Token is automatically attached to all API requests via Axios interceptor
7. Protected routes check authentication status before rendering
8. Logout clears token and redirects to login

## Skill Decay System

Skills use a simple time-based decay formula:

**Formula:** `currentStrength = max(10, initialProficiency - (initialProficiency × 0.05 × daysSinceLastPractice))`

- **Decay Rate**: 5% of initial proficiency per day
- **Minimum Strength**: Skills never drop below 10%
- **Calculation**: Real-time on every API call
- **Reset**: Marking as practiced updates `lastPracticedAt` to current time

**Example:**
- Skill created with 80% proficiency
- After 5 days: 80 - (80 × 0.05 × 5) = **60%**
- After 10 days: 80 - (80 × 0.05 × 10) = **40%**
- After 20 days: max(10, 80 - 80) = **10%** (minimum)

**Strength Categories:**
- **Strong** (≥70%): Green
- **Moderate** (40-69%): Orange
- **Weak** (<40%): Red

## Next Steps

- [ ] Implement skill management (CRUD operations)
- [ ] Add knowledge tracking functionality
- [ ] Implement decay calculation algorithms
- [ ] Add data visualization for skill decay
- [ ] Migrate from in-memory to MySQL storage


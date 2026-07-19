# JourneyLink: Full-Stack Real-Time Journey Sharing & Live Tracking

**JourneyLink** is a production-ready, full-stack web application that allows users to start a journey, set a destination, and generate a secure, non-guessable live tracking link. Friends or family with this link can monitor the journey in real time—watching coordinates move on an interactive dark map, reading speed statistics, seeing speed limit alerts, and checking Estimated Time of Arrival (ETA).

---

## Technical Stack

- **Frontend**: React.js (Vite), Tailwind CSS v3, React Router DOM, Leaflet.js (with dark mode styling filter), StompJS WebSocket Client, Recharts (Speed Profiles).
- **Backend**: Spring Boot 3, Java 21, Spring Security (JWT), Spring Data JPA, STOMP WebSockets, PostgreSQL / H2 Database.
- **Infrastructure**: Docker, AWS EC2, AWS RDS PostgreSQL.

---

## Directory Structure

```
Tracking/
├── backend/                   # Spring Boot 3 Java Application
│   ├── src/main/java/...      # Java Source Files
│   ├── src/main/resources/    # Application configs, H2 & Postgres settings
│   ├── Dockerfile             # Multi-stage Java compile and run environment
│   └── pom.xml                # Maven Dependencies
├── frontend/                  # React + Vite Application
│   ├── src/                   # Components, Pages, Hooks, Styling
│   ├── public/                # Static public assets
│   ├── nginx.conf             # Nginx configuration for production hosting
│   ├── tailwind.config.js     # Tailwind setup and theme configuration
│   └── Dockerfile             # Multi-stage static build & Nginx runner
├── aws/                       # AWS Deployments templates
│   ├── AWS_DEPLOYMENT.md      # AWS RDS, EC2 setup, and proxy guide
│   └── docker-compose.prod.yml# Production compose for EC2 connected to RDS
├── docker-compose.yml         # Unified local development compose (with Postgres)
└── README.md                  # Core documentation
```

---

## Local Run (Single Command via Docker Compose)

The entire application can be booted locally (frontend, backend, and PostgreSQL database) with a single command.

### Prerequisites
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/).

### Build and Run
In the project root directory, run:
```bash
docker-compose up --build
```
This command builds the frontend and backend containers, pulls the PostgreSQL 15 image, configures local database networking, and mounts persistent volumes.

- **Frontend Client**: Access at [http://localhost/](http://localhost/)
- **Backend API**: Running at [http://localhost:8080/](http://localhost:8080/)
- **PostgreSQL Database**: Accessible on port `5432` (Username: `postgres`, Password: `postgres`, Database: `journeylink`)

---

## Local Development (Manual Run)

If you wish to run the frontend and backend manually for debugging purposes:

### 1. Run Backend (H2 Fallback Mode)
If you don't have PostgreSQL installed locally, you can run the backend in the `local` profile, which automatically falls back to an **H2 In-Memory Database** and enables the H2 Web Console.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Run with the local profile:
   ```bash
   # On Windows:
   $env:SPRING_PROFILES_ACTIVE="local"
   ./mvnw spring-boot:run
   
   # On Unix/macOS:
   SPRING_PROFILES_ACTIVE=local ./mvnw spring-boot:run
   ```
3. Access the H2 Web Console at [http://localhost:8080/h2-console](http://localhost:8080/h2-console) (JDBC URL: `jdbc:h2:mem:journeylinkdb`, Username: `sa`, Password: `[leave empty]`).

### 2. Run Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   ```
2. Boot the Vite dev server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:5173/](http://localhost:5173/) in your browser.

---

## Database Schema

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journeys Table
CREATE TABLE journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    journey_name VARCHAR(100) NOT NULL,
    tracking_code VARCHAR(12) UNIQUE NOT NULL,
    start_lat DOUBLE PRECISION NOT NULL,
    start_lng DOUBLE PRECISION NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lng DOUBLE PRECISION NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(20) NOT NULL, -- 'ACTIVE' or 'COMPLETED'
    password_hash VARCHAR(255),  -- For password-locked links
    expires_at TIMESTAMP         -- Expiration timestamp
);

-- Location Logs Table
CREATE TABLE location_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION NOT NULL, -- in km/h
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Documentation

### Authentication APIs
- `POST /api/auth/register` - Create user. Request: `{ "name", "email", "password" }`.
- `POST /api/auth/login` - Authenticate. Request: `{ "email", "password" }`. Returns JWT.
- `GET /api/auth/profile` - Fetch profile of logged-in user (Requires JWT header).

### Journey APIs (Requires JWT)
- `POST /api/journeys` - Start new journey. Request: `{ "journeyName", "startLat", "startLng", "destinationLat", "destinationLng", "password", "expiresInMinutes" }`.
- `POST /api/journeys/{id}/end` - End active journey.
- `GET /api/journeys/{id}` - Get journey static details.
- `GET /api/journeys/history` - List history of user's journeys.
- `GET /api/journeys/dashboard` - Get counters, statistics, and recent journeys.
- `GET /api/journeys/{id}/analytics` - Fetch telemetry coordinates logs history for owner dashboard charts.

### Public Live Tracking APIs (Anonymous)
- `GET /api/public/journey/{trackingCode}` - Verify tracking link and retrieve static coordinates. Supports optional `?password=` query parameter.
- `GET /api/public/journey/{trackingCode}/live` - Fetch live telemetry, distance remaining, history list, and ETA. Supports optional `?password=`.

---

## WebSocket & STOMP Configuration

- **Handshake Endpoint**: `/ws` (supports raw WebSocket or SockJS fallback)
- **Send Telemetry (Client -> Server)**: `/app/journey/{trackingCode}/location`
  - Body payload: `{ "latitude": Double, "longitude": Double, "speed": Double }`
- **Receive Telemetry (Server -> Broadcast)**: `/journey/live/{trackingCode}`
  - Receives live analytics aggregate DTO containing current coordinates, speed logs list, and calculated ETA.

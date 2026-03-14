# Hezzni Admin Dashboard Setup

## Prerequisites
- Node.js (v18+)
- MariaDB Database

## Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies (if not already done):
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Copy `.env.example` to `.env` (or create `.env`)
   - Update `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` with your database credentials.
4. Start the server:
   ```bash
   node server.js
   ```

## Frontend Setup
1. Navigate to the frontend directory:
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

## Project Structure
- `backend/`: Node.js Express API
- `frontend/`: React + Vite Application
  - `src/components/`: Reusable UI components
  - `src/pages/`: Application pages
  - `src/index.css`: Global styles and theme variables

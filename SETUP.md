# Setup Instructions

## Prerequisites

- Python 3.11+
- Node.js 18+
- npm or yarn

## Backend Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Initialize the database:
```bash
python -c "from app.backend.database import init_db; init_db()"
```

3. Run the backend server:
```bash
python app/backend/main.py
```

Or using uvicorn directly:
```bash
uvicorn app.backend.api:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

## Frontend Setup

1. Navigate to frontend directory:
```bash
cd app/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## First Import

1. Start both backend and frontend servers
2. Open `http://localhost:3000` in your browser
3. Navigate to the "Import" page
4. Upload your Odoo CSV export file: `reference docs/Access Groups (res.groups).csv`
5. Wait for processing to complete
6. Explore the data in Dashboard, Groups, Users, and Analysis sections

## Docker Deployment (Optional)

Build and run with Docker:

```bash
docker-compose up --build
```

This will start both backend and serve the frontend.

## Troubleshooting

### Import Issues
- Ensure the CSV file path is correct
- Check that the CSV file has the expected columns: Group Name, Group Purpose, Group Status, User Access, Users, Inherits
- Verify the file encoding is UTF-8 (with or without BOM)

### Database Issues
- Delete `data/security.db` and reinitialize if needed
- Ensure the `data/` directory exists and is writable

### Port Conflicts
- Backend default port: 8000 (change in `app/backend/main.py`)
- Frontend default port: 3000 (change in `app/frontend/vite.config.js`)


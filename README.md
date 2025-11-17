# Odoo Security Management Application

A web-based application for managing, visualizing, and analyzing Odoo security groups.

## Features

- **CSV Import**: Import and process Odoo security group exports
- **Group Management**: View and manage security groups with standardized documentation
- **User Assignment Matrix**: See which users are assigned to which groups
- **Compliance Analysis**: Check compliance with naming conventions and documentation standards
- **Gap Analysis**: Identify undocumented groups and missing information
- **Visualization**: Interactive hierarchy and inheritance diagrams (coming soon)

## Technology Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React with Material-UI
- **Database**: SQLite
- **Visualization**: Cytoscape.js (planned)

## Setup

### Backend Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Run the backend server:
```bash
cd app/backend
python main.py
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Install Node.js dependencies:
```bash
cd app/frontend
npm install
```

2. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Usage

1. Start both backend and frontend servers
2. Navigate to `http://localhost:3000`
3. Go to the Import page and upload your Odoo CSV export
4. Explore groups, users, and analysis in the respective sections

## API Documentation

Once the backend is running, API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Project Structure

```
app/
├── backend/          # FastAPI backend
│   ├── api.py       # API endpoints
│   ├── database.py  # Database setup
│   └── main.py      # Entry point
├── frontend/         # React frontend
│   └── src/
│       ├── components/  # React components
│       └── api/         # API client
├── data/            # Data models and parsers
│   ├── models.py    # SQLAlchemy models
│   └── csv_parser.py # CSV parsing logic
└── config/          # Configuration files
    └── standards.json # Standards definition
```

## Standards

The application enforces the following standards:
- Naming convention: `Odoo - [Module] / [Access Level]`
- Required fields: Who, Why, Last Audit Date
- Access level hierarchy: Level 1 (Admin) > Level 2 (Manager) > Level 3 (User)

See `app/config/standards.json` for full configuration.


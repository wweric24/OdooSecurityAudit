# Multi-stage build for Odoo Security Management Application

# Backend stage
FROM python:3.11-slim as backend

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY app/backend ./app/backend
COPY app/data ./app/data
COPY app/config ./app/config

# Frontend stage
FROM node:18-alpine as frontend

WORKDIR /app

# Copy package files
COPY app/frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend code
COPY app/frontend ./

# Build frontend
RUN npm run build

# Final stage
FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY app/backend ./app/backend
COPY app/data ./app/data
COPY app/config ./app/config

# Copy built frontend
COPY --from=frontend /app/dist ./app/frontend/dist

# Create data directory
RUN mkdir -p data uploads

# Expose port
EXPOSE 8000

# Run backend (frontend served by backend in production)
CMD ["python", "-m", "uvicorn", "app.backend.api:app", "--host", "0.0.0.0", "--port", "8000"]


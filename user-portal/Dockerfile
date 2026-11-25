# Stage 1: Build Standalone User Portal React + TypeScript Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /workspace/frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# Stage 2: Python FastAPI Standalone User Portal Runtime (Port 8080)
FROM python:3.12-slim AS runtime
WORKDIR /workspace
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/workspace/backend \
    PORT=8080

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-builder /workspace/frontend/dist ./frontend/dist

RUN useradd --create-home --shell /bin/bash appuser && chown -R appuser:appuser /workspace
USER appuser

EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]

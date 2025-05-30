# nScale DMS Assistant - Deployment Guide

This guide covers deploying the nScale DMS Assistant in production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Options](#deployment-options)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Manual Deployment](#manual-deployment)
6. [Configuration](#configuration)
7. [Security Considerations](#security-considerations)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+ (for Docker deployment)
- PostgreSQL 13+ (or SQLite for small deployments)
- Redis 6+ for session management
- Node.js 18+ (for manual deployment)
- Python 3.9+ (for manual deployment)
- Minimum 2GB RAM, 2 CPU cores
- SSL certificate for HTTPS

## Deployment Options

### 1. Docker Deployment (Recommended)

The easiest way to deploy nScale DMS Assistant is using Docker and Docker Compose.

#### Quick Start

1. Clone the repository:
```bash
git clone https://github.com/your-org/nscale-assist.git
cd nscale-assist
```

2. Copy and configure environment variables:
```bash
cp .env.production.example .env.production
# Edit .env.production with your values
```

3. Build and start services:
```bash
./scripts/deploy-docker.sh
```

#### Production Docker Compose

For production, use the provided `docker-compose.yml`:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 2. Kubernetes Deployment

For Kubernetes deployment, use Helm charts (coming soon) or create your own manifests:

```yaml
# Example deployment manifest
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nscale-assist
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nscale-assist
  template:
    metadata:
      labels:
        app: nscale-assist
    spec:
      containers:
      - name: app
        image: ghcr.io/your-org/nscale-assist:latest
        ports:
        - containerPort: 80
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: nscale-secrets
              key: database-url
```

### 3. Manual Deployment

For manual deployment without Docker:

1. Install system dependencies:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install python3.9 python3-pip nodejs npm nginx redis-server postgresql

# RHEL/CentOS
sudo yum install python39 python39-pip nodejs npm nginx redis postgresql-server
```

2. Set up the application:
```bash
# Frontend
npm install
npm run build

# Backend
pip install -r requirements.txt
pip install gunicorn

# Database migrations
alembic upgrade head
```

3. Configure nginx (see `docker/nginx.conf` for reference)

4. Start services:
```bash
# Backend
gunicorn -c docker/gunicorn.conf.py api.server:app

# Or use systemd service files
sudo systemctl start nscale-assist
```

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SECRET_KEY` | Application secret key (min 32 chars) | `your-very-long-secret-key-here` |
| `JWT_SECRET_KEY` | JWT signing key | `another-very-long-secret-key` |
| `DATABASE_URL` | Database connection string | `postgresql://user:pass@host/db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |

### Optional Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `OLLAMA_BASE_URL` | Ollama API endpoint | `http://localhost:11434` |
| `MAX_WORKERS` | Gunicorn worker processes | `4` |
| `ENABLE_TELEMETRY` | Enable performance monitoring | `false` |
| `LOG_LEVEL` | Logging level | `INFO` |

See `.env.production.example` for all available options.

## Security Considerations

### 1. HTTPS/SSL

Always use HTTPS in production:

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}
```

### 2. Secrets Management

- Never commit secrets to version control
- Use environment variables or secret management tools
- Rotate secrets regularly
- Use strong, unique passwords

### 3. Network Security

- Use firewalls to restrict access
- Place database and Redis behind private networks
- Enable rate limiting in nginx
- Use CORS restrictions

### 4. Database Security

```sql
-- Create application user with limited permissions
CREATE USER nscale_app WITH PASSWORD 'strong-password';
GRANT CONNECT ON DATABASE nscale TO nscale_app;
GRANT USAGE ON SCHEMA public TO nscale_app;
GRANT CREATE ON SCHEMA public TO nscale_app;
```

## Monitoring

### 1. Health Checks

The application exposes health endpoints:

- `/health` - Basic health check
- `/api/health` - Detailed API health

Configure monitoring tools to check these endpoints.

### 2. Logging

Logs are written to stdout/stderr by default. Configure log aggregation:

```yaml
# Example: Fluentd configuration
<source>
  @type forward
  port 24224
</source>

<match nscale.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
</match>
```

### 3. Metrics

Enable telemetry for performance monitoring:

```bash
ENABLE_TELEMETRY=true
STATSD_HOST=statsd.example.com
```

## Backup and Recovery

### Database Backup

```bash
# PostgreSQL backup
pg_dump -h localhost -U nscale -d nscale > backup.sql

# Restore
psql -h localhost -U nscale -d nscale < backup.sql
```

### File Uploads Backup

```bash
# Backup uploads directory
tar -czf uploads-backup.tar.gz /app/uploads

# Restore
tar -xzf uploads-backup.tar.gz -C /
```

## Scaling

### Horizontal Scaling

1. **Application Servers**: Add more Docker containers or Kubernetes pods
2. **Database**: Use read replicas for scaling reads
3. **Redis**: Use Redis Cluster for session distribution
4. **Load Balancing**: Use nginx, HAProxy, or cloud load balancers

### Vertical Scaling

Increase resources based on usage:

- CPU: Add cores for concurrent request handling
- Memory: Increase for caching and worker processes
- Storage: Monitor and expand as needed

## Troubleshooting

### Common Issues

1. **Connection refused on port 80/8080**
   - Check if services are running: `docker-compose ps`
   - Check logs: `docker-compose logs app`
   - Verify firewall rules

2. **Database connection errors**
   - Verify DATABASE_URL is correct
   - Check database is running and accessible
   - Verify user permissions

3. **Redis connection errors**
   - Check Redis is running: `redis-cli ping`
   - Verify REDIS_URL is correct

4. **Performance issues**
   - Check resource usage: `docker stats`
   - Review application logs for bottlenecks
   - Consider scaling options

### Debug Mode

Enable debug mode for troubleshooting (never in production):

```bash
ENABLE_DEBUG=true
LOG_LEVEL=DEBUG
```

## Support

For issues and questions:

1. Check the [troubleshooting guide](TROUBLESHOOTING.md)
2. Search existing [GitHub issues](https://github.com/your-org/nscale-assist/issues)
3. Create a new issue with:
   - Deployment method
   - Error messages
   - Environment details
   - Steps to reproduce
# Production Deployment Guide - Digital File Assistant

## Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose installed
- Domain name with SSL certificate
- Minimum 4GB RAM, 2 CPU cores
- 50GB disk space

## Step 1: Environment Setup

### 1.1 Create deployment directory
```bash
mkdir -p /opt/nscale-assist
cd /opt/nscale-assist
git clone https://github.com/your-repo/nscale-assist.git app
cd app
```

### 1.2 Set environment variables
```bash
# Create .env file from production template
cp .env.production .env

# Generate secure passwords
export DB_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 64)
export ADMIN_PASSWORD=$(openssl rand -base64 16)

# Update .env with generated values
sed -i "s/\${DB_PASSWORD}/$DB_PASSWORD/g" .env
sed -i "s/\${JWT_SECRET}/$JWT_SECRET/g" .env
sed -i "s/\${ADMIN_PASSWORD}/$ADMIN_PASSWORD/g" .env

# Save passwords securely
echo "DB_PASSWORD=$DB_PASSWORD" > ~/.nscale-secrets
echo "JWT_SECRET=$JWT_SECRET" >> ~/.nscale-secrets
echo "ADMIN_PASSWORD=$ADMIN_PASSWORD" >> ~/.nscale-secrets
chmod 600 ~/.nscale-secrets
```

## Step 2: PostgreSQL Setup

### 2.1 Start PostgreSQL and Redis
```bash
docker-compose -f docker-compose.postgres.yml up -d

# Wait for services to be ready
sleep 10

# Check status
docker-compose -f docker-compose.postgres.yml ps
```

### 2.2 Initialize database
```bash
# Database will be initialized automatically with init-db.sql
# Verify initialization
docker exec -it nscale_postgres psql -U nscale_user -d nscale_assist -c "\dt *.*"
```

### 2.3 Migrate from SQLite (if upgrading)
```bash
# Only if you have existing SQLite databases
DB_PASSWORD=$DB_PASSWORD ./scripts/migrate-to-postgres.sh
```

## Step 3: Build Application

### 3.1 Install dependencies
```bash
# Frontend dependencies
npm install

# Python dependencies
cd api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3.2 Build frontend
```bash
# Use optimized configuration
cp vite.config.optimized.ts vite.config.ts

# Build for production
npm run build

# Verify build size
du -sh dist/
```

## Step 4: Setup Nginx

### 4.1 Install Nginx
```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

### 4.2 Configure Nginx
```bash
sudo tee /etc/nginx/sites-available/nscale-assist << 'EOF'
server {
    listen 80;
    server_name nscale-assist.com www.nscale-assist.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name nscale-assist.com www.nscale-assist.com;
    
    # SSL configuration (will be managed by certbot)
    ssl_certificate /etc/letsencrypt/live/nscale-assist.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nscale-assist.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Frontend
    location / {
        root /opt/nscale-assist/app/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API proxy
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long operations
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
    
    # WebSocket support for real-time features
    location /ws {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/nscale-assist /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4.3 Setup SSL
```bash
sudo certbot --nginx -d nscale-assist.com -d www.nscale-assist.com
```

## Step 5: Setup Systemd Services

### 5.1 Create API service
```bash
sudo tee /etc/systemd/system/nscale-api.service << 'EOF'
[Unit]
Description=nscale-assist API Server
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/nscale-assist/app/api
Environment="PATH=/opt/nscale-assist/app/api/venv/bin"
EnvironmentFile=/opt/nscale-assist/app/.env
ExecStart=/opt/nscale-assist/app/api/venv/bin/gunicorn \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8001 \
    --timeout 300 \
    --access-logfile /var/log/nscale-assist/access.log \
    --error-logfile /var/log/nscale-assist/error.log \
    server:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

### 5.2 Create background worker service
```bash
sudo tee /etc/systemd/system/nscale-worker.service << 'EOF'
[Unit]
Description=nscale-assist Background Worker
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/nscale-assist/app/api
Environment="PATH=/opt/nscale-assist/app/api/venv/bin"
EnvironmentFile=/opt/nscale-assist/app/.env
ExecStart=/opt/nscale-assist/app/api/venv/bin/python -m modules.background.worker
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

### 5.3 Create log directory and start services
```bash
# Create log directory
sudo mkdir -p /var/log/nscale-assist
sudo chown www-data:www-data /var/log/nscale-assist

# Set permissions
sudo chown -R www-data:www-data /opt/nscale-assist/app

# Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable nscale-api nscale-worker
sudo systemctl start nscale-api nscale-worker

# Check status
sudo systemctl status nscale-api
sudo systemctl status nscale-worker
```

## Step 6: Setup Monitoring

### 6.1 Install monitoring stack
```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

### 6.2 Configure backups
```bash
# Create backup script
sudo tee /opt/nscale-assist/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/nscale-assist/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
docker exec nscale_postgres pg_dump -U nscale_user nscale_assist | gzip > "$BACKUP_DIR/database.sql.gz"

# Backup uploaded files
tar -czf "$BACKUP_DIR/uploads.tar.gz" -C /opt/nscale-assist/app data/uploads/

# Backup configuration
cp /opt/nscale-assist/app/.env "$BACKUP_DIR/"

# Keep only last 30 days of backups
find /var/backups/nscale-assist -type d -mtime +30 -exec rm -rf {} \;

echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x /opt/nscale-assist/backup.sh

# Add to crontab
echo "0 2 * * * /opt/nscale-assist/backup.sh" | sudo crontab -
```

## Step 7: Final Steps

### 7.1 Initialize admin user
```bash
cd /opt/nscale-assist/app
source api/venv/bin/activate
python create_admin.py --email admin@nscale-assist.com --password "$ADMIN_PASSWORD"
```

### 7.2 Test deployment
```bash
# Check API health
curl https://nscale-assist.com/api/health

# Check frontend
curl -I https://nscale-assist.com

# Check admin panel
open https://nscale-assist.com/admin
```

### 7.3 Configure Ollama (for RAG)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull required model
ollama pull llama3:8b-instruct-q4_1

# Verify
curl http://localhost:11434/api/tags
```

## Monitoring & Maintenance

### Check logs
```bash
# API logs
sudo journalctl -u nscale-api -f

# Worker logs
sudo journalctl -u nscale-worker -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
```

### Update application
```bash
cd /opt/nscale-assist/app
git pull
npm install
npm run build
sudo systemctl restart nscale-api nscale-worker
```

### Database maintenance
```bash
# Vacuum PostgreSQL
docker exec nscale_postgres psql -U nscale_user -d nscale_assist -c "VACUUM ANALYZE;"

# Check database size
docker exec nscale_postgres psql -U nscale_user -d nscale_assist -c "\l+"
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable firewall (ufw) with only necessary ports
- [ ] Configure fail2ban for SSH and Nginx
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`
- [ ] Monitor logs for suspicious activity
- [ ] Regular backups tested for restoration
- [ ] SSL certificate auto-renewal configured
- [ ] Database connections use SSL
- [ ] Environment variables secured (not in git)

## Troubleshooting

### API not responding
```bash
sudo systemctl status nscale-api
sudo journalctl -u nscale-api --since "5 minutes ago"
```

### Database connection issues
```bash
docker-compose -f docker-compose.postgres.yml logs postgres
```

### High memory usage
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Restart services if needed
sudo systemctl restart nscale-api nscale-worker
```

## Support

For issues or questions:
1. Check logs first
2. Review documentation at `/opt/nscale-assist/app/docs/`
3. Create issue at GitHub repository
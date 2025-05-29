#!/bin/bash
# Setup script for documentation monitoring system

echo "Setting up Documentation Monitoring System..."

# Create required directories
echo "Creating directories..."
mkdir -p /opt/nscale-assist/logs/health_reports
mkdir -p /opt/nscale-assist/data
mkdir -p /opt/nscale-assist/logs

# Install Python dependencies
echo "Installing Python dependencies..."
pip install watchdog

# Initialize configuration if not exists
if [ ! -f "/opt/nscale-assist/app/scripts/doc_monitor_config.json" ]; then
    echo "Creating default configuration..."
    python3 /opt/nscale-assist/app/scripts/doc_monitor.py --init-config
fi

# Create systemd service for monitoring (optional)
if [ "$1" == "--install-service" ]; then
    echo "Installing systemd service..."
    cat > /tmp/doc-monitor.service << EOF
[Unit]
Description=Documentation Monitoring System
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/nscale-assist
ExecStart=/usr/bin/python3 /opt/nscale-assist/app/scripts/doc_monitor.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    sudo mv /tmp/doc-monitor.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable doc-monitor.service
    echo "Service installed. Start with: sudo systemctl start doc-monitor"
fi

# Create cron job for health checks (runs daily at 2 AM)
if [ "$1" == "--install-cron" ]; then
    echo "Installing cron job for health checks..."
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/bin/python3 /opt/nscale-assist/app/scripts/doc_health_check.py >> /opt/nscale-assist/logs/health_check_cron.log 2>&1") | crontab -
    echo "Cron job installed"
fi

echo "Setup complete!"
echo ""
echo "Usage:"
echo "  Start monitoring: python3 /opt/nscale-assist/app/scripts/doc_monitor.py"
echo "  Run health check: python3 /opt/nscale-assist/app/scripts/doc_health_check.py"
echo "  Check specific doc: python3 /opt/nscale-assist/app/scripts/doc_health_check.py --check-document /path/to/doc.md"
echo ""
echo "Optional:"
echo "  Install as service: $0 --install-service"
echo "  Install cron job: $0 --install-cron"
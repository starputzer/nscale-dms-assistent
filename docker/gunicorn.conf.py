import multiprocessing
import os

# Server socket
bind = '0.0.0.0:8080'
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'sync'
worker_connections = 1000
timeout = 120
keepalive = 2

# Restart workers after this many requests, to help limit memory leaks
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'nscale-assist'

# Server mechanics
daemon = False
pidfile = '/tmp/gunicorn.pid'
user = None
group = None
tmp_upload_dir = None

# SSL (disabled by default, nginx handles SSL)
keyfile = None
certfile = None

# Allow code reloading in development
reload = os.environ.get('ENV') == 'development'

# Preload application for better performance
preload_app = True

# Enable statsD metrics (optional)
statsd_host = os.environ.get('STATSD_HOST')
if statsd_host:
    statsd_prefix = 'nscale.assist'
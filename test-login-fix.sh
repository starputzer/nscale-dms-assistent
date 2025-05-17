#!/bin/bash

# Startet einen einfachen HTTP-Server auf Port 3001, um die Login-Seite zu testen
cd /opt/nscale-assist/app/dist
echo "Starte Server auf Port 3001..."
echo "Öffne http://localhost:3001/login in deinem Browser"
python3 -m http.server 3001
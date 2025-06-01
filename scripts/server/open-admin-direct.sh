#!/bin/bash

# Farben für bessere Lesbarkeit
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}nscale-assist Admin Panel (Direkt) - VERBESSERTE VERSION${NC}"
echo "-------------------------------------------------------------"
echo -e "Dieses Skript startet den Entwicklungsserver auf Port 3003,"
echo -e "richtet Admin-Berechtigungen ein und leitet Sie direkt zum Admin-Panel weiter."
echo -e "${GREEN}Arbeitsverzeichnis: ${PWD}${NC}"
echo ""

# Stelle sicher, dass der Server auf Port 3003 läuft und nicht bereits ein anderer Prozess
echo -e "${BLUE}Prüfe, ob Port 3003 bereits verwendet wird...${NC}"
if lsof -i:3003 &> /dev/null; then
    echo -e "${RED}Port 3003 wird bereits verwendet. Bitte beenden Sie den laufenden Prozess.${NC}"
    echo -e "Sie können den folgenden Befehl verwenden, um den Prozess zu identifizieren:"
    echo -e "${BLUE}lsof -i:3003${NC}"
    exit 1
fi

# Setze den Benutzer als Admin in der Datenbank
echo -e "${BLUE}Setze Benutzer martin@danglefeet.com als Admin in der Datenbank...${NC}"
if [ -f /opt/nscale-assist/worktrees/admin-improvements/make_martin_admin.py ]; then
    python3 /opt/nscale-assist/worktrees/admin-improvements/make_martin_admin.py
else
    echo -e "${YELLOW}Warnung: make_martin_admin.py wurde nicht gefunden, überspringe diesen Schritt.${NC}"
fi

# Starte den Entwicklungsserver im Hintergrund
echo -e "${YELLOW}Starte Development-Server auf Port 3003...${NC}"
npm run dev -- --port 3003 &
DEV_PID=$!

# Gib dem Server Zeit zum Starten
echo -e "${BLUE}Warte, bis der Server gestartet ist (10 Sekunden)...${NC}"
sleep 10

# Erstelle eine temporäre HTML-Datei, um die localStorage-Werte zu setzen und weiterzuleiten
echo -e "${BLUE}Erstelle Weiterleitungsseite mit Admin-Berechtigungen...${NC}"
cat > /tmp/admin-redirect.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Admin Access Redirect - Verbessert</title>
    <script>
        // Setze localStorage-Werte für Admin-Berechtigungen
        localStorage.setItem('admin_override', 'true');
        localStorage.setItem('force_mock_auth', 'true');
        
        // Andere nützliche Entwicklungseinstellungen
        localStorage.setItem('debug_mode', 'true');
        localStorage.setItem('auth_debug', 'true');
        localStorage.setItem('router_debug', 'true');
        localStorage.setItem('component_debug', 'true');
        
        // Setze Auth-Token für Admin-Mock
        localStorage.setItem('auth_token', 'admin-mock-token-123456');
        localStorage.setItem('auth_user', JSON.stringify({
            id: 'admin-123',
            name: 'Admin User',
            email: 'admin@example.com',
            role: 'admin',
            permissions: ['admin.access', 'admin.users.view', 'admin.settings.view'],
            isAdmin: true
        }));
        
        // Weiterleitung zur Admin-Seite
        console.log('Admin-Berechtigungen gesetzt, leite weiter...');
        setTimeout(() => {
            window.location.href = 'http://localhost:3003/admin';
        }, 1000);
    </script>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #0078d4; }
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(0, 120, 212, 0.2);
            border-radius: 50%;
            border-top-color: #0078d4;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .info {
            background: #e6f3ff;
            padding: 10px;
            border-radius: 4px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Weiterleitung zum Admin-Interface...</h1>
        <div class="spinner"></div>
        <p>Setze Admin-Berechtigungen und leite zum Admin-Panel weiter...</p>
        <div class="info">
            <p><strong>Debug-Informationen:</strong></p>
            <ul>
                <li>Admin-Berechtigungen aktiviert</li>
                <li>Mock-Auth aktiviert</li>
                <li>Debug-Modus aktiviert</li>
                <li>Router-Debugging aktiviert</li>
            </ul>
        </div>
    </div>
</body>
</html>
EOF

# Prüfe, ob ein Webbrowser verfügbar ist
if command -v xdg-open &> /dev/null; then
    BROWSER="xdg-open"
elif command -v open &> /dev/null; then
    BROWSER="open"
elif command -v start &> /dev/null; then
    BROWSER="start"
else
    echo -e "${RED}Kein Web-Browser-Befehl gefunden. Bitte öffnen Sie die URL manuell.${NC}"
    echo -e "URL: ${BLUE}file:///tmp/admin-redirect.html${NC}"
    echo -e "Dann navigieren Sie zu: ${BLUE}http://localhost:3003/admin${NC}"
fi

# Starte den Browser mit der Weiterleitungsseite
echo -e "${YELLOW}Öffne Weiterleitungsseite im Browser...${NC}"
$BROWSER file:///tmp/admin-redirect.html

echo -e "${GREEN}Admin-Berechtigungen wurden eingerichtet.${NC}"
echo -e "Falls die Weiterleitung nicht funktioniert, navigieren Sie manuell zu:"
echo -e "${BLUE}http://localhost:3003/admin${NC}"
echo ""
echo -e "${YELLOW}Der Entwicklungsserver läuft im Hintergrund. Drücken Sie Ctrl+C, um ihn zu beenden.${NC}"

# Warte auf Benutzerabbruch (Ctrl+C)
wait $DEV_PID
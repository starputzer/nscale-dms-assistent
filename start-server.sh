#\!/bin/bash

# Pfad zur virtuellen Umgebung
VENV_PATH="../venv"

# Aktiviere die virtuelle Umgebung und starte den Server
if [ -d "$VENV_PATH" ]; then
    source "$VENV_PATH/bin/activate"
    echo "Virtuelle Umgebung aktiviert. Starte Server..."
    python api/server.py
else
    echo "Fehler: Virtuelle Umgebung nicht gefunden in $VENV_PATH"
    echo "Bitte erstellen Sie zuerst eine virtuelle Umgebung mit: python -m venv ../venv"
    exit 1
fi

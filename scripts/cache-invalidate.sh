#!/bin/bash

# Cache-Invalidierungs-Script für den nscale DMS Assistenten
# ---------------------------------------------------------

set -e

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}nscale DMS Assistent - Cache-Invalidierung${NC}"
echo "=================================================="
echo 

# Konfiguration
CDN_PROVIDER="cloudfront" # 'cloudfront', 'cloudflare', 'akamai', etc.
CLOUDFRONT_DISTRIBUTION_ID="YOUR_CLOUDFRONT_DISTRIBUTION_ID"
CLOUDFLARE_ZONE_ID="YOUR_CLOUDFLARE_ZONE_ID"
CLOUDFLARE_AUTH_EMAIL="your-email@example.com"
CLOUDFLARE_AUTH_KEY="your-cloudflare-auth-key"
CLOUDFLARE_DOMAIN="nscale-assist.example.com"

# Funktion zum Invalidieren des CloudFront-Caches
invalidate_cloudfront() {
    echo -e "${GREEN}Invalidiere CloudFront-Cache...${NC}"
    
    # Prüfe, ob AWS CLI installiert ist
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}Fehler: AWS CLI ist nicht installiert.${NC}"
        echo "Installiere AWS CLI mit 'pip install awscli' und konfiguriere sie mit 'aws configure'."
        return 1
    fi
    
    # Prüfe AWS-Konfiguration
    if ! aws configure list &> /dev/null; then
        echo -e "${RED}Fehler: AWS CLI ist nicht konfiguriert.${NC}"
        echo "Konfiguriere AWS CLI mit 'aws configure'."
        return 1
    fi
    
    # Erstelle Invalidierungsreferenz
    REFERENCE="nscale-invalidation-$(date +%Y%m%d%H%M%S)"
    
    # Führe Invalidierung durch
    aws cloudfront create-invalidation \
        --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
        --paths "/*" \
        --reference $REFERENCE
    
    echo -e "${GREEN}CloudFront-Cache-Invalidierung gestartet mit Referenz: $REFERENCE${NC}"
    echo "Die Invalidierung kann einige Minuten dauern."
    return 0
}

# Funktion zum Invalidieren des Cloudflare-Caches
invalidate_cloudflare() {
    echo -e "${GREEN}Invalidiere Cloudflare-Cache...${NC}"
    
    # Prüfe, ob curl installiert ist
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}Fehler: curl ist nicht installiert.${NC}"
        echo "Installiere curl und versuche es erneut."
        return 1
    fi
    
    # Führe Invalidierung durch
    RESPONSE=$(curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
         -H "X-Auth-Email: $CLOUDFLARE_AUTH_EMAIL" \
         -H "X-Auth-Key: $CLOUDFLARE_AUTH_KEY" \
         -H "Content-Type: application/json" \
         --data '{"purge_everything":true}')
    
    # Prüfe Antwort
    if echo $RESPONSE | grep -q '"success":true'; then
        echo -e "${GREEN}Cloudflare-Cache erfolgreich invalidiert.${NC}"
        return 0
    else
        echo -e "${RED}Fehler bei der Cloudflare-Cache-Invalidierung.${NC}"
        echo "Antwort: $RESPONSE"
        return 1
    fi
}

# Funktion zum Invalidieren lokaler Browser-Caches durch Versionierung
update_version_params() {
    echo -e "${GREEN}Aktualisiere Versionierungsparameter für Browser-Cache-Invalidierung...${NC}"
    
    # Generiere Zeitstempel als Cache-Buster
    TIMESTAMP=$(date +%s)
    
    # Prüfe, ob index.html existiert
    if [ ! -f "dist/index.html" ]; then
        echo -e "${RED}Fehler: dist/index.html nicht gefunden.${NC}"
        echo "Stelle sicher, dass du einen Build durchgeführt hast."
        return 1
    fi
    
    # Füge Versionsnummer zu CSS und JS hinzu
    sed -i "s/\.js\?v=[0-9]*/.js?v=$TIMESTAMP/g" dist/index.html
    sed -i "s/\.css\?v=[0-9]*/.css?v=$TIMESTAMP/g" dist/index.html
    
    echo -e "${GREEN}Versionierungsparameter aktualisiert.${NC}"
    echo "Neue Versionsnummer: $TIMESTAMP"
    return 0
}

# Hauptprogramm

# Lokale Browser-Caches invalidieren
update_version_params

# CDN-Cache invalidieren
case $CDN_PROVIDER in
    cloudfront)
        invalidate_cloudfront
        ;;
    cloudflare)
        invalidate_cloudflare
        ;;
    *)
        echo -e "${YELLOW}Warnung: Unbekannter CDN-Provider '$CDN_PROVIDER'.${NC}"
        echo "Die Konfiguration unterstützt aktuell: cloudfront, cloudflare"
        echo "Bitte passe die Konfiguration im Script an."
        ;;
esac

echo -e "${GREEN}Cache-Invalidierung abgeschlossen.${NC}"
echo -e "${YELLOW}Hinweis: Es kann einige Zeit dauern, bis alle Edge-Locations aktualisiert sind.${NC}"

echo -e "${GREEN}Fertig!${NC}"
exit 0
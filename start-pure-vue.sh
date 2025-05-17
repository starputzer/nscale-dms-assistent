#!/bin/bash
# Start the Pure Vue version of the application without backend dependency

# Ensure the script can be executed from any directory
cd "$(dirname "$0")"

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting nScale DMS Assistant in Pure Vue Mode...${NC}"
echo -e "${YELLOW}This mode uses local mock services instead of a backend API${NC}"
echo ""

# Kopieren der Mock-Stores an die richtigen Stellen
echo -e "${BLUE}Kopiere Mock-Stores an die richtigen Stellen...${NC}"

# Auth-Store
if [ -f src/stores/auth.mock.ts ]; then
  echo -e "${YELLOW}Backup von src/stores/auth.ts erstellen, falls vorhanden...${NC}"
  [ -f src/stores/auth.ts ] && cp src/stores/auth.ts src/stores/auth.ts.bak || true
  echo -e "${YELLOW}Kopiere auth.mock.ts zu auth.ts...${NC}"
  cp src/stores/auth.mock.ts src/stores/auth.ts
fi

# Sessions-Store
if [ -f src/stores/sessions.mock.ts ]; then
  echo -e "${YELLOW}Backup von src/stores/sessions.ts erstellen, falls vorhanden...${NC}"
  [ -f src/stores/sessions.ts ] && cp src/stores/sessions.ts src/stores/sessions.ts.bak || true
  echo -e "${YELLOW}Kopiere sessions.mock.ts zu sessions.ts...${NC}"
  cp src/stores/sessions.mock.ts src/stores/sessions.ts
fi

# UI-Store
if [ -f src/stores/ui.mock.ts ]; then
  echo -e "${YELLOW}Backup von src/stores/ui.ts erstellen, falls vorhanden...${NC}"
  [ -f src/stores/ui.ts ] && cp src/stores/ui.ts src/stores/ui.ts.bak || true
  echo -e "${YELLOW}Kopiere ui.mock.ts zu ui.ts...${NC}"
  cp src/stores/ui.mock.ts src/stores/ui.ts
fi

# Settings-Store
if [ -f src/stores/settings.mock.ts ]; then
  echo -e "${YELLOW}Backup von src/stores/settings.ts erstellen, falls vorhanden...${NC}"
  [ -f src/stores/settings.ts ] && cp src/stores/settings.ts src/stores/settings.ts.bak || true
  echo -e "${YELLOW}Kopiere settings.mock.ts zu settings.ts...${NC}"
  cp src/stores/settings.mock.ts src/stores/settings.ts
fi

# AB-Tests-Store
if [ -f src/stores/abTests.mock.ts ]; then
  echo -e "${YELLOW}Backup von src/stores/abTests.ts erstellen, falls vorhanden...${NC}"
  [ -f src/stores/abTests.ts ] && cp src/stores/abTests.ts src/stores/abTests.ts.bak || true
  echo -e "${YELLOW}Kopiere abTests.mock.ts zu abTests.ts...${NC}"
  cp src/stores/abTests.mock.ts src/stores/abTests.ts
fi

# Admin-Stores
# MOTD-Store
if [ -f src/stores/admin/motd.mock.ts ]; then
  echo -e "${YELLOW}Backup von src/stores/admin/motd.ts erstellen, falls vorhanden...${NC}"
  [ -f src/stores/admin/motd.ts ] && cp src/stores/admin/motd.ts src/stores/admin/motd.ts.bak || true
  echo -e "${YELLOW}Kopiere motd.mock.ts zu motd.ts...${NC}"
  cp src/stores/admin/motd.mock.ts src/stores/admin/motd.ts
fi

# Feedback-Store
if [ -f src/stores/admin/feedback.mock.ts ]; then
  echo -e "${YELLOW}Backup von src/stores/admin/feedback.ts erstellen, falls vorhanden...${NC}"
  [ -f src/stores/admin/feedback.ts ] && cp src/stores/admin/feedback.ts src/stores/admin/feedback.ts.bak || true
  echo -e "${YELLOW}Kopiere feedback.mock.ts zu feedback.ts...${NC}"
  cp src/stores/admin/feedback.mock.ts src/stores/admin/feedback.ts
fi

# Check if we need to backup App.vue
if [ -f src/App.vue ] && [ ! -f src/App.vue.bak ]; then
  echo -e "${YELLOW}Creating backup of App.vue as App.vue.bak...${NC}"
  cp src/App.vue src/App.vue.bak
fi

# Check if App.pure.vue exists
if [ ! -f src/App.pure.vue ]; then
  echo -e "${RED}Error: App.pure.vue not found!${NC}"
  exit 1
fi

# Set environment variables
export VITE_USE_MOCK_SERVICES=true

echo -e "${BLUE}Copying App.pure.vue to App.vue...${NC}"
# Copy the pure Vue implementation to App.vue
cp src/App.pure.vue src/App.vue

echo -e "${BLUE}Checking required directories and files...${NC}"
# Create any required directories
mkdir -p src/types/admin
mkdir -p src/utils
mkdir -p src/composables

# Create minimal admin types if not exists
if [ ! -f src/types/admin.ts ]; then
  echo -e "${YELLOW}Creating minimal admin types...${NC}"
  cat > src/types/admin.ts << 'EOF'
export interface MotdConfig {
  enabled: boolean;
  format: string;
  content: string;
  style: {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    iconClass: string;
  };
  display: {
    position: string;
    dismissible: boolean;
    showOnStartup: boolean;
    showInChat: boolean;
  };
}

export interface FeedbackStats {
  total: number;
  positive: number;
  negative: number;
  positive_percent: number;
  with_comments: number;
  feedback_rate: number;
  feedback_by_day: any[];
}

export interface FeedbackEntry {
  id: string;
  messageId: string;
  sessionId: string;
  type: string;
  comment: string;
  timestamp: string;
}

export interface FeedbackFilter {
  dateFrom?: string;
  dateTo?: string;
  isPositive?: boolean;
  hasComment?: boolean;
  searchTerm?: string;
}
EOF
fi

# Run the Vite development server with specific port and parameters
echo -e "${GREEN}Starting Vite development server...${NC}"
npx vite --port 3001 --force --open='?mockApi=true'

echo -e "${GREEN}Server stopped.${NC}"
# Clean up after exit
echo -e "${BLUE}Cleaning up...${NC}"
# Restore original App.vue from backup if it exists
if [ -f src/App.vue.bak ]; then
  echo -e "${YELLOW}Restoring App.vue from backup...${NC}"
  cp src/App.vue.bak src/App.vue
fi

# Restore original stores from backups if they exist
if [ -f src/stores/auth.ts.bak ]; then
  echo -e "${YELLOW}Restoring auth.ts from backup...${NC}"
  cp src/stores/auth.ts.bak src/stores/auth.ts
fi

if [ -f src/stores/sessions.ts.bak ]; then
  echo -e "${YELLOW}Restoring sessions.ts from backup...${NC}"
  cp src/stores/sessions.ts.bak src/stores/sessions.ts
fi

if [ -f src/stores/ui.ts.bak ]; then
  echo -e "${YELLOW}Restoring ui.ts from backup...${NC}"
  cp src/stores/ui.ts.bak src/stores/ui.ts
fi

if [ -f src/stores/settings.ts.bak ]; then
  echo -e "${YELLOW}Restoring settings.ts from backup...${NC}"
  cp src/stores/settings.ts.bak src/stores/settings.ts
fi

if [ -f src/stores/abTests.ts.bak ]; then
  echo -e "${YELLOW}Restoring abTests.ts from backup...${NC}"
  cp src/stores/abTests.ts.bak src/stores/abTests.ts
fi

# Restore admin store backups
if [ -f src/stores/admin/motd.ts.bak ]; then
  echo -e "${YELLOW}Restoring admin/motd.ts from backup...${NC}"
  cp src/stores/admin/motd.ts.bak src/stores/admin/motd.ts
fi

if [ -f src/stores/admin/feedback.ts.bak ]; then
  echo -e "${YELLOW}Restoring admin/feedback.ts from backup...${NC}"
  cp src/stores/admin/feedback.ts.bak src/stores/admin/feedback.ts
fi
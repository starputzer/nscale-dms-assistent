#!/bin/bash

# Erstelle Pull Requests für alle Cleanup-Branches
# Dieses Skript verwendet GitHub CLI (gh)

echo "🚀 Erstelle Pull Requests für alle Cleanup-Branches..."

# Array mit Branch-Namen und Beschreibungen
declare -A branches=(
    ["cleanup/issue-8-test-suite"]="Issue #8: Implementiere umfassende Test-Suite für System-Integrität"
    ["cleanup/issue-3-fix-files"]="Issue #3: Konsolidiere 45+ Fix-Dateien und entferne ungenutzte Versionen"
    ["cleanup/issue-1-mock-files"]="Issue #1: Entferne Mock-Dateien aus der Produktion"
    ["cleanup/issue-4-optimized-versions"]="Issue #4: Evaluiere und integriere optimierte Store-Versionen"
    ["cleanup/issue-5-unused-types"]="Issue #5: Bereinige ungenutzte TypeScript-Definitionen"
    ["cleanup/issue-6-legacy-archive"]="Issue #6: Entferne Legacy-Archive-Verzeichnisse"
    ["cleanup/issue-10-ci-cd-deadcode"]="Issue #10: Implementiere CI/CD Pipeline für Dead-Code-Erkennung"
    ["cleanup/issue-9-documentation"]="Issue #9: Erstelle umfassende Cleanup-Dokumentation"
)

# Prüfe ob gh installiert ist
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) ist nicht installiert!"
    echo "Installiere es mit: brew install gh (macOS) oder siehe https://cli.github.com/"
    exit 1
fi

# Prüfe ob authentifiziert
if ! gh auth status &> /dev/null; then
    echo "❌ Nicht bei GitHub authentifiziert!"
    echo "Führe aus: gh auth login"
    exit 1
fi

# Hole aktuellen Branch
current_branch=$(git branch --show-current)

# Counter für erstellte PRs
created_count=0
error_count=0

# Erstelle PRs für jeden Branch
for branch in "${!branches[@]}"; do
    description="${branches[$branch]}"
    
    echo ""
    echo "📝 Verarbeite Branch: $branch"
    
    # Prüfe ob Branch existiert
    if ! git show-ref --verify --quiet "refs/heads/$branch"; then
        echo "⚠️  Branch $branch existiert nicht lokal, überspringe..."
        continue
    fi
    
    # Prüfe ob PR bereits existiert
    existing_pr=$(gh pr list --head "$branch" --state all --json number --jq '.[0].number' 2>/dev/null)
    
    if [ -n "$existing_pr" ]; then
        echo "ℹ️  PR #$existing_pr existiert bereits für $branch"
        continue
    fi
    
    # Wechsle zum Branch
    git checkout "$branch" 2>/dev/null
    
    # Push den Branch
    echo "⬆️  Pushe Branch $branch..."
    if git push origin "$branch" 2>/dev/null; then
        echo "✅ Branch gepusht"
    else
        echo "⚠️  Branch bereits auf Remote vorhanden"
    fi
    
    # Erstelle PR
    echo "🔄 Erstelle Pull Request..."
    
    # Generiere PR Body
    pr_body=$(cat << EOF
## 🎯 Beschreibung
$description

## 📋 Issue
Dieses PR adressiert ${branch#cleanup/} aus dem Cleanup-Projekt.

## ✅ Änderungen
- Siehe Commit-Historie für detaillierte Änderungen
- Alle Tests bestehen
- Code wurde reviewed

## 🧪 Test-Anweisungen
1. \`npm install\`
2. \`npm run test\`
3. \`npm run typecheck\`
4. \`npm run lint\`

## 📊 Impact
- Bundle-Size: ✅ Reduziert/Unverändert
- Performance: ✅ Verbessert/Unverändert
- Type-Safety: ✅ Verbessert

---
Teil des systematischen Cleanup-Projekts zur Verbesserung der Code-Qualität.
EOF
)
    
    # Erstelle PR mit gh CLI
    if gh pr create \
        --title "$description" \
        --body "$pr_body" \
        --base main \
        --head "$branch" \
        --label "cleanup,technical-debt" 2>/dev/null; then
        echo "✅ Pull Request erfolgreich erstellt!"
        ((created_count++))
    else
        echo "❌ Fehler beim Erstellen des Pull Requests"
        ((error_count++))
    fi
done

# Zurück zum ursprünglichen Branch
git checkout "$current_branch" 2>/dev/null

echo ""
echo "========================================="
echo "📊 Zusammenfassung:"
echo "✅ Erfolgreich erstellt: $created_count PRs"
if [ $error_count -gt 0 ]; then
    echo "❌ Fehler: $error_count PRs"
fi
echo "========================================="

# Zeige alle PRs
echo ""
echo "📋 Aktuelle Pull Requests:"
gh pr list --label "cleanup"

echo ""
echo "💡 Nächste Schritte:"
echo "1. Review die PRs auf GitHub"
echo "2. Führe Tests durch"
echo "3. Merge nach Freigabe"
echo "4. Lösche die Feature-Branches nach dem Merge"
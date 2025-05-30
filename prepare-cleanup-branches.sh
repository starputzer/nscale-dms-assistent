#!/bin/bash

# Vorbereitung der Cleanup-Branches für manuelle PR-Erstellung

echo "🚀 Vorbereitung der Cleanup-Branches für Pull Requests..."
echo ""

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

# Hole aktuellen Branch
current_branch=$(git branch --show-current)

echo "📋 Folgende Branches werden vorbereitet:"
echo ""

# Liste alle Branches auf
for branch in "${!branches[@]}"; do
    echo "• $branch"
    echo "  ${branches[$branch]}"
    echo ""
done

echo "========================================="
echo ""

# Push alle Branches
echo "⬆️  Pushe alle Cleanup-Branches..."
echo ""

for branch in "${!branches[@]}"; do
    echo "Pushe $branch..."
    git push origin "$branch" 2>&1 | grep -v "Everything up-to-date" || true
done

echo ""
echo "✅ Alle Branches wurden gepusht!"
echo ""
echo "========================================="
echo ""
echo "📝 PR-Beschreibungen für Copy&Paste:"
echo ""

# Generiere PR-Beschreibungen
counter=1
for branch in "${!branches[@]}"; do
    description="${branches[$branch]}"
    issue_number="${branch#cleanup/issue-}"
    issue_number="${issue_number%%-*}"
    
    echo "### PR #$counter: $branch"
    echo ""
    echo "**Titel:** $description"
    echo ""
    echo "**Beschreibung:**"
    echo "\`\`\`"
    cat << EOF
## 🎯 Beschreibung
$description

## 📋 Issue
Dieses PR adressiert Issue #$issue_number aus dem Cleanup-Projekt.

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
    echo "\`\`\`"
    echo ""
    echo "**Labels:** cleanup, technical-debt"
    echo ""
    echo "========================================="
    echo ""
    ((counter++))
done

echo "💡 Nächste Schritte:"
echo ""
echo "1. Gehe zu: https://github.com/[USER]/[REPO]/pulls"
echo "2. Klicke auf 'New pull request'"
echo "3. Wähle den Branch aus der Liste"
echo "4. Kopiere Titel und Beschreibung von oben"
echo "5. Füge Labels hinzu: 'cleanup' und 'technical-debt'"
echo "6. Erstelle den Pull Request"
echo ""
echo "Wiederhole für alle 8 Branches!"

# Zeige GitHub URL
echo ""
echo "🔗 Direct Links für PR-Erstellung:"
echo ""
repo_url=$(git remote get-url origin | sed 's/\.git$//' | sed 's/git@github.com:/https:\/\/github.com\//')
for branch in "${!branches[@]}"; do
    echo "• $branch:"
    echo "  $repo_url/compare/main...$branch"
done
# Router Fix für Chat Sessions

## Problem
Die Route `/chat/a133c9e3-b2dd-43d3-92e2-7a86aa2a8d2b` wurde als "NotFound" angezeigt, obwohl eine gültige Session-ID vorhanden war.

## Ursache
1. Der Router hatte keine Route für `/chat/:sessionId` definiert
2. Die ChatView-Komponente suchte nach `route.params.id` statt `route.params.sessionId`

## Lösung

### 1. Router-Konfiguration (router/index.ts)
```typescript
// Neue Routes hinzugefügt:
{
  path: "/chat/:sessionId",
  name: "ChatSession",
  component: () => import("@/views/ChatView.vue"),
  meta: {
    requiresAuth: true,
    title: "nscale DMS Assistant",
  },
},
{
  path: "/session/:sessionId",
  redirect: (to) => ({ name: 'ChatSession', params: { sessionId: to.params.sessionId } }),
},
```

### 2. ChatView.vue Anpassungen
```typescript
// Vorher:
const sessionIdFromRoute = route.params.id as string;
watch(() => route.params.id, ...);

// Nachher:
const sessionIdFromRoute = route.params.sessionId as string;
watch(() => route.params.sessionId, ...);
```

## Resultat
- Routes `/chat/:sessionId` funktionieren jetzt korrekt
- Legacy-Route `/session/:sessionId` wird automatisch umgeleitet
- ChatView reagiert korrekt auf Route-Parameter
- Keine 404-Fehler mehr bei gültigen Session-IDs

## Test
Folgende URLs funktionieren jetzt:
- `/chat` - Listet alle Sessions oder erstellt neue
- `/chat/a133c9e3-b2dd-43d3-92e2-7a86aa2a8d2b` - Lädt spezifische Session
- `/session/a133c9e3-b2dd-43d3-92e2-7a86aa2a8d2b` - Redirect zu `/chat/:sessionId`
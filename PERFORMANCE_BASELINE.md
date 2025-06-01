# Performance Baseline - nscale-assist

Stand: 30. Mai 2025

## Build Performance

### Development Build
- **Vite Dev Server Start**: ~2.5s
- **Hot Module Replacement**: <100ms
- **Initial Page Load**: ~1.2s

### Production Build
- **Build Time**: 6.23s
- **Total Bundle Size**: ~2.5MB (unkomprimiert)
- **Largest Bundle**: messageFormatter-2klL7PtE.js (969.53 kB | gzip: 312.09 kB)

### Bundle Breakdown
| File | Size | Gzip |
|------|------|------|
| messageFormatter | 969.53 kB | 312.09 kB |
| ui | 254.07 kB | 83.81 kB |
| auto | 205.59 kB | 70.65 kB |
| index | 148.55 kB | 47.02 kB |
| bridge | 138.06 kB | 43.06 kB |
| vendor | 113.79 kB | 44.56 kB |

## Runtime Performance Metrics

### Core Web Vitals (Zielwerte)
- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.8s
- **Cumulative Layout Shift (CLS)**: < 0.1

### API Performance
- **Average Response Time**: ~150ms
- **P95 Response Time**: ~300ms
- **Error Rate**: < 0.5%
- **Throughput**: ~10 req/s

### Memory Usage
- **Initial Heap**: ~25MB
- **After 5min Usage**: ~40MB
- **Memory Growth Rate**: < 2MB/min

## TypeScript Compilation

### Current Status
- **Total TypeScript Errors**: ~2000
- **Critical Errors**: 0 (behoben)
- **Build blockierende Fehler**: 0

### Compilation Performance
- **Full Type Check**: ~45s
- **Incremental Type Check**: ~5s
- **Watch Mode Rebuild**: <2s

## Test Performance

### Unit Tests
- **Total Test Files**: 1
- **Total Tests**: 6
- **Success Rate**: 83.3% (5/6 passed)
- **Execution Time**: ~11.5s

### E2E Tests
- **Status**: Noch nicht konfiguriert

## Security Metrics

### Dependencies
- **Total Dependencies**: 650
- **Production Dependencies**: ~200
- **Dev Dependencies**: ~450
- **Security Vulnerabilities**: 0

### Bundle Security
- **No exposed secrets**: ✅
- **No debug code in production**: ✅
- **Source maps**: Nur in Development

## Optimization Opportunities

### High Priority
1. **messageFormatter Bundle**: Mit 970KB ist dies der größte Bundle
   - Empfehlung: Code-Splitting für Message-Formatting
   - Geschätzte Einsparung: 500KB

2. **UI Bundle**: 254KB könnten reduziert werden
   - Empfehlung: Tree-Shaking für ungenutzte UI-Komponenten
   - Geschätzte Einsparung: 100KB

### Medium Priority
1. **TypeScript Errors**: Schrittweise Reduzierung der 2000 Fehler
2. **Test Coverage**: Erhöhung von aktuell <1% auf >80%
3. **API Response Times**: Caching-Strategien implementieren

### Low Priority
1. **Bundle Compression**: Brotli statt Gzip für 10-20% kleinere Bundles
2. **Service Worker**: Für Offline-Funktionalität
3. **HTTP/3**: Für verbesserte Netzwerk-Performance

## Monitoring Setup

### Implementiert
- ✅ Performance Monitor Utility
- ✅ Performance Widget für Development
- ✅ Web Vitals Tracking
- ✅ API Response Time Tracking

### Geplant
- ⏳ Production Telemetry Endpoint
- ⏳ Grafana Dashboard
- ⏳ Automated Performance Regression Tests
- ⏳ Real User Monitoring (RUM)

## Baseline-Metriken für CI/CD

```yaml
performance_thresholds:
  build_time_seconds: 10
  bundle_size_mb: 3
  fcp_ms: 1800
  lcp_ms: 2500
  api_response_p95_ms: 500
  error_rate_percent: 1
  memory_growth_mb_per_min: 5
```

---

Diese Baseline dient als Referenz für zukünftige Performance-Optimierungen und CI/CD-Checks.
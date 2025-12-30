# Phase 3.3: Stress Test ElectricSQL

## Goals

- Test the performance of ElectricSQL under heavy load
- Identify bottlenecks in sync, storage, and query performance
- Establish baseline performance metrics for future optimization
- Test edge cases and failure scenarios
- Validate scalability assumptions

---

## Test Scenarios

### 1. Bulk Data Sync Test (Volume)

**Objective**: Test initial sync performance with large datasets

**Method**:
- Insert 10k rows into companies and users tables
- Measure: sync time, page load time, list query time
- Repeat 10 times (total: 200k records)
- Record results in spreadsheet

**Metrics to Track**:
- Initial sync duration (cold start)
- Incremental sync duration (warm start)
- IndexedDB size growth
- Memory usage (heap size)
- Browser responsiveness during sync
- Worker thread CPU usage

**Success Criteria**:
- Sync completes in < 30 seconds for 10k records
- Page remains responsive during sync
- No memory leaks after multiple iterations

---

### 2. CRUD Operation Performance (Real-world Patterns)

**Objective**: Test typical day-to-day operation performance

**Method**:
- Simulate realistic usage patterns:
  - 70% reads (list queries, detail views)
  - 20% updates (edit forms, inline edits)
  - 8% inserts (create new records)
  - 2% deletes (soft/hard deletes)
- Run for 10 iterations with random operations
- Measure sync latency for each operation type

**Metrics to Track**:
- Operation → Sync → UI update latency
- Query response time (with various filters)
- Conflict resolution time (if applicable)
- Change event propagation delay

**Success Criteria**:
- Updates sync to UI in < 2 seconds
- Queries return in < 100ms for typical filters
- No sync conflicts or data loss

---

### 3. Concurrent User Simulation

**Objective**: Test multi-tab and multi-user scenarios

**Method**:
- Open 5-10 browser tabs simultaneously
- Perform CRUD operations across tabs
- Test with different users accessing same company/workspace
- Measure sync consistency and timing

**Metrics to Track**:
- Cross-tab sync latency
- Shared worker overhead
- Memory usage per tab
- Sync queue backlog

**Success Criteria**:
- Changes appear in all tabs within 2 seconds
- No sync race conditions
- Shared worker handles all tabs efficiently

---

### 4. Complex Data Structures (Workspace Menu)

**Objective**: Test performance with large JSONB fields

**Method**:
- Create workspaces with large menu structures:
  - 100+ menu items
  - Deep nesting (10+ levels)
  - Multiple folders with children
- Test menu update sync performance
- Measure query and render time

**Metrics to Track**:
- JSONB field sync time
- Menu parse/render time
- IndexedDB storage overhead for large objects
- Query performance when filtering on JSONB fields

**Success Criteria**:
- Large menu structures sync in < 1 second
- UI renders without freezing
- JSONB queries remain performant

---

### 5. Storage Limit Handling (IndexedDB Quota)

**Objective**: Test behavior when storage quota is exceeded

**Method**:
- Artificially limit IndexedDB quota in Chrome/Edge (chrome://settings/content/all)
- Fill database until quota exceeded
- Test fallback strategies:
  - API-only mode (no local cache)
  - Partial sync (recent records only)
  - Clear old data and retry

**Metrics to Track**:
- Quota exceeded error detection time
- Fallback activation time
- API query performance vs IndexedDB
- User experience during quota issues

**Success Criteria**:
- Graceful degradation to API mode
- Clear error message to user
- No data loss during transition
- API performance acceptable (< 500ms queries)

**Implementation**:
- Add `QuotaExceededError` handler in Electric worker
- Implement API fallback layer
- Add UI notification for storage issues
- Provide "Clear Cache" option to users

---

### 6. Network Resilience Test

**Objective**: Test sync recovery after network issues

**Method**:
- Simulate network conditions:
  - Sudden disconnection (offline → online)
  - Slow 3G connection
  - High latency (500ms+)
  - Packet loss
- Make changes while offline
- Reconnect and measure sync time

**Metrics to Track**:
- Offline change queue size
- Sync resumption time after reconnect
- Conflict resolution accuracy
- Data integrity after recovery

**Success Criteria**:
- Queued changes sync within 5 seconds of reconnection
- No data loss or corruption
- Conflicts resolved correctly

---

### 7. Initial Load Performance (Cold Start)

**Objective**: Measure first-time user experience

**Method**:
- Clear all caches (IndexedDB, service worker, etc.)
- Measure time from page load to fully synced
- Test with different dataset sizes:
  - Small: 100 records
  - Medium: 1,000 records
  - Large: 10,000 records
  - Very Large: 100,000 records

**Metrics to Track**:
- Time to first render (TTI)
- Time to interactive (fully synced)
- Perceived performance (skeleton screens, loading states)
- Network data transferred

**Success Criteria**:
- Page interactive in < 3 seconds
- Full sync for 10k records in < 10 seconds
- Graceful loading states shown

---

### 8. Query Performance Test

**Objective**: Test PGLite query performance with various patterns

**Method**:
- Test different query types:
  - Simple SELECT with WHERE
  - Joins across tables
  - Aggregations (COUNT, SUM, AVG)
  - Complex filters with multiple conditions
  - Full-text search (if applicable)
  - Sorting and pagination
- Measure query time with growing dataset sizes

**Metrics to Track**:
- Query execution time
- Query plan efficiency
- Index usage
- Memory usage during queries

**Success Criteria**:
- Simple queries < 50ms
- Complex queries < 200ms
- Pagination works efficiently
- No performance degradation with dataset growth

---

### 9. Memory Leak Detection

**Objective**: Ensure no memory leaks over time

**Method**:
- Run application for extended period (1+ hours)
- Perform continuous CRUD operations
- Monitor memory usage over time
- Check for memory growth patterns

**Metrics to Track**:
- Heap size over time
- Detached DOM nodes
- IndexedDB memory usage
- Worker thread memory

**Success Criteria**:
- No unbounded memory growth
- Memory stabilizes after initial sync
- GC reclaims memory properly

---

### 10. Shape Reconfiguration Test

**Objective**: Test what happens when shape filters change

**Method**:
- User switches companies
- User joins/leaves workspace
- Permissions change (add/remove access)
- Measure time to unsubscribe old shapes and sync new ones

**Metrics to Track**:
- Shape unsubscribe time
- New shape sync time
- Data cleanup (old data removal)
- UI responsiveness during transition

**Success Criteria**:
- Shape switching completes in < 5 seconds
- Old data properly cleaned up
- No stale data displayed

---

### 11. OPFS (Origin Private File System) Compatibility Test

**Objective**: Test if Electric SQL / PGLite can use OPFS for better performance than IndexedDB

**Background**:
- OPFS is a web standard for high-performance file system access
- Provides near-native file I/O performance
- **Widely available** across all modern browsers since March 2023 (Chrome, Edge, Firefox, Safari)
- PGLite may support OPFS backend for better performance than IndexedDB

**Method**:
- Check OPFS browser support (`navigator.storage.getDirectory()`)
- Configure PGLite to use OPFS backend (if supported)
- Run same tests as Scenario 1 (Bulk Data Sync)
- Compare OPFS vs IndexedDB performance side-by-side

**Metrics to Track**:
- Initial sync time (OPFS vs IndexedDB)
- Query performance (OPFS vs IndexedDB)
- Write performance (INSERT/UPDATE/DELETE)
- Storage size and efficiency
- Memory usage
- Browser compatibility

**Test Matrix**:
```markdown
| Browser | Version | OPFS Support | Performance Gain | Notes |
|---------|---------|--------------|------------------|-------|
| Chrome  | 120+    | ✓            | TBD              | Test sync & query performance |
| Edge    | 120+    | ✓            | TBD              | Test sync & query performance |
| Firefox | 121+    | ✓            | TBD              | Test sync & query performance |
| Safari  | 17+     | ✓            | TBD              | Test sync & query performance |
```

**Implementation Research**:
1. Check PGLite OPFS support:
   - Review PGLite documentation for OPFS backend
   - Check `@electric-sql/pglite` for OPFS options
   - May need to configure file system backend explicitly

2. Fallback Strategy:
   - Primary: OPFS (supported in all modern browsers)
   - Fallback 1: IndexedDB (for older browsers or OPFS initialization errors)
   - Fallback 2: In-memory only (worst case, no persistence)

3. Configuration Example (hypothetical):
```typescript
// app/composables/useElectricSync.ts
const initPGLite = async () => {
  // Check OPFS support
  const hasOPFS = 'storage' in navigator && 'getDirectory' in navigator.storage
  
  if (hasOPFS) {
    console.log('Using OPFS for PGLite storage')
    return new PGLite({
      fs: 'opfs', // or similar option
      dataDir: '/electric-db'
    })
  } else {
    console.log('Falling back to IndexedDB for PGLite storage')
    return new PGLite({
      fs: 'idb',
      dataDir: 'electric-db'
    })
  }
}
```

**Success Criteria**:
- OPFS backend successfully initializes across all major browsers
- All queries work correctly with OPFS
- Performance improvement over IndexedDB:
  - Target: 20-50% faster sync and queries
  - Acceptable: 10%+ improvement
  - Consider switching if: > 20% improvement
- Consistent behavior across Chrome, Edge, Firefox, and Safari
- No data loss during storage backend switch

**Potential Benefits**:
- ✅ Faster sync times (file I/O vs IndexedDB overhead)
- ✅ Better write performance (atomic file operations)
- ✅ Larger storage capacity (not bound by IndexedDB quotas)
- ✅ Better performance with large datasets
- ✅ Reduced memory pressure

**Risks & Considerations**:
- ⚠️ May require PGLite version upgrade or custom build
- ⚠️ Need to handle migration from IndexedDB to OPFS for existing users
- ⚠️ OPFS is origin-private (data isolated per origin)
- ⚠️ Browser dev tools support for OPFS is more limited than IndexedDB
- ⚠️ Safari may have performance differences compared to Chromium browsers

**References**:
- [OPFS MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
- [PGLite GitHub](https://github.com/electric-sql/pglite)
- [OPFS Browser Support](https://caniuse.com/native-filesystem-api)

**Notes**:
- This test is exploratory and may require PGLite updates
- If PGLite doesn't natively support OPFS, document as future enhancement
- Consider contributing OPFS support to PGLite project if beneficial

---

## Test Implementation Plan

### Phase 1: Create Test Harness
- [ ] Create test data generator script (`scripts/generate-test-data.ts`)
- [ ] Create performance measurement utilities (`composables/usePerformanceTest.ts`)
- [ ] Create test report formatter
- [ ] Add dev-only test UI page (`/dev/stress-test`)

### Phase 2: Run Tests
- [ ] Execute all 10 test scenarios
- [ ] Record results in spreadsheet
- [ ] Identify bottlenecks
- [ ] Document issues

### Phase 3: Optimize
- [ ] Fix identified issues
- [ ] Implement storage quota handling
- [ ] Add performance monitoring
- [ ] Re-run tests to validate improvements

---

## Expected Results Format

For each test, document:

```markdown
### Test: [Name]
**Date**: 2024-12-30
**Dataset Size**: 10,000 records
**Browser**: Chrome 120 / Edge 120

| Run | Sync Time | Page Load | Query Time | Memory (MB) | Notes |
|-----|-----------|-----------|------------|-------------|-------|
| 1   | 5.2s      | 2.1s      | 45ms       | 120         | -     |
| 2   | 5.5s      | 2.0s      | 48ms       | 125         | -     |
| ... | ...       | ...       | ...        | ...         | ...   |
| Avg | 5.3s      | 2.1s      | 46ms       | 122         | -     |

**Issues Found**: [List any issues]
**Recommendations**: [Optimization suggestions]
```

---

## Performance Targets

Based on best practices and user expectations:

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Initial Sync (10k records) | < 10s | < 30s | > 30s |
| Incremental Sync | < 1s | < 3s | > 5s |
| Query Response | < 50ms | < 200ms | > 500ms |
| Page Load Time | < 2s | < 5s | > 10s |
| Memory Usage | < 200MB | < 500MB | > 1GB |
| Storage Size | < 50MB | < 200MB | > 500MB |

---

## Tools & Monitoring

- **Chrome DevTools**: Performance profiler, Memory profiler, Network throttling
- **Lighthouse**: Performance scoring
- **IndexedDB Inspector**: Storage monitoring
- **Custom Metrics**: Add performance markers in code
- **Error Tracking**: Sentry or similar for production monitoring

---

## Potential Issues to Watch For

1. **Memory Leaks**: Unclosed connections, event listener buildup
2. **Sync Storms**: Too many simultaneous syncs overwhelming the system
3. **Storage Bloat**: IndexedDB growing unbounded
4. **Query N+1**: Inefficient query patterns in components
5. **Shape Overlap**: Multiple shapes syncing duplicate data
6. **Worker Overhead**: Shared worker becoming a bottleneck
7. **JSONB Performance**: Large nested structures slowing down queries
8. **Connection Pooling**: Running out of database connections
9. **Bandwidth**: Syncing too much data on poor connections
10. **Browser Limits**: Hitting per-origin storage quotas

---

## Success Criteria

Phase 3.1 is complete when:

- [x] All 10 test scenarios executed
- [x] Results documented with metrics
- [x] Performance targets met or issues identified
- [x] Storage quota handling implemented
- [x] Optimization recommendations documented
- [x] Baseline metrics established for future comparison

---

## Next Steps After Testing

1. **If Performance Good**: Document best practices, move to Phase 4.0
2. **If Issues Found**: Create Phase 3.2 for optimization work
3. **If Major Redesign Needed**: Reassess Electric SQL viability 

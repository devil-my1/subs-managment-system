# Testing

## Testing Frameworks & Libraries

### Backend
- `pytest` — primary test runner
- `pytest-asyncio` — async test support
- `httpx` — HTTP client for live API integration tests

### Frontend (Next.js)
- **None configured** — no test framework installed

### Mobile (React Native / StMS)
- **None configured** — no test framework installed

---

## Test File Locations

```
backend/tests/
  test_auth.py
  test_subscriptions.py
  test_analytics.py
```

---

## Types of Tests Present

| Type | Present | Notes |
|------|---------|-------|
| Unit tests | No | Not present anywhere |
| Integration tests (live API) | Yes | Backend only, hits running API |
| E2E tests | No | Not configured |
| Component tests | No | Frontend/mobile untested |

All existing tests are **live-API integration tests** — they call the running server directly and skip on server errors.

---

## Test Coverage

- **Backend API**: Partial — auth, subscriptions, analytics endpoints covered
- **Frontend**: 0% — no tests
- **Mobile**: 0% — no tests
- **Business logic / utils**: 0% — no unit tests

---

## CI/CD Test Configuration

- No CI/CD pipeline detected for automated test runs
- Tests must be run manually

---

## Coverage Gaps

1. No unit tests for isolated logic (validators, helpers, calculations)
2. Frontend (Next.js) completely untested
3. Mobile app completely untested
4. No E2E tests for critical user flows
5. Backend tests require a live running server — no mocking layer
6. Tests skip silently on server errors, masking failures
7. No coverage reporting configured

# Tests

Unit tests for the `theme-io` helper template that ships into user projects.

```bash
cd tests
npm test
```

Requires Node 22.6+ for `--experimental-strip-types`. Older Node:

```bash
npm i -D tsx
npx tsx --test ./*.test.ts
```

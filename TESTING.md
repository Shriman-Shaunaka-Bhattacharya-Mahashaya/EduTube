# Testing and GitHub Actions

The repository has two independent suites. Run commands below from the repository root with Node.js 22.14+ (CI also tests Node.js 24).

```sh
npm ci --prefix edutube-backend
npm ci --prefix edutube-frontend
npm run check --prefix edutube-backend
npm run test:ci --prefix edutube-backend
npm run lint --prefix edutube-frontend
npm run test:ci --prefix edutube-frontend
npm run build --prefix edutube-frontend
```

For faster runs without coverage, use `npm test --prefix edutube-backend` or `npm test --prefix edutube-frontend`. Each package also has `npm run test:watch` (run inside that package directory).

## What runs on GitHub

`.github/workflows/ci.yml` runs on every branch push, pull request, and manual dispatch. It installs from the committed lockfiles using `npm ci`, checks backend syntax, runs frontend ESLint, runs both test suites with coverage gates, and builds the frontend. Node 22 and 24 run as separate matrix jobs. Failed assertions, coverage gates, syntax, lint, installation, or build steps fail their job. Superseded runs on the same ref are cancelled.

Coverage artifacts are uploaded even when tests fail, when a report was produced, and retained for 14 days. Download them from the workflow's Artifacts section and open `index.html` (frontend) or `lcov-report/index.html` (backend). The local reports are in each package's ignored `coverage/` directory.

The workflow has read-only repository permissions, does not retain checkout credentials, and does not commit, push, publish, or deploy. No repository secrets are required. You must add, commit, and push these files yourself before GitHub can run the workflow. GitHub Actions evaluates pushed commits; it does not prevent a local push. To require passing checks before merging, configure branch protection/rulesets in GitHub after the first run and select the four matrix check names shown there. No repository settings have been changed for you.

## Test coverage

| Area | Checks |
| --- | --- |
| Authentication | Required and invalid fields, hashed registration passwords, duplicate IDs, login errors, signed JWT expiry, malformed/wrong/expired tokens, protected endpoints, password omission |
| User data | Empty saved collections, missing users, student permissions, subscriptions and subscriber count changes, normalized topics, bookmark toggles, database failures |
| Media | Real MongoDB text searches and sorting, exact IDs, educator listing, multipart uploads for supported types, MIME rejection, 50 MB limit, authenticated author identity, vote identity and toggling, ownership checks, cascading deletion |
| AI orchestration | PDF processing and reuse, insignificant chunks, download failures, 384-element mocked embeddings, retrieval isolation, chat role/history mapping, missing context, query validation, malformed provider output and provider failures |
| Models and app | Required fields, role enum, defaults, CORS, malformed JSON, unknown routes |
| Frontend auth | Form validation, registration roles, loading/error/success states, routing guards, session restoration, corrupt or blocked storage, login and logout |
| Themes | Light/dark switching, persistence, keyboard operation, system preference bootstrap, invalid preference and storage fallback |
| Student UI | Search modes and URL encoding, empty/error/loading states, saved shortcuts, subscriptions, bookmarks, topics, votes, media variants, AI tutor history/reopening and failures |
| Educator UI | Subscriber display, media variants, multipart upload payload, file limit, submission state, success/reset and retry, delete confirmation/cancellation/failure, expired session |

Frontend coverage includes `App.jsx` and all component source files, including files not imported by a test. Backend coverage includes `app.js`, every route, middleware, and model. Minimum global coverage: frontend 85% statements/lines/functions and 75% branches; backend 85% statements/lines, 90% functions, and 75% branches. New files in these directories are included automatically.

## Isolation and limitations

Backend tests use Jest and Supertest against the real Express routers, bcrypt, JWT, Multer, Mongoose schemas, and a disposable MongoDB process. `tests/env.js` uses test-only placeholders and pins MongoDB 7.0.24. Tests never load `.env` or use `MONGO_URI`. Databases are cleared between cases and the process is stopped after each suite. Binary downloading is disabled during npm installation and performed once in Jest global setup before suite timeouts start. A first test run requires Internet access to download the MongoDB binary from MongoDB's distribution server; it is cached under `edutube-backend/.cache/`. Do not disable checksum or TLS verification to work around a restricted network.

Cloudinary storage/deletion, Groq, Axios PDF downloads, PDF parsing, and embedding generation are mocked. MongoDB Atlas `$vectorSearch` is mocked because the standalone test MongoDB does not provide Atlas Search. These tests verify application orchestration, isolation filters, and provider contracts as used by the code, not the correctness or availability of the real services. The lazy transformer loader in `services/embeddings.js` and production server/database startup are outside this suite's coverage scope.

Frontend tests use Vitest, jsdom, and React Testing Library with mocked Axios responses. They test interactions and DOM behavior, not browser rendering, CSS contrast, responsive visual layout, video playback, or real network integration. File-upload tests dispatch form submission after selecting and checking the file because jsdom's native file-input validation/reset differs from browsers. There are no screenshot tests, full-stack browser tests, load tests, or live-provider tests in this suite. Those need separate infrastructure and explicit test accounts; a green suite is not proof that every possible case works.

## Adding tests

- Backend tests go in `edutube-backend/tests/*.test.js`. Use `helpers.js` for test users, media, authentication, and mocked external integrations. Do not import `server.js` or read production credentials.
- Frontend tests go under `edutube-frontend/src/` as `*.test.js` or `*.test.jsx`. Prefer accessible names and user-visible outcomes. Resolve pending mocked requests before ending a test.
- Add a regression case when fixing a bug. Keep assertions on status, persisted data, user-visible results, and prohibited side effects; avoid snapshots that merely duplicate implementation.

Dependency security auditing is separate from functional tests. Dependency installation reported advisories; this change does not apply forced dependency upgrades or claim the dependency tree is vulnerability-free. Review `npm audit` in each package before release.

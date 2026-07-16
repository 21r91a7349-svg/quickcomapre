# Contributing to QuickCompare

Thank you for your interest in QuickCompare!

## 1. Development Setup

1. Fork the repository.
2. Clone locally: `git clone https://github.com/your-org/quickcompare.git`
3. Install dependencies: `npm install`
4. Setup PostgreSQL (e.g. locally or via Supabase) and populate `.env`.
5. Run migrations: `npx prisma db push`
6. Start dev server: `npm run dev`

## 2. Coding Conventions

- **Frameworks**: We strictly use Next.js 16 App Router.
- **Language**: TypeScript is mandatory. Do not use `any` unless absolutely necessary (and leave a comment why).
- **Styling**: We rely on standard CSS modules and a global `index.css`. Avoid adding Tailwind or large UI libraries without discussion.
- **Linting**: Ensure `npm run lint` passes before committing.

## 3. Running Tests

We use Playwright for our E2E testing suite.

```bash
# Run tests
npx playwright test

# Debug tests
npx playwright test --ui
```

## 4. Branch Strategy

- `main` is strictly reserved for production-ready releases.
- Feature branches should be named `feature/<short-desc>` or `fix/<short-desc>`.
- Always open a Pull Request against `main`.

## 5. Pull Requests

- Provide a clear PR description.
- Ensure all CI tests pass.
- Reference any related issues.

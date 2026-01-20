# Comprehensive Test Plan

## 1. Introduction and Testing Objectives

The purpose of this plan is to ensure that the **10xDevs Travels** application meets functional and non-functional requirements, delivers a seamless user experience, and is robust, secure, and maintainable.  
We aim to detect defects as early as possible, verify that each module functions correctly in isolation and in combination, and confirm that the system performs reliably under expected and peak loads.

## 2. Test Scope

Included:

- Astro pages, React components, and Tailwind-based UI
- API endpoints under `src/pages/api`
- Supabase integration (authentication, database operations, Row Level Security)
- AI integration via OpenRouter
- Middleware, client-side hooks, and shared services
- CI/CD workflows (GitHub Actions)

Excluded:

- Third-party libraries (tested by providers)
- Supabase cloud infrastructure itself (focus on our SQL and policies)

## 3. Types of Tests

| Test Type             | Goal                                                                        | Tools / Frameworks                                  |
| --------------------- | --------------------------------------------------------------------------- | --------------------------------------------------- |
| Unit                  | Validate individual functions, hooks, and React components.                 | **Vitest**, **React Testing Library**               |
| Integration           | Verify interaction between frontend, API routes, Supabase, and AI services. | **Vitest**, **Supertest**, **MSW**                  |
| End-to-End (E2E)      | Simulate user workflows across UI and backend.                              | **Playwright**                                      |
| Contract / API        | Ensure endpoints respect request & response schemas (Zod).                  | **Prisma/zod-schema validation**, **OpenAPI tests** |
| Security              | Check authentication, authorization, and RLS rules.                         | **OWASP ZAP**, bespoke Supabase RLS tests           |
| Performance & Load    | Measure response times and scalability of critical endpoints.               | **k6**, **Playwright trace**                        |
| Accessibility (a11y)  | Confirm UI meets WCAG 2.1 AA standards.                                     | **axe-playwright**, **eslint-plugin-jsx-a11y**      |
| Visual Regression     | Detect unintended UI changes.                                               | **Playwright** screenshot comparison                |
| Continuous Regression | Automated test runs on every pull request via GitHub Actions.               | CI pipelines                                        |

## 4. Key Test Scenarios

1. **User Registration & Login**  
   • Happy path registration → email confirmation → login  
   • Invalid credentials, locked account, password reset
2. **Dashboard Operations**  
   • Display trip notes list with pagination & filters  
   • Sort, search, and CRUD trip notes  
   • Unsaved-changes prompt when navigating away
3. **Trip Note Generation (AI)**  
   • Generate itinerary → check job status polling → display generated content  
   • Handle OpenRouter errors, timeouts, and quota exhaustion
4. **Permissions & RLS**  
   • User A cannot access User B’s trip notes (direct API call and UI)  
   • Deleted accounts lose all access tokens
5. **Delete Account Flow**  
   • Confirmation dialog → Supabase delete → session invalidated → redirect
6. **Middleware & Route Guards**  
   • Protected page redirects unauthenticated users  
   • Public pages remain accessible
7. **Responsive Design & Accessibility**  
   • Viewport tests (mobile, tablet, desktop)  
   • Keyboard navigation, focus states, ARIA attributes
8. **Performance**  
   • API < 300 ms at p95 under 100 RPS  
   • Largest Contentful Paint < 2.5 s on mid-tier mobile
9. **CI/CD Pipeline**  
   • All tests pass, lints clean, build completes  
   • Fail fast on new migrations lacking rollback

## 5. Test Environment

- **Local:** Node 18 LTS, Supabase CLI with a local PostgreSQL instance, .env.test variables
- **CI:** GitHub Actions runners (ubuntu-latest) with Docker-based Supabase service
- **Staging:** DigitalOcean droplet mirroring production settings
- Browsers: Chromium, Firefox, WebKit (via Playwright)
- Mobile: Emulated iPhone 14, Pixel 7

## 6. Testing Tools

- **Vitest** – fast TypeScript unit & integration tests
- **React Testing Library** – component behavior
- **Supertest** – HTTP assertions
- **MSW** – mock external HTTP/AI calls
- **Playwright** – E2E, visual, a11y, cross-browser
- **k6** – load testing scripts
- **axe-playwright** – automated accessibility checks
- **OWASP ZAP** – dynamic security scanning
- **Supabase CLI** – seeded test database
- **GitHub Actions** – orchestrate pipelines and badges

## 7. Test Schedule

| Phase                                | Duration       | Milestones                            |
| ------------------------------------ | -------------- | ------------------------------------- |
| Test Planning                        | Week 1         | Approved test plan                    |
| Test Case Design & Environment Setup | Weeks 1-2      | 100 % test cases in Zephyr / TestRail |
| Unit & Integration Automation        | Weeks 2-4      | ≥ 80 % critical code coverage         |
| E2E & a11y Automation                | Weeks 3-5      | Core user journeys automated          |
| Performance & Security               | Week 5         | Baseline metrics & report             |
| Regression Cycles                    | Continuous     | Before each release                   |
| Final Acceptance                     | Release-1 week | Sign-off memo                         |

## 8. Acceptance Criteria

- All test cases executed; **0 high / critical** defects open
- Code coverage ≥ 80 % lines, ≥ 90 % for services and hooks
- Performance targets met at p95
- a11y violations: none of serious/critical severity
- Security scan: no high risk findings
- Product Owner & QA Lead sign-off

## 9. Roles and Responsibilities

| Role                | Responsibilities                                     |
| ------------------- | ---------------------------------------------------- |
| QA Lead             | Own test strategy, risk assessment, reporting        |
| QA Engineers        | Design & automate tests, execute exploratory testing |
| Developers          | Write unit tests, fix defects, peer reviews          |
| DevOps              | Maintain CI/CD, test environments                    |
| Product Owner       | Approve acceptance criteria, sign-off                |
| Security Specialist | Conduct penetration testing, review policies         |

## 10. Bug Reporting Procedures

- Defects logged in **GitHub Issues** with template: steps, expected vs actual, severity, screenshots/logs.
- Severity levels: Blocker, Critical, Major, Minor, Trivial.
- QA verifies fixes in the same branch; defect closed only after regression test passes.
- Weekly defect triage with Dev & PO.

---

This plan aligns with the project’s Astro/React frontend, Supabase backend, AI integration, and CI/CD pipelines, providing a structured path to deliver a high-quality, secure, and performant application.

# VibeTravels

![Astro](https://img.shields.io/badge/astro-5.x-blueviolet?logo=astro) ![TypeScript](https://img.shields.io/badge/typescript-5.x-3178c6?logo=typescript) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

A web-based application that turns simple travel notes into actionable, day-level trip itineraries. VibeTravels helps couples and small groups quickly plan trips by combining note-taking, preference management, and AI-powered itinerary generation.

---

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Getting Started Locally](#getting-started-locally)
3. [Available Scripts](#available-scripts)
4. [Project Scope](#project-scope)
5. [Project Status](#project-status)
6. [License](#license)

---

## Tech Stack

Frontend:
- **Astro&nbsp;5** – lightning-fast, component-agnostic framework
- **React&nbsp;19** – interactive UI components
- **TypeScript&nbsp;5** – type-safe JavaScript
- **Tailwind&nbsp;CSS&nbsp;4** – utility-first styling
- **shadcn/ui** – accessible component library

Backend & Infrastructure:
- **Supabase** – PostgreSQL database, Auth, Storage
- **Openrouter.ai** – access to multiple AI models
- **GitHub Actions** – CI / CD pipelines
- **Docker + DigitalOcean** – deployment target

---

## Getting Started Locally

### Prerequisites
- **Node.js 22.14.0** (see `.nvmrc`)
- **pnpm** or **npm** ≥ 9
- **Supabase account** (for database and authentication)

### Setup

```bash
# clone the repository
git clone https://github.com/<your-org>/vibetravels.git
cd vibetravels

# install dependencies
npm install  # or pnpm install

# copy the environment variables template
cp .env.example .env

# edit .env and add your Supabase credentials
# See "Environment Variables" section below

# start the development server
npm run dev
```

The app will be available at `http://localhost:4321` by default.

### Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Supabase Configuration (Server-side)
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key

# Supabase Configuration (Client-side - PUBLIC_ prefix required)
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_public_key

# OpenRouter AI Configuration
OPENROUTER_API_KEY=your_openrouter_api_key
```

**Important Notes**:
- Variables prefixed with `PUBLIC_` are exposed to the browser
- Use the **anon/public key** for `PUBLIC_SUPABASE_ANON_KEY`, NOT the service role key
- The service role key (`SUPABASE_KEY`) should only be used server-side
- Get your Supabase credentials from your [Supabase Dashboard](https://app.supabase.com)

To build a production bundle and preview it locally:

```bash
npm run build
npm run preview
```

---

## Available Scripts

| Script            | Purpose                                   |
|-------------------|-------------------------------------------|
| `npm run dev`     | Start Astro in development mode with hot reload |
| `npm run build`   | Generate a static production build            |
| `npm run preview` | Serve the production build locally            |
| `npm run astro`   | Run arbitrary Astro CLI commands              |
| `npm run lint`    | Run ESLint on the project                    |
| `npm run lint:fix`| Lint and automatically fix problems          |
| `npm run format`  | Format files with Prettier                   |

---

## Project Scope

The MVP focuses on the following core functionality:
1. **Auth** – email & password sign-up / sign-in (Supabase Auth)
2. **Trip Notes CRUD** – destination, dates, budget, details, group size
3. **Preferences** – user travel preferences stored privately
4. **AI-Generated Itineraries** – day-level plans created from notes

See `.ai/prd.md` for full details.

---

## Project Status

`🚧` **In active development** – core features are being built toward the first public MVP release. Follow the [project board](https://github.com/<your-org>/vibetravels/projects) for up-to-date progress.

---

## License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

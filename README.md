# GitClaw

A self-hosted Next.js dashboard for managing and creating scheduled jobs that run on **GitHub Actions**.

## Features

- **First-time setup wizard** — set admin password + GitHub credentials in one flow
- **Create scheduled jobs** — define cron expressions, runner type, and shell commands
- **Workflow auto-management** — workflow YAML files are automatically committed to your repo
- **Manual triggering** — fire any job on-demand via `workflow_dispatch`
- **Pause / enable** jobs without deleting the workflow file
- **Run history** — see recent GitHub Actions run statuses directly in the dashboard
- **Settings page** — update GitHub token/repo at any time

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | SQLite via `better-sqlite3` |
| Auth | JWT (`jose`) + bcrypt |
| GitHub API | `@octokit/rest` |
| Styling | Tailwind CSS |

## Getting Started

### 1. Clone & install

```bash
git clone <this-repo>
cd gitclaw
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and set a strong `JWT_SECRET`:

```
JWT_SECRET=your-long-random-secret-at-least-32-chars
```

Generate one easily:
```bash
openssl rand -base64 32
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the setup wizard.

### 4. First-time setup

The setup wizard will ask for:
1. **Admin password** (min 8 characters) — used to log in to the dashboard
2. **GitHub Personal Access Token** — needs `repo` + `workflow` scopes
3. **GitHub Owner/Org** — the account or organization that owns the repo
4. **GitHub Repository** — jobs will be committed as workflow files here

## GitHub Token Permissions

Create a token at **GitHub → Settings → Developer settings → Personal access tokens**.

Required scopes:
- `repo` — to read/write files in your repository
- `workflow` — to create and trigger workflow files

## How Jobs Work

1. When you create a job, a `.github/workflows/scheduled-<id>.yml` file is committed to your GitHub repo
2. GitHub Actions reads the cron schedule and runs the job automatically
3. Every workflow also has `workflow_dispatch` enabled, so you can trigger it manually from the dashboard
4. Pausing a job updates the workflow file (keeping it in the repo but noting it's paused in the DB)
5. Deleting a job removes the workflow file from GitHub entirely

## Production Deployment

```bash
npm run build
npm start
```

Make sure `JWT_SECRET` is set to a secure random value in production.
The SQLite database is stored at `./data/jobs.db` — back this up regularly.

## Project Structure

```
app/
  api/           # API routes (auth, jobs, settings)
  dashboard/     # Job list dashboard
  jobs/          # New job form + job detail/edit
  setup/         # First-time setup wizard
  login/         # Login page
  settings/      # GitHub settings + logout
components/
  Sidebar.tsx    # Navigation sidebar
  CronInput.tsx  # Visual cron expression editor
lib/
  db.ts          # SQLite database layer
  auth.ts        # JWT session helpers
  github.ts      # GitHub API (Octokit) integration
  utils.ts       # Shared utilities (ID gen, date format, cron description)
proxy.ts         # Route protection (Next.js 16 Proxy)
```

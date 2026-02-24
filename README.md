# GitClaw

A self-hosted Next.js dashboard for managing and creating scheduled jobs that run on **GitHub Actions**.

## Features

- **First-time setup wizard** — set admin password + GitHub credentials in one flow
- **Create scheduled jobs** — define cron expressions, runner type, and shell commands
- **Multi-language jobs** — Shell, Node.js 20, and Python 3 job types with auto-generated workflow steps
- **Workflow auto-management** — workflow YAML files are automatically committed to your repo
- **Manual triggering** — fire any job on-demand via `workflow_dispatch`
- **Pause / enable** jobs without deleting the workflow file
- **Live run status** — sidebar shows all jobs with real-time execution status (polling every 30s)
- **Step-level log viewer** — click any step to fetch and view full logs inline
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

## Roadmap

### LLM-Assisted Job Configuration

The next major milestone is to let any LLM — local or cloud — describe, generate, and configure jobs through natural language.

#### Phase 1 — Natural Language Job Creation
> *"Run a Python script every night that fetches my GitHub star count and saves it to a file."*

- Add an **AI Compose** panel to the new job form
- User describes the job in plain English; the LLM returns a structured job config (name, cron, job type, script)
- GitClaw applies the config directly into the form fields for the user to review and submit

#### Phase 2 — LLM Provider Support

Support pluggable providers so you can use whatever model you have access to:

| Provider | Models | Notes |
|---|---|---|
| **Anthropic** | Claude Sonnet / Haiku / Opus | Cloud API |
| **OpenAI** | GPT-4o, GPT-4o-mini | Cloud API |
| **Local (Ollama)** | Llama 3, Mistral, Qwen, etc. | Self-hosted, no data leaves your machine |
| **OpenAI-compatible** | Any OpenRouter / LM Studio endpoint | Custom base URL |

Provider and API key stored in the existing settings DB (encrypted at rest).

#### Phase 3 — AI Job Analysis & Debugging

- **Explain a run** — paste logs or select a failed run; the LLM summarises what went wrong and suggests fixes
- **Optimise a script** — the LLM suggests improvements to the command/script inside a job
- **Natural language schedule editing** — *"Change this to run twice a day"* auto-updates the cron expression

#### Phase 4 — Agentic Job Creation

- LLM can browse your repo file tree and generate scripts that reference actual files
- Multi-step conversations to iteratively refine a job before committing it to GitHub

---

*Contributions welcome — open an issue to discuss any phase or feature.*

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

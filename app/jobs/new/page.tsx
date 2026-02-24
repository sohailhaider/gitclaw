'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CronInput from '@/components/CronInput';

const RUNS_ON_OPTIONS = [
  'ubuntu-latest',
  'ubuntu-22.04',
  'ubuntu-20.04',
  'windows-latest',
  'macos-latest',
];

type JobType = 'shell' | 'node' | 'python';

const JOB_TYPES: { value: JobType; label: string; icon: string; description: string; defaultCommand: string; language: string }[] = [
  {
    value: 'shell',
    label: 'Shell Script',
    icon: '>_',
    description: 'Bash / shell commands',
    defaultCommand: 'echo "Hello from GitClaw!"',
    language: 'bash',
  },
  {
    value: 'node',
    label: 'Node.js Script',
    icon: 'JS',
    description: 'JavaScript with Node.js 20',
    defaultCommand: 'console.log("Hello from GitClaw!");',
    language: 'javascript',
  },
  {
    value: 'python',
    label: 'Python Script',
    icon: 'Py',
    description: 'Python 3 script',
    defaultCommand: 'print("Hello from GitClaw!")',
    language: 'python',
  },
];

const PRESETS = [
  { label: 'Every hour',        cron: '0 * * * *',   description: 'Runs at the start of every hour' },
  { label: 'Every day at midnight', cron: '0 0 * * *', description: 'Runs at 00:00 UTC daily' },
  { label: 'Every Monday 9am',  cron: '0 9 * * 1',   description: 'Runs weekly on Monday at 09:00 UTC' },
  { label: 'Every 6 hours',     cron: '0 */6 * * *', description: 'Runs at 00:00, 06:00, 12:00, 18:00 UTC' },
  { label: 'Daily 2am',         cron: '0 2 * * *',   description: 'Runs at 02:00 UTC every day' },
  { label: 'First of month',    cron: '0 8 1 * *',   description: 'Runs on the 1st of every month at 08:00 UTC' },
];

export default function NewJobPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('0 0 * * *');
  const [jobType, setJobType] = useState<JobType>('shell');
  const [command, setCommand] = useState('echo "Hello from GitClaw!"');
  const [runsOn, setRunsOn] = useState('ubuntu-latest');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  function handleJobTypeChange(type: JobType) {
    const currentDefault = JOB_TYPES.find(t => t.value === jobType)?.defaultCommand ?? '';
    setJobType(type);
    // Replace command only if it still matches the previous default
    if (command === currentDefault) {
      setCommand(JOB_TYPES.find(t => t.value === type)?.defaultCommand ?? '');
    }
  }

  const commandLines = command.split('\n').map(l => '          ' + l).join('\n');

  const previewSetupStep = jobType === 'node'
    ? `
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
`
    : jobType === 'python'
    ? `
      - uses: actions/setup-python@v4
        with:
          python-version: '3.x'
`
    : '';

  const previewRunStep = jobType === 'node'
    ? `      - name: Run Node.js script
        run: |
          node - << 'GITCLAW_SCRIPT_EOF'
${commandLines}
          GITCLAW_SCRIPT_EOF`
    : jobType === 'python'
    ? `      - name: Run Python script
        run: |
          python3 - << 'GITCLAW_SCRIPT_EOF'
${commandLines}
          GITCLAW_SCRIPT_EOF`
    : `      - name: Run shell script
        run: |
${commandLines}`;

  const previewYaml = `name: "${name || 'My Job'}"

on:
  schedule:
    - cron: "${schedule}"
  workflow_dispatch:

jobs:
  run-job:
    runs-on: ${runsOn}
    steps:
      - uses: actions/checkout@v4
${previewSetupStep}
${previewRunStep}
`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Job name is required.'); return; }
    if (!schedule.trim()) { setError('Schedule is required.'); return; }
    if (!command.trim()) { setError('Command is required.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, schedule, command, runsOn, jobType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create job');
        setLoading(false);
        return;
      }
      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard"
              className="p-2 rounded-lg transition-colors"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Create New Job</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Define a cron job that runs on GitHub Actions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic info */}
          <section className="rounded-xl p-5 space-y-4"
                   style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Job Details</h2>

            <Field label="Job Name" required>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Nightly DB Backup"
                required
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </Field>

            <Field label="Description">
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What does this job do? (optional)"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </Field>

            <Field label="Job Type">
              <div className="grid grid-cols-3 gap-2">
                {JOB_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleJobTypeChange(type.value)}
                    className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg text-xs transition-colors"
                    style={{
                      background: jobType === type.value ? 'rgba(31,111,235,0.15)' : 'var(--surface-2)',
                      border: `1px solid ${jobType === type.value ? 'var(--info)' : 'var(--border)'}`,
                      color: jobType === type.value ? '#79c0ff' : 'var(--text-muted)',
                    }}
                  >
                    <span className="font-mono font-bold text-sm">{type.icon}</span>
                    <span className="font-medium">{type.label}</span>
                    <span className="opacity-70 text-[10px]">{type.description}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Runner">
              <select
                value={runsOn}
                onChange={e => setRunsOn(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                {RUNS_ON_OPTIONS.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>
          </section>

          {/* Schedule */}
          <section className="rounded-xl p-5 space-y-4"
                   style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Schedule</h2>

            {/* Presets */}
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Quick presets</p>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map(p => (
                  <button
                    key={p.cron}
                    type="button"
                    onClick={() => setSchedule(p.cron)}
                    className="text-left px-3 py-2 rounded-lg text-xs transition-colors"
                    style={{
                      background: schedule === p.cron ? 'rgba(31,111,235,0.15)' : 'var(--surface-2)',
                      border: `1px solid ${schedule === p.cron ? 'var(--info)' : 'var(--border)'}`,
                      color: schedule === p.cron ? '#79c0ff' : 'var(--text)',
                    }}
                  >
                    <div className="font-medium">{p.label}</div>
                    <div className="font-mono opacity-70 text-[10px]">{p.cron}</div>
                  </button>
                ))}
              </div>
            </div>

            <CronInput value={schedule} onChange={setSchedule} />
          </section>

          {/* Command */}
          <section className="rounded-xl p-5 space-y-3"
                   style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {jobType === 'node' ? 'Node.js Script' : jobType === 'python' ? 'Python Script' : 'Shell Commands'}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded"
                    style={{ background: 'var(--surface-2)', color: '#79c0ff', border: '1px solid var(--border)' }}>
                {JOB_TYPES.find(t => t.value === jobType)?.language}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {jobType === 'node'
                ? 'JavaScript code to run with Node.js 20 on the GitHub Actions runner'
                : jobType === 'python'
                ? 'Python 3 code to run on the GitHub Actions runner'
                : 'Shell commands to run inside the GitHub Actions runner'}
            </p>
            <textarea
              value={command}
              onChange={e => setCommand(e.target.value)}
              rows={6}
              spellCheck={false}
              placeholder={JOB_TYPES.find(t => t.value === jobType)?.defaultCommand}
              required
              className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono resize-y"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                lineHeight: '1.6',
              }}
            />
          </section>

          {error && (
            <div className="text-sm px-3 py-2 rounded-lg"
                 style={{ background: 'rgba(218,54,51,0.1)', border: '1px solid rgba(218,54,51,0.3)', color: '#ff7b72' }}>
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Link href="/dashboard"
                  className="flex-1 text-center py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {loading ? 'Creating…' : 'Create Job'}
            </button>
          </div>
        </form>

        {/* Preview panel */}
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden"
               style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-4 py-3"
                 style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                Workflow Preview
              </span>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                {showPreview ? 'Hide' : 'Show'}
              </button>
            </div>
            {showPreview && (
              <pre className="p-4 text-xs overflow-auto max-h-96 font-mono"
                   style={{ color: '#e6edf3', background: '#0d1117', lineHeight: 1.6 }}>
                {previewYaml}
              </pre>
            )}
            {!showPreview && (
              <div className="px-4 py-6 text-center">
                <button type="button" onClick={() => setShowPreview(true)}
                        className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Click to preview the generated workflow YAML
                </button>
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="rounded-xl p-4 text-sm space-y-2"
               style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="font-medium" style={{ color: 'var(--text)' }}>How it works</p>
            <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <li>1. A workflow file is committed to your GitHub repo under <code style={{ color: '#79c0ff' }}>.github/workflows/</code></li>
              <li>2. GitHub Actions picks up the cron schedule automatically</li>
              <li>3. Use <strong style={{ color: 'var(--text)' }}>Run Now</strong> to trigger it manually via <code style={{ color: '#79c0ff' }}>workflow_dispatch</code></li>
              <li>4. Pause/delete a job to disable or remove its workflow file</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

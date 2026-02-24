'use client';

import { useEffect, useState, use, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CronInput from '@/components/CronInput';
import { formatDate, cronDescription } from '@/lib/utils';

const RUNS_ON_OPTIONS = [
  'ubuntu-latest', 'ubuntu-22.04', 'ubuntu-20.04', 'windows-latest', 'macos-latest',
];

type JobType = 'shell' | 'node' | 'python';

const JOB_TYPES: { value: JobType; label: string; icon: string; description: string; language: string }[] = [
  { value: 'shell', label: 'Shell Script', icon: '>_', description: 'Bash / shell commands', language: 'bash' },
  { value: 'node', label: 'Node.js Script', icon: 'JS', description: 'JavaScript with Node.js 20', language: 'javascript' },
  { value: 'python', label: 'Python Script', icon: 'Py', description: 'Python 3 script', language: 'python' },
];

interface Job {
  id: string;
  name: string;
  description: string;
  schedule: string;
  command: string;
  workflow_yaml: string;
  runs_on: string;
  job_type: string;
  enabled: number;
  created_at: string;
  updated_at: string;
  last_triggered: string | null;
  workflow_file: string | null;
}

interface RunStep {
  number: number;
  name: string;
  status: string;
  conclusion: string | null;
}

interface RunJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  steps: RunStep[];
}

interface GithubRun {
  id: number;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  jobs: RunJob[];
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [githubRuns, setGithubRuns] = useState<GithubRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [tab, setTab] = useState<'details' | 'yaml' | 'runs'>('details');
  const [polling, setPolling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedRun, setExpandedRun] = useState<number | null>(null);
  const [logState, setLogState] = useState<{ jobId: number; text: string | null; loading: boolean } | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('');
  const [command, setCommand] = useState('');
  const [runsOn, setRunsOn] = useState('ubuntu-latest');
  const [jobType, setJobType] = useState<JobType>('shell');

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${id}/runs`);
      if (res.ok) {
        const data = await res.json();
        const runs: GithubRun[] = data.githubRuns ?? [];
        setGithubRuns(runs);
        setLastUpdated(new Date());

        // Schedule next poll if any run is still active
        const hasActive = runs.some(r => r.status === 'in_progress' || r.status === 'queued');
        setPolling(hasActive);
        if (hasActive) {
          pollRef.current = setTimeout(fetchRuns, 10_000);
        }
      }
    } catch { /* ignore */ }
  }, [id]);

  async function fetchLogs(githubJobId: number) {
    if (logState?.jobId === githubJobId && logState.text !== null) {
      // Toggle off if same job clicked again
      setLogState(null);
      return;
    }
    setLogState({ jobId: githubJobId, text: null, loading: true });
    try {
      const res = await fetch(`/api/logs?jobRunId=${githubJobId}`);
      if (res.ok) {
        const text = await res.text();
        setLogState({ jobId: githubJobId, text, loading: false });
      } else {
        setLogState({ jobId: githubJobId, text: 'Failed to load logs.', loading: false });
      }
    } catch {
      setLogState({ jobId: githubJobId, text: 'Network error.', loading: false });
    }
  }

  useEffect(() => {
    fetchJob();
    fetchRuns();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [id]);

  async function fetchJob() {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) { router.push('/dashboard'); return; }
      const data = await res.json();
      setJob(data.job);
      setName(data.job.name);
      setDescription(data.job.description);
      setSchedule(data.job.schedule);
      setCommand(data.job.command);
      setRunsOn(data.job.runs_on);
      setJobType((data.job.job_type as JobType) ?? 'shell');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, schedule, command, runsOn, jobType }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Save failed'); setSaving(false); return; }
      setJob(data.job);
      showToast('Job saved!', 'success');
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTrigger() {
    setTriggering(true);
    try {
      const res = await fetch(`/api/jobs/${id}/trigger`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('Job triggered! Checking status…', 'success');
        fetchJob();
        setTab('runs');
        setPolling(true);
        pollRef.current = setTimeout(fetchRuns, 5_000);
      } else {
        showToast(data.error ?? 'Trigger failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setTriggering(false);
    }
  }

  async function handleToggle() {
    if (!job) return;
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: job.enabled === 0 }),
      });
      if (res.ok) fetchJob();
    } catch { /* ignore */ }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      if (res.ok) router.push('/dashboard');
      else showToast('Delete failed', 'error');
    } catch {
      showToast('Network error', 'error');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--text-muted)' }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <Link href="/dashboard"
              className="p-2 rounded-lg mt-0.5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold truncate" style={{ color: 'var(--text)' }}>{job.name}</h1>
            <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: job.enabled ? 'rgba(35,134,54,0.2)' : 'var(--surface-2)',
                    color: job.enabled ? 'var(--accent-hover)' : 'var(--text-muted)',
                    border: `1px solid ${job.enabled ? 'var(--accent)' : 'var(--border)'}`,
                  }}>
              {job.enabled ? 'active' : 'paused'}
            </span>
          </div>
          <p className="text-xs mt-1 font-mono" style={{ color: '#79c0ff' }}>
            {job.schedule} · {cronDescription(job.schedule)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleTrigger}
            disabled={triggering || !job.enabled}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {triggering ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
              </svg>
            )}
            Run Now
          </button>

          <button
            onClick={handleToggle}
            className="px-3 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            {job.enabled ? 'Pause' : 'Enable'}
          </button>

          <button
            onClick={() => setConfirmDelete(true)}
            className="px-3 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: '#ff7b72' }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit"
           style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {(['details', 'yaml', 'runs'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors"
            style={{
              background: tab === t ? 'var(--surface-2)' : 'transparent',
              color: tab === t ? 'var(--text)' : 'var(--text-muted)',
              border: tab === t ? '1px solid var(--border)' : '1px solid transparent',
            }}
          >
            {t === 'yaml' ? 'Workflow YAML' : t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'runs' && polling && (
              <span className="ml-1.5 inline-block w-2 h-2 rounded-full animate-pulse align-middle"
                    style={{ background: 'var(--warning)' }} />
            )}
          </button>
        ))}
      </div>

      {/* Details tab */}
      {tab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleSave} className="lg:col-span-2 space-y-5">
            <section className="rounded-xl p-5 space-y-4"
                     style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Job Details</h2>

              <Field label="Name" required>
                <input value={name} onChange={e => setName(e.target.value)} required
                       className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                       style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </Field>

              <Field label="Description">
                <input value={description} onChange={e => setDescription(e.target.value)}
                       className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                       style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </Field>

              <Field label="Job Type">
                <div className="grid grid-cols-3 gap-2">
                  {JOB_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setJobType(type.value)}
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
                <select value={runsOn} onChange={e => setRunsOn(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  {RUNS_ON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
            </section>

            <section className="rounded-xl p-5"
                     style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Schedule</h2>
              <CronInput value={schedule} onChange={setSchedule} />
            </section>

            <section className="rounded-xl p-5 space-y-3"
                     style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {jobType === 'node' ? 'Node.js Script' : jobType === 'python' ? 'Python Script' : 'Shell Commands'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded"
                      style={{ background: 'var(--surface-2)', color: '#79c0ff', border: '1px solid var(--border)' }}>
                  {JOB_TYPES.find(t => t.value === jobType)?.language ?? 'bash'}
                </span>
              </div>
              <textarea value={command} onChange={e => setCommand(e.target.value)}
                        rows={6} spellCheck={false}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono resize-y"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', lineHeight: 1.6 }} />
            </section>

            {error && (
              <div className="text-sm px-3 py-2 rounded-lg"
                   style={{ background: 'rgba(218,54,51,0.1)', border: '1px solid rgba(218,54,51,0.3)', color: '#ff7b72' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={saving}
                    className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                    style={{ background: 'var(--accent)' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>

          {/* Meta */}
          <div className="space-y-4">
            <div className="rounded-xl p-4 space-y-3"
                 style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Info</p>
              {[
                { label: 'ID', value: job.id },
                { label: 'Type', value: JOB_TYPES.find(t => t.value === job.job_type)?.label ?? job.job_type },
                { label: 'Created', value: formatDate(job.created_at) },
                { label: 'Updated', value: formatDate(job.updated_at) },
                { label: 'Last Triggered', value: formatDate(job.last_triggered) },
                { label: 'Workflow File', value: job.workflow_file ?? '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-xs font-mono break-all mt-0.5" style={{ color: 'var(--text)' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* YAML tab */}
      {tab === 'yaml' && (
        <div className="rounded-xl overflow-hidden"
             style={{ border: '1px solid var(--border)' }}>
          <div className="px-4 py-3 flex items-center justify-between"
               style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {job.workflow_file}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(job.workflow_yaml)}
              className="text-xs px-2 py-1 rounded"
              style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              Copy
            </button>
          </div>
          <pre className="p-4 text-xs font-mono overflow-auto max-h-[70vh]"
               style={{ background: '#0d1117', color: '#e6edf3', lineHeight: 1.6 }}>
            {job.workflow_yaml}
          </pre>
        </div>
      )}

      {/* Runs tab */}
      {tab === 'runs' && (
        <div className="rounded-xl overflow-hidden"
             style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="px-4 py-3 flex items-center justify-between"
               style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Recent GitHub Runs</span>
              {polling && (
                <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--warning)' }}>
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Live
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => { if (pollRef.current) clearTimeout(pollRef.current); fetchRuns(); }}
                className="text-xs px-2 py-1 rounded"
                style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                Refresh
              </button>
            </div>
          </div>

          {githubRuns.length === 0 ? (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No runs found. Trigger the job or wait for the schedule.
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {githubRuns.map(run => (
                <div key={run.id}>
                  {/* Run row */}
                  <button
                    className="w-full px-4 py-3 flex items-center gap-4 text-left hover:opacity-80 transition-opacity"
                    onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                  >
                    <StatusBadge status={run.status} conclusion={run.conclusion} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: 'var(--text)' }}>Run #{run.id}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(run.created_at)}</p>
                    </div>
                    <a href={run.html_url} target="_blank" rel="noopener noreferrer"
                       onClick={e => e.stopPropagation()}
                       className="text-xs px-2 py-1 rounded flex-shrink-0"
                       style={{ background: 'var(--surface-2)', color: '#79c0ff', border: '1px solid var(--border)' }}>
                      View →
                    </a>
                    <svg
                      className={`w-4 h-4 flex-shrink-0 transition-transform ${expandedRun === run.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded: steps */}
                  {expandedRun === run.id && (
                    <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
                      {run.jobs.length === 0 ? (
                        <p className="text-xs pt-3" style={{ color: 'var(--text-muted)' }}>
                          No step data available yet.
                        </p>
                      ) : (
                        run.jobs.map(job => (
                          <div key={job.id} className="mt-3">
                            {/* Job header row */}
                            <div className="flex items-center gap-2 mb-2">
                              <StatusBadge status={job.status} conclusion={job.conclusion} />
                              <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{job.name}</span>
                              {job.started_at && job.completed_at && (
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                  {Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)}s
                                </span>
                              )}
                              <button
                                onClick={() => fetchLogs(job.id)}
                                className="ml-auto text-[10px] px-2 py-0.5 rounded flex items-center gap-1"
                                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: '#79c0ff' }}
                              >
                                {logState?.jobId === job.id && logState.loading ? (
                                  <>
                                    <svg className="w-2.5 h-2.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Loading…
                                  </>
                                ) : logState?.jobId === job.id && logState.text !== null ? 'Hide logs' : 'View logs'}
                              </button>
                            </div>

                            {/* Steps */}
                            <div className="rounded-lg overflow-hidden"
                                 style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                              {job.steps.map((step, i) => (
                                <button
                                  key={step.number}
                                  onClick={() => fetchLogs(job.id)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:opacity-75 transition-opacity"
                                  style={{
                                    borderTop: i > 0 ? '1px solid var(--border)' : undefined,
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <StepIcon status={step.status} conclusion={step.conclusion} />
                                  <span style={{ color: step.status === 'in_progress' ? 'var(--warning)' : 'var(--text)' }}>
                                    {step.name}
                                  </span>
                                  {step.status === 'in_progress' && (
                                    <svg className="w-3 h-3 animate-spin ml-auto" fill="none" viewBox="0 0 24 24"
                                         style={{ color: 'var(--warning)' }}>
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                  )}
                                  {step.status !== 'in_progress' && (
                                    <span className="ml-auto text-[9px] opacity-40">click for logs</span>
                                  )}
                                </button>
                              ))}
                            </div>

                            {/* Log panel */}
                            {logState?.jobId === job.id && logState.text !== null && (
                              <div className="mt-2 rounded-lg overflow-hidden"
                                   style={{ border: '1px solid var(--border)' }}>
                                <div className="flex items-center justify-between px-3 py-1.5"
                                     style={{ background: '#161b22', borderBottom: '1px solid var(--border)' }}>
                                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                                    {job.name} — full log
                                  </span>
                                  <button
                                    onClick={() => setLogState(null)}
                                    className="text-[10px]"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    ✕ close
                                  </button>
                                </div>
                                <pre
                                  className="p-3 text-[11px] font-mono overflow-auto max-h-96 whitespace-pre-wrap break-all"
                                  style={{ background: '#0d1117', color: '#e6edf3', lineHeight: 1.6 }}
                                >
                                  {logState.text}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
             style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-xl p-6 space-y-4"
               style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Delete Job?</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              This will permanently delete the job and remove its workflow file from GitHub.
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-2 rounded-lg text-sm font-medium"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                      className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                      style={{ background: 'var(--danger)' }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-medium shadow-xl z-50"
             style={{
               background: toast.type === 'success' ? 'var(--accent)' : 'var(--danger)',
               color: '#fff',
             }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, conclusion }: { status: string; conclusion: string | null }) {
  let color = 'var(--text-muted)';
  let label = status;

  if (status === 'completed') {
    if (conclusion === 'success') { color = 'var(--accent-hover)'; label = 'success'; }
    else if (conclusion === 'failure') { color = 'var(--danger)'; label = 'failed'; }
    else { label = conclusion ?? 'completed'; }
  } else if (status === 'in_progress') {
    color = 'var(--warning)'; label = 'running';
  } else if (status === 'queued') {
    color = 'var(--info)'; label = 'queued';
  }

  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ color, background: `${color}22`, border: `1px solid ${color}44` }}>
      {label}
    </span>
  );
}

function StepIcon({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === 'in_progress') {
    return (
      <span className="w-3.5 h-3.5 flex-shrink-0 rounded-full border-2 border-current animate-pulse"
            style={{ color: 'var(--warning)' }} />
    );
  }
  if (status === 'completed') {
    if (conclusion === 'success') {
      return (
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"
             style={{ color: 'var(--accent-hover)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      );
    }
    if (conclusion === 'failure' || conclusion === 'cancelled') {
      return (
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"
             style={{ color: 'var(--danger)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18 18 6M6 6l12 12" />
        </svg>
      );
    }
    return (
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"
           style={{ color: 'var(--text-muted)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  }
  // queued / pending
  return (
    <span className="w-3.5 h-3.5 flex-shrink-0 rounded-full border-2"
          style={{ borderColor: 'var(--text-muted)' }} />
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

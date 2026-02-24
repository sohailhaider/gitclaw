'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDate, cronDescription } from '@/lib/utils';

interface Job {
  id: string;
  name: string;
  description: string;
  schedule: string;
  command: string;
  runs_on: string;
  enabled: number;
  created_at: string;
  last_triggered: string | null;
  workflow_file: string | null;
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
      }
    } finally {
      setLoading(false);
    }
  }

  async function triggerJob(job: Job) {
    setTriggering(job.id);
    try {
      const res = await fetch(`/api/jobs/${job.id}/trigger`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(`Job "${job.name}" triggered!`, 'success');
        fetchJobs();
      } else {
        showToast(data.error ?? 'Trigger failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setTriggering(null);
    }
  }

  async function toggleJob(job: Job) {
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: job.enabled === 0 }),
      });
      if (res.ok) fetchJobs();
    } catch { /* ignore */ }
  }

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const activeJobs = jobs.filter(j => j.enabled);
  const disabledJobs = jobs.filter(j => !j.enabled);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Scheduled Jobs</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} total · {activeJobs.length} active
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'var(--accent)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Job
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Jobs', value: jobs.length, color: 'var(--info)' },
          { label: 'Active', value: activeJobs.length, color: 'var(--accent-hover)' },
          { label: 'Paused', value: disabledJobs.length, color: 'var(--text-muted)' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-4"
               style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Job list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Spinner />
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <JobRow
              key={job.id}
              job={job}
              onTrigger={() => triggerJob(job)}
              onToggle={() => toggleJob(job)}
              triggering={triggering === job.id}
            />
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-medium shadow-xl z-50"
          style={{
            background: toast.type === 'success' ? 'var(--accent)' : 'var(--danger)',
            color: '#fff',
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function JobRow({
  job,
  onTrigger,
  onToggle,
  triggering,
}: {
  job: Job;
  onTrigger: () => void;
  onToggle: () => void;
  triggering: boolean;
}) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-4 transition-colors group"
         style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {/* Status dot */}
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
           style={{ background: job.enabled ? 'var(--accent-hover)' : 'var(--text-muted)' }} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link href={`/jobs/${job.id}`}
                className="font-medium text-sm truncate hover:underline"
                style={{ color: 'var(--text)' }}>
            {job.name}
          </Link>
          {!job.enabled && (
            <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              paused
            </span>
          )}
        </div>
        {job.description && (
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {job.description}
          </p>
        )}
        <div className="flex items-center gap-4 mt-1.5">
          <span className="text-xs font-mono" style={{ color: '#79c0ff' }}>{job.schedule}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {cronDescription(job.schedule)}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            runs-on: {job.runs_on}
          </span>
        </div>
      </div>

      {/* Last triggered */}
      <div className="text-right hidden md:block flex-shrink-0">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Last triggered</p>
        <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>
          {formatDate(job.last_triggered)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onTrigger}
          disabled={triggering || !job.enabled}
          title="Run now"
          className="p-2 rounded-lg transition-colors disabled:opacity-40"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          {triggering ? <Spinner small /> : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
          )}
        </button>

        <button
          onClick={onToggle}
          title={job.enabled ? 'Pause' : 'Enable'}
          className="p-2 rounded-lg transition-colors"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          {job.enabled ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
          )}
        </button>

        <Link
          href={`/jobs/${job.id}`}
          title="Edit"
          className="p-2 rounded-lg transition-colors"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
           style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"
             style={{ color: 'var(--text-muted)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </div>
      <h3 className="font-semibold mb-1" style={{ color: 'var(--text)' }}>No jobs yet</h3>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Create your first scheduled GitHub Actions job
      </p>
      <Link href="/jobs/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'var(--accent)' }}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create Job
      </Link>
    </div>
  );
}

function Spinner({ small }: { small?: boolean }) {
  const size = small ? 'w-3.5 h-3.5' : 'w-6 h-6';
  return (
    <svg className={`${size} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

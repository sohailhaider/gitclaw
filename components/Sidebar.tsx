'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface JobStatus {
  id: string;
  name: string;
  status: string | null;
  conclusion: string | null;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStatuses = async () => {
    try {
      const res = await fetch('/api/jobs/statuses');
      if (res.ok) {
        const data = await res.json();
        setJobs(Object.values(data.statuses));
      }
    } catch { /* ignore */ } finally {
      setLoadingJobs(false);
    }
    pollRef.current = setTimeout(fetchStatuses, 30_000);
  };

  useEffect(() => {
    fetchStatuses();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, []);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const hasRunning = jobs.some(j => j.status === 'in_progress' || j.status === 'queued');

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col"
      style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)', minHeight: '100vh' }}
    >
      {/* Logo */}
      <div className="px-4 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                 style={{ color: 'var(--accent-hover)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold leading-none" style={{ color: 'var(--text)' }}>GitClaw</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>GitHub Actions</p>
          </div>
        </Link>
      </div>

      {/* Dashboard link */}
      <div className="px-2 pt-3 pb-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{
            background: isActive('/dashboard') ? 'var(--surface-2)' : 'transparent',
            color: isActive('/dashboard') ? 'var(--text)' : 'var(--text-muted)',
            border: isActive('/dashboard') ? '1px solid var(--border)' : '1px solid transparent',
          }}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
          </svg>
          Dashboard
        </Link>
      </div>

      {/* Jobs section */}
      <div className="px-2 flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Jobs
          </span>
          <div className="flex items-center gap-1.5">
            {hasRunning && (
              <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: 'var(--warning)' }} />
            )}
            <Link
              href="/jobs/new"
              title="New Job"
              className="w-4 h-4 flex items-center justify-center rounded"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Link>
          </div>
        </div>

        {loadingJobs ? (
          <div className="space-y-1 px-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: 'var(--surface-2)' }} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <p className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            No jobs yet.{' '}
            <Link href="/jobs/new" style={{ color: '#79c0ff' }}>Create one →</Link>
          </p>
        ) : (
          <div className="space-y-0.5">
            {jobs.map(job => {
              const active = pathname === `/jobs/${job.id}`;
              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors group"
                  style={{
                    background: active ? 'var(--surface-2)' : 'transparent',
                    border: active ? '1px solid var(--border)' : '1px solid transparent',
                    color: active ? 'var(--text)' : 'var(--text-muted)',
                  }}
                >
                  <StatusDot status={job.status} conclusion={job.conclusion} />
                  <span className="flex-1 truncate text-xs">{job.name}</span>
                  <StatusLabel status={job.status} conclusion={job.conclusion} />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="px-2 py-2" style={{ borderTop: '1px solid var(--border)' }}>
        {[
          {
            href: '/jobs/new',
            label: 'New Job',
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            ),
          },
          {
            href: '/settings',
            label: 'Settings',
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            ),
          },
        ].map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: isActive(href) ? 'var(--surface-2)' : 'transparent',
              color: isActive(href) ? 'var(--text)' : 'var(--text-muted)',
              border: isActive(href) ? '1px solid var(--border)' : '1px solid transparent',
            }}
          >
            {icon}
            {label}
          </Link>
        ))}
      </div>
    </aside>
  );
}

function StatusDot({ status, conclusion }: { status: string | null; conclusion: string | null }) {
  let bg = 'var(--text-muted)';
  let pulse = false;

  if (status === 'in_progress') { bg = 'var(--warning)'; pulse = true; }
  else if (status === 'queued') { bg = '#79c0ff'; pulse = true; }
  else if (status === 'completed') {
    if (conclusion === 'success') bg = 'var(--accent-hover)';
    else if (conclusion === 'failure' || conclusion === 'cancelled') bg = 'var(--danger)';
  }

  return (
    <span
      className={`w-2 h-2 rounded-full flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`}
      style={{ background: bg }}
    />
  );
}

function StatusLabel({ status, conclusion }: { status: string | null; conclusion: string | null }) {
  if (status === 'in_progress') {
    return <span className="text-[9px] font-medium" style={{ color: 'var(--warning)' }}>running</span>;
  }
  if (status === 'queued') {
    return <span className="text-[9px] font-medium" style={{ color: '#79c0ff' }}>queued</span>;
  }
  if (status === 'completed') {
    if (conclusion === 'success') {
      return <span className="text-[9px] font-medium" style={{ color: 'var(--accent-hover)' }}>✓</span>;
    }
    if (conclusion === 'failure') {
      return <span className="text-[9px] font-medium" style={{ color: 'var(--danger)' }}>✗</span>;
    }
  }
  return null;
}

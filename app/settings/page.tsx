'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [token, setToken] = useState('');
  const [tokenSet, setTokenSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [changeToken, setChangeToken] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      setOwner(data.githubOwner ?? '');
      setRepo(data.githubRepo ?? '');
      setTokenSet(data.githubTokenSet ?? false);
      setLoading(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubToken: token, githubOwner: owner, githubRepo: repo }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Save failed'); setSaving(false); return; }
      setToast('GitHub settings updated!');
      setTokenSet(true);
      setToken('');
      setChangeToken(false);
      setTimeout(() => setToast(null), 3000);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--text-muted)' }}>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard"
              className="p-2 rounded-lg"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Settings</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Manage your dashboard configuration</p>
        </div>
      </div>

      {/* GitHub Settings */}
      <form onSubmit={handleSave}
            className="rounded-xl p-6 space-y-5 mb-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"
               style={{ color: 'var(--text)' }}>
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>GitHub Configuration</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Owner / Organization
            </label>
            <input value={owner} onChange={e => setOwner(e.target.value)} required
                   className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                   style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Repository
            </label>
            <input value={repo} onChange={e => setRepo(e.target.value)} required
                   className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                   style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
        </div>

        {/* Token section */}
        {tokenSet && !changeToken ? (
          <div className="flex items-center justify-between p-3 rounded-lg"
               style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                   style={{ color: 'var(--accent-hover)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <span className="text-sm" style={{ color: 'var(--text)' }}>GitHub token configured</span>
            </div>
            <button type="button" onClick={() => setChangeToken(true)}
                    className="text-xs" style={{ color: 'var(--info)' }}>
              Change token
            </button>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Personal Access Token {tokenSet && '(new value)'}
            </label>
            <input type="password" value={token} onChange={e => setToken(e.target.value)}
                   required={!tokenSet}
                   placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                   className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
                   style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Needs <code>repo</code> + <code>workflow</code> scopes
            </p>
          </div>
        )}

        {error && (
          <div className="text-sm px-3 py-2 rounded-lg"
               style={{ background: 'rgba(218,54,51,0.1)', border: '1px solid rgba(218,54,51,0.3)', color: '#ff7b72' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={saving}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'var(--accent)' }}>
          {saving ? 'Saving…' : 'Save GitHub Settings'}
        </button>
      </form>

      {/* Session */}
      <div className="rounded-xl p-6"
           style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Session</h2>
        <button onClick={handleLogout}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'rgba(218,54,51,0.1)', border: '1px solid rgba(218,54,51,0.3)', color: '#ff7b72' }}>
          Sign Out
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-medium shadow-xl z-50"
             style={{ background: 'var(--accent)', color: '#fff' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

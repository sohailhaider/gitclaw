'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'admin' | 'github'>('admin');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [token, setToken] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (step === 'admin') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match.');
        return;
      }
      setStep('github');
      return;
    }

    // Final submission
    if (!token || !owner || !repo) {
      setError('All GitHub fields are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, githubToken: token, githubOwner: owner, githubRepo: repo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Setup failed');
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
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4"
               style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                 style={{ color: 'var(--accent-hover)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            GHA Scheduler
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            First-time setup — configure your dashboard
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          <StepBadge n={1} label="Admin password" active={step === 'admin'} done={step === 'github'} />
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <StepBadge n={2} label="GitHub" active={step === 'github'} done={false} />
        </div>

        <form onSubmit={handleSubmit}
              className="rounded-xl p-6 space-y-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

          {step === 'admin' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                  Admin Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    className="w-full px-3 py-2 pr-10 rounded-lg text-sm outline-none"
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2"
                          style={{ color: 'var(--text-muted)' }}>
                    {showPass ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                  Confirm Password
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                />
              </div>
            </>
          )}

          {step === 'github' && (
            <>
              <div className="p-3 rounded-lg text-sm"
                   style={{ background: 'rgba(31,111,235,0.1)', border: '1px solid rgba(31,111,235,0.3)', color: '#79c0ff' }}>
                <strong>GitHub Personal Access Token</strong> needs <code>repo</code> and{' '}
                <code>workflow</code> scopes to create and trigger workflow files.
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                  Personal Access Token
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  required
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                    Owner / Org
                  </label>
                  <input
                    type="text"
                    value={owner}
                    onChange={e => setOwner(e.target.value)}
                    placeholder="acme-corp"
                    required
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                    Repository
                  </label>
                  <input
                    type="text"
                    value={repo}
                    onChange={e => setRepo(e.target.value)}
                    placeholder="my-repo"
                    required
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                  />
                </div>
              </div>

              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Workflows will be committed to{' '}
                <code style={{ color: '#79c0ff' }}>
                  {owner || 'owner'}/{repo || 'repo'}/.github/workflows/
                </code>
              </p>
            </>
          )}

          {error && (
            <div className="text-sm px-3 py-2 rounded-lg"
                 style={{ background: 'rgba(218,54,51,0.1)', border: '1px solid rgba(218,54,51,0.3)', color: '#ff7b72' }}>
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            {step === 'github' && (
              <button type="button" onClick={() => { setStep('admin'); setError(''); }}
                      className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: loading ? 'var(--accent)' : 'var(--accent)', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Setting up…' : step === 'admin' ? 'Continue →' : 'Complete Setup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StepBadge({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
           style={{
             background: done ? 'var(--accent)' : active ? 'var(--info)' : 'var(--surface-2)',
             color: done || active ? '#fff' : 'var(--text-muted)',
             border: `1px solid ${done ? 'var(--accent)' : active ? 'var(--info)' : 'var(--border)'}`,
           }}>
        {done ? '✓' : n}
      </div>
      <span className="text-xs hidden sm:block"
            style={{ color: active ? 'var(--text)' : 'var(--text-muted)' }}>
        {label}
      </span>
    </div>
  );
}

function Eye() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

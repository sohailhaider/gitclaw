'use client';

import { useState, useEffect } from 'react';
import { cronDescription } from '@/lib/utils';

interface CronInputProps {
  value: string;
  onChange: (value: string) => void;
}

const FIELDS = [
  { label: 'Minute',     placeholder: '0',  hint: '0-59' },
  { label: 'Hour',       placeholder: '0',  hint: '0-23' },
  { label: 'Day (month)',placeholder: '*',  hint: '1-31' },
  { label: 'Month',      placeholder: '*',  hint: '1-12' },
  { label: 'Day (week)', placeholder: '*',  hint: '0-7' },
];

export default function CronInput({ value, onChange }: CronInputProps) {
  const [parts, setParts] = useState(['0', '0', '*', '*', '*']);
  const [rawMode, setRawMode] = useState(false);
  const [rawValue, setRawValue] = useState(value);

  useEffect(() => {
    const split = value.trim().split(/\s+/);
    if (split.length === 5) {
      setParts(split);
      setRawValue(value);
    }
  }, [value]);

  function updatePart(index: number, val: string) {
    const next = [...parts];
    next[index] = val || '*';
    setParts(next);
    const expr = next.join(' ');
    setRawValue(expr);
    onChange(expr);
  }

  function handleRawChange(val: string) {
    setRawValue(val);
    onChange(val);
    const split = val.trim().split(/\s+/);
    if (split.length === 5) setParts(split);
  }

  const description = cronDescription(rawValue || value);
  const isValid = rawValue.trim().split(/\s+/).length === 5;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Cron Expression</span>
        <button
          type="button"
          onClick={() => setRawMode(!rawMode)}
          className="text-xs"
          style={{ color: 'var(--info)' }}
        >
          {rawMode ? 'Visual editor' : 'Raw input'}
        </button>
      </div>

      {rawMode ? (
        <input
          type="text"
          value={rawValue}
          onChange={e => handleRawChange(e.target.value)}
          placeholder="0 0 * * *"
          className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none"
          style={{
            background: 'var(--surface-2)',
            border: `1px solid ${isValid ? 'var(--border)' : 'var(--danger)'}`,
            color: 'var(--text)',
          }}
        />
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {FIELDS.map((field, i) => (
            <div key={field.label}>
              <label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
                {field.label}
              </label>
              <input
                type="text"
                value={parts[i] ?? '*'}
                onChange={e => updatePart(i, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-2 py-1.5 rounded-lg text-xs font-mono text-center outline-none"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
              <p className="text-[10px] text-center mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {field.hint}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
           style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <code className="text-xs font-mono flex-shrink-0" style={{ color: '#79c0ff' }}>
          {rawValue || value}
        </code>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→ {description}</span>
      </div>
    </div>
  );
}

import { nanoid } from 'nanoid';

export function generateId(): string {
  return nanoid(10);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function cronDescription(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;
  const [minute, hour, dom, month, dow] = parts;

  // Simple, common patterns
  if (expr === '* * * * *') return 'Every minute';
  if (minute === '0' && hour === '*' && dom === '*' && month === '*' && dow === '*')
    return 'Every hour';
  if (minute === '0' && dom === '*' && month === '*' && dow === '*')
    return `Every day at ${hour.padStart(2, '0')}:00 UTC`;
  if (minute !== '*' && hour !== '*' && dom === '*' && month === '*' && dow === '*')
    return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} UTC`;
  if (dow !== '*')
    return `Weekly (${dow}) at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} UTC`;
  if (dom !== '*')
    return `Monthly on day ${dom} at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} UTC`;

  return expr;
}

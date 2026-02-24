import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GHA Scheduler — GitHub Actions Job Manager',
  description: 'Manage and schedule jobs running on GitHub Actions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

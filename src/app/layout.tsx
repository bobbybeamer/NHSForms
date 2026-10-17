import type { Metadata } from 'next';
import './globals.css';
import { UserProvider } from './UserContext';
import Header from './Header';
import { describeDatabase, isRunningOnVercel } from '@/lib/dbTarget';

export const metadata: Metadata = {
  title: 'NHS Procurement Forms',
  description: 'NHS SFI Waiver and Procurement Forms Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Off Vercel, show which database this copy of the app is using.
  const localDb = isRunningOnVercel() ? null : describeDatabase(process.env.DATABASE_URL);

  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        {/* Demo-only safeguard: always visible on every page, deliberately not dismissable. */}
        <div
          role="note"
          aria-label="Prototype notice"
          className="bg-[#FFEB3B] text-black border-b-2 border-black px-4 py-2 text-center text-sm font-bold"
        >
          PROTOTYPE — demo only. Do not enter real patient or procurement data.
        </div>
        {localDb && (
          <div
            role="note"
            aria-label="Local development database"
            className="bg-gray-900 text-white px-4 py-1.5 text-center text-xs font-medium"
          >
            LOCAL DEVELOPMENT — using your local database ({localDb.label}). Nothing here affects the hosted demo.
          </div>
        )}
        <UserProvider>
          <Header />
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        </UserProvider>
      </body>
    </html>
  );
}

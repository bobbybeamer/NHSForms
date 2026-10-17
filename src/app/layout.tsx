import type { Metadata } from 'next';
import './globals.css';
import { UserProvider } from './UserContext';
import Header from './Header';

export const metadata: Metadata = {
  title: 'NHS Procurement Forms',
  description: 'NHS SFI Waiver and Procurement Forms Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <UserProvider>
          <Header />
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        </UserProvider>
      </body>
    </html>
  );
}

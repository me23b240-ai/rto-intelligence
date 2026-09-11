// app/layout.tsx
import "./globals.css";
import { SettingsProvider } from "@/lib/settings-context";

export const metadata = { title: "Meesho Logistics System", description: "Recover failed deliveries at the lowest fair cost." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}
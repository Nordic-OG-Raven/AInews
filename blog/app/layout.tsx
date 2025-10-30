import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Brain } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI News Digest | Nordic Raven Solutions",
  description: "Curated AI/ML news digests powered by multi-agent systems. ML Monday, Business Wednesday, Ethics Friday, Data Saturday.",
  openGraph: {
    title: "AI News Digest | Nordic Raven Solutions",
    description: "Curated AI/ML news digests powered by multi-agent systems",
    url: "https://ainewsblog.jonashaahr.com",
    siteName: "AI News Digest",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="border-b">
            <div className="container mx-auto px-4 py-4">
              <nav className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 text-xl font-bold">
                  <Brain className="h-6 w-6" />
                  <span>AI News Digest</span>
                </Link>
                <div className="flex items-center gap-6">
                  <Link href="/about" className="hover:underline">
                    About
                  </Link>
                  <Link href="/mas-workflow" className="hover:underline">
                    How It Works
                  </Link>
                  <Link href="/rss.xml" className="hover:underline">
                    RSS
                  </Link>
                </div>
              </nav>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t mt-12">
            <div className="container mx-auto px-4 py-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="font-bold mb-2">AI News Digest</h3>
                  <p className="text-sm text-muted-foreground">
                    Curated AI/ML news powered by advanced multi-agent systems.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold mb-2">Schedule</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Monday: ML Engineering</li>
                    <li>Wednesday: Business & Industry</li>
                    <li>Friday: Ethics & Policy</li>
                    <li>Saturday: Data Science</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold mb-2">Links</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      <a href="https://www.linkedin.com/company/nordic-raven-solutions" target="_blank" rel="noopener noreferrer" className="hover:underline">
                        LinkedIn
                      </a>
                    </li>
                    <li>
                      <Link href="/privacy" className="hover:underline">
                        Privacy Policy
                      </Link>
                    </li>
                    <li>
                      <Link href="/admin" className="hover:underline">
                        Admin
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
                © {new Date().getFullYear()} Nordic Raven Solutions. All rights reserved.
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  Disc3,
  ArrowLeft,
  Shield,
  Database,
  Cookie,
  Server,
  UserCheck,
  Lock,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — Music Player",
  description:
    "Learn exactly what data Music Player collects, how it is stored in Appwrite, and how you control your account and albums.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "November 17, 2026";

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-100">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#09090B]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <Disc3 className="w-5 h-5 text-emerald-400 group-hover:rotate-45 transition-transform duration-300" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Music Player
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/terms"
              className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-12">
        {/* Hero Banner */}
        <div className="rounded-3xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-10 mb-8 shadow-2xl relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 bg-emerald-500/10 blur-[100px] rounded-full"
          />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono text-emerald-400 mb-4">
              <Shield className="w-3.5 h-3.5" />
              DATA & PRIVACY
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Last updated: <span className="text-zinc-200">{lastUpdated}</span>
            </p>
            <p className="mt-4 text-sm text-zinc-300 leading-relaxed">
              This Privacy Policy explains transparently what information{" "}
              <strong>Music Player</strong> collects, what we store in our
              Appwrite backend, what is discarded immediately after processing,
              and how you can update or delete your data at any time.
            </p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
          {/* 1. What We Store in Appwrite */}
          <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-emerald-400 shrink-0" />
              <h2 className="text-lg font-bold text-white">
                1. Information We Collect & Store
              </h2>
            </div>
            <p>
              We use <strong>Appwrite</strong> as our backend infrastructure
              provider. We only store the minimum data required to run the
              platform across three services:
            </p>

            <div className="grid sm:grid-cols-3 gap-4 pt-1">
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
                <p className="text-xs font-mono uppercase text-emerald-400 mb-1.5">
                  Appwrite Auth
                </p>
                <p className="text-xs text-zinc-300 font-semibold mb-1">
                  Account Credentials
                </p>
                <p className="text-xs text-zinc-400">
                  Stores your unique User ID, username (display name), email
                  address, email verification status, and securely hashed
                  password. We never store plain-text passwords.
                </p>
              </div>

              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
                <p className="text-xs font-mono uppercase text-emerald-400 mb-1.5">
                  Albums Table
                </p>
                <p className="text-xs text-zinc-300 font-semibold mb-1">
                  Album Metadata
                </p>
                <p className="text-xs text-zinc-400">
                  Stores each album&apos;s unique UUID, title, artist list,
                  ordered array of song IDs, visibility flag (
                  <code>private</code> boolean), and your creator User ID.
                </p>
              </div>

              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
                <p className="text-xs font-mono uppercase text-emerald-400 mb-1.5">
                  Songs & Storage
                </p>
                <p className="text-xs text-zinc-300 font-semibold mb-1">
                  Audio & Track Index
                </p>
                <p className="text-xs text-zinc-400">
                  Stores the MP3 file (up to 5 MB) in our Appwrite Storage
                  bucket along with the song title, artist array, and{" "}
                  <code>storageID</code> reference in the songs table.
                </p>
              </div>
            </div>
          </section>

          {/* 2. What We Do NOT Store */}
          <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-emerald-400 shrink-0" />
              <h2 className="text-lg font-bold text-white">
                2. Temporary Processing & What We Do Not Store
              </h2>
            </div>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
              <li>
                <strong className="text-zinc-200">
                  Temporary Upload & yt-dlp Files:
                </strong>{" "}
                When you add a new song via URL or MP3 upload, the audio file is
                temporarily written to the server&apos;s OS temp directory
                solely to verify its size (&le; 5 MB) and run our virus and
                magic-byte security scan. The temporary server file is deleted
                immediately after the scan and Appwrite upload complete.
              </li>
              <li>
                <strong className="text-zinc-200">
                  Payment Card Information:
                </strong>{" "}
                If you make a voluntary donation via our Stripe link, your
                payment details are entered directly on Stripe Checkout. Music
                Player never sees, processes, or stores your credit card or bank
                details.
              </li>
              <li>
                <strong className="text-zinc-200">Search Queries:</strong>{" "}
                Searches for songs, albums, creators, or UUIDs are processed in
                real time to return matching records and are not logged to a
                personal search history profile.
              </li>
            </ul>
          </section>

          {/* 3. Cookies & Local Session Storage */}
          <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <Cookie className="w-5 h-5 text-emerald-400 shrink-0" />
              <h2 className="text-lg font-bold text-white">
                3. Cookies & Session Management
              </h2>
            </div>
            <p>
              We do not use third-party advertising or cross-site tracking
              cookies. We only use essential authentication storage:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
              <li>
                <strong className="text-zinc-200">
                  <code>appwrite-session</code> Cookie:
                </strong>{" "}
                An <code>httpOnly</code>, <code>sameSite=strict</code> session
                cookie set upon sign-in so our server routes can authenticate
                your requests when you update your account or delete data.
              </li>
              <li>
                <strong className="text-zinc-200">
                  Appwrite Client Session:
                </strong>{" "}
                Maintains your active login state in the browser so you can
                manage your albums and settings seamlessly. Logging out
                immediately invalidates this session.
              </li>
            </ul>
          </section>

          {/* 4. Public vs. Private Visibility */}
          <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 space-y-3">
            <h2 className="text-lg font-bold text-white">
              4. Public vs. Private Album Visibility
            </h2>
            <p className="text-zinc-400">
              When you create an album, you control its privacy setting:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
              <li>
                If an album is set to{" "}
                <strong className="text-zinc-200">Public</strong>, its title,
                artist list, tracklist, UUID, and your creator username are
                visible to anyone who searches the platform or opens the album
                link.
              </li>
              <li>
                If an album is set to{" "}
                <strong className="text-zinc-200">Private</strong>, our API
                filters it out of public search results and blocks direct access
                to its UUID unless the requester is authenticated as the
                album&apos;s creator.
              </li>
            </ul>
          </section>

          {/* 5. Third-Party Services */}
          <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <Server className="w-5 h-5 text-emerald-400 shrink-0" />
              <h2 className="text-lg font-bold text-white">
                5. Third-Party Services Used
              </h2>
            </div>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
              <li>
                <strong className="text-zinc-200">Appwrite:</strong> Cloud
                authentication, database tables, file storage, and transactional
                verification/recovery emails.
              </li>
              <li>
                <strong className="text-zinc-200">Google reCAPTCHA:</strong>{" "}
                Used on sign-up, sign-in, password reset, album deletion, and
                account deletion forms to protect the site from automated bots.
                Use of reCAPTCHA is subject to Google&apos;s Privacy Policy and
                Terms of Use.
              </li>
              <li>
                <strong className="text-zinc-200">
                  VirusTotal / Antivirus Scanning:
                </strong>{" "}
                Uploaded audio file SHA-256 hashes may be checked against
                VirusTotal to verify that files are free of malware.
              </li>
              <li>
                <strong className="text-zinc-200">YouTube Embeds:</strong> The
                home page embeds a YouTube tutorial video player.
              </li>
              <li>
                <strong className="text-zinc-200">Stripe:</strong> Handles
                optional one-time donations via external checkout links.
              </li>
            </ul>
          </section>

          {/* 6. Your Control & Account Deletion */}
          <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <h2 className="text-lg font-bold text-white">
                6. Your Data Rights & Deletion Choices
              </h2>
            </div>
            <p>
              You have direct, self-service control over your data at all times:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
              <li>
                <strong className="text-zinc-200">Update Credentials:</strong>{" "}
                You can update your username, email address, or password at any
                time from the{" "}
                <Link
                  href="/settings"
                  className="text-emerald-400 hover:underline"
                >
                  Settings
                </Link>{" "}
                page.
              </li>
              <li>
                <strong className="text-zinc-200">
                  Manage or Delete Albums:
                </strong>{" "}
                You can switch any of your albums between Public and Private,
                modify their tracks, or permanently delete individual albums
                from the{" "}
                <Link
                  href="/my-albums"
                  className="text-emerald-400 hover:underline"
                >
                  My Albums
                </Link>{" "}
                page.
              </li>
              <li>
                <strong className="text-zinc-200">Delete Your Account:</strong>{" "}
                When you delete your account in Settings, your Appwrite Auth
                record and session cookies are permanently erased. You can
                choose whether to leave your created albums behind (default) or
                have our server automatically delete every album you created
                along with your account.
              </li>
            </ul>
          </section>
        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-zinc-800/80 bg-[#09090B] mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Disc3 className="w-4 h-4 text-emerald-400" />
            <span>© 2026 Music Player. All rights reserved.</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-zinc-400">
            <Link
              href="/terms"
              className="hover:text-emerald-400 transition-colors"
            >
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-emerald-400 font-medium">
              Privacy Policy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

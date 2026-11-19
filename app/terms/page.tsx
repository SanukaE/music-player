import type { Metadata } from "next";
import Link from "next/link";
import {
  Disc3,
  ArrowLeft,
  Scale,
  Music,
  ShieldCheck,
  Heart,
  Trash2,
  AlertTriangle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service — Music Player",
  description:
    "Terms of Service governing account creation, audio uploads, album UUID sharing, and platform usage on Music Player.",
};

export default function TermsOfServicePage() {
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
              href="/privacy"
              className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              Privacy Policy
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
              <Scale className="w-3.5 h-3.5" />
              LEGAL AGREEMENT
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Terms of Service
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Last updated: <span className="text-zinc-200">{lastUpdated}</span>
            </p>
            <p className="mt-4 text-sm text-zinc-300 leading-relaxed">
              Welcome to <strong>Music Player</strong>. By registering an
              account, searching our catalog, uploading audio tracks, or
              creating and sharing albums via UUID, you agree to be bound by
              these Terms of Service.
            </p>
          </div>
        </div>

        {/* Terms Sections */}
        <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
          {/* 1. Accounts & Security */}
          <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 space-y-3">
            <h2 className="text-lg font-bold text-white">
              1. Account Registration & Security
            </h2>
            <p>
              To create albums or upload new songs to our servers, you must
              register an account with a unique username, a valid email address,
              and a password. You are responsible for maintaining the
              confidentiality of your login credentials and for all activity
              that occurs under your account.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
              <li>
                Sensitive account changes (updating your username, email
                address, or password, or deleting your account) require
                re-verifying your current password.
              </li>
              <li>
                Automated bot protection via Google reCAPTCHA is enforced on
                account registration, sign-in, password recovery, album
                deletion, and account deletion. Attempting to bypass or automate
                these checks is strictly prohibited.
              </li>
            </ul>
          </section>

          {/* 2. Song Uploads & Shared Audio Library */}
          <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <Music className="w-5 h-5 text-emerald-400 shrink-0" />
              <h2 className="text-lg font-bold text-white">
                2. Song Uploads, URLs & Shared Server Library
              </h2>
            </div>
            <p>
              Music Player maintains a centralized audio database and storage
              bucket powered by Appwrite so songs do not need to be uploaded
              multiple times. When adding a song that is not yet in our library,
              you may either upload an <code>.mp3</code> file directly or
              provide a source URL (processed server-side via{" "}
              <code>yt-dlp</code>).
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
              <li>
                <strong className="text-zinc-200">File Restrictions:</strong>{" "}
                All uploaded or extracted audio files must be genuine MP3 audio
                files and may not exceed <strong>5 MB</strong> per track.
              </li>
              <li>
                <strong className="text-zinc-200">
                  Shared Catalog Availability:
                </strong>{" "}
                Once a song is uploaded to our Appwrite storage bucket and
                indexed in the songs table (with its title and artist metadata),
                it becomes part of the searchable server catalog so other users
                can preview and include it in their own albums.
              </li>
              <li>
                <strong className="text-zinc-200">
                  Rights & Responsibility:
                </strong>{" "}
                You represent and warrant that you have the necessary rights or
                permission to upload or submit any audio file or URL you add to
                the platform, and that your submissions do not infringe upon any
                third-party intellectual property rights.
              </li>
            </ul>
          </section>

          {/* 3. Virus Scanning & Prohibited Content */}
          <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <h2 className="text-lg font-bold text-white">
                3. Security Scanning & Prohibited Conduct
              </h2>
            </div>
            <p>
              Every file uploaded directly or downloaded via URL undergoes
              automated security and magic-byte inspection (including executable
              header rejection and antivirus signature checks) before being
              saved to Appwrite Storage.
            </p>
            <p className="text-zinc-400">
              You agree not to upload disguised executables (e.g., PE/EXE, ELF,
              Mach-O binaries, shell scripts), malware, corrupted payloads, or
              any content designed to disrupt our servers, Appwrite
              infrastructure, or other listeners&apos; devices.
            </p>
          </section>

          {/* 4. Albums, Visibility & UUID Sharing */}
          <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 space-y-3">
            <h2 className="text-lg font-bold text-white">
              4. Albums, UUIDs & Visibility Settings
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
              <li>
                <strong className="text-zinc-200">Track Limit:</strong> Each
                album may contain between <strong>1 and 25 songs</strong>.
              </li>
              <li>
                <strong className="text-zinc-200">
                  Public Albums (Default):
                </strong>{" "}
                Public albums appear in the community search directory and can
                be played or looked up by anyone using the album title, artist,
                creator username, or unique Album UUID (including physical NFC
                tags encoded with the UUID).
              </li>
              <li>
                <strong className="text-zinc-200">Private Albums:</strong>{" "}
                Private albums are hidden from public search results and can
                only be viewed, played, or edited when signed into the creator
                account that owns them.
              </li>
              <li>
                <strong className="text-zinc-200">No Monetization:</strong>{" "}
                Music Player is a free community curation and playback tool.
                Users do not earn monetary payouts from creating, sharing, or
                streaming albums.
              </li>
            </ul>
          </section>

          {/* 5. Voluntary Donations */}
          <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <Heart className="w-5 h-5 text-emerald-400 shrink-0" />
              <h2 className="text-lg font-bold text-white">
                5. Voluntary One-Time Donations (Stripe)
              </h2>
            </div>
            <p>
              Users may optionally support Music Player&apos;s server and
              storage costs via one-time donations processed through{" "}
              <strong>Stripe Checkout</strong>. Donations are completely
              voluntary, do not unlock gated features or ownership rights, and
              are generally non-refundable once processed unless required by
              applicable consumer law.
            </p>
          </section>

          {/* 6. Account Deletion & Album Retention */}
          <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <h2 className="text-lg font-bold text-white">
                6. Account Deletion & Album Retention Options
              </h2>
            </div>
            <p>
              You may permanently delete your account at any time from your{" "}
              <Link
                href="/settings"
                className="text-emerald-400 hover:underline"
              >
                Settings
              </Link>{" "}
              page. When deleting your account, we provide two explicit options
              for your created albums:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-zinc-400">
              <li>
                <strong className="text-zinc-200">
                  Leave Albums Behind (Default):
                </strong>{" "}
                Your personal account is permanently removed, but your created
                albums and their UUIDs remain active on the platform so existing
                links and NFC tags continue to work. Because your account no
                longer exists, you will no longer be able to edit or delete
                those albums later.
              </li>
              <li>
                <strong className="text-zinc-200">
                  Delete All Albums With Account:
                </strong>{" "}
                Every album record you created is permanently deleted from our
                database alongside your account.
              </li>
            </ol>
          </section>

          {/* 7. Disclaimer & Limitation of Liability */}
          <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <h2 className="text-lg font-bold text-white">
                7. Service Availability & Disclaimer of Warranties
              </h2>
            </div>
            <p className="text-zinc-400">
              Music Player is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS
              AVAILABLE&rdquo; basis without warranties of any kind. We reserve
              the right to remove any song, album, or account that violates
              these Terms, exceeds storage limits, or poses a security or
              copyright risk, without prior notice.
            </p>
          </section>
        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-zinc-800/80 bg-[#09090B] mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Disc3 className="w-4 h-4 text-emerald-400" />
            <span>
              © {new Date().getFullYear()} Music Player. All rights reserved.
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-zinc-400">
            <Link href="/terms" className="text-emerald-400 font-medium">
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="hover:text-emerald-400 transition-colors"
            >
              Privacy Policy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

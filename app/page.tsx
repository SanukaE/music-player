"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { account } from "@/lib/appwrite";
import {
  Search,
  Disc3,
  Plus,
  Image as ImageIcon,
  Lock,
  Globe,
  Link2,
  Play,
  Sparkles,
  ArrowRight,
  Music,
  User,
  ChevronDown,
  Library,
  Settings,
  LogOut,
  X,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

type SearchFilter = "All" | "Song" | "Album" | "User" | "UUID";

export default function HomePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);

  // Dropdown & Logout Modal states
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<SearchFilter>("All");

  // Check active Appwrite session on load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await account.get();
        setIsLoggedIn(true);
        setUserName(user.name || null);
      } catch {
        setIsLoggedIn(false);
        setUserName(null);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkSession();
  }, []);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
        if (!isLoggingOut) setIsLogoutModalOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLoggingOut]);

  // Frontend Appwrite Logout
  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await account.deleteSession("current");
      setIsLoggedIn(false);
      setUserName(null);
      setIsLogoutModalOpen(false);
      setIsAccountMenuOpen(false);
    } catch (error: any) {
      setLogoutError(error?.message || "Failed to log out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    }
    if (activeFilter !== "All") {
      params.set("filter", activeFilter);
    }
    const queryString = params.toString();
    router.push(queryString ? `/search?${queryString}` : "/search");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-100">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#09090B]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Left */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <Disc3 className="w-5 h-5 text-emerald-400 group-hover:rotate-45 transition-transform duration-300" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Music Player
            </span>
          </Link>

          {/* Actions Right */}
          <div className="flex items-center gap-3">
            {isCheckingAuth ? (
              <div className="flex items-center gap-3">
                <div className="h-9 w-24 rounded-lg bg-zinc-900 animate-pulse" />
                <div className="h-9 w-28 rounded-lg bg-zinc-900 animate-pulse" />
              </div>
            ) : isLoggedIn ? (
              <>
                <Link
                  href="/create-album"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span className="hidden sm:inline">Create Album</span>
                  <span className="sm:hidden">Create</span>
                </Link>

                {/* My Account Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                    aria-expanded={isAccountMenuOpen}
                    aria-haspopup="menu"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-100 font-medium text-sm transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4 text-emerald-400" />
                    <span>My Account</span>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                        isAccountMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isAccountMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-52 rounded-xl bg-[#121215] border border-zinc-800 shadow-2xl py-1.5 z-50"
                    >
                      {userName && (
                        <div className="px-3.5 py-2 border-b border-zinc-800/80 mb-1">
                          <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                            Signed in as
                          </p>
                          <p className="text-sm font-medium text-zinc-200 truncate">
                            {userName}
                          </p>
                        </div>
                      )}

                      <Link
                        href="/my-albums"
                        role="menuitem"
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors"
                      >
                        <Library className="w-4 h-4 text-zinc-400" />
                        My Albums
                      </Link>

                      <Link
                        href="/settings"
                        role="menuitem"
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-zinc-400" />
                        Settings
                      </Link>

                      <div className="my-1.5 border-t border-zinc-800/80" />

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          setLogoutError(null);
                          setIsLogoutModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="inline-flex items-center px-4 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 font-medium text-sm transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]"
                >
                  Start Creating
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ================= HERO & SEARCH ================= */}
        <section className="relative overflow-hidden pt-20 pb-24 sm:pt-28 sm:pb-32 px-4 sm:px-6">
          {/* Subtle Ambient Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[780px] h-[360px] bg-emerald-500/12 blur-[120px] rounded-full"
          />

          <div className="relative max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              Find any track, album, or{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                UUID
              </span>{" "}
              instantly.
            </h1>

            <p className="mt-5 text-base sm:text-lg text-zinc-400 max-w-xl mx-auto">
              Search across songs, community albums, creators, or paste a direct
              album UUID to jump straight into listening.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mt-10 max-w-2xl mx-auto">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/40 to-teal-500/40 rounded-2xl blur opacity-25 group-focus-within:opacity-60 transition duration-300" />
                <div className="relative flex items-center bg-[#121215] border border-zinc-800 group-focus-within:border-emerald-500/60 rounded-2xl p-2 shadow-2xl transition-colors">
                  <Search className="w-5 h-5 text-zinc-500 ml-3 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search song, album, @user, or UUID (e.g. 550e8400-e29b...)"
                    className="w-full bg-transparent px-3.5 py-2.5 text-sm sm:text-base text-white placeholder:text-zinc-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-colors cursor-pointer"
                  >
                    Search
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Chips */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {(
                  ["All", "Song", "Album", "User", "UUID"] as SearchFilter[]
                ).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      activeFilter === filter
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                        : "bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                    } ${filter === "UUID" ? "font-mono" : ""}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </form>
          </div>
        </section>

        {/* ================= 3-STEP GUIDE (STACKED) ================= */}
        <section className="py-20 px-4 sm:px-6 border-t border-zinc-900">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">
                How It Works
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Create an album in 3 simple steps
              </h2>
            </div>

            {/* Vertical Stack (One Below the Other) */}
            <div className="flex flex-col gap-6">
              {/* STEP 1 */}
              <div className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 hover:border-zinc-700 transition-colors">
                <div className="flex-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
                    STEP 01
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    Name your album, pick cover art & set visibility
                  </h3>
                  <p className="mt-2.5 text-zinc-400 text-sm sm:text-base leading-relaxed">
                    Give your collection a title, upload a crisp cover image,
                    and decide whether to keep it{" "}
                    <span className="text-zinc-200 font-medium">Private</span>{" "}
                    for personal listening or{" "}
                    <span className="text-zinc-200 font-medium">Public</span> so
                    anyone can discover it.
                  </p>
                </div>

                {/* Mini UI Preview */}
                <div className="w-full md:w-72 shrink-0 rounded-xl bg-zinc-950 border border-zinc-800 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-dashed border-zinc-700 flex items-center justify-center text-zinc-500">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-zinc-500">Album Title</div>
                      <div className="text-sm font-semibold text-zinc-200 truncate">
                        Late Night Synthwave
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                      <Lock className="w-3.5 h-3.5" /> Private
                    </div>
                    <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-xs font-medium text-emerald-300">
                      <Globe className="w-3.5 h-3.5" /> Public
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 hover:border-zinc-700 transition-colors">
                <div className="flex-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
                    STEP 02
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    Add songs to your album by URL
                  </h3>
                  <p className="mt-2.5 text-zinc-400 text-sm sm:text-base leading-relaxed">
                    No bulky file uploads required. Simply paste a song URL to
                    pull track metadata straight into your album tracklist and
                    arrange the order however you like.
                  </p>
                </div>

                {/* Mini UI Preview */}
                <div className="w-full md:w-72 shrink-0 rounded-xl bg-zinc-950 border border-zinc-800 p-4 space-y-2.5">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400 truncate">
                    <Link2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      https://music.app/track/049a
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60">
                    <div className="flex items-center gap-2 min-w-0">
                      <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-xs text-zinc-200 truncate">
                        01. Midnight Drive
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                      3:42
                    </span>
                  </div>
                </div>
              </div>

              {/* STEP 3 */}
              <div className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 hover:border-zinc-700 transition-colors">
                <div className="flex-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
                    STEP 03
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    Publish to the public
                  </h3>
                  <p className="mt-2.5 text-zinc-400 text-sm sm:text-base leading-relaxed">
                    Hit publish to share it with your friends. Or keep it
                    private for personal listening.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= YOUTUBE VIDEO TUTORIAL ================= */}
        <section className="py-20 px-4 sm:px-6 border-t border-zinc-900 bg-zinc-950/40">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">
                <Play className="w-3.5 h-3.5 fill-emerald-400" />
                Video Walkthrough
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                See how it works in 2 minutes
              </h2>
              <p className="mt-2.5 text-zinc-400 text-sm sm:text-base">
                Watch our quick tutorial on creating & sharing your first album.
              </p>
            </div>

            {/* Responsive 16:9 YouTube Embed */}
            <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-[#121215] shadow-2xl aspect-video">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="Music Player Tutorial"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-zinc-800/80 bg-[#09090B]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
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
            <Link
              href="/privacy"
              className="hover:text-emerald-400 transition-colors"
            >
              Privacy Policy
            </Link>
          </nav>
        </div>
      </footer>

      {/* ================= LOGOUT CONFIRMATION MODAL ================= */}
      {isLogoutModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => !isLoggingOut && setIsLogoutModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-modal-title"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#121215] border border-zinc-800 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-red-400" />
              </div>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setIsLogoutModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2
              id="logout-modal-title"
              className="mt-4 text-xl font-bold text-white"
            >
              Log out of Music Player?
            </h2>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              You will be signed out of your current session. You can sign back
              in anytime to manage your albums and settings.
            </p>

            {logoutError && (
              <div className="mt-4 px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-300">
                {logoutError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm font-medium text-zinc-300 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleConfirmLogout}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Logging out...
                  </>
                ) : (
                  "Yes, log out"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

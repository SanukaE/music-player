"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { account } from "@/lib/appwrite";
import {
  Disc3,
  Search,
  ArrowLeft,
  ArrowUpRight,
  Lock,
  Globe,
  Music,
  User,
  Copy,
  Check,
  Loader2,
  Plus,
} from "lucide-react";

type SearchFilter = "All" | "Album" | "User" | "UUID";

export interface AlbumRecord {
  $id: string;
  title: string;
  artists: string[];
  songs: string[];
  private: boolean;
  creator: string;
  creatorName: string;
  $createdAt: string;
}

function SearchAlbumsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") || "";
  const initialFilter = (searchParams.get("filter") as SearchFilter) || "All";

  // Auth state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAuthResolved, setIsAuthResolved] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<SearchFilter>(
    ["All", "Album", "User", "UUID"].includes(initialFilter)
      ? initialFilter
      : "All",
  );
  const [albums, setAlbums] = useState<AlbumRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 1. Check logged-in user so their own private albums can be included
  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await account.get();
        setCurrentUserId(user.$id);
      } catch {
        setCurrentUserId(null);
      } finally {
        setIsAuthResolved(true);
      }
    };
    checkUser();
  }, []);

  // 2. Fetch albums whenever query, filter, or userId resolves
  useEffect(() => {
    if (!isAuthResolved) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        if (activeFilter) params.set("filter", activeFilter);
        if (currentUserId) params.set("userId", currentUserId);

        const res = await fetch(`/api/albums/search?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setAlbums(data.albums || []);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setAlbums([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, activeFilter, currentUserId, isAuthResolved]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (activeFilter !== "All") params.set("filter", activeFilter);
    router.replace(`/search?${params.toString()}`);
  };

  const handleCopyUuid = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-100">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#09090B]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <Disc3 className="w-5 h-5 text-emerald-400 group-hover:rotate-45 transition-transform duration-300" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Music Player
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {currentUserId && (
              <Link
                href="/create-album"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs sm:text-sm transition-colors"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Create Album
              </Link>
            )}
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Home
            </Link>
          </div>
        </div>
      </header>

      {/* ================= SEARCH BAR SECTION ================= */}
      <section className="relative border-b border-zinc-900 pt-10 pb-8 px-4 sm:px-6 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[680px] h-[260px] bg-emerald-500/10 blur-[120px] rounded-full"
        />

        <div className="relative max-w-4xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">
            Album Directory
          </p>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Explore & Lookup Albums
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Search public community albums (plus your own private albums) by
            title, artist, creator, or UUID.
          </p>

          <form onSubmit={handleSearchSubmit} className="mt-6">
            <div className="relative flex items-center bg-[#121215] border border-zinc-800 focus-within:border-emerald-500/60 rounded-2xl p-2 shadow-xl transition-colors">
              <Search className="w-5 h-5 text-zinc-500 ml-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search album title, artist, @creator, or paste album UUID..."
                className="w-full bg-transparent px-3.5 py-2 text-sm sm:text-base text-white placeholder:text-zinc-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-zinc-500 hover:text-zinc-300 px-2.5 py-1 cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="submit"
                className="shrink-0 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-colors cursor-pointer"
              >
                Search
              </button>
            </div>

            {/* Filter Chips */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              {(["All", "Album", "User", "UUID"] as SearchFilter[]).map(
                (filter) => (
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
                ),
              )}
            </div>
          </form>
        </div>
      </section>

      {/* ================= ALBUM RESULTS GRID ================= */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-400">
            {isLoading
              ? "Searching albums..."
              : `${albums.length} ${
                  albums.length === 1 ? "Album" : "Albums"
                } Found`}
          </h2>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-52 rounded-2xl bg-[#121215] border border-zinc-800/80 p-6 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-5 w-2/3 bg-zinc-800 rounded" />
                  <div className="h-4 w-1/2 bg-zinc-900 rounded" />
                </div>
                <div className="h-8 w-full bg-zinc-900 rounded-xl" />
              </div>
            ))}
          </div>
        ) : albums.length === 0 ? (
          <div className="rounded-2xl bg-[#121215] border border-zinc-800/80 p-12 text-center max-w-lg mx-auto my-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">
              <Disc3 className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white">No albums found</h3>
            <p className="mt-1.5 text-sm text-zinc-400">
              {searchQuery
                ? `No public albums matched "${searchQuery}". Try another keyword or UUID.`
                : "No albums have been published yet."}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {albums.map((album) => {
              const isOwner =
                Boolean(currentUserId) && album.creator === currentUserId;

              return (
                <Link
                  key={album.$id}
                  href={`/album/${album.$id}`}
                  className="group rounded-2xl bg-[#121215] border border-zinc-800/90 hover:border-emerald-500/50 p-6 flex flex-col justify-between transition-all hover:-translate-y-0.5 shadow-lg"
                >
                  <div>
                    {/* Top Row: Icon + Visibility Badge */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                        <Disc3 className="w-5 h-5 text-emerald-400 group-hover:rotate-45 transition-transform duration-300" />
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isOwner && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-300">
                            Yours
                          </span>
                        )}
                        {album.private ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25">
                            <Lock className="w-3 h-3" />
                            Private
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                            <Globe className="w-3 h-3" />
                            Public
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Album Title */}
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                      {album.title}
                    </h3>

                    {/* Artists */}
                    <p className="mt-1 text-xs text-zinc-400 line-clamp-1">
                      {album.artists.length > 0
                        ? album.artists.join(", ")
                        : "Various Artists"}
                    </p>

                    {/* Track Count & Creator */}
                    <div className="mt-4 flex items-center gap-4 text-xs text-zinc-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Music className="w-3.5 h-3.5 text-emerald-400" />
                        {album.songs.length}{" "}
                        {album.songs.length === 1 ? "song" : "songs"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate">{album.creatorName}</span>
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: UUID & Open Indicator */}
                  <div className="mt-5 pt-3.5 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleCopyUuid(e, album.$id)}
                      title="Copy Album UUID"
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer truncate"
                    >
                      {copiedId === album.$id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-emerald-400">Copied UUID</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">UUID: {album.$id}</span>
                        </>
                      )}
                    </button>

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 shrink-0">
                      Open
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
        </div>
      }
    >
      <SearchAlbumsContent />
    </Suspense>
  );
}

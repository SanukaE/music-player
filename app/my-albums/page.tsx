"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReCAPTCHA from "react-google-recaptcha";
import { account } from "@/lib/appwrite";
import {
  Disc3,
  ArrowLeft,
  Plus,
  Search,
  Globe,
  Lock,
  Music,
  Copy,
  Check,
  Settings2,
  Trash2,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";

interface UserAlbum {
  $id: string;
  title: string;
  artists: string[];
  songs: string[];
  private: boolean;
  creator: string;
  $createdAt: string;
}

type VisibilityFilter = "all" | "public" | "private";

export default function MyAlbumsPage() {
  const router = useRouter();

  const [siteKey, setSiteKey] = useState(
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "",
  );

  // Auth & Albums state
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [albums, setAlbums] = useState<UserAlbum[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Manage / Quick Settings Modal state
  const [editingAlbum, setEditingAlbum] = useState<UserAlbum | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editArtists, setEditArtists] = useState<string[]>([]);
  const [editArtistInput, setEditArtistInput] = useState("");
  const [editPrivate, setEditPrivate] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Album Modal + Google reCAPTCHA state
  const [deletingAlbum, setDeletingAlbum] = useState<UserAlbum | null>(null);
  const [deleteCaptchaToken, setDeleteCaptchaToken] = useState<string | null>(
    null,
  );
  const deleteRecaptchaRef = useRef<ReCAPTCHA>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (siteKey) return;
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.recaptchaSiteKey) setSiteKey(data.recaptchaSiteKey);
      })
      .catch(() => {});
  }, [siteKey]);

  // 1. Verify session & load user's albums
  useEffect(() => {
    const init = async () => {
      try {
        const user = await account.get();
        setUserId(user.$id);

        const res = await fetch(
          `/api/albums/mine?userId=${encodeURIComponent(user.$id)}`,
        );
        const data = await res.json();
        if (res.ok) {
          setAlbums(data.albums || []);
        }
      } catch {
        router.replace("/signin");
        return;
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [router]);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!isSavingEdit) setEditingAlbum(null);
        if (!isDeleting) setDeletingAlbum(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSavingEdit, isDeleting]);

  // ================= COPY UUID =================
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // ================= OPEN MANAGE MODAL =================
  const openManageModal = (album: UserAlbum) => {
    setEditingAlbum(album);
    setEditTitle(album.title);
    setEditArtists(album.artists || []);
    setEditArtistInput("");
    setEditPrivate(Boolean(album.private));
    setEditError(null);
  };

  const handleAddArtistTag = () => {
    const trimmed = editArtistInput.trim();
    if (!trimmed) return;
    if (!editArtists.includes(trimmed)) {
      setEditArtists((prev) => [...prev, trimmed]);
    }
    setEditArtistInput("");
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlbum || !userId) return;

    setEditError(null);
    if (!editTitle.trim()) {
      setEditError("Album title cannot be empty.");
      return;
    }

    const finalArtists = [...editArtists];
    if (
      editArtistInput.trim() &&
      !finalArtists.includes(editArtistInput.trim())
    ) {
      finalArtists.push(editArtistInput.trim());
    }

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/albums/${editingAlbum.$id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: editTitle.trim(),
          artists: finalArtists,
          songs: editingAlbum.songs,
          private: editPrivate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Failed to update album.");
        setIsSavingEdit(false);
        return;
      }

      setAlbums((prev) =>
        prev.map((a) =>
          a.$id === editingAlbum.$id
            ? {
                ...a,
                title: editTitle.trim(),
                artists: finalArtists,
                private: editPrivate,
              }
            : a,
        ),
      );
      setEditingAlbum(null);
      setBannerMessage({
        type: "success",
        text: `"${editTitle.trim()}" settings updated successfully.`,
      });
    } catch {
      setEditError("Network error while saving settings.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ================= DELETE ALBUM HANDLER (WITH CAPTCHA) =================
  const openDeleteModal = (album: UserAlbum) => {
    setDeletingAlbum(album);
    setDeleteCaptchaToken(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAlbum || !userId || !deleteCaptchaToken) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/albums/${deletingAlbum.$id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          captchaToken: deleteCaptchaToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete album.");
        deleteRecaptchaRef.current?.reset();
        setDeleteCaptchaToken(null);
        setIsDeleting(false);
        return;
      }

      const deletedTitle = deletingAlbum.title;
      setAlbums((prev) => prev.filter((a) => a.$id !== deletingAlbum.$id));
      setDeletingAlbum(null);
      setBannerMessage({
        type: "success",
        text: `Album "${deletedTitle}" was permanently deleted.`,
      });
    } catch {
      setDeleteError("Network error while deleting album. Please try again.");
      deleteRecaptchaRef.current?.reset();
      setDeleteCaptchaToken(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // ================= FILTERED ALBUMS =================
  const filteredAlbums = albums.filter((album) => {
    if (visibilityFilter === "public" && album.private) return false;
    if (visibilityFilter === "private" && !album.private) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      album.title.toLowerCase().includes(q) ||
      album.$id.toLowerCase().includes(q) ||
      album.artists.join(" ").toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          Loading your albums...
        </div>
      </div>
    );
  }

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
            <Link
              href="/create-album"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Create Album
            </Link>
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

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">
              Creator Library
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              My Albums
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              View, configure visibility, copy UUIDs, or delete the albums
              you&apos;ve created.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="px-3 py-1.5 rounded-lg bg-[#121215] border border-zinc-800">
              Total: <strong className="text-white">{albums.length}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-[#121215] border border-zinc-800">
              Public:{" "}
              <strong className="text-emerald-400">
                {albums.filter((a) => !a.private).length}
              </strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-[#121215] border border-zinc-800">
              Private:{" "}
              <strong className="text-amber-400">
                {albums.filter((a) => a.private).length}
              </strong>
            </span>
          </div>
        </div>

        {/* Status Banner */}
        {bannerMessage && (
          <div
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-xs border ${
              bannerMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                : "bg-red-500/10 border-red-500/25 text-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {bannerMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{bannerMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search & Visibility Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter your albums by title, artist, or UUID..."
              className="w-full rounded-xl bg-[#121215] border border-zinc-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#121215] border border-zinc-800 self-start">
            {(["all", "public", "private"] as VisibilityFilter[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setVisibilityFilter(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  visibilityFilter === tab
                    ? "bg-emerald-500 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Albums Grid */}
        {filteredAlbums.length === 0 ? (
          <div className="rounded-2xl bg-[#121215] border border-zinc-800/80 p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">
              <Disc3 className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white">
              {albums.length === 0
                ? "You haven't created any albums yet"
                : "No matching albums"}
            </h2>
            <p className="mt-1.5 text-sm text-zinc-400">
              {albums.length === 0
                ? "Start curating your favourite songs into a shareable album UUID."
                : "Try clearing your search filter to see all your albums."}
            </p>
            {albums.length === 0 && (
              <Link
                href="/create-album"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-colors"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Create Your First Album
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAlbums.map((album) => (
              <div
                key={album.$id}
                className="rounded-2xl bg-[#121215] border border-zinc-800/90 hover:border-zinc-700 p-6 flex flex-col justify-between transition-all shadow-lg"
              >
                <div>
                  {/* Top Row: Disc Icon + Visibility Badge */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <Link
                      href={`/album/${album.$id}`}
                      className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
                    >
                      <Disc3 className="w-5 h-5 text-emerald-400" />
                    </Link>

                    {album.private ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25">
                        <Lock className="w-3 h-3" />
                        Private
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                        <Globe className="w-3 h-3" />
                        Public
                      </span>
                    )}
                  </div>

                  {/* Title & Artists */}
                  <Link href={`/album/${album.$id}`} className="block group">
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                      {album.title}
                    </h3>
                  </Link>
                  <p className="mt-1 text-xs text-zinc-400 line-clamp-1">
                    {album.artists.length > 0
                      ? album.artists.join(", ")
                      : "Various Artists"}
                  </p>

                  {/* Song Count & Copy UUID */}
                  <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-emerald-400" />
                      {album.songs.length}{" "}
                      {album.songs.length === 1 ? "song" : "songs"}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCopyId(album.$id)}
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                      title="Copy Album UUID"
                    >
                      {copiedId === album.$id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{album.$id.slice(0, 10)}...</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Action Bar: Open Player, Settings, Delete */}
                <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <Link
                    href={`/album/${album.$id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                    Play / Songs
                  </Link>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openManageModal(album)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      title="Album Settings"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      Settings
                    </button>

                    <button
                      type="button"
                      onClick={() => openDeleteModal(album)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                      title="Delete Album"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ================= MANAGE ALBUM SETTINGS MODAL ================= */}
      {editingAlbum && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => !isSavingEdit && setEditingAlbum(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#121215] border border-zinc-800 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                  Manage Album
                </p>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  Album Settings
                </h2>
              </div>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => setEditingAlbum(null)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="mt-5 space-y-5">
              {/* Album Title */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Album Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              {/* Artists */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Artists
                </label>
                <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 mb-2">
                  {editArtists.map((artist) => (
                    <span
                      key={artist}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                    >
                      {artist}
                      <button
                        type="button"
                        onClick={() =>
                          setEditArtists((prev) =>
                            prev.filter((a) => a !== artist),
                          )
                        }
                        className="hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {editArtists.length === 0 && (
                    <span className="text-xs text-zinc-500">
                      No artists listed.
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editArtistInput}
                    onChange={(e) => setEditArtistInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        handleAddArtistTag();
                      }
                    }}
                    placeholder="Add artist..."
                    className="flex-1 rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                  />
                  <button
                    type="button"
                    onClick={handleAddArtistTag}
                    className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Visibility
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditPrivate(false)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      !editPrivate
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <Globe className="w-4 h-4" /> Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPrivate(true)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      editPrivate
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <Lock className="w-4 h-4" /> Private
                  </button>
                </div>
              </div>

              {/* Link to full tracklist editor */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs">
                <span className="text-zinc-400">
                  Want to add, remove, or reorder the{" "}
                  <strong className="text-zinc-200">
                    {editingAlbum.songs.length} songs
                  </strong>{" "}
                  in this album?
                </span>
                <Link
                  href={`/album/${editingAlbum.$id}`}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold shrink-0 ml-3"
                >
                  Open Track Editor →
                </Link>
              </div>

              {editError && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={() => setEditingAlbum(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE ALBUM CONFIRMATION MODAL (WITH CAPTCHA) ================= */}
      {deletingAlbum && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => !isDeleting && setDeletingAlbum(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#121215] border border-red-500/30 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingAlbum(null)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="mt-4 text-xl font-bold text-white">
              Delete &ldquo;{deletingAlbum.title}&rdquo;?
            </h2>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              This will permanently remove this album and its UUID (
              <span className="font-mono text-xs text-zinc-300">
                {deletingAlbum.$id}
              </span>
              ). Any NFC tags or shared links pointing to this album will stop
              working.
            </p>

            {/* Google reCAPTCHA required before deleting */}
            <div className="flex justify-center overflow-hidden rounded-xl bg-zinc-950 border border-zinc-800 py-3">
              {siteKey ? (
                <ReCAPTCHA
                  ref={deleteRecaptchaRef}
                  sitekey={siteKey}
                  theme="dark"
                  onChange={(token) => setDeleteCaptchaToken(token)}
                  onExpired={() => setDeleteCaptchaToken(null)}
                  onErrored={() => setDeleteCaptchaToken(null)}
                />
              ) : (
                <div className="flex items-center gap-2 py-4 text-xs text-zinc-400">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  Loading security check...
                </div>
              )}
            </div>

            {deleteError && (
              <div className="mt-4 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingAlbum(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || !deleteCaptchaToken}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Album
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

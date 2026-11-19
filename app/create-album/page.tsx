"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { account } from "@/lib/appwrite";
import {
  Disc3,
  ArrowLeft,
  ArrowRight,
  Search,
  Play,
  Pause,
  Plus,
  Check,
  Trash2,
  Upload,
  Link2,
  Music,
  UserPlus,
  X,
  Lock,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

const MAX_ALBUM_SONGS = 25;
const MAX_MP3_BYTES = 5 * 1024 * 1024; // 5MB

export interface SongItem {
  $id: string; // ID from the "songs" table (6afc0ce10018975476ab)
  title: string;
  artist: string[];
  storageID: string; // ID from the storage bucket (6afbfb0000103d4c784d)
  audioUrl: string;
}

export default function CreateAlbumPage() {
  const router = useRouter();

  // Auth state
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Step state: 1 = Pick Songs, 2 = Set Album Details & Publish
  const [step, setStep] = useState<1 | 2>(1);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<SongItem[]>([]);
  const [matchType, setMatchType] = useState<"exact" | "best" | "none">("none");

  // Audio preview player state
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Add new song modal/drawer state
  const [showAddSongForm, setShowAddSongForm] = useState(false);
  const [uploadMode, setUploadMode] = useState<"url" | "file">("url");
  const [newSongTitle, setNewSongTitle] = useState("");
  const [artistInput, setArtistInput] = useState("");
  const [artists, setArtists] = useState<string[]>([]);
  const [songUrl, setSongUrl] = useState("");
  const [songFile, setSongFile] = useState<File | null>(null);
  const [isUploadingSong, setIsUploadingSong] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Draft Album state (Max 25 songs)
  const [draftSongs, setDraftSongs] = useState<SongItem[]>([]);

  // Step 2: Finalize Album Details state
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumArtists, setAlbumArtists] = useState<string[]>([]);
  const [albumArtistInput, setAlbumArtistInput] = useState("");
  const [isPrivate, setIsPrivate] = useState(false); // Default is public (false)
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Verify user session on load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await account.get();
        setCurrentUserId(user.$id);
      } catch {
        router.replace("/signin");
        return;
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkSession();
  }, [router]);

  // Auto-fill album artists whenever draftSongs changes
  useEffect(() => {
    const uniqueArtists = Array.from(
      new Set(
        draftSongs.flatMap((song) =>
          Array.isArray(song.artist) ? song.artist : [String(song.artist)],
        ),
      ),
    ).filter(Boolean);

    setAlbumArtists(uniqueArtists);
  }, [draftSongs]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // ================= AUDIO PREVIEW HANDLER =================
  const togglePlayPreview = (song: SongItem) => {
    if (playingSongId === song.$id) {
      audioRef.current?.pause();
      setPlayingSongId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(song.audioUrl);
    audioRef.current = audio;
    setPlayingSongId(song.$id);

    audio.play().catch(() => {
      setPlayingSongId(null);
    });

    audio.onended = () => {
      setPlayingSongId(null);
    };
  };

  // ================= SEARCH HANDLER =================
  const handleSearchSongs = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setHasSearched(true);
    setUploadSuccess(null);

    try {
      const res = await fetch(
        `/api/songs/search?q=${encodeURIComponent(trimmed)}`,
      );
      const data = await res.json();
      setSearchResults(data.songs || []);
      setMatchType(data.matchType || "none");
    } catch {
      setSearchResults([]);
      setMatchType("none");
    } finally {
      setIsSearching(false);
    }
  };

  // ================= DRAFT ALBUM HANDLERS =================
  const isAlbumFull = draftSongs.length >= MAX_ALBUM_SONGS;

  const handleAddSongToDraft = (song: SongItem) => {
    if (isAlbumFull) return;
    if (draftSongs.some((s) => s.$id === song.$id)) return;
    setDraftSongs((prev) => [...prev, song]);
  };

  const handleRemoveSongFromDraft = (songId: string) => {
    setDraftSongs((prev) => prev.filter((s) => s.$id !== songId));
  };

  // ================= NEW SONG ARTISTS TAG HANDLERS =================
  const handleAddArtistTag = () => {
    const trimmed = artistInput.trim();
    if (!trimmed) return;
    if (!artists.includes(trimmed)) {
      setArtists((prev) => [...prev, trimmed]);
    }
    setArtistInput("");
  };

  const handleArtistKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddArtistTag();
    }
  };

  const handleRemoveArtistTag = (artistToRemove: string) => {
    setArtists((prev) => prev.filter((a) => a !== artistToRemove));
  };

  // ================= STEP 2 ALBUM ARTISTS TAG HANDLERS =================
  const handleAddAlbumArtist = () => {
    const trimmed = albumArtistInput.trim();
    if (!trimmed) return;
    if (!albumArtists.includes(trimmed)) {
      setAlbumArtists((prev) => [...prev, trimmed]);
    }
    setAlbumArtistInput("");
  };

  const handleRemoveAlbumArtist = (artistToRemove: string) => {
    setAlbumArtists((prev) => prev.filter((a) => a !== artistToRemove));
  };

  // ================= MP3 FILE SELECTION (5MB MAX) =================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0] || null;
    if (!file) {
      setSongFile(null);
      return;
    }

    if (
      !file.name.toLowerCase().endsWith(".mp3") &&
      file.type !== "audio/mpeg"
    ) {
      setUploadError("Only .mp3 files are allowed.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_MP3_BYTES) {
      setUploadError("File size exceeds the 5MB maximum limit.");
      e.target.value = "";
      return;
    }

    setSongFile(file);
  };

  // ================= UPLOAD NEW SONG HANDLER =================
  const handleCreateNewSong = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);

    const finalArtists = [...artists];
    if (artistInput.trim() && !finalArtists.includes(artistInput.trim())) {
      finalArtists.push(artistInput.trim());
    }

    if (!newSongTitle.trim()) {
      setUploadError("Please enter the song title.");
      return;
    }

    if (finalArtists.length === 0) {
      setUploadError("Please add at least one artist.");
      return;
    }

    if (uploadMode === "url" && !songUrl.trim()) {
      setUploadError("Please enter a song URL to download.");
      return;
    }

    if (uploadMode === "file" && !songFile) {
      setUploadError("Please select an MP3 file (max 5MB).");
      return;
    }

    setIsUploadingSong(true);

    try {
      const formData = new FormData();
      formData.append("mode", uploadMode);
      formData.append("title", newSongTitle.trim());
      formData.append("artists", JSON.stringify(finalArtists));

      if (uploadMode === "url") {
        formData.append("url", songUrl.trim());
      } else if (songFile) {
        formData.append("file", songFile);
      }

      const res = await fetch("/api/songs/add", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "Failed to add song.");
        setIsUploadingSong(false);
        return;
      }

      const createdSong: SongItem = data.song;

      setSearchResults((prev) => [createdSong, ...prev]);
      if (draftSongs.length < MAX_ALBUM_SONGS) {
        setDraftSongs((prev) => [...prev, createdSong]);
      }

      setNewSongTitle("");
      setArtistInput("");
      setArtists([]);
      setSongUrl("");
      setSongFile(null);
      setShowAddSongForm(false);
      setUploadSuccess(
        `"${createdSong.title}" passed the security scan, was saved to Appwrite, and added to your draft album!`,
      );
    } catch {
      setUploadError("Network error while uploading song. Please try again.");
    } finally {
      setIsUploadingSong(false);
    }
  };

  // ================= PUBLISH ALBUM HANDLER =================
  const handlePublishAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishError(null);

    if (!albumTitle.trim()) {
      setPublishError("Please enter an album title.");
      return;
    }

    if (draftSongs.length === 0) {
      setPublishError("Please add at least one song to your album.");
      return;
    }

    if (!currentUserId) {
      setPublishError("You must be signed in to publish an album.");
      return;
    }

    // Include any pending text in the album artist input box
    const finalAlbumArtists = [...albumArtists];
    if (
      albumArtistInput.trim() &&
      !finalAlbumArtists.includes(albumArtistInput.trim())
    ) {
      finalAlbumArtists.push(albumArtistInput.trim());
    }

    setIsPublishing(true);

    try {
      const res = await fetch("/api/albums/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: albumTitle.trim(),
          artists: finalAlbumArtists,
          songs: draftSongs.map((song) => song.$id), // Uses song.$id from "songs" table, NOT storageID
          private: isPrivate,
          creator: currentUserId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPublishError(data.error || "Failed to create album.");
        setIsPublishing(false);
        return;
      }

      // Stop any playing audio preview and redirect to My Albums
      if (audioRef.current) {
        audioRef.current.pause();
      }
      router.push("/my-albums");
    } catch {
      setPublishError("Network error while saving album. Please try again.");
      setIsPublishing(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
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
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
              Step {step} of 2 ·{" "}
              <strong className="text-emerald-400">{draftSongs.length}</strong>{" "}
              / {MAX_ALBUM_SONGS} songs
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>
        </div>
      </header>

      {/* ================= MAIN WORKSPACE ================= */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">
            Album Studio ·{" "}
            {step === 1 ? "Step 1: Select Tracks" : "Step 2: Album Details"}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            {step === 1 ? "Pick Songs for Your Album" : "Finalize Your Album"}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {step === 1
              ? `Search our library to preview and add up to ${MAX_ALBUM_SONGS} songs, or upload a new track via URL or MP3.`
              : "Set your album title, review the auto-collected artists, and choose whether to make it public or private."}
          </p>
        </div>

        {step === 1 ? (
          /* ================= STEP 1: PICK SONGS ================= */
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: SEARCH & ADD SONG (7 COLS) */}
            <div className="lg:col-span-7 space-y-6">
              <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6">
                <h2 className="text-lg font-bold text-white mb-1">
                  Search songs
                </h2>
                <p className="text-xs text-zinc-400 mb-4">
                  Search by song title or artist to check if it&apos;s already
                  saved on our Appwrite servers.
                </p>

                <form onSubmit={handleSearchSongs} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search song title or artist..."
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Search"
                    )}
                  </button>
                </form>

                {uploadSuccess && (
                  <div className="mt-4 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{uploadSuccess}</span>
                  </div>
                )}

                {hasSearched && (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                        {matchType === "exact"
                          ? "Available on Server"
                          : matchType === "best"
                            ? "No exact match — Best Matches Found"
                            : "No Matches Found"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewSongTitle(searchQuery.trim());
                          setShowAddSongForm(true);
                        }}
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                      >
                        + Not the song you want? Add it
                      </button>
                    </div>

                    {searchResults.length > 0 ? (
                      <div className="divide-y divide-zinc-800/70 rounded-xl bg-zinc-950 border border-zinc-800/90 overflow-hidden">
                        {searchResults.map((song) => {
                          const isPlaying = playingSongId === song.$id;
                          const isAdded = draftSongs.some(
                            (s) => s.$id === song.$id,
                          );

                          return (
                            <div
                              key={song.$id}
                              className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-900/50 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => togglePlayPreview(song)}
                                  title={
                                    isPlaying ? "Pause preview" : "Play preview"
                                  }
                                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                    isPlaying
                                      ? "bg-emerald-500 text-zinc-950"
                                      : "bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-800"
                                  }`}
                                >
                                  {isPlaying ? (
                                    <Pause className="w-4 h-4 fill-current" />
                                  ) : (
                                    <Play className="w-4 h-4 fill-current ml-0.5" />
                                  )}
                                </button>

                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-white truncate">
                                    {song.title}
                                  </p>
                                  <p className="text-xs text-zinc-400 truncate">
                                    {song.artist.join(", ")}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={isAdded || isAlbumFull}
                                onClick={() => handleAddSongToDraft(song)}
                                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                  isAdded
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-default"
                                    : isAlbumFull
                                      ? "bg-zinc-900 text-zinc-600 cursor-not-allowed"
                                      : "bg-zinc-100 hover:bg-white text-zinc-950 cursor-pointer"
                                }`}
                              >
                                {isAdded ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" /> Added
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5" /> Add to
                                    Draft
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl bg-zinc-950 border border-zinc-800/80 p-6 text-center">
                        <Music className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="text-sm font-medium text-zinc-300">
                          We couldn&apos;t find &ldquo;{searchQuery}&rdquo; on
                          our servers.
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Add it below using a direct URL or an MP3 file (max
                          5MB).
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setNewSongTitle(searchQuery.trim());
                            setShowAddSongForm(true);
                          }}
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          Add New Song to Server
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* ADD NEW SONG BY URL OR MP3 */}
              {showAddSongForm && (
                <section className="rounded-2xl bg-[#121215] border border-emerald-500/30 p-6 shadow-2xl">
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-emerald-400 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Virus-Scanned Server Upload
                      </span>
                      <h2 className="text-lg font-bold text-white">
                        Add a New Song
                      </h2>
                      <p className="text-xs text-zinc-400">
                        Saved to Appwrite Storage (`6afbfb0000103d4c784d`) and
                        indexed in the Songs database.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddSongForm(false)}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800 mb-5">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadMode("url");
                        setUploadError(null);
                      }}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        uploadMode === "url"
                          ? "bg-emerald-500 text-zinc-950"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Link2 className="w-4 h-4" />
                      By Song URL (yt-dlp)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadMode("file");
                        setUploadError(null);
                      }}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        uploadMode === "file"
                          ? "bg-emerald-500 text-zinc-950"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      Upload MP3 (Max 5MB)
                    </button>
                  </div>

                  <form onSubmit={handleCreateNewSong} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Song Title
                      </label>
                      <input
                        type="text"
                        required
                        value={newSongTitle}
                        onChange={(e) => setNewSongTitle(e.target.value)}
                        placeholder="e.g. Midnight City"
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Artist(s){" "}
                        <span className="text-zinc-500 font-normal">
                          — press Enter or click Add for multiple artists
                        </span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={artistInput}
                          onChange={(e) => setArtistInput(e.target.value)}
                          onKeyDown={handleArtistKeyDown}
                          placeholder="e.g. M83"
                          className="flex-1 rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60"
                        />
                        <button
                          type="button"
                          onClick={handleAddArtistTag}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
                        >
                          <UserPlus className="w-4 h-4 text-emerald-400" />
                          Add Artist
                        </button>
                      </div>

                      {artists.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {artists.map((artist) => (
                            <span
                              key={artist}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                            >
                              {artist}
                              <button
                                type="button"
                                onClick={() => handleRemoveArtistTag(artist)}
                                className="hover:text-white cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {uploadMode === "url" ? (
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                          Song URL (YouTube, SoundCloud, etc.)
                        </label>
                        <input
                          type="url"
                          required
                          value={songUrl}
                          onChange={(e) => setSongUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60"
                        />
                        <p className="mt-1.5 text-[11px] text-zinc-500">
                          Downloaded via yt-dlp on the server, virus-checked,
                          and capped at 5MB.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                          MP3 Audio File (Max 5MB)
                        </label>
                        <input
                          type="file"
                          accept=".mp3,audio/mpeg"
                          onChange={handleFileChange}
                          className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-zinc-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/15 file:text-emerald-300 hover:file:bg-emerald-500/25 cursor-pointer"
                        />
                        {songFile && (
                          <p className="mt-1.5 text-xs text-emerald-400">
                            Selected: {songFile.name} (
                            {(songFile.size / (1024 * 1024)).toFixed(2)} MB)
                          </p>
                        )}
                      </div>
                    )}

                    {uploadError && (
                      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-300">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        disabled={isUploadingSong}
                        onClick={() => setShowAddSongForm(false)}
                        className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isUploadingSong}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors disabled:opacity-60 cursor-pointer"
                      >
                        {isUploadingSong ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Scanning & Saving...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Save Song & Add to Draft
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </section>
              )}
            </div>

            {/* RIGHT COLUMN: DRAFT TRACKLIST (5 COLS) */}
            <div className="lg:col-span-5">
              <section className="sticky top-24 rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Draft Tracklist
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Maximum {MAX_ALBUM_SONGS} tracks per album
                    </p>
                  </div>
                  <span
                    className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border ${
                      isAlbumFull
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    {draftSongs.length} / {MAX_ALBUM_SONGS}
                  </span>
                </div>

                {/* Capacity Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                    style={{
                      width: `${(draftSongs.length / MAX_ALBUM_SONGS) * 100}%`,
                    }}
                  />
                </div>

                {/* Draft Song List */}
                <div>
                  {draftSongs.length === 0 ? (
                    <div className="rounded-xl bg-zinc-950 border border-zinc-800/70 p-6 text-center">
                      <Sparkles className="w-5 h-5 text-zinc-600 mx-auto mb-1.5" />
                      <p className="text-xs text-zinc-400">
                        Your draft album is empty. Search and add songs on the
                        left to start building your tracklist.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                      {draftSongs.map((song, idx) => {
                        const isPlaying = playingSongId === song.$id;
                        return (
                          <div
                            key={song.$id}
                            className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800/80"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-xs font-mono text-zinc-500 w-5">
                                {String(idx + 1).padStart(2, "0")}.
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePlayPreview(song)}
                                className="text-emerald-400 hover:text-emerald-300 shrink-0 cursor-pointer"
                                title={isPlaying ? "Pause" : "Play preview"}
                              >
                                {isPlaying ? (
                                  <Pause className="w-3.5 h-3.5 fill-current" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                )}
                              </button>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-zinc-100 truncate">
                                  {song.title}
                                </p>
                                <p className="text-[11px] text-zinc-500 truncate">
                                  {song.artist.join(", ")}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveSongFromDraft(song.$id)
                              }
                              className="text-zinc-500 hover:text-red-400 transition-colors shrink-0 cursor-pointer"
                              title="Remove from draft"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Continue to Step 2 Button */}
                <button
                  type="button"
                  disabled={draftSongs.length === 0}
                  onClick={() => setStep(2)}
                  className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
                >
                  Continue to Album Details
                  <ArrowRight className="w-4 h-4" />
                </button>
              </section>
            </div>
          </div>
        ) : (
          /* ================= STEP 2: SET ALBUM DETAILS & PUBLISH ================= */
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={handlePublishAlbum}
              className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 space-y-6 shadow-2xl"
            >
              {/* 1. Album Title */}
              <div>
                <label
                  htmlFor="album-title"
                  className="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  Album Title
                </label>
                <input
                  id="album-title"
                  type="text"
                  required
                  value={albumTitle}
                  onChange={(e) => setAlbumTitle(e.target.value)}
                  placeholder="Enter a name for your album..."
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              {/* 2. Auto-Filled Album Artists */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-zinc-300">
                    Album Artists{" "}
                    <span className="text-zinc-500 font-normal">
                      (Auto-filled from your selected songs)
                    </span>
                  </label>
                </div>

                {albumArtists.length > 0 ? (
                  <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800 mb-2.5">
                    {albumArtists.map((artist) => (
                      <span
                        key={artist}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                      >
                        {artist}
                        <button
                          type="button"
                          onClick={() => handleRemoveAlbumArtist(artist)}
                          className="hover:text-white cursor-pointer"
                          title="Remove artist"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 mb-2">
                    No artists listed yet. Add one below.
                  </p>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={albumArtistInput}
                    onChange={(e) => setAlbumArtistInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        handleAddAlbumArtist();
                      }
                    }}
                    placeholder="Add another artist (optional)..."
                    className="flex-1 rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60"
                  />
                  <button
                    type="button"
                    onClick={handleAddAlbumArtist}
                    className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* 3. Visibility (Default is Public -> private: false) */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">
                  Album Visibility
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPrivate(false)}
                    className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                      !isPrivate
                        ? "bg-emerald-500/10 border-emerald-500/40"
                        : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <Globe
                      className={`w-5 h-5 mt-0.5 shrink-0 ${
                        !isPrivate ? "text-emerald-400" : "text-zinc-500"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Public (Default)
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Anyone can search, view, and play this album via its
                        UUID.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPrivate(true)}
                    className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                      isPrivate
                        ? "bg-emerald-500/10 border-emerald-500/40"
                        : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <Lock
                      className={`w-5 h-5 mt-0.5 shrink-0 ${
                        isPrivate ? "text-emerald-400" : "text-zinc-500"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Private
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Only you can access and listen to this album.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 4. Selected Songs Summary */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800/80 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Included Songs ({draftSongs.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                  >
                    Edit songs
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {draftSongs.map((song, index) => (
                    <div
                      key={song.$id}
                      className="flex items-center justify-between text-xs text-zinc-300 py-1 border-b border-zinc-900 last:border-0"
                    >
                      <span className="truncate">
                        <span className="font-mono text-zinc-500 mr-2">
                          {String(index + 1).padStart(2, "0")}.
                        </span>
                        {song.title} —{" "}
                        <span className="text-zinc-500">
                          {song.artist.join(", ")}
                        </span>
                      </span>
                      <span className="font-mono text-[10px] text-zinc-600 ml-2 shrink-0">
                        ID: {song.$id.slice(0, 8)}...
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {publishError && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{publishError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Songs
                </button>

                <button
                  type="submit"
                  disabled={isPublishing || !albumTitle.trim()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving Album...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      Create Album
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { account } from "@/lib/appwrite";
import {
  Disc3,
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Heart,
  ExternalLink,
  Settings2,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Search,
  User,
  Globe,
  Lock,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Music,
  Link2,
  Upload,
  UserPlus,
} from "lucide-react";

const MAX_ALBUM_SONGS = 25;
const MAX_MP3_BYTES = 5 * 1024 * 1024;
const STRIPE_DONATION_URL = "https://donate.stripe.com/8x2fZhdLB8cq80W4H69MY05";

interface SongItem {
  $id: string;
  title: string;
  artist: string[];
  storageID: string;
  audioUrl: string;
}

interface AlbumData {
  $id: string;
  title: string;
  artists: string[];
  private: boolean;
  creator: string;
  creatorName: string;
  $createdAt: string;
  songs: SongItem[];
}

export default function AlbumPlayerPage() {
  const params = useParams<{ id: string }>();
  const albumId = params?.id;

  // Auth & Album states
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Copy Album ID + Donation Modal state
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  // Audio Player states
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Creator Edit Mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editArtists, setEditArtists] = useState<string[]>([]);
  const [editArtistInput, setEditArtistInput] = useState("");
  const [editSongs, setEditSongs] = useState<SongItem[]>([]);
  const [editPrivate, setEditPrivate] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Creator Song Search & Upload inside Edit Mode
  const [songSearchQuery, setSongSearchQuery] = useState("");
  const [songSearchResults, setSongSearchResults] = useState<SongItem[]>([]);
  const [isSearchingSongs, setIsSearchingSongs] = useState(false);
  const [showAddNewSongForm, setShowAddNewSongForm] = useState(false);
  const [uploadMode, setUploadMode] = useState<"url" | "file">("url");
  const [newSongTitle, setNewSongTitle] = useState("");
  const [newSongArtistInput, setNewSongArtistInput] = useState("");
  const [newSongArtists, setNewSongArtists] = useState<string[]>([]);
  const [newSongUrl, setNewSongUrl] = useState("");
  const [newSongFile, setNewSongFile] = useState<File | null>(null);
  const [isUploadingNewSong, setIsUploadingNewSong] = useState(false);
  const [uploadSongError, setUploadSongError] = useState<string | null>(null);

  // 1. Check current user session
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

  // 2. Load Album Details
  useEffect(() => {
    if (!isAuthResolved || !albumId) return;

    const fetchAlbum = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const query = currentUserId
          ? `?userId=${encodeURIComponent(currentUserId)}`
          : "";
        const res = await fetch(`/api/albums/${albumId}${query}`);
        const data = await res.json();

        if (!res.ok) {
          setLoadError(data.error || "Unable to load album.");
          return;
        }

        setAlbum(data.album);
        // Initialize creator edit states
        setEditTitle(data.album.title);
        setEditArtists(data.album.artists || []);
        setEditSongs(data.album.songs || []);
        setEditPrivate(Boolean(data.album.private));
      } catch {
        setLoadError("Network error while loading album.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlbum();
  }, [albumId, currentUserId, isAuthResolved]);

  // 3. Manage Audio Element Playback
  useEffect(() => {
    if (
      currentTrackIndex === null ||
      !album ||
      !album.songs[currentTrackIndex]
    ) {
      return;
    }

    const activeSong = album.songs[currentTrackIndex];

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(activeSong.audioUrl);
    audio.muted = isMuted;
    audioRef.current = audio;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      // Auto-advance to the next song in the album
      if (currentTrackIndex < album.songs.length - 1) {
        setCurrentTrackIndex((prev) => (prev !== null ? prev + 1 : null));
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentTrackIndex, album]);

  // Sync mute state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const isCreator =
    Boolean(currentUserId) &&
    Boolean(album) &&
    album?.creator === currentUserId;

  // ================= PLAYER CONTROLS =================
  const handlePlayAllOrToggle = () => {
    if (!album || album.songs.length === 0) return;

    if (currentTrackIndex === null) {
      setCurrentTrackIndex(0);
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSelectTrack = (index: number) => {
    if (currentTrackIndex === index) {
      handlePlayAllOrToggle();
    } else {
      setCurrentTrackIndex(index);
    }
  };

  const handlePrevTrack = () => {
    if (!album || currentTrackIndex === null) return;
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
      return;
    }
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex(currentTrackIndex - 1);
    }
  };

  const handleNextTrack = () => {
    if (!album || currentTrackIndex === null) return;
    if (currentTrackIndex < album.songs.length - 1) {
      setCurrentTrackIndex(currentTrackIndex + 1);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (secs: number) => {
    if (!secs || Number.isNaN(secs)) return "0:00";
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins}:${rem < 10 ? "0" : ""}${rem}`;
  };

  // ================= COPY ALBUM ID & POPUP HANDLER =================
  const handleCopyAlbumId = async () => {
    if (!album) return;
    try {
      await navigator.clipboard.writeText(album.$id);
    } catch {
      // Fallback copy
    }
    setIsCopyModalOpen(true);
  };

  // ================= CREATOR SETTINGS HANDLERS =================
  const moveSongInEdit = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= editSongs.length) return;

    const updated = [...editSongs];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setEditSongs(updated);
  };

  const removeSongFromEdit = (songId: string) => {
    setEditSongs((prev) => prev.filter((s) => s.$id !== songId));
  };

  const addSongToEdit = (song: SongItem) => {
    if (editSongs.length >= MAX_ALBUM_SONGS) return;
    if (editSongs.some((s) => s.$id === song.$id)) return;
    setEditSongs((prev) => {
      const next = [...prev, song];
      // Also auto-merge any new artists from the added song
      const mergedArtists = Array.from(
        new Set([...editArtists, ...(song.artist || [])]),
      );
      setEditArtists(mergedArtists);
      return next;
    });
  };

  const handleAddEditArtist = () => {
    const trimmed = editArtistInput.trim();
    if (!trimmed) return;
    if (!editArtists.includes(trimmed)) {
      setEditArtists((prev) => [...prev, trimmed]);
    }
    setEditArtistInput("");
  };

  const handleSearchSongsForAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songSearchQuery.trim()) return;
    setIsSearchingSongs(true);
    try {
      const res = await fetch(
        `/api/songs/search?q=${encodeURIComponent(songSearchQuery.trim())}`,
      );
      const data = await res.json();
      setSongSearchResults(data.songs || []);
    } catch {
      setSongSearchResults([]);
    } finally {
      setIsSearchingSongs(false);
    }
  };

  const handleUploadNewSongToEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadSongError(null);

    const finalArtists = [...newSongArtists];
    if (
      newSongArtistInput.trim() &&
      !finalArtists.includes(newSongArtistInput.trim())
    ) {
      finalArtists.push(newSongArtistInput.trim());
    }

    if (!newSongTitle.trim() || finalArtists.length === 0) {
      setUploadSongError("Song title and at least one artist are required.");
      return;
    }

    setIsUploadingNewSong(true);
    try {
      const formData = new FormData();
      formData.append("mode", uploadMode);
      formData.append("title", newSongTitle.trim());
      formData.append("artists", JSON.stringify(finalArtists));
      if (uploadMode === "url") {
        formData.append("url", newSongUrl.trim());
      } else if (newSongFile) {
        formData.append("file", newSongFile);
      }

      const res = await fetch("/api/songs/add", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setUploadSongError(data.error || "Failed to add song.");
        setIsUploadingNewSong(false);
        return;
      }

      addSongToEdit(data.song);
      setNewSongTitle("");
      setNewSongArtistInput("");
      setNewSongArtists([]);
      setNewSongUrl("");
      setNewSongFile(null);
      setShowAddNewSongForm(false);
    } catch {
      setUploadSongError("Network error while uploading song.");
    } finally {
      setIsUploadingNewSong(false);
    }
  };

  const handleSaveAlbumChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!album || !currentUserId) return;

    setSaveMessage(null);
    if (!editTitle.trim()) {
      setSaveMessage({ type: "error", text: "Album title is required." });
      return;
    }
    if (editSongs.length === 0) {
      setSaveMessage({
        type: "error",
        text: "Your album must keep at least 1 song.",
      });
      return;
    }

    const finalArtists = [...editArtists];
    if (
      editArtistInput.trim() &&
      !finalArtists.includes(editArtistInput.trim())
    ) {
      finalArtists.push(editArtistInput.trim());
    }

    setIsSavingChanges(true);
    try {
      const res = await fetch(`/api/albums/${album.$id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          title: editTitle.trim(),
          artists: finalArtists,
          songs: editSongs.map((s) => s.$id),
          private: editPrivate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSaveMessage({
          type: "error",
          text: data.error || "Failed to save changes.",
        });
        setIsSavingChanges(false);
        return;
      }

      setAlbum({
        ...album,
        title: editTitle.trim(),
        artists: finalArtists,
        songs: editSongs,
        private: editPrivate,
      });
      setSaveMessage({
        type: "success",
        text: "Album updated! Title, artists, and track order saved.",
      });
    } catch {
      setSaveMessage({
        type: "error",
        text: "Network error while saving album.",
      });
    } finally {
      setIsSavingChanges(false);
    }
  };

  // ================= LOADING / ERROR VIEWS =================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          Loading album...
        </div>
      </div>
    );
  }

  if (loadError || !album) {
    return (
      <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white">
          {loadError || "Album Not Found"}
        </h1>
        <p className="mt-2 text-sm text-zinc-400 max-w-md">
          This album might be set to private or the UUID may no longer exist.
        </p>
        <Link
          href="/search"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Search
        </Link>
      </div>
    );
  }

  const activeSong =
    currentTrackIndex !== null ? album.songs[currentTrackIndex] : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-100 pb-28">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#09090B]/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <Disc3 className="w-5 h-5 text-emerald-400 group-hover:rotate-45 transition-transform duration-300" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Music Player
            </span>
          </Link>

          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Search
          </Link>
        </div>
      </header>

      {/* ================= ALBUM HERO ================= */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        <section className="relative overflow-hidden rounded-3xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-10 shadow-2xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/15 blur-[100px] rounded-full"
          />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-5">
              {/* Spinning Vinyl Disc Visual */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
                <Disc3
                  className={`w-11 h-11 text-emerald-400 ${
                    isPlaying ? "animate-spin" : ""
                  }`}
                  style={{ animationDuration: "5s" }}
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {album.private ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25">
                      <Lock className="w-3 h-3" />
                      Private Album
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                      <Globe className="w-3 h-3" />
                      Public Album
                    </span>
                  )}

                  <span className="text-xs font-mono text-zinc-500">
                    UUID: {album.$id}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                  {album.title}
                </h1>

                <p className="mt-1.5 text-sm text-zinc-300">
                  {album.artists.length > 0
                    ? album.artists.join(", ")
                    : "Various Artists"}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    Created by{" "}
                    <strong className="text-zinc-200">
                      {album.creatorName}
                    </strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-emerald-400" />
                    {album.songs.length}{" "}
                    {album.songs.length === 1 ? "Song" : "Songs"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons: Play Album, Copy Album ID, Creator Settings */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={handlePlayAllOrToggle}
                disabled={album.songs.length === 0}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)] cursor-pointer disabled:opacity-50"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Play Album
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyAlbumId}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-100 font-semibold text-sm transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4 text-emerald-400" />
                Copy Album ID
              </button>

              {isCreator && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing((prev) => !prev);
                    setSaveMessage(null);
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                    isEditing
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300"
                  }`}
                >
                  <Settings2 className="w-4 h-4" />
                  {isEditing ? "Close Settings" : "Album Settings"}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ================= CREATOR-ONLY ALBUM SETTINGS PANEL ================= */}
        {isCreator && isEditing && (
          <section className="rounded-2xl bg-[#121215] border border-emerald-500/30 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
                  Creator Controls
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  Edit Album Settings & Track Order
                </h2>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
                {editSongs.length} / {MAX_ALBUM_SONGS} Songs
              </span>
            </div>

            <form onSubmit={handleSaveAlbumChanges} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
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

                {/* Visibility */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Visibility
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditPrivate(false)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        !editPrivate
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" /> Public
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPrivate(true)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        editPrivate
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" /> Private
                    </button>
                  </div>
                </div>
              </div>

              {/* Album Artists */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Album Artists
                </label>
                <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800 mb-2">
                  {editArtists.map((artist) => (
                    <span
                      key={artist}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
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
                      No artists listed. Add one below.
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
                        handleAddEditArtist();
                      }
                    }}
                    placeholder="Add artist name..."
                    className="flex-1 rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60"
                  />
                  <button
                    type="button"
                    onClick={handleAddEditArtist}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 cursor-pointer"
                  >
                    + Add Artist
                  </button>
                </div>
              </div>

              {/* Reorder & Remove Songs */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">
                  Reorder or Remove Songs
                </label>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {editSongs.map((song, idx) => (
                    <div
                      key={song.$id}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-zinc-500 w-5">
                          {String(idx + 1).padStart(2, "0")}.
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {song.title}
                          </p>
                          <p className="text-xs text-zinc-400 truncate">
                            {song.artist.join(", ")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveSongInEdit(idx, "up")}
                          title="Move track up"
                          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === editSongs.length - 1}
                          onClick={() => moveSongInEdit(idx, "down")}
                          title="Move track down"
                          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSongFromEdit(song.$id)}
                          title="Remove from album"
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Search & Add More Songs to Album */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800/90 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Add More Songs to Album
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddNewSongForm((prev) => !prev)}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    {showAddNewSongForm
                      ? "Hide Upload Form"
                      : "+ Upload New Song via URL / MP3"}
                  </button>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={songSearchQuery}
                      onChange={(e) => setSongSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSearchSongsForAlbum(e);
                        }
                      }}
                      placeholder="Search existing songs on server..."
                      className="w-full rounded-xl bg-[#121215] border border-zinc-800 pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchSongsForAlbum}
                    disabled={isSearchingSongs}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white cursor-pointer"
                  >
                    {isSearchingSongs ? "Searching..." : "Search"}
                  </button>
                </div>

                {songSearchResults.length > 0 && (
                  <div className="divide-y divide-zinc-800/80 rounded-xl bg-[#121215] border border-zinc-800 overflow-hidden">
                    {songSearchResults.map((song) => {
                      const alreadyInAlbum = editSongs.some(
                        (s) => s.$id === song.$id,
                      );
                      return (
                        <div
                          key={song.$id}
                          className="p-2.5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="truncate">
                            <span className="font-semibold text-white">
                              {song.title}
                            </span>{" "}
                            <span className="text-zinc-400">
                              — {song.artist.join(", ")}
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={
                              alreadyInAlbum ||
                              editSongs.length >= MAX_ALBUM_SONGS
                            }
                            onClick={() => addSongToEdit(song)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold disabled:opacity-40 cursor-pointer shrink-0"
                          >
                            {alreadyInAlbum ? "Included" : "+ Add"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Optional Inline New Song Uploader */}
                {showAddNewSongForm && (
                  <div className="pt-3 border-t border-zinc-800 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setUploadMode("url")}
                        className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                          uploadMode === "url"
                            ? "bg-emerald-500 text-zinc-950"
                            : "bg-zinc-900 text-zinc-400"
                        }`}
                      >
                        <Link2 className="w-3.5 h-3.5" /> By URL (yt-dlp)
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMode("file")}
                        className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                          uploadMode === "file"
                            ? "bg-emerald-500 text-zinc-950"
                            : "bg-zinc-900 text-zinc-400"
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" /> MP3 (Max 5MB)
                      </button>
                    </div>

                    <input
                      type="text"
                      value={newSongTitle}
                      onChange={(e) => setNewSongTitle(e.target.value)}
                      placeholder="New song title"
                      className="w-full rounded-xl bg-[#121215] border border-zinc-800 px-3 py-2 text-xs text-white"
                    />

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSongArtistInput}
                        onChange={(e) => setNewSongArtistInput(e.target.value)}
                        placeholder="Artist name"
                        className="flex-1 rounded-xl bg-[#121215] border border-zinc-800 px-3 py-2 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newSongArtistInput.trim()) {
                            setNewSongArtists((prev) => [
                              ...prev,
                              newSongArtistInput.trim(),
                            ]);
                            setNewSongArtistInput("");
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5 inline mr-1" />
                        Add
                      </button>
                    </div>

                    {uploadMode === "url" ? (
                      <input
                        type="url"
                        value={newSongUrl}
                        onChange={(e) => setNewSongUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full rounded-xl bg-[#121215] border border-zinc-800 px-3 py-2 text-xs font-mono text-white"
                      />
                    ) : (
                      <input
                        type="file"
                        accept=".mp3,audio/mpeg"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          if (f && f.size > MAX_MP3_BYTES) {
                            setUploadSongError("MP3 file exceeds 5MB limit.");
                            return;
                          }
                          setNewSongFile(f);
                        }}
                        className="w-full text-xs text-zinc-300"
                      />
                    )}

                    {uploadSongError && (
                      <p className="text-xs text-red-400">{uploadSongError}</p>
                    )}

                    <button
                      type="button"
                      disabled={isUploadingNewSong}
                      onClick={handleUploadNewSongToEdit}
                      className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-xs cursor-pointer"
                    >
                      {isUploadingNewSong
                        ? "Scanning & Uploading..."
                        : "Upload & Add to Album"}
                    </button>
                  </div>
                )}
              </div>

              {saveMessage && (
                <div
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs border ${
                    saveMessage.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                      : "bg-red-500/10 border-red-500/25 text-red-300"
                  }`}
                >
                  {saveMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{saveMessage.text}</span>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSavingChanges}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingChanges && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Save Album Changes
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ================= TRACKLIST ================= */}
        <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-400">
              Album Tracklist
            </h2>
            <span className="text-xs text-zinc-500">
              Click any song to play
            </span>
          </div>

          {album.songs.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              No songs found in this album.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {album.songs.map((song, idx) => {
                const isCurrentTrack = currentTrackIndex === idx;
                const isTrackPlaying = isCurrentTrack && isPlaying;

                return (
                  <button
                    key={`${song.$id}-${idx}`}
                    type="button"
                    onClick={() => handleSelectTrack(idx)}
                    className={`w-full px-6 py-4 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer ${
                      isCurrentTrack
                        ? "bg-emerald-500/10"
                        : "hover:bg-zinc-900/60"
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isCurrentTrack
                            ? "bg-emerald-500 text-zinc-950"
                            : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                        }`}
                      >
                        {isTrackPlaying ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p
                          className={`text-sm font-semibold truncate ${
                            isCurrentTrack ? "text-emerald-400" : "text-white"
                          }`}
                        >
                          <span className="font-mono text-xs text-zinc-500 mr-2">
                            {String(idx + 1).padStart(2, "0")}.
                          </span>
                          {song.title}
                        </p>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">
                          {song.artist.join(", ")}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-mono text-zinc-500 shrink-0">
                      {isCurrentTrack
                        ? isTrackPlaying
                          ? "Now Playing"
                          : "Paused"
                        : "Play"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ================= STICKY BOTTOM AUDIO PLAYER BAR ================= */}
      {activeSong && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-zinc-800 bg-[#09090B]/95 backdrop-blur-lg">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Active Song Info */}
            <div className="flex items-center gap-3 min-w-0 w-full sm:w-1/3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Disc3
                  className={`w-5 h-5 text-emerald-400 ${
                    isPlaying ? "animate-spin" : ""
                  }`}
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {activeSong.title}
                </p>
                <p className="text-xs text-zinc-400 truncate">
                  {activeSong.artist.join(", ")}
                </p>
              </div>
            </div>

            {/* Playback Controls & Seek Bar */}
            <div className="flex flex-col items-center w-full sm:w-1/3">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handlePrevTrack}
                  disabled={currentTrackIndex === 0 && currentTime <= 3}
                  className="text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handlePlayAllOrToggle}
                  className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleNextTrack}
                  disabled={currentTrackIndex === album.songs.length - 1}
                  className="text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              <div className="w-full flex items-center gap-2 mt-1.5">
                <span className="text-[11px] font-mono text-zinc-500 w-8 text-right">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-1 bg-zinc-800 rounded-lg accent-emerald-500 cursor-pointer"
                />
                <span className="text-[11px] font-mono text-zinc-500 w-8">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Mute / Volume */}
            <div className="hidden sm:flex items-center justify-end w-1/3">
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= COPY ALBUM ID + STRIPE DONATION MODAL ================= */}
      {isCopyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setIsCopyModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#121215] border border-zinc-800 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="mt-4 text-xl font-bold text-white">
              Album ID Copied to Clipboard!
            </h2>
            <p className="mt-1.5 text-sm text-zinc-400">
              You can now paste this Album UUID anywhere or encode it onto your
              NFC tag:
            </p>

            <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-emerald-400 select-all break-all">
              {album.$id}
            </div>

            {/* One-Time Stripe Donation Callout */}
            <div className="mt-5 rounded-xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/25 p-4">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <Heart className="w-4 h-4 fill-emerald-400" />
                Help Keep Music Player Alive
              </div>
              <p className="mt-1.5 text-xs text-zinc-300 leading-relaxed">
                Music Player is free for everyone. If you enjoy streaming and
                sharing albums, consider making a one-time donation to help
                cover our storage and server costs.
              </p>

              <a
                href={STRIPE_DONATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3.5 w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]"
              >
                Donate via Stripe
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <button
              type="button"
              onClick={() => setIsCopyModalOpen(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

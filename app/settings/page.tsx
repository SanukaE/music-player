"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ReCAPTCHA from "react-google-recaptcha";
import { account } from "@/lib/appwrite";
import {
  Disc3,
  ArrowLeft,
  User,
  Mail,
  Lock,
  LogOut,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Send,
  Library,
  X,
} from "lucide-react";

type StatusMessage = {
  type: "success" | "error";
  text: string;
} | null;

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Appwrite verification callback params
  const verifyUserId = searchParams.get("userId");
  const verifySecret = searchParams.get("secret");
  const hasAttemptedVerify = useRef(false);

  // User session state
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    emailVerification: boolean;
  } | null>(null);

  // Email verification states
  const [isVerifyingLink, setIsVerifyingLink] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationStatus, setVerificationStatus] =
    useState<StatusMessage>(null);

  // 1. Username form state
  const [newUsername, setNewUsername] = useState("");
  const [usernamePassword, setUsernamePassword] = useState("");
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<StatusMessage>(null);

  // 2. Email form state
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<StatusMessage>(null);

  // 3. Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<StatusMessage>(null);

  // 4. Logout state (instant, no confirmation)
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  // 5. Delete Account modal state + album retention option + reCAPTCHA
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteAlbumsWithAccount, setDeleteAlbumsWithAccount] = useState(false); // Default false = leave albums behind
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);
  const [deleteCaptchaToken, setDeleteCaptchaToken] = useState<string | null>(
    null,
  );
  const deleteRecaptchaRef = useRef<ReCAPTCHA>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load current Appwrite session
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await account.get();
        setCurrentUser({
          name: user.name,
          email: user.email,
          emailVerification: user.emailVerification,
        });
        setNewUsername(user.name);
        setNewEmail(user.email);
      } catch {
        router.replace("/signin");
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUser();
  }, [router]);

  // Handle incoming Appwrite email verification callback (?userId=...&secret=...)
  useEffect(() => {
    if (
      !verifyUserId ||
      !verifySecret ||
      hasAttemptedVerify.current ||
      isLoadingUser
    ) {
      return;
    }

    hasAttemptedVerify.current = true;

    const completeVerification = async () => {
      setIsVerifyingLink(true);
      setVerificationStatus(null);

      try {
        await account.updateVerification(verifyUserId, verifySecret);
        setCurrentUser((prev) =>
          prev ? { ...prev, emailVerification: true } : prev,
        );
        setVerificationStatus({
          type: "success",
          text: "Your email address has been verified successfully.",
        });
      } catch (error: any) {
        setVerificationStatus({
          type: "error",
          text:
            error?.message ||
            "Verification link is invalid or has expired. Please request a new one.",
        });
      } finally {
        setIsVerifyingLink(false);
        router.replace("/settings");
      }
    };

    completeVerification();
  }, [verifyUserId, verifySecret, isLoadingUser, router]);

  // Close delete modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeletingAccount) {
        setIsDeleteModalOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDeletingAccount]);

  // ================= HANDLERS =================

  const handleSendVerificationEmail = async () => {
    setIsSendingVerification(true);
    setVerificationStatus(null);
    setVerificationSent(false);

    try {
      const redirectUrl = `${window.location.origin}/settings`;
      await account.createVerification(redirectUrl);
      setVerificationSent(true);
      setVerificationStatus({
        type: "success",
        text: `Verification email sent to ${currentUser?.email}. Check your inbox and click the link to verify.`,
      });
    } catch (error: any) {
      setVerificationStatus({
        type: "error",
        text:
          error?.message ||
          "Failed to send verification email. Please try again.",
      });
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameStatus(null);

    if (!newUsername.trim() || !usernamePassword) {
      setUsernameStatus({
        type: "error",
        text: "Please enter a new username and your current password.",
      });
      return;
    }

    if (newUsername.trim() === currentUser?.name) {
      setUsernameStatus({
        type: "error",
        text: "That is already your current username.",
      });
      return;
    }

    setIsUpdatingUsername(true);
    try {
      const res = await fetch("/api/auth/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: usernamePassword,
          username: newUsername.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setUsernameStatus({
          type: "error",
          text: data.error || "Failed to update username.",
        });
        return;
      }

      setCurrentUser((prev) =>
        prev ? { ...prev, name: newUsername.trim() } : prev,
      );
      setUsernamePassword("");
      setUsernameStatus({
        type: "success",
        text: "Username updated successfully.",
      });
    } catch {
      setUsernameStatus({
        type: "error",
        text: "Network error. Please try again.",
      });
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailStatus(null);

    if (!newEmail.trim() || !emailPassword) {
      setEmailStatus({
        type: "error",
        text: "Please enter a new email address and your current password.",
      });
      return;
    }

    if (newEmail.trim().toLowerCase() === currentUser?.email.toLowerCase()) {
      setEmailStatus({
        type: "error",
        text: "That is already your current email address.",
      });
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const res = await fetch("/api/auth/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: emailPassword,
          email: newEmail.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEmailStatus({
          type: "error",
          text: data.error || "Failed to update email.",
        });
        return;
      }

      setCurrentUser((prev) =>
        prev
          ? { ...prev, email: newEmail.trim(), emailVerification: false }
          : prev,
      );
      setVerificationSent(false);
      setVerificationStatus(null);
      setEmailPassword("");
      setEmailStatus({
        type: "success",
        text: "Email address updated. Please verify your new email address.",
      });
    } catch {
      setEmailStatus({
        type: "error",
        text: "Network error. Please try again.",
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordStatus({
        type: "error",
        text: "Please fill in all password fields.",
      });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordStatus({
        type: "error",
        text: "New password must be at least 8 characters long.",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordStatus({
        type: "error",
        text: "New passwords do not match.",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch("/api/auth/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordStatus({
          type: "error",
          text: data.error || "Failed to update password.",
        });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordStatus({
        type: "success",
        text: "Password updated successfully.",
      });
    } catch {
      setPasswordStatus({
        type: "error",
        text: "Network error. Please try again.",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleInstantLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await account.deleteSession("current");
      router.replace("/");
    } catch (error: any) {
      setLogoutError(error?.message || "Failed to log out. Please try again.");
      setIsLoggingOut(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);

    if (!hasAcceptedDisclaimer) {
      setDeleteError("You must acknowledge the disclaimer before deleting.");
      return;
    }

    if (!deletePassword || !currentUser) {
      setDeleteError("Please enter your current password to confirm deletion.");
      return;
    }

    if (!deleteCaptchaToken) {
      setDeleteError("Please complete the CAPTCHA verification.");
      return;
    }

    setIsDeletingAccount(true);
    try {
      const res = await fetch("/api/auth/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser.name,
          email: currentUser.email,
          password: deletePassword,
          captchaToken: deleteCaptchaToken,
          deleteAlbums: deleteAlbumsWithAccount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete account.");
        deleteRecaptchaRef.current?.reset();
        setDeleteCaptchaToken(null);
        setIsDeletingAccount(false);
        return;
      }

      try {
        await account.deleteSession("current");
      } catch {
        // Session is already invalidated server-side
      }
      router.replace("/");
    } catch {
      setDeleteError("Network error. Please try again.");
      deleteRecaptchaRef.current?.reset();
      setDeleteCaptchaToken(null);
      setIsDeletingAccount(false);
    }
  };

  // ================= LOADING STATE =================

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400 text-sm">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          Loading account settings...
        </div>
      </div>
    );
  }

  // ================= RENDER =================

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

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">
            Account Preferences
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Settings
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Manage your profile credentials, security settings, and account
            session.
          </p>
        </div>

        {/* Verification Processing Banner */}
        {isVerifyingLink && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-sm text-emerald-300">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>Verifying your email address...</span>
          </div>
        )}

        {/* ---------- 1. UPDATE USERNAME ---------- */}
        <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Username</h2>
              <p className="text-xs text-zinc-400">
                Change the display name shown on your public albums.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateUsername} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="new-username"
                  className="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  New Username
                </label>
                <input
                  id="new-username"
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter new username"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="username-current-password"
                  className="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  Current Password
                </label>
                <input
                  id="username-current-password"
                  type="password"
                  required
                  value={usernamePassword}
                  onChange={(e) => setUsernamePassword(e.target.value)}
                  placeholder="Verify current password"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
                />
              </div>
            </div>

            {usernameStatus && <StatusBanner status={usernameStatus} />}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isUpdatingUsername}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isUpdatingUsername && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Update Username
              </button>
            </div>
          </form>
        </section>

        {/* ---------- 2. UPDATE EMAIL & VERIFICATION STATUS ---------- */}
        <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Email Address</h2>
                <p className="text-xs text-zinc-400">
                  Update the email address used to sign in and receive alerts.
                </p>
              </div>
            </div>

            {/* Email Verification Badge */}
            {currentUser?.emailVerification ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/25">
                <AlertTriangle className="w-3.5 h-3.5" />
                Unverified
              </span>
            )}
          </div>

          {/* Unverified Callout + Send Verification Button */}
          {!currentUser?.emailVerification && (
            <div className="mb-6 rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-amber-200">
                  Your email address isn&apos;t verified yet
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Verify{" "}
                  <span className="text-zinc-200">{currentUser?.email}</span> to
                  secure your account and enable recovery options.
                </p>
              </div>

              <button
                type="button"
                disabled={isSendingVerification || verificationSent}
                onClick={handleSendVerificationEmail}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold text-xs transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isSendingVerification ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sending...
                  </>
                ) : verificationSent ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Email Sent
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send Verification Email
                  </>
                )}
              </button>
            </div>
          )}

          {/* Verification Result Banner */}
          {verificationStatus && (
            <div className="mb-6">
              <StatusBanner status={verificationStatus} />
            </div>
          )}

          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="new-email"
                  className="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  New Email Address
                </label>
                <input
                  id="new-email"
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="email-current-password"
                  className="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  Current Password
                </label>
                <input
                  id="email-current-password"
                  type="password"
                  required
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="Verify current password"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
                />
              </div>
            </div>

            {emailStatus && <StatusBanner status={emailStatus} />}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isUpdatingEmail}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isUpdatingEmail && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Update Email
              </button>
            </div>
          </form>
        </section>

        {/* ---------- 3. UPDATE PASSWORD ---------- */}
        <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Password</h2>
                <p className="text-xs text-zinc-400">
                  Must be at least 8 characters long.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPasswords((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              {showPasswords ? (
                <>
                  <EyeOff className="w-4 h-4" /> Hide
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" /> Show
                </>
              )}
            </button>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label
                htmlFor="current-password"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Current Password
              </label>
              <input
                id="current-password"
                type={showPasswords ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  New Password
                </label>
                <input
                  id="new-password"
                  type={showPasswords ? "text" : "password"}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-new-password"
                  className="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirm-new-password"
                  type={showPasswords ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
                />
              </div>
            </div>

            {passwordStatus && <StatusBanner status={passwordStatus} />}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isUpdatingPassword && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Update Password
              </button>
            </div>
          </form>
        </section>

        {/* ---------- 4. SESSION & DANGER ZONE ---------- */}
        <section className="rounded-2xl bg-[#121215] border border-zinc-800/90 divide-y divide-zinc-800/80">
          {/* Instant Log Out */}
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">Log out</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Sign out of your active session on this device immediately.
              </p>
              {logoutError && (
                <p className="text-xs text-red-400 mt-2">{logoutError}</p>
              )}
            </div>

            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleInstantLogout}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-medium text-sm transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  Log out
                </>
              )}
            </button>
          </div>

          {/* Delete Account */}
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-red-950/10 rounded-b-2xl">
            <div>
              <h2 className="text-base font-bold text-red-400">
                Delete Account
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Permanently remove your account. You can choose whether to keep
                your created albums live or delete them with your account.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setDeletePassword("");
                setDeleteAlbumsWithAccount(false); // Reset to default: leave albums behind
                setHasAcceptedDisclaimer(false);
                setDeleteCaptchaToken(null);
                setDeleteError(null);
                setIsDeleteModalOpen(true);
              }}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 font-semibold text-sm transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          </div>
        </section>
      </main>

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
          onClick={() => !isDeletingAccount && setIsDeleteModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#121215] border border-red-500/30 p-6 shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2
              id="delete-account-title"
              className="mt-4 text-xl font-bold text-white"
            >
              Delete your account?
            </h2>
            <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">
              You are about to permanently delete{" "}
              <span className="text-zinc-200 font-medium">
                {currentUser?.email}
              </span>
              .
            </p>

            <form onSubmit={handleDeleteAccount} className="mt-5 space-y-4">
              {/* 1. Album Retention Choice (Default: Leave Albums Behind) */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">
                  What should happen to the albums you created?
                </label>

                <div className="space-y-2.5">
                  {/* Option A: Leave albums behind (Default) */}
                  <button
                    type="button"
                    onClick={() => setDeleteAlbumsWithAccount(false)}
                    className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      !deleteAlbumsWithAccount
                        ? "bg-emerald-500/10 border-emerald-500/40"
                        : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <Library
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        !deleteAlbumsWithAccount
                          ? "text-emerald-400"
                          : "text-zinc-500"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          Leave my albums behind
                        </span>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                          Default
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        Your created albums and their UUIDs will remain active
                        so friends and NFC tags can keep playing them.
                      </p>
                    </div>
                  </button>

                  {/* Option B: Delete all albums with account */}
                  <button
                    type="button"
                    onClick={() => setDeleteAlbumsWithAccount(true)}
                    className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      deleteAlbumsWithAccount
                        ? "bg-red-500/10 border-red-500/40"
                        : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <Trash2
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        deleteAlbumsWithAccount
                          ? "text-red-400"
                          : "text-zinc-500"
                      }`}
                    />
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-white">
                        Delete all of my albums with my account
                      </span>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        Permanently removes every album and UUID you have
                        created from our database.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Password Confirmation */}
              <div>
                <label
                  htmlFor="delete-confirm-password"
                  className="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  Enter your current password to confirm
                </label>
                <input
                  id="delete-confirm-password"
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500/60 transition-colors"
                />
              </div>

              {/* 3. Mandatory Disclaimer Checkbox */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/5 border border-red-500/20 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasAcceptedDisclaimer}
                  onChange={(e) => setHasAcceptedDisclaimer(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-red-500 cursor-pointer shrink-0"
                />
                <span className="text-xs text-zinc-300 leading-relaxed">
                  I understand that deleting my account is{" "}
                  <span className="text-red-400 font-semibold">
                    permanent and irreversible
                  </span>
                  {deleteAlbumsWithAccount
                    ? ", and that all of my created albums, UUIDs, and profile data will be permanently deleted."
                    : ", and that my created albums will remain on the platform but I will no longer be able to edit or manage them."}
                </span>
              </label>

              {/* 4. Google reCAPTCHA */}
              <div className="flex justify-center overflow-hidden rounded-xl bg-zinc-950 border border-zinc-800 py-3">
                <ReCAPTCHA
                  ref={deleteRecaptchaRef}
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                  theme="dark"
                  onChange={(token) => setDeleteCaptchaToken(token)}
                  onExpired={() => setDeleteCaptchaToken(null)}
                  onErrored={() => setDeleteCaptchaToken(null)}
                />
              </div>

              {deleteError && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeletingAccount}
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm font-medium text-zinc-300 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isDeletingAccount ||
                    !hasAcceptedDisclaimer ||
                    !deletePassword ||
                    !deleteCaptchaToken
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isDeletingAccount ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : deleteAlbumsWithAccount ? (
                    "Delete Account & Albums"
                  ) : (
                    "Delete Account Only"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}

/* ================= HELPER COMPONENT ================= */

function StatusBanner({ status }: { status: NonNullable<StatusMessage> }) {
  const isSuccess = status.type === "success";
  return (
    <div
      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs border ${
        isSuccess
          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
          : "bg-red-500/10 border-red-500/25 text-red-300"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0" />
      )}
      <span>{status.text}</span>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { account } from "@/lib/appwrite";
import {
  Disc3,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  Loader2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Mail,
  KeyRound,
} from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [siteKey, setSiteKey] = useState(
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "",
  );

  // Appwrite appends ?userId=...&secret=... to the recovery email link
  const userId = searchParams.get("userId");
  const secret = searchParams.get("secret");
  const isRecoveryMode = Boolean(userId && secret);

  // Session check state
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Stage 1: Request Recovery Email
  const [email, setEmail] = useState("");
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaVerified = Boolean(captchaToken);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Stage 2: Set New Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    if (siteKey) return;
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.recaptchaSiteKey) setSiteKey(data.recaptchaSiteKey);
      })
      .catch(() => {});
  }, [siteKey]);

  // Redirect already logged-in users unless they arrived via a recovery link
  useEffect(() => {
    const checkSession = async () => {
      if (isRecoveryMode) {
        setIsCheckingSession(false);
        return;
      }
      try {
        await account.get();
        router.replace("/");
      } catch {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, [isRecoveryMode, router]);

  // Email validation
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canRequestReset = isEmailValid && captchaVerified && !isSendingEmail;

  // Password validation (Stage 2)
  const passwordChecks = useMemo(
    () => [
      { label: "At least 8 characters", met: newPassword.length >= 8 },
      {
        label: "Uppercase & lowercase letters",
        met: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword),
      },
      { label: "At least one number (0-9)", met: /\d/.test(newPassword) },
      {
        label: "At least one special character (!@#$...)",
        met: /[^A-Za-z0-9]/.test(newPassword),
      },
    ],
    [newPassword],
  );

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmitNewPassword =
    newPassword.length >= 8 && passwordsMatch && !isUpdatingPassword;

  // ================= STAGE 1: SEND RECOVERY EMAIL =================
  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRequestReset || !captchaToken) return;

    setIsSendingEmail(true);
    setRequestError(null);

    try {
      // 1. Verify Google reCAPTCHA token on the server first
      const captchaRes = await fetch("/api/auth/verify-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captchaToken }),
      });

      const captchaData = await captchaRes.json();
      if (!captchaRes.ok) {
        throw new Error(captchaData.error || "CAPTCHA verification failed.");
      }

      // 2. Trigger Appwrite recovery email
      const redirectUrl = `${window.location.origin}/reset-password`;
      await account.createRecovery(email.trim(), redirectUrl);
      setEmailSent(true);
    } catch (error: any) {
      setRequestError(
        error?.message || "Failed to send recovery email. Please try again.",
      );
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // ================= STAGE 2: COMPLETE PASSWORD RESET =================
  const handleCompleteRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitNewPassword || !userId || !secret) return;

    setIsUpdatingPassword(true);
    setResetError(null);

    try {
      await account.updateRecovery(userId, secret, newPassword);
      setResetSuccess(true);
    } catch (error: any) {
      setResetError(
        error?.message ||
          "This reset link may have expired or is invalid. Please request a new one.",
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-100">
      {/* ================= HEADER ================= */}
      <header className="border-b border-zinc-800/80 bg-[#09090B]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <Disc3 className="w-5 h-5 text-emerald-400 group-hover:rotate-45 transition-transform duration-300" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Music Player
            </span>
          </Link>

          <Link
            href="/signin"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </header>

      {/* ================= MAIN CARD ================= */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 w-[620px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full"
        />

        <div className="relative w-full max-w-md">
          <div className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 shadow-2xl">
            {/* ---------- STAGE 2: SET NEW PASSWORD ---------- */}
            {isRecoveryMode ? (
              resetSuccess ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-white">
                    Password Updated
                  </h1>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    Your password has been reset successfully. You can now sign
                    in with your new credentials.
                  </p>
                  <Link
                    href="/signin"
                    className="mt-6 w-full inline-flex items-center justify-center py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]"
                  >
                    Go to Sign In
                  </Link>
                </div>
              ) : (
                <>
                  <div className="text-center mb-7">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                      <KeyRound className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                      Set New Password
                    </h1>
                    <p className="mt-2 text-sm text-zinc-400">
                      Enter a new password for your Music Player account.
                    </p>
                  </div>

                  <form onSubmit={handleCompleteRecovery} className="space-y-5">
                    <div>
                      <label
                        htmlFor="new-password"
                        className="block text-xs font-medium text-zinc-300 mb-1.5"
                      >
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          id="new-password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 8 characters"
                          className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 pr-10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <ul className="mt-3 space-y-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-3">
                        {passwordChecks.map((check) => (
                          <li
                            key={check.label}
                            className={`flex items-center gap-2 text-xs transition-colors ${
                              check.met ? "text-emerald-400" : "text-zinc-500"
                            }`}
                          >
                            {check.met ? (
                              <Check className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <span className="w-3.5 h-3.5 rounded-full border border-zinc-700 inline-block shrink-0" />
                            )}
                            <span>{check.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <label
                        htmlFor="confirm-password"
                        className="block text-xs font-medium text-zinc-300 mb-1.5"
                      >
                        Confirm New Password
                      </label>
                      <input
                        id="confirm-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        className={`w-full rounded-xl bg-zinc-950 border px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition-colors ${
                          confirmPassword.length > 0 && !passwordsMatch
                            ? "border-red-500/60 focus:border-red-500"
                            : passwordsMatch
                              ? "border-emerald-500/60 focus:border-emerald-500"
                              : "border-zinc-800 focus:border-emerald-500/60"
                        }`}
                      />
                      {confirmPassword.length > 0 && !passwordsMatch && (
                        <p className="mt-1.5 text-xs text-red-400">
                          Passwords do not match.
                        </p>
                      )}
                    </div>

                    {resetError && (
                      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-300">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{resetError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!canSubmitNewPassword}
                      className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                        canSubmitNewPassword
                          ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)] cursor-pointer"
                          : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      }`}
                    >
                      {isUpdatingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Updating password...
                        </>
                      ) : (
                        "Reset Password"
                      )}
                    </button>
                  </form>
                </>
              )
            ) : /* ---------- STAGE 1: REQUEST RECOVERY EMAIL ---------- */
            emailSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-emerald-400" />
                </div>
                <h1 className="text-2xl font-bold text-white">
                  Check your inbox
                </h1>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  We&apos;ve sent a password recovery link to{" "}
                  <span className="text-zinc-200 font-medium">{email}</span>.
                  Click the link in the email to choose a new password.
                </p>
                <div className="mt-6 space-y-3">
                  <Link
                    href="/signin"
                    className="w-full inline-flex items-center justify-center py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all"
                  >
                    Return to Sign In
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailSent(false);
                    }}
                    className="w-full py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    Didn&apos;t receive it? Try again
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-7">
                  <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">
                    Account Recovery
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    Reset Password
                  </h1>
                  <p className="mt-2 text-sm text-zinc-400">
                    Enter your registered email and we&apos;ll send you a link
                    to reset your password.
                  </p>
                </div>

                <form onSubmit={handleRequestRecovery} className="space-y-5">
                  {/* Email Input */}
                  <div>
                    <label
                      htmlFor="recovery-email"
                      className="block text-xs font-medium text-zinc-300 mb-1.5"
                    >
                      Email Address
                    </label>
                    <input
                      id="recovery-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
                    />
                  </div>

                  {/* CAPTCHA (Required before requesting email) */}
                  <div>
                    {/* ---------- GOOGLE RECAPTCHA ---------- */}
                    <div className="flex justify-center overflow-hidden rounded-xl bg-zinc-950 border border-zinc-800 py-3">
                      {siteKey ? (
                        <ReCAPTCHA
                          ref={recaptchaRef}
                          sitekey={siteKey}
                          theme="dark"
                          onChange={(token) => setCaptchaToken(token)}
                          onExpired={() => setCaptchaToken(null)}
                          onErrored={() => setCaptchaToken(null)}
                        />
                      ) : (
                        <div className="flex items-center gap-2 py-4 text-xs text-zinc-400">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                          Loading security check...
                        </div>
                      )}
                    </div>
                  </div>

                  {requestError && (
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-300">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{requestError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!canRequestReset}
                    className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                      canRequestReset
                        ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)] cursor-pointer"
                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    }`}
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending reset link...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          {!isRecoveryMode && !emailSent && (
            <p className="mt-6 text-center text-sm text-zinc-400">
              Remembered your password?{" "}
              <Link
                href="/signin"
                className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
              >
                Sign in instead
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

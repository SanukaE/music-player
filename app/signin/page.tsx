"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { account } from "@/lib/appwrite";
import {
  Disc3,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";

type EmailCheckState = "idle" | "invalid" | "checking" | "found" | "not-found";

export default function SignInPage() {
  const router = useRouter();

  const [siteKey, setSiteKey] = useState(
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "",
  );

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Live email registration check
  const [emailStatus, setEmailStatus] = useState<EmailCheckState>("idle");

  // Captcha
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaVerified = Boolean(captchaToken);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (siteKey) return;
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.recaptchaSiteKey) setSiteKey(data.recaptchaSiteKey);
      })
      .catch(() => {});
  }, [siteKey]);

  // ================= LIVE EMAIL CHECK =================
  useEffect(() => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailStatus("idle");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailStatus("invalid");
      return;
    }

    setEmailStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/check-availability?email=${encodeURIComponent(trimmed)}`,
        );
        const data = await res.json();
        // If not available, an account is registered with this email
        setEmailStatus(data.available ? "not-found" : "found");
      } catch {
        setEmailStatus("idle");
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [email]);

  // ================= FORM VALIDITY =================
  const isFormValid =
    emailStatus === "found" && password.length > 0 && captchaVerified;

  // ================= SUBMIT HANDLER =================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const trimmedEmail = email.trim();

      // 1. Authenticate server-side to set the httpOnly `appwrite-session` cookie
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          captchaToken, // <-- Added
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Invalid email or password.");
        recaptchaRef.current?.reset(); // <-- Reset token on failure
        setCaptchaToken(null);
        setIsSubmitting(false);
        return;
      }

      // 2. Sync client-side Appwrite session so header & settings detect login
      try {
        await account.createEmailPasswordSession(trimmedEmail, password);
      } catch {
        // Ignore if a client session is already active
      }

      router.replace("/");
    } catch {
      setSubmitError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  };

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
            href="/"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* ================= SIGN IN CARD ================= */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 w-[620px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full"
        />

        <div className="relative w-full max-w-md">
          <div className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 shadow-2xl">
            <div className="text-center mb-7">
              <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">
                Welcome Back
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Sign In
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Access your albums, playlists, and account settings.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ---------- EMAIL ---------- */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`w-full rounded-xl bg-zinc-950 border px-3.5 py-2.5 pr-10 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition-colors ${
                      emailStatus === "not-found" || emailStatus === "invalid"
                        ? "border-red-500/60 focus:border-red-500"
                        : emailStatus === "found"
                          ? "border-emerald-500/60 focus:border-emerald-500"
                          : "border-zinc-800 focus:border-emerald-500/60"
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailStatus === "checking" && (
                      <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                    )}
                    {emailStatus === "found" && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    {(emailStatus === "not-found" ||
                      emailStatus === "invalid") && (
                      <X className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>

                {emailStatus === "checking" && (
                  <p className="mt-1.5 text-xs text-zinc-500">
                    Checking email...
                  </p>
                )}
                {emailStatus === "found" && (
                  <p className="mt-1.5 text-xs text-emerald-400">
                    Account found.
                  </p>
                )}
                {emailStatus === "not-found" && (
                  <p className="mt-1.5 text-xs text-red-400">
                    No account registered with this email address.
                  </p>
                )}
                {emailStatus === "invalid" && (
                  <p className="mt-1.5 text-xs text-red-400">
                    Please enter a valid email address.
                  </p>
                )}
              </div>

              {/* ---------- PASSWORD ---------- */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-zinc-300"
                  >
                    Password
                  </label>
                  <Link
                    href="/reset-password"
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
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
              </div>

              {/* ---------- CAPTCHA ---------- */}
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

              {/* ---------- SUBMIT ERROR ---------- */}
              {submitError && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* ---------- SIGN IN BUTTON ---------- */}
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  isFormValid && !isSubmitting
                    ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)] cursor-pointer"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>

          {/* ---------- NEW USER SIGN UP LINK ---------- */}
          <p className="mt-6 text-center text-sm text-zinc-400">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/signup"
              className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
            >
              Start Creating
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

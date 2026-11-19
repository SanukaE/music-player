"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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

type AvailabilityState =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid";

export default function SignUpPage() {
  const router = useRouter();

  // Form fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Live availability states
  const [usernameStatus, setUsernameStatus] =
    useState<AvailabilityState>("idle");
  const [emailStatus, setEmailStatus] = useState<AvailabilityState>("idle");

  // Captcha & Legal
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaVerified = Boolean(captchaToken);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ================= LIVE USERNAME AVAILABILITY =================
  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameStatus("idle");
      return;
    }
    if (trimmed.length < 3) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/check-availability?username=${encodeURIComponent(trimmed)}`,
        );
        const data = await res.json();
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [username]);

  // ================= LIVE EMAIL AVAILABILITY =================
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
        setEmailStatus(data.available ? "available" : "taken");
      } catch {
        setEmailStatus("idle");
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [email]);

  // ================= PASSWORD STRENGTH LOGIC =================
  const passwordChecks = useMemo(() => {
    return [
      {
        label: "At least 8 characters",
        met: password.length >= 8,
      },
      {
        label: "Uppercase & lowercase letters",
        met: /[a-z]/.test(password) && /[A-Z]/.test(password),
      },
      {
        label: "At least one number (0-9)",
        met: /\d/.test(password),
      },
      {
        label: "At least one special character (!@#$...)",
        met: /[^A-Za-z0-9]/.test(password),
      },
    ];
  }, [password]);

  const metCriteriaCount = passwordChecks.filter((c) => c.met).length;

  const passwordStrength = useMemo(() => {
    if (!password || metCriteriaCount === 0) return null;
    if (metCriteriaCount === 4) {
      return {
        label: "Excellent",
        textColor: "text-emerald-400",
        barColor: "bg-emerald-400",
        bars: 3,
      };
    }
    if (metCriteriaCount === 3) {
      return {
        label: "Strong",
        textColor: "text-teal-400",
        barColor: "bg-teal-400",
        bars: 2,
      };
    }
    return {
      label: "Moderate",
      textColor: "text-amber-400",
      barColor: "bg-amber-400",
      bars: 1,
    };
  }, [password, metCriteriaCount]);

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  // ================= FORM VALIDITY =================
  const isFormValid =
    usernameStatus === "available" &&
    emailStatus === "available" &&
    metCriteriaCount >= 1 &&
    passwordsMatch &&
    captchaVerified &&
    agreedToTerms;

  // ================= SUBMIT HANDLER =================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/auth/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          captchaToken, // <-- Added
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Could not create account.");
        recaptchaRef.current?.reset(); // <-- Reset token on failure
        setCaptchaToken(null);
        setIsSubmitting(false);
        return;
      }

      // Auto sign-in on the client after account creation
      await account.createEmailPasswordSession(email.trim(), password);
      router.replace("/");
    } catch (error: any) {
      setSubmitError(
        error?.message || "Something went wrong. Please try again.",
      );
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

      {/* ================= SIGN UP CARD ================= */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 w-[620px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full"
        />

        <div className="relative w-full max-w-md">
          <div className="rounded-2xl bg-[#121215] border border-zinc-800/90 p-6 sm:p-8 shadow-2xl">
            <div className="text-center mb-7">
              <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">
                Create Account
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Start Creating
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Build your own albums and share them with a unique UUID.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ---------- USERNAME ---------- */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  Username
                </label>
                <div className="relative">
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Pick a unique username"
                    className={`w-full rounded-xl bg-zinc-950 border px-3.5 py-2.5 pr-10 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition-colors ${
                      usernameStatus === "taken" || usernameStatus === "invalid"
                        ? "border-red-500/60 focus:border-red-500"
                        : usernameStatus === "available"
                          ? "border-emerald-500/60 focus:border-emerald-500"
                          : "border-zinc-800 focus:border-emerald-500/60"
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <AvailabilityIcon status={usernameStatus} />
                  </div>
                </div>
                <AvailabilityMessage
                  status={usernameStatus}
                  field="Username"
                  invalidText="Username must be at least 3 characters."
                />
              </div>

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
                      emailStatus === "taken" || emailStatus === "invalid"
                        ? "border-red-500/60 focus:border-red-500"
                        : emailStatus === "available"
                          ? "border-emerald-500/60 focus:border-emerald-500"
                          : "border-zinc-800 focus:border-emerald-500/60"
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <AvailabilityIcon status={emailStatus} />
                  </div>
                </div>
                <AvailabilityMessage
                  status={emailStatus}
                  field="Email"
                  invalidText="Please enter a valid email address."
                />
              </div>

              {/* ---------- PASSWORD ---------- */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
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

                {/* Live Strength Indicator & Checklist */}
                <div className="mt-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-zinc-400">
                      Password strength (meet at least 1)
                    </span>
                    {passwordStrength && (
                      <span
                        className={`text-xs font-semibold font-mono ${passwordStrength.textColor}`}
                      >
                        {passwordStrength.label}
                      </span>
                    )}
                  </div>

                  {/* 3-Segment Strength Bar */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 3].map((segment) => (
                      <div
                        key={segment}
                        className={`h-1.5 rounded-full transition-colors duration-300 ${
                          passwordStrength && segment <= passwordStrength.bars
                            ? passwordStrength.barColor
                            : "bg-zinc-800"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Live Criteria List */}
                  <ul className="space-y-1.5 pt-0.5">
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
              </div>

              {/* ---------- CONFIRM PASSWORD ---------- */}
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
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

              {/* ---------- CAPTCHA ---------- */}
              <div>
                <div className="flex justify-center overflow-hidden rounded-xl bg-zinc-950 border border-zinc-800 py-3">
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                    theme="dark"
                    onChange={(token) => setCaptchaToken(token)}
                    onExpired={() => setCaptchaToken(null)}
                    onErrored={() => setCaptchaToken(null)}
                  />
                </div>
              </div>

              {/* ---------- TOS & PRIVACY POLICY ---------- */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-emerald-500 cursor-pointer shrink-0"
                />
                <span className="text-xs text-zinc-400 leading-relaxed">
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              {/* ---------- SUBMIT ERROR ---------- */}
              {submitError && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* ---------- START CREATING BUTTON ---------- */}
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
                    Creating account...
                  </>
                ) : (
                  "Start Creating"
                )}
              </button>
            </form>
          </div>

          {/* ---------- EXISTING ACCOUNT LOGIN LINK ---------- */}
          <p className="mt-6 text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
            >
              Sign in instead
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

/* ================= HELPER COMPONENTS ================= */

function AvailabilityIcon({ status }: { status: AvailabilityState }) {
  if (status === "checking") {
    return <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />;
  }
  if (status === "available") {
    return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  }
  if (status === "taken" || status === "invalid") {
    return <X className="w-4 h-4 text-red-400" />;
  }
  return null;
}

function AvailabilityMessage({
  status,
  field,
  invalidText,
}: {
  status: AvailabilityState;
  field: string;
  invalidText: string;
}) {
  if (status === "checking") {
    return (
      <p className="mt-1.5 text-xs text-zinc-500">
        Checking {field.toLowerCase()} availability...
      </p>
    );
  }
  if (status === "available") {
    return (
      <p className="mt-1.5 text-xs text-emerald-400">{field} is available.</p>
    );
  }
  if (status === "taken") {
    return (
      <p className="mt-1.5 text-xs text-red-400">
        This {field.toLowerCase()} is already registered.
      </p>
    );
  }
  if (status === "invalid") {
    return <p className="mt-1.5 text-xs text-red-400">{invalidText}</p>;
  }
  return null;
}

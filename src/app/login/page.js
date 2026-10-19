"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import BrandName from "@/components/BrandName";
import GlobalLoading from "@/components/GlobalLoading";
import { motion, AnimatePresence } from "framer-motion";

import { Suspense } from "react";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotError, setForgotError] = useState("");

  const { user, login, signInWithGoogle, sendPasswordReset, isInitializing } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const reason = searchParams.get("reason");

  const handleGoogleSignIn = async () => {
    setFormError("");
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google Auth error:", error);
      if (error.code === "auth/popup-closed-by-user") {
        // User closed the popup intentionally
      } else if (error.code === "auth/unauthorized-domain") {
        setFormError(`Domain "${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}" is not authorized in Firebase Console. Add it under Firebase Auth -> Settings -> Authorized Domains.`);
      } else if (error.code === "auth/popup-blocked") {
        setFormError("Login popup was blocked by your browser. Please allow popups for localhost and retry.");
      } else {
        setFormError(error.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Regex for internal validation
  const isValidEmailFormat = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  useEffect(() => {
    if (user && !isInitializing) {
      const dest = redirect || (user.role === "admin" ? "/admin" : "/student");
      router.push(dest);
    }
  }, [user, isInitializing, router, redirect]);

  useEffect(() => {
    if (reason === "session_expired") {
      setFormError("Session expired for security. Please log in again.");
    }
  }, [reason]);

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (!isValidEmailFormat(forgotEmail)) {
      setForgotError("Please enter a valid email address.");
      return;
    }

    setForgotLoading(true);
    try {
      await sendPasswordReset(forgotEmail);
      setForgotSuccess(
        "Password reset link sent! Check your inbox and spam folder."
      );
      setForgotEmail("");
    } catch (error) {
      console.error("Forgot Password error:", error);
      const mapping = {
        "auth/user-not-found": "No account found with this email address.",
        "auth/invalid-email": "Invalid email address format.",
        "auth/too-many-requests": "Too many requests. Please try again later.",
      };
      setForgotError(
        mapping[error.code] || "Failed to send reset link. Please try again."
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setEmailError("");
    setPasswordError("");

    if (!isValidEmailFormat(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password, remember);
    } catch (error) {
      console.error("Auth error:", error);
      // Friendly Error Mapping
      const mapping = {
        "auth/invalid-credential":
          "Invalid email or password. Please check your credentials and try again.",
        "auth/user-not-found": "No registered account found with this email.",
        "auth/wrong-password": "Incorrect password. Try again or use Forgot Password.",
        "auth/too-many-requests":
          "Access temporarily disabled due to multiple failed attempts. Please wait a few minutes.",
        "auth/network-request-failed":
          "Network error. Please verify your internet connection.",
      };
      setFormError(
        mapping[error.code] ||
          error.message ||
          "Authentication failed. Please check your credentials.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) return <GlobalLoading />;

  const isFormFilled = email.length > 0 && password.length > 0;
  const isFormValid = isValidEmailFormat(email) && password.length >= 6;

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-surface selection:bg-blue-100">
      <div className="hidden lg:flex flex-col justify-center p-24 bg-brand text-white space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="space-y-4 relative z-10">
          <Logo light={true} className="mb-8 scale-125 origin-left" />
          <h1 className="text-3xl font-black text-white tracking-tight leading-snug">
            Nepal's Premier Smart LMS & Exam Simulation Platform
          </h1>
          <p className="text-base text-blue-100 font-medium max-w-md leading-relaxed">
            Master high-yield syllabi with bite-sized slide notes, untimed topic practice, and realistic timed mock tests.
          </p>
        </div>
        <div className="space-y-4 pt-4">
          <StatItem
            icon="🏛️"
            label="PSC, NEC & NMC Prep"
            sub="Loksewa, Engineering & Medical Licensing"
          />
          <StatItem
            icon="📖"
            label="Topic-by-Topic Slides"
            sub="High-yield notes with formulas & mnemonics"
          />
          <StatItem
            icon="⚡"
            label="Real Exam Simulations"
            sub="Full-set mock tests with all-Nepal rankings"
          />
        </div>
      </div>

      <div className="flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-10"
        >
          <header className="space-y-3">
            <h2 className="text-4xl font-black text-textPrimary tracking-tighter">
              Welcome Back
            </h2>
            <p className="text-textSecondary font-medium">
              Log in to your account to continue your learning journey.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence>
              {formError && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-3"
                >
                  <span>⚠️</span> {formError}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className={`w-full p-4 bg-white border rounded-2xl outline-none transition-all shadow-sm font-medium ${
                    emailError
                      ? "border-rose-500 ring-4 ring-rose-50"
                      : "border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-600"
                  }`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  required
                />
                {emailError && (
                  <p className="text-rose-500 text-[10px] font-bold ml-1">
                    *{emailError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                  Secure Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`w-full p-4 bg-white border rounded-2xl outline-none transition-all shadow-sm font-medium pr-12 ${
                      passwordError
                        ? "border-rose-500 ring-4 ring-rose-50"
                        : "border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-600"
                    }`}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-rose-500 text-[10px] font-bold ml-1">
                    *{passwordError}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <div className="w-5 h-5 bg-white border-2 border-slate-200 rounded-md peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all"></div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 text-white text-[10px]">
                    ✓
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">
                  Remember Me
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={!isFormFilled || isLoading}
              className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 ${
                !isFormValid || isLoading
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none"
                  : "bg-blue-900 text-white hover:bg-blue-950 shadow-lg shadow-blue-900/20 active:scale-[0.98]"
              } disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:shadow-none disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                "Authorize Session"
              )}
            </button>
          </form>

          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <span className="relative px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-background">
              Or Continue With
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-4 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] rounded-2xl font-bold text-sm text-slate-700 shadow-sm transition-all flex items-center justify-center gap-3 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Google</span>
          </button>

          <footer className="pt-8 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-sm font-medium">
              New Candidate?{" "}
              <button
                onClick={() => router.push("/register")}
                className="text-blue-600 font-bold hover:underline"
              >
                Create a free account
              </button>
            </p>
          </footer>
        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!forgotLoading) {
                  setShowForgotPassword(false);
                  setForgotError("");
                  setForgotSuccess("");
                }
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 z-10 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotError("");
                  setForgotSuccess("");
                }}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-50 font-bold"
                disabled={forgotLoading}
              >
                ✕
              </button>

              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-3xl">🔑</span>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    Reset Password
                  </h3>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">
                    Enter your registered email below, and we'll send you a secure link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  {forgotError && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-3">
                      <span>⚠️</span> {forgotError}
                    </div>
                  )}

                  {forgotSuccess && (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 leading-relaxed">
                      <span>✓</span> {forgotSuccess}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all font-medium shadow-sm"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        if (forgotError) setForgotError("");
                      }}
                      required
                      disabled={forgotLoading}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotError("");
                        setForgotSuccess("");
                      }}
                      className="flex-1 py-4 border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 transition-all active:scale-[0.98]"
                      disabled={forgotLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading || !forgotEmail}
                      className="flex-1 py-4 bg-brand text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-brand/20 hover:bg-brand-accent active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      {forgotLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        "Send Link"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<GlobalLoading />}>
      <LoginContent />
    </Suspense>
  );
}

function StatItem({ icon, label, sub }) {
  return (
    <div className="flex gap-4 items-center group">
      <div className="w-14 h-14 bg-brand-accent rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <p className="font-bold text-lg">{label}</p>
        <p className="text-blue-200 text-sm">{sub}</p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Space_Grotesk, Inter } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

const BG_IMAGE = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setInfo("Account created. If email confirmation is required, check your inbox, then log in.");
        setMode("login");
      }
    }

    setLoading(false);
  }

  return (
    <div className={`relative min-h-screen flex items-center justify-center p-6 ${body.className}`}>
      <div
        className="absolute inset-0 bg-cover bg-center blur-sm scale-110"
        style={{ backgroundImage: `url('${BG_IMAGE}')` }}
      />
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl p-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#1F6F64]" />
          <span className="text-xs uppercase tracking-[0.15em] text-[#5B6864] font-medium">
            Decision Support System
          </span>
        </div>

        <h1 className={`text-2xl font-semibold text-[#1A2421] mb-1 ${display.className}`}>
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-[#5B6864] mb-6">
          {mode === "login" ? "Log in to continue weighing your options." : "Set up an account to start tracking decisions."}
        </p>

       <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1A2421] mb-1.5">Email</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              autoComplete="email"
              className="border border-[#D8DDD9] bg-white p-3 rounded-lg w-full text-sm text-[#1A2421] placeholder:text-[#A8B0AC] focus:outline-none focus:ring-2 focus:ring-[#1F6F64]/40 focus:border-[#1F6F64] transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1A2421] mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="At least 6 characters"
              autoComplete="current-password"
              className="border border-[#D8DDD9] bg-white p-3 rounded-lg w-full text-sm text-[#1A2421] placeholder:text-[#A8B0AC] focus:outline-none focus:ring-2 focus:ring-[#1F6F64]/40 focus:border-[#1F6F64] transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-[#A6432F] text-sm bg-[#A6432F]/5 border border-[#A6432F]/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {info && (
            <p className="text-[#1F6F64] text-sm bg-[#1F6F64]/5 border border-[#1F6F64]/20 rounded-lg px-3 py-2">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-[#1A2421] hover:bg-[#1F6F64] disabled:opacity-50 text-white px-4 py-3 rounded-lg w-full transition font-medium text-sm"
          >
            {loading ? "Please wait..." : mode === "login" ? "Log In" : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-sm text-[#5B6864] mt-5">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button onClick={() => setMode("signup")} className="text-[#1F6F64] font-medium underline underline-offset-2">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => setMode("login")} className="text-[#1F6F64] font-medium underline underline-offset-2">
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
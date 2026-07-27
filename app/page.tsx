"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Space_Grotesk, Inter } from "next/font/google";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

type Criteria = { id: string; name: string; weight: number };
type Alternative = { id: string; name: string };
type ScoreMap = Record<string, Record<string, number>>;
type Breakdown = { critName: string; contribution: number };
type ResultItem = { id: string; name: string; score: number; breakdown: Breakdown[] };

const BG_IMAGE = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee";
const STEPS = ["Criteria", "Options", "Scores", "Result"];

function Scale({
  value,
  onChange,
  size = "md",
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-lg border border-[#D8DDD9] overflow-hidden bg-white">
      {[1, 2, 3, 4, 5].map((v, i) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`${size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"} flex items-center justify-center font-medium transition ${
            value === v ? "bg-[#1F6F64] text-white" : "bg-white text-[#5B6864] hover:bg-[#EEF1EF]"
          } ${i !== 0 ? "border-l border-[#D8DDD9]" : ""}`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function StepRuler({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const isDone = n < step;
          const isCurrent = n === step;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition ${
                    isDone
                      ? "bg-[#1A2421] text-white"
                      : isCurrent
                      ? "bg-[#1F6F64] text-white ring-4 ring-[#1F6F64]/15"
                      : "bg-white border border-[#D8DDD9] text-[#5B6864]"
                  }`}
                >
                  {n}
                </div>
                <span
                  className={`text-[11px] uppercase tracking-wide whitespace-nowrap ${
                    isCurrent ? "text-[#1A2421] font-semibold" : "text-[#5B6864]"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 mx-2 mb-4 ${isDone ? "bg-[#1A2421]" : "bg-[#D8DDD9]"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);

  const [title, setTitle] = useState("");
  const [criteria, setCriteria] = useState<Criteria[]>([]);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [scores, setScores] = useState<ScoreMap>({});
  const [result, setResult] = useState<ResultItem[]>([]);

  const [criteriaName, setCriteriaName] = useState("");
  const [weight, setWeight] = useState(3);
  const [altName, setAltName] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [warning, setWarning] = useState("");

  // Only CHECKS session for display purposes here — does NOT redirect.
  // The landing page is public; only starting the wizard requires login.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUserEmail(data.session.user.email ?? null);
        setHasSession(true);
      }
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setHasSession(false);
        setUserEmail(null);
        // If they were mid-wizard and got signed out, send them to login
        if (started) router.push("/login");
      } else {
        setHasSession(true);
        setUserEmail(session.user.email ?? null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [router, started]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setStarted(false);
    router.push("/login");
  }

  function handleStart() {
    if (!hasSession) {
      router.push("/login");
      return;
    }
    setStarted(true);
  }

  function addCriteria() {
    if (!criteriaName.trim()) return;
    setCriteria([...criteria, { id: crypto.randomUUID(), name: criteriaName.trim(), weight }]);
    setCriteriaName("");
    setWeight(3);
  }

  function removeCriteria(id: string) {
    setCriteria(criteria.filter((c) => c.id !== id));
  }

  function addAlternative() {
    if (!altName.trim()) return;
    setAlternatives([...alternatives, { id: crypto.randomUUID(), name: altName.trim() }]);
    setAltName("");
  }

  function removeAlternative(id: string) {
    setAlternatives(alternatives.filter((a) => a.id !== id));
  }

  function setScore(altId: string, critId: string, value: number) {
    setScores({
      ...scores,
      [altId]: {
        ...scores[altId],
        [critId]: value,
      },
    });
  }

  function isFullyScored() {
    return alternatives.every((alt) =>
      criteria.every((c) => scores?.[alt.id]?.[c.id] !== undefined)
    );
  }

  async function calculate() {
    if (!isFullyScored()) {
      setWarning("Please score every option against every criterion before calculating.");
      return;
    }
    setWarning("");

    const totalWeight = criteria.reduce((s, c) => s + c.weight, 0) || 1;

    const res: ResultItem[] = alternatives.map((alt) => {
      let total = 0;
      const breakdown: Breakdown[] = [];

      criteria.forEach((c) => {
        const s = scores?.[alt.id]?.[c.id] || 0;
        const contribution = Number((s * (c.weight / totalWeight)).toFixed(2));
        total += contribution;
        breakdown.push({ critName: c.name, contribution });
      });

      return { id: alt.id, name: alt.name, score: Number(total.toFixed(2)), breakdown };
    });

    res.sort((a, b) => b.score - a.score);
    setResult(res);
    setStep(4);
    await saveDecision(res);
  }

  function generateExplanation(res: ResultItem[]): string {
    if (res.length === 0) return "";

    const winner = res[0];
    const topCriteria = [...winner.breakdown].sort((a, b) => b.contribution - a.contribution)[0];

    let text = `"${winner.name}" wins because it scored highest on "${topCriteria.critName}".`;

    if (res.length > 1) {
      const runnerUp = res[1];
      const diff = (winner.score - runnerUp.score).toFixed(2);
      text += ` It beats "${runnerUp.name}" by ${diff} points.`;
    }

    return text;
  }

  async function saveDecision(res: ResultItem[]) {
    setSaving(true);
    setSaveError("");

    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;

    if (!userId) {
      setSaveError("No active session found. Please log in again.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("decisions").insert({
      user_id: userId,
      title: title.trim() || "Untitled Decision",
      criteria,
      alternatives,
      scores,
      result: res,
    });

    if (error) {
      setSaveError("Could not save this decision: " + error.message);
    }
    setSaving(false);
  }

  function resetAll() {
    setStarted(false);
    setStep(1);
    setTitle("");
    setCriteria([]);
    setAlternatives([]);
    setScores({});
    setResult([]);
    setWarning("");
    setSaveError("");
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#5B6864]">
        Loading...
      </div>
    );
  }

  if (!started) {
    return (
      <div className={`relative min-h-screen flex items-center justify-center text-center ${body.className}`}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${BG_IMAGE}')` }}
        />
        <div className="absolute inset-0 bg-black/40" />

        <div className="absolute top-6 right-6 flex gap-5 text-sm z-10">
          {hasSession ? (
            <>
              <Link href="/history" className="text-white font-medium hover:opacity-80 transition">
                History
              </Link>
              <button onClick={handleLogout} className="text-white/80 hover:text-white transition">
                Log out
              </button>
            </>
          ) : (
            <Link href="/login" className="text-white font-medium hover:opacity-80 transition">
              Log in
            </Link>
          )}
        </div>

        <div className="relative px-6 max-w-2xl text-white">
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-[#5FCFC0]" />
            <span className="text-xs uppercase tracking-[0.2em] text-white/80 font-medium">
              Weighted Decision Engine
            </span>
          </div>

          <h1 className={`text-5xl md:text-6xl font-semibold mb-5 leading-tight ${display.className}`}>
            Decision Support System
          </h1>
          <p className="text-lg text-white/85 mb-2 max-w-lg mx-auto">
            Score your options against what actually matters to you, and let the numbers make the case.
          </p>
          {hasSession && userEmail && <p className="text-sm text-white/60 mb-10">Signed in as {userEmail}</p>}

          <button
            onClick={handleStart}
            className="bg-[#1F6F64] hover:bg-[#18564D] text-white px-9 py-3.5 rounded-lg text-base font-medium transition mt-6"
          >
            {hasSession ? "Start a decision →" : "Get started →"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen flex items-center justify-center p-6 md:p-10 ${body.className}`}>
      <div
        className="absolute inset-0 bg-cover bg-center blur-sm scale-110"
        style={{ backgroundImage: `url('${BG_IMAGE}')` }}
      />
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl p-8 md:p-10">
        <div className="flex justify-between items-center mb-7">
          <h1 className={`text-xl font-semibold text-[#1A2421] ${display.className}`}>
            Decision Support System
          </h1>
          <div className="flex gap-4 text-sm">
            <Link href="/history" className="text-[#1F6F64] hover:underline underline-offset-2">
              History
            </Link>
            <button onClick={handleLogout} className="text-[#5B6864] hover:text-[#1A2421] transition">
              Log out
            </button>
          </div>
        </div>

        <StepRuler step={step} />

        {step === 1 && (
          <div>
            <h2 className={`text-lg font-semibold mb-4 text-[#1A2421] ${display.className}`}>
              Name this decision, then add criteria
            </h2>

            <input
              className="border border-[#D8DDD9] p-3 rounded-lg w-full mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6F64]/40 focus:border-[#1F6F64] transition"
              placeholder="Decision title — e.g. Buy Phone vs Save Money"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <input
              className="border border-[#D8DDD9] p-3 rounded-lg w-full mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6F64]/40 focus:border-[#1F6F64] transition"
              placeholder="Criteria — e.g. Cost, Battery Life, Performance"
              value={criteriaName}
              onChange={(e) => setCriteriaName(e.target.value)}
            />

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-[#5B6864]">Importance (weight)</span>
              <Scale value={weight} onChange={setWeight} />
            </div>

            <button
              onClick={addCriteria}
              className="bg-[#1A2421] hover:bg-[#1F6F64] text-white px-4 py-3 rounded-lg w-full transition text-sm font-medium"
            >
              Add criteria
            </button>

            <ul className="mb-6 mt-4 space-y-1.5">
              {criteria.map((c) => (
                <li
                  key={c.id}
                  className="flex justify-between items-center text-sm text-[#1A2421] bg-[#EEF1EF] px-3 py-2.5 rounded-lg"
                >
                  <span>
                    {c.name} <span className="text-[#5B6864]">· weight {c.weight}</span>
                  </span>
                  <button onClick={() => removeCriteria(c.id)} className="text-[#A6432F] hover:opacity-70 text-xs font-medium">
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <button
              disabled={criteria.length < 2}
              onClick={() => setStep(2)}
              className="bg-[#1F6F64] hover:bg-[#1A2421] disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg w-full transition text-sm font-medium"
            >
              {criteria.length < 2 ? "Add at least 2 criteria to continue" : "Continue →"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className={`text-lg font-semibold mb-4 text-[#1A2421] ${display.className}`}>
              Add the options you&apos;re comparing
            </h2>

            <input
              className="border border-[#D8DDD9] p-3 rounded-lg w-full mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6F64]/40 focus:border-[#1F6F64] transition"
              placeholder="Option — e.g. Laptop A, Laptop B"
              value={altName}
              onChange={(e) => setAltName(e.target.value)}
            />

            <button
              onClick={addAlternative}
              className="bg-[#1A2421] hover:bg-[#1F6F64] text-white px-4 py-3 rounded-lg w-full mb-4 text-sm font-medium transition"
            >
              Add option
            </button>

            <ul className="mb-6 space-y-1.5">
              {alternatives.map((a) => (
                <li
                  key={a.id}
                  className="flex justify-between items-center text-sm text-[#1A2421] bg-[#EEF1EF] px-3 py-2.5 rounded-lg"
                >
                  <span>{a.name}</span>
                  <button onClick={() => removeAlternative(a.id)} className="text-[#A6432F] hover:opacity-70 text-xs font-medium">
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex justify-between gap-3">
              <button
                onClick={() => setStep(1)}
                className="border border-[#D8DDD9] text-[#1A2421] hover:bg-[#EEF1EF] px-4 py-2.5 rounded-lg text-sm font-medium transition"
              >
                ← Back
              </button>
              <button
                disabled={alternatives.length < 2}
                onClick={() => setStep(3)}
                className="flex-1 bg-[#1F6F64] hover:bg-[#1A2421] disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
              >
                {alternatives.length < 2 ? "Add at least 2 options" : "Continue →"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className={`text-lg font-semibold mb-5 text-[#1A2421] ${display.className}`}>
              Score every option
            </h2>

            <div className="space-y-5 max-h-96 overflow-y-auto pr-1">
              {alternatives.map((alt) => (
                <div key={alt.id} className="bg-[#EEF1EF] p-4 rounded-xl">
                  <h3 className="font-semibold text-sm text-[#1A2421] mb-3">{alt.name}</h3>

                  {criteria.map((c) => (
                    <div key={c.id} className="flex items-center justify-between mb-2.5 last:mb-0">
                      <span className="text-sm text-[#5B6864]">{c.name}</span>
                      <Scale
                        size="sm"
                        value={scores?.[alt.id]?.[c.id]}
                        onChange={(v) => setScore(alt.id, c.id, v)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {warning && (
              <p className="text-[#A6432F] text-sm mt-4 bg-[#A6432F]/5 border border-[#A6432F]/20 rounded-lg px-3 py-2">
                {warning}
              </p>
            )}

            <div className="flex justify-between gap-3 mt-6">
              <button
                onClick={() => setStep(2)}
                className="border border-[#D8DDD9] text-[#1A2421] hover:bg-[#EEF1EF] px-4 py-2.5 rounded-lg text-sm font-medium transition"
              >
                ← Back
              </button>
              <button
                onClick={calculate}
                className="flex-1 bg-[#1A2421] hover:bg-[#1F6F64] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition"
              >
                Calculate result →
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className={`text-lg font-semibold mb-4 text-[#1A2421] ${display.className}`}>
              Result
            </h2>

            <div className="bg-[#1F6F64]/10 border border-[#1F6F64]/25 rounded-xl p-4 mb-6 text-sm text-[#1A2421] leading-relaxed">
              {generateExplanation(result)}
            </div>

            <div className="w-full h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D8DDD9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#5B6864" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#5B6864" }} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#1F6F64" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {result.map((r, i) => (
                <div
                  key={r.id}
                  className={`flex justify-between items-center p-3.5 rounded-xl ${
                    i === 0 ? "bg-[#C68A2E]/10 border border-[#C68A2E]/30" : "bg-[#EEF1EF]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[#5B6864] w-6">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={`text-sm ${i === 0 ? "font-semibold text-[#1A2421]" : "text-[#1A2421]"}`}>
                      {r.name}
                    </span>
                    {i === 0 && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-[#C68A2E] bg-[#C68A2E]/15 px-2 py-0.5 rounded">
                        Top pick
                      </span>
                    )}
                  </div>
                  <span className={`text-sm font-mono ${i === 0 ? "font-semibold text-[#1A2421]" : "text-[#5B6864]"}`}>
                    {r.score}
                  </span>
                </div>
              ))}
            </div>

            {saving && <p className="text-sm text-[#5B6864] mt-4">Saving...</p>}
            {saveError && <p className="text-sm text-[#A6432F] mt-4">{saveError}</p>}
            {!saving && !saveError && (
              <p className="text-sm text-[#1F6F64] mt-4">Saved to your decision history.</p>
            )}

            <div className="flex justify-between gap-3 mt-6">
              <button
                onClick={() => setStep(3)}
                className="border border-[#D8DDD9] text-[#1A2421] hover:bg-[#EEF1EF] px-4 py-2.5 rounded-lg text-sm font-medium transition"
              >
                ← Back
              </button>
              <button
                onClick={resetAll}
                className="flex-1 bg-[#1A2421] hover:bg-[#1F6F64] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
              >
                Start a new decision
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
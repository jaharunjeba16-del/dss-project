"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Space_Grotesk, Inter } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

const BG_IMAGE = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee";

type Decision = {
  id: string;
  title: string;
  criteria: any[];
  alternatives: any[];
  scores: any;
  result: { id: string; name: string; score: number }[];
  created_at: string;
};

export default function HistoryPage() {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("decisions")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDecisions(data as Decision[]);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    await supabase.from("decisions").delete().eq("id", id);
    setDecisions(decisions.filter((d) => d.id !== id));
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
            Decision History
          </h1>
          <Link href="/" className="text-[#1F6F64] text-sm hover:underline underline-offset-2">
            ← Back
          </Link>
        </div>

        {loading && <p className="text-[#5B6864] text-sm">Loading...</p>}

        {!loading && decisions.length === 0 && (
          <p className="text-[#5B6864] text-sm">No decisions saved yet. Once you calculate a result, it will appear here.</p>
        )}

        <div className="space-y-3">
          {decisions.map((d) => (
            <div key={d.id} className="bg-[#EEF1EF] rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm text-[#1A2421]">{d.title}</p>
                  <p className="text-xs text-[#5B6864] mt-0.5">
                    {new Date(d.created_at).toLocaleString()}
                  </p>
                  {d.result?.[0] && (
                    <p className="text-xs mt-1.5">
                      <span className="uppercase tracking-wide font-semibold text-[#C68A2E]">Top pick</span>
                      <span className="text-[#1A2421]"> · {d.result[0].name} ({d.result[0].score})</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-3 text-xs font-medium">
                  <button
                    onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                    className="text-[#1F6F64] hover:underline underline-offset-2"
                  >
                    {expandedId === d.id ? "Hide" : "Details"}
                  </button>
                  <button onClick={() => handleDelete(d.id)} className="text-[#A6432F] hover:underline underline-offset-2">
                    Delete
                  </button>
                </div>
              </div>

              {expandedId === d.id && (
                <div className="mt-3 space-y-1.5">
                  {d.result.map((r, i) => (
                    <div
                      key={r.id}
                      className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm ${
                        i === 0 ? "bg-[#C68A2E]/10 border border-[#C68A2E]/30 font-semibold" : "bg-white"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[#5B6864]">{String(i + 1).padStart(2, "0")}</span>
                        {r.name}
                      </span>
                      <span className="font-mono text-xs">{r.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
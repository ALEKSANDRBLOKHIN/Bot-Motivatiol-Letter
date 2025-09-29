import { useEffect, useMemo, useState } from "react";
import "./index.css";

import {
  autoFill as apiAutoFill,
  letterFromUrl,
  type AutoFill,
  type Lang,
  type Tone,
  type Length,
} from "./api";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState<Lang>("fr");
  const [profile, setProfile] = useState<AutoFill | null>(null);
  const [profileText, setProfileText] = useState<string>("");
  const [loadingAutoFill, setLoadingAutoFill] = useState(false);

  const [jobUrl, setJobUrl] = useState("");
  const [tone, setTone] = useState<Tone>("formal");
  const [length, setLength] = useState<Length>("medium");
  const [letter, setLetter] = useState<string>("");
  const [loadingLetter, setLoadingLetter] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("profile");
    if (saved) {
      try {
        const obj = JSON.parse(saved) as AutoFill;
        setProfile(obj);
        setProfileText(JSON.stringify(obj, null, 2));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (profile) {
      setProfileText(JSON.stringify(profile, null, 2));
      localStorage.setItem("profile", JSON.stringify(profile));
    }
  }, [profile]);

  async function handleAutoFill() {
    if (!file) return alert("Choose a file (PDF/DOCX/TXT)");
    setLoadingAutoFill(true);
    try {
      const res = await apiAutoFill(file, lang);
      setProfile(res);
    } catch (e: any) {
      alert(e?.message || "Error calling /cv/auto-fill");
    } finally {
      setLoadingAutoFill(false);
    }
  }

  const parsedProfile = useMemo<{
    ok: boolean;
    data?: AutoFill;
    error?: string;
  }>(() => {
    if (!profileText.trim()) return { ok: false, error: "Profile is empty" };
    try {
      const obj = JSON.parse(profileText);
      obj.skills ||= [];
      obj.experience ||= [];
      obj.education ||= [];
      return { ok: true, data: obj };
    } catch (e: any) {
      return { ok: false, error: "Invalid JSON: " + e.message };
    }
  }, [profileText]);

  async function handleGenerateLetter() {
    if (!parsedProfile.ok || !parsedProfile.data) {
      return alert(parsedProfile.error || "Fix the profile JSON");
    }
    if (!jobUrl.trim()) return alert("Insert a job posting link");
    setLoadingLetter(true);
    setLetter("");
    try {
      const res = await letterFromUrl({
        job_url: jobUrl.trim(),
        profile: parsedProfile.data,
        language: lang,
        tone,
        length,
      });
      setLetter(res.cover_letter || "");
    } catch (e: any) {
      alert(e?.message || "Error calling /letter/from-url");
    } finally {
      setLoadingLetter(false);
    }
  }

  function downloadTxt() {
    if (!letter) return;
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cover_letter.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            CoverBot <span className="text-blue-600">MVP</span>
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Upload CV → auto-profile → job-tailored letter
          </p>
        </div>
      </header>

      <section className="card p-6 md:p-8 mb-8">
        <h2 className="section-title mb-4">
          1) Upload CV → <span className="text-blue-600">/cv/auto-fill</span>
        </h2>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="file"
            className="field max-w-xs file:mr-4 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-300 dark:file:bg-slate-700 dark:hover:file:bg-slate-600"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="field max-w-[120px]"
          >
            <option value="ru">ru</option>
            <option value="en">en</option>
            <option value="fr">fr</option>
            <option value="es">es</option>
          </select>

          <button
            onClick={handleAutoFill}
            disabled={loadingAutoFill}
            className="btn-primary"
          >
            {loadingAutoFill ? "Extracting…" : "Extract profile"}
          </button>
        </div>

        <div className="mt-6">
          <label className="field-label">Profile (editable JSON)</label>
          <textarea
            value={profileText}
            onChange={(e) => setProfileText(e.target.value)}
            className="field h-64 font-mono text-sm"
            placeholder={`{\n  "name": "...",\n  "email": "...",\n  "phone": "...",\n  "skills": [],\n  "experience": [],\n  "education": []\n}`}
          />
          {!parsedProfile.ok && (
            <div className="mt-2 text-sm font-medium text-rose-600">
              {parsedProfile.error}
            </div>
          )}
        </div>
      </section>

      <section className="card p-6 md:p-8">
        <h2 className="section-title mb-4">
          2) Job posting link →{" "}
          <span className="text-blue-600">/letter/from-url</span>
        </h2>

        <div className="grid gap-4">
          <input
            placeholder="https://…"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            className="field"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium">Language:</span>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                className="field max-w-[120px]"
              >
                <option value="ru">ru</option>
                <option value="en">en</option>
                <option value="fr">fr</option>
                <option value="es">es</option>
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span className="text-sm font-medium">Tone:</span>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
                className="field max-w-[140px]"
              >
                <option value="formal">formal</option>
                <option value="friendly">friendly</option>
                <option value="concise">concise</option>
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span className="text-sm font-medium">Length:</span>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value as Length)}
                className="field max-w-[140px]"
              >
                <option value="short">short</option>
                <option value="medium">medium</option>
                <option value="long">long</option>
              </select>
            </label>

            <div className="sm:ml-auto">
              <button
                onClick={handleGenerateLetter}
                disabled={loadingLetter || !parsedProfile.ok}
                className="btn-primary"
              >
                {loadingLetter ? "Generating…" : "Generate letter"}
              </button>
            </div>
          </div>
        </div>

        {letter && (
          <div className="mt-6">
            <h3 className="mb-2 text-lg font-semibold">Result</h3>
            <textarea
              value={letter}
              readOnly
              className="field h-64 font-serif"
            />
            <div className="mt-3 flex gap-3">
              <button
                className="btn-ghost"
                onClick={() => navigator.clipboard.writeText(letter)}
              >
                Copy
              </button>
              <button className="btn-ghost" onClick={downloadTxt}>
                Download .txt
              </button>
            </div>
          </div>
        )}
      </section>

      <footer className="mt-10 text-center text-sm text-slate-500 dark:text-slate-400">
        Built with FastAPI + React + Tailwind
      </footer>
    </main>
  );
}

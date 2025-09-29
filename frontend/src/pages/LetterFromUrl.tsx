import { useEffect, useState } from "react";
import { letterFromUrl, type AutoFill, type Lang, type Tone, type Length } from "../api";
import { Link } from "react-router-dom";

export default function LetterFromUrl() {
  const [lang, setLang] = useState<Lang>("fr");
  const [tone, setTone] = useState<Tone>("formal");
  const [length, setLength] = useState<Length>("medium");
  const [jobUrl, setJobUrl] = useState("");
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState<AutoFill | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("profile");
    if (saved) {
      try {
        const p = JSON.parse(saved) as AutoFill;
        p.skills ||= []; p.experience ||= []; p.education ||= [];
        setProfile(p);
      } catch {}
    }
  }, []);

  async function handleGenerate() {
    if (!profile) return alert("Profile is empty. Fill it on the CV page first.");
    if (!jobUrl.trim()) return alert("Insert a job posting link");
    setLoading(true);
    setLetter("");
    try {
      const res = await letterFromUrl({
        job_url: jobUrl.trim(),
        profile,
        language: lang,
        tone,
        length,
      });
      setLetter(res.cover_letter || "");
    } catch (e: any) {
      alert(e?.message || "Error calling /letter/from-url");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card p-6 md:p-8">
      <h2 className="section-title mb-4">
        2) Job posting link → <span className="text-blue-600">/letter/from-url</span>
      </h2>

      {!profile && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
          Profile is empty. Go to the <Link to="/cv" className="underline font-medium">CV page</Link> and fill it first.
        </div>
      )}

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
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="field max-w-[120px]">
              <option value="ru">ru</option>
              <option value="en">en</option>
              <option value="fr">fr</option>
              <option value="es">es</option>
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="text-sm font-medium">Tone:</span>
            <select value={tone} onChange={(e) => setTone(e.target.value as Tone)} className="field max-w-[140px]">
              <option value="formal">formal</option>
              <option value="friendly">friendly</option>
              <option value="concise">concise</option>
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="text-sm font-medium">Length:</span>
            <select value={length} onChange={(e) => setLength(e.target.value as Length)} className="field max-w-[140px]">
              <option value="short">short</option>
              <option value="medium">medium</option>
              <option value="long">long</option>
            </select>
          </label>

          <div className="sm:ml-auto">
            <button
              onClick={handleGenerate}
              disabled={loading || !profile}
              className="btn-primary"
            >
              {loading ? "Generating…" : "Generate letter"}
            </button>
          </div>
        </div>

        <div className="mt-6">
          <label className="field-label">Result</label>
          <textarea
            className="w-full min-h-[520px] resize-y rounded-lg border border-slate-300 p-4 font-serif text-base shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
            readOnly
            value={letter}
            placeholder="The generated letter will appear here…"
          />
          {letter && (
            <div className="mt-3 flex gap-3">
              <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(letter)}>
                Copy
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "cover_letter.txt";
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
              >
                Download .txt
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

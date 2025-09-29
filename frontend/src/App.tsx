import { useEffect, useMemo, useState } from "react";
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
      } catch (e) {}
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
    <div style={{ maxWidth: 980, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>CoverBot (MVP)</h1>

      <section style={{ marginTop: 20, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
        <h2>1) Upload CV → /cv/auto-fill</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            <option value="ru">ru</option>
            <option value="en">en</option>
            <option value="fr">fr</option>
            <option value="es">es</option>
          </select>
          <button onClick={handleAutoFill} disabled={loadingAutoFill}>
            {loadingAutoFill ? "Extracting…" : "Extract profile"}
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
            Profile (editable JSON)
          </label>
          <textarea
            value={profileText}
            onChange={(e) => setProfileText(e.target.value)}
            style={{ width: "100%", height: 260 }}
            placeholder={`{\n  "name": "...",\n  "email": "...",\n  "phone": "...",\n  "skills": [],\n  "experience": [],\n  "education": []\n}`}
          />
          {!parsedProfile.ok && (
            <div style={{ color: "#b10", marginTop: 6 }}>{parsedProfile.error}</div>
          )}
        </div>
      </section>

      <section style={{ marginTop: 20, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
        <h2>2) Job posting link → /letter/from-url</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <input
            placeholder="https://…"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            style={{ padding: 8 }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label>
              Language:&nbsp;
              <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
                <option value="ru">ru</option>
                <option value="en">en</option>
                <option value="fr">fr</option>
                <option value="es">es</option>
              </select>
            </label>
            <label>
              Tone:&nbsp;
              <select value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="formal">formal</option>
                <option value="friendly">friendly</option>
                <option value="concise">concise</option>
              </select>
            </label>
            <label>
              Length:&nbsp;
              <select value={length} onChange={(e) => setLength(e.target.value as Length)}>
                <option value="short">short</option>
                <option value="medium">medium</option>
                <option value="long">long</option>
              </select>
            </label>
          </div>
          <button onClick={handleGenerateLetter} disabled={loadingLetter || !parsedProfile.ok}>
            {loadingLetter ? "Generating…" : "Generate letter"}
          </button>
        </div>

        {letter && (
          <div style={{ marginTop: 12 }}>
            <h3>Result</h3>
            <textarea value={letter} readOnly style={{ width: "100%", height: 260 }} />
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button onClick={() => navigator.clipboard.writeText(letter)}>Copy</button>
              <button onClick={downloadTxt}>Download .txt</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

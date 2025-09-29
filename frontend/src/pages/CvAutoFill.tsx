import { useEffect, useState } from "react";
import { autoFill as apiAutoFill, type AutoFill, type Lang } from "../api";

export default function CvAutoFill() {
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState<Lang>("fr");
  const [loadingAutoFill, setLoadingAutoFill] = useState(false);

  const [profile, setProfile] = useState<AutoFill>({
    name: "",
    email: "",
    phone: "",
    skills: [],
    experience: [],
    education: [],
  });

  useEffect(() => {
    const saved = localStorage.getItem("profile");
    if (saved) {
      try { setProfile(JSON.parse(saved) as AutoFill); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("profile", JSON.stringify(profile));
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

  return (
    <section className="card p-6 md:p-8">
      <h2 className="section-title mb-4">
        1) Upload CV → <span className="text-blue-600">/cv/auto-fill</span>
      </h2>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          type="file"
          className="field max-w-xs file:mr-4 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-300"
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

        <button onClick={handleAutoFill} disabled={loadingAutoFill} className="btn-primary">
          {loadingAutoFill ? "Extracting…" : "Extract profile"}
        </button>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-slate-600">Full name</label>
          <input
            type="text"
            className="field"
            value={profile.name || ""}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-slate-600">Email</label>
          <input
            type="email"
            className="field"
            value={profile.email || ""}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          />
        </div>

        <div className="flex flex-col sm:col-span-2">
          <label className="mb-1 text-sm font-medium text-slate-600">Phone</label>
          <input
            type="text"
            className="field"
            value={profile.phone || ""}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
        </div>

        <div className="flex flex-col sm:col-span-2">
          <label className="mb-1 text-sm font-medium text-slate-600">Skills (comma separated)</label>
          <textarea
            className="field"
            value={profile.skills.join(", ")}
            onChange={(e) =>
              setProfile({
                ...profile,
                skills: e.target.value.split(",").map((s) => s.trim()),
              })
            }
          />
        </div>

        <div className="flex flex-col sm:col-span-2">
          <label className="mb-1 text-sm font-medium text-slate-600">Experience (one per line)</label>
          <textarea
            className="field"
            value={profile.experience.join("\n")}
            onChange={(e) =>
              setProfile({
                ...profile,
                experience: e.target.value.split("\n"),
              })
            }
          />
        </div>

        <div className="flex flex-col sm:col-span-2">
          <label className="mb-1 text-sm font-medium text-slate-600">Education (one per line)</label>
          <textarea
            className="field"
            value={profile.education.join("\n")}
            onChange={(e) =>
              setProfile({
                ...profile,
                education: e.target.value.split("\n"),
              })
            }
          />
        </div>
      </div>
    </section>
  );
}

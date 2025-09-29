const BASE = "http://127.0.0.1:8000";

export type Lang = "ru" | "en" | "fr" | "es";
export type Tone = "formal" | "friendly" | "concise";
export type Length = "short" | "medium" | "long";

export type AutoFill = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  skills: string[];
  experience: string[];
  education: string[];
};

export async function autoFill(file: File, language: Lang) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("language", language);
  const r = await fetch(`${BASE}/cv/auto-fill`, { method: "POST", body: fd });
  if (!r.ok) throw new Error(await r.text());
  return (await r.json()) as AutoFill;
}

export async function letterFromUrl(payload: {
  job_url: string;
  profile: AutoFill;
  language: Lang;
  tone: Tone;
  length: Length;
}) {
  const r = await fetch(`${BASE}/letter/from-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return await r.json();
}

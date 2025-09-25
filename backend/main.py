from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from enum import Enum
import io, os, json, re, ipaddress
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from openai import OpenAI


app = FastAPI(title="CoverBot API")
# при необходимости CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class AutoFill(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: List[str] = []
    experience: List[str] = []
    education: List[str] = []

class Lang(str, Enum):
    ru = "ru"
    en = "en"
    fr = "fr"
    es = "es"

class Tone(str, Enum):
    formal = "formal"
    friendly = "friendly"
    concise = "concise"

class Length(str, Enum):
    short = "short"
    medium = "medium"
    long = "long"

class LetterFromUrlRequest(BaseModel):
    job_url: HttpUrl
    profile: AutoFill
    language: Lang = Lang.ru
    tone: Tone = Tone.formal
    length: Length = Length.medium

class LetterOut(BaseModel):
    cover_letter: str
    job_excerpt: Optional[str] = None


def extract_text_from_upload(filename: str, content: bytes) -> str:
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(413, "File too large (>8MB)")
    ext = (filename or "").lower()
    try:
        if ext.endswith(".pdf"):
            from pdfminer.high_level import extract_text
            return extract_text(io.BytesIO(content)) or ""
        elif ext.endswith(".docx"):
            import docx2txt
            return docx2txt.process(io.BytesIO(content)) or ""
        else:
            return content.decode("utf-8", errors="ignore")
    except Exception as e:
        raise HTTPException(400, f"Cannot parse file: {e}")

def _norm_str(s: Optional[str]) -> Optional[str]:
    s = (s or "").strip()
    return s or None

def _norm_list(xs: Optional[List[str]]) -> List[str]:
    seen, out = set(), []
    for x in xs or []:
        x = (x or "").strip()
        if x and x not in seen:
            seen.add(x); out.append(x)
    return out

_PRIVATE_NETS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

def _host_forbidden(host: str) -> bool:
    try:
        ip = ipaddress.ip_address(host)
        return any(ip in net for net in _PRIVATE_NETS)
    except ValueError:
        return host.lower() in {"localhost"}

def fetch_job_text(url: str, max_bytes: int = 2_000_000) -> str:
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        raise HTTPException(400, "Only http/https URLs are allowed")
    if not p.hostname or _host_forbidden(p.hostname):
        raise HTTPException(400, "URL host is not allowed")

    headers = {"User-Agent": "Mozilla/5.0 (CoverBot/1.0)"}
    try:
        with requests.get(url, headers=headers, timeout=10, stream=True) as r:
            r.raise_for_status()
            total = 0
            chunks = []
            for chunk in r.iter_content(8192):
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    break
                chunks.append(chunk)
            html = b"".join(chunks).decode(r.encoding or "utf-8", errors="ignore")
    except requests.RequestException as e:
        raise HTTPException(502, f"Fetch error: {e}")

    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.extract()
    text = soup.get_text(separator="\n")
    text = re.sub(r"[ \t]{2,}", " ", text)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    return "\n".join(lines)[:8000]


@app.post("/cv/auto-fill", response_model=AutoFill)
async def cv_auto_fill(file: UploadFile = File(...), language: Lang = Lang.ru):
    raw = await file.read()
    cv_text = extract_text_from_upload(file.filename, raw)
    if not cv_text.strip():
        raise HTTPException(400, "Empty CV text")

    system = (
        "Ты извлекаешь поля анкеты из резюме. НИЧЕГО не выдумывай. "
        "Если информации нет — оставь null (для строк) или пустой список []. "
        "Верни СТРОГО валидный JSON со СХЕМОЙ: "
        "{name: string|null, email: string|null, phone: string|null, "
        " skills: string[], experience: string[], education: string[]}. "
        "Не добавляй лишних полей и комментариев."
    )
    user = (
        f"Target language: {language}. Если переформулируешь пункты (experience/education), "
        f"пиши на языке {language}. Вот текст резюме:\n\n{cv_text}"
    )

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            temperature=0.0,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            timeout=30,
        )
        data = json.loads(resp.choices[0].message.content)
    except Exception as e:
        raise HTTPException(502, f"AI call failed: {e}")

    return AutoFill(
        name=_norm_str(data.get("name")),
        email=_norm_str(data.get("email")),
        phone=_norm_str(data.get("phone")),
        skills=_norm_list(data.get("skills")),
        experience=_norm_list(data.get("experience")),
        education=_norm_list(data.get("education")),
    )

@app.post("/letter/from-url", response_model=LetterOut)
def letter_from_url(req: LetterFromUrlRequest):
    job_text = fetch_job_text(str(req.job_url))
    if not job_text:
        raise HTTPException(400, "Job page seems empty or unreadable")

    target_len = {
        "short": "≈120–160 слов",
        "medium": "≈180–250 слов",
        "long": "≈300–400 слов",
    }[req.length.value]

    system = (
        "Ты карьерный ассистент. Сгенерируй мотивационное письмо под указанную вакансию, "
        "опираясь ТОЛЬКО на профиль кандидата (JSON) и текст вакансии. "
        "Не выдумывай фактов..."
    )


    profile_json = json.dumps(req.profile.model_dump(), ensure_ascii=False, indent=2)

    user = (
        f"Язык письма: {req.language}. Тон: {req.tone}. Длина: {target_len}.\n\n"
        f"Профиль кандидата (JSON):\n{profile_json}\n\n"
        f"Описание вакансии (выжимка с сайта):\n{job_text}\n\n"
        "Верни ТОЛЬКО текст письма, без JSON и без комментариев."
    )

    try:
        r = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.4,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        letter = (r.choices[0].message.content or "").strip().strip("`")
        if not letter:
            raise HTTPException(502, "Empty AI response")
        return LetterOut(cover_letter=letter, job_excerpt=job_text[:700])
    except Exception as e:
        raise HTTPException(502, f"AI call failed: {e}")

from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from enum import Enum
import io, os, json
from openai import OpenAI

app = FastAPI()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ----- модели ответа -----
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

# ----- утилиты -----
def extract_text_from_upload(filename: str, content: bytes) -> str:
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(413, "File too large (>8MB)")
    name = (filename or "").lower()
    try:
        if name.endswith(".pdf"):
            from pdfminer.high_level import extract_text
            return extract_text(io.BytesIO(content)) or ""
        elif name.endswith(".docx"):
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

# ----- эндпоинт -----
@app.post("/cv/auto-fill", response_model=AutoFill)
async def cv_auto_fill(file: UploadFile = File(...), language: Lang = Lang.ru):
    raw = await file.read()
    cv_text = extract_text_from_upload(file.filename, raw)
    if not cv_text.strip():
        raise HTTPException(400, "Empty CV text")

    system = (
        "Ты извлекаешь поля анкеты из резюме. НИЧЕГО не выдумывай. "
        "Если информации нет — оставь null (для строк) или пустой список []. "
        "Верни СТРОГО валидный JSON со СХЕМОЙ:\n"
        "{"
        "  name: string|null, email: string|null, phone: string|null, "
        "  skills: string[], experience: string[], education: string[]"
        "}\n"
        "Не добавляй лишних полей и комментариев."
    )
    user = (
        f"Target language: {language}. Если переформулируешь пункты (experience/education), "
        f"пиши на языке {language}. Вот текст резюме:\n\n{cv_text}"
    )

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},  # строго JSON
            temperature=0.0,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        data = json.loads(resp.choices[0].message.content)
    except Exception as e:
        raise HTTPException(502, f"AI call failed: {e}")

    # нормализация результата: пустые строки -> null, списки очищаем
    return AutoFill(
        name=_norm_str(data.get("name")),
        email=_norm_str(data.get("email")),
        phone=_norm_str(data.get("phone")),
        skills=_norm_list(data.get("skills")),
        experience=_norm_list(data.get("experience")),
        education=_norm_list(data.get("education")),
    )

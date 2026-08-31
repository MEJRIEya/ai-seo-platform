from urllib.parse import urlparse
import re

def normalize_domain(raw: str) -> str:
    if raw is None:
        raise ValueError("Domaine invalide")

    text = str(raw).strip().lower()
    if not text:
        raise ValueError("Domaine invalide")

    text = text.split()[0]
    text = re.sub(r"^https?://", "", text)
    text = re.sub(r"^//", "", text)
    text = text.split("/")[0]
    text = text.split("?")[0]
    text = text.split("#")[0]
    text = text.split(":")[0]

    if text.startswith("www."):
        text = text[4:]

    text = text.strip().rstrip(".")

    # Au moins un point (ex: site.com, a.co, sub.domain.org)
    if "." not in text or len(text) < 3:
        raise ValueError("Domaine invalide")

    # Caractères hostname classiques
    if not re.fullmatch(r"[a-z0-9]([a-z0-9\-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]*[a-z0-9])?)+", text):
        raise ValueError("Domaine invalide")

    return text
# AI SEO Platform

Plateforme d’analyse SEO en quasi temps réel : Google Search Console, Google Analytics 4, Core Web Vitals et recommandations IA.

**Stack**
- Backend : FastAPI, SQLAlchemy async, PostgreSQL, Redis, Celery
- Frontend : Next.js (App Router), TypeScript, Tailwind CSS
- Auth : JWT + Google OAuth
- Architecture : modular monolith

---

## Prérequis

| Outil | Version recommandée |
|--------|---------------------|
| Git | 2.x |
| Python | 3.11 ou 3.12 (3.13 possible) |
| Node.js | 20+ |
| Docker + Docker Compose | recommandé |
| Compte Google Cloud | OAuth + APIs GSC / GA4 |

Vérification rapide (Windows PowerShell) :

```powershell
git --version
python --version
node --version
docker --version
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import google ,auth_google , auth

# Import des routers
from app.routers.auth import router as auth_router




app = FastAPI(
    title="AI SEO Platform",
    description="Plateforme d'analyse SEO avec IA en quasi temps réel",
    version="0.1.0",
    docs_url="/docs"
)

app.include_router(google.router)
app.include_router(auth.router)
app.include_router(auth_google.router)




# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "✅ AI SEO Platform Backend is running!",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}




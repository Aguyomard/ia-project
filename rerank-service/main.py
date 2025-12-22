"""
Service de reranking avec Cross-Encoder (bge-reranker)

Ce service reçoit une requête et une liste de documents,
puis les re-score avec un modèle cross-encoder pour une
pertinence plus précise que la similarité cosinus.
"""

import os
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import CrossEncoder

# Configuration
MODEL_NAME = os.getenv("RERANK_MODEL", "BAAI/bge-reranker-base")
DEFAULT_TOP_K = int(os.getenv("DEFAULT_TOP_K", "3"))

# Initialisation FastAPI
app = FastAPI(
    title="Rerank Service",
    description="Cross-encoder reranking pour RAG",
    version="1.0.0",
)

# Chargement du modèle au démarrage
print(f"📦 Loading reranker model: {MODEL_NAME}")
model: Optional[CrossEncoder] = None


@app.on_event("startup")
async def load_model():
    """Charge le modèle au démarrage du serveur."""
    global model
    try:
        model = CrossEncoder(MODEL_NAME, max_length=512)
        print(f"✅ Model loaded successfully: {MODEL_NAME}")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        raise


# === Types ===


class Document(BaseModel):
    """Document à reranker."""

    id: int
    content: str


class RerankRequest(BaseModel):
    """Requête de reranking."""

    query: str
    documents: list[Document]
    top_k: int = DEFAULT_TOP_K


class RerankResult(BaseModel):
    """Résultat pour un document."""

    id: int
    score: float
    content: str


class RerankResponse(BaseModel):
    """Réponse du reranking."""

    results: list[RerankResult]
    model: str


# === Endpoints ===


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "model_loaded": model is not None,
    }


@app.post("/rerank", response_model=RerankResponse)
async def rerank(request: RerankRequest):
    """
    Rerank les documents par rapport à la requête.

    Le cross-encoder analyse chaque paire (query, document)
    et retourne un score de pertinence.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    if not request.documents:
        return RerankResponse(results=[], model=MODEL_NAME)

    # Préparer les paires (query, document)
    pairs = [(request.query, doc.content) for doc in request.documents]

    # Scorer avec le cross-encoder
    try:
        scores = model.predict(pairs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

    # Créer les résultats avec scores
    results = []
    for doc, score in zip(request.documents, scores):
        results.append(
            RerankResult(
                id=doc.id,
                score=float(score),
                content=doc.content,
            )
        )

    # Trier par score décroissant et limiter
    results.sort(key=lambda x: x.score, reverse=True)
    top_results = results[: request.top_k]

    print(
        f"🔄 Reranked {len(request.documents)} docs → top {len(top_results)} "
        f"(scores: {[f'{r.score:.3f}' for r in top_results]})"
    )

    return RerankResponse(results=top_results, model=MODEL_NAME)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)




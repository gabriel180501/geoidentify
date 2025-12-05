import json
from pathlib import Path
from typing import Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import PredictRequest, PredictResponse, CountryResult

# Caminho do arquivo de conhecimento
BASE_DIR = Path(__file__).resolve().parent
KB_PATH = BASE_DIR / "knowledge_base.json"


def load_knowledge_base():
    """Carrega a base de conhecimento em JSON."""
    with KB_PATH.open("r", encoding="utf-8") as f:
        kb = json.load(f)
    return kb


# Carrega na inicialização do app
KB = load_knowledge_base()
COUNTRIES: List[str] = KB["countries"]
FEATURES: Dict[str, dict] = KB["features"]
CATEGORIES: Dict[str, list] = KB["categories"]

app = FastAPI(title="GeoIdentify API")

# CORS liberado pro frontend local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # em produção você restringe
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/features")
def get_features():
    """
    Retorna as categorias e opções de características
    para o frontend montar a interface.
    """
    return {"categories": CATEGORIES}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if not req.selected_features:
        raise HTTPException(
            status_code=400,
            detail="Selecione ao menos uma característica."
        )

    # Inicializa pontuação dos países
    scores: Dict[str, float] = {c: 0.0 for c in COUNTRIES}

    # Soma pesos por país com base nas features selecionadas
    for feat_id in req.selected_features:
        feat = FEATURES.get(feat_id)
        if not feat:
            # ignora feature desconhecida (poderia logar)
            continue
        for country, w in feat["weights"].items():
            scores[country] = scores.get(country, 0.0) + float(w)

    total_score = sum(scores.values())
    if total_score <= 0:
        raise HTTPException(
            status_code=422,
            detail="Não foi possível calcular probabilidade com essas características."
        )

    # Converte para probabilidade
    results: List[CountryResult] = []
    for country, score in scores.items():
        prob = score / total_score
        results.append(
            CountryResult(
                country=country,
                probability=prob,
                score=score
            )
        )

    # Ordena pela probabilidade (desc) e pega top 10
    results.sort(key=lambda r: r.probability, reverse=True)
    top_results = results[:10]

    # Explicação pro top-1
    top1 = top_results[0]
    explanation: Dict[str, float] = {}
    for feat_id in req.selected_features:
        feat = FEATURES.get(feat_id)
        if not feat:
            continue
        weight = feat["weights"].get(top1.country)
        if weight:
            explanation[feat_id] = float(weight)

    return PredictResponse(
        top_countries=top_results,
        top_country_explanation=explanation
    )

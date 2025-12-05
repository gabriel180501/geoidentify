from pydantic import BaseModel
from typing import List, Dict


class PredictRequest(BaseModel):
    selected_features: List[str]


class CountryResult(BaseModel):
    country: str
    probability: float
    score: float


class PredictResponse(BaseModel):
    top_countries: List[CountryResult]
    top_country_explanation: Dict[str, float]

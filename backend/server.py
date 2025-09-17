from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import requests
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# TMDB Configuration
TMDB_API_KEY = os.environ.get('TMDB_API_KEY', 'placeholder_key')
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class Movie(BaseModel):
    id: int
    title: str
    overview: str
    poster_path: Optional[str] = None
    release_date: Optional[str] = None
    vote_average: float = 0.0
    poster_url: Optional[str] = None

class MovieSearchResponse(BaseModel):
    results: List[Movie]
    total_results: int

class MovieNetworkResponse(BaseModel):
    central_movie: Movie
    related_movies: List[Movie]

# Helper functions for TMDB API
def get_movie_poster_url(poster_path: Optional[str]) -> Optional[str]:
    if poster_path:
        return f"{TMDB_IMAGE_BASE_URL}{poster_path}"
    return None

async def search_movies_tmdb(query: str, page: int = 1) -> dict:
    """Search for movies using TMDB API"""
    if TMDB_API_KEY == 'placeholder_key':
        # Return mock data when no API key is available
        return {
            "results": [
                {
                    "id": 550,
                    "title": "Clube da Luta",
                    "overview": "Um insonista e um vendedor de sabão canalizam a agressão masculina em uma nova forma de terapia.",
                    "poster_path": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
                    "release_date": "1999-10-15",
                    "vote_average": 8.4
                },
                {
                    "id": 13,
                    "title": "Forrest Gump", 
                    "overview": "Um homem com QI baixo conseguiu grandes coisas em sua vida e esteve presente durante eventos históricos significativos.",
                    "poster_path": "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
                    "release_date": "1994-06-23",
                    "vote_average": 8.5
                }
            ],
            "total_results": 2
        }
    
    url = f"{TMDB_BASE_URL}/search/movie"
    params = {
        "api_key": TMDB_API_KEY,
        "query": query,
        "page": page,
        "language": "pt-BR"
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logging.error(f"Erro na API TMDB: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar dados do filme")

async def get_movie_recommendations_tmdb(movie_id: int) -> dict:
    """Get movie recommendations from TMDB API"""
    if TMDB_API_KEY == 'placeholder_key':
        # Return mock recommendations
        mock_recommendations = [
            {"id": 807, "title": "Se7en", "overview": "Dois detetives de homicídio estão em uma caça desesperada por um serial killer.", "poster_path": "/6yoghtyTpznpBik8EngEmJskVUO.jpg", "release_date": "1995-09-22", "vote_average": 8.3},
            {"id": 155, "title": "Batman: O Cavaleiro das Trevas", "overview": "Batman eleva as apostas em sua guerra contra o crime.", "poster_path": "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", "release_date": "2008-07-18", "vote_average": 9.0},
            {"id": 497, "title": "À Espera de um Milagre", "overview": "Uma história sobrenatural passada no corredor da morte em uma prisão do sul.", "poster_path": "/velWPhVMQeQKcxggNEU8YmIo52R.jpg", "release_date": "1999-12-10", "vote_average": 8.5},
            {"id": 680, "title": "Pulp Fiction", "overview": "Um assassino que adora hambúrgueres, seu parceiro filosófico e a mulher de um gângster viciado em drogas.", "poster_path": "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", "release_date": "1994-09-10", "vote_average": 8.9},
            {"id": 73, "title": "A Outra História Americana", "overview": "Um ex-skinhead neonazista tenta impedir que seu irmão mais novo siga o mesmo caminho errado.", "poster_path": "/fXepRAYOx1qC3wju7XdDGx60775.jpg", "release_date": "1998-07-01", "vote_average": 8.3},
            {"id": 769, "title": "Os Bons Companheiros", "overview": "A história de Henry Hill e sua vida na máfia.", "poster_path": "/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg", "release_date": "1990-09-12", "vote_average": 8.7},
            {"id": 278, "title": "Um Sonho de Liberdade", "overview": "Dois homens presos se unem ao longo dos anos.", "poster_path": "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg", "release_date": "1994-09-23", "vote_average": 9.3},
            {"id": 240, "title": "O Poderoso Chefão", "overview": "O patriarca idoso de uma dinastia do crime organizado transfere o controle para seu filho reluctante.", "poster_path": "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg", "release_date": "1972-03-14", "vote_average": 9.2}
        ]
        return {"results": mock_recommendations[:8]}
    
    url = f"{TMDB_BASE_URL}/movie/{movie_id}/recommendations"
    params = {
        "api_key": TMDB_API_KEY,
        "page": 1,
        "language": "pt-BR"
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logging.error(f"Erro na API TMDB: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar recomendações")

async def get_movie_details_tmdb(movie_id: int) -> dict:
    """Get detailed movie information from TMDB API"""
    if TMDB_API_KEY == 'placeholder_key':
        # Return mock movie details
        mock_movies = {
            550: {"id": 550, "title": "Clube da Luta", "overview": "Um insonista e um vendedor de sabão canalizam a agressão masculina em uma nova forma de terapia.", "poster_path": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", "release_date": "1999-10-15", "vote_average": 8.4},
            13: {"id": 13, "title": "Forrest Gump", "overview": "Um homem com QI baixo conseguiu grandes coisas em sua vida e esteve presente durante eventos históricos significativos.", "poster_path": "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg", "release_date": "1994-06-23", "vote_average": 8.5}
        }
        return mock_movies.get(movie_id, mock_movies[550])
    
    url = f"{TMDB_BASE_URL}/movie/{movie_id}"
    params = {
        "api_key": TMDB_API_KEY,
        "language": "pt-BR"
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logging.error(f"Erro na API TMDB: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar detalhes do filme")

# Movie API Routes
@api_router.get("/movies/search", response_model=MovieSearchResponse)
async def search_movies(query: str, page: int = 1):
    """Search for movies"""
    data = await search_movies_tmdb(query, page)
    
    movies = []
    for movie_data in data.get("results", []):
        movie = Movie(
            id=movie_data["id"],
            title=movie_data["title"],
            overview=movie_data["overview"],
            poster_path=movie_data.get("poster_path"),
            release_date=movie_data.get("release_date"),
            vote_average=movie_data.get("vote_average", 0.0),
            poster_url=get_movie_poster_url(movie_data.get("poster_path"))
        )
        movies.append(movie)
    
    return MovieSearchResponse(
        results=movies,
        total_results=data.get("total_results", 0)
    )

@api_router.get("/movies/{movie_id}/network", response_model=MovieNetworkResponse)
async def get_movie_network(movie_id: int):
    """Get a movie and its related movies for network visualization"""
    # Get central movie details
    central_movie_data = await get_movie_details_tmdb(movie_id)
    central_movie = Movie(
        id=central_movie_data["id"],
        title=central_movie_data["title"],
        overview=central_movie_data["overview"],
        poster_path=central_movie_data.get("poster_path"),
        release_date=central_movie_data.get("release_date"),
        vote_average=central_movie_data.get("vote_average", 0.0),
        poster_url=get_movie_poster_url(central_movie_data.get("poster_path"))
    )
    
    # Get recommendations
    recommendations_data = await get_movie_recommendations_tmdb(movie_id)
    
    related_movies = []
    for movie_data in recommendations_data.get("results", [])[:8]:  # Limit to 8 related movies
        movie = Movie(
            id=movie_data["id"],
            title=movie_data["title"],
            overview=movie_data["overview"],
            poster_path=movie_data.get("poster_path"),
            release_date=movie_data.get("release_date"),
            vote_average=movie_data.get("vote_average", 0.0),
            poster_url=get_movie_poster_url(movie_data.get("poster_path"))
        )
        related_movies.append(movie)
    
    return MovieNetworkResponse(
        central_movie=central_movie,
        related_movies=related_movies
    )

# Original routes
@api_router.get("/")
async def root():
    return {"message": "CineMap API - Descoberta Interativa de Filmes"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
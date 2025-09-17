import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await axios.get(`${API}/movies/search?query=${encodeURIComponent(query)}`);
      setResults(response.data.results);
      setHasSearched(true);
    } catch (error) {
      console.error("Erro ao buscar filmes:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMovieClick = (movieId) => {
    navigate(`/network/${movieId}`);
  };

  const getMovieYear = (releaseDate) => {
    return releaseDate ? new Date(releaseDate).getFullYear() : "Desconhecido";
  };

  return (
    <div className="search-container">
      <div className="search-header">
        <h1 className="search-title">CineMap</h1>
        <p className="search-subtitle">
          Descubra filmes através de uma rede interativa de conexões. Pesquise qualquer filme e explore seu universo cinematográfico.
        </p>
      </div>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Pesquisar um filme..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-button" disabled={loading}>
          {loading ? "Buscando..." : "Explorar"}
        </button>
      </form>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      )}

      {hasSearched && !loading && (
        <div className="search-results">
          {results.length > 0 ? (
            <>
              <h2 style={{ color: "rgba(255, 255, 255, 0.9)", marginBottom: "1rem", textAlign: "center" }}>
                Encontrados {results.length} resultados
              </h2>
              <div className="results-grid">
                {results.map((movie) => (
                  <div
                    key={movie.id}
                    className="movie-card"
                    onClick={() => handleMovieClick(movie.id)}
                  >
                    {movie.poster_url ? (
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        className="movie-poster"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div 
                        className="movie-poster"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.3), rgba(78, 205, 196, 0.3))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontSize: '0.9rem'
                        }}
                      >
                        Sem Imagem
                      </div>
                    )}
                    <h3 className="movie-title">{movie.title}</h3>
                    <p className="movie-overview">{movie.overview}</p>
                    <div className="movie-meta">
                      <span className="movie-year">{getMovieYear(movie.release_date)}</span>
                      <span className="movie-rating">★ {movie.vote_average?.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", color: "rgba(255, 255, 255, 0.7)" }}>
              <h3>Nenhum filme encontrado</h3>
              <p>Tente pesquisar com um título diferente</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
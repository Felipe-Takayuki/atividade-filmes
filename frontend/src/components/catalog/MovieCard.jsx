import React, { useState } from 'react';

export function MovieCard({ movie, onToggleFavorite, onOpenComments }) {
  const [imageError, setImageError] = useState(false);

  const hasPoster = movie.poster_url && !imageError;
  const isFavorite = Boolean(movie.is_favorite);

  return (
    <div className="movie-card" data-movie-id={movie.id}>
      <div className="poster-container">
        {hasPoster ? (
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="movie-poster"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="poster-fallback">
            <span className="poster-fallback-icon">🎬</span>
            <span>Sem pôster</span>
          </div>
        )}

        {/* Ambient Gradient Overlay */}
        <div className="poster-overlay" />

        {movie.vote_average > 0 && (
          <div className="badge-rating" title={`Nota TMDB: ${movie.vote_average.toFixed(1)}/10`}>
            <span>⭐</span>
            <span>{movie.vote_average.toFixed(1)}</span>
          </div>
        )}

        {movie.release_year && movie.release_year !== 'N/A' && (
          <div className="badge-year">{movie.release_year}</div>
        )}
      </div>

      <div className="movie-details">
        <h3 className="movie-title" title={movie.title}>
          {movie.title}
        </h3>
        {movie.character && (
          <div className="movie-character" title={`Papel: ${movie.character}`}>
            <span>🎭</span>
            <span>{movie.character}</span>
          </div>
        )}
        <p className="movie-synopsis" title={movie.overview}>
          {movie.overview || 'Sinopse não informada pelo TMDB.'}
        </p>

        <div className="movie-actions">
          <button
            className={`btn-action btn-fav ${isFavorite ? 'is-favorite' : ''}`}
            title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            onClick={() => onToggleFavorite(movie)}
          >
            <span className="btn-icon">{isFavorite ? '⭐' : '☆'}</span>
            <span className="btn-text">{isFavorite ? 'Favorito' : 'Favoritar'}</span>
          </button>

          <button
            className="btn-action btn-comments"
            title="Ver ou adicionar comentários sobre o filme"
            onClick={() => onOpenComments(movie)}
          >
            <span className="btn-icon">💬</span>
            <span className="btn-text">Notas</span>
            <span className="badge comments-badge">{movie.comments_count || 0}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

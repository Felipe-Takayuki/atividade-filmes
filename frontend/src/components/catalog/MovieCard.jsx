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

        {movie.vote_average > 0 && (
          <div className="badge-rating">⭐ {movie.vote_average.toFixed(1)}</div>
        )}

        {movie.release_year && movie.release_year !== 'N/A' && (
          <div className="badge-year">{movie.release_year}</div>
        )}
      </div>

      <div className="movie-details">
        <h3 className="movie-title">{movie.title}</h3>
        {movie.character && (
          <div className="movie-character">🎭 {movie.character}</div>
        )}
        <p className="movie-synopsis">{movie.overview}</p>

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
            title="Ver ou adicionar anotações"
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

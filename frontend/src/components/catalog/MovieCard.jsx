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
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="2" y1="7" x2="7" y2="7" />
              <line x1="2" y1="17" x2="7" y2="17" />
              <line x1="17" y1="17" x2="22" y2="17" />
              <line x1="17" y1="7" x2="22" y2="7" />
            </svg>
            <span>Sem pôster</span>
          </div>
        )}

        <div className="poster-overlay" />

        {movie.vote_average > 0 && (
          <div className="badge-rating" title={`Avaliação: ${movie.vote_average.toFixed(1)}/10`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
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
            <span>como {movie.character}</span>
          </div>
        )}
        <p className="movie-synopsis" title={movie.overview}>
          {movie.overview || 'Sinopse indisponível no momento.'}
        </p>

        <div className="movie-actions">
          <button
            className={`btn-action btn-fav ${isFavorite ? 'is-favorite' : ''}`}
            title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            onClick={() => onToggleFavorite(movie)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="btn-text">{isFavorite ? 'Favorito' : 'Favoritar'}</span>
          </button>

          <button
            className="btn-action btn-comments"
            title="Ver ou adicionar comentários sobre o filme"
            onClick={() => onOpenComments(movie)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="btn-text">Notas</span>
            <span className="badge comments-badge">{movie.comments_count || 0}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

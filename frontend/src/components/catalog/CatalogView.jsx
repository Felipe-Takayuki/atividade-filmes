import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { FilterControls } from './FilterControls';
import { MovieCard } from './MovieCard';
import { EmptyState } from './EmptyState';
import { CommentsModal } from './CommentsModal';

export function CatalogView() {
  const { showToast } = useToast();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'favorites'
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('year-desc');
  const [activeModalMovie, setActiveModalMovie] = useState(null);

  const loadMovies = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMovies(forceRefresh);
      setMovies(data.movies || []);
    } catch (err) {
      console.error('Erro ao carregar catálogo:', err);
      setError(err.message || 'Falha ao buscar catálogo de filmes na TMDB.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  const handleToggleFavorite = async (movie) => {
    const isCurrentlyFav = Boolean(movie.is_favorite);

    // Atualização otimista no estado local
    setMovies((prev) =>
      prev.map((m) => (m.id === movie.id ? { ...m, is_favorite: !isCurrentlyFav } : m))
    );

    try {
      if (isCurrentlyFav) {
        await api.removeFavorite(movie.id);
        showToast(`"${movie.title}" removido dos favoritos.`, 'info');
      } else {
        await api.addFavorite(movie);
        showToast(`"${movie.title}" adicionado aos favoritos!`, 'success');
      }
    } catch (err) {
      // Reverte em caso de erro
      setMovies((prev) =>
        prev.map((m) => (m.id === movie.id ? { ...m, is_favorite: isCurrentlyFav } : m))
      );
      showToast(err.message || 'Erro ao atualizar favoritos.', 'error');
    }
  };

  const handleCommentsCountChange = useCallback((movieId, count) => {
    setMovies((prev) =>
      prev.map((m) => (m.id === movieId ? { ...m, comments_count: count } : m))
    );
  }, []);

  // Filtragem e Ordenação
  const filteredAndSortedMovies = useMemo(() => {
    let list = [...movies];

    // 1. Filtro por Aba
    if (filter === 'favorites') {
      list = list.filter((m) => m.is_favorite);
    }

    // 2. Filtro por Busca de Texto
    const term = search.toLowerCase().trim();
    if (term) {
      list = list.filter((m) => {
        const matchTitle = m.title?.toLowerCase().includes(term);
        const matchOriginal = m.original_title?.toLowerCase().includes(term);
        const matchChar = m.character?.toLowerCase().includes(term);
        const matchOverview = m.overview?.toLowerCase().includes(term);
        return matchTitle || matchOriginal || matchChar || matchOverview;
      });
    }

    // 3. Ordenação
    list.sort((a, b) => {
      if (sort === 'year-desc') {
        const yearA = parseInt(a.release_year, 10) || 0;
        const yearB = parseInt(b.release_year, 10) || 0;
        return yearB - yearA;
      }
      if (sort === 'year-asc') {
        const yearA = parseInt(a.release_year, 10) || 0;
        const yearB = parseInt(b.release_year, 10) || 0;
        return yearA - yearB;
      }
      if (sort === 'rating-desc') {
        return (b.vote_average || 0) - (a.vote_average || 0);
      }
      if (sort === 'title-asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });

    return list;
  }, [movies, filter, search, sort]);

  const allCount = movies.length;
  const favCount = movies.filter((m) => m.is_favorite).length;

  return (
    <main id="app-view" className="view app-section">
      <div className="container">
        {/* Welcome & Filter Bar */}
        <section className="catalog-header">
          <div className="catalog-title-area">
            <h2 className="catalog-heading">
              Filmes com <span className="text-gold">Tom Hanks</span>
            </h2>
            <p className="catalog-subheading">
              Pôsteres, títulos e sinopses carregados ao vivo da API TMDB
            </p>
          </div>

          <FilterControls
            filter={filter}
            onFilterChange={setFilter}
            allCount={allCount}
            favCount={favCount}
            search={search}
            onSearchChange={setSearch}
            onClearSearch={() => setSearch('')}
            sort={sort}
            onSortChange={setSort}
          />
        </section>

        {/* Status / Alerts */}
        {error && (
          <div id="catalog-alert" className="alert alert-danger">
            Aviso: {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div id="loading-state" className="loading-state">
            <div className="spinner" />
            <p>Consultando a API da TMDB e seu banco MariaDB...</p>
          </div>
        )}

        {/* Content */}
        {!loading && filteredAndSortedMovies.length === 0 && (
          <EmptyState filter={filter} search={search} />
        )}

        {!loading && filteredAndSortedMovies.length > 0 && (
          <div id="movies-grid" className="movies-grid">
            {filteredAndSortedMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onToggleFavorite={handleToggleFavorite}
                onOpenComments={setActiveModalMovie}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de Comentários */}
      {activeModalMovie && (
        <CommentsModal
          movie={activeModalMovie}
          onClose={() => setActiveModalMovie(null)}
          onCommentsCountChange={handleCommentsCountChange}
        />
      )}
    </main>
  );
}

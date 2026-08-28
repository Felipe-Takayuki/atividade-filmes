import React from 'react';

export function FilterControls({
  filter,
  onFilterChange,
  allCount,
  favCount,
  search,
  onSearchChange,
  onClearSearch,
  sort,
  onSortChange
}) {
  return (
    <div className="controls-bar">
      {/* View Tabs (Todos / Favoritos) */}
      <div className="filter-tabs">
        <button
          id="filter-all"
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => onFilterChange('all')}
        >
          <span className="icon">🎬</span>
          <span>Todos os Filmes</span>
          <span id="badge-all-count" className="counter-badge">
            {allCount}
          </span>
        </button>
        <button
          id="filter-favorites"
          className={`filter-btn ${filter === 'favorites' ? 'active' : ''}`}
          onClick={() => onFilterChange('favorites')}
        >
          <span className="icon">⭐</span>
          <span>Meus Favoritos</span>
          <span id="badge-fav-count" className="counter-badge">
            {favCount}
          </span>
        </button>
      </div>

      {/* Search and Sort */}
      <div className="search-sort-group">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            id="input-search"
            className="form-control search-input"
            placeholder="Buscar por título ou personagem..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search.trim() !== '' && (
            <button
              id="btn-clear-search"
              className="btn-clear"
              title="Limpar busca"
              onClick={onClearSearch}
            >
              ×
            </button>
          )}
        </div>

        <div className="sort-box">
          <select
            id="select-sort"
            className="form-control sort-select"
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="year-desc">Mais recentes primeiro</option>
            <option value="year-asc">Mais antigos primeiro</option>
            <option value="rating-desc">Melhor avaliação TMDB</option>
            <option value="title-asc">Título (A-Z)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

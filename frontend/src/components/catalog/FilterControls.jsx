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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill={filter === 'favorites' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span>Meus Favoritos</span>
          <span id="badge-fav-count" className="counter-badge">
            {favCount}
          </span>
        </button>
      </div>

      {/* Search and Sort */}
      <div className="search-sort-group">
        <div className="search-box">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            id="input-search"
            className="form-control search-input"
            placeholder="Buscar título ou personagem..."
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
              &times;
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
            <option value="year-desc">Mais recentes</option>
            <option value="year-asc">Mais antigos</option>
            <option value="rating-desc">Melhor avaliação</option>
            <option value="title-asc">Título (A-Z)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

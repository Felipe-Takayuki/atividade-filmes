import React from 'react';

export function EmptyState({ filter, search }) {
  const isFavorites = filter === 'favorites';
  const title = isFavorites ? 'Nenhum filme favoritado' : 'Nenhum filme encontrado';
  const desc = isFavorites
    ? 'Clique na estrela ⭐ de qualquer filme para adicioná-lo aos seus favoritos.'
    : search
    ? `Nenhum resultado para a busca "${search}".`
    : 'Tente ajustar seus termos de busca ou filtros.';

  return (
    <div id="empty-state" className="empty-state">
      <span className="empty-icon">🍿</span>
      <h3 id="empty-title" className="empty-title">
        {title}
      </h3>
      <p id="empty-desc" className="empty-desc">
        {desc}
      </p>
    </div>
  );
}

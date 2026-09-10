import React from 'react';

export function EmptyState({ filter, search }) {
  const isFavorites = filter === 'favorites';
  const title = isFavorites ? 'Nenhum filme favoritado ainda' : 'Nenhum filme encontrado';
  const desc = isFavorites
    ? 'Clique na estrela ⭐ de qualquer filme do catálogo para salvá-lo na sua lista de favoritos.'
    : search
    ? `Nenhum resultado correspondente a "${search}". Tente outro título ou personagem.`
    : 'Tente ajustar seus termos de busca ou filtros de ordenação.';

  return (
    <div id="empty-state" className="empty-state">
      <span className="empty-icon">{isFavorites ? '⭐' : '🍿'}</span>
      <h3 id="empty-title" className="empty-title">
        {title}
      </h3>
      <p id="empty-desc" className="empty-desc">
        {desc}
      </p>
    </div>
  );
}

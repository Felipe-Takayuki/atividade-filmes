import React from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { ToastContainer } from './components/common/ToastContainer';
import { AuthView } from './components/auth/AuthView';
import { CatalogView } from './components/catalog/CatalogView';

export function App() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <>
      <Navbar />

      {loading ? (
        <div className="view loading-screen">
          <div className="spinner" />
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Carregando catálogo...</p>
        </div>
      ) : isAuthenticated ? (
        <CatalogView />
      ) : (
        <AuthView />
      )}

      <ToastContainer />
    </>
  );
}

export default App;

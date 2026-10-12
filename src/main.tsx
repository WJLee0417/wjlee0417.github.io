import React, { Suspense, lazy, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Header, Footer } from './ui';
import Home from './pages/Home';
import ProjectDetail from './pages/ProjectDetail';
import { data } from './data';
import './styles.css';

const LazyExplorer = lazy(() => import('./pages/Explorer'));
export { LazyExplorer };

function ScrollManager() {
  const { pathname, hash, search } = useLocation();
  useEffect(() => {
    const target = hash?.slice(1) || (pathname === '/' && search ? 'explore' : '');
    if (target) {
      const timer = window.setTimeout(() => document.getElementById(target)?.scrollIntoView(), 80);
      return () => window.clearTimeout(timer);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
}

function NotFound() {
  return <main className="wrap missing"><p className="eyebrow">404 / NOT FOUND</p><h1>페이지를 찾을 수 없습니다.</h1><a className="text-link" href="#/">홈으로 돌아가기 ↗</a></main>;
}

function App() {
  return <HashRouter>
    <ScrollManager />
    <Header />
    <Routes>
      <Route path="/" element={<Home explorer={<Suspense fallback={<div className="explorer-loading">탐색 모델을 불러오는 중입니다.</div>}><LazyExplorer /></Suspense>} />} />
      <Route path="/projects/:slug" element={<ProjectDetail />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    <Footer />
  </HashRouter>;
}

document.documentElement.lang = data.meta.locale.slice(0, 2);
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

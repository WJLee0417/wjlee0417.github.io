import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import PortfolioDeck from './pages/Deck';
import { data } from './data';
import './deck.css';

document.documentElement.lang = data.meta.locale.slice(0, 2);
createRoot(document.getElementById('root')!).render(<React.StrictMode><HashRouter><PortfolioDeck/></HashRouter></React.StrictMode>);

import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import PortfolioRoutes from './App';
import { data } from './data';
import './deck.css';
import './web.css';
import './web-motion.css';
import './web-navigation.css';
import './project-visuals.css';

document.documentElement.lang = data.meta.locale.slice(0, 2);
createRoot(document.getElementById('root')!).render(<React.StrictMode><HashRouter><PortfolioRoutes/></HashRouter></React.StrictMode>);

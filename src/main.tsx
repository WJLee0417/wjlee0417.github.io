import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import PortfolioDeck from './pages/Deck';
import { WebHome, WebLayout, WebNotFound, WebProject } from './pages/WebPortfolio';
import { data } from './data';
import './deck.css';
import './web.css';

document.documentElement.lang = data.meta.locale.slice(0, 2);
createRoot(document.getElementById('root')!).render(<React.StrictMode><HashRouter><Routes><Route path="/deck" element={<PortfolioDeck/>}/><Route path="/" element={<WebLayout/>}><Route index element={<WebHome/>}/><Route path="projects/:slug" element={<WebProject/>}/><Route path="*" element={<WebNotFound/>}/></Route></Routes></HashRouter></React.StrictMode>);

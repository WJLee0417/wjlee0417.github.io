import { Navigate, Route, Routes } from 'react-router-dom';
import PortfolioDeck from './pages/Deck';

export default function PortfolioRoutes() {
  return <Routes>
    <Route path="/" element={<PortfolioDeck/>}/>
    <Route path="/deck" element={<PortfolioDeck/>}/>
    <Route path="/projects/:slug" element={<PortfolioDeck/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>;
}

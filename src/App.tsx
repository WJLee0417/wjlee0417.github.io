import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { WebBackground, WebHome, WebLayout, WebNotFound, WebProject, WebProjects } from './pages/WebPortfolio';
import { webDestination } from './web-navigation';

function LegacyDeckLink() {
  const location = useLocation();
  return <Navigate to={webDestination(location.search)} replace/>;
}

export default function PortfolioRoutes() {
  return <Routes>
    <Route path="/deck" element={<LegacyDeckLink/>}/>
    <Route path="/" element={<WebLayout/>}>
      <Route index element={<WebHome/>}/>
      <Route path="background" element={<WebBackground/>}/>
      <Route path="projects" element={<WebProjects/>}/>
      <Route path="projects/:slug" element={<WebProject/>}/>
      <Route path="*" element={<WebNotFound/>}/>
    </Route>
  </Routes>;
}

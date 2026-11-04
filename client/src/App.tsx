import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ExplorePage } from './pages/ExplorePage.js';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ExplorePage />} />
        {/* Wildcard redirects to Explore */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

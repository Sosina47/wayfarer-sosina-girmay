import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { CurrentUserProvider } from './context/CurrentUserContext.js';
import { ExplorePage } from './pages/ExplorePage.js';
import { PlaceDetailsPage } from './pages/PlaceDetailsPage.js';

export default function App() {
  return (
    <CurrentUserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ExplorePage />} />
          <Route path="/places/:id" element={<PlaceDetailsPage />} />
          {/* Unknown route fallback */}
          <Route
            path="*"
            element={
              <div className="min-h-screen bg-[#101012] text-[#E8E8ED] flex items-center justify-center p-4">
                <div className="p-8 rounded-[6px] bg-[#191A1D] border border-[#303136] text-center max-w-sm space-y-4">
                  <h2 className="text-xl font-bold text-[#E8E8ED]">Page not found</h2>
                  <p className="text-xs text-[#A5A5B0]">
                    The page you are looking for doesn't exist.
                  </p>
                  <Link
                    to="/"
                    className="inline-block px-4 py-2 rounded text-xs font-semibold bg-[#7770FF] text-[#101012] hover:bg-[#8A84FF] transition-colors"
                  >
                    Return to Explore
                  </Link>
                </div>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </CurrentUserProvider>
  );
}

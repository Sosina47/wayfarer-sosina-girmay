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
              <div className="min-h-screen bg-[#171512] text-[#E8DDC9] flex items-center justify-center p-4">
                <div className="p-8 rounded-[6px] bg-[#30241D] border border-[#49372A] text-center max-w-sm space-y-4">
                  <h2 className="text-xl font-bold text-[#E8DDC9]">Page not found</h2>
                  <p className="text-xs text-[#A99B89]">
                    The page you are looking for doesn't exist.
                  </p>
                  <Link
                    to="/"
                    className="inline-block px-4 py-2 rounded text-xs font-semibold bg-[#B17A43] text-[#171512] hover:bg-[#C58B50] transition-colors"
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

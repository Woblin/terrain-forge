import { BrowserRouter, Route, Routes } from 'react-router';
import { LibraryProvider } from './components/LibraryProvider';
import { UnitsProvider } from './components/UnitsProvider';
import { FirebaseContext } from './hooks/firebaseContext';
import { BoardPage } from './pages/BoardPage';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import type { FirebaseServices } from './services/firebase';

interface AppProps {
  firebase: FirebaseServices;
}

export function App({ firebase }: AppProps) {
  return (
    <FirebaseContext.Provider value={firebase}>
      <UnitsProvider>
        <LibraryProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/board" element={<BoardPage />} />
              <Route path="/library" element={<LibraryPage />} />
            </Routes>
          </BrowserRouter>
        </LibraryProvider>
      </UnitsProvider>
    </FirebaseContext.Provider>
  );
}

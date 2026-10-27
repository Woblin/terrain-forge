import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthProvider } from './components/AuthProvider';
import { BoardSessionProvider } from './components/BoardSessionProvider';
import { GamePreferencesProvider } from './components/GamePreferencesProvider';
import { LibraryProvider } from './components/LibraryProvider';
import { UnitsProvider } from './components/UnitsProvider';
import { UnsavedPiecesPrompt } from './components/UnsavedPiecesPrompt';
import { FirebaseContext } from './hooks/firebaseContext';
import { AccountPage } from './pages/AccountPage';
import { BoardPage } from './pages/BoardPage';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { SignInPage } from './pages/SignInPage';
import type { FirebaseServices } from './services/firebase';

interface AppProps {
  firebase: FirebaseServices;
}

export function App({ firebase }: AppProps) {
  return (
    <FirebaseContext.Provider value={firebase}>
      <UnitsProvider>
        <AuthProvider>
          <GamePreferencesProvider>
            <LibraryProvider>
              <BoardSessionProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/board" element={<BoardPage />} />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/sign-in" element={<SignInPage />} />
                    <Route path="/account" element={<AccountPage />} />
                  </Routes>
                  <UnsavedPiecesPrompt />
                </BrowserRouter>
              </BoardSessionProvider>
            </LibraryProvider>
          </GamePreferencesProvider>
        </AuthProvider>
      </UnitsProvider>
    </FirebaseContext.Provider>
  );
}

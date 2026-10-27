import { BrowserRouter, Route, Routes } from 'react-router';
import { AppShell } from './components/AppShell';
import { AuthProvider } from './components/AuthProvider';
import { BoardSessionProvider } from './components/BoardSessionProvider';
import { GamePreferencesProvider } from './components/GamePreferencesProvider';
import { LibraryProvider } from './components/LibraryProvider';
import { SavedBoardsProvider } from './components/SavedBoardsProvider';
import { ThemeProvider } from './components/ThemeProvider';
import { UnitsProvider } from './components/UnitsProvider';
import { UnsavedPiecesPrompt } from './components/UnsavedPiecesPrompt';
import { FirebaseContext } from './hooks/firebaseContext';
import { AccountPage } from './pages/AccountPage';
import { BoardPage } from './pages/BoardPage';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { SavedBoardsPage } from './pages/SavedBoardsPage';
import { SignInPage } from './pages/SignInPage';
import type { FirebaseServices } from './services/firebase';

interface AppProps {
  firebase: FirebaseServices;
}

export function App({ firebase }: AppProps) {
  return (
    <FirebaseContext.Provider value={firebase}>
      <ThemeProvider>
        <UnitsProvider>
          <AuthProvider>
            <GamePreferencesProvider>
              <LibraryProvider>
                <SavedBoardsProvider>
                  <BoardSessionProvider>
                    <BrowserRouter>
                      <Routes>
                        <Route element={<AppShell />}>
                          <Route path="/" element={<HomePage />} />
                          <Route path="/board" element={<BoardPage />} />
                          <Route path="/boards" element={<SavedBoardsPage />} />
                          <Route path="/library" element={<LibraryPage />} />
                          <Route path="/sign-in" element={<SignInPage />} />
                          <Route path="/account" element={<AccountPage />} />
                        </Route>
                      </Routes>
                      <UnsavedPiecesPrompt />
                    </BrowserRouter>
                  </BoardSessionProvider>
                </SavedBoardsProvider>
              </LibraryProvider>
            </GamePreferencesProvider>
          </AuthProvider>
        </UnitsProvider>
      </ThemeProvider>
    </FirebaseContext.Provider>
  );
}

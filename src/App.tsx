import { BrowserRouter, Route, Routes } from 'react-router';
import { UnitsProvider } from './components/UnitsProvider';
import { FirebaseContext } from './hooks/firebaseContext';
import { BoardPage } from './pages/BoardPage';
import { HomePage } from './pages/HomePage';
import type { FirebaseServices } from './services/firebase';

interface AppProps {
  firebase: FirebaseServices;
}

export function App({ firebase }: AppProps) {
  return (
    <FirebaseContext.Provider value={firebase}>
      <UnitsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/board" element={<BoardPage />} />
          </Routes>
        </BrowserRouter>
      </UnitsProvider>
    </FirebaseContext.Provider>
  );
}

import { BrowserRouter, Route, Routes } from 'react-router';
import { FirebaseContext } from './hooks/firebaseContext';
import { HomePage } from './pages/HomePage';
import type { FirebaseServices } from './services/firebase';

interface AppProps {
  firebase: FirebaseServices;
}

export function App({ firebase }: AppProps) {
  return (
    <FirebaseContext.Provider value={firebase}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </FirebaseContext.Provider>
  );
}

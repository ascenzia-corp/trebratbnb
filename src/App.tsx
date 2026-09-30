import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useSyncStore } from './stores/syncStore';
import { LoginPage } from './pages/LoginPage';
import { ReservationsPage } from './pages/ReservationsPage';
import { ReservationDetailPage } from './pages/ReservationDetailPage';
import { ReservationFormPage } from './pages/ReservationFormPage';
import { TachesPage } from './pages/TachesPage';
import { EdlPage } from './pages/EdlPage';
import { AchatsPage } from './pages/AchatsPage';
import { AchatFormPage } from './pages/AchatFormPage';
import { AchatDetailPage } from './pages/AchatDetailPage';
import { PlusPage } from './pages/PlusPage';
import { CompteurMenagesPage } from './pages/CompteurMenagesPage';

function AppRoutes() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-2">🏡</p>
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/reservations" replace />} />
      <Route path="/reservations" element={<ReservationsPage />} />
      <Route path="/reservations/new" element={<ReservationFormPage />} />
      <Route path="/reservations/:id" element={<ReservationDetailPage />} />
      <Route path="/taches" element={<TachesPage />} />
      <Route path="/etats-des-lieux" element={<EdlPage />} />
      {/* Former per-room page: everything now lives on the single EDL page */}
      <Route path="/etats-des-lieux/:id" element={<Navigate to="/etats-des-lieux" replace />} />
      <Route path="/achats" element={<AchatsPage />} />
      <Route path="/achats/new" element={<AchatFormPage />} />
      <Route path="/achats/:id" element={<AchatDetailPage />} />
      <Route path="/plus" element={<PlusPage />} />
      <Route path="/plus/compteur-menages" element={<CompteurMenagesPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/reservations" replace />} />
    </Routes>
  );
}

export default function App() {
  const { initialize } = useAuthStore();
  const initSync = useSyncStore((s) => s.init);

  useEffect(() => {
    initialize();
    // Sends changes made offline as soon as the network allows, from any screen.
    initSync();
  }, [initialize, initSync]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

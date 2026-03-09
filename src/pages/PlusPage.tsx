import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ClipboardList, AlertTriangle, ShoppingCart, CalendarDays } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { useReservationStore } from '../stores/reservationStore';
import { useTacheStore } from '../stores/tacheStore';
import { useEdlStore } from '../stores/edlStore';
import { useAchatStore } from '../stores/achatStore';
import { useAuthStore } from '../stores/authStore';
import { formatDateRange } from '../utils/dateUtils';

export function PlusPage() {
  const navigate = useNavigate();
  const { reservations, fetchReservations } = useReservationStore();
  const { taches, fetchTaches } = useTacheStore();
  const { edls, fetchEdls } = useEdlStore();
  const { achats, fetchAchats } = useAchatStore();
  const { signOut, profile } = useAuthStore();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    fetchReservations();
    fetchTaches();
    fetchEdls();
    fetchAchats();
  }, [fetchReservations, fetchTaches, fetchEdls, fetchAchats]);

  const nextReservation = reservations.find((r) => r.statut_sejour === 'en_cours')
    ?? reservations.find((r) => r.statut_sejour === 'a_venir');

  const todayTaches = taches.filter((t) => t.a_faire && t.statut === 'a_faire').length;
  const problemEdls = edls.filter((e) => e.etat === 'probleme').length;
  const pendingAchats = achats.filter((a) => a.statut === 'a_acheter').length;

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  return (
    <Layout>
      <PageHeader title="⚙️ Plus" />

      <div className="px-4 space-y-4 mt-2">
        {/* Dashboard */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tableau de bord</h2>

          {nextReservation && (
            <Card>
              <div className="flex items-center gap-3">
                <CalendarDays size={20} className="text-[#007AFF]" />
                <div>
                  <p className="font-semibold text-sm text-gray-900">Prochaine : {nextReservation.voyageur}</p>
                  <p className="text-xs text-gray-500">
                    {formatDateRange(nextReservation.date_checkin, nextReservation.date_checkout)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center">
              <ClipboardList size={20} className="mx-auto text-[#007AFF]" />
              <p className="text-2xl font-bold text-gray-900 mt-1">{todayTaches}</p>
              <p className="text-xs text-gray-500">Tâches</p>
            </Card>
            <Card className="text-center">
              <AlertTriangle size={20} className="mx-auto text-red-500" />
              <p className="text-2xl font-bold text-gray-900 mt-1">{problemEdls}</p>
              <p className="text-xs text-gray-500">Problèmes</p>
            </Card>
            <Card className="text-center">
              <ShoppingCart size={20} className="mx-auto text-orange-500" />
              <p className="text-2xl font-bold text-gray-900 mt-1">{pendingAchats}</p>
              <p className="text-xs text-gray-500">Achats</p>
            </Card>
          </div>
        </div>

        {/* Links */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Outils</h2>

          <Card onClick={() => navigate('/plus/compteur-menages')}>
            <div className="flex items-center gap-3">
              <span className="text-xl">🧹</span>
              <p className="font-medium text-gray-900">Compteur ménages</p>
            </div>
          </Card>
        </div>

        {/* Settings */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Paramètres</h2>

          {profile && (
            <Card>
              <p className="font-medium text-gray-900">{profile.display_name}</p>
              <p className="text-xs text-gray-500">{profile.email}</p>
              <p className="text-xs text-gray-400 mt-1 capitalize">{profile.role.replace('_', ' ')}</p>
            </Card>
          )}

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center justify-center gap-2 text-red-500 bg-red-50 py-3 rounded-xl font-medium"
          >
            <LogOut size={18} /> {signingOut ? 'Déconnexion...' : 'Se déconnecter'}
          </button>
        </div>
      </div>
    </Layout>
  );
}

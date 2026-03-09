import { CalendarDays, CheckSquare, Home, ShoppingCart, MoreHorizontal } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/reservations', icon: CalendarDays, label: 'Réservations' },
  { path: '/taches', icon: CheckSquare, label: 'Tâches' },
  { path: '/etats-des-lieux', icon: Home, label: 'État lieux' },
  { path: '/achats', icon: ShoppingCart, label: 'Achats' },
  { path: '/plus', icon: MoreHorizontal, label: 'Plus' },
];

export function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 pb-safe z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname.startsWith(tab.path);
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                isActive ? 'text-[#007AFF]' : 'text-gray-400'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

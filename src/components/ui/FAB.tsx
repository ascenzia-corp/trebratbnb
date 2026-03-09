import { Plus } from 'lucide-react';

interface FABProps {
  onClick: () => void;
  icon?: React.ReactNode;
}

export function FAB({ onClick, icon }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-5 w-14 h-14 bg-[#007AFF] text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40"
    >
      {icon ?? <Plus size={28} />}
    </button>
  );
}

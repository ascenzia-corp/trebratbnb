import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export function PageHeader({ title, showBack = false, rightAction }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-30 bg-[#F2F2F7]/80 backdrop-blur-md px-4 pt-3 pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBack && (
            <button onClick={() => navigate(-1)} className="text-[#007AFF] -ml-2 p-1">
              <ChevronLeft size={28} />
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </div>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useTacheStore } from '../../stores/tacheStore';

export function CompteurMenages() {
  const { getCountMenages } = useTacheStore();
  const [counts, setCounts] = useState({ manu: 0, alienor: 0 });

  useEffect(() => {
    getCountMenages().then(setCounts);
  }, [getCountMenages]);

  return (
    <div className="space-y-4 px-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧹</span>
            <div>
              <p className="font-semibold text-gray-900">Manu</p>
              <p className="text-sm text-gray-500">Ménages réalisés</p>
            </div>
          </div>
          <span className="text-3xl font-bold text-blue-500">{counts.manu}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧹</span>
            <div>
              <p className="font-semibold text-gray-900">Aliénor</p>
              <p className="text-sm text-gray-500">Ménages réalisés</p>
            </div>
          </div>
          <span className="text-3xl font-bold text-purple-500">{counts.alienor}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="font-medium text-gray-600">Total</p>
          <span className="text-2xl font-bold text-gray-900">{counts.manu + counts.alienor}</span>
        </div>
      </div>
    </div>
  );
}

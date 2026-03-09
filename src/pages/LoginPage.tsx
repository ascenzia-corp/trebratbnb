import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

export function LoginPage() {
  const { signIn } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-white rounded-xl px-4 py-3.5 text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF]';

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">🏡</h1>
          <h2 className="text-2xl font-bold text-gray-900">Trébrat</h2>
          <p className="text-sm text-gray-500 mt-1">Gestion locative</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="Email"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="Mot de passe"
            required
          />

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#007AFF] text-white py-3.5 rounded-xl font-semibold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}

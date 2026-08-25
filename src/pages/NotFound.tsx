import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <p className="text-7xl font-bold text-slate-200 mb-2">404</p>
      <h2 className="text-xl font-semibold text-slate-900 mb-1">Página não encontrada</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-sm">
        A página que você procura não existe ou foi movida para outro endereço.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
      >
        <Home className="w-4 h-4" />
        Voltar ao início
      </Link>
    </div>
  );
}

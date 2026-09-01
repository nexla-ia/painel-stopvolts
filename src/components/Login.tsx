import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, Zap, ShieldAlert, ArrowRight } from 'lucide-react';
import Spinner from './ui/Spinner';
import { inputClass, labelClass } from './ui/classes';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    /*
      `overflow-x-hidden` no lugar de `overflow-hidden`: o corte existe para
      conter o brilho de fundo, mas na horizontal. Cortando também na vertical,
      o cartão ficava sem saída em tela baixa — celular deitado — e o botão de
      entrar não aparecia.
    */
    <div className="min-h-dvh bg-ink flex items-center justify-center p-4 py-10 relative overflow-x-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(600px circle at 50% 0%, rgb(var(--accent) / 0.08), transparent 60%)',
        }}
      />

      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center mb-8 animate-fade-up">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-volt/30 blur-xl rounded-full" />
            <div className="relative bg-volt p-3.5 rounded-lg shadow-lg shadow-volt/20">
              <Zap className="w-7 h-7 text-volt-ink" fill="currentColor" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-faint">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
            Sistema Online
          </div>
        </div>

        <div
          className="rounded-lg border border-edge bg-panel shadow-2xl shadow-black/40 p-8 animate-fade-up"
          style={{ animationDelay: '80ms' }}
        >
          <h1 className="font-display font-bold text-3xl text-center text-fg leading-none">StopVolts</h1>
          <p className="text-center text-sm text-muted mt-2 mb-8">Painel administrativo · acesso restrito</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2.5 bg-danger-soft border border-danger/25 text-danger px-4 py-3 rounded-md text-sm">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className={labelClass}>
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={`${inputClass} pl-10`}
                  placeholder="admin@stopvolts.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={`${inputClass} pl-10`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-volt text-volt-ink py-3 rounded-md font-semibold hover:bg-volt-strong focus:ring-2 focus:ring-volt/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner className="w-4 h-4" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-faint text-xs mt-6 font-mono uppercase tracking-widest">
          Acesso restrito a administradores
        </p>
      </div>
    </div>
  );
}

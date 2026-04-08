import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register' | 'pending'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (mode === 'register') {
        await authApi.register(email, password, fullName);
        setMode('pending');
      } else {
        await login(email, password);
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.data?.detail === 'ACCOUNT_PENDING_APPROVAL') {
        setMode('pending');
      } else {
        setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center p-4">
      {/* Glow orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-brand-500 rounded-full opacity-5 blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-80 h-80 bg-purple-500 rounded-full opacity-5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}>
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold gradient-text">MockSewa</h1>
          <p className="text-slate-400 mt-2 text-sm">Nepal's #1 Technical Exam Platform</p>
        </div>

        {/* Card */}
        <div className="glass p-8">
          {mode === 'pending' ? (
            <div className="text-center py-6 animate-fade-in">
              <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-500/20">
                <span className="text-2xl">⏳</span>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-white">Awaiting Approval</h2>
              <p className="text-slate-400 text-sm mb-6">
                Your account has been registered but is locked by the Gatekeeper. An administrator must approve your account and assign your modules before you can log in.
              </p>
              <button onClick={() => setMode('login')} className="btn-ghost w-full py-2">Return to Login</button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex bg-surface-900 rounded-lg p-1 border border-white/5 mb-6">
                <button type="button" onClick={() => { setMode('login'); setError(''); }} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'login' ? 'bg-surface-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}>Sign In</button>
                <button type="button" onClick={() => { setMode('register'); setError(''); }} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'register' ? 'bg-surface-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}>Create Account</button>
              </div>

              {error && (
                <div className="mb-5 px-4 py-3 rounded-xl text-sm text-red-400 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div className="animate-fade-in">
                    <label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label>
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                      className="input-field" placeholder="Ram Bahadur" required />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="input-field" placeholder="you@example.com" required autoComplete="email" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="input-field" placeholder="••••••••" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                </div>
                <button type="submit" disabled={loading} className="btn-brand w-full flex items-center justify-center gap-2 mt-2">
                  {loading ? (
                    <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{mode === 'login' ? 'Signing in…' : 'Registering…'}</>
                  ) : (mode === 'login' ? 'Sign In' : 'Create Account')}
                </button>
              </form>

              <p className="text-center text-slate-500 text-sm mt-6">
                Nepal Electrical Authority · NEA Level 5 &amp; 6 · PSC Preparation
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

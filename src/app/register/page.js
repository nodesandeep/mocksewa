'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

// Top 20 country codes + comprehensive list
const COUNTRY_CODES = [
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1', flag: '🇺🇸', name: 'USA / Canada' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait' },
  { code: '+60', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+82', flag: '🇰🇷', name: 'South Korea' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+39', flag: '🇮🇹', name: 'Italy' },
  { code: '+34', flag: '🇪🇸', name: 'Spain' },
  { code: '+7', flag: '🇷🇺', name: 'Russia' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+55', flag: '🇧🇷', name: 'Brazil' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+94', flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+92', flag: '🇵🇰', name: 'Pakistan' },
  { code: '+95', flag: '🇲🇲', name: 'Myanmar' },
  { code: '+66', flag: '🇹🇭', name: 'Thailand' },
  { code: '+62', flag: '🇮🇩', name: 'Indonesia' },
  { code: '+63', flag: '🇵🇭', name: 'Philippines' },
  { code: '+20', flag: '🇪🇬', name: 'Egypt' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
];

export default function RegisterPage() {
  const [countryCode, setCountryCode] = useState('+977');
  const [phone, setPhone] = useState('');
  const [whatsappOptedIn, setWhatsappOptedIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleGoogleRegister = async () => {
    setSubmitting(true);
    setError('');
    try {
      const phoneData = phone ? {
        countryCode,
        phone: phone.replace(/\D/g, ''),
        whatsappOptedIn
      } : null;

      await signInWithGoogle(phoneData);
      router.push('/student');
    } catch (err) {
      console.error("Google registration error:", err);
      setError(err.message || 'Google registration was cancelled or failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white selection:bg-blue-100">
      {/* Left panel (Premium Brand Showcase) */}
      <div className="hidden lg:flex flex-col justify-center p-24 bg-gradient-to-br from-blue-700 to-blue-900 text-white space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="space-y-6 relative z-10">
          <Logo light={true} className="scale-150 origin-left mb-12" />
          <h1 className="text-6xl font-black leading-tight tracking-tighter">Join the<br/>Elite Circle.</h1>
          <p className="text-xl text-blue-100 font-medium max-w-md italic opacity-80">
            "Education is the passport to the future, for tomorrow belongs to those who prepare for it today."
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { num: '500+', label: 'Students' },
              { num: '10k+', label: 'Questions' },
              { num: '40+', label: 'Mock Sets' },
            ].map(stat => (
              <div key={stat.label} className="text-center p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                <div className="text-2xl font-black text-white">{stat.num}</div>
                <div className="text-xs text-blue-200 font-bold uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel (Frictionless Google Auth Screen) */}
      <div className="flex items-center justify-center p-8 bg-slate-50/50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100/50">
          <header className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-black uppercase tracking-wider">
              ⚡ Instant Access
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Create Account</h2>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              We've upgraded registration! All new accounts now use secure Google Authentication. No passwords required.
            </p>
          </header>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 font-bold text-sm flex items-center gap-2 animate-shake">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* WhatsApp & Mobile Optional section */}
            <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  WhatsApp Alerts (Optional)
                </span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">
                  Highly Recommended
                </span>
              </div>
              
              <p className="text-xs text-slate-400 font-medium leading-normal">
                Provide your WhatsApp number to receive immediate exam schedules, syllabus updates, and result metrics.
              </p>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative">
                    <select
                      value={countryCode}
                      onChange={e => setCountryCode(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all font-bold text-slate-700 cursor-pointer text-sm min-w-[5.5rem]"
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▾</div>
                  </div>
                  <input
                    type="tel"
                    placeholder="98XXXXXXXX"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^\d\s\-\(\)]/g, ''))}
                    className="flex-1 p-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all font-bold text-slate-800 placeholder-slate-400 text-sm"
                    maxLength={15}
                  />
                </div>

                {phone && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <span>✓</span> Registered Mobile: {countryCode} {phone}
                    </p>
                    
                    {/* WhatsApp checkbox opt-in */}
                    <label className="flex items-start gap-3 cursor-pointer p-3 bg-emerald-50/50 border border-emerald-100/50 rounded-xl hover:bg-emerald-50 transition-colors">
                      <div className="relative mt-0.5">
                        <input
                          type="checkbox"
                          checked={whatsappOptedIn}
                          onChange={e => setWhatsappOptedIn(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all ${whatsappOptedIn ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'}`}>
                          {whatsappOptedIn && <span className="text-white text-[9px] font-bold">✓</span>}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">Deliver progress & results to WhatsApp</p>
                        <p className="text-[9px] text-slate-400 leading-normal">We'll alert you of key performance statistics and mock sets. Zero spam.</p>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Primary Google Auth CTA */}
            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={submitting}
              className="w-full py-4.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-base rounded-2xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-3 cursor-pointer"
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Configuring Account...</span>
                </div>
              ) : (
                <>
                  <svg className="w-5 h-5 bg-white p-0.5 rounded-full" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Sign Up with Google</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-6 border-t border-slate-100 text-center">
            <p className="text-slate-400 font-bold text-xs tracking-wide">
              🔒 SECURE ENCRYPTED AUTHENTICATION
            </p>
            <p className="text-slate-500 font-medium text-sm mt-3">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-blue-600 font-black hover:underline bg-transparent border-0 p-0 cursor-pointer"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

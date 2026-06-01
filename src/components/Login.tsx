import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, ShieldCheck, RefreshCw, ArrowRight, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, googleLogin, auth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the page the user was trying to access
  const from = (location.state as any)?.from?.pathname || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(pin);
    if (success) {
      toast.success("تم الدخول بنجاح");
      navigate(from, { replace: true });
    } else {
      toast.error("كلمة المرور PIN غير صحيحة");
      setPin('');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    try {
      await googleLogin();
      toast.success("تم الدخول عبر جوجل");
      navigate('/admin');
    } catch (error) {
      toast.error("فشل تسجيل الدخول عبر جوجل");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 text-right" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-neutral-100 overflow-hidden"
      >
        <div className="bg-[#042a1d] bg-gradient-to-r from-[#042a1d] to-[#0f5c44] p-8 text-white text-center border-b-4 border-amber-400">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner ring-2 ring-white/10">
            <ShieldCheck className="w-8 h-8 text-amber-300" />
          </div>
          <h2 className="text-2xl font-black font-sans text-amber-300">دخول الكادر الميداني</h2>
          <p className="text-emerald-100 mt-2 font-sans text-sm">أدخل كلمة المرور PIN للوصول إلى صلاحيات الإدارة والتوزيع</p>
        </div>

        <div className="p-8 space-y-6">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-neutral-700 mr-1 font-sans">رمز مرور الموظف PIN</label>
              <div className="relative">
                <KeyRound className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="أدخل رمز مرور PIN الخاص بك"
                  className="w-full pr-12 pl-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-[#042a1d] transition-all text-right font-sans tracking-widest text-lg font-bold"
                  autoFocus
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-gradient-to-r from-[#042a1d] to-[#0f5c44] hover:from-[#053726] hover:to-[#116e53] text-amber-300 rounded-2xl font-extrabold shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 font-sans text-lg transform hover:-translate-y-0.5"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
                <>
                  <span>تسجيل الدخول لبوابة العمل</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-neutral-400 font-sans">أو للمسؤولين</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full h-12 bg-white border border-neutral-200 text-neutral-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-50 transition-all font-sans"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            الدخول عبر جوجل
          </button>

          <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-xs">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <p className="font-sans">هذه المنطقة مخصصة للمسؤولين والموزعين فقط. يتم تسجيل كافة محاولات الدخول.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;

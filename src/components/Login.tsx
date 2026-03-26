import React, { useState } from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { LogIn, User, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Add Google Fit scopes
      provider.addScope('https://www.googleapis.com/auth/fitness.nutrition.write');
      provider.addScope('https://www.googleapis.com/auth/fitness.body.write');
      
      const result = await signInWithPopup(auth, provider);
      
      // Get Google Fit access token
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        sessionStorage.setItem('googleFitToken', credential.accessToken);
      }
      
      // Profile creation is handled by App.tsx
    } catch (err: any) {
      console.error('Google Login Error:', err);
      setError('Login with Google failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
      // Profile creation is handled by App.tsx
    } catch (err: any) {
      console.error('Guest Login Error:', err);
      if (err.code === 'auth/admin-restricted-operation' || err.code === 'auth/operation-not-allowed') {
        setError(`Guest login failed (${err.code}): ${err.message}. Please ensure "Anonymous" provider is enabled in Firebase Console -> Authentication -> Sign-in method.`);
      } else {
        setError(`Login as guest failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-stone-100"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-4">
            <LogIn className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Welcome to NutriSnap</h1>
          <p className="text-stone-500">Log in to track your meals and reach your goals.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-stone-200 text-stone-700 font-semibold py-4 px-6 rounded-2xl hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Log in with Google
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-stone-400">Or</span>
            </div>
          </div>

          <button
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-stone-900 text-white font-semibold py-4 px-6 rounded-2xl hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            <User className="w-5 h-5" />
            Continue as Guest
          </button>
        </div>

        <div className="mt-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
          <p className="text-xs text-emerald-800 leading-relaxed">
            <strong>Note:</strong> As a guest, your data is only stored temporarily. Log in with Google to keep your history and access all features.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;

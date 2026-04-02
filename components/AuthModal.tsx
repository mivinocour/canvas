import React, { useState } from 'react';
import { LogIn, Users, Mail, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  onSignIn: () => Promise<void>;
  onEmailSignIn?: (email: string, password: string) => Promise<void>;
  onEmailSignUp?: (email: string, password: string, fullName?: string) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  hasWidgets?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onSignIn,
  onEmailSignIn,
  onEmailSignUp,
  onCancel,
  loading,
  hasWidgets
}) => {
  const [mode, setMode] = useState<'main' | 'signin' | 'signup'>('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (mode === 'signin' && onEmailSignIn) {
        await onEmailSignIn(email.trim(), password);
      } else if (mode === 'signup' && onEmailSignUp) {
        await onEmailSignUp(email.trim(), password, fullName.trim());
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setError('');
    setShowPassword(false);
  };

  if (mode === 'signin' || mode === 'signup') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8">
          <div className="text-center mb-6">
            <Mail className="w-12 h-12 mx-auto mb-4 text-blue-600" />
            <h1 className="text-2xl font-semibold text-slate-800 mb-2">
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </h1>
            <p className="text-slate-600 text-sm">
              {mode === 'signin'
                ? 'Welcome back! Sign in to access your spaces.'
                : 'Create an account to save your work and collaborate.'
              }
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  minLength={6}
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'signup' && (
                <p className="text-xs text-slate-500 mt-1">Must be at least 6 characters</p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('main');
                  resetForm();
                }}
                disabled={isSubmitting}
                className="flex-1 py-2 px-4 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !email.trim() || !password.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  mode === 'signin' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </div>

            <div className="text-center pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError('');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                disabled={isSubmitting}
              >
                {mode === 'signin'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Main auth selection screen
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-blue-400 to-green-400 rounded-xl transform rotate-3 opacity-80"></div>
          <div className="absolute inset-0.5 bg-gradient-to-tl from-pink-300 via-purple-300 to-blue-300 rounded-lg transform -rotate-2"></div>
          <div className="absolute inset-1 bg-gradient-to-br from-blue-200 via-green-200 to-pink-200 rounded-md flex items-center justify-center">
            <LogIn className="w-8 h-8 text-slate-700" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-slate-800 mb-2">
          {hasWidgets ? 'Save Your Work' : 'Welcome to Playground'}
        </h1>
        <p className="text-slate-600 mb-8 leading-relaxed">
          {hasWidgets
            ? 'Sign in to save your current widgets and create a shared space.'
            : 'Sign in to create shared spaces and collaborate in real-time.'
          }
        </p>

        <div className="space-y-3 mb-6">
          <button
            onClick={onSignIn}
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">or</span>
            </div>
          </div>

          <button
            onClick={() => {
              setMode('signin');
              resetForm();
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Mail className="w-5 h-5" />
            Sign in with Email
          </button>

          <button
            onClick={() => {
              setMode('signup');
              resetForm();
            }}
            className="w-full border border-slate-300 hover:bg-slate-50 text-slate-700 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            Create Account
          </button>
        </div>

        <div className="text-center">
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-slate-600 hover:text-slate-800 text-sm font-medium underline underline-offset-4"
            >
              Continue without signing in
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-4">
          You can use Playground without signing in, but you won't be able to save or share spaces.
        </p>
      </div>
    </div>
  );
};
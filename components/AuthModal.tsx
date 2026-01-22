import React from 'react';
import { LogIn, Users } from 'lucide-react';

interface AuthModalProps {
  onSignIn: () => Promise<void>;
  loading?: boolean;
  hasWidgets?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSignIn, loading, hasWidgets }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-blue-400 to-green-400 rounded-xl transform rotate-3 opacity-80"></div>
          <div className="absolute inset-0.5 bg-gradient-to-tl from-pink-300 via-purple-300 to-blue-300 rounded-lg transform -rotate-2"></div>
          <div className="absolute inset-1 bg-gradient-to-br from-blue-200 via-green-200 to-pink-200 rounded-md"></div>
        </div>

        <h1 className="text-2xl font-semibold text-slate-800 mb-2">
          {hasWidgets ? 'Save Your Work' : 'Welcome to Playground'}
        </h1>
        <p className="text-slate-600 mb-8 leading-relaxed">
          {hasWidgets
            ? 'Sign in to save your current widgets and create a shared space. You can invite others to collaborate in real-time.'
            : 'Sign in to create shared spaces and collaborate with friends, partners, and teammates in real-time.'
          }
        </p>

        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3 text-left bg-slate-50 p-3 rounded-lg">
            <Users className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-slate-700">Collaborate in Real-Time</p>
              <p className="text-xs text-slate-500">Create shared spaces and invite others</p>
            </div>
          </div>
        </div>

        <button
          onClick={onSignIn}
          disabled={loading}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <p className="text-xs text-slate-500 mt-4">
          You can still use Playground without signing in, but you won't be able to save or share spaces.
        </p>
      </div>
    </div>
  );
};
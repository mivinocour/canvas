import React, { useState } from 'react';
import { Mail, Users, UserPlus, X, Copy, Check, ExternalLink } from 'lucide-react';
import { Space, SpaceMember } from '../types/shared';

interface InviteModalProps {
  space: Space;
  onInvite: (email: string, role: 'viewer' | 'editor') => Promise<string | void>; // Now returns invitation ID
  onClose: () => void;
  loading?: boolean;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  space,
  onInvite,
  onClose,
  loading
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [invitationLink, setInvitationLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const invitationId = await onInvite(email.trim(), role);
      if (invitationId) {
        // Generate the invitation link
        const baseUrl = window.location.origin;
        const link = `${baseUrl}?invite=${invitationId}`;
        setInvitationLink(link);
        setEmail('');
        setError('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = invitationLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setInvitationLink('');
    setEmail('');
    setRole('viewer');
    setError('');
    setCopied(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Invite to Space</h2>
              <p className="text-sm text-slate-600">{space.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Invitation Link Display - Show at top when created */}
        {invitationLink && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="font-medium text-green-800">Invitation Created!</h3>
            </div>

            <p className="text-sm text-green-700 mb-3">
              Copy this link and share it with your invitee:
            </p>

            <div className="bg-white border border-green-200 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <code className="text-sm text-slate-600 flex-1 break-all">{invitationLink}</code>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={resetForm}
                className="text-sm text-green-700 hover:text-green-800 underline"
              >
                Send another invitation
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isSubmitting || loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Permission Level
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`relative flex cursor-pointer rounded-lg border p-3 focus:outline-none ${
                role === 'viewer'
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-slate-200 bg-white text-slate-900'
              }`}>
                <input
                  type="radio"
                  name="role"
                  value="viewer"
                  checked={role === 'viewer'}
                  onChange={(e) => setRole(e.target.value as 'viewer')}
                  className="sr-only"
                  disabled={isSubmitting || loading}
                />
                <div className="flex flex-col">
                  <span className="block text-sm font-semibold">Viewer</span>
                  <span className="block text-xs text-slate-500 mt-1">Can view widgets but not edit</span>
                </div>
              </label>

              <label className={`relative flex cursor-pointer rounded-lg border p-3 focus:outline-none ${
                role === 'editor'
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-slate-200 bg-white text-slate-900'
              }`}>
                <input
                  type="radio"
                  name="role"
                  value="editor"
                  checked={role === 'editor'}
                  onChange={(e) => setRole(e.target.value as 'editor')}
                  className="sr-only"
                  disabled={isSubmitting || loading}
                />
                <div className="flex flex-col">
                  <span className="block text-sm font-semibold">Editor</span>
                  <span className="block text-xs text-slate-500 mt-1">Can view and edit widgets</span>
                </div>
              </label>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || loading}
              className="flex-1 py-2 px-4 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || loading || !email.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Send Invite
                </>
              )}
            </button>
          </div>
        </form>

        {/* Current Members Section */}
        {space.members && space.members.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Current Members ({space.members.length})
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {space.members.map((member, index) => (
                <div key={member.userId || index} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                  {member.photoURL ? (
                    <img
                      src={member.photoURL}
                      alt={member.displayName}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {member.displayName[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{member.displayName}</p>
                    <p className="text-xs text-slate-500 capitalize">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
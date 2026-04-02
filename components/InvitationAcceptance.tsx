import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Mail, Users, Clock, UserCheck } from 'lucide-react';
import { Invitation, User } from '../types/shared';
import { supabaseService } from '../lib/supabase-service';

interface InvitationAcceptanceProps {
  invitationId: string;
  user: User | null;
  onAccepted: (invitation: Invitation) => void;
  onSignInRequired: () => void;
}

export const InvitationAcceptance: React.FC<InvitationAcceptanceProps> = ({
  invitationId,
  user,
  onAccepted,
  onSignInRequired
}) => {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [status, setStatus] = useState<'loading' | 'valid' | 'expired' | 'accepted' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    loadInvitation();
  }, [invitationId]);

  const loadInvitation = async () => {
    try {
      setLoading(true);

      // Get invitation details from database
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (error || !data) {
        setStatus('error');
        setError('Invitation not found or invalid.');
        return;
      }

      const inv: Invitation = {
        id: data.id,
        spaceId: data.space_id,
        spaceName: data.space_name,
        inviterName: data.inviter_name,
        inviterEmail: data.inviter_email,
        inviteeEmail: data.invitee_email,
        role: data.role,
        status: data.status,
        createdAt: new Date(data.created_at).getTime(),
        expiresAt: new Date(data.expires_at).getTime()
      };

      setInvitation(inv);

      // Check invitation status
      if (inv.status === 'accepted') {
        setStatus('accepted');
      } else if (inv.status === 'declined') {
        setStatus('error');
        setError('This invitation has been declined.');
      } else if (new Date(inv.expiresAt) < new Date()) {
        setStatus('expired');
      } else {
        setStatus('valid');
      }

    } catch (error: any) {
      console.error('Error loading invitation:', error);
      setStatus('error');
      setError('Failed to load invitation details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!invitation || !user) return;

    // Check if user email matches invitation
    if (user.email !== invitation.inviteeEmail) {
      setError(`This invitation is for ${invitation.inviteeEmail}. Please sign in with the correct email address.`);
      return;
    }

    setAccepting(true);
    setError('');

    try {
      const success = await supabaseService.acceptInvitation(invitation.id);
      if (success) {
        setStatus('accepted');
        onAccepted(invitation);
      } else {
        setError('Failed to accept invitation. Please try again.');
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      setError(error.message || 'Failed to accept invitation.');
    } finally {
      setAccepting(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimeRemaining = (expiresAt: number) => {
    const now = Date.now();
    const timeLeft = expiresAt - now;
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) return 'Expired';
    if (daysLeft === 1) return '1 day remaining';
    return `${daysLeft} days remaining`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">

        {/* Success State */}
        {status === 'accepted' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome to the team!</h1>
            <p className="text-slate-600 mb-6">
              You've successfully joined <strong>{invitation?.spaceName}</strong>.
              You can now collaborate and access shared widgets.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Go to Workspace
            </button>
          </div>
        )}

        {/* Expired State */}
        {status === 'expired' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Invitation Expired</h1>
            <p className="text-slate-600 mb-6">
              This invitation to <strong>{invitation?.spaceName}</strong> has expired.
              Please ask {invitation?.inviterName} to send you a new invitation.
            </p>
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-600">
                <strong>Expired on:</strong> {invitation && formatDate(invitation.expiresAt)}
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Invalid Invitation</h1>
            <p className="text-slate-600 mb-6">{error}</p>
          </div>
        )}

        {/* Valid Invitation - Not Signed In */}
        {status === 'valid' && !user && (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">You're Invited!</h1>
            <p className="text-slate-600 mb-6">
              <strong>{invitation?.inviterName}</strong> invited you to collaborate on <strong>{invitation?.spaceName}</strong>
            </p>

            <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Role:</span>
                <span className="font-medium text-slate-800 capitalize">{invitation?.role}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Valid until:</span>
                <span className="font-medium text-slate-800">
                  {invitation && formatTimeRemaining(invitation.expiresAt)}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-6">
              Sign in with <strong>{invitation?.inviteeEmail}</strong> to accept this invitation.
            </p>

            <button
              onClick={onSignInRequired}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors mb-4"
            >
              Sign In to Accept
            </button>

            <p className="text-xs text-slate-500">
              Don't have an account? You can create one during sign in.
            </p>
          </div>
        )}

        {/* Valid Invitation - Signed In (Wrong Email) */}
        {status === 'valid' && user && user.email !== invitation?.inviteeEmail && (
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Wrong Account</h1>
            <p className="text-slate-600 mb-6">
              This invitation is for <strong>{invitation?.inviteeEmail}</strong>, but you're signed in as <strong>{user.email}</strong>.
            </p>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-orange-800">
                Please sign out and sign in with the correct email address to accept this invitation.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 border border-slate-300 text-slate-700 py-3 px-4 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSignInRequired}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Switch Account
              </button>
            </div>
          </div>
        )}

        {/* Valid Invitation - Signed In (Correct Email) */}
        {status === 'valid' && user && user.email === invitation?.inviteeEmail && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Ready to Join!</h1>
            <p className="text-slate-600 mb-6">
              <strong>{invitation?.inviterName}</strong> invited you to collaborate on <strong>{invitation?.spaceName}</strong>
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-600">Your role:</span>
                <span className="font-medium text-blue-800 capitalize">{invitation?.role}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-600">Permissions:</span>
                <span className="font-medium text-blue-800">
                  {invitation?.role === 'editor' ? 'View and Edit' : 'View Only'}
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 border border-slate-300 text-slate-700 py-3 px-4 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                disabled={accepting}
              >
                Decline
              </button>
              <button
                onClick={handleAcceptInvitation}
                disabled={accepting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {accepting ? (
                  <>
                    <div className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Accepting...
                  </>
                ) : (
                  'Accept Invitation'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
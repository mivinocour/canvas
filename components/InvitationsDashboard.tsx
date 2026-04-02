import React, { useState, useEffect } from 'react';
import { Mail, Clock, Users, Check, X, ExternalLink } from 'lucide-react';
import { Invitation, User } from '../types/shared';
import { supabaseService } from '../lib/supabase-service';

interface InvitationsDashboardProps {
  user: User;
  onInvitationAccepted: (invitation: Invitation) => void;
}

export const InvitationsDashboard: React.FC<InvitationsDashboardProps> = ({
  user,
  onInvitationAccepted
}) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
  }, [user]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const userInvitations = await supabaseService.getInvitationsForUser(user.email);
      setInvitations(userInvitations);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitation: Invitation) => {
    setProcessingId(invitation.id);
    try {
      const success = await supabaseService.acceptInvitation(invitation.id);
      if (success) {
        // Remove from pending invitations
        setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
        onInvitationAccepted(invitation);
      } else {
        alert('Failed to accept invitation. Please try again.');
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      alert(error.message || 'Failed to accept invitation.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineInvitation = async (invitation: Invitation) => {
    if (!confirm(`Are you sure you want to decline the invitation to ${invitation.spaceName}?`)) {
      return;
    }

    setProcessingId(invitation.id);
    try {
      // Update invitation status to declined
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'declined' })
        .eq('id', invitation.id);

      if (error) {
        throw error;
      }

      // Remove from pending invitations
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
    } catch (error: any) {
      console.error('Error declining invitation:', error);
      alert('Failed to decline invitation. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const formatTimeRemaining = (expiresAt: number) => {
    const now = Date.now();
    const timeLeft = expiresAt - now;
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) return 'Expired';
    if (daysLeft === 1) return '1 day left';
    return `${daysLeft} days left`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-slate-800">Pending Invitations</h2>
        </div>
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-slate-50 animate-pulse rounded-lg p-4 h-24"></div>
          ))}
        </div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-slate-800">Pending Invitations</h2>
        </div>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-600 mb-2">No pending invitations</h3>
          <p className="text-slate-500 text-sm">
            When someone invites you to a space, you'll see it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Mail className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-slate-800">
          Pending Invitations
          <span className="ml-2 bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
            {invitations.length}
          </span>
        </h2>
      </div>

      <div className="space-y-4">
        {invitations.map((invitation) => {
          const isExpired = new Date(invitation.expiresAt) < new Date();
          const isProcessing = processingId === invitation.id;

          return (
            <div
              key={invitation.id}
              className={`border rounded-lg p-4 transition-all ${
                isExpired
                  ? 'border-red-200 bg-red-50'
                  : 'border-slate-200 bg-white hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-800">{invitation.spaceName}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      invitation.role === 'editor'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {invitation.role}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 mb-3">
                    Invited by <strong>{invitation.inviterName}</strong> on {formatDate(invitation.createdAt)}
                  </p>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-4 h-4" />
                      <span className={isExpired ? 'text-red-600 font-medium' : ''}>
                        {formatTimeRemaining(invitation.expiresAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <Users className="w-4 h-4" />
                      <span>
                        {invitation.role === 'editor' ? 'Can edit widgets' : 'View only'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  {!isExpired && (
                    <>
                      <button
                        onClick={() => handleDeclineInvitation(invitation)}
                        disabled={isProcessing}
                        className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-50"
                        title="Decline invitation"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAcceptInvitation(invitation)}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Accepting...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Accept
                          </>
                        )}
                      </button>
                    </>
                  )}

                  {isExpired && (
                    <div className="text-sm text-red-600 font-medium px-3 py-2">
                      Expired
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <ExternalLink className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-1">Need help?</h4>
            <p className="text-sm text-blue-700">
              If you're having trouble accepting an invitation, make sure you're signed in with the email address that received the invitation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
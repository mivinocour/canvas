import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { PromptCards } from './components/PromptCards';
import { SpaceNameBar } from './components/SpaceNameBar';
import { AuthModal } from './components/AuthModal';
import { SpaceNamingModal } from './components/SpaceNamingModal';
import { SpaceSelector } from './components/SpaceSelector';
import { EmojiPicker } from './components/EmojiPicker';
import { InviteModal } from './components/InviteModal';
import { InvitationAcceptance } from './components/InvitationAcceptance';
import { InvitationsDashboard } from './components/InvitationsDashboard';
import { WidgetData } from './types';
import { WidgetData as SharedWidgetData, Space, Invitation } from './types/shared';
import { supabaseService } from './lib/supabase-service';
import { useAuth } from './hooks/useAuth';
import { useSpaces } from './hooks/useSpaces';
import { generateWidgetCode, updateWidgetCode } from './services/geminiService';
import { storage } from './lib/storage';

const App: React.FC = () => {
  const { user, loading: authLoading, signInWithGoogle, signUp, signIn, signOut, updateUserProfile } = useAuth();
  const { spaces, loading: spacesLoading, createSpace } = useSpaces(user);

  const [widgets, setWidgets] = useState<WidgetData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSpace, setCurrentSpace] = useState<Space | null>(null);
  const [localSpaces, setLocalSpaces] = useState<Space[]>([]);
  const [showSpacesDropdown, setShowSpacesDropdown] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSpaceNamingModal, setShowSpaceNamingModal] = useState(false);
  const [authSignInLoading, setAuthSignInLoading] = useState(false);
  const [pendingWidgetsForSave, setPendingWidgetsForSave] = useState<WidgetData[]>([]);
  const [showFirstWidgetPrompt, setShowFirstWidgetPrompt] = useState(false);
  const [creatingWidgets, setCreatingWidgets] = useState<{current: string, completed: string[], total: number} | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [intentionallyAtHome, setIntentionallyAtHome] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showInvitationDashboard, setShowInvitationDashboard] = useState(false);
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [spaceWidgetCounts, setSpaceWidgetCounts] = useState<{[spaceId: string]: number}>({});
  const isLoadingWidgetsRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Load widget counts for all spaces
  const loadSpaceWidgetCounts = useCallback(async (spacesList: Space[]) => {
    if (!user) return;

    const counts: {[spaceId: string]: number} = {};

    for (const space of spacesList) {
      try {
        const spaceWidgets = await storage.getSpaceWidgets(space.id);
        counts[space.id] = spaceWidgets.length;
      } catch (error) {
        console.error(`Failed to load widget count for space ${space.id}:`, error);
        counts[space.id] = 0;
      }
    }

    setSpaceWidgetCounts(counts);
  }, [user]);

  // Check for invitation link in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteParam = urlParams.get('invite');

    if (inviteParam) {
      setInvitationId(inviteParam);
      // Clear the URL parameter to avoid confusion
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Load spaces and restore current space on mount (only for non-authenticated users)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Use cache-first approach for faster loading
        const spaces = await storage.getSpaces(false); // Don't force refresh
        setLocalSpaces(spaces);

        const savedCurrentSpaceId = storage.getCurrentSpaceId();

        // We'll let the separate useEffect handle space restoration
      } catch (error) {
        console.error("Failed to load initial data", error);
      }
    };

    // Only load for non-authenticated users (authenticated users use useSpaces hook)
    if (!user) {
      loadInitialData();
    }
  }, [user]);

  // Save current space ID whenever it changes
  useEffect(() => {
    console.log('Current space changed to:', currentSpace?.name || 'null');
    storage.saveCurrentSpaceId(currentSpace?.id || null);
  }, [currentSpace]);

  // Load widget counts when spaces change
  useEffect(() => {
    if (user && spaces.length > 0) {
      loadSpaceWidgetCounts(spaces);
    }
  }, [user, spaces, loadSpaceWidgetCounts]);

  // Update widget count for current space when widgets change
  useEffect(() => {
    if (currentSpace && user) {
      setSpaceWidgetCounts(prev => ({
        ...prev,
        [currentSpace.id]: widgets.length
      }));
    }
  }, [widgets, currentSpace, user]);


  // Close dropdown when clicking outside
  useEffect(() => {
    if (showSpacesDropdown) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.spaces-dropdown-container')) {
          setShowSpacesDropdown(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSpacesDropdown]);

  // Sync widgets when browser/tab is closed
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (currentSpace) {
        console.log('Browser closing, syncing current space:', currentSpace.name);
        // Use synchronous method since beforeunload doesn't wait for async
        // We'll add this as a pending change instead
        storage.addPendingChange({
          type: 'space_sync' as any,
          data: { spaceId: currentSpace.id }
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentSpace]);

  // Load widgets from current space or local storage
  useEffect(() => {
    const loadWidgets = async () => {
      isLoadingWidgetsRef.current = true;

      try {
        if (currentSpace) {
          // Load widgets from current space via storage layer
          const spaceWidgets = await storage.getWidgetsBySpace(currentSpace.id);
          setWidgets(spaceWidgets);
        } else if (!user) {
          // Load from local storage when not authenticated and no space selected
          const localWidgets = storage.getWidgetsLocal();
          setWidgets(localWidgets.filter(w => !w.spaceId)); // Only widgets not assigned to a space
        } else {
          // Authenticated but no space selected - clear widgets
          setWidgets([]);
        }
      } catch (error) {
        console.error("Failed to load widgets", error);
        setWidgets([]);
      }

      // Reset loading flag after render cycle completes
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isLoadingWidgetsRef.current = false;
        });
      });
    };

    loadWidgets();
  }, [currentSpace, user]);


  // Only auto-select on initial load, not when user clicks Home
  useEffect(() => {
    if (!user && localSpaces.length > 0 && !currentSpace && !intentionallyAtHome) {
      const savedCurrentSpaceId = storage.getCurrentSpaceId();
      if (savedCurrentSpaceId) {
        const savedSpace = localSpaces.find(s => s.id === savedCurrentSpaceId);
        if (savedSpace) {
          console.log('Restoring saved space:', savedSpace.name);
          setCurrentSpace(savedSpace);
        }
      }
    }
  }, [localSpaces.length]); // Only run when localSpaces changes

  // Check if user needs to update their name from "Anonymous"
  useEffect(() => {
    if (user && user.displayName === 'Anonymous') {
      setShowNamePrompt(true);
    }
  }, [user]);

  const handleCreateWidget = async (prompt: string) => {
    setIsGenerating(true);
    try {
      const code = await generateWidgetCode(prompt);

      const now = Date.now();
      const newWidget: WidgetData = {
        id: crypto.randomUUID(),
        name: prompt.length > 25 ? prompt.substring(0, 25) + '...' : prompt,
        type: 'ai-app',
        // Place near center of "virtual" canvas (1000,1000) with some randomness
        position: { x: 1000 + Math.random() * 100, y: 1000 + Math.random() * 100 },
        size: { width: 320, height: 400 },
        code,
        prompt,
        createdAt: now,
        updatedAt: now,
        version: 1,
        lastSaved: now,
      };

      // Save via storage layer (handles both localStorage and Supabase)
      const spaceId = currentSpace?.id || '';
      await storage.saveWidget(newWidget, spaceId);

      // Update local state
      setWidgets(prevWidgets => [...prevWidgets, newWidget]);
    } catch (error) {
      alert("Failed to create the app. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateWidget = useCallback(async (id: string, updates: Partial<WidgetData>) => {
    const now = Date.now();
    const updatedWidget = widgets.find(w => w.id === id);

    if (!updatedWidget) return;

    const newWidgetData = {
      ...updatedWidget,
      ...updates,
      updatedAt: now,
      lastSaved: now,
      // Increment version if it's a code change (indicating an edit)
      version: updates.code !== undefined ? (updatedWidget.version || 1) + 1 : updatedWidget.version || 1
    };

    const spaceId = currentSpace?.id || '';

    // Check if this is just a position/size update (no need for immediate database sync)
    const isPositionOrSizeUpdate = (updates.position || updates.size) && !updates.code && !updates.name && !updates.prompt;

    if (isPositionOrSizeUpdate) {
      // Use local-only save for position/size changes (better performance)
      console.log('Local-only save for widget position/size update');
      storage.saveWidgetLocal(newWidgetData, spaceId);
    } else {
      // Use full save for content changes (code, name, prompt)
      console.log('Full save for widget content update');
      await storage.saveWidget(newWidgetData, spaceId);
    }

    // Update local state
    setWidgets(prevWidgets => prevWidgets.map(w => w.id === id ? newWidgetData : w));
  }, [widgets, currentSpace]);

  const handleDeleteWidget = useCallback(async (id: string) => {
    // Delete via storage layer
    await storage.deleteWidget(id);

    // Update local state
    setWidgets(prevWidgets => prevWidgets.filter(w => w.id !== id));
  }, []);

  const handleUpdateSpaceEmoji = useCallback(async (spaceId: string, emoji: string) => {
    try {
      const updatedSpace = await storage.updateSpaceDetails(spaceId, { emoji });
      if (updatedSpace) {
        // Update local spaces list
        setLocalSpaces(prevSpaces =>
          prevSpaces.map(space =>
            space.id === spaceId ? updatedSpace : space
          )
        );

        // Update current space if it's the one being edited
        if (currentSpace?.id === spaceId) {
          setCurrentSpace(updatedSpace);
        }
      }
    } catch (error) {
      console.error('Failed to update space emoji:', error);
    }
  }, [currentSpace]);

  const handleInviteToSpace = useCallback(async (email: string, role: 'viewer' | 'editor'): Promise<string | void> => {
    if (!currentSpace || !user) return;

    try {
      const invitation = await supabaseService.createInvitation(currentSpace.id, email, role);
      if (invitation) {
        console.log('Invitation sent successfully to:', email);
        return invitation.id; // Return invitation ID for link generation
      }
    } catch (error: any) {
      console.error('Failed to send invitation:', error);
      throw error; // Re-throw to let the modal handle the error display
    }
  }, [currentSpace, user]);

  const handleInvitationAccepted = useCallback(async (invitation: Invitation) => {
    console.log('Invitation accepted:', invitation);
    // Refresh spaces list to show the newly joined space
    try {
      if (user) {
        // Force refresh spaces from server
        const updatedSpaces = await storage.getSpaces(true);
        setLocalSpaces(updatedSpaces);

        // Optionally switch to the newly joined space
        const newSpace = updatedSpaces.find(s => s.id === invitation.spaceId);
        if (newSpace) {
          setCurrentSpace(newSpace);
          setIntentionallyAtHome(false);
        }
      }
    } catch (error) {
      console.error('Error refreshing spaces after invitation acceptance:', error);
    }

    // Close invitation view
    setInvitationId(null);
  }, [user]);

  const handleDeleteSpace = useCallback(async (spaceId: string) => {
    if (window.confirm('Are you sure you want to delete this space? This action cannot be undone.')) {
      try {
        // Immediately update UI for responsive feedback
        setLocalSpaces(prevSpaces => prevSpaces.filter(space => space.id !== spaceId));

        // Update spaces from useSpaces hook if user is authenticated
        if (user) {
          // The storage layer will handle the actual deletion and sync
        }

        // If deleting current space, go home
        if (currentSpace?.id === spaceId) {
          setCurrentSpace(null);
          setWidgets([]);
          setIntentionallyAtHome(true);
        }

        // Perform the actual deletion in the background
        await storage.deleteSpace(spaceId);
        console.log('Space deleted successfully');
      } catch (error) {
        console.error('Failed to delete space:', error);
        // Revert the UI change if deletion failed
        const spaces = await storage.getSpaces(true);
        setLocalSpaces(spaces);
      }
    }
  }, [currentSpace, user]);

  const handleEditWidget = useCallback(async (id: string, instruction: string) => {
    const widget = widgets.find(w => w.id === id);
    if (!widget) return;

    try {
      const newCode = await updateWidgetCode(widget.code, instruction);
      const now = Date.now();

      const updatedWidget = {
        ...widget,
        code: newCode,
        updatedAt: now,
        lastSaved: now,
        version: (widget.version || 1) + 1,
      };

      // Save via storage layer
      const spaceId = currentSpace?.id || '';
      await storage.saveWidget(updatedWidget, spaceId);

      // Update local state
      setWidgets(prevWidgets => prevWidgets.map(w => w.id === id ? updatedWidget : w));
    } catch (error) {
      console.error("Edit failed:", error);
      throw error; // Re-throw so WidgetWindow knows it failed
    }
  }, [widgets, currentSpace]);

  const handleResetWidget = useCallback(async (id: string) => {
    const widget = widgets.find(w => w.id === id);
    if (!widget) return;

    try {
      // Try to get the original widget code from storage or regenerate it
      const spaceId = currentSpace?.id || '';
      const originalWidget = await storage.getWidget(id, spaceId);

      if (originalWidget && originalWidget.prompt) {
        // Regenerate the widget from the original prompt
        const newCode = await generateWidgetCode(originalWidget.prompt);
        const now = Date.now();

        const resetWidget = {
          ...widget,
          code: newCode,
          updatedAt: now,
          lastSaved: now,
          version: (widget.version || 1) + 1,
        };

        await storage.saveWidget(resetWidget, spaceId);
        setWidgets(prevWidgets => prevWidgets.map(w => w.id === id ? resetWidget : w));
      }
    } catch (error) {
      console.error("Reset failed:", error);
    }
  }, [widgets, currentSpace]);

  // Authentication handlers
  const handleSignIn = async () => {
    setAuthSignInLoading(true);
    try {
      const hasExistingWidgets = widgets.length > 0;

      // Store widgets before sign in for space creation
      if (hasExistingWidgets) {
        setPendingWidgetsForSave([...widgets]);
      }

      await signInWithGoogle();
      setShowAuthModal(false);

      // If user had widgets before signing in, show space naming modal
      if (hasExistingWidgets) {
        setShowSpaceNamingModal(true);
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      setPendingWidgetsForSave([]); // Clear on error
    } finally {
      setAuthSignInLoading(false);
    }
  };

  const handleEmailSignIn = async (email: string, password: string) => {
    const hasExistingWidgets = widgets.length > 0;

    // Store widgets before sign in for space creation
    if (hasExistingWidgets) {
      setPendingWidgetsForSave([...widgets]);
    }

    await signIn(email, password);
    setShowAuthModal(false);

    // If user had widgets before signing in, show space naming modal
    if (hasExistingWidgets) {
      setShowSpaceNamingModal(true);
    }
  };

  const handleEmailSignUp = async (email: string, password: string, fullName?: string) => {
    const hasExistingWidgets = widgets.length > 0;

    // Store widgets before sign up for space creation
    if (hasExistingWidgets) {
      setPendingWidgetsForSave([...widgets]);
    }

    const result = await signUp(email, password, fullName);

    if (result.needsConfirmation) {
      alert('Please check your email and click the confirmation link to complete your account setup.');
    } else {
      setShowAuthModal(false);

      // If user had widgets before signing up, show space naming modal
      if (hasExistingWidgets) {
        setShowSpaceNamingModal(true);
      }
    }
  };

  const handleCreateSpace = async (name: string, description?: string) => {
    // Use pendingWidgetsForSave if available (from "Save Space" button), otherwise empty array (from "New Space" button)
    const widgetsToSave = pendingWidgetsForSave.length > 0 ? [...pendingWidgetsForSave] : [];

    // Create new space object without emoji (removed for database compatibility)
    const newSpace: Space = {
      id: crypto.randomUUID(),
      name,
      description: description || '',
      ownerId: '',
      members: [],
      widgets: widgetsToSave,
      inviteCode: '',
      isPublic: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (user) {
      // If authenticated, use the createSpace from hook
      await createSpace(name, description, newSpace.widgets);
    } else {
      // For local users, save via storage layer
      await storage.saveSpace(newSpace);

      // Save all pending widgets to this new space
      for (const widget of widgetsToSave) {
        await storage.saveWidget(widget, newSpace.id);
      }

      // Refresh spaces list
      const updatedSpaces = await storage.getSpaces();
      setLocalSpaces(updatedSpaces);
    }

    setIntentionallyAtHome(false);
    setCurrentSpace(newSpace);
    setWidgets(widgetsToSave);
    setPendingWidgetsForSave([]); // Clear pending widgets
  };

  const handleCreateSpaceFromModal = async (name: string, description?: string, selectedWidgets?: string[]) => {
    try {
      await handleCreateSpace(name, description);
      setShowSpaceNamingModal(false);

      // If widgets were selected, create them
      if (selectedWidgets && selectedWidgets.length > 0) {
        setIsGenerating(true);
        setCreatingWidgets({ current: '', completed: [], total: selectedWidgets.length });
        const newWidgets: WidgetData[] = [];

        for (let i = 0; i < selectedWidgets.length; i++) {
          const widgetPrompt = selectedWidgets[i];

          // Update progress to show current widget being created
          setCreatingWidgets(prev => prev ? { ...prev, current: widgetPrompt } : null);

          try {
            const code = await generateWidgetCode(widgetPrompt);

            const now = Date.now();
            const newWidget: WidgetData = {
              id: crypto.randomUUID(),
              name: widgetPrompt.length > 25 ? widgetPrompt.substring(0, 25) + '...' : widgetPrompt,
              type: 'ai-app',
              // Place near center of "virtual" canvas (1000,1000) with some randomness
              position: { x: 1000 + Math.random() * 200 - 100, y: 1000 + Math.random() * 200 - 100 },
              size: { width: 320, height: 400 },
              code,
              prompt: widgetPrompt,
              createdAt: now,
              updatedAt: now,
              version: 1,
              lastSaved: now,
            };

            // Save widget via storage layer
            const spaceId = currentSpace?.id || '';
            await storage.saveWidget(newWidget, spaceId);

            newWidgets.push(newWidget);

            // Update widgets state immediately so user sees progress
            setWidgets([...newWidgets]);

            // Update progress to show completed widget
            setCreatingWidgets(prev => prev ? {
              ...prev,
              current: i < selectedWidgets.length - 1 ? selectedWidgets[i + 1] : '',
              completed: [...prev.completed, widgetPrompt]
            } : null);

          } catch (error) {
            console.error(`Failed to create widget: ${widgetPrompt}`, error);
            // Still update progress even if this widget failed
            setCreatingWidgets(prev => prev ? {
              ...prev,
              current: i < selectedWidgets.length - 1 ? selectedWidgets[i + 1] : '',
              completed: [...prev.completed, `❌ ${widgetPrompt} (failed)`]
            } : null);
          }
        }

        setIsGenerating(false);
        setCreatingWidgets(null);
      } else if (pendingWidgetsForSave.length === 0) {
        // If no widgets exist and none were selected, show first widget creation prompt
        setShowFirstWidgetPrompt(true);
      }
    } catch (error) {
      console.error('Failed to create space:', error);
      setIsGenerating(false);
      throw error; // Let the modal handle the error
    }
  };

  const handleCancelSpaceNaming = () => {
    setShowSpaceNamingModal(false);
    setPendingWidgetsForSave([]); // Clear pending widgets
  };

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="w-screen h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle invitation acceptance page
  if (invitationId) {
    return (
      <InvitationAcceptance
        invitationId={invitationId}
        user={user}
        onAccepted={handleInvitationAccepted}
        onSignInRequired={() => setShowAuthModal(true)}
      />
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Floating editable space name bar */}
      {currentSpace && (
        <SpaceNameBar
          name={currentSpace.name}
          emoji={currentSpace.emoji}
          onRename={async (newName) => {
            const updatedSpace = { ...currentSpace, name: newName, updatedAt: Date.now() };

            // Save via storage layer
            await storage.saveSpace(updatedSpace);

            // Update local state
            setCurrentSpace(updatedSpace);

            // Refresh spaces list
            const updatedSpaces = await storage.getSpaces();
            setLocalSpaces(updatedSpaces);
          }}
          onEmojiChange={async (emoji) => {
            await handleUpdateSpaceEmoji(currentSpace.id, emoji);
          }}
          onInvite={user ? () => setShowInviteModal(true) : undefined}
        />
      )}

      {/* Widget Creation Progress - Below Space Title */}
      {creatingWidgets && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 max-w-sm w-full mx-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-slate-700">
                Creating {creatingWidgets.completed.length}/{creatingWidgets.total}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              {Math.round((creatingWidgets.completed.length / creatingWidgets.total) * 100)}%
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className="bg-slate-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(creatingWidgets.completed.length / creatingWidgets.total) * 100}%` }}
            ></div>
          </div>

          {/* Current widget being created */}
          {creatingWidgets.current && (
            <div className="mt-1">
              <div className="text-xs text-slate-500 truncate">
                {creatingWidgets.current}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Space selector - shown only when authenticated */}
      {user && (
        <SpaceSelector
          user={user}
          spaces={spaces}
          currentSpace={currentSpace}
          onSpaceSelect={async (space) => {
            // Sync current space before switching
            if (currentSpace) {
              console.log('Syncing current space before switching:', currentSpace.name);
              await storage.syncSpaceWidgets(currentSpace.id);
            }
            setIntentionallyAtHome(false);
            setCurrentSpace(space);
          }}
          onCreateSpace={handleCreateSpace}
          onSignOut={signOut}
          onUpdateSpaceEmoji={handleUpdateSpaceEmoji}
          onViewInvitations={() => setShowInvitationDashboard(true)}
        />
      )}

      {/* Sign in button for unauthenticated users */}
      {!user && (
        <button
          onClick={() => setShowAuthModal(true)}
          className="fixed top-4 left-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors z-40 flex items-center gap-2 shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Sign In
        </button>
      )}


      {/* Save button - only show when there are widgets and user is not authenticated */}
      {!user && widgets.length > 0 && !currentSpace && (
        <button
          onClick={() => {
            setPendingWidgetsForSave([...widgets]);
            setShowAuthModal(true);
          }}
          className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors z-40 flex items-center gap-2 shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Save Space
        </button>
      )}

      {/* Home button - show when user is in a space */}
      {user && currentSpace && (
        <button
          onClick={async () => {
            console.log('Going home from top-right button');
            // Sync current space before going home
            if (currentSpace) {
              console.log('Syncing current space before going home:', currentSpace.name);
              await storage.syncSpaceWidgets(currentSpace.id);
            }
            setIntentionallyAtHome(true);
            setCurrentSpace(null);
            setWidgets([]);
          }}
          className="fixed top-4 right-4 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors z-40 flex items-center gap-2 shadow-lg border border-gray-200"
          title="Go Home"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </button>
      )}

      <Canvas
        widgets={widgets}
        onUpdateWidget={handleUpdateWidget}
        onDeleteWidget={handleDeleteWidget}
        onEditWidget={handleEditWidget}
        onResetWidget={handleResetWidget}
      />

      <Toolbar
        onCreate={handleCreateWidget}
        isGenerating={isGenerating}
      />

      {/* Welcome Modal - Empty State */}
      {/* Only show welcome screen if no space is selected and no widgets exist and no other modals are open */}
      {(() => {
        const shouldShow = widgets.length === 0 && !isGenerating && !currentSpace && !showSpaceNamingModal;
        console.log('Welcome modal should show:', shouldShow, {
          widgetsLength: widgets.length,
          isGenerating,
          currentSpace: currentSpace?.name || null,
          showSpaceNamingModal
        });
        return shouldShow;
      })() && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[100] bg-black bg-opacity-20 flex items-center justify-center"
          style={{
            position: 'fixed',
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-lg w-full mx-6"
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: localSpaces.length > 0 ? '32rem' : '28rem',
              width: '100%',
              margin: '0 24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              marginTop: user ? '30px' : '0px'
            }}
          >
            {/* Colorful 3D Logo */}
            <div
              style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 24px auto',
                position: 'relative'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  right: '0',
                  bottom: '0',
                  background: 'linear-gradient(135deg, #f472b6 0%, #60a5fa 50%, #34d399 100%)',
                  borderRadius: '12px',
                  transform: 'rotate(3deg)',
                  opacity: '0.8'
                }}
              ></div>
              <div
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: '2px',
                  right: '2px',
                  bottom: '2px',
                  background: 'linear-gradient(315deg, #fca5a5 0%, #c084fc 50%, #93c5fd 100%)',
                  borderRadius: '8px',
                  transform: 'rotate(-2deg)'
                }}
              ></div>
              <div
                style={{
                  position: 'absolute',
                  top: '4px',
                  left: '4px',
                  right: '4px',
                  bottom: '4px',
                  background: 'linear-gradient(135deg, #ddd6fe 0%, #bfdbfe 50%, #fce7f3 100%)',
                  borderRadius: '6px'
                }}
              ></div>
            </div>

            {/* Title */}
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#1e293b',
                textAlign: 'center',
                marginBottom: '8px'
              }}
            >
              Playground
            </h1>

            {/* Description */}
            <p
              style={{
                fontSize: '14px',
                color: '#64748b',
                textAlign: 'center',
                lineHeight: '1.6',
                marginBottom: '24px'
              }}
            >
              {user && currentSpace
                ? `Building in ${currentSpace.name}`
                : user
                ? "Create your first space to get started, or try the ideas below!"
                : "A shared canvas for your imagination. Build mini-apps for your friends, your partner, or your team in seconds."
              }
            </p>

            {/* Action buttons for unauthenticated users */}
            {!user && (
              <div style={{ marginBottom: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={() => {
                    console.log('Create Space clicked from welcome - requesting auth');
                    setPendingWidgetsForSave([...widgets]);
                    setShowAuthModal(true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minWidth: '200px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1d4ed8';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#2563eb';
                    e.currentTarget.style.transform = 'translateY(0px)';
                  }}
                >
                  <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Space
                </button>

                <button
                  onClick={() => {
                    console.log('Sign in clicked from welcome');
                    setPendingWidgetsForSave([...widgets]);
                    setShowAuthModal(true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'transparent',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minWidth: '200px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  {widgets.length > 0 ? 'Sign In to Save Work' : 'Sign In'}
                </button>
              </div>
            )}


            {/* Spaces for authenticated users */}
            {user && !currentSpace && (
              <div style={{ marginBottom: '32px' }}>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1e293b',
                    textAlign: 'center',
                    marginBottom: '16px'
                  }}
                >
                  Your Spaces
                </h3>

                {spaces.length === 0 ? (
                  // Show only create button when no spaces
                  <div style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        console.log('Create Space clicked by authenticated user');
                        setPendingWidgetsForSave([...widgets]);
                        setShowSpaceNamingModal(true);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: '#000000',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#1f2937';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#000000';
                        e.currentTarget.style.transform = 'translateY(0px)';
                      }}
                    >
                      <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Space
                    </button>
                  </div>
                ) : (
                  // Show clean spaces list like the provided design
                  <div className="max-w-sm mx-auto">
                    <div className="space-y-1" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                      {spaces.map((space, index) => {
                        const defaultEmojis = ['🚀', '🎨', '💡', '🔥', '✨', '🌟', '🎯', '💪', '🎪', '🌈', '🎵', '🏆'];
                        const displayEmoji = space.emoji || defaultEmojis[index % defaultEmojis.length];

                        // Get widget count for this space from cached counts, fallback to current space check
                        const widgetCount = spaceWidgetCounts[space.id] ?? (currentSpace?.id === space.id ? widgets.length : 0);

                        return (
                          <button
                            key={space.id}
                            onClick={() => {
                              setCurrentSpace(space);
                              setIntentionallyAtHome(false);
                            }}
                            className="w-full flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg transition-colors text-left group"
                          >
                            <div className="flex items-center justify-center w-6 h-6 bg-purple-100 rounded">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSpaceId(space.id);
                                  setShowEmojiPicker(true);
                                }}
                                className="text-base hover:scale-110 transition-transform"
                                title="Change emoji"
                              >
                                {displayEmoji}
                              </button>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900">{space.name}</p>
                              <p className="text-xs text-slate-500">{widgetCount} widget{widgetCount !== 1 ? 's' : ''}</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSpace(space.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded transition-all"
                              title="Delete space"
                            >
                              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </button>
                        );
                      })}
                    </div>

                    {/* Create space button - black design centered */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-center">
                      <button
                        onClick={() => {
                          console.log('Create Space clicked by authenticated user');
                          setPendingWidgetsForSave([...widgets]);
                          setShowSpaceNamingModal(true);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-black hover:bg-gray-800 rounded-lg transition-colors text-white"
                      >
                        <div className="flex items-center justify-center w-4 h-4 bg-white/20 rounded">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium">Create New Space</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Prompt Cards */}
            <PromptCards onSelectPrompt={handleCreateWidget} />
          </div>
        </div>
      )}

      {/* Authentication Modal */}
      {showAuthModal && (
        <AuthModal
          onSignIn={handleSignIn}
          onEmailSignIn={handleEmailSignIn}
          onEmailSignUp={handleEmailSignUp}
          onCancel={() => setShowAuthModal(false)}
          loading={authSignInLoading}
          hasWidgets={widgets.length > 0}
        />
      )}

      {/* Name Update Modal */}
      {showNamePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold text-slate-800 mb-2">
                What's your name?
              </h1>
              <p className="text-slate-600 text-sm">
                Help us personalize your experience by adding your name.
              </p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const fullName = formData.get('fullName') as string;
              if (fullName.trim()) {
                try {
                  await updateUserProfile(fullName.trim());
                  setShowNamePrompt(false);
                } catch (error) {
                  console.error('Failed to update name:', error);
                }
              }
            }} className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNamePrompt(false)}
                  className="flex-1 py-2 px-4 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Update Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Space Naming Modal - Higher z-index to appear above welcome modal */}
      {(() => {
        console.log('SpaceNamingModal should show:', showSpaceNamingModal);
        return showSpaceNamingModal;
      })() && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200 }}>
          <SpaceNamingModal
            onCreateSpace={handleCreateSpaceFromModal}
            onCancel={handleCancelSpaceNaming}
            loading={authSignInLoading}
            widgetCount={pendingWidgetsForSave.length}
          />
        </div>
      )}


      {/* First Widget Creation Prompt */}
      {showFirstWidgetPrompt && currentSpace && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-400 via-blue-400 to-purple-500 rounded-xl transform rotate-3 opacity-80"></div>
              <div className="absolute inset-0.5 bg-gradient-to-tl from-green-300 via-blue-300 to-purple-300 rounded-lg transform -rotate-2"></div>
              <div className="absolute inset-1 bg-gradient-to-br from-blue-200 via-purple-200 to-green-200 rounded-md flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>

            <h1 className="text-2xl font-semibold text-slate-800 mb-2">
              Welcome to {currentSpace.name}!
            </h1>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Your space is ready. Time to create your first widget! What would you like to build?
            </p>

            <div className="space-y-3 mb-6">
              {['Todo List', 'Calculator', 'Weather Widget', 'Random Quote Generator'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setShowFirstWidgetPrompt(false);
                    handleCreateWidget(suggestion.toLowerCase());
                  }}
                  className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors text-slate-700 font-medium"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="text-center border-t pt-6">
              <button
                onClick={() => setShowFirstWidgetPrompt(false)}
                className="text-slate-600 hover:text-slate-800 text-sm font-medium underline underline-offset-4"
              >
                I'll create one later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emoji Picker Modal */}
      {showEmojiPicker && editingSpaceId && (
        <EmojiPicker
          currentEmoji={spaces.find(s => s.id === editingSpaceId)?.emoji}
          onSelect={async (emoji) => {
            await handleUpdateSpaceEmoji(editingSpaceId, emoji);
          }}
          onClose={() => {
            setShowEmojiPicker(false);
            setEditingSpaceId(null);
          }}
        />
      )}

      {/* Invite Modal */}
      {showInviteModal && currentSpace && (
        <InviteModal
          space={currentSpace}
          onInvite={handleInviteToSpace}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Invitations Dashboard Modal */}
      {showInvitationDashboard && user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">Invitations</h2>
              <button
                onClick={() => setShowInvitationDashboard(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
              <InvitationsDashboard
                user={user}
                onInvitationAccepted={handleInvitationAccepted}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

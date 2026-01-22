import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { PromptCards } from './components/PromptCards';
import { SpaceNameBar } from './components/SpaceNameBar';
import { AuthModal } from './components/AuthModal';
import { SpaceNamingModal } from './components/SpaceNamingModal';
import { SpaceSelector } from './components/SpaceSelector';
import { WidgetData } from './types';
import { WidgetData as SharedWidgetData, Space } from './types/shared';
// import { useAuth } from './hooks/useAuth';
import { useSpaces } from './hooks/useSpaces';
import { generateWidgetCode, updateWidgetCode } from './services/geminiService';
import { supabase } from './lib/supabase';

const STORAGE_KEY = 'ourworld_canvas_data';
const SPACES_STORAGE_KEY = 'ourworld_spaces_data';

const App: React.FC = () => {
  const user = null; // All users are treated as unauthenticated
const authLoading = false; 
const signInWithGoogle = () => {}; 
const signOut = () => {};
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
  const isLoadingWidgetsRef = useRef(false);

  // Load local spaces on mount
  useEffect(() => {
    if (!user) {
      const savedSpaces = localStorage.getItem(SPACES_STORAGE_KEY);
      if (savedSpaces) {
        try {
          const spaces = JSON.parse(savedSpaces);
          setLocalSpaces(spaces);
          // Auto-select first space if available
          if (spaces.length > 0 && !currentSpace) {
            setCurrentSpace(spaces[0]);
          }
        } catch (e) {
          console.error("Failed to load saved spaces", e);
        }
      }
    }
  }, [user]);

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

  // Load widgets from current space or local storage
  useEffect(() => {
    isLoadingWidgetsRef.current = true;
    
    if (currentSpace) {
      // Load widgets from current space
      const spaceWidgets = currentSpace.widgets || [];
      setWidgets(spaceWidgets);
    } else if (!user) {
      // Load from local storage when not authenticated and no space selected
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setWidgets(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to load saved widgets", e);
        }
      }
    } else {
      // Authenticated but no space selected - clear widgets
      setWidgets([]);
    }
    
    // Reset loading flag after render cycle completes
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isLoadingWidgetsRef.current = false;
      });
    });
  }, [currentSpace, user]);

  // Save widgets to current space or local storage
  useEffect(() => {
    // Skip saving if we're currently loading widgets to prevent circular updates
    if (isLoadingWidgetsRef.current) {
      return;
    }
    
    if (!user) {
      if (currentSpace) {
        // Only update if widgets actually changed to prevent circular updates
        const currentWidgetsStr = JSON.stringify(currentSpace.widgets || []);
        const newWidgetsStr = JSON.stringify(widgets);
        
        if (currentWidgetsStr !== newWidgetsStr) {
          // Update the space with current widgets
          const updatedSpace = { ...currentSpace, widgets, updatedAt: Date.now() };
          setCurrentSpace(updatedSpace);
          
          // Update in localSpaces array using functional update to avoid dependency
          setLocalSpaces(prevSpaces => {
            const updatedSpaces = prevSpaces.map(s =>
              s.id === currentSpace.id ? updatedSpace : s
            );
            localStorage.setItem(SPACES_STORAGE_KEY, JSON.stringify(updatedSpaces));
            return updatedSpaces;
          });
        }
      } else {
        // No space selected, save to old storage key for backward compatibility
        localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
      }
    }
  }, [widgets, user, currentSpace]);

  // Auto-select first space when spaces load
  useEffect(() => {
    if (spaces && spaces.length > 0 && !currentSpace) {
      setCurrentSpace(spaces[0]);
    }
  }, [spaces, currentSpace]);

  const handleCreateWidget = async (prompt: string) => {
    setIsGenerating(true);
    try {
      const code = await generateWidgetCode(prompt);

      const newWidget: WidgetData = {
        id: crypto.randomUUID(),
        name: prompt.length > 25 ? prompt.substring(0, 25) + '...' : prompt,
        type: 'ai-app',
        // Place near center of "virtual" canvas (1000,1000) with some randomness
        position: { x: 1000 + Math.random() * 100, y: 1000 + Math.random() * 100 },
        size: { width: 320, height: 400 },
        code,
        prompt,
        createdAt: Date.now(),
      };

      const updatedWidgets = [...widgets, newWidget];
      setWidgets(updatedWidgets);

      // Update Supabase if in a shared space
      if (false) { // disabled cloud save
        await supabase
          .from('spaces')
          .update({ widgets: updatedWidgets })
          .eq('id', currentSpace.id);
      }
    } catch (error) {
      alert("Failed to create the app. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateWidget = useCallback(async (id: string, updates: Partial<WidgetData>) => {
    const updatedWidgets = widgets.map(w =>
      w.id === id
        ? {
            ...w,
            ...updates,
          }
        : w
    );
    setWidgets(updatedWidgets);

    // Update Supabase if in a shared space
    if (false) { // disabled cloud save
      await supabase
        .from('spaces')
        .update({ widgets: updatedWidgets })
        .eq('id', currentSpace.id);
    }
  }, [widgets, currentSpace, user]);

  const handleDeleteWidget = useCallback(async (id: string) => {
    const updatedWidgets = widgets.filter(w => w.id !== id);
    setWidgets(updatedWidgets);

    // Update Supabase if in a shared space
    if (false) { // disabled cloud save
      await supabase
        .from('spaces')
        .update({ widgets: updatedWidgets })
        .eq('id', currentSpace.id);
    }
  }, [widgets, currentSpace, user]);

  const handleEditWidget = useCallback(async (id: string, instruction: string) => {
    const widget = widgets.find(w => w.id === id);
    if (!widget) return;

    try {
      const newCode = await updateWidgetCode(widget.code, instruction);
      const updatedWidgets = widgets.map(w =>
        w.id === id
          ? {
              ...w,
              code: newCode,
            }
          : w
      );
      setWidgets(updatedWidgets);

      // Update Supabase if in a shared space
      if (false) { // disabled cloud save
        await supabase
          .from('spaces')
          .update({ widgets: updatedWidgets })
          .eq('id', currentSpace.id);
      }
    } catch (error) {
      console.error("Edit failed:", error);
      throw error; // Re-throw so WidgetWindow knows it failed
    }
  }, [widgets, currentSpace, user]);

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

  const handleCreateSpace = async (name: string, description?: string) => {
    const spaceId = crypto.randomUUID();
    
    // Use pendingWidgetsForSave if available (from "Save Space" button), otherwise empty array (from "New Space" button)
    const widgetsToSave = pendingWidgetsForSave.length > 0 ? [...pendingWidgetsForSave] : [];
    
    // Create new space object
    const newSpace: Space = {
      id: spaceId,
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
      // For local users, save to localStorage
      const updatedSpaces = [...localSpaces, newSpace];
      setLocalSpaces(updatedSpaces);
      localStorage.setItem(SPACES_STORAGE_KEY, JSON.stringify(updatedSpaces));
    }

    setCurrentSpace(newSpace);
    // Clear widgets when creating a new space - they'll be loaded from the space
    setWidgets(widgetsToSave);
    setPendingWidgetsForSave([]); // Clear pending widgets
  };

  const handleCreateSpaceFromModal = async (name: string, description?: string) => {
    try {
      await handleCreateSpace(name, description);
      setShowSpaceNamingModal(false);
    } catch (error) {
      console.error('Failed to create space:', error);
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

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Floating editable space name bar */}
      {currentSpace && (
        <SpaceNameBar
          name={currentSpace.name}
          onRename={newName => {
            const updatedSpace = { ...currentSpace, name: newName, updatedAt: Date.now() };
            setCurrentSpace(updatedSpace);
            
            if (user) {
              // Update in spaces from hook (if authenticated)
              // This would normally update Supabase, but it's disabled
            } else {
              // Update in localSpaces and localStorage
              const updatedSpaces = localSpaces.map(s =>
                s.id === currentSpace.id ? updatedSpace : s
              );
              setLocalSpaces(updatedSpaces);
              localStorage.setItem(SPACES_STORAGE_KEY, JSON.stringify(updatedSpaces));
            }
          }}
        />
      )}
      {/* Space selector - shown only when authenticated */}
      {user && (
        <SpaceSelector
          user={user}
          spaces={spaces}
          currentSpace={currentSpace}
          onSpaceSelect={setCurrentSpace}
          onCreateSpace={handleCreateSpace}
          onSignOut={signOut}
        />
      )}

      {/* Local spaces selector - for unauthenticated users */}
      {!user && (
        <div className="fixed top-4 left-4 z-40 spaces-dropdown-container">
          <div className="relative">
            <button
              onClick={() => setShowSpacesDropdown(!showSpacesDropdown)}
              className="bg-white shadow-lg border border-slate-200 rounded-lg px-4 py-2 flex items-center gap-3 hover:shadow-xl transition-shadow"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-slate-800">
                  {currentSpace?.name || 'No Space Selected'}
                </p>
                <p className="text-xs text-slate-500">{localSpaces.length} space{localSpaces.length !== 1 ? 's' : ''}</p>
              </div>
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showSpacesDropdown && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white shadow-xl border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-800">Your Spaces</h3>
                    <button
                      onClick={() => {
                        // Clear widgets for new space - it should start empty
                        setPendingWidgetsForSave([]);
                        setShowSpaceNamingModal(true);
                        setShowSpacesDropdown(false);
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Space
                    </button>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {localSpaces.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">
                      <p className="mb-2">No spaces yet.</p>
                      <p className="text-xs">Click "New Space" above to create one!</p>
                    </div>
                  ) : (
                    localSpaces.map((space) => (
                      <div
                        key={space.id}
                        className="w-full p-3 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-b-0 group"
                      >
                        <button
                          onClick={() => {
                            setCurrentSpace(space);
                            setShowSpacesDropdown(false);
                          }}
                          className="flex-1 flex items-center gap-3 text-left"
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-blue-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-800">{space.name}</p>
                            <p className="text-xs text-slate-500">{space.widgets?.length || 0} widget{(space.widgets?.length || 0) !== 1 ? 's' : ''}</p>
                          </div>
                          {currentSpace?.id === space.id && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete "${space.name}"? This will permanently delete the space and all its widgets. This cannot be undone.`)) {
                              // Remove space from localSpaces
                              setLocalSpaces(prevSpaces => {
                                const updatedSpaces = prevSpaces.filter(s => s.id !== space.id);
                                localStorage.setItem(SPACES_STORAGE_KEY, JSON.stringify(updatedSpaces));
                                
                                // If deleting current space and there are other spaces, switch to the first one, otherwise go home
                                if (currentSpace?.id === space.id) {
                                  if (updatedSpaces.length > 0) {
                                    setCurrentSpace(updatedSpaces[0]);
                                  } else {
                                    setCurrentSpace(null);
                                    setWidgets([]);
                                    localStorage.removeItem(STORAGE_KEY);
                                  }
                                }
                                
                                return updatedSpaces;
                              });
                              setShowSpacesDropdown(false);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete space"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Home button - shown when a space is selected */}
      {!user && currentSpace && (
        <button
          onClick={() => {
            setCurrentSpace(null);
            setWidgets([]);
            // Clear old localStorage to ensure welcome screen shows
            localStorage.removeItem(STORAGE_KEY);
          }}
          className="fixed top-4 right-4 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors z-40 flex items-center gap-2 shadow-lg"
          title="Go Home"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </button>
      )}

      {/* Save button - only show when there are widgets and user is not authenticated */}
      {!user && widgets.length > 0 && !currentSpace && (
        <button
          onClick={() => {
            setPendingWidgetsForSave([...widgets]);
            setShowSpaceNamingModal(true);
          }}
          className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors z-40 flex items-center gap-2 shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Save Space
        </button>
      )}

      <Canvas
        widgets={widgets}
        onUpdateWidget={handleUpdateWidget}
        onDeleteWidget={handleDeleteWidget}
        onEditWidget={handleEditWidget}
      />

      <Toolbar
        onCreate={handleCreateWidget}
        isGenerating={isGenerating}
      />

      {/* Welcome Modal - Empty State */}
      {/* Only show welcome screen if no space is selected and no widgets exist */}
      {widgets.length === 0 && !isGenerating && !currentSpace && (
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
                marginBottom: localSpaces.length > 0 ? '24px' : '32px'
              }}
            >
              {user && currentSpace
                ? `Building in ${currentSpace.name}`
                : user
                ? "Create your first space to get started, or try the ideas below!"
                : "A shared canvas for your imagination. Build mini-apps for your friends, your partner, or your team in seconds."
              }
            </p>

            {/* Available Spaces - show when no space is selected */}
            {!user && localSpaces.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '12px',
                  textAlign: 'center'
                }}>
                  Your Spaces
                </h3>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {localSpaces.map((space) => (
                    <div
                      key={space.id}
                      className="space-item-welcome"
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f1f5f9';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        const trashBtn = e.currentTarget.querySelector('.trash-btn-welcome') as HTMLElement;
                        if (trashBtn) {
                          trashBtn.style.opacity = '1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        const trashBtn = e.currentTarget.querySelector('.trash-btn-welcome') as HTMLElement;
                        if (trashBtn) {
                          trashBtn.style.opacity = '0';
                        }
                      }}
                    >
                      <button
                        onClick={() => {
                          setCurrentSpace(space);
                        }}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          background: 'transparent',
                          border: 'none',
                          padding: 0
                        }}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          background: 'linear-gradient(135deg, #f472b6 0%, #60a5fa 100%)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <svg style={{ width: '16px', height: '16px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#1e293b',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {space.name}
                          </p>
                          <p style={{
                            fontSize: '12px',
                            color: '#64748b',
                            margin: '2px 0 0 0'
                          }}>
                            {space.widgets?.length || 0} widget{(space.widgets?.length || 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </button>
                      <button
                        className="trash-btn-welcome"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete "${space.name}"? This will permanently delete the space and all its widgets. This cannot be undone.`)) {
                            // Remove space from localSpaces
                            setLocalSpaces(prevSpaces => {
                              const updatedSpaces = prevSpaces.filter(s => s.id !== space.id);
                              localStorage.setItem(SPACES_STORAGE_KEY, JSON.stringify(updatedSpaces));
                              return updatedSpaces;
                            });
                          }
                        }}
                        style={{
                          opacity: 0,
                          transition: 'all 0.2s',
                          padding: '6px',
                          color: '#94a3b8',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#dc2626';
                          e.currentTarget.style.background = '#fef2f2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#94a3b8';
                          e.currentTarget.style.background = 'transparent';
                        }}
                        title="Delete space"
                      >
                        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
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
          loading={authSignInLoading}
          hasWidgets={widgets.length > 0}
        />
      )}

      {/* Space Naming Modal */}
      {showSpaceNamingModal && (
        <SpaceNamingModal
          onCreateSpace={handleCreateSpaceFromModal}
          onCancel={handleCancelSpaceNaming}
          loading={authSignInLoading}
          widgetCount={pendingWidgetsForSave.length}
        />
      )}
    </div>
  );
};

export default App;

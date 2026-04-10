import { WidgetData } from '../types';
import { Space } from '../types/shared';
import { supabaseService } from './supabase-service';

const STORAGE_KEYS = {
  WIDGETS: 'ourworld_canvas_data',
  SPACES: 'ourworld_spaces_data',
  CURRENT_SPACE: 'ourworld_current_space_id',
  LAST_SYNC: 'ourworld_last_sync',
  PENDING_CHANGES: 'ourworld_pending_changes'
};

interface PendingChange {
  id: string;
  type: 'widget_create' | 'widget_update' | 'widget_delete' | 'space_create' | 'space_update' | 'space_delete' | 'space_sync';
  data: any;
  timestamp: number;
  retryCount: number;
}

interface StorageState {
  widgets: WidgetData[];
  spaces: Space[];
  currentSpaceId: string | null;
  lastSync: number;
  pendingChanges: PendingChange[];
}

export class RobustStorage {
  private static instance: RobustStorage;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;

  static getInstance(): RobustStorage {
    if (!RobustStorage.instance) {
      RobustStorage.instance = new RobustStorage();
    }
    return RobustStorage.instance;
  }

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processPendingChanges();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Get full storage state (prioritize localStorage for immediate response)
  getState(): StorageState {
    try {
      return {
        widgets: this.getWidgetsLocal(),
        spaces: this.getSpacesLocal(),
        currentSpaceId: this.getCurrentSpaceId(),
        lastSync: this.getLastSync(),
        pendingChanges: this.getPendingChanges()
      };
    } catch (error) {
      console.error('Failed to get storage state:', error);
      return this.getDefaultState();
    }
  }

  private getDefaultState(): StorageState {
    return {
      widgets: [],
      spaces: [],
      currentSpaceId: null,
      lastSync: 0,
      pendingChanges: []
    };
  }

  // SPACE OPERATIONS
  async getSpaces(forceRefresh: boolean = false): Promise<Space[]> {
    const localSpaces = this.getSpacesLocal();
    const lastSync = this.getLastSync();
    const now = Date.now();

    // Use cache if it's fresh (less than 30 seconds old) and not forcing refresh
    const cacheAge = now - lastSync;
    const isCacheFresh = cacheAge < 30000; // 30 seconds

    if (!forceRefresh && isCacheFresh && localSpaces.length > 0) {
      console.log('Using cached spaces (cache age:', Math.round(cacheAge / 1000), 'seconds)');
      return localSpaces;
    }

    // Try Supabase for fresh data if online and authenticated
    if (this.isOnline && await supabaseService.isAuthenticated()) {
      try {
        console.log('Fetching fresh spaces from server...');
        const remoteSpaces = await supabaseService.getSpaces();
        // Update local cache
        this.saveSpacesLocal(remoteSpaces);
        return remoteSpaces;
      } catch (error) {
        console.warn('Failed to fetch spaces from server, using local cache:', error);
      }
    }

    // Fallback to localStorage
    return localSpaces;
  }

  getSpacesLocal(): Space[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SPACES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async saveSpace(space: Space): Promise<Space | null> {
    // Save locally immediately for responsive UI
    const spaces = this.getSpacesLocal();
    const existingIndex = spaces.findIndex(s => s.id === space.id);

    if (existingIndex >= 0) {
      spaces[existingIndex] = space;
    } else {
      spaces.push(space);
    }

    this.saveSpacesLocal(spaces);

    // Try to sync with Supabase if online
    if (this.isOnline && await supabaseService.isAuthenticated()) {
      try {
        const savedSpace = existingIndex >= 0
          ? await supabaseService.updateSpace(space.id, space)
          : await supabaseService.createSpace(space);

        if (savedSpace) {
          // Update local cache with server response
          const updatedSpaces = this.getSpacesLocal();
          const index = updatedSpaces.findIndex(s => s.id === space.id);
          if (index >= 0) {
            updatedSpaces[index] = savedSpace;
            this.saveSpacesLocal(updatedSpaces);
          }
          return savedSpace;
        }
      } catch (error) {
        console.warn('Failed to sync space to server, will retry later:', error);
        this.addPendingChange({
          type: existingIndex >= 0 ? 'space_update' : 'space_create',
          data: space
        });
      }
    } else {
      // Offline - add to pending changes
      this.addPendingChange({
        type: existingIndex >= 0 ? 'space_update' : 'space_create',
        data: space
      });
    }

    return space;
  }

  private saveSpacesLocal(spaces: Space[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SPACES, JSON.stringify(spaces));
      this.updateLastSync();
    } catch (error) {
      console.error('Failed to save spaces locally:', error);
    }
  }

  async updateSpaceDetails(spaceId: string, updates: Partial<Space>): Promise<Space | null> {
    // Update locally immediately for responsive UI
    const spaces = this.getSpacesLocal();
    const existingIndex = spaces.findIndex(s => s.id === spaceId);

    if (existingIndex >= 0) {
      spaces[existingIndex] = { ...spaces[existingIndex], ...updates };
      this.saveSpacesLocal(spaces);

      // Try to sync with Supabase if online
      if (this.isOnline && await supabaseService.isAuthenticated()) {
        try {
          const updatedSpace = await supabaseService.updateSpace(spaceId, updates);
          if (updatedSpace) {
            // Update local cache with server response
            const updatedSpaces = this.getSpacesLocal();
            const index = updatedSpaces.findIndex(s => s.id === spaceId);
            if (index >= 0) {
              updatedSpaces[index] = updatedSpace;
              this.saveSpacesLocal(updatedSpaces);
            }
            return updatedSpace;
          }
        } catch (error) {
          console.warn('Failed to sync space update to server:', error);
          this.addPendingChange({
            type: 'space_update',
            data: spaces[existingIndex]
          });
        }
      } else {
        this.addPendingChange({
          type: 'space_update',
          data: spaces[existingIndex]
        });
      }

      return spaces[existingIndex];
    }

    return null;
  }

  async deleteSpace(spaceId: string): Promise<boolean> {
    // Remove locally immediately
    const spaces = this.getSpacesLocal().filter(s => s.id !== spaceId);
    this.saveSpacesLocal(spaces);

    // Try to sync with Supabase if online
    if (this.isOnline && await supabaseService.isAuthenticated()) {
      try {
        const success = await supabaseService.deleteSpace(spaceId);
        if (success) {
          return true;
        }
      } catch (error) {
        console.warn('Failed to delete space from server:', error);
      }
    }

    // Add to pending changes for retry
    this.addPendingChange({
      type: 'space_delete' as any,
      data: { id: spaceId }
    });

    return true;
  }

  // WIDGET OPERATIONS
  async getWidgetsBySpace(spaceId: string): Promise<WidgetData[]> {
    // Try Supabase first if online and authenticated
    if (this.isOnline && await supabaseService.isAuthenticated()) {
      try {
        const remoteWidgets = await supabaseService.getWidgetsBySpace(spaceId);
        // Merge remote widgets with local widgets to avoid duplicates
        this.mergeWidgetsIntoLocal(remoteWidgets);
        return remoteWidgets;
      } catch (error) {
        console.warn('Failed to fetch widgets from server, using local cache:', error);
      }
    }

    // Fallback to localStorage (filter by space)
    return this.getWidgetsLocal().filter(w => w.spaceId === spaceId);
  }

  // Merge remote widgets into local storage without creating duplicates
  private mergeWidgetsIntoLocal(remoteWidgets: WidgetData[]): void {
    const localWidgets = this.getWidgetsLocal();
    const mergedWidgets = [...localWidgets];

    for (const remoteWidget of remoteWidgets) {
      const existingIndex = mergedWidgets.findIndex(w => w.id === remoteWidget.id);
      if (existingIndex >= 0) {
        // Update existing widget with remote version (server wins for conflicts)
        mergedWidgets[existingIndex] = { ...remoteWidget, spaceId: remoteWidget.spaceId };
      } else {
        // Add new widget from remote
        mergedWidgets.push({ ...remoteWidget, spaceId: remoteWidget.spaceId });
      }
    }

    this.saveWidgetsLocal(mergedWidgets);
  }

  async getWidget(widgetId: string, spaceId: string): Promise<WidgetData | null> {
    // Try to get the widget from current widgets in memory/localStorage first
    const widgets = this.getWidgetsLocal();
    const localWidget = widgets.find(w => w.id === widgetId);

    if (localWidget) {
      return localWidget;
    }

    // If not found locally and we're online, try Supabase
    if (this.isOnline && await supabaseService.isAuthenticated()) {
      try {
        const remoteWidgets = await supabaseService.getWidgetsBySpace(spaceId);
        const remoteWidget = remoteWidgets.find(w => w.id === widgetId);
        return remoteWidget || null;
      } catch (error) {
        console.warn('Failed to fetch widget from server:', error);
      }
    }

    return null;
  }

  getWidgetsLocal(): WidgetData[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WIDGETS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // Save widget locally only (for real-time interactions)
  saveWidgetLocal(widget: WidgetData, spaceId: string): WidgetData {
    const widgets = this.getWidgetsLocal();
    const existingIndex = widgets.findIndex(w => w.id === widget.id);

    // Add spaceId to widget for local storage
    const widgetWithSpace = { ...widget, spaceId };

    if (existingIndex >= 0) {
      widgets[existingIndex] = widgetWithSpace;
    } else {
      widgets.push(widgetWithSpace);
    }

    this.saveWidgetsLocal(widgets);
    return widgetWithSpace;
  }

  // Original method - now used only for explicit saves (space exit, widget creation)
  async saveWidget(widget: WidgetData, spaceId: string, forceSync: boolean = false): Promise<WidgetData | null> {
    // Always save locally first
    const widgetWithSpace = this.saveWidgetLocal(widget, spaceId);

    // Only sync to database if forced (on space exit) or it's a new widget
    const widgets = this.getWidgetsLocal();
    const isNewWidget = !widgets.some(w => w.id === widget.id && (w as any).serverCreated === true);

    if (!forceSync && !isNewWidget) {
      console.log('Skipping database sync for existing widget (will sync on space exit)');
      return widgetWithSpace;
    }

    // Try to sync with Supabase if online
    if (this.isOnline && await supabaseService.isAuthenticated()) {
      try {
        console.log('Syncing widget with Supabase:', {
          widgetId: widget.id,
          widgetName: widget.name,
          spaceId,
          forceSync,
          isNewWidget
        });

        // Try update first (for existing widgets), then create if it fails (for new widgets)
        let savedWidget = null;

        // First try to update (assumes widget exists in database)
        savedWidget = await supabaseService.updateWidget(widget.id, widget);

        // If update returned null, the widget doesn't exist in database, so create it
        if (!savedWidget) {
          console.log('Widget not found in database, creating new one');
          savedWidget = await supabaseService.createWidget({
            name: widget.name,
            type: widget.type,
            position: widget.position,
            size: widget.size,
            code: widget.code,
            prompt: widget.prompt
          }, spaceId);
        }

        console.log('Supabase sync result:', savedWidget ? 'success' : 'failed');

        if (savedWidget) {
          // Update local cache with server response and mark as server-created
          const updatedWidgets = this.getWidgetsLocal();
          const index = updatedWidgets.findIndex(w => w.id === widget.id);
          if (index >= 0) {
            updatedWidgets[index] = { ...savedWidget, spaceId, serverCreated: true } as any;
            this.saveWidgetsLocal(updatedWidgets);
          }
          return savedWidget;
        }
      } catch (error) {
        console.warn('Failed to sync widget to server, will retry later:', error);
        this.addPendingChange({
          type: isNewWidget ? 'widget_create' : 'widget_update',
          data: { widget, spaceId }
        });
      }
    } else {
      // Offline - add to pending changes
      this.addPendingChange({
        type: isNewWidget ? 'widget_create' : 'widget_update',
        data: { widget, spaceId }
      });
    }

    return widgetWithSpace;
  }

  // Bulk sync all widgets in a space (called when exiting space)
  async syncSpaceWidgets(spaceId: string): Promise<void> {
    if (!this.isOnline || !await supabaseService.isAuthenticated()) {
      console.log('Offline or not authenticated, skipping space sync');
      return;
    }

    const localWidgets = this.getWidgetsLocal().filter(w => w.spaceId === spaceId);
    console.log(`Syncing ${localWidgets.length} widgets for space ${spaceId}`);

    for (const widget of localWidgets) {
      try {
        // Force sync each widget
        await this.saveWidget(widget, spaceId, true);
      } catch (error) {
        console.error(`Failed to sync widget ${widget.id}:`, error);
      }
    }

    console.log('Space widget sync completed');
  }

  private saveWidgetsLocal(widgets: WidgetData[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.WIDGETS, JSON.stringify(widgets));
      this.updateLastSync();
    } catch (error) {
      console.error('Failed to save widgets locally:', error);
    }
  }

  async deleteWidget(widgetId: string): Promise<boolean> {
    // Remove locally immediately
    const widgets = this.getWidgetsLocal().filter(w => w.id !== widgetId);
    this.saveWidgetsLocal(widgets);

    // Try to sync with Supabase if online
    if (this.isOnline && await supabaseService.isAuthenticated()) {
      try {
        const success = await supabaseService.deleteWidget(widgetId);
        if (success) {
          return true;
        }
      } catch (error) {
        console.warn('Failed to delete widget from server:', error);
      }
    }

    // Add to pending changes for retry
    this.addPendingChange({
      type: 'widget_delete',
      data: { id: widgetId }
    });

    return true;
  }

  // Current space
  getCurrentSpaceId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_SPACE);
  }

  saveCurrentSpaceId(spaceId: string | null): void {
    try {
      if (spaceId) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_SPACE, spaceId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_SPACE);
      }
    } catch (error) {
      console.error('Failed to save current space ID:', error);
    }
  }

  // Sync tracking
  private getLastSync(): number {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return data ? parseInt(data, 10) : 0;
    } catch {
      return 0;
    }
  }

  private updateLastSync(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
    } catch (error) {
      console.error('Failed to update last sync:', error);
    }
  }

  // Pending changes for offline support
  private getPendingChanges(): PendingChange[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENDING_CHANGES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  addPendingChange(change: Omit<PendingChange, 'id' | 'timestamp' | 'retryCount'>): void {
    try {
      const pendingChanges = this.getPendingChanges();
      const newChange: PendingChange = {
        ...change,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        retryCount: 0
      };
      pendingChanges.push(newChange);
      localStorage.setItem(STORAGE_KEYS.PENDING_CHANGES, JSON.stringify(pendingChanges));
    } catch (error) {
      console.error('Failed to add pending change:', error);
    }
  }

  private async processPendingChanges(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    const pendingChanges = this.getPendingChanges();

    for (const change of pendingChanges) {
      try {
        let success = false;

        switch (change.type) {
          case 'space_create':
            success = !!(await supabaseService.createSpace(change.data));
            break;
          case 'space_update':
            success = !!(await supabaseService.updateSpace(change.data.id, change.data));
            break;
          case 'widget_create':
            success = !!(await supabaseService.createWidget(change.data.widget, change.data.spaceId));
            break;
          case 'widget_update':
            success = !!(await supabaseService.updateWidget(change.data.widget.id, change.data.widget));
            break;
          case 'widget_delete':
            success = await supabaseService.deleteWidget(change.data.id);
            break;
          case 'space_delete':
            success = await supabaseService.deleteSpace(change.data.id);
            break;
          case 'space_sync':
            await this.syncSpaceWidgets(change.data.spaceId);
            success = true;
            break;
        }

        if (success) {
          // Remove successful change
          const updatedChanges = this.getPendingChanges().filter(c => c.id !== change.id);
          localStorage.setItem(STORAGE_KEYS.PENDING_CHANGES, JSON.stringify(updatedChanges));
        }
      } catch (error) {
        console.warn(`Failed to process pending change ${change.id}:`, error);
        // Increment retry count
        const updatedChanges = this.getPendingChanges();
        const changeIndex = updatedChanges.findIndex(c => c.id === change.id);
        if (changeIndex >= 0) {
          updatedChanges[changeIndex].retryCount++;
          localStorage.setItem(STORAGE_KEYS.PENDING_CHANGES, JSON.stringify(updatedChanges));
        }
      }
    }

    this.syncInProgress = false;
  }

  clearPendingChanges(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.PENDING_CHANGES);
    } catch (error) {
      console.error('Failed to clear pending changes:', error);
    }
  }

  // Conflict resolution helper
  resolveWidgetConflict(local: WidgetData, remote: WidgetData): WidgetData {
    // Simple last-write-wins for now
    // In the future, could implement more sophisticated merging
    return local.updatedAt > remote.updatedAt ? local : remote;
  }

  // Export/Import for backup
  exportData(): string {
    return JSON.stringify(this.getState(), null, 2);
  }

  importData(data: string): boolean {
    try {
      const state = JSON.parse(data) as StorageState;
      this.saveWidgetsLocal(state.widgets);
      this.saveSpacesLocal(state.spaces);
      if (state.currentSpaceId) {
        this.saveCurrentSpaceId(state.currentSpaceId);
      }
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // Clear all data
  clear(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Real-time subscriptions
  subscribeToSpaces(callback: (spaces: Space[]) => void): () => void {
    if (this.isOnline) {
      return supabaseService.subscribeToSpaces(callback);
    }
    return () => {}; // No-op when offline
  }

  subscribeToWidgets(spaceId: string, callback: (widgets: WidgetData[]) => void): () => void {
    if (this.isOnline) {
      return supabaseService.subscribeToWidgets(spaceId, callback);
    }
    return () => {}; // No-op when offline
  }
}

export const storage = RobustStorage.getInstance();
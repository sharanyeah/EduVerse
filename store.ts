
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Workspace, CourseSection } from './types';

interface TutorState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  isEnriching: boolean;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspaceId: (id: string) => void;
  setIsEnriching: (status: boolean) => void;
  addWorkspace: (ws: Workspace) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  getActiveWorkspace: () => Workspace | undefined;
}

export const useTutorStore = create<TutorState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: '',
      isEnriching: false,
      
      setWorkspaces: (workspaces) => set({ workspaces }),
      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
      setIsEnriching: (status) => set({ isEnriching: status }),
      
      addWorkspace: (ws) => set((state) => ({ 
        workspaces: [ws, ...state.workspaces],
        activeWorkspaceId: ws.fileInfo.id
      })),
      
      updateWorkspace: (id, updates) => set((state) => {
        const workspaceIndex = state.workspaces.findIndex(ws => ws.fileInfo.id === id);
        if (workspaceIndex === -1) return state;

        const currentWorkspace = state.workspaces[workspaceIndex];
        const mergedWorkspace = { ...currentWorkspace, ...updates };

        // Surgical Update Logic: Only recalculate stats if sections changed
        if (updates.sections) {
          const totalSections = mergedWorkspace.sections.length;
          const ingested = mergedWorkspace.sections.filter(s => !!s.content).length;
          
          const allFlashcards = mergedWorkspace.sections.flatMap(s => s.flashcards || []);
          const masteredFlashcards = allFlashcards.filter(f => f.masteryStatus === 'mastered').length;
          
          const allQuestions = mergedWorkspace.sections.flatMap(s => s.practiceQuestions || []);
          const answeredCorrect = allQuestions.filter(q => q.hasBeenAnswered && q.wasCorrect).length;

          mergedWorkspace.coverageStats = {
            ingested: Math.round((ingested / (totalSections || 1)) * 100),
            retained: Math.round((masteredFlashcards / (allFlashcards.length || 1)) * 100),
            validated: Math.round((answeredCorrect / (allQuestions.length || 1)) * 100)
          };
        }

        const newWorkspaces = [...state.workspaces];
        newWorkspaces[workspaceIndex] = mergedWorkspace;

        return { workspaces: newWorkspaces };
      }),
      
      getActiveWorkspace: () => {
        const { workspaces, activeWorkspaceId } = get();
        return workspaces.find(w => w.fileInfo.id === activeWorkspaceId);
      }
    }),
    {
      name: 'learnverse-v5-storage',
      partialize: (state) => ({ workspaces: state.workspaces, activeWorkspaceId: state.activeWorkspaceId }),
    }
  )
);

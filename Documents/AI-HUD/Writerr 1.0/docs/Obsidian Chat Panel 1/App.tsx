import { useState, createContext, useContext, useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { ChatPanel } from './components/ChatPanel';
import { Toaster } from './components/ui/sonner';

interface ActiveDocument {
  id: string;
  name: string;
  path: string;
}

interface ActiveDocumentContextType {
  activeDocument: ActiveDocument | null;
  setActiveDocument: (doc: ActiveDocument | null) => void;
}

const ActiveDocumentContext = createContext<ActiveDocumentContextType | null>(null);

export const useActiveDocument = () => {
  const context = useContext(ActiveDocumentContext);
  if (!context) {
    throw new Error('useActiveDocument must be used within an ActiveDocumentProvider');
  }
  return context;
};

// Mock active documents that could be "open" in Obsidian
const mockActiveDocuments: ActiveDocument[] = [
  { id: 'daily-1', name: 'Meeting Notes.md', path: '/Daily/Meeting Notes.md' },
  { id: 'proj-2', name: 'Product Roadmap.md', path: '/Projects/Product Roadmap.md' },
  { id: 'res-1', name: 'Research Ideas.md', path: '/Research/Research Ideas.md' },
  { id: 'dev-2', name: 'Architecture Decisions.md', path: '/Development/Architecture Decisions.md' },
  { id: 'inbox', name: 'Inbox.md', path: '/Inbox.md' },
];

export default function App() {
  const [activeDocument, setActiveDocument] = useState<ActiveDocument | null>(null);

  // Simulate switching between documents every 15 seconds (like working in Obsidian)
  useEffect(() => {
    // Start with a random document
    const randomIndex = Math.floor(Math.random() * mockActiveDocuments.length);
    setActiveDocument(mockActiveDocuments[randomIndex]);

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * mockActiveDocuments.length);
      setActiveDocument(mockActiveDocuments[randomIndex]);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ActiveDocumentContext.Provider value={{ activeDocument, setActiveDocument }}>
      <AppLayout>
        <div className="h-full flex flex-col">
          <div className="flex-shrink-0 mb-6">
            <h1 className="text-2xl font-medium text-foreground mb-2">Welcome to Obsidian</h1>
            <p className="text-muted-foreground">Connected thinking for creative minds</p>
            {activeDocument && (
              <div className="mt-2 text-sm text-muted-foreground">
                Currently editing: <span className="text-foreground font-medium">{activeDocument.name}</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-h-0">
            <ChatPanel />
          </div>
        </div>
      </AppLayout>
      <Toaster />
    </ActiveDocumentContext.Provider>
  );
}
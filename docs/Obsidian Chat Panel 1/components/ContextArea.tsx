import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Plus, X, ChevronDown, ChevronRight, FileText, Folder, Check, BrushCleaning, LibraryBig } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Document {
  id: string;
  name: string;
  path: string;
}

interface ContextAreaProps {
  documents: Document[];
  onAddDocument: (document: Document) => void;
  onRemoveDocument: (documentId: string) => void;
}

interface VaultItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: VaultItem[];
}

// Mock Obsidian vault structure
const mockVault: VaultItem[] = [
  {
    id: 'daily',
    name: 'Daily',
    path: '/Daily',
    type: 'folder',
    children: [
      { id: 'daily-1', name: 'Meeting Notes.md', path: '/Daily/Meeting Notes.md', type: 'file' },
      { id: 'daily-2', name: 'Daily Standup.md', path: '/Daily/Daily Standup.md', type: 'file' },
      { id: 'daily-3', name: '2024-01-15.md', path: '/Daily/2024-01-15.md', type: 'file' },
      { id: 'daily-4', name: 'Weekly Review.md', path: '/Daily/Weekly Review.md', type: 'file' },
    ]
  },
  {
    id: 'projects',
    name: 'Projects',
    path: '/Projects',
    type: 'folder',
    children: [
      { id: 'proj-1', name: 'Project Planning.md', path: '/Projects/Project Planning.md', type: 'file' },
      { id: 'proj-2', name: 'Product Roadmap.md', path: '/Projects/Product Roadmap.md', type: 'file' },
      { id: 'proj-3', name: 'Team Guidelines.md', path: '/Projects/Team Guidelines.md', type: 'file' },
      { id: 'proj-4', name: 'Sprint Notes.md', path: '/Projects/Sprint Notes.md', type: 'file' },
    ]
  },
  {
    id: 'research',
    name: 'Research',
    path: '/Research',
    type: 'folder',
    children: [
      { id: 'res-1', name: 'Research Ideas.md', path: '/Research/Research Ideas.md', type: 'file' },
      { id: 'res-2', name: 'Literature Review.md', path: '/Research/Literature Review.md', type: 'file' },
      { id: 'res-3', name: 'Methodology Notes.md', path: '/Research/Methodology Notes.md', type: 'file' },
      { id: 'res-4', name: 'Data Analysis.md', path: '/Research/Data Analysis.md', type: 'file' },
    ]
  },
  {
    id: 'development',
    name: 'Development',
    path: '/Development',
    type: 'folder',
    children: [
      { id: 'dev-1', name: 'Code Review Notes.md', path: '/Development/Code Review Notes.md', type: 'file' },
      { id: 'dev-2', name: 'Architecture Decisions.md', path: '/Development/Architecture Decisions.md', type: 'file' },
      { id: 'dev-3', name: 'API Documentation.md', path: '/Development/API Documentation.md', type: 'file' },
      { id: 'dev-4', name: 'Testing Strategy.md', path: '/Development/Testing Strategy.md', type: 'file' },
    ]
  },
  // Root level files
  { id: 'readme', name: 'README.md', path: '/README.md', type: 'file' },
  { id: 'todo', name: 'TODO.md', path: '/TODO.md', type: 'file' },
  { id: 'ideas', name: 'Random Ideas.md', path: '/Random Ideas.md', type: 'file' },
  { id: 'inbox', name: 'Inbox.md', path: '/Inbox.md', type: 'file' },
];

export function ContextArea({ documents, onAddDocument, onRemoveDocument }: ContextAreaProps) {
  // Default to closed state
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectFile = (file: VaultItem) => {
    const newDocument: Document = {
      id: file.id,
      name: file.name,
      path: file.path
    };
    
    onAddDocument(newDocument);
    toast.success(`Added "${file.name}" to context`);
    
    // Auto-expand when adding documents
    setIsOpen(true);
  };

  const handleRemoveDocument = (documentId: string, documentName: string) => {
    onRemoveDocument(documentId);
    toast.success(`Removed "${documentName}" from context`);
    
    // Auto-collapse if no documents left
    if (documents.length === 1) {
      setIsOpen(false);
    }
  };

  const handleClearAll = () => {
    // Remove all documents
    documents.forEach(doc => {
      onRemoveDocument(doc.id);
    });
    toast.success('Cleared all context items');
    setIsOpen(false);
  };

  const isFileAlreadyAdded = (fileId: string) => {
    return documents.some(doc => doc.id === fileId);
  };



  const renderVaultItem = (item: VaultItem): React.ReactNode => {
    if (item.type === 'file') {
      const isAdded = isFileAlreadyAdded(item.id);
      return (
        <DropdownMenuItem
          key={item.id}
          onClick={() => !isAdded && handleSelectFile(item)}
          disabled={isAdded}
          className="flex items-center gap-2"
        >
          <FileText className="size-4" />
          <span className="flex-1">{item.name}</span>
          {isAdded && <Check className="size-4 text-muted-foreground" />}
        </DropdownMenuItem>
      );
    }

    if (item.type === 'folder' && item.children) {
      return (
        <DropdownMenuSub key={item.id}>
          <DropdownMenuSubTrigger className="flex items-center gap-2">
            <Folder className="size-4" />
            <span>{item.name}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
            {item.children.map(child => renderVaultItem(child))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    }

    return null;
  };

  // Separate root files from folders for better organization
  const rootFolders = mockVault.filter(item => item.type === 'folder');
  const rootFiles = mockVault.filter(item => item.type === 'file');

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Always show light border at top as separator from messages */}
        <div className="border-t border-border">
          <div className="flex items-center justify-between p-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 h-8 text-muted-foreground hover:text-foreground">
                {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                <LibraryBig className="size-4" />
                <span className="text-sm">Context</span>
                {documents.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-2 text-xs text-muted-foreground">
                    {documents.length}
                  </Badge>
                )}
              </Button>
            </CollapsibleTrigger>
            
            <div className="flex items-center gap-1">
              {/* Clear all button - only show when expanded and has documents */}
              {isOpen && documents.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClearAll}
                      className="size-8 text-muted-foreground hover:text-destructive"
                    >
                      <BrushCleaning className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear all context</p>
                  </TooltipContent>
                </Tooltip>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add to context</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </DropdownMenuTrigger>
              
              <DropdownMenuContent 
                align="end" 
                side="top"
                className="w-56 max-h-80 overflow-y-auto"
              >
                {/* Root folders with nested structure */}
                {rootFolders.map(folder => renderVaultItem(folder))}
                
                {rootFolders.length > 0 && rootFiles.length > 0 && (
                  <DropdownMenuSeparator />
                )}
                
                {/* Root files */}
                {rootFiles.map(file => renderVaultItem(file))}
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
          
          <CollapsibleContent>
            {documents.length === 0 ? (
              <div className="px-3 pb-3">
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No items in context</p>
                  <p className="text-xs text-muted-foreground mt-1">Click the + button to add items from your vault</p>
                </div>
              </div>
            ) : (
              <div className="px-3 pb-3">
                <div className="flex flex-wrap gap-2">
                  {documents.map((doc) => (
                    <Badge
                      key={doc.id}
                      variant="outline"
                      className="flex items-center gap-2 px-3 py-1 h-auto"
                    >
                      <FileText className="size-3" />
                      <span className="text-sm">{doc.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDocument(doc.id, doc.name)}
                        className="size-4 p-0 hover:bg-destructive/20 hover:text-destructive ml-1"
                      >
                        <X className="size-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>
    </TooltipProvider>
  );
}
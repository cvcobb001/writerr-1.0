import { useState } from 'react';
import { AppHeader } from './AppHeader';
import { AppFooter } from './AppFooter';
import { Ribbon } from './Ribbon';
import { ChatPanel } from '../ChatPanel';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isDark, setIsDark] = useState(false);
  const [ribbonCollapsed, setRibbonCollapsed] = useState(true);
  const [activeRibbonItem, setActiveRibbonItem] = useState('home');

  const handleThemeToggle = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleRibbonItemClick = (item: string) => {
    setActiveRibbonItem(item);
    // Here you could add logic to switch between different panels
    console.log('Ribbon item clicked:', item);
  };

  const renderMainContent = () => {
    // This is where you'd switch between different panels based on activeRibbonItem
    switch (activeRibbonItem) {
      case 'files':
        return (
          <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg border border-dashed border-border">
            <div className="text-center">
              <p className="text-muted-foreground">Vault Folder Panel</p>
              <p className="text-xs text-muted-foreground mt-1">Coming soon...</p>
            </div>
          </div>
        );
      case 'search':
        return (
          <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg border border-dashed border-border">
            <div className="text-center">
              <p className="text-muted-foreground">Global Search Panel</p>
              <p className="text-xs text-muted-foreground mt-1">Coming soon...</p>
            </div>
          </div>
        );
      case 'graph':
        return (
          <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg border border-dashed border-border">
            <div className="text-center">
              <p className="text-muted-foreground">Graph View Panel</p>
              <p className="text-xs text-muted-foreground mt-1">Coming soon...</p>
            </div>
          </div>
        );
      case 'home':
      default:
        return children || <ChatPanel />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <AppHeader 
        workspaceName="My Vault"
        onThemeToggle={handleThemeToggle}
        isDark={isDark}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Ribbon
          activeItem={activeRibbonItem}
          onItemClick={handleRibbonItemClick}
          isCollapsed={ribbonCollapsed}
          onToggleCollapse={() => setRibbonCollapsed(!ribbonCollapsed)}
        />
        
        <main className="flex-1 p-6 overflow-hidden">
          <div className="h-full max-w-4xl mx-auto">
            {renderMainContent()}
          </div>
        </main>
      </div>
      
      <AppFooter 
        documentCount={42}
        syncStatus="synced"
        lastSync={new Date()}
      />
    </div>
  );
}
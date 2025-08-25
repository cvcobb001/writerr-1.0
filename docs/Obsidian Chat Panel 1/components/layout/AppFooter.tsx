import { RefreshCw, Wifi, Activity } from 'lucide-react';

interface AppFooterProps {
  documentCount?: number;
  syncStatus?: 'synced' | 'syncing' | 'offline';
  lastSync?: Date;
}

export function AppFooter({ 
  documentCount = 0, 
  syncStatus = 'synced',
  lastSync = new Date() 
}: AppFooterProps) {
  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="size-3 animate-spin" />;
      case 'offline':
        return <Wifi className="size-3 text-destructive" />;
      default:
        return <RefreshCw className="size-3 text-muted-foreground" />;
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'offline':
        return 'Offline';
      default:
        return `Synced ${lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  return (
    <footer className="h-7 bg-muted/30 border-t border-border flex items-center justify-between px-4 text-xs text-muted-foreground">
      {/* Left: Document Stats */}
      <div className="flex items-center gap-4">
        <span>{documentCount} documents</span>
        <span>Ready</span>
      </div>

      {/* Center: Sync Status */}
      <div className="flex items-center gap-2">
        {getSyncStatusIcon()}
        <span>{getSyncStatusText()}</span>
      </div>

      {/* Right: Performance Info */}
      <div className="flex items-center gap-2">
        <Activity className="size-3" />
        <span>API Ready</span>
      </div>
    </footer>
  );
}
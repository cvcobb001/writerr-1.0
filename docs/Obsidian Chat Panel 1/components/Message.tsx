import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { AIIcon, UserIcon } from "./AvatarIcons";
import { Copy, RotateCcw, Info } from "lucide-react";
import { toast } from "sonner@2.0.3";

interface MessageProps {
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  avatar?: string;
  model?: string;
  onRetry?: () => void;
}

// Simple markdown-like formatting helper for demonstration
const formatContent = (content: string) => {
  // This is a simple example - in production you'd use a proper markdown library
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold**
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // *italic*
    .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>') // `code`
    .replace(/\[\[(.*?)\]\]/g, '<span class="text-primary underline">$1</span>'); // [[links]]
};

export function Message({ content, sender, timestamp, avatar, model = 'GPT-4', onRetry }: MessageProps) {
  const isUser = sender === 'user';
  
  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      toast.success("Message copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy message");
    });
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      toast.success("Resending previous question...");
    }
  };
  
  return (
    <div className={`flex gap-3 p-4 hover:bg-muted/30 transition-colors ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="size-8 flex-shrink-0">
        <AvatarFallback className="bg-transparent border-0 p-0">
          {isUser ? (
            <UserIcon className="size-6 text-primary" />
          ) : (
            <AIIcon className="size-6 text-muted-foreground" />
          )}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-lg px-3 py-2 border border-border ${
          isUser 
            ? 'bg-white text-foreground' 
            : 'bg-muted text-muted-foreground'
        }`}>
          {/* Prepare for markdown formatting - currently using basic formatting */}
          <div 
            className="whitespace-pre-wrap break-words prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: formatContent(content) }}
          />
        </div>
        
        {/* Message toolbar */}
        <div className={`flex items-center gap-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <TooltipProvider>
            {/* Copy button for all messages */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="size-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Copy className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy message</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Info button for all messages */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Info className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  {!isUser && <p>Model: {model}</p>}
                  <p className={`text-xs text-muted-foreground ${!isUser ? 'mt-1' : ''}`}>
                    {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
            
            {/* AI-specific retry button */}
            {!isUser && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRetry}
                    className="size-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Retry</p>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
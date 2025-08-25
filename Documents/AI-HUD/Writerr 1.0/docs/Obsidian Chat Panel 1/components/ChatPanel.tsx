import { useState, useEffect } from 'react';
import { Message } from './Message';
import { ChatInput } from './ChatInput';
import { ChatToolbar } from './ChatToolbar';
import { ContextArea } from './ContextArea';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { FileText, Settings, History } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  model?: string;
}

interface Document {
  id: string;
  name: string;
  path: string;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'Hello! I\'m your Obsidian assistant. How can I help you today?',
      sender: 'assistant',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      model: 'GPT-4'
    },
    {
      id: '2',
      content: 'Hi there! I\'d like to know more about organizing my notes.',
      sender: 'user',
      timestamp: new Date(Date.now() - 3 * 60 * 1000)
    },
    {
      id: '3',
      content: 'Great question! Obsidian offers several powerful ways to organize your notes:\n\n• **Folders** - Create a hierarchical structure\n• **Tags** - Use #tags for flexible categorization\n• **Links** - Connect related notes with [[double brackets]]\n• **MOCs** - Create Maps of Content as index notes\n\nWhich approach interests you most?',
      sender: 'assistant',
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      model: 'GPT-4'
    }
  ]);

  // Start with some example documents to show the chips
  const [contextDocuments, setContextDocuments] = useState<Document[]>([
    { id: '1', name: 'Meeting Notes.md', path: '/Daily/Meeting Notes.md' },
    { id: '2', name: 'Project Planning.md', path: '/Projects/Project Planning.md' }
  ]);
  
  const [currentModel, setCurrentModel] = useState('GPT-4');
  const [currentFunction, setCurrentFunction] = useState('general-assistant');

  const chatFunctions = [
    { value: 'general-assistant', label: 'General Assistant' },
    { value: 'chart-generator', label: 'Chart Generator' },
    { value: 'copyeditor', label: 'Copy Editor' },
    { value: 'proofreader', label: 'Proofreader' },
    { value: 'research-helper', label: 'Research Helper' },
    { value: 'note-organizer', label: 'Note Organizer' }
  ];

  const handleSendMessage = (content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);

    // Simulate assistant response
    setTimeout(() => {
      const responses = [
        "That's a great point! Let me think about that.",
        "Interesting question! Here's what I'd suggest...",
        "I understand what you're looking for. Have you considered...",
        "That's exactly the kind of workflow that makes Obsidian powerful!",
        "Good thinking! That approach would work well with...",
        contextDocuments.length > 0 ? `Based on the documents in your context (${contextDocuments.map(d => d.name).join(', ')}), I can see some relevant patterns...` : null
      ].filter(Boolean);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: responses[Math.floor(Math.random() * responses.length)]!,
        sender: 'assistant',
        timestamp: new Date(),
        model: currentModel
      };

      setMessages(prev => [...prev, assistantMessage]);
    }, 1000 + Math.random() * 2000);
  };

  const handleRetryMessage = (messageId: string) => {
    // Find the user message that preceded this AI message
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex > 0) {
      const previousUserMessage = messages[messageIndex - 1];
      if (previousUserMessage.sender === 'user') {
        // Resend the previous user message
        handleSendMessage(previousUserMessage.content);
      }
    }
  };

  const handleAddDoc = () => {
    toast.success("Document attachment feature coming soon!");
  };

  const handleCopyChat = () => {
    const chatText = messages
      .map(msg => `${msg.sender === 'user' ? 'You' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
    
    navigator.clipboard.writeText(chatText).then(() => {
      toast.success("Chat copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy chat");
    });
  };

  const handleClearChat = () => {
    setMessages([]);
    toast.success("Chat cleared!");
  };

  const handleAddDocument = (document: Document) => {
    setContextDocuments(prev => [...prev, document]);
  };

  const handleRemoveDocument = (documentId: string) => {
    setContextDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const handleModelChange = (model: string) => {
    setCurrentModel(model);
  };

  const handleFunctionChange = (func: string) => {
    setCurrentFunction(func);
    const selectedFunction = chatFunctions.find(f => f.value === func);
    toast.success(`Switched to ${selectedFunction?.label}`);
  };

  const handleSettings = () => {
    toast.success("Settings panel coming soon!");
  };

  const handleHistory = () => {
    toast.success("Chat history coming soon!");
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      const scrollArea = document.querySelector('[data-radix-scroll-area-content]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    };
    
    // Small delay to ensure DOM is updated
    setTimeout(scrollToBottom, 100);
  }, [messages]);

  const currentFunctionLabel = chatFunctions.find(f => f.value === currentFunction)?.label || 'General Assistant';

  return (
    <div className="flex flex-col h-full bg-background border border-border rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <TooltipProvider>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {/* Function Dropdown - no border, no background, just caret */}
            <Select value={currentFunction} onValueChange={handleFunctionChange}>
              <SelectTrigger className="border-none bg-transparent p-0 h-auto font-medium text-lg hover:bg-transparent focus:ring-0 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chatFunctions.map((func) => (
                  <SelectItem key={func.value} value={func.value}>
                    {func.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Header Tools */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleHistory}
                  className="size-8"
                >
                  <History className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Chat History</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSettings}
                  className="size-8"
                >
                  <Settings className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>

      {/* Messages */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
        <div className="flex flex-col">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center">
                <div className="size-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="size-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No messages yet</h3>
                <p className="text-muted-foreground">Start a conversation with your {currentFunctionLabel.toLowerCase()}</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <Message
                key={message.id}
                content={message.content}
                sender={message.sender}
                timestamp={message.timestamp}
                model={message.model}
                onRetry={message.sender === 'assistant' ? () => handleRetryMessage(message.id) : undefined}
              />
            ))
          )}
        </div>
        </ScrollArea>
      </div>

      {/* Bottom Section - Context, Input, and Toolbar */}
      <div className="flex-shrink-0">
        {/* Context Area */}
        <ContextArea
          documents={contextDocuments}
          onAddDocument={handleAddDocument}
          onRemoveDocument={handleRemoveDocument}
        />

        {/* Input */}
        <ChatInput onSendMessage={handleSendMessage} />
        
        {/* Toolbar */}
        <ChatToolbar 
          onAddDoc={handleAddDoc}
          onCopyChat={handleCopyChat}
          onClearChat={handleClearChat}
          onModelChange={handleModelChange}
          currentModel={currentModel}
        />
      </div>
    </div>
  );
}
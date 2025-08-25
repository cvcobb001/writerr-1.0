import React, { useEffect, useRef } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { ChatMessage, MessageAreaProps } from '../interface/types';
import { formatTimestamp, cn } from '../ui/utils';

interface MessageProps {
  message: ChatMessage;
  showTimestamp?: boolean;
}

const Message: React.FC<MessageProps> = ({ message, showTimestamp = true }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="writerr-message writerr-message-system">
        <div className="writerr-message-content writerr-message-system-content">
          <em>{message.content}</em>
        </div>
        {showTimestamp && (
          <div className="writerr-message-timestamp">
            {formatTimestamp(message.timestamp)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'writerr-message',
        isUser ? 'writerr-message-user' : 'writerr-message-assistant'
      )}
      role="article"
      aria-label={`${isUser ? 'Your' : 'AI assistant'} message sent ${formatTimestamp(message.timestamp)}`}
    >
      <div 
        className="writerr-message-content"
        aria-label={`${isUser ? 'You' : 'AI assistant'} said`}
      >
        {message.content.split('\n').map((line, index, array) => (
          <React.Fragment key={index}>
            {line}
            {index < array.length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
      {showTimestamp && (
        <div className="writerr-message-timestamp">
          {formatTimestamp(message.timestamp)}
        </div>
      )}
    </div>
  );
};

interface LoadingIndicatorProps {
  className?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ className }) => (
  <div 
    className={cn('writerr-loading', className)} 
    role="status" 
    aria-live="polite"
    aria-label="AI assistant is processing your message"
  >
    <div className="writerr-loading-spinner" aria-hidden="true" />
    AI is thinking...
  </div>
);

export const MessageArea: React.FC<MessageAreaProps> = ({
  messages,
  isLoading = false,
  className
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollViewportRef.current) {
        const viewport = scrollViewportRef.current;
        viewport.scrollTop = viewport.scrollHeight;
      }
    };

    // Delay scroll to allow for render
    const timeoutId = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timeoutId);
  }, [messages, isLoading]);

  return (
    <div className={cn('writerr-message-area', className)}>
      <ScrollArea.Root className="h-full">
        <ScrollArea.Viewport
          ref={scrollViewportRef}
          className="writerr-messages-container"
          role="log"
          aria-live="polite"
          aria-label="Chat conversation"
        >
          {messages.length === 0 ? (
            <div 
              className="writerr-empty-state" 
              role="status"
              aria-label="No messages yet"
            >
              <div className="text-center py-12">
                <div className="text-lg mb-2" role="img" aria-label="rocket emoji">🚀</div>
                <div className="text-sm text-muted-foreground mb-1">
                  Welcome to Writerr Chat
                </div>
                <div className="text-xs text-muted-foreground">
                  Choose a mode above and start a conversation with your AI writing assistant
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  showTimestamp={true}
                />
              ))}
              {isLoading && <LoadingIndicator />}
            </>
          )}
          <div ref={messagesEndRef} />
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          className="flex select-none touch-none p-0.5 bg-transparent"
          orientation="vertical"
        >
          <ScrollArea.Thumb className="flex-1 bg-gray-400/50 rounded-full relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
};

export default MessageArea;
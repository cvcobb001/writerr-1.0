import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { ChatMode } from '../interface/types';

interface ChatProviderProps {
  children: ReactNode;
  onModeChange?: (mode: ChatMode) => void;
  onMessageSend?: (message: string, mode: ChatMode) => Promise<void>;
}

interface ChatContextValue {
  onModeChange?: (mode: ChatMode) => void;
  onMessageSend?: (message: string, mode: ChatMode) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<ChatProviderProps> = ({
  children,
  onModeChange,
  onMessageSend
}) => {
  const contextValue: ChatContextValue = {
    onModeChange: useCallback((mode: ChatMode) => {
      onModeChange?.(mode);
    }, [onModeChange]),
    
    onMessageSend: useCallback(async (message: string, mode: ChatMode) => {
      if (onMessageSend) {
        await onMessageSend(message, mode);
      }
    }, [onMessageSend])
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatProvider;
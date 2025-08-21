import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChatMessage, ChatMode, ChatSession, ChatState, ChatInterfaceProps } from '../interface/types';
import { MOCK_MODES, getDefaultMode, getModeById } from '../interface/mock-modes';
import { generateId, cn } from '../ui/utils';
import ModeSelector from './ModeSelector';
import MessageArea from './MessageArea';
import MessageInput from './MessageInput';

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  initialMode,
  onModeChange,
  onMessageSend,
  className
}) => {
  // Initialize state
  const [chatState, setChatState] = useState<ChatState>(() => {
    const defaultMode = initialMode ? getModeById(initialMode) || getDefaultMode() : getDefaultMode();
    
    return {
      currentSession: {
        id: generateId(),
        mode: defaultMode.id,
        messages: [],
        createdAt: new Date(),
        lastActivity: new Date()
      },
      availableModes: MOCK_MODES,
      isLoading: false,
      error: null,
      sessionHistory: []
    };
  });

  // Session persistence ref to maintain state across mode switches
  const sessionStorageRef = useRef<Map<string, ChatMessage[]>>(new Map());

  const currentMode = chatState.availableModes.find(mode => mode.id === chatState.currentSession?.mode) || getDefaultMode();

  // Handle mode changes with session continuity
  const handleModeChange = useCallback((newMode: ChatMode) => {
    setChatState(prevState => {
      if (!prevState.currentSession) return prevState;

      // Store current session messages
      sessionStorageRef.current.set(
        prevState.currentSession.mode, 
        [...prevState.currentSession.messages]
      );

      // Retrieve or initialize messages for new mode
      const storedMessages = sessionStorageRef.current.get(newMode.id) || [];

      // Create new session or update existing one
      const updatedSession: ChatSession = {
        ...prevState.currentSession,
        mode: newMode.id,
        messages: storedMessages,
        lastActivity: new Date()
      };

      // Add mode switch notification if there are previous messages
      if (storedMessages.length === 0 && prevState.currentSession.messages.length > 0) {
        const modeChangeMessage: ChatMessage = {
          id: generateId(),
          content: `Switched to ${newMode.name} mode. ${newMode.description}`,
          role: 'system',
          timestamp: new Date(),
          metadata: { mode: newMode.id }
        };
        
        updatedSession.messages = [modeChangeMessage];
      }

      const newState = {
        ...prevState,
        currentSession: updatedSession
      };

      // Notify parent component
      onModeChange?.(newMode);

      return newState;
    });
  }, [onModeChange]);

  // Handle sending messages
  const handleMessageSend = useCallback(async (messageContent: string) => {
    if (!chatState.currentSession) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      content: messageContent,
      role: 'user',
      timestamp: new Date(),
      metadata: { mode: currentMode.id }
    };

    // Add user message immediately
    setChatState(prevState => {
      if (!prevState.currentSession) return prevState;
      
      return {
        ...prevState,
        currentSession: {
          ...prevState.currentSession,
          messages: [...prevState.currentSession.messages, userMessage],
          lastActivity: new Date()
        },
        isLoading: true,
        error: null
      };
    });

    try {
      // Call parent handler if provided
      if (onMessageSend) {
        await onMessageSend(messageContent, currentMode);
      } else {
        // Mock AI response for development
        await simulateAIResponse(messageContent, currentMode);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setChatState(prevState => ({
        ...prevState,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to send message'
      }));
    }
  }, [chatState.currentSession, currentMode, onMessageSend]);

  // Simulate AI response for development
  const simulateAIResponse = useCallback(async (userMessage: string, mode: ChatMode) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const responses: Record<string, string[]> = {
      chat: [
        "That's an interesting perspective! Let me think about that...",
        "I understand what you're saying. Here's my take on it:",
        "Great question! Let me help you explore this idea further.",
        "I see where you're coming from. Here are some thoughts:"
      ],
      'copy-edit': [
        "I can help improve the structure and flow of your writing. Let me suggest some edits:",
        "Looking at your text, I notice some areas where we can enhance clarity and style:",
        "Here are some structural improvements that would strengthen your writing:"
      ],
      proofread: [
        "I've reviewed your text for grammar and mechanics. Here are the corrections:",
        "I found a few grammatical issues that need attention:",
        "Let me help you polish the technical aspects of your writing:"
      ],
      'writing-assistant': [
        "I'd love to collaborate on this! Here are some ideas to develop:",
        "Let's work together to expand on this concept. I can help with:",
        "This is a great starting point! Let me contribute some additional content:"
      ]
    };

    const modeResponses = responses[mode.id] || responses.chat;
    const randomResponse = modeResponses[Math.floor(Math.random() * modeResponses.length)];

    const aiMessage: ChatMessage = {
      id: generateId(),
      content: randomResponse + `\n\n(This is a mock response in ${mode.name} mode. In the real implementation, this would connect to the AI Providers plugin.)`,
      role: 'assistant',
      timestamp: new Date(),
      metadata: { 
        mode: mode.id,
        processingTime: Math.round(1000 + Math.random() * 2000)
      }
    };

    setChatState(prevState => {
      if (!prevState.currentSession) return prevState;
      
      return {
        ...prevState,
        currentSession: {
          ...prevState.currentSession,
          messages: [...prevState.currentSession.messages, aiMessage],
          lastActivity: new Date()
        },
        isLoading: false
      };
    });
  }, []);

  // Update session storage when messages change
  useEffect(() => {
    if (chatState.currentSession) {
      sessionStorageRef.current.set(
        chatState.currentSession.mode,
        [...chatState.currentSession.messages]
      );
    }
  }, [chatState.currentSession?.messages]);

  return (
    <div className={cn('writerr-chat writerr-chat-interface', className)}>
      {/* Header with mode selector */}
      <div className="writerr-chat-header">
        <h2 className="writerr-chat-title">Writerr Chat</h2>
        <ModeSelector
          modes={chatState.availableModes}
          currentMode={currentMode}
          onModeChange={handleModeChange}
          disabled={chatState.isLoading}
        />
        {/* Session continuity indicator */}
        <div 
          className="writerr-session-indicator" 
          title="Session active - your conversation will continue when switching modes"
          role="status"
          aria-label="Session status indicator"
        />
      </div>

      {/* Messages area */}
      <MessageArea
        messages={chatState.currentSession?.messages || []}
        isLoading={chatState.isLoading}
      />

      {/* Input area */}
      <MessageInput
        onSend={handleMessageSend}
        placeholder={`Write your message to the ${currentMode.name.toLowerCase()}... Press Enter for new lines, ${process.platform === 'darwin' ? '⌘' : 'Ctrl'}+Enter to send`}
        disabled={chatState.isLoading}
        minHeight={120}
      />

      {/* Error display */}
      {chatState.error && (
        <div className="writerr-error-banner" role="alert" aria-live="polite">
          <span>⚠️ {chatState.error}</span>
          <button 
            onClick={() => setChatState(prev => ({ ...prev, error: null }))}
            aria-label="Dismiss error message"
            className="writerr-error-dismiss"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MessageInputProps } from '../interface/types';
import { matchesShortcut, getModifierKeyName, DEFAULT_KEYBOARD_SHORTCUTS, cn } from '../ui/utils';

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  placeholder = "Type your message here... Press Enter for new lines, Cmd+Enter to send",
  disabled = false,
  minHeight = 120,
  className
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending || disabled) return;

    setIsSending(true);
    try {
      await onSend(trimmedMessage);
      setMessage('');
      
      // Reset textarea height after clearing content
      if (textareaRef.current) {
        textareaRef.current.style.height = `${minHeight}px`;
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  }, [message, onSend, isSending, disabled, minHeight]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle send shortcut (Cmd+Enter or Ctrl+Enter)
    if (matchesShortcut(event.nativeEvent, DEFAULT_KEYBOARD_SHORTCUTS.send)) {
      event.preventDefault();
      handleSend();
      return;
    }

    // Allow Enter for new lines (default behavior)
    // No need to handle explicitly as it's the default textarea behavior
  }, [handleSend]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
  }, []);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.max(minHeight, scrollHeight);
      textarea.style.height = `${newHeight}px`;
    };

    adjustHeight();
  }, [message, minHeight]);

  // Focus management
  const focusTextarea = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  // Handle focus shortcut (Cmd+K or Ctrl+K) and external focus events
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (matchesShortcut(event, DEFAULT_KEYBOARD_SHORTCUTS.focus)) {
        event.preventDefault();
        focusTextarea();
      }
    };

    const handleFocusEvent = () => {
      focusTextarea();
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    document.addEventListener('writerr-chat-focus-input', handleFocusEvent);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      document.removeEventListener('writerr-chat-focus-input', handleFocusEvent);
    };
  }, [focusTextarea]);

  const modifierKey = getModifierKeyName();
  const isInputEmpty = !message.trim();
  const canSend = !isInputEmpty && !isSending && !disabled;

  return (
    <div className={cn('writerr-input-area', className)}>
      <div className="writerr-input-container">
        <textarea
          ref={textareaRef}
          className="writerr-message-input"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          style={{ minHeight: `${minHeight}px` }}
          aria-label="Message input"
          aria-describedby="writerr-input-help"
        />
        
        <div className="writerr-input-controls">
          <div className="writerr-input-shortcuts" id="writerr-input-help">
            <div className="writerr-shortcut">
              <span className="writerr-shortcut-key">Enter</span>
              <span>New line</span>
            </div>
            <div className="writerr-shortcut">
              <span className="writerr-shortcut-key">{modifierKey}+Enter</span>
              <span>Send</span>
            </div>
            <div className="writerr-shortcut">
              <span className="writerr-shortcut-key">{modifierKey}+K</span>
              <span>Focus</span>
            </div>
          </div>
          
          <button
            className="writerr-send-button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label={isSending ? 'Sending message...' : 'Send message'}
          >
            {isSending ? (
              <>
                <div className="writerr-loading-spinner" />
                Sending...
              </>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
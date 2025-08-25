import { App } from 'obsidian';
import { ToggleConfirmationModal } from '../ToggleConfirmationModal';

// Mock Obsidian App
const mockApp = {
  workspace: {},
  vault: {},
  metadataCache: {}
} as App;

describe('ToggleConfirmationModal', () => {
  let modal: ToggleConfirmationModal;
  let mockOnConfirm: jest.fn;
  let mockOnCancel: jest.fn;

  beforeEach(() => {
    mockOnConfirm = jest.fn();
    mockOnCancel = jest.fn();
    modal = new ToggleConfirmationModal(mockApp, {
      editCount: 5,
      onConfirm: mockOnConfirm,
      onCancel: mockOnCancel
    });
  });

  afterEach(() => {
    // Clear session storage
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  describe('Constructor and Setup', () => {
    it('should create modal instance with correct properties', () => {
      expect(modal).toBeInstanceOf(ToggleConfirmationModal);
      expect(modal.editCount).toBe(5);
    });

    it('should accept callback functions', () => {
      expect(typeof modal.onConfirm).toBe('function');
      expect(typeof modal.onCancel).toBe('function');
    });
  });

  describe('Modal Content', () => {
    it('should display conversational message with edit count', () => {
      modal.onOpen();
      const content = modal.contentEl;
      const message = content.querySelector('.modal-message');
      
      expect(message?.textContent).toContain('You have 5 pending edits');
      expect(message?.textContent).toContain('Turning off Track Edits will discard these changes');
      expect(message?.textContent).toContain('is that okay?');
    });

    it('should handle singular edit count correctly', () => {
      const singleEditModal = new ToggleConfirmationModal(mockApp, {
        editCount: 1,
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel
      });
      
      singleEditModal.onOpen();
      const message = singleEditModal.contentEl.querySelector('.modal-message');
      expect(message?.textContent).toContain('You have 1 pending edit');
    });
  });

  describe('Buttons and Actions', () => {
    beforeEach(() => {
      modal.onOpen();
    });

    it('should create primary and secondary buttons', () => {
      const buttons = modal.contentEl.querySelectorAll('.modal-button');
      expect(buttons).toHaveLength(2);
      
      const confirmButton = modal.contentEl.querySelector('.modal-button-primary');
      const cancelButton = modal.contentEl.querySelector('.modal-button-secondary');
      
      expect(confirmButton?.textContent).toBe('Discard & Turn Off');
      expect(cancelButton?.textContent).toBe('Cancel');
    });

    it('should call onConfirm when primary button is clicked', () => {
      const confirmButton = modal.contentEl.querySelector('.modal-button-primary') as HTMLButtonElement;
      confirmButton.click();
      
      expect(mockOnConfirm).toHaveBeenCalled();
    });

    it('should call onCancel when secondary button is clicked', () => {
      const cancelButton = modal.contentEl.querySelector('.modal-button-secondary') as HTMLButtonElement;
      cancelButton.click();
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should close modal after action', () => {
      const closeSpy = jest.spyOn(modal, 'close');
      const confirmButton = modal.contentEl.querySelector('.modal-button-primary') as HTMLButtonElement;
      
      confirmButton.click();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('Don\'t Ask Again Functionality', () => {
    beforeEach(() => {
      modal.onOpen();
    });

    it('should display "Don\'t ask again" checkbox', () => {
      const checkbox = modal.contentEl.querySelector('input[type="checkbox"]') as HTMLInputElement;
      const label = modal.contentEl.querySelector('.checkbox-label');
      
      expect(checkbox).toBeTruthy();
      expect(label?.textContent).toContain("Don't ask again this session");
    });

    it('should store preference in session storage when checked', () => {
      const checkbox = modal.contentEl.querySelector('input[type="checkbox"]') as HTMLInputElement;
      
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      
      expect(sessionStorage.getItem('track-edits-skip-toggle-confirmation')).toBe('true');
    });

    it('should not store preference when unchecked', () => {
      const checkbox = modal.contentEl.querySelector('input[type="checkbox"]') as HTMLInputElement;
      
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));
      
      expect(sessionStorage.getItem('track-edits-skip-toggle-confirmation')).toBeNull();
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      modal.onOpen();
    });

    it('should close modal when ESC key is pressed', () => {
      const closeSpy = jest.spyOn(modal, 'close');
      const cancelSpy = jest.spyOn(modal, 'onCancel');
      
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escEvent);
      
      expect(cancelSpy).toHaveBeenCalled();
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should confirm action when Enter key is pressed', () => {
      const confirmSpy = jest.spyOn(modal, 'onConfirm');
      
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(enterEvent);
      
      expect(confirmSpy).toHaveBeenCalled();
    });
  });

  describe('Static Methods', () => {
    it('should check if confirmation should be skipped', () => {
      expect(ToggleConfirmationModal.shouldSkipConfirmation()).toBe(false);
      
      sessionStorage.setItem('track-edits-skip-toggle-confirmation', 'true');
      expect(ToggleConfirmationModal.shouldSkipConfirmation()).toBe(true);
    });

    it('should reset session preference', () => {
      sessionStorage.setItem('track-edits-skip-toggle-confirmation', 'true');
      expect(ToggleConfirmationModal.shouldSkipConfirmation()).toBe(true);
      
      ToggleConfirmationModal.resetSessionPreference();
      expect(ToggleConfirmationModal.shouldSkipConfirmation()).toBe(false);
    });
  });
});
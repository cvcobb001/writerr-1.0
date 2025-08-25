import { App, WorkspaceRibbon } from 'obsidian';
import { ToggleStateManager } from '../ToggleStateManager';

// Mock Obsidian components
const mockRibbonEl = {
  setAttribute: jest.fn(),
  removeAttribute: jest.fn(),
  addClass: jest.fn(),
  removeClass: jest.fn(),
  setTooltip: jest.fn(),
  setIcon: jest.fn()
} as any;

const mockApp = {
  workspace: {
    ribbonEl: mockRibbonEl
  }
} as App;

describe('ToggleStateManager', () => {
  let stateManager: ToggleStateManager;
  let mockOnStateChange: jest.fn;

  beforeEach(() => {
    mockOnStateChange = jest.fn();
    stateManager = new ToggleStateManager(mockApp, mockOnStateChange);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with tracking enabled by default', () => {
      expect(stateManager.isTrackingEnabled).toBe(true);
    });

    it('should accept callback function', () => {
      expect(typeof stateManager.onStateChange).toBe('function');
    });
  });

  describe('Toggle State Management', () => {
    it('should toggle from enabled to disabled', () => {
      expect(stateManager.isTrackingEnabled).toBe(true);
      
      stateManager.setTrackingEnabled(false);
      
      expect(stateManager.isTrackingEnabled).toBe(false);
      expect(mockOnStateChange).toHaveBeenCalledWith(false);
    });

    it('should toggle from disabled to enabled', () => {
      stateManager.setTrackingEnabled(false);
      jest.clearAllMocks();
      
      stateManager.setTrackingEnabled(true);
      
      expect(stateManager.isTrackingEnabled).toBe(true);
      expect(mockOnStateChange).toHaveBeenCalledWith(true);
    });

    it('should not trigger callback if state unchanged', () => {
      stateManager.setTrackingEnabled(true);
      
      expect(mockOnStateChange).not.toHaveBeenCalled();
    });
  });

  describe('Ribbon Icon Updates', () => {
    beforeEach(() => {
      // Setup a mock ribbon icon
      stateManager.setRibbonIcon(mockRibbonEl);
    });

    it('should update ribbon icon when tracking is disabled', () => {
      stateManager.setTrackingEnabled(false);
      
      expect(mockRibbonEl.addClass).toHaveBeenCalledWith('track-edits-disabled');
      expect(mockRibbonEl.removeClass).toHaveBeenCalledWith('track-edits-enabled');
      expect(mockRibbonEl.setTooltip).toHaveBeenCalledWith('Track Edits (Disabled) - Click to enable');
      expect(mockRibbonEl.setAttribute).toHaveBeenCalledWith('aria-label', 'Track Edits disabled. Click to enable tracking.');
    });

    it('should update ribbon icon when tracking is enabled', () => {
      stateManager.setTrackingEnabled(false);
      jest.clearAllMocks();
      
      stateManager.setTrackingEnabled(true);
      
      expect(mockRibbonEl.addClass).toHaveBeenCalledWith('track-edits-enabled');
      expect(mockRibbonEl.removeClass).toHaveBeenCalledWith('track-edits-disabled');
      expect(mockRibbonEl.setTooltip).toHaveBeenCalledWith('Track Edits (Active) - Click to manage changes');
      expect(mockRibbonEl.setAttribute).toHaveBeenCalledWith('aria-label', 'Track Edits is active. Click to manage tracked changes.');
    });
  });

  describe('Status Indicator Updates', () => {
    let mockStatusIndicator: HTMLElement;

    beforeEach(() => {
      mockStatusIndicator = {
        addClass: jest.fn(),
        removeClass: jest.fn(),
        setAttribute: jest.fn(),
        textContent: ''
      } as any;
      
      stateManager.setStatusIndicator(mockStatusIndicator);
    });

    it('should show green status when tracking is enabled', () => {
      stateManager.setTrackingEnabled(true);
      
      expect(mockStatusIndicator.addClass).toHaveBeenCalledWith('status-active');
      expect(mockStatusIndicator.removeClass).toHaveBeenCalledWith('status-disabled');
      expect(mockStatusIndicator.setAttribute).toHaveBeenCalledWith('aria-label', 'Track Edits is active');
      expect(mockStatusIndicator.textContent).toBe('Active');
    });

    it('should show gray status when tracking is disabled', () => {
      stateManager.setTrackingEnabled(false);
      
      expect(mockStatusIndicator.addClass).toHaveBeenCalledWith('status-disabled');
      expect(mockStatusIndicator.removeClass).toHaveBeenCalledWith('status-active');
      expect(mockStatusIndicator.setAttribute).toHaveBeenCalledWith('aria-label', 'Track Edits is disabled');
      expect(mockStatusIndicator.textContent).toBe('Disabled');
    });
  });

  describe('Side Panel State Management', () => {
    let mockSidePanel: HTMLElement;

    beforeEach(() => {
      mockSidePanel = {
        addClass: jest.fn(),
        removeClass: jest.fn(),
        querySelector: jest.fn(),
        innerHTML: ''
      } as any;
      
      stateManager.setSidePanel(mockSidePanel);
    });

    it('should show empty state when tracking is disabled', () => {
      stateManager.setTrackingEnabled(false);
      
      expect(mockSidePanel.addClass).toHaveBeenCalledWith('track-edits-disabled');
      expect(mockSidePanel.removeClass).toHaveBeenCalledWith('track-edits-active');
      expect(mockSidePanel.innerHTML).toContain('Tracking disabled');
      expect(mockSidePanel.innerHTML).toContain('Enable Track Edits to see changes');
    });

    it('should show active state when tracking is enabled', () => {
      stateManager.setTrackingEnabled(false);
      jest.clearAllMocks();
      
      stateManager.setTrackingEnabled(true);
      
      expect(mockSidePanel.addClass).toHaveBeenCalledWith('track-edits-active');
      expect(mockSidePanel.removeClass).toHaveBeenCalledWith('track-edits-disabled');
      // Should restore original content when re-enabled
    });
  });

  describe('State Persistence', () => {
    it('should save state to session storage', () => {
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      
      stateManager.setTrackingEnabled(false);
      
      expect(setItemSpy).toHaveBeenCalledWith('track-edits-enabled', 'false');
    });

    it('should load state from session storage', () => {
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
      getItemSpy.mockReturnValue('false');
      
      const newStateManager = new ToggleStateManager(mockApp, mockOnStateChange);
      
      expect(newStateManager.isTrackingEnabled).toBe(false);
      expect(getItemSpy).toHaveBeenCalledWith('track-edits-enabled');
    });

    it('should default to enabled if no saved state', () => {
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
      getItemSpy.mockReturnValue(null);
      
      const newStateManager = new ToggleStateManager(mockApp, mockOnStateChange);
      
      expect(newStateManager.isTrackingEnabled).toBe(true);
    });
  });

  describe('Smooth Transitions', () => {
    it('should add transition classes during state change', () => {
      const mockElement = {
        addClass: jest.fn(),
        removeClass: jest.fn()
      } as any;
      
      stateManager.setRibbonIcon(mockElement);
      stateManager.setTrackingEnabled(false);
      
      expect(mockElement.addClass).toHaveBeenCalledWith('state-transition');
      
      // Should remove transition class after animation
      setTimeout(() => {
        expect(mockElement.removeClass).toHaveBeenCalledWith('state-transition');
      }, 300);
    });
  });

  describe('Accessibility Features', () => {
    it('should update ARIA labels for screen readers', () => {
      const mockElement = {
        setAttribute: jest.fn(),
        addClass: jest.fn(),
        removeClass: jest.fn(),
        setTooltip: jest.fn()
      } as any;
      
      stateManager.setRibbonIcon(mockElement);
      stateManager.setTrackingEnabled(false);
      
      expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-label', 'Track Edits disabled. Click to enable tracking.');
    });

    it('should announce state changes to screen readers', () => {
      const mockAriaLive = {
        textContent: ''
      } as HTMLElement;
      
      document.body.appendChild(mockAriaLive);
      mockAriaLive.setAttribute('aria-live', 'polite');
      mockAriaLive.setAttribute('id', 'track-edits-announcer');
      
      stateManager.setTrackingEnabled(false);
      
      expect(mockAriaLive.textContent).toBe('Track Edits has been disabled');
    });
  });
});
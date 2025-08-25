import { App, Modal } from 'obsidian';

export interface ToggleConfirmationOptions {
  editCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export class ToggleConfirmationModal extends Modal {
  private options: ToggleConfirmationOptions;
  private keydownHandler: (e: KeyboardEvent) => void;

  constructor(app: App, options: ToggleConfirmationOptions) {
    super(app);
    this.options = options;
    
    // Bind keyboard handler
    this.keydownHandler = this.handleKeydown.bind(this);
  }

  get editCount(): number {
    return this.options.editCount;
  }

  get onConfirm(): () => void {
    return this.options.onConfirm;
  }

  get onCancel(): () => void {
    return this.options.onCancel;
  }

  onOpen(): void {
    const { contentEl } = this;
    const { editCount } = this.options;

    // Clear content
    contentEl.empty();
    contentEl.addClass('toggle-confirmation-modal');

    // Create header
    const header = contentEl.createEl('h2', {
      text: 'Turn Off Track Edits?',
      cls: 'modal-title'
    });

    // Create clear, concise message
    const messageEl = contentEl.createEl('p', {
      cls: 'modal-message'
    });
    
    const editText = editCount === 1 ? 'edit' : 'edits';
    messageEl.textContent = `You have ${editCount} pending ${editText}. These changes will be lost if you turn off tracking.`;

    // TODO: Add "Don't ask again" option in future update

    // Create button container
    const buttonContainer = contentEl.createEl('div', {
      cls: 'modal-button-container'
    });

    // Create Cancel button (secondary)
    const cancelButton = buttonContainer.createEl('button', {
      text: 'Keep Tracking',
      cls: 'modal-button modal-button-secondary'
    });

    cancelButton.addEventListener('click', () => {
      this.handleCancel();
    });

    // Create Confirm button (primary)
    const confirmButton = buttonContainer.createEl('button', {
      text: 'Turn Off Anyway',
      cls: 'modal-button modal-button-primary'
    });

    confirmButton.addEventListener('click', () => {
      this.handleConfirm();
    });

    // Set focus to cancel button (safe default)
    cancelButton.focus();

    // Add keyboard event listener
    document.addEventListener('keydown', this.keydownHandler);
  }

  onClose(): void {
    // Remove keyboard event listener
    document.removeEventListener('keydown', this.keydownHandler);
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.handleCancel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.handleConfirm();
    }
  }

  private handleConfirm(): void {
    this.options.onConfirm();
    this.close();
  }

  private handleCancel(): void {
    this.options.onCancel();
    this.close();
  }

  // TODO: Add shouldSkipConfirmation() and resetSessionPreference() methods in future update
}
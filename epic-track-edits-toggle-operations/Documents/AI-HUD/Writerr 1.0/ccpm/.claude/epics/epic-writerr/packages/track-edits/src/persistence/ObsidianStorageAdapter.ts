/**
 * @fileoverview Obsidian vault storage adapter for Track Edits plugin
 */

import { Vault, TFile, TFolder } from 'obsidian';
import { StorageAdapter } from './types';

export class ObsidianStorageAdapter implements StorageAdapter {
  private vault: Vault;
  private basePath: string;

  constructor(vault: Vault, basePath = '.writerr/track-edits') {
    this.vault = vault;
    this.basePath = basePath;
  }

  /**
   * Initialize storage adapter
   */
  async initialize(): Promise<void> {
    try {
      // Ensure base directory exists
      await this.ensureDirectoryExists(this.basePath);
      
      // Create subdirectories
      await this.ensureDirectoryExists(`${this.basePath}/documents`);
      await this.ensureDirectoryExists(`${this.basePath}/sessions`);
      await this.ensureDirectoryExists(`${this.basePath}/backups`);
      await this.ensureDirectoryExists(`${this.basePath}/audit`);
    } catch (error) {
      throw new Error(`Failed to initialize storage adapter: ${error.message}`);
    }
  }

  /**
   * Read data from storage
   */
  async read(key: string): Promise<string | null> {
    try {
      const filePath = this.getFilePath(key);
      const file = this.vault.getAbstractFileByPath(filePath);
      
      if (!file || !(file instanceof TFile)) {
        return null;
      }

      return await this.vault.read(file);
    } catch (error) {
      if (error.message.includes('File does not exist')) {
        return null;
      }
      throw new Error(`Failed to read key '${key}': ${error.message}`);
    }
  }

  /**
   * Write data to storage
   */
  async write(key: string, data: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      const file = this.vault.getAbstractFileByPath(filePath);

      if (file && file instanceof TFile) {
        // Update existing file
        await this.vault.modify(file, data);
      } else {
        // Create new file
        await this.ensureDirectoryExists(this.getDirectoryPath(filePath));
        await this.vault.create(filePath, data);
      }
    } catch (error) {
      throw new Error(`Failed to write key '${key}': ${error.message}`);
    }
  }

  /**
   * Delete data from storage
   */
  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      const file = this.vault.getAbstractFileByPath(filePath);

      if (file && file instanceof TFile) {
        await this.vault.delete(file);
      }
    } catch (error) {
      throw new Error(`Failed to delete key '${key}': ${error.message}`);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      const file = this.vault.getAbstractFileByPath(filePath);
      return file instanceof TFile;
    } catch (error) {
      return false;
    }
  }

  /**
   * List all keys with optional prefix
   */
  async list(prefix?: string): Promise<string[]> {
    try {
      const searchPath = prefix ? `${this.basePath}/${prefix}` : this.basePath;
      const folder = this.vault.getAbstractFileByPath(searchPath);

      if (!folder || !(folder instanceof TFolder)) {
        return [];
      }

      const keys: string[] = [];
      this.collectKeysRecursively(folder, keys, '');

      return keys.filter(key => !prefix || key.startsWith(prefix));
    } catch (error) {
      throw new Error(`Failed to list keys with prefix '${prefix}': ${error.message}`);
    }
  }

  /**
   * Get size of stored data
   */
  async size(key: string): Promise<number> {
    try {
      const filePath = this.getFilePath(key);
      const file = this.vault.getAbstractFileByPath(filePath);

      if (!file || !(file instanceof TFile)) {
        return 0;
      }

      return file.stat.size;
    } catch (error) {
      throw new Error(`Failed to get size for key '${key}': ${error.message}`);
    }
  }

  /**
   * Clear all stored data
   */
  async clear(): Promise<void> {
    try {
      const folder = this.vault.getAbstractFileByPath(this.basePath);

      if (folder && folder instanceof TFolder) {
        // Delete all files in the folder
        const filesToDelete: TFile[] = [];
        this.collectFilesRecursively(folder, filesToDelete);

        for (const file of filesToDelete) {
          await this.vault.delete(file);
        }
      }
    } catch (error) {
      throw new Error(`Failed to clear storage: ${error.message}`);
    }
  }

  /**
   * Create atomic transaction
   */
  async createTransaction(): Promise<StorageTransaction> {
    return new StorageTransaction(this);
  }

  /**
   * Batch operations
   */
  async batch(operations: Array<{ type: 'read' | 'write' | 'delete'; key: string; data?: string }>): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();

    for (const op of operations) {
      try {
        switch (op.type) {
          case 'read':
            results.set(op.key, await this.read(op.key));
            break;
          case 'write':
            if (op.data !== undefined) {
              await this.write(op.key, op.data);
              results.set(op.key, op.data);
            }
            break;
          case 'delete':
            await this.delete(op.key);
            results.set(op.key, null);
            break;
        }
      } catch (error) {
        throw new Error(`Batch operation failed for key '${op.key}': ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    try {
      const folder = this.vault.getAbstractFileByPath(this.basePath);
      
      if (!folder || !(folder instanceof TFolder)) {
        return {
          totalFiles: 0,
          totalSize: 0,
          lastModified: 0
        };
      }

      const files: TFile[] = [];
      this.collectFilesRecursively(folder, files);

      let totalSize = 0;
      let lastModified = 0;

      for (const file of files) {
        totalSize += file.stat.size;
        lastModified = Math.max(lastModified, file.stat.mtime);
      }

      return {
        totalFiles: files.length,
        totalSize,
        lastModified
      };
    } catch (error) {
      throw new Error(`Failed to get storage stats: ${error.message}`);
    }
  }

  private getFilePath(key: string): string {
    // Sanitize key to be a valid file path
    const sanitized = key.replace(/[<>:"|?*]/g, '_');
    return `${this.basePath}/${sanitized}.json`;
  }

  private getDirectoryPath(filePath: string): string {
    const lastSlash = filePath.lastIndexOf('/');
    return lastSlash !== -1 ? filePath.substring(0, lastSlash) : '';
  }

  private async ensureDirectoryExists(path: string): Promise<void> {
    if (!path) return;

    const folder = this.vault.getAbstractFileByPath(path);
    
    if (!folder) {
      // Create parent directory first
      const parentPath = this.getDirectoryPath(path);
      if (parentPath && parentPath !== path) {
        await this.ensureDirectoryExists(parentPath);
      }
      
      try {
        await this.vault.createFolder(path);
      } catch (error) {
        // Ignore error if folder already exists
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }
  }

  private collectKeysRecursively(folder: TFolder, keys: string[], prefix: string): void {
    for (const child of folder.children) {
      if (child instanceof TFile && child.extension === 'json') {
        const relativePath = child.path.replace(this.basePath + '/', '');
        const key = relativePath.replace('.json', '');
        keys.push(key);
      } else if (child instanceof TFolder) {
        this.collectKeysRecursively(child, keys, prefix);
      }
    }
  }

  private collectFilesRecursively(folder: TFolder, files: TFile[]): void {
    for (const child of folder.children) {
      if (child instanceof TFile) {
        files.push(child);
      } else if (child instanceof TFolder) {
        this.collectFilesRecursively(child, files);
      }
    }
  }
}

/**
 * Storage transaction for atomic operations
 */
class StorageTransaction {
  private operations: Array<{ type: string; key: string; data?: string; oldData?: string }> = [];
  private adapter: ObsidianStorageAdapter;
  private committed = false;
  private rolledBack = false;

  constructor(adapter: ObsidianStorageAdapter) {
    this.adapter = adapter;
  }

  async read(key: string): Promise<string | null> {
    return this.adapter.read(key);
  }

  async write(key: string, data: string): Promise<void> {
    const oldData = await this.adapter.read(key);
    this.operations.push({ type: 'write', key, data, oldData });
  }

  async delete(key: string): Promise<void> {
    const oldData = await this.adapter.read(key);
    this.operations.push({ type: 'delete', key, oldData });
  }

  async commit(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already completed');
    }

    try {
      for (const op of this.operations) {
        switch (op.type) {
          case 'write':
            await this.adapter.write(op.key, op.data!);
            break;
          case 'delete':
            await this.adapter.delete(op.key);
            break;
        }
      }
      this.committed = true;
    } catch (error) {
      await this.rollback();
      throw new Error(`Transaction commit failed: ${error.message}`);
    }
  }

  async rollback(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already completed');
    }

    try {
      // Rollback operations in reverse order
      for (let i = this.operations.length - 1; i >= 0; i--) {
        const op = this.operations[i];
        
        if (op.oldData !== null && op.oldData !== undefined) {
          await this.adapter.write(op.key, op.oldData);
        } else if (op.type === 'write') {
          await this.adapter.delete(op.key);
        }
      }
      this.rolledBack = true;
    } catch (error) {
      throw new Error(`Transaction rollback failed: ${error.message}`);
    }
  }
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  lastModified: number;
}
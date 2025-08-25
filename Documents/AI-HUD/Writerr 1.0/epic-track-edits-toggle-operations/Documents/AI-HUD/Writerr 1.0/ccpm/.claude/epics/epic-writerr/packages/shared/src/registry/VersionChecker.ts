/**
 * Version Checker
 * Handles version compatibility checking for plugins
 */

import { PluginMetadata, VersionCompatibility } from './types';

export class VersionChecker {
  /**
   * Check if a plugin is compatible with the current environment
   */
  async checkCompatibility(metadata: PluginMetadata): Promise<VersionCompatibility> {
    try {
      // Check Obsidian version compatibility
      const obsidianCompatibility = this.checkObsidianCompatibility(metadata);
      if (!obsidianCompatibility.isCompatible) {
        return obsidianCompatibility;
      }

      return { isCompatible: true };
    } catch (error) {
      return {
        isCompatible: false,
        reason: `Version check failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Check if two versions are compatible using semantic versioning rules
   */
  isVersionCompatible(currentVersion: string, requiredVersion: string): boolean {
    try {
      const current = this.parseVersion(currentVersion);
      const required = this.parseVersion(requiredVersion);

      // Handle version ranges and operators
      if (requiredVersion.startsWith('^')) {
        // Caret range: compatible within same major version
        const reqVersion = this.parseVersion(requiredVersion.substring(1));
        return current.major === reqVersion.major && 
               (current.minor > reqVersion.minor || 
                (current.minor === reqVersion.minor && current.patch >= reqVersion.patch));
      }

      if (requiredVersion.startsWith('~')) {
        // Tilde range: compatible within same minor version
        const reqVersion = this.parseVersion(requiredVersion.substring(1));
        return current.major === reqVersion.major && 
               current.minor === reqVersion.minor && 
               current.patch >= reqVersion.patch;
      }

      if (requiredVersion.includes(' - ')) {
        // Range: between two versions
        const [minVer, maxVer] = requiredVersion.split(' - ');
        return this.compareVersions(currentVersion, minVer) >= 0 && 
               this.compareVersions(currentVersion, maxVer) <= 0;
      }

      if (requiredVersion.startsWith('>=')) {
        return this.compareVersions(currentVersion, requiredVersion.substring(2)) >= 0;
      }

      if (requiredVersion.startsWith('<=')) {
        return this.compareVersions(currentVersion, requiredVersion.substring(2)) <= 0;
      }

      if (requiredVersion.startsWith('>')) {
        return this.compareVersions(currentVersion, requiredVersion.substring(1)) > 0;
      }

      if (requiredVersion.startsWith('<')) {
        return this.compareVersions(currentVersion, requiredVersion.substring(1)) < 0;
      }

      // Exact match
      return this.compareVersions(currentVersion, requiredVersion) === 0;
    } catch (error) {
      console.warn(`Version compatibility check failed: ${error}`);
      return false;
    }
  }

  /**
   * Compare two version strings
   * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
   */
  compareVersions(version1: string, version2: string): number {
    const v1 = this.parseVersion(version1);
    const v2 = this.parseVersion(version2);

    if (v1.major !== v2.major) return v1.major - v2.major;
    if (v1.minor !== v2.minor) return v1.minor - v2.minor;
    if (v1.patch !== v2.patch) return v1.patch - v2.patch;

    // Compare pre-release versions
    if (v1.prerelease && !v2.prerelease) return -1;
    if (!v1.prerelease && v2.prerelease) return 1;
    if (v1.prerelease && v2.prerelease) {
      return v1.prerelease.localeCompare(v2.prerelease);
    }

    return 0;
  }

  /**
   * Parse a version string into components
   */
  private parseVersion(version: string): VersionComponents {
    const cleanVersion = version.trim();
    const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9-]+))?(?:\+([a-zA-Z0-9-]+))?$/;
    const match = cleanVersion.match(versionRegex);

    if (!match) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4] || undefined,
      build: match[5] || undefined
    };
  }

  /**
   * Check Obsidian version compatibility
   */
  private checkObsidianCompatibility(metadata: PluginMetadata): VersionCompatibility {
    // Get current Obsidian version (would normally come from app.vault.adapter or similar)
    const currentObsidianVersion = this.getCurrentObsidianVersion();

    if (metadata.minObsidianVersion) {
      if (!this.isVersionCompatible(currentObsidianVersion, `>=${metadata.minObsidianVersion}`)) {
        return {
          isCompatible: false,
          reason: `Requires Obsidian ${metadata.minObsidianVersion} or higher. Current: ${currentObsidianVersion}`,
          suggestedVersion: metadata.minObsidianVersion
        };
      }
    }

    if (metadata.maxObsidianVersion) {
      if (!this.isVersionCompatible(currentObsidianVersion, `<=${metadata.maxObsidianVersion}`)) {
        return {
          isCompatible: false,
          reason: `Requires Obsidian ${metadata.maxObsidianVersion} or lower. Current: ${currentObsidianVersion}`,
          suggestedVersion: metadata.maxObsidianVersion
        };
      }
    }

    return { isCompatible: true };
  }

  /**
   * Get current Obsidian version
   * In a real implementation, this would access the Obsidian app instance
   */
  private getCurrentObsidianVersion(): string {
    // Placeholder - in real implementation would be:
    // return (window as any).app?.vault?.adapter?.version || '1.0.0';
    return '1.4.16'; // Default version for testing
  }

  /**
   * Suggest a compatible version based on requirements
   */
  suggestCompatibleVersion(currentVersion: string, requiredVersion: string): string | null {
    try {
      // If it's a range requirement, suggest the minimum viable version
      if (requiredVersion.startsWith('^')) {
        return requiredVersion.substring(1);
      }

      if (requiredVersion.startsWith('~')) {
        return requiredVersion.substring(1);
      }

      if (requiredVersion.startsWith('>=')) {
        return requiredVersion.substring(2);
      }

      // For other patterns, return the required version
      return requiredVersion.replace(/[<>=~^]/g, '').trim();
    } catch (error) {
      return null;
    }
  }
}

interface VersionComponents {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}
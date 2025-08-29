// Global type declarations for testing environment

declare global {
  var Platform: {
    isMobile: boolean;
    isDesktop: boolean;
  };

  var mockApp: {
    workspace: {
      getActiveFile: jest.MockedFunction<() => any>;
      on: jest.MockedFunction<(event: string, callback: Function) => void>;
      off: jest.MockedFunction<(event: string, callback: Function) => void>;
    };
    vault: {
      read: jest.MockedFunction<(file: any) => Promise<string>>;
      modify: jest.MockedFunction<(file: any, data: string) => Promise<void>>;
      create: jest.MockedFunction<(path: string, data: string) => Promise<any>>;
    };
    metadataCache: {
      getFileCache: jest.MockedFunction<(file: any) => any>;
    };
  };

  var Plugin: new (app: any, manifest: any) => any;
  var MarkdownView: new () => any;
  var TFile: new (path: string) => any;
  var WorkspaceLeaf: new () => any;
  var ItemView: new (leaf: any) => any;

  var restoreConsole: () => void;

  interface Window {
    Writerr: {
      eventBus: {
        on: jest.MockedFunction<(event: string, callback: Function) => void>;
        off: jest.MockedFunction<(event: string, callback: Function) => void>;
        emit: jest.MockedFunction<(event: string, data?: any) => void>;
        publish: jest.MockedFunction<(event: string, data?: any) => Promise<void>>;
        subscribe: jest.MockedFunction<(event: string, callback: Function) => void>;
        unsubscribe: jest.MockedFunction<(event: string, callback: Function) => void>;
        isConnected: jest.MockedFunction<() => boolean>;
      };
    };
  }
}

export {};
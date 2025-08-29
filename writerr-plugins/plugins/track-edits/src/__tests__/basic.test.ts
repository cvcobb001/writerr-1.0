// Basic test to verify Jest + TypeScript configuration
/// <reference path="./types/global.d.ts" />

describe('Jest Configuration', () => {
  test('should run basic TypeScript test', () => {
    const message: string = 'Hello, Jest!';
    expect(message).toBe('Hello, Jest!');
  });

  test('should support async operations', async () => {
    const promise = Promise.resolve(42);
    const result = await promise;
    expect(result).toBe(42);
  });

  test('should have DOM environment available', () => {
    const element = document.createElement('div');
    element.textContent = 'Test element';
    expect(element.textContent).toBe('Test element');
  });

  test('should have IndexedDB mock available', () => {
    expect(global.indexedDB).toBeDefined();
    expect(typeof global.indexedDB.open).toBe('function');
  });

  test('should have Obsidian mocks available', () => {
    expect(global.Platform).toBeDefined();
    expect(global.Platform.isDesktop).toBe(true);
    expect(global.mockApp).toBeDefined();
    expect(global.mockApp.workspace).toBeDefined();
  });

  test('should support timer mocking', () => {
    jest.useFakeTimers();
    
    const callback = jest.fn();
    setTimeout(callback, 1000);
    
    expect(callback).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalled();
    
    jest.useRealTimers();
  });
});
import { ChatComponent, ComponentOptions } from './types';
import WriterrlChatPlugin from '../main';

export abstract class BaseComponent implements ChatComponent {
  container: HTMLElement;
  plugin: WriterrlChatPlugin;

  constructor(options: ComponentOptions) {
    this.container = options.container;
    this.plugin = options.plugin;
  }

  abstract render(): void;

  destroy(): void {
    this.container.empty();
  }

  protected createElement(
    tag: string,
    options: {
      cls?: string | string[];
      text?: string;
      attrs?: Record<string, string>;
      styles?: Record<string, string>;
    } = {}
  ): HTMLElement {
    const el = this.container.createEl(tag);
    
    if (options.cls) {
      if (Array.isArray(options.cls)) {
        el.addClasses(options.cls);
      } else {
        el.addClass(options.cls);
      }
    }
    
    if (options.text) {
      el.textContent = options.text;
    }
    
    if (options.attrs) {
      Object.entries(options.attrs).forEach(([key, value]) => {
        el.setAttribute(key, value);
      });
    }
    
    if (options.styles) {
      el.style.cssText = Object.entries(options.styles)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ');
    }
    
    return el;
  }

  protected addHoverEffect(element: HTMLElement, hoverStyles: Record<string, string>) {
    const originalStyles: Record<string, string> = {};
    
    element.addEventListener('mouseenter', () => {
      Object.entries(hoverStyles).forEach(([key, value]) => {
        originalStyles[key] = element.style[key as any];
        element.style[key as any] = value;
      });
    });
    
    element.addEventListener('mouseleave', () => {
      Object.entries(originalStyles).forEach(([key, value]) => {
        element.style[key as any] = value;
      });
    });
  }
}
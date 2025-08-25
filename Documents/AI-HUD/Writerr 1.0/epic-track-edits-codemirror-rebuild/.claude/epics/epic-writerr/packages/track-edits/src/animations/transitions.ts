import { AnimationConfig } from '../types';

// Standard easing functions
export const easings = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
} as const;

// Animation presets
export const animations = {
  // Fade animations
  fadeIn: {
    duration: 300,
    easing: easings.easeOut,
    keyframes: {
      from: { opacity: '0' },
      to: { opacity: '1' }
    }
  },
  fadeOut: {
    duration: 300,
    easing: easings.easeIn,
    keyframes: {
      from: { opacity: '1' },
      to: { opacity: '0' }
    }
  },

  // Slide animations
  slideInFromTop: {
    duration: 400,
    easing: easings.bounce,
    keyframes: {
      from: { 
        transform: 'translateY(-20px)',
        opacity: '0'
      },
      to: { 
        transform: 'translateY(0)',
        opacity: '1'
      }
    }
  },
  slideInFromRight: {
    duration: 400,
    easing: easings.easeOut,
    keyframes: {
      from: { 
        transform: 'translateX(20px)',
        opacity: '0'
      },
      to: { 
        transform: 'translateX(0)',
        opacity: '1'
      }
    }
  },
  slideInFromLeft: {
    duration: 400,
    easing: easings.easeOut,
    keyframes: {
      from: { 
        transform: 'translateX(-20px)',
        opacity: '0'
      },
      to: { 
        transform: 'translateX(0)',
        opacity: '1'
      }
    }
  },

  // Scale animations
  scaleIn: {
    duration: 300,
    easing: easings.bounce,
    keyframes: {
      from: { 
        transform: 'scale(0.8)',
        opacity: '0'
      },
      to: { 
        transform: 'scale(1)',
        opacity: '1'
      }
    }
  },
  scaleOut: {
    duration: 200,
    easing: easings.easeIn,
    keyframes: {
      from: { 
        transform: 'scale(1)',
        opacity: '1'
      },
      to: { 
        transform: 'scale(0.8)',
        opacity: '0'
      }
    }
  },

  // Highlight animations for changes
  highlightFlash: {
    duration: 600,
    easing: easings.easeInOut,
    keyframes: {
      '0%': { backgroundColor: 'transparent' },
      '50%': { backgroundColor: 'rgba(59, 130, 246, 0.3)' },
      '100%': { backgroundColor: 'transparent' }
    }
  },

  // Pulse animations for pending changes
  pulse: {
    duration: 2000,
    easing: easings.easeInOut,
    iterationCount: 'infinite',
    keyframes: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.7' }
    }
  },

  // Shake animation for errors or rejected changes
  shake: {
    duration: 500,
    easing: easings.easeInOut,
    keyframes: {
      '0%, 100%': { transform: 'translateX(0)' },
      '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
      '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' }
    }
  },

  // Smooth height transitions for expanding/collapsing
  expandHeight: {
    duration: 400,
    easing: easings.easeOut,
    keyframes: {
      from: { 
        height: '0',
        opacity: '0',
        overflow: 'hidden'
      },
      to: { 
        height: 'auto',
        opacity: '1',
        overflow: 'visible'
      }
    }
  },

  // Stagger animation for lists
  staggerItem: (index: number, baseDelay = 50) => ({
    duration: 300,
    easing: easings.easeOut,
    delay: index * baseDelay,
    keyframes: {
      from: {
        transform: 'translateY(10px)',
        opacity: '0'
      },
      to: {
        transform: 'translateY(0)',
        opacity: '1'
      }
    }
  })
} as const;

// CSS class generators for common transitions
export const transitionClasses = {
  // Standard transitions
  smooth: `transition-all duration-300 ease-in-out`,
  fast: `transition-all duration-150 ease-out`,
  slow: `transition-all duration-500 ease-in-out`,
  
  // Property-specific transitions
  opacity: `transition-opacity duration-300 ease-in-out`,
  transform: `transition-transform duration-300 ease-in-out`,
  colors: `transition-colors duration-300 ease-in-out`,
  shadow: `transition-shadow duration-300 ease-in-out`,
  
  // Hover effects
  hoverScale: `transition-transform duration-200 ease-out hover:scale-105`,
  hoverShadow: `transition-shadow duration-200 ease-out hover:shadow-md`,
  hoverOpacity: `transition-opacity duration-200 ease-out hover:opacity-80`
};

// Animation utility functions
export const createKeyframes = (name: string, keyframes: Record<string, Record<string, string>>): string => {
  const keyframeString = Object.entries(keyframes)
    .map(([key, styles]) => {
      const styleString = Object.entries(styles)
        .map(([prop, value]) => `${prop}: ${value};`)
        .join(' ');
      return `${key} { ${styleString} }`;
    })
    .join(' ');
  
  return `@keyframes ${name} { ${keyframeString} }`;
};

export const applyAnimation = (element: HTMLElement, config: AnimationConfig & { keyframes?: Record<string, Record<string, string>> }): Promise<void> => {
  return new Promise((resolve) => {
    const { duration, easing, delay = 0, keyframes } = config;
    
    if (keyframes) {
      // Create and apply keyframe animation
      const animationName = `anim-${Math.random().toString(36).substr(2, 9)}`;
      const keyframeCSS = createKeyframes(animationName, keyframes);
      
      // Inject keyframes into document
      const style = document.createElement('style');
      style.textContent = keyframeCSS;
      document.head.appendChild(style);
      
      // Apply animation
      element.style.animation = `${animationName} ${duration}ms ${easing} ${delay}ms forwards`;
      
      // Clean up after animation
      setTimeout(() => {
        document.head.removeChild(style);
        element.style.animation = '';
        resolve();
      }, duration + delay);
    } else {
      // Apply transition directly
      element.style.transition = `all ${duration}ms ${easing}`;
      setTimeout(resolve, duration + delay);
    }
  });
};

// React hook for animations (to be used with React components)
export const useAnimation = () => {
  const animate = (element: HTMLElement | null, animationKey: keyof typeof animations, options?: Partial<AnimationConfig>) => {
    if (!element) return Promise.resolve();
    
    const animation = animations[animationKey];
    const config = {
      ...animation,
      ...options
    };
    
    return applyAnimation(element, config);
  };
  
  return { animate };
};

// Predefined animation sequences
export const animationSequences = {
  // Change acceptance sequence
  acceptChange: [
    { animation: 'highlightFlash', delay: 0 },
    { animation: 'slideInFromRight', delay: 200 },
    { animation: 'fadeOut', delay: 800 }
  ],
  
  // Change rejection sequence
  rejectChange: [
    { animation: 'shake', delay: 0 },
    { animation: 'fadeOut', delay: 300 }
  ],
  
  // New change appearance
  newChange: [
    { animation: 'scaleIn', delay: 0 },
    { animation: 'highlightFlash', delay: 300 }
  ],
  
  // Cluster formation
  clusterFormation: [
    { animation: 'scaleOut', delay: 0 },
    { animation: 'slideInFromTop', delay: 200 }
  ]
} as const;
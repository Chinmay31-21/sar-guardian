/**
 * Animation and Motion Utilities for Command Center Dashboard
 * Micro-interactions and real-time data feedback animations
 */

import { THEME_COLORS, ANIMATIONS, SHADOWS } from './theme';

// Animation utilities exported as CSS strings and helper functions

/**
 * Smooth height transition for collapsible sections
 */
export const smoothHeight = `
  transition: height ${ANIMATIONS.normal} ${ANIMATIONS.easeInOut},
              opacity ${ANIMATIONS.normal} ${ANIMATIONS.easeInOut};
`;

/**
 * Transform transition for interactive elements
 */
export const smoothTransform = `
  transition: transform ${ANIMATIONS.fast} ${ANIMATIONS.easeInOut},
              box-shadow ${ANIMATIONS.fast} ${ANIMATIONS.easeInOut};
`;

/**
 * Utility class strings for Tailwind CSS
 */
export const animationClasses = {
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
  ping: 'animate-ping',
};

/**
 * Generate CSS for glow effect box-shadow
 */
export const getGlowShadow = (color: string, intensity: 'low' | 'medium' | 'high' = 'medium'): string => {
  const opacityMap = {
    low: '0.3',
    medium: '0.5',
    high: '0.8',
  };
  const blurMap = {
    low: '8px',
    medium: '15px',
    high: '25px',
  };
  const spreadMap = {
    low: '2px',
    medium: '4px',
    high: '8px',
  };
  
  const rgba = `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${opacityMap[intensity]})`;
  return `0 0 ${blurMap[intensity]} ${spreadMap[intensity]} ${rgba}`;
};

/**
 * Keyframe animations for CSS-in-JS
 */
export const keyframes = {
  pulse: `
    @keyframes pulse-glow {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `,
  flow: `
    @keyframes flow-animation {
      0% { stroke-dashoffset: 0; }
      100% { stroke-dashoffset: -15; }
    }
  `,
  scan: `
    @keyframes scan-animation {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `,
  shimmer: `
    @keyframes shimmer-animation {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }
  `,
};

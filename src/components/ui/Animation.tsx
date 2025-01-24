import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface FadeProps {
  children: ReactNode;
  duration?: number;
  delay?: number;
  className?: string;
}

export function Fade({
  children,
  duration = 0.3,
  delay = 0,
  className = '',
}: FadeProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface SlideProps extends FadeProps {
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
}

export function Slide({
  children,
  direction = 'up',
  distance = 20,
  duration = 0.3,
  delay = 0,
  className = '',
}: SlideProps) {
  const slideDirections = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...slideDirections[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, ...slideDirections[direction] }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface ScaleProps extends FadeProps {
  initialScale?: number;
}

export function Scale({
  children,
  initialScale = 0.95,
  duration = 0.3,
  delay = 0,
  className = '',
}: ScaleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: initialScale }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: initialScale }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedListProps {
  children: ReactNode[];
  staggerDelay?: number;
  className?: string;
}

export function AnimatedList({
  children,
  staggerDelay = 0.1,
  className = '',
}: AnimatedListProps) {
  return (
    <motion.div className={className}>
      <AnimatePresence>
        {children.map((child, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: index * staggerDelay }}
          >
            {child}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

const spinnerSizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function LoadingSpinner({
  size = 'md',
  color = 'currentColor',
  className = '',
}: LoadingSpinnerProps) {
  return (
    <svg
      className={`animate-spin ${spinnerSizes[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill={color}
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
} 
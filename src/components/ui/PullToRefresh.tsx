'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const TRIGGER_DISTANCE = 80;
const MAX_PULL = 140;

export const PullToRefresh: React.FC = () => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    const isFromScrollable = (target: EventTarget | null): boolean => {
      let node = target as HTMLElement | null;
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
          if (node.scrollTop > 0) return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (window.scrollY > 0) return;
      if (e.touches.length !== 1) return;
      if (isFromScrollable(e.target)) return;
      startYRef.current = e.touches[0].clientY;
      activeRef.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!activeRef.current || startYRef.current === null) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        setPull(0);
        return;
      }
      if (e.cancelable) e.preventDefault();
      setPull(Math.min(delta * 0.5, MAX_PULL));
    };

    const onTouchEnd = () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      startYRef.current = null;
      if (pull >= TRIGGER_DISTANCE) {
        setRefreshing(true);
        setPull(TRIGGER_DISTANCE);
        window.location.reload();
      } else {
        setPull(0);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [pull, refreshing]);

  if (pull <= 0 && !refreshing) return null;

  const progress = Math.min(pull / TRIGGER_DISTANCE, 1);
  const armed = pull >= TRIGGER_DISTANCE;

  return (
    <div
      className="fixed left-0 right-0 z-40 flex items-center justify-center pointer-events-none lg:hidden"
      style={{
        top: 'var(--safe-top, 0px)',
        transform: `translateY(${pull - 40}px)`,
        transition: activeRef.current ? 'none' : 'transform 200ms ease-out',
      }}
    >
      <div className="bg-white/95 shadow-md rounded-full p-2 border border-gray-200">
        <ArrowPathIcon
          className={`h-5 w-5 text-blue-600 ${refreshing ? 'animate-spin' : ''}`}
          style={{
            transform: refreshing ? undefined : `rotate(${progress * 360}deg)`,
            opacity: armed || refreshing ? 1 : 0.6,
          }}
        />
      </div>
    </div>
  );
};

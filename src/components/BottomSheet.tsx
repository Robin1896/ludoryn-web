'use client';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  children: (close: () => void) => React.ReactNode;
  maxHeight?: string;
  fixed?: boolean;
  zIndex?: number;
  sheetStyle?: React.CSSProperties;
};

export default function BottomSheet({
  isOpen,
  onClose,
  children,
  maxHeight = '88vh',
  fixed = false,
  zIndex = 100,
  sheetStyle,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    gsap.killTweensOf([sheet, backdrop]);
    gsap.set(backdrop, { opacity: 0 });
    gsap.set(sheet, { y: '100%', willChange: 'transform' });
    gsap.to(backdrop, { opacity: 1, duration: 0.35, ease: 'power2.out' });
    gsap.to(sheet, { y: '0%', duration: 0.55, ease: 'expo.out', clearProps: 'willChange' });
  }, [isOpen]);

  function close() {
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    gsap.killTweensOf([sheet, backdrop]);
    gsap.to(sheet, { y: '100%', duration: 0.42, ease: 'expo.in', onComplete: onClose });
  }

  if (!isOpen) return null;

  const content = (
    <div
      ref={backdropRef}
      onClick={close}
      style={{
        position: fixed ? 'fixed' : 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(10px)',
        zIndex,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        opacity: 0,
      }}
    >
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight,
          display: 'flex',
          flexDirection: 'column',
          transform: 'translateY(100%)',
          ...sheetStyle,
        }}
      >
        {children(close)}
      </div>
    </div>
  );

  if (fixed && typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  return content;
}

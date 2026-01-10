import { createElement, useEffect, useRef, useCallback } from 'react';
import twemoji from 'twemoji';
import type { TwemojiProps } from '../types';

export default function Twemoji({
  children,
  className,
  tag = 'span',
}: TwemojiProps) {
  const elementRef = useRef<HTMLElement | null>(null);

  const setRef = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
    if (element) {
      twemoji.parse(element, {
        folder: 'svg',
        ext: '.svg',
      });
    }
  }, []);

  useEffect(() => {
    if (elementRef.current) {
      twemoji.parse(elementRef.current, {
        folder: 'svg',
        ext: '.svg',
      });
    }
  }, [children]);

  return createElement(
    tag,
    {
      ref: setRef,
      className,
    },
    children
  );
}

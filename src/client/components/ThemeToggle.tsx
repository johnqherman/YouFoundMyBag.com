import { useState, useEffect } from 'react';

function getInitialDark(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('theme');
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(getInitialDark);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="theme-toggle-fab fixed bottom-5 right-5 z-[9999] w-12 h-12 rounded-full
        flex items-center justify-center
        shadow-lg hover:shadow-xl
        transition-all duration-300 ease-in-out
        hover:scale-110 active:scale-95"
      style={{
        backgroundColor: dark ? '#2a2c2d' : '#ffffff',
        border: `1px solid ${dark ? '#3e4446' : '#d9e4f2'}`,
        color: dark ? '#e7ba18' : '#356197',
      }}
    >
      <div className="relative w-6 h-6">
        <svg
          className="absolute inset-0 transition-all duration-300"
          style={{
            opacity: dark ? 0 : 1,
            transform: dark
              ? 'rotate(90deg) scale(0.5)'
              : 'rotate(0deg) scale(1)',
          }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <svg
          className="absolute inset-0 transition-all duration-300"
          style={{
            opacity: dark ? 1 : 0,
            transform: dark
              ? 'rotate(0deg) scale(1)'
              : 'rotate(-90deg) scale(0.5)',
          }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </div>
    </button>
  );
}

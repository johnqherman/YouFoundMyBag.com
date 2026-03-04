import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(() =>
    Boolean(localStorage.getItem('owner_session_token'))
  );
  const location = useLocation();

  useEffect(() => {
    const handleStorage = () =>
      setIsOwner(Boolean(localStorage.getItem('owner_session_token')));
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/features', label: 'Features' },
    { to: '/pricing', label: 'Pricing' },
    { to: '/contact', label: 'Contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-regal-navy-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <Link to="/" className="flex items-center gap-0.5 shrink-0">
            <span className="text-xl sm:text-2xl font-semibold text-regal-navy-900">
              YouFoundMyBag
            </span>
            <span className="text-sm sm:text-base text-regal-navy-500 font-normal">
              .com
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive(link.to)
                    ? 'text-regal-navy-900 bg-regal-navy-50'
                    : 'text-regal-navy-600 hover:text-regal-navy-900 hover:bg-regal-navy-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to={isOwner ? '/dashboard' : '/new'}
              className="btn-primary ml-3 text-sm !py-2 !px-4 !min-h-0"
            >
              {isOwner ? 'Dashboard' : 'Get Started'}
            </Link>
          </nav>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -mr-2 text-regal-navy-600 hover:text-regal-navy-900 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-regal-navy-100 bg-white animate-slideDown">
          <nav className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive(link.to)
                    ? 'text-regal-navy-900 bg-regal-navy-50'
                    : 'text-regal-navy-600 hover:text-regal-navy-900 hover:bg-regal-navy-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to={isOwner ? '/dashboard' : '/new'}
              onClick={() => setMobileMenuOpen(false)}
              className="block btn-primary text-center text-sm mt-2"
            >
              {isOwner ? 'Dashboard' : 'Get Started'}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

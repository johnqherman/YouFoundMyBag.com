import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-regal-navy-200/60 bg-regal-navy-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-center text-regal-navy-500 text-sm">
        <p>
          &copy; {new Date().getFullYear()} YouFoundMyBag &bull;{' '}
          <Link to="/terms" className="link">
            Terms of Service
          </Link>{' '}
          &bull;{' '}
          <Link to="/privacy" className="link">
            Privacy Policy
          </Link>
        </p>
      </div>
    </footer>
  );
}

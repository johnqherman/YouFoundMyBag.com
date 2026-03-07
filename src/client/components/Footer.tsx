import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-regal-navy-200/60 bg-regal-navy-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-center text-regal-navy-500 text-sm">
        <p className="flex items-center justify-center gap-2 flex-wrap">
          <span>&copy; {new Date().getFullYear()} YouFoundMyBag</span>
          <span aria-hidden="true">&bull;</span>
          <Link to="/terms" className="link">
            Terms of Service
          </Link>
          <span aria-hidden="true">&bull;</span>
          <Link to="/privacy" className="link">
            Privacy Policy
          </Link>
        </p>
      </div>
    </footer>
  );
}

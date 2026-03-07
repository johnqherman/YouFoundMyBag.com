import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-regal-navy-200/60 bg-regal-navy-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-center text-regal-navy-500 text-sm">
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-center sm:gap-2">
          <span>&copy; {new Date().getFullYear()} YouFoundMyBag</span>
          <span aria-hidden="true" className="hidden sm:inline">
            &bull;
          </span>
          <div className="flex items-center justify-center gap-2 mb-1 sm:mb-0">
            <Link to="/terms" className="link">
              Terms of Service
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link to="/privacy" className="link">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

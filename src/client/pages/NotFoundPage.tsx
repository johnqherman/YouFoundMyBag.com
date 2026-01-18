import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900">
      <Helmet>
        <title>Page Not Found | YouFoundMyBag.com</title>
      </Helmet>
      <div className="max-w-md mx-auto p-4 sm:p-6 lg:max-w-2xl flex items-center justify-center min-h-screen">
        <div className="card text-center w-full">
          <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🔍</div>
          <h1 className="text-4xl sm:text-5xl font-semibold mb-2 sm:mb-3 text-regal-navy-900">
            404
          </h1>
          <h2 className="text-lg sm:text-xl font-medium mb-2 sm:mb-3 text-regal-navy-800">
            Page Not Found
          </h2>
          <p className="text-sm sm:text-base text-regal-navy-600 mb-6 sm:mb-8">
            The page you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link to="/" className="btn-primary inline-block">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900">
      <div className="max-w-md mx-auto p-6 lg:max-w-2xl flex items-center justify-center min-h-screen">
        <div className="card text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-5xl font-semibold mb-3 text-regal-navy-900">
            404
          </h1>
          <h2 className="text-xl font-medium mb-3 text-regal-navy-800">
            Page Not Found
          </h2>
          <p className="text-regal-navy-600 mb-8">
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

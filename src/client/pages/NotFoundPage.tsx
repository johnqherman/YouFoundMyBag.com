import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-md mx-auto p-6 lg:max-w-2xl flex items-center justify-center min-h-screen">
        <div className="card text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <h2 className="text-xl font-semibold mb-4">Page Not Found</h2>
          <p className="text-neutral-300 mb-8">
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

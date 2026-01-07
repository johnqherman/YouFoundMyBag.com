export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-regal-navy-200 border-t-regal-navy-600"></div>
      <span className="ml-3 text-regal-navy-600 font-medium">Loading...</span>
    </div>
  );
}

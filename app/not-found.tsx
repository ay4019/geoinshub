import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-3xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-3 text-sm text-slate-600">The requested page does not exist or may have moved.</p>
      <Link
        href="/"
        className="btn-base btn-md mt-6"
      >
        Return home
      </Link>
    </div>
  );
}

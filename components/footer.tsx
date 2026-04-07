import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-10 text-sm text-slate-600 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p>
          (c) {new Date().getFullYear()} Geotechnical Insights Hub. Educational content and preliminary tools.
        </p>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="transition-colors hover:text-slate-900">
            Terms of Use
          </Link>
          <Link href="/privacy-policy" className="transition-colors hover:text-slate-900">
            Privacy Policy
          </Link>
          <Link href="/disclaimer" className="transition-colors hover:text-slate-900">
            Disclaimer
          </Link>
        </div>
      </div>
    </footer>
  );
}



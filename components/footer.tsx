import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-3 py-6 text-xs leading-relaxed text-slate-600 sm:gap-4 sm:px-6 sm:py-10 sm:text-sm md:flex-row md:items-center md:justify-between">
        <p>
          (c) {new Date().getFullYear()} Geotechnical Insights Hub. Educational content and preliminary tools.
        </p>
        <div className="flex flex-wrap items-center gap-4">
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



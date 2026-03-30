import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Owner-written geotechnical articles on calculations, interpretation, and engineering assumptions.",
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 sm:py-12">
      {children}
    </div>
  );
}



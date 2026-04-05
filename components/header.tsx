"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/tools", label: "Tools" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
  { href: "/account", label: "Account" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(href);
}

export function Header() {
  const pathname = usePathname();
  const supabaseReady = isSupabaseConfigured();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!supabaseReady) {
      return;
    }

    const supabase = createSupabaseBrowserClient();

    const syncAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(Boolean(user));
    };

    void syncAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncAuth();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseReady]);

  return (
    <header className="sticky top-0 z-40 overflow-hidden border-b border-slate-200/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-28 w-full max-w-[1600px] items-center justify-between pl-2 pr-4 sm:pl-3 sm:pr-6">
        <Link href="/" className="flex shrink-0 items-center leading-none" aria-label="Geotechnical Insights Hub home">
          <img
            src="/images/logo-kahve-header.png"
            alt="Geotechnical Insights Hub"
            style={{ height: "86px", minWidth: "470px" }}
            className="block w-auto object-contain object-left"
          />
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-2.5 sm:gap-3.5">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3.5 py-2.5 text-[15px] font-medium transition-all duration-200 ${
                  active
                    ? "nav-link-active bg-slate-800 hover:font-bold"
                    : "text-slate-800 hover:font-bold hover:text-slate-950"
                }`}
              >
                {item.href === "/account" ? (
                  <span className="relative inline-flex items-center">
                    <span>{item.label}</span>
                    {supabaseReady && isAuthenticated ? (
                      <span
                        className="ml-1.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white"
                        aria-label="Signed in"
                        title="Signed in"
                      >
                        <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 text-white" aria-hidden="true">
                          <path
                            d="M3.2 8.2L6.4 11.1L12.8 4.9"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    ) : null}
                  </span>
                ) : (
                  item.label
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}



"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useSubscription } from "@/components/subscription-context";
import { tierUi } from "@/lib/subscription";
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

function MenuIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();
  const supabaseReady = isSupabaseConfigured();
  const { isAdmin: isSubscriptionAdmin, loading: subscriptionLoading, tier } = useSubscription();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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

  const renderNavLink = (item: (typeof navItems)[number], dense: boolean) => {
    const active = isActive(pathname, item.href);
    const base =
      dense
        ? "block rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 sm:py-2.5 sm:text-base"
        : "rounded-md px-2.5 py-1.5 text-sm font-medium transition-all duration-200 md:px-3 md:py-2 md:text-[15px] lg:px-3.5 lg:py-2.5";
    const activeCls =
      active
        ? item.href === "/account"
          ? `nav-link-active ${tierUi(tier, isSubscriptionAdmin).tabActiveClass} hover:font-bold`
          : "nav-link-active bg-slate-800 text-white hover:font-bold"
        : "text-slate-800 hover:font-bold hover:text-slate-950";
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`${base} ${activeCls}`}
        onClick={() => setMenuOpen(false)}
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
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-2 px-2 py-1.5 sm:gap-3 sm:px-4 sm:py-2 md:gap-4 lg:px-6 lg:py-2.5">
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center leading-none md:block md:w-auto md:flex-none"
          aria-label="Geotechnical Insights Hub home"
        >
          <img
            src="/images/logo-kahve-header.png"
            alt="Geotechnical Insights Hub"
            className="block h-[72px] w-auto max-w-full object-contain object-left sm:h-[78px] md:h-[82px] lg:h-[86px]"
          />
        </Link>

        <button
          type="button"
          className="inline-flex shrink-0 items-center justify-center self-center rounded-lg border border-slate-200 bg-white p-2.5 text-slate-800 shadow-sm md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-primary-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex md:gap-2 lg:gap-3.5">
          {navItems.map((item) => renderNavLink(item, false))}
          {supabaseReady && isAuthenticated && isSubscriptionAdmin && !subscriptionLoading ? (
            <Link
              href="/admin"
              className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-all duration-200 md:px-3 md:py-2 md:text-[15px] lg:px-3.5 lg:py-2.5 ${
                pathname.startsWith("/admin")
                  ? "nav-link-active bg-amber-800 text-white hover:font-bold"
                  : "text-amber-900 hover:font-bold hover:text-amber-950"
              }`}
            >
              Admin
            </Link>
          ) : null}
        </nav>
      </div>

      {menuOpen ? (
        <div
          id="mobile-primary-nav"
          className="border-t border-slate-200 bg-white shadow-[0_12px_24px_-12px_rgba(15,23,42,0.2)] md:hidden"
        >
          <nav aria-label="Primary mobile" className="mx-auto flex max-w-[1600px] flex-col px-3 py-2">
            {navItems.map((item) => renderNavLink(item, true))}
            {supabaseReady && isAuthenticated && isSubscriptionAdmin && !subscriptionLoading ? (
              <Link
                href="/admin"
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 sm:py-2.5 sm:text-base ${
                  pathname.startsWith("/admin")
                    ? "nav-link-active bg-amber-800 text-white hover:font-bold"
                    : "text-amber-900 hover:font-bold hover:text-amber-950"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                Admin
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}



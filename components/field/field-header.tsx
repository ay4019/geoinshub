"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useEffect, useEffectEvent, useState } from "react";

import { StrataStrip } from "@/components/field/field-graphics";
import { useSubscription } from "@/components/subscription-context";
import { isGuideCapturePath } from "@/lib/guide-capture";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const NAV = [
  { href: "/tools", label: "Tools", tour: "nav-tools" },
  { href: "/blog", label: "Blog" },
  { href: "/docs/guide", label: "Guide" },
  { href: "/contact", label: "Contact" },
] as const;

const ACCOUNT_NAV = [
  { href: "/account", label: "Account", tour: "nav-account" },
  { href: "/projects", label: "Projects", tour: "nav-projects" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Masthead for the field-notebook design (same routes and auth behaviour as components/header.tsx). */
export function FieldHeader() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const guideCapture = isGuideCapturePath(pathname);
  const supabaseReady = isSupabaseConfigured();
  const { isAdmin, loading: subscriptionLoading } = useSubscription();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const signedIn = guideCapture || (supabaseReady && isAuthenticated);
  const showAdmin = supabaseReady && isAuthenticated && isAdmin && !subscriptionLoading;

  const closeMenuOnRouteChange = useEffectEvent(() => setMenuOpen(false));
  useEffect(() => {
    closeMenuOnRouteChange();
  }, [pathname]);

  useEffect(() => {
    if (!supabaseReady) return;
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
    return () => subscription.unsubscribe();
  }, [supabaseReady]);

  const onNavClick = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    setMenuOpen(false);
    if (href === "/projects" && !signedIn) {
      event.preventDefault();
      router.push("/account");
    }
  };

  const link = (item: { href: string; label: string; tour?: string }, mobile = false) => (
    <Link
      key={item.href}
      href={item.href}
      data-tour={mobile ? undefined : item.tour}
      aria-current={isActive(pathname, item.href) ? "page" : undefined}
      onClick={onNavClick(item.href)}
    >
      {item.label}
      {item.href === "/account" && signedIn ? <span className="fd-signed-in" title="Signed in" aria-label="Signed in" /> : null}
    </Link>
  );

  return (
    <header className="fd-masthead">
      <div className="fd-masthead-inner">
        <Link href="/" className="fd-wordmark" aria-label="Geotechnical Insights Hub home">
          <span>
            Geotechnical Insights Hub
            <small>Field notes &amp; engineering tools</small>
          </span>
        </Link>

        <nav aria-label="Primary" className="fd-nav fd-nav-desktop">
          {NAV.map((item) => link(item))}
          <span className="fd-nav-sep" aria-hidden="true" />
          {ACCOUNT_NAV.map((item) => link(item))}
          {showAdmin ? (
            <Link href="/admin" className="fd-nav-admin" aria-current={pathname.startsWith("/admin") ? "page" : undefined}>
              Admin
            </Link>
          ) : null}
        </nav>

        <button
          type="button"
          className="fd-menu-button"
          aria-expanded={menuOpen}
          aria-controls="fd-mobile-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
          </svg>
        </button>
      </div>

      {menuOpen ? (
        <nav id="fd-mobile-nav" aria-label="Primary mobile" className="fd-mobile-nav">
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
            Home
          </Link>
          {NAV.map((item) => link(item, true))}
          {ACCOUNT_NAV.map((item) => link(item, true))}
          {showAdmin ? <Link href="/admin">Admin</Link> : null}
        </nav>
      ) : null}
      <StrataStrip />
    </header>
  );
}

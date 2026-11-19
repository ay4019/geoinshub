"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useEffect, useEffectEvent, useState } from "react";

import { StrataStrip } from "@/components/field/field-graphics";
import { useSubscription } from "@/components/subscription-context";
import { tierUi } from "@/lib/subscription";
import { isGuideCapturePath } from "@/lib/guide-capture";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/tools", label: "Tools" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
] as const;

const accountNav = { href: "/account", label: "Account" } as const;
const projectsNav = { href: "/projects", label: "Projects" } as const;

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
  const router = useRouter();
  const guideCapture = isGuideCapturePath(pathname);
  const supabaseReady = isSupabaseConfigured();
  const { isAdmin: isSubscriptionAdmin, loading: subscriptionLoading, tier } = useSubscription();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const showSignedInChrome = guideCapture || (supabaseReady && isAuthenticated);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenuOnRouteChange = useEffectEvent(() => {
    setMenuOpen(false);
  });

  useEffect(() => {
    closeMenuOnRouteChange();
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

  type NavItem = { href: string; label: string };

  const navItemActive = (item: NavItem) => {
    if (guideCapture) {
      if (item.href === "/account") {
        return pathname?.includes("/guide-capture/account-header") ?? false;
      }
      if (item.href === "/projects") {
        return pathname?.includes("/guide-capture/projects") ?? false;
      }
    }
    return isActive(pathname, item.href);
  };

  const renderNavLink = (
    item: NavItem,
    dense: boolean,
    options?: { inlineRow?: boolean; accountExtras?: boolean },
  ) => {
    const active = navItemActive(item);
    const inlineRow = Boolean(options?.inlineRow && dense);
    const base = inlineRow
      ? "inline-flex border-l-2 px-3 py-2 text-sm font-medium transition-colors duration-200 sm:py-2.5 sm:text-base"
      : dense
        ? "block border-l-2 px-3 py-2 text-sm font-medium transition-colors duration-200 sm:py-2.5 sm:text-base"
        : "border-b-2 px-1 py-1.5 text-sm font-medium transition-colors duration-200 md:text-[15px]";
    const showAccountChrome = options?.accountExtras && item.href === "/account";
    // Signed in: the Account link gets a thin frame in the membership-tier colour (bronze / silver / gold).
    const tierFrame = Boolean(showAccountChrome && showSignedInChrome);
    const tierFrameStyle = tierFrame
      ? tierUi(guideCapture ? "gold" : tier, guideCapture ? false : isSubscriptionAdmin).ringStyle
      : undefined;
    // Active item: brown rule (underline on desktop, left rule in the mobile list) instead of a filled box.
    // A framed Account link shows "active" by weight only, so the rule doesn't fight the frame.
    const activeCls = tierFrame
      ? `rounded-md !px-3 border-transparent ${active ? "nav-link-active !text-slate-950" : "!text-slate-600 hover:!text-slate-950"}`
      : active
        ? "nav-link-active border-amber-800 !text-slate-950"
        : "border-transparent !text-slate-600 hover:border-slate-300 hover:!text-slate-950";
    return (
      <Link
        key={item.href}
        href={item.href}
        data-tour={
          item.href === "/tools"
            ? "nav-tools"
            : item.href === "/account"
              ? "nav-account"
              : item.href === "/projects"
                ? "nav-projects"
                : undefined
        }
        className={`${base} ${activeCls}`}
        style={tierFrameStyle}
        onClick={(event: MouseEvent<HTMLAnchorElement>) => {
          setMenuOpen(false);
          if (item.href === "/projects" && !showSignedInChrome) {
            event.preventDefault();
            router.push("/account");
          }
        }}
      >
        {showAccountChrome ? (
          <span className="relative inline-flex items-center">
            <span>{item.label}</span>
            {showSignedInChrome ? (
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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-2 px-2 py-1.5 sm:gap-3 sm:px-4 sm:py-2 md:gap-4 lg:px-6 lg:py-2.5">
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center leading-none md:block md:w-auto md:flex-none"
          aria-label="Geotechnical Insights Hub home"
        >
          <img
            src="/images/logo-kahve-header.png"
            alt="Geotechnical Insights Hub"
            className="block h-[72px] w-auto max-w-full object-contain object-left mix-blend-multiply sm:h-[78px] md:h-[82px] lg:h-[86px]"
          />
        </Link>

        <button
          type="button"
          className="inline-flex shrink-0 items-center justify-center self-center p-2.5 text-slate-800 transition-colors hover:text-amber-800 md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-primary-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        <nav aria-label="Primary" className="hidden items-center gap-4 md:flex lg:gap-6">
          {navItems.map((item) => renderNavLink(item, false))}
          <div className="flex items-center gap-2 lg:gap-3">
            {renderNavLink(accountNav, false, { accountExtras: true })}
            <span className="select-none text-slate-400" aria-hidden="true">
              |
            </span>
            {renderNavLink(projectsNav, false)}
          </div>
          {supabaseReady && isAuthenticated && isSubscriptionAdmin && !subscriptionLoading ? (
            <Link
              href="/admin"
              className={`border-b-2 px-1 py-1.5 text-sm font-medium transition-colors duration-200 md:text-[15px] ${
                pathname.startsWith("/admin")
                  ? "nav-link-active border-amber-800 !text-amber-900"
                  : "border-transparent !text-amber-900 hover:!text-amber-950"
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
          className="border-t border-slate-200 bg-white md:hidden"
        >
          <nav aria-label="Primary mobile" className="mx-auto flex max-w-[1600px] flex-col px-3 py-2">
            {navItems.map((item) => renderNavLink(item, true))}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {renderNavLink(accountNav, true, { inlineRow: true, accountExtras: true })}
              <span className="select-none text-slate-400" aria-hidden="true">
                |
              </span>
              {renderNavLink(projectsNav, true, { inlineRow: true })}
            </div>
            {supabaseReady && isAuthenticated && isSubscriptionAdmin && !subscriptionLoading ? (
              <Link
                href="/admin"
                className={`block border-l-2 px-3 py-2 text-sm font-medium transition-colors duration-200 sm:py-2.5 sm:text-base ${
                  pathname.startsWith("/admin")
                    ? "nav-link-active border-amber-800 !text-amber-900"
                    : "border-transparent !text-amber-900 hover:!text-amber-950"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                Admin
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
      <StrataStrip />
    </header>
  );
}


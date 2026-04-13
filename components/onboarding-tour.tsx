"use client";

import { Joyride, STATUS, type Step } from "react-joyride";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "onboardingTourSeen:v1";

type JoyrideCallbackData = { status?: string | null } & Record<string, unknown>;
const JoyrideCompat = Joyride as unknown as ComponentType<Record<string, unknown>>;

function markTourSeen() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore
  }
}

function GoldBeacon() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 22,
        height: 22,
        marginTop: 6,
        borderRadius: 9999,
        background: "radial-gradient(circle at 30% 30%, #fef3c7 0%, #f59e0b 45%, #b45309 100%)",
        boxShadow: "0 0 0 3px rgba(245, 158, 11, 0.25), 0 10px 22px rgba(2, 6, 23, 0.25)",
        position: "relative",
        cursor: "pointer",
        animation: "gih-beacon-bob 1.2s ease-in-out infinite",
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: -10,
          borderRadius: 9999,
          background: "rgba(245, 158, 11, 0.18)",
          filter: "blur(0.5px)",
          animation: "gih-beacon-pulse 1.6s ease-in-out infinite",
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: 6,
          borderRadius: 9999,
          background: "rgba(255, 255, 255, 0.75)",
        }}
      />
    </div>
  );
}

export function OnboardingTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [run, setRun] = useState(false);

  const steps: Step[] = useMemo(
    () => [
      {
        target: '[data-tour="nav-tools"]',
        title: "Tools",
        content: "Calculators and workflows are available here.",
        placement: "bottom",
        disableBeacon: true,
      },
      {
        target: '[data-tour="ai-reporting"]',
        title: "Gold: AI-powered reports",
        content: (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed">
              Create polished, client-ready summaries faster with <span className="font-semibold text-amber-700">Gold</span>.
            </p>
            <button
              type="button"
              className="btn-base btn-md w-full"
              onClick={() => {
                markTourSeen();
                router.push("/signup");
              }}
            >
              Register now and become a free Gold member
            </button>
          </div>
        ),
        placement: "auto",
        disableBeacon: true,
      },
      {
        target: '[data-tour="getting-started-guide"]',
        title: "Getting started guide",
        content: "Open the full guide for the complete workflow.",
        placement: "auto",
        disableBeacon: true,
      },
    ],
    [router],
  );

  useEffect(() => {
    if (pathname !== "/") return;

    let seen = false;
    try {
      seen = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      seen = false;
    }
    if (seen) return;

    const t = window.setTimeout(() => setRun(true), 600);
    return () => window.clearTimeout(t);
  }, [pathname]);

  const handleCallback = (data: JoyrideCallbackData) => {
    const action = typeof data.action === "string" ? data.action : undefined;
    const finished = data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED;
    const closed = action === "close";
    if (!finished && !closed) return;

    markTourSeen();
    setRun(false);
  };

  if (pathname !== "/") return null;

  const joyrideProps: Record<string, unknown> = {
    steps,
    run,
    continuous: true,
    scrollToFirstStep: true,
    scrollOffset: 160,
    scrollDuration: 650,
    spotlightPadding: 10,
    showProgress: true,
    showSkipButton: true,
    disableOverlayClose: true,
    callback: handleCallback,
    beaconComponent: GoldBeacon,
    floaterProps: {
      styles: {
        floater: { filter: "drop-shadow(0 18px 42px rgba(2, 6, 23, 0.35))" },
      },
      options: {
        preventOverflow: { padding: 10 },
        flip: true,
      },
    },
    styles: {
      options: {
        zIndex: 10000,
        arrowColor: "#ffffff",
        backgroundColor: "#ffffff",
        textColor: "#0f172a",
        primaryColor: "#d97706",
      },
      beaconInner: {
        backgroundColor: "transparent",
      },
      beaconOuter: {
        backgroundColor: "transparent",
        border: "none",
      },
      overlay: {
        backgroundColor: "rgba(2, 6, 23, 0.62)",
      },
      tooltipContainer: {
        textAlign: "left",
        padding: "14px 14px 10px",
      },
      tooltip: {
        borderRadius: 18,
        boxShadow: "0 28px 70px rgba(2, 6, 23, 0.42)",
        border: "1px solid rgba(245, 158, 11, 0.28)",
      },
      tooltipTitle: {
        fontWeight: 850,
        fontSize: 16,
      },
      buttonNext: {
        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 55%, #b45309 100%)",
        borderRadius: 14,
        padding: "10px 14px",
        fontWeight: 800,
      },
      buttonBack: {
        color: "#0f172a",
        fontWeight: 800,
      },
      buttonSkip: {
        color: "#475569",
        fontWeight: 800,
      },
      buttonClose: {
        color: "#334155",
      },
    },
    locale: {
      back: "Back",
      close: "Close",
      last: "Done",
      next: "Next",
      skip: "Skip",
    },
  };

  return (
    <>
      <style>{`
        @keyframes gih-beacon-pulse {
          0% { transform: scale(0.85); opacity: 0.45; }
          50% { transform: scale(1.15); opacity: 0.22; }
          100% { transform: scale(0.85); opacity: 0.45; }
        }
        @keyframes gih-beacon-bob {
          0% { transform: translateY(0); }
          50% { transform: translateY(3px); }
          100% { transform: translateY(0); }
        }
      `}</style>
      <JoyrideCompat {...joyrideProps} />
    </>
  );
}


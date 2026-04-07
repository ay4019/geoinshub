"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

interface SavedBoreholesPreviewProps {
  compact?: boolean;
}

export function SavedBoreholesPreview({ compact = false }: SavedBoreholesPreviewProps) {
  const supabaseReady = useMemo(() => isSupabaseConfigured(), []);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedBorehole, setSelectedBorehole] = useState("bh-01");

  useEffect(() => {
    if (!supabaseReady) {
      setIsAuthenticated(false);
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
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className={`${compact ? "text-lg" : "text-xl"} font-semibold text-slate-900`}>Saved Boreholes</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Preview of the planned shared borehole workflow across tools.
          </p>
        </div>
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          Preview Mode
        </span>
      </div>

      {isAuthenticated ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <div>
            <label htmlFor="saved-bh-select" className="mb-1 block text-sm font-medium text-slate-700">
              Select saved borehole
            </label>
            <select
              id="saved-bh-select"
              value={selectedBorehole}
              onChange={(event) => setSelectedBorehole(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-slate-500"
            >
              <option value="bh-01">BH-01 - Central Line</option>
              <option value="bh-02">BH-02 - Embankment Toe</option>
              <option value="bh-03">BH-03 - Bridge Approach</option>
            </select>
          </div>
          <button type="button" className="btn-base btn-md">
            Load
          </button>
          <button type="button" className="btn-base btn-md">
            Save Current
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Create an account to use saved boreholes.
          <Link href="/account" className="ml-1 font-semibold underline underline-offset-4">
            Register or log in
          </Link>
        </div>
      )}
    </section>
  );
}


"use client";

import { useEffect } from "react";

import { registerVisitAction } from "@/app/actions/analytics";

export function VisitTracker() {
  useEffect(() => {
    void registerVisitAction();
  }, []);

  return null;
}

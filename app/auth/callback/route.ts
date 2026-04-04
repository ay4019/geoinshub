import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get("next") ?? "/account";
  const redirectUrl = new URL(next, requestUrl.origin);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createSupabaseServerClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else if (tokenHash && type) {
    await supabase.auth.verifyOtp({
      type: type as "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email",
      token_hash: tokenHash,
    });
  }

  return NextResponse.redirect(redirectUrl);
}

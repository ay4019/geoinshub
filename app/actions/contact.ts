"use server";

import { cookies } from "next/headers";
import { Resend } from "resend";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface ContactMessagePayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  company?: string;
}

export interface ContactMessageResult {
  ok: boolean;
  message: string;
}

const CONTACT_COOLDOWN_COOKIE = "gih_contact_cooldown";
const CONTACT_COOLDOWN_SECONDS = 90;
const CONTACT_MAX_PER_HOUR = 3;

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendContactMessageAction(payload: ContactMessagePayload): Promise<ContactMessageResult> {
  const company = payload.company?.trim() ?? "";
  const name = payload.name.trim();
  const email = payload.email.trim();
  const subject = payload.subject.trim();
  const message = payload.message.trim();

  if (company) {
    return { ok: true, message: "Your message has been sent successfully." };
  }

  if (name.length < 2) {
    return { ok: false, message: "Name is required." };
  }

  if (!isLikelyEmail(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  if (!subject) {
    return { ok: false, message: "Subject is required." };
  }

  if (message.length < 10) {
    return { ok: false, message: "Message should be at least 10 characters." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;
  const toEmail = process.env.CONTACT_TO_EMAIL;

  if (!apiKey || !fromEmail || !toEmail) {
    return {
      ok: false,
      message: "Contact email is not configured. Please set RESEND_API_KEY, CONTACT_FROM_EMAIL, and CONTACT_TO_EMAIL.",
    };
  }

  try {
    const cookieStore = await cookies();
    if (cookieStore.get(CONTACT_COOLDOWN_COOKIE)?.value === "1") {
      return {
        ok: false,
        message: "Please wait a moment before sending another message.",
      };
    }

    try {
      const admin = createSupabaseAdminClient();
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("contact_message_logs")
        .select("id", { count: "exact", head: true })
        .eq("email", email.toLowerCase())
        .gte("created_at", since);

      if ((count ?? 0) >= CONTACT_MAX_PER_HOUR) {
        return {
          ok: false,
          message: "Too many messages were sent from this email recently. Please try again in about an hour.",
        };
      }
    } catch {
      // Continue with cookie throttling when contact logs are not available yet.
    }

    const resend = new Resend(apiKey);

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: email,
      subject: `[Geotechnical Insights Hub] ${subject}`,
      text: [
        "New message from Start the Conversation form",
        `Name: ${name}`,
        `Email: ${email}`,
        `Subject: ${subject}`,
        "",
        message,
      ].join("\n"),
      html: `
        <h2>New message from Start the Conversation form</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <p><strong>Message:</strong><br/>${safeMessage}</p>
      `,
    });

    if (error) {
      return { ok: false, message: "Message could not be sent. Please try again." };
    }

    cookieStore.set(CONTACT_COOLDOWN_COOKIE, "1", {
      httpOnly: true,
      maxAge: CONTACT_COOLDOWN_SECONDS,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    try {
      const admin = createSupabaseAdminClient();
      await admin.from("contact_message_logs").insert({
        email: email.toLowerCase(),
        subject,
        status: "sent",
      });
    } catch {
      // Best-effort logging only.
    }

    return { ok: true, message: "Your message has been sent successfully." };
  } catch {
    return { ok: false, message: "Message could not be sent. Please try again." };
  }
}

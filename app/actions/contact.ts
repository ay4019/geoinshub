"use server";

import { Resend } from "resend";

export interface ContactMessagePayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactMessageResult {
  ok: boolean;
  message: string;
}

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
  const name = payload.name.trim();
  const email = payload.email.trim();
  const subject = payload.subject.trim();
  const message = payload.message.trim();

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
      message: "Contact email is not configured yet. Please set RESEND_API_KEY, CONTACT_FROM_EMAIL, and CONTACT_TO_EMAIL.",
    };
  }

  try {
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

    return { ok: true, message: "Your message has been sent successfully." };
  } catch {
    return { ok: false, message: "Message could not be sent. Please try again." };
  }
}


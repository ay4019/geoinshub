"use client";

import { useState, useTransition } from "react";

import { subscribeNewsletterAction } from "@/app/actions/analytics";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const response = await subscribeNewsletterAction(email);
      if (response.ok) {
        setMessage("You're subscribed. We'll use this address for product and content updates.");
        setEmail("");
      } else {
        setMessage("Please enter a valid email address.");
      }
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]"
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Become a Member</h2>
        <p className="text-sm leading-6 text-slate-600">
          Subscribe to stay informed about new tools, blog posts, and future content published on the hub.
        </p>
      </div>

      <div>
        <label htmlFor="newsletter-email" className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:border-slate-500"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="btn-base btn-md"
      >
        {isPending ? "Subscribing..." : "Subscribe"}
      </button>

      {message ? <p className="text-sm leading-6 text-slate-700">{message}</p> : null}
    </form>
  );
}

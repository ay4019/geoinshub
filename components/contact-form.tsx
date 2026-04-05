"use client";

import { useState } from "react";

import { sendContactMessageAction } from "@/app/actions/contact";

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const initialState: FormState = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export function ContactForm() {
  const [values, setValues] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusOk, setStatusOk] = useState(false);

  const validate = (): Partial<FormState> => {
    const nextErrors: Partial<FormState> = {};

    if (!values.name.trim()) {
      nextErrors.name = "Name is required.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      nextErrors.email = "Enter a valid email.";
    }

    if (!values.subject.trim()) {
      nextErrors.subject = "Subject is required.";
    }

    if (values.message.trim().length < 10) {
      nextErrors.message = "Message should be at least 10 characters.";
    }

    return nextErrors;
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setIsPending(true);
    try {
      const result = await sendContactMessageAction(values);
      setStatusOk(result.ok);
      setStatusMessage(result.message);

      if (result.ok) {
        setValues(initialState);
      }
    } catch {
      setStatusOk(false);
      setStatusMessage("Message could not be sent. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] sm:p-7"
    >
      <h2 className="text-2xl font-semibold text-slate-900">Start the Conversation</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1 block text-sm font-medium text-slate-700">
            Full Name
          </label>
          <input
            id="contact-name"
            type="text"
            value={values.name}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Your name and surname"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:border-slate-500"
          />
          {errors.name ? <p className="mt-1 text-xs text-red-700">{errors.name}</p> : null}
        </div>

        <div>
          <label htmlFor="contact-email" className="mb-1 block text-sm font-medium text-slate-700">
            Email Address
          </label>
          <input
            id="contact-email"
            type="email"
            value={values.email}
            onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:border-slate-500"
          />
          {errors.email ? <p className="mt-1 text-xs text-red-700">{errors.email}</p> : null}
        </div>
      </div>

      <div>
        <label htmlFor="contact-subject" className="mb-1 block text-sm font-medium text-slate-700">
          Subject
        </label>
        <input
          id="contact-subject"
          type="text"
          value={values.subject}
          onChange={(event) => setValues((prev) => ({ ...prev, subject: event.target.value }))}
          className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:border-slate-500"
        />
        {errors.subject ? <p className="mt-1 text-xs text-red-700">{errors.subject}</p> : null}
      </div>

      <div>
        <label htmlFor="contact-message" className="mb-1 block text-sm font-medium text-slate-700">
          Content
        </label>
        <textarea
          id="contact-message"
          value={values.message}
          onChange={(event) => setValues((prev) => ({ ...prev, message: event.target.value }))}
          rows={5}
          className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:border-slate-500"
        />
        {errors.message ? <p className="mt-1 text-xs text-red-700">{errors.message}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="btn-base btn-md"
        >
          {isPending ? "Sending..." : "Submit"}
        </button>
      </div>

      {statusMessage ? (
        <p
          className={`rounded-xl border px-3.5 py-3 text-sm ${
            statusOk ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {statusMessage}
        </p>
      ) : null}
    </form>
  );
}

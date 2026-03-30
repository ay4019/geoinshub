import type { Metadata } from "next";
import Link from "next/link";

import { ContactForm } from "@/components/contact-form";
import { NewsletterForm } from "@/components/newsletter-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Geotechnical Insights Hub and subscribe for new insights and tools.",
};

function EducationIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 18.5V6.5L12 3L20 6.5V18.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 9L12 12.5L20 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 12.5V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21C15.5 16.8 19 13.8 19 9.5C19 5.91 15.87 3 12 3C8.13 3 5 5.91 5 9.5C5 13.8 8.5 16.8 12 21Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7.5L12 13L20 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 19C6.5 15.9 9 14.5 12 14.5C15 14.5 17.5 15.9 19 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 8.25C8 8.11 8.11 8 8.25 8H8.75C8.89 8 9 8.11 9 8.25V8.75C9 8.89 8.89 9 8.75 9H8.25C8.11 9 8 8.89 8 8.75V8.25Z" fill="currentColor" />
      <path d="M12 16V12.75C12 11.78 12.78 11 13.75 11C14.72 11 15.5 11.78 15.5 12.75V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 11V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-10 px-4 py-10 sm:px-6 sm:py-12">
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Contact</h1>
        <p className="text-sm leading-6 text-slate-600 sm:text-base">
          Reach out with collaboration ideas, educational feedback, or suggested improvements for future tool releases.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <ContactForm />
        <NewsletterForm />
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] sm:p-7">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-900">Personal Information</h2>
            <div className="flex items-center gap-3 text-slate-500">
              <PersonIcon />
              <p className="text-2xl font-semibold text-slate-900">Arifcan Yılmaz</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-slate-700">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 text-slate-500">
                <EducationIcon />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-slate-500">Education</p>
                <div className="space-y-1 text-base font-semibold text-slate-900">
                  <p>Heriot-Watt University (PhD)</p>
                  <p>University of Southampton (MSc)</p>
                  <p>Yıldız Technical University (BSc)</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-0.5 text-slate-500">
                <LocationIcon />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-slate-500">Address</p>
                <p className="text-base font-semibold text-slate-900">Edinburgh, UK</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-0.5 text-slate-500">
                <MailIcon />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-slate-500">CV</p>
                <Link
                  href="/cv.pdf"
                  className="inline-flex text-base font-semibold text-slate-900 transition-colors hover:text-slate-700"
                >
                  Download CV
                </Link>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-0.5 text-slate-500">
                <LinkedInIcon />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-slate-500">LinkedIn</p>
                <a
                  href="https://www.linkedin.com/in/arifcan-yilmaz/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-base font-semibold text-slate-900 transition-colors hover:text-slate-700"
                >
                  linkedin.com/in/arifcan-yilmaz/
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}



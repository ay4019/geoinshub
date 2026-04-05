import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Account creation is handled on the Account page.",
};

export default function SignUpPage() {
  redirect("/account");
}

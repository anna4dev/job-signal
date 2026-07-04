import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile | JobSignal",
  robots: { index: false, follow: false },
  alternates: { canonical: "/profile" },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

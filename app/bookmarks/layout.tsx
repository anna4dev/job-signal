import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bookmarks | JobSignal",
  robots: { index: false, follow: false },
  alternates: { canonical: "/bookmarks" },
};

export default function BookmarksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

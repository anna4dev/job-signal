"use client";

import { Suspense } from "react";
import BookmarksContent from "./BookmarksContent";

export default function BookmarksPage() {
  return (
    <Suspense fallback={null}>
      <BookmarksContent />
    </Suspense>
  );
}

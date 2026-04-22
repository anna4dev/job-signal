import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { bookmarks, page = 1, pageSize = 10 } = await req.json();

    if (!bookmarks || !Array.isArray(bookmarks) || bookmarks.length === 0) {
      return NextResponse.json({ jobs: [], totalPages: 0 });
    }

    const totalItems = bookmarks.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const offset = (page - 1) * pageSize;

    const pageBookmarks = bookmarks.slice(offset, offset + pageSize);
    const pageIds = pageBookmarks.map((item) => item.job_id);

    const placeholders = pageIds.map(() => "?").join(",");
    const orderByCase = pageIds
      .map((_, index) => `WHEN j.job_id = ? THEN ${index}`)
      .join(" ");

    const result = await db.execute({
      sql: `
        SELECT j.*, c.company_name
        FROM jobs_structured j
        JOIN company_structured c ON j.company_id = c.company_id
        WHERE j.job_id IN (${placeholders})
        ORDER BY CASE ${orderByCase} END
      `,
      args: [...pageIds, ...pageIds],
    });

    const jobsWithTimestamp = result.rows.map((row) => {
      const bookmark = pageBookmarks.find((b) => b.job_id === row.job_id);
      return {
        ...row,
        bookmarked_at: bookmark ? bookmark.created_at : null,
        // undefined = user has not explicitly set a status (not the same as 'Saved')
        bookmark_status: bookmark?.status,
      };
    });

    return NextResponse.json({
      jobs: jobsWithTimestamp,
      totalPages,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

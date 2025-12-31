import { db } from '@/lib/db';
import JobCard from '@/components/JobCard';
import FilterBar from '@/components/FilterBar';
import { JobWithCompany } from '@/types/job';
import Pagination from '@/components/Pagination';

type QueryParam = string | number | null;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  // 1. 处理筛选逻辑 (Server-side)
  const sParams = await searchParams;
  const currentPage = Number(sParams.page) || 1;
  const pageSize = 10;
  const offset = (currentPage - 1) * pageSize;

  const searchQuery = sParams.q || '';
  const isRemote = sParams.remote === 'true';
  const hasVisa = sParams.visa === 'true';

  // 2. 构建基础过滤条件
  let whereClause = `WHERE (j.role_title LIKE ? OR c.company_name LIKE ?)`;
  const params: QueryParam[] = [`%${searchQuery}%`, `%${searchQuery}%`];

  if (isRemote) {
    whereClause += ` AND j.location_remote = ?`;
    params.push(1);
  }
  if (hasVisa) {
    whereClause += ` AND j.location_visa_supported = ?`;
    params.push(1);
  }

  // 3. 获取总数以计算页数
  const countResult = db.prepare(`
    SELECT COUNT(*) as total 
    FROM jobs_structured j
    JOIN company_structured c ON j.company_id = c.company_id
    ${whereClause}
  `).get(...params) as { total: number };

  const totalPages = Math.ceil(countResult.total / pageSize);

  // 4. 获取分页数据
  const jobs = db.prepare(`
    SELECT j.*, c.company_name, c.tech_stack, c.industry, c.size, r.fetched_at
    FROM jobs_structured j
    JOIN company_structured c ON j.company_id = c.company_id
    JOIN jobs_raw r ON r.id = j.job_raw_id
    ${whereClause}
    ORDER BY j.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset) as JobWithCompany[];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Hacker News Jobs Explorer</h1>
        <p className="text-gray-500 mt-2">结构化呈现 HN Who&apos;s Hiring 招聘信息</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 左侧筛选栏 */}
        <aside className="lg:col-span-1">
          <FilterBar />
        </aside>

        {/* 职位列表 */}
        <main className="lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
            <span>找到 {jobs.length} 个相关职位</span>
          </div>
          
          {jobs.map((job: JobWithCompany) => (
            <JobCard key={job.job_id} job={job} />
          ))}

          {/* 5. 分页控制器 */}
            {totalPages > 1 && (
            <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
            />
            )}

          {jobs.length === 0 && (
            <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed">
              <p className="text-gray-400">没有找到匹配的职位，换个筛选条件试试？</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
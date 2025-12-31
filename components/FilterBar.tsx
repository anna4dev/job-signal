'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 统一更新 URL 参数的方法
  const updateFilters = (updates: Record<string, string | boolean | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === false || value === '') {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    // 重置到第一页
    params.delete('page');
    router.push(`/jobs?${params.toString()}`);
  };

  const currentDays = searchParams.get('days') || '';
  const currentLevel = searchParams.get('level') || '';

  return (
    <div className="space-y-8 sticky top-24">
      {/* 1. 关键词搜索 */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">搜索职位 / 公司</label>
        <div className="relative">
          <input
            type="text"
            placeholder="例如：Rust, Frontend"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            onChange={(e) => updateFilters({ q: e.target.value })}
            defaultValue={searchParams.get('q') || ''}
          />
        </div>
      </div>

      {/* 2. 发布时间 (新鲜度) */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">发布时间</label>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '全部', value: '' },
            { label: '最近 3 天', value: '3' },
            { label: '最近 7 天', value: '7' },
            { label: '本月', value: '30' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => updateFilters({ days: item.value })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                currentDays === item.value
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. 核心准入门槛 */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">准入门槛</label>
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            checked={searchParams.get('remote') === 'true'}
            onChange={(e) => updateFilters({ remote: e.target.checked })}
          />
          <span className="text-sm text-slate-600 group-hover:text-slate-900">100% Remote</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            checked={searchParams.get('visa') === 'true'}
            onChange={(e) => updateFilters({ visa: e.target.checked })}
          />
          <span className="text-sm text-slate-600 group-hover:text-slate-900">支持签证赞助 (Visa)</span>
        </label>
      </div>

      {/* 4. 职级筛选 */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">职级 (Level)</label>
        <select
          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          value={currentLevel}
          onChange={(e) => updateFilters({ level: e.target.value })}
        >
          <option value="">全部职级</option>
          <option value="junior">Junior / Intern</option>
          <option value="mid">Mid Level</option>
          <option value="senior">Senior</option>
          <option value="staff">Staff / Principal</option>
        </select>
      </div>

      {/* 5. 薪资门槛 */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">最低年薪 (USD)</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="300000"
            step="10000"
            className="flex-1 accent-blue-600"
            value={searchParams.get('min_salary') || '0'}
            onChange={(e) => updateFilters({ min_salary: e.target.value })}
          />
          <span className="text-xs font-mono font-bold text-slate-600 w-12 text-right">
            ${Math.round(Number(searchParams.get('min_salary') || 0) / 1000)}k
          </span>
        </div>
      </div>

      {/* 6. 一键清除 */}
      {(searchParams.toString() !== '' && searchParams.toString() !== 'page=1') && (
        <button
          onClick={() => router.push('/jobs')}
          className="w-full py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all"
        >
          清除所有筛选
        </button>
      )}
    </div>
  );
}
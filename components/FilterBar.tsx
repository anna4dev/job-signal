'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, String(value));
    } else {
      params.delete(key);
    }
    router.push(`/jobs?${params.toString()}`);
  };

  return (
    <div className="space-y-6 sticky top-8">
      <div>
        <label className="block text-sm font-semibold mb-2">搜索职位/公司</label>
        <input
          type="text"
          placeholder="e.g. Rust Engineer"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          onChange={(e) => updateFilter('q', e.target.value)}
          defaultValue={searchParams.get('q') || ''}
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-semibold">快速筛选</label>
        
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            className="w-4 h-4 rounded text-blue-600"
            checked={searchParams.get('remote') === 'true'}
            onChange={(e) => updateFilter('remote', e.target.checked)}
          />
          <span className="text-sm text-gray-600 group-hover:text-gray-900">只看远程职位 (Remote)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            className="w-4 h-4 rounded text-blue-600"
            checked={searchParams.get('visa') === 'true'}
            onChange={(e) => updateFilter('visa', e.target.checked)}
          />
          <span className="text-sm text-gray-600 group-hover:text-gray-900">支持签证 (Visa)</span>
        </label>
      </div>

      <div className="pt-6 border-t">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">数据置信度说明</h4>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          所有数据由 LLM 结构化提取。High 代表关键字段完整且逻辑一致。
        </p>
      </div>
    </div>
  );
}
export interface SavedSearchItem {
  id: string;
  name: string;
  filters: Record<string, string>; // 对应 Object.fromEntries(searchParams) 的结果
  createdAt: string;
}

import Database from "better-sqlite3";
import path from "path";

// 假设你的 sqlite 文件在根目录
const dbPath = path.join(process.cwd(), "data/jobs.sqlite");
export const db = new Database(dbPath);

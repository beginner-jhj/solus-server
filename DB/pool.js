import "dotenv/config";
import { createPool } from "mysql2/promise";

export const pool = createPool({
  host: "localhost",
  user: "jhj",
  password: process.env.DB_PW,
  database: process.env.DB_NAME,
});
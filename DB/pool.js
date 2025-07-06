import "dotenv/config";
import { createPool } from "mysql2/promise";

export const pool = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PW,
  database: process.env.DB_NAME,
});
// src/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const sql = postgres("postgresql://neondb_owner:npg_Bl9Ro4DtcKNO@ep-polished-star-a53td37l-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require");  // Using DATABASE_URL directly from environment

const db = drizzle(sql);

export default db;

import dotenv from 'dotenv';
import pino from 'pino';

// Load environment variables
dotenv.config();

export const config = {
    PORT: process.env.WORKER_PORT || 3002,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
};

// Check for missing credentials
if (!config.SUPABASE_URL || !config.SUPABASE_KEY || !config.DEEPSEEK_API_KEY) {
    console.error("CRITICAL ERROR: SUPABASE or DEEPSEEK credentials missing in .env");
    process.exit(1);
}

// Global Logger setup
export const logger = pino({
    level: 'info'
});

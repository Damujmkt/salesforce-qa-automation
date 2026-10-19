import 'dotenv/config';
export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value)
    throw new Error(`Missing ${name}; configure your local .env file.`);
  return value;
}
export function envOr(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

import 'server-only';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z
    .string({ error: 'DATABASE_URL is not set' })
    .trim()
    .min(1, { error: 'DATABASE_URL is not set' })
    .refine((url) => /^postgres(ql)?:\/\//.test(url), { error: 'DATABASE_URL must start with postgresql://' }),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type ServerEnv = z.infer<typeof schema>;

/** Validate server configuration and fail with one clear message per problem. */
export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => issue.message).join('; '));
  }
  return result.data;
}

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}

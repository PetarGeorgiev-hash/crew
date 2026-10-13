import { z } from 'zod';

export const envSchema = z
  .object({
    //api
    PORT: z.coerce.number().int().positive().default(3000),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),

    //db
    DATABASE_URL: z.string(),

    //Auth
    ACCESS_TOKEN_SECRET: z.string(),
    ACCESS_TOKEN_EXPIRES_IN: z.string(),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CALLBACK_URL: z.string().optional(),

    REFRESH_TOKEN_SECRET: z.string(),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive(),
    // mail
    MAIL_DRIVER: z.enum(['console', 'resend']),
    EMAIL_CODE_SECRET: z.string().min(32),
    MAX_ATTEMPTS: z.coerce.number().int().positive(),
    CODE_TTL_MS: z.coerce.number().int().positive(),
    RESEND_COOLDOWN_MS: z.coerce.number().int().positive(),
    RESEND_API_KEY: z.string().optional(),
  })
  .refine((env) => env.MAIL_DRIVER !== 'resend' || !!env.RESEND_API_KEY, {
    message: 'RESEND_API_KEY is required when MAIL_DRIVER=resend',
    path: ['RESEND_API_KEY'],
  })
  .refine(
    (env) => !(env.NODE_ENV === 'production' && env.MAIL_DRIVER === 'console'),
    {
      message: 'MAIL_DRIVER=console is not allowed in production',
      path: ['MAIL_DRIVER'],
    },
  );

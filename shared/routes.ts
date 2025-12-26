import { z } from 'zod';
import { insertMappingSchema, jobs, emails, attachments, uploads, mappings } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  jobs: {
    list: {
      method: 'GET' as const,
      path: '/api/jobs',
      input: z.object({
        status: z.string().optional(),
        limit: z.coerce.number().optional(),
        offset: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof jobs.$inferSelect & { attachment: typeof attachments.$inferSelect }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/jobs/:id',
      responses: {
        200: z.custom<typeof jobs.$inferSelect & { 
          attachment: typeof attachments.$inferSelect,
          uploads: typeof uploads.$inferSelect[],
          logs: string[]
        }>(),
        404: errorSchemas.notFound,
      },
    },
    retry: {
      method: 'POST' as const,
      path: '/api/jobs/:id/retry',
      responses: {
        200: z.custom<typeof jobs.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    selectCandidate: {
      method: 'POST' as const,
      path: '/api/jobs/:id/select-candidate',
      input: z.object({ orderId: z.string() }),
      responses: {
        200: z.custom<typeof jobs.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  mappings: {
    create: {
      method: 'POST' as const,
      path: '/api/mappings',
      input: insertMappingSchema,
      responses: {
        201: z.custom<typeof mappings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/mappings',
      responses: {
        200: z.array(z.custom<typeof mappings.$inferSelect>()),
      },
    },
  },
  stats: {
    get: {
      method: 'GET' as const,
      path: '/api/stats',
      responses: {
        200: z.object({
          jobs: z.record(z.number()),
          emails: z.record(z.number()),
        }),
      },
    },
  },
  uploads: {
    create: {
      method: 'POST' as const,
      path: '/api/uploads',
      responses: {
        201: z.object({
          message: z.string(),
          jobIds: z.array(z.number()),
        }),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

import { z } from 'zod';
import { accessSchema } from '@/lib/plan-access';
export const allowance = z.number().int().min(0).max(10000).nullable();
export const policySchema = z.object({freeWriting:z.number().int().min(0).max(10000),freeSpeaking:z.number().int().min(0).max(10000)}).strict();
export const planSchema = z.object({id:z.uuid().optional(),name:z.string().trim().min(2).max(80),description:z.string().trim().max(400),priceBdt:z.number().int().min(0).max(100000),writingLimit:allowance,speakingLimit:allowance,durationDays:z.number().int().min(1).max(3660),recommended:z.boolean(),access:accessSchema,published:z.boolean()}).strict();

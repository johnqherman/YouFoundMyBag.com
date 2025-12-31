import { z } from 'zod';

export const contactTypeSchema = z.enum([
  'email',
  'sms',
  'signal',
  'whatsapp',
  'telegram',
]);
export const emailSchema = z.string().email().max(254);
export const phoneSchema = z
  .string()
  .min(10)
  .max(20)
  .regex(/^[+]?[\d\s\-().]+$/);

export const telegramSchema = z
  .string()
  .min(5)
  .max(32)
  .regex(/^@[A-Za-z0-9_]{4,31}$/);

export const contactSchema = z
  .object({
    type: contactTypeSchema,
    value: z.string().max(254),
    allow_direct_display: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      if (data.type === 'email')
        return emailSchema.safeParse(data.value).success;
      if (data.type === 'sms') return phoneSchema.safeParse(data.value).success;
      if (data.type === 'telegram')
        return telegramSchema.safeParse(data.value).success;
      return data.value.length >= 3 && data.value.length <= 254;
    },
    { message: 'Invalid contact value for the specified type' }
  );

export const createBagSchema = z.object({
  display_name: z.string().max(30).optional(),
  owner_message: z.string().max(150).optional(),
  contacts: z.array(contactSchema).min(1).max(5),
});

export const sendMessageSchema = z.object({
  from_message: z.string().min(1).max(300).trim(),
  sender_info: z.string().max(30).optional(),
  turnstile_token: z.string().min(1),
});

export const shortIdSchema = z
  .string()
  .length(6)
  .regex(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/);

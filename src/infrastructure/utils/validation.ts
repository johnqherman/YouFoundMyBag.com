import { z } from 'zod';

export const contactTypeSchema = z.enum([
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
  })
  .refine(
    (data) => {
      if (data.type === 'sms') return phoneSchema.safeParse(data.value).success;
      if (data.type === 'telegram')
        return telegramSchema.safeParse(data.value).success;
      return data.value.length >= 3 && data.value.length <= 254;
    },
    { message: 'Invalid contact value for the specified type' }
  );

export const createBagSchema = z.object({
  owner_name: z.string().max(30).optional(),
  bag_name: z.string().max(30).optional(),
  owner_message: z.string().max(150).optional(),
  owner_email: z.string().email().max(254),
  contacts: z.array(contactSchema).min(0).max(5),
});

export const shortIdSchema = z
  .string()
  .length(6)
  .regex(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/);

export const startConversationSchema = z.object({
  finder_message: z.string().min(1).max(1000).trim(),
  finder_email: z.string().email().optional(),
  finder_display_name: z.string().max(30).optional(),
  turnstile_token: z.string().min(1),
});

export const sendReplySchema = z.object({
  conversation_id: z.string().uuid(),
  message_content: z.string().min(1).max(1000).trim(),
});

export const magicLinkSchema = z.object({
  email: z.string().email().max(254),
  conversation_id: z.string().uuid().optional(),
  bag_ids: z.array(z.string().uuid()).optional(),
});

export const verifyMagicLinkSchema = z.object({
  magic_token: z.string().min(32).max(128),
});

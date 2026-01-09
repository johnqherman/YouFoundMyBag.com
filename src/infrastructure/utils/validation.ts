import { z } from 'zod';

export const emailSchema = z.string().email().max(254);

export const contactTypeSchema = z.enum([
  'sms',
  'whatsapp',
  'email',
  'instagram',
  'telegram',
  'signal',
  'other',
]);

export const phoneSchema = z
  .string()
  .min(10)
  .max(20)
  .regex(/^[+]?[\d\s\-().]+$/);

export const telegramSchema = z
  .string()
  .min(4)
  .max(31)
  .regex(/^[A-Za-z0-9_]{4,31}$/);

export const contactSchema = z
  .object({
    type: contactTypeSchema,
    value: z.string().min(1).max(255),
    label: z.string().max(50).optional(),
    is_primary: z.boolean().optional(),
  })
  .refine(
    async (data) => {
      if (data.type === 'sms') return phoneSchema.safeParse(data.value).success;
      if (data.type === 'whatsapp')
        return phoneSchema.safeParse(data.value).success;
      if (data.type === 'email') {
        return emailSchema.safeParse(data.value).success;
      }
      if (data.type === 'instagram')
        return (
          data.value.length >= 1 &&
          data.value.length <= 30 &&
          /^[A-Za-z0-9_.]{1,30}$/.test(data.value)
        );
      if (data.type === 'telegram')
        return telegramSchema.safeParse(data.value).success;
      if (data.type === 'signal')
        return phoneSchema.safeParse(data.value).success;
      return data.value.length >= 1 && data.value.length <= 255;
    },
    { message: 'Invalid contact value for the specified type' }
  );

export const createBagSchema = z
  .object({
    owner_name: z.string().max(30).optional(),
    bag_name: z.string().max(30).optional(),
    owner_message: z.string().max(150).optional(),
    owner_email: emailSchema.optional(),
    contacts: z.array(contactSchema).min(0).max(7).default([]),
    secure_messaging_enabled: z.boolean().optional(),
  })
  .refine(
    (data) => {
      const secureMessaging = data.secure_messaging_enabled !== false;
      if (secureMessaging) {
        return data.owner_email && data.owner_email.length > 0;
      } else {
        return data.contacts && data.contacts.length > 0;
      }
    },
    {
      message:
        'Email required for secure messaging or contact methods required for direct contact',
    }
  );

export const shortIdSchema = z
  .string()
  .length(6)
  .regex(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/);

export const startConversationSchema = z.object({
  finder_message: z.string().min(1).max(300).trim(),
  finder_email: emailSchema.optional(),
  finder_display_name: z.string().max(30).optional(),
  turnstile_token: z.string().min(1),
});

export const sendReplySchema = z.object({
  conversation_id: z.string().uuid(),
  message_content: z.string().min(1).max(300).trim(),
});

export const magicLinkSchema = z.object({
  email: emailSchema,
  conversation_id: z.string().uuid().optional(),
  bag_ids: z.array(z.string().uuid()).optional(),
});

export const verifyMagicLinkSchema = z.object({
  magic_token: z.string().min(32).max(128),
});

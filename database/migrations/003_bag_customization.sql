ALTER TABLE public.bags
ADD COLUMN IF NOT EXISTS tag_color_start VARCHAR(7) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tag_color_end VARCHAR(7) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS show_branding BOOLEAN DEFAULT NULL;

ALTER TABLE public.bags
ADD CONSTRAINT bags_tag_color_start_hex CHECK (
  tag_color_start IS NULL
  OR tag_color_start ~ '^#[0-9a-fA-F]{6}$'
),
ADD CONSTRAINT bags_tag_color_end_hex CHECK (
  tag_color_end IS NULL
  OR tag_color_end ~ '^#[0-9a-fA-F]{6}$'
);

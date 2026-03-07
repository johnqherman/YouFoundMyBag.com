ALTER TABLE bags
DROP CONSTRAINT bags_status_check;

ALTER TABLE bags
ADD CONSTRAINT bags_status_check CHECK (status IN ('active', 'disabled', 'over_limit'));

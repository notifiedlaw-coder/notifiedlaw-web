-- Unread messages now expire 90 days after they were sent (reading one moves it to 30 days after reading).
UPDATE `message` SET `expires_at` = `created_at` + 7776000000 WHERE `read_at` IS NULL AND `expires_at` IS NULL;

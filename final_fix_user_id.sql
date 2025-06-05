-- Fix all user IDs to be consistent
-- Update users.db to have the correct user with ID 1
DELETE FROM users WHERE id = 5;
UPDATE users SET id = 1 WHERE email = 'martin@danglefeet.com';

-- Make sure all sessions use user_id = 1 (as string, since the column seems to be TEXT)
UPDATE chat_sessions SET user_id = '1';
UPDATE chat_messages SET user_id = '1';
UPDATE message_feedback SET user_id = '1';
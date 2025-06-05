-- Force all sessions to user_id 1 (as string since the column is TEXT)
UPDATE chat_sessions SET user_id = '1' WHERE user_id != '1';

-- Show what we have
SELECT 'Sessions by user:' as info;
SELECT user_id, COUNT(*) as count FROM chat_sessions GROUP BY user_id;

SELECT '' as blank;
SELECT 'All sessions:' as info;
SELECT id, user_id, title FROM chat_sessions;
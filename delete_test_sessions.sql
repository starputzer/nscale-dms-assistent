-- Delete the test sessions
DELETE FROM chat_sessions 
WHERE user_id = '5' 
  AND title = 'New Session' 
  AND id IN ('6ec512d9-d6d0-4d64-a4c9-570eb230d165', '6093a153-27e1-42d7-a8f1-4131b933dff5');

-- Show remaining sessions
SELECT id, user_id, title, datetime(created_at, 'unixepoch', 'localtime') as created_time 
FROM chat_sessions 
WHERE user_id = '5' 
ORDER BY created_at DESC;
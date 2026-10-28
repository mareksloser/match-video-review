-- Optional one-off cleanup: remove "viewed" records created by viewer accounts
-- before viewers stopped being tracked. Safe to run repeatedly.
DELETE v FROM player_marker_views v
JOIN users u ON u.id = v.user_id
WHERE u.role <> 'player';

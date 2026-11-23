-- Q1 and Q2. Most frequent read: entries with indicator and author.
SELECT e.title, e.status, i.name AS indicator, u.email AS author
FROM "Entry" e
JOIN "Indicator" i ON i.id = e."indicatorId"
JOIN "User" u ON u.id = e."createdById"
ORDER BY e."createdAt" DESC;

-- Q2. Read across the version relationship.
SELECT e.title AS current_title, v.version, v.data->>'title' AS snapshot_title, v.data->>'status' AS snapshot_status
FROM "Entry" e
JOIN "EntryVersion" v ON v."entryId" = e.id
ORDER BY e.title, v.version;

-- Q3. Denormalized snapshot: version 1 keeps the old title after the live row changed.
SELECT e.title AS live_title, v.version, v.data->>'title' AS stored_snapshot
FROM "Entry" e
JOIN "EntryVersion" v ON v."entryId" = e.id
WHERE e.title = 'Low-power IoT patent'
ORDER BY v.version;

-- Q5. Indexes that support these lookups.
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Expand sonTeslimEdilen length to match app limits (2000 chars).
-- Run this on the target database.
ALTER TABLE dbo.Projects
ALTER COLUMN sonTeslimEdilen NVARCHAR(2000) NULL;

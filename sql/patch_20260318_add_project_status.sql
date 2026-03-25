IF COL_LENGTH(N'dbo.Projects', N'status') IS NULL
BEGIN
  ALTER TABLE dbo.Projects
  ADD status NVARCHAR(50) NULL;
END
GO

UPDATE dbo.Projects
SET status =
  CASE
    WHEN ISNULL(status, N'') <> N'' THEN status
    WHEN yuzde >= 100 AND LOWER(ISNULL(doneType, N'')) = N'done-dev' THEN N'done-dev'
    WHEN yuzde >= 100 THEN N'done'
    WHEN yuzde > 0 THEN N'prog'
    ELSE N'new'
  END
WHERE ISNULL(status, N'') = N'';
GO

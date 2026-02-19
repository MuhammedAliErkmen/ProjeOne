/* =========================================================
   ProjeOneDb - Güncel Şema (server.js ile uyumlu)
   Idempotent: tekrar çalıştırılabilir
   ========================================================= */

-- 1) DB yoksa oluştur
IF DB_ID(N'ProjeOneDb') IS NULL
BEGIN
  CREATE DATABASE ProjeOneDb;
END
GO

USE ProjeOneDb;
GO

/* =========================
   dbo.Users
   ========================= */
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Users (
    username   NVARCHAR(200) NOT NULL,
    [password] NVARCHAR(200) NOT NULL CONSTRAINT DF_Users_Password DEFAULT(N'123'),
    title      NVARCHAR(200) NULL,
    createdAt  DATETIME2(0)  NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT(SYSDATETIME()),
    CONSTRAINT PK_Users PRIMARY KEY (username)
  );
END
GO

/* =========================
   dbo.Projects
   ========================= */
IF OBJECT_ID(N'dbo.Projects', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Projects (
    id              NVARCHAR(100)  NOT NULL,
    ad              NVARCHAR(2000) NOT NULL,
    aciklama        NVARCHAR(2000) NULL,
    yuzde           INT            NOT NULL CONSTRAINT DF_Projects_Yuzde DEFAULT(0),
    sonTeslim       NVARCHAR(2000) NULL,
    sahip           NVARCHAR(2000) NULL,
    alan            NVARCHAR(2000) NULL CONSTRAINT DF_Projects_Alan DEFAULT(N'Genel'),
    [next]          NVARCHAR(2000) NULL,
    parentId        NVARCHAR(100)  NULL,
    baslangicTarihi NVARCHAR(2000) NULL,
    sonTeslimEdilen NVARCHAR(2000) NULL,
    priority        NVARCHAR(2000) NULL CONSTRAINT DF_Projects_Priority DEFAULT(N'Normal'),
    createdAt       DATETIME2(0)   NOT NULL CONSTRAINT DF_Projects_CreatedAt DEFAULT(SYSDATETIME()),
    updatedAt       DATETIME2(0)   NOT NULL CONSTRAINT DF_Projects_UpdatedAt DEFAULT(SYSDATETIME()),
    doneType        NVARCHAR(2000) NULL, -- done | done-dev
    CONSTRAINT PK_Projects PRIMARY KEY (id)
  );

  CREATE INDEX IX_Projects_UpdatedAt ON dbo.Projects(updatedAt DESC);
  CREATE INDEX IX_Projects_ParentId  ON dbo.Projects(parentId);
END
GO

/* =========================
   dbo.Projects - Column length sync (2000 char)
   ========================= */
IF COL_LENGTH(N'dbo.Projects', N'ad') IS NOT NULL AND COL_LENGTH(N'dbo.Projects', N'ad') <> 4000
  ALTER TABLE dbo.Projects ALTER COLUMN ad NVARCHAR(2000) NOT NULL;
IF COL_LENGTH(N'dbo.Projects', N'aciklama') IS NOT NULL AND COL_LENGTH(N'dbo.Projects', N'aciklama') <> 4000
  ALTER TABLE dbo.Projects ALTER COLUMN aciklama NVARCHAR(2000) NULL;
IF COL_LENGTH(N'dbo.Projects', N'sonTeslim') IS NOT NULL AND COL_LENGTH(N'dbo.Projects', N'sonTeslim') <> 4000
  ALTER TABLE dbo.Projects ALTER COLUMN sonTeslim NVARCHAR(2000) NULL;
IF COL_LENGTH(N'dbo.Projects', N'sahip') IS NOT NULL AND COL_LENGTH(N'dbo.Projects', N'sahip') <> 4000
  ALTER TABLE dbo.Projects ALTER COLUMN sahip NVARCHAR(2000) NULL;
IF COL_LENGTH(N'dbo.Projects', N'alan') IS NOT NULL AND COL_LENGTH(N'dbo.Projects', N'alan') <> 4000
  ALTER TABLE dbo.Projects ALTER COLUMN alan NVARCHAR(2000) NULL;
IF COL_LENGTH(N'dbo.Projects', N'next') IS NOT NULL AND COL_LENGTH(N'dbo.Projects', N'next') <> 4000
  ALTER TABLE dbo.Projects ALTER COLUMN [next] NVARCHAR(2000) NULL;
IF COL_LENGTH(N'dbo.Projects', N'baslangicTarihi') IS NOT NULL AND COL_LENGTH(N'dbo.Projects', N'baslangicTarihi') <> 4000
  ALTER TABLE dbo.Projects ALTER COLUMN baslangicTarihi NVARCHAR(2000) NULL;
IF COL_LENGTH(N'dbo.Projects', N'sonTeslimEdilen') IS NOT NULL AND COL_LENGTH(N'dbo.Projects', N'sonTeslimEdilen') <> 4000
  ALTER TABLE dbo.Projects ALTER COLUMN sonTeslimEdilen NVARCHAR(2000) NULL;
IF COL_LENGTH(N'dbo.Projects', N'priority') IS NOT NULL AND COL_LENGTH(N'dbo.Projects', N'priority') <> 4000
  ALTER TABLE dbo.Projects ALTER COLUMN priority NVARCHAR(2000) NULL;
IF COL_LENGTH(N'dbo.Projects', N'doneType') IS NOT NULL AND COL_LENGTH(N'dbo.Projects', N'doneType') <> 4000
  ALTER TABLE dbo.Projects ALTER COLUMN doneType NVARCHAR(2000) NULL;
GO

/* =========================
   dbo.ProjectOwners
   ========================= */
IF OBJECT_ID(N'dbo.ProjectOwners', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ProjectOwners (
    id        INT IDENTITY(1,1) NOT NULL,
    projectId NVARCHAR(100) NOT NULL,
    username  NVARCHAR(200) NOT NULL,
    CONSTRAINT PK_ProjectOwners PRIMARY KEY (id)
  );

  CREATE INDEX IX_ProjectOwners_ProjectId ON dbo.ProjectOwners(projectId);
  CREATE INDEX IX_ProjectOwners_Username  ON dbo.ProjectOwners(username);

  -- aynı projeye aynı user'ı tekrar yazmayı engelle
  CREATE UNIQUE INDEX UX_ProjectOwners_Project_User
    ON dbo.ProjectOwners(projectId, username);
END
GO

/* =========================
   dbo.ProjectFiles
   ========================= */
IF OBJECT_ID(N'dbo.ProjectFiles', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ProjectFiles (
    id         INT IDENTITY(1,1) NOT NULL,
    projectId  NVARCHAR(100) NOT NULL,
    fileName   NVARCHAR(400) NULL,
    filePath   NVARCHAR(1000) NULL,
    uploadedBy NVARCHAR(200) NULL,
    uploadDate DATETIME2(0) NULL,
    CONSTRAINT PK_ProjectFiles PRIMARY KEY (id)
  );

  CREATE INDEX IX_ProjectFiles_ProjectId ON dbo.ProjectFiles(projectId);
END
GO

/* =========================
   dbo.ProjectComments
   ========================= */
IF OBJECT_ID(N'dbo.ProjectComments', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ProjectComments (
    id        INT IDENTITY(1,1) NOT NULL,
    projectId NVARCHAR(100) NOT NULL,
    [text]    NVARCHAR(MAX) NULL,
    author    NVARCHAR(200) NULL,
    [date]    NVARCHAR(50)  NULL,
    CONSTRAINT PK_ProjectComments PRIMARY KEY (id)
  );

  CREATE INDEX IX_ProjectComments_ProjectId ON dbo.ProjectComments(projectId);
END
GO

/* =========================
   dbo.ProjectHistory
   ========================= */
IF OBJECT_ID(N'dbo.ProjectHistory', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ProjectHistory (
    id        INT IDENTITY(1,1) NOT NULL,
    projectId NVARCHAR(100) NOT NULL,
    [action]  NVARCHAR(100) NULL,
    [user]    NVARCHAR(200) NULL,
    [date]    NVARCHAR(50)  NULL,
    details   NVARCHAR(500) NULL,
    CONSTRAINT PK_ProjectHistory PRIMARY KEY (id)
  );

  CREATE INDEX IX_ProjectHistory_ProjectId ON dbo.ProjectHistory(projectId);
END
GO

/* =========================
   2) FK'ler (varsa atla)
   Not: Mevcut verilerde tutarsızlık varsa FK ekleme hata verebilir.
   ========================= */
IF OBJECT_ID(N'dbo.FK_ProjectOwners_Projects', N'F') IS NULL
BEGIN
  ALTER TABLE dbo.ProjectOwners WITH NOCHECK
  ADD CONSTRAINT FK_ProjectOwners_Projects
  FOREIGN KEY (projectId) REFERENCES dbo.Projects(id)
  ON DELETE CASCADE;
END
GO

IF OBJECT_ID(N'dbo.FK_ProjectFiles_Projects', N'F') IS NULL
BEGIN
  ALTER TABLE dbo.ProjectFiles WITH NOCHECK
  ADD CONSTRAINT FK_ProjectFiles_Projects
  FOREIGN KEY (projectId) REFERENCES dbo.Projects(id)
  ON DELETE CASCADE;
END
GO

IF OBJECT_ID(N'dbo.FK_ProjectComments_Projects', N'F') IS NULL
BEGIN
  ALTER TABLE dbo.ProjectComments WITH NOCHECK
  ADD CONSTRAINT FK_ProjectComments_Projects
  FOREIGN KEY (projectId) REFERENCES dbo.Projects(id)
  ON DELETE CASCADE;
END
GO

IF OBJECT_ID(N'dbo.FK_ProjectHistory_Projects', N'F') IS NULL
BEGIN
  ALTER TABLE dbo.ProjectHistory WITH NOCHECK
  ADD CONSTRAINT FK_ProjectHistory_Projects
  FOREIGN KEY (projectId) REFERENCES dbo.Projects(id)
  ON DELETE CASCADE;
END
GO

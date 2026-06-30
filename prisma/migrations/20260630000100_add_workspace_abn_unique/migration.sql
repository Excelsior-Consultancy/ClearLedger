UPDATE "Workspace"
SET "abn" = regexp_replace("abn", '[^0-9]', '', 'g')
WHERE "abn" IS NOT NULL;

CREATE UNIQUE INDEX "Workspace_abn_key" ON "Workspace"("abn");

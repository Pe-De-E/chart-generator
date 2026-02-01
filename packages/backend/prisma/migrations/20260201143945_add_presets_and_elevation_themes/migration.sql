-- CreateTable
CREATE TABLE "chart_presets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elevation_themes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "preview" TEXT NOT NULL,
    "tokens" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "elevation_themes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chart_presets_user_id_idx" ON "chart_presets"("user_id");

-- CreateIndex
CREATE INDEX "elevation_themes_user_id_idx" ON "elevation_themes"("user_id");

-- AddForeignKey
ALTER TABLE "chart_presets" ADD CONSTRAINT "chart_presets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elevation_themes" ADD CONSTRAINT "elevation_themes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

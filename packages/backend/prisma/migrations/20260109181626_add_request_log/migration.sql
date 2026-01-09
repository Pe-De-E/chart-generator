-- CreateTable
CREATE TABLE "request_logs" (
    "id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "user_id" TEXT,
    "user_email" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "response_time" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "request_logs_user_id_idx" ON "request_logs"("user_id");

-- CreateIndex
CREATE INDEX "request_logs_created_at_idx" ON "request_logs"("created_at");

-- CreateIndex
CREATE INDEX "request_logs_status_code_idx" ON "request_logs"("status_code");

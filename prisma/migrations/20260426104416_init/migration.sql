-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PRINCIPAL', 'TEACHER');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('UPLOADED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_slots" (
    "id" SERIAL NOT NULL,
    "subject" TEXT NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_schedule" (
    "id" SERIAL NOT NULL,
    "contentId" INTEGER NOT NULL,
    "slotId" INTEGER NOT NULL,
    "rotationOrder" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "content_status_uploadedById_idx" ON "content"("status", "uploadedById");

-- CreateIndex
CREATE INDEX "content_subject_status_idx" ON "content"("subject", "status");

-- CreateIndex
CREATE INDEX "content_slots_teacherId_subject_idx" ON "content_slots"("teacherId", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "content_slots_subject_teacherId_key" ON "content_slots"("subject", "teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "content_schedule_contentId_key" ON "content_schedule"("contentId");

-- CreateIndex
CREATE INDEX "content_schedule_slotId_idx" ON "content_schedule"("slotId");

-- CreateIndex
CREATE UNIQUE INDEX "content_schedule_slotId_rotationOrder_key" ON "content_schedule"("slotId", "rotationOrder");

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_slots" ADD CONSTRAINT "content_slots_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_schedule" ADD CONSTRAINT "content_schedule_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_schedule" ADD CONSTRAINT "content_schedule_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "content_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

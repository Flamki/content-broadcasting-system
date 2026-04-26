const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function upsertUser({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role },
    create: { name, email, passwordHash, role }
  });
}

async function main() {
  await upsertUser({
    name: "System Principal",
    email: "principal@example.com",
    password: "Principal@123",
    role: "PRINCIPAL"
  });

  await upsertUser({
    name: "Teacher One",
    email: "teacher1@example.com",
    password: "Teacher@123",
    role: "TEACHER"
  });

  await upsertUser({
    name: "Teacher Two",
    email: "teacher2@example.com",
    password: "Teacher@123",
    role: "TEACHER"
  });

  console.log("Seed completed: principal + teacher users are ready.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

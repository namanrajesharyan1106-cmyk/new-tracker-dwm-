import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const employeeId = 'admin';
  const email = 'admin@example.com';
  const password = 'password123';

  // Check if admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { OR: [{ email }, { employeeId }] },
  });

  if (existingAdmin) {
    console.log('Admin user already exists!');
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const admin = await prisma.user.create({
    data: {
      employeeId,
      name: 'Super Admin',
      email,
      mobile: '1234567890',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isApproved: true, 
      designation: 'System Administrator',
    },
  });

  console.log(`Successfully created Super Admin user!`);
  console.log(`Employee ID: ${admin.employeeId}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

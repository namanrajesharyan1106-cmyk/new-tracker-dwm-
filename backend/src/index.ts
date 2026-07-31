import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import prisma from './utils/prismaClient';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    // Attempt to connect to the database
    // await prisma.$connect();
    // console.log('Database connection established successfully.');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

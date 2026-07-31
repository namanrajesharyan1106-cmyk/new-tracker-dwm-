import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../utils/prismaClient';
import { generateToken } from '../utils/jwt';
import { asyncHandler } from '../utils/asyncHandler';

// Token Expiry configuration
const ACCESS_TOKEN_EXPIRES = '15m'; // 15 minutes for access token
const REFRESH_TOKEN_EXPIRES_DAYS = 7; // 7 days for refresh token

const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

const sendTokenResponse = async (user: any, statusCode: number, res: Response) => {
  // Generate Access Token
  const token = generateToken(user);
  
  // Generate Refresh Token
  const refreshToken = generateRefreshToken();
  
  // Save Refresh Token to Database
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken }
  });

  // Setup Cookie Options
  const options = {
    expires: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };

  res.status(statusCode)
    .cookie('refreshToken', refreshToken, options)
    .json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId
      }
    });
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, name, email, mobile, password } = req.body;

  // Check if user exists
  const userExists = await prisma.user.findFirst({
    where: { OR: [{ email }, { employeeId }] },
  });

  if (userExists) {
    res.status(400).json({ success: false, message: 'User already exists' });
    return;
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user - initially pending approval
  const user = await prisma.user.create({
    data: {
      employeeId,
      name,
      email,
      mobile,
      password: hashedPassword,
      role: 'TEAM_MEMBER',
      isApproved: false, // Must be approved by Admin
    },
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful. Waiting for admin approval.',
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, password } = req.body;

  if (!employeeId || !password) {
    res.status(400).json({ success: false, message: 'Please provide employeeId and password' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { employeeId } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  if (!user.isApproved) {
    res.status(403).json({ success: false, message: 'Account pending admin approval' });
    return;
  }

  // Generate tokens and send response
  await sendTokenResponse(user, 200, res);
});

export const logout = asyncHandler(async (req: any, res: Response) => {
  if (req.user) {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null }
    });
  }

  res.cookie('refreshToken', 'none', {
    expires: new Date(Date.now() + 10 * 1000), // Expire in 10 secs
    httpOnly: true,
  });

  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export const getMe = asyncHandler(async (req: any, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, role: true, employeeId: true, isApproved: true },
  });

  res.status(200).json({ success: true, data: user });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    res.status(401).json({ success: false, message: 'No refresh token provided' });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { refreshToken }
  });

  if (!user) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
    return;
  }

  // Optionally rotate the refresh token here, but generating a new access token is enough
  const token = generateToken(user);
  
  res.status(200).json({ success: true, token });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId } = req.body;
  const user = await prisma.user.findUnique({ where: { employeeId } });

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  // Generate a random reset token
  const resetToken = crypto.randomBytes(20).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  await prisma.user.update({
    where: { employeeId },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpire: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    }
  });

  // In production, send this via email. For now, return it for testing.
  res.status(200).json({ 
    success: true, 
    message: 'Reset token generated (mock email sent)',
    resetToken 
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { resetToken, newPassword } = req.body;

  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { gt: new Date() }
    }
  });

  if (!user) {
    res.status(400).json({ success: false, message: 'Invalid or expired token' });
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpire: null
    }
  });

  res.status(200).json({ success: true, message: 'Password reset successful. Please login.' });
});

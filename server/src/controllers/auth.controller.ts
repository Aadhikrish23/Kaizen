import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as authService from '../services/auth.service';
import { SuccessResponse } from '../types/api';

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken, ...data } = await authService.register(req.body);
  setRefreshCookie(res, refreshToken);
  
  const response: SuccessResponse<typeof data> = { success: true, data };
  res.status(201).json(response);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken, ...data } = await authService.login(req.body);
  setRefreshCookie(res, refreshToken);
  
  const response: SuccessResponse<typeof data> = { success: true, data };
  res.json(response);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No refresh token provided' }});
    return;
  }

  const { refreshToken, accessToken } = await authService.refresh(token);
  setRefreshCookie(res, refreshToken);

  res.json({ success: true, data: { accessToken } });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;
  if (token) {
    await authService.logout(token);
  }
  res.clearCookie('refreshToken');
  res.json({ success: true, data: { message: 'Logged out' } });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.mockForgotPassword(req.body.email);
  res.json({ success: true, data: { message: 'If email exists, a reset link was sent' } });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const user = req.user;
  res.json({ success: true, data: { user } });
});

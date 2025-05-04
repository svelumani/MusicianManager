import express from 'express';

// Define the shape of an authenticated user
export interface AuthenticatedUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  profileImage: string | null;
}

// Extend Express Request type to include user property
export interface AuthenticatedRequest extends express.Request {
  user?: AuthenticatedUser;
}

/**
 * Authentication middleware to verify user is logged in
 */
export const isAuthenticated = (
  req: express.Request, 
  res: express.Response, 
  next: express.NextFunction
) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
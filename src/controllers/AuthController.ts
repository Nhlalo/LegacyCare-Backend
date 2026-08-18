import { Request, Response } from "express";
import { AuthService } from "../services/AuthService"; // Add this import

import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "../schemas/auth.schema";
import { validate } from "../middleware/validation";

const isProduction = process.env.NODE_ENV === "production";

export class AuthController {
  constructor(private authService: AuthService) {}

  register = [
    validate(registerSchema),
    async (req: Request<{}, {}, RegisterInput>, res: Response) => {
      try {
        const { email, password, firstName, lastName } = req.body;
        const result = await this.authService.register(
          email,
          password,
          firstName,
          lastName,
        );

        res.status(201).json({
          success: true,
          message:
            "Registration successful. Please check your email to verify your account.",
          data: { user: result.user },
        });
      } catch (error: any) {
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json({
          success: false,
          error: error.message,
        });
      }
    },
  ];

  login = [
    validate(loginSchema),
    async (req: Request<{}, {}, LoginInput>, res: Response) => {
      try {
        const { email, password } = req.body;
        const result = await this.authService.login(email, password);

        this.setRefreshTokenCookie(res, result.refreshToken);

        res.json({
          success: true,
          data: {
            user: result.user,
            accessToken: result.accessToken,
          },
        });
      } catch (error: any) {
        const statusCode = error.statusCode || 401;
        res.status(statusCode).json({
          success: false,
          error: error.message,
        });
      }
    },
  ];

  verifyEmail = [
    validate(verifyEmailSchema),
    async (req: Request<{}, {}, VerifyEmailInput>, res: Response) => {
      try {
        const { token } = req.body;
        await this.authService.verifyEmail(token);

        res.json({
          success: true,
          message: "Email verified successfully. You can now log in.",
        });
      } catch (error: any) {
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json({
          success: false,
          error: error.message,
        });
      }
    },
  ];

  forgotPassword = [
    validate(forgotPasswordSchema),
    async (req: Request<{}, {}, ForgotPasswordInput>, res: Response) => {
      try {
        const { email } = req.body;
        await this.authService.forgotPassword(email);

        res.json({
          success: true,
          message:
            "If an account exists, you will receive a password reset link.",
        });
      } catch (error: any) {
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json({
          success: false,
          error: error.message,
        });
      }
    },
  ];

  resetPassword = [
    validate(resetPasswordSchema),
    async (req: Request<{}, {}, ResetPasswordInput>, res: Response) => {
      try {
        const { token, password } = req.body;
        await this.authService.resetPassword(token, password);

        res.json({
          success: true,
          message: "Password reset successfully. Please log in.",
        });
      } catch (error: any) {
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json({
          success: false,
          error: error.message,
        });
      }
    },
  ];

  refresh = async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: "No refresh token provided",
        });
      }

      const tokens = await this.authService.refreshToken(refreshToken);
      this.setRefreshTokenCookie(res, tokens.refreshToken);

      res.json({
        success: true,
        data: { accessToken: tokens.accessToken },
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 401;
      res.status(statusCode).json({
        success: false,
        error: error.message,
      });
    }
  };

  logout = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (userId) {
        await this.authService.logout(userId);
      }

      this.clearRefreshTokenCookie(res);

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
      });
    }
  };

  private setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie("refreshToken", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: "/",
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: "/",
    });
  }
}

import { Request, Response, NextFunction } from "express";
import logger from "../lib/logger";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  logger.error(
    {
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      path: req.path,
      method: req.method,
    },
    "Unhandled error",
  );

  const isProduction = process.env.NODE_ENV === "production";

  res.status(err.statusCode || 500).json({
    success: false,
    error: isProduction
      ? "Something went wrong. Please try again."
      : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

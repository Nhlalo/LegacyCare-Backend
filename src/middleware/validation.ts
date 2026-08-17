import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError, z } from "zod";
import logger from "../lib/logger";

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.flatten().fieldErrors;

        logger.warn({ errors, path: req.path }, "Validation failed");

        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors,
        });
      }
      next(error);
    }
  };
};

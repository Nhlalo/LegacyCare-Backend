import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

const logger = pino({
  level: isTest ? "silent" : isProduction ? "info" : "debug",

  ...(isDevelopment && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
        singleLine: true,
      },
    },
  }),

  //Production: Structured JSON with metadata
  ...(isProduction && {
    base: {
      environment: "production",
      service: "car-dealership-api",
    },
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  }),

  ...(isTest && {
    level: "silent",
    transport: undefined,
  }),
});

export default logger;

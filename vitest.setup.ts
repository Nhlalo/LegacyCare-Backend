import { vi } from "vitest";
import pino from "pino";

const fetchSpy = vi
  .spyOn(global, "fetch")
  .mockImplementation(
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = input.toString();

      if (url.includes("api.brevo.com")) {
        return new Response(
          JSON.stringify({ messageId: `test-${Date.now()}` }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Mocked response" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    },
  );

const testLogger = pino({
  level: process.env.LOG_LEVEL || "silent",
  transport: undefined,
});

vi.mock("../src/lib/logger", () => ({
  default: testLogger,
  logger: testLogger,
}));

export const cleanup = () => {
  fetchSpy.mockRestore();
};

export { testLogger };

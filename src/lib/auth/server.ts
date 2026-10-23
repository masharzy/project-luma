import "server-only";
import { readSession } from "./session";
export const auth = {
  async getSession() {
    try {
      return { data: await readSession(), error: null };
    } catch {
      return {
        data: null,
        error: { message: "Authentication is temporarily unavailable." },
      };
    }
  },
};

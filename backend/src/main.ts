import "dotenv/config";
import { env } from "./config/env";
import app from "./app";
import { prisma } from "./lib/prisma";

async function main() {
  await prisma.$connect();
  // eslint-disable-next-line no-console
  console.log("Database connected");

  app.listen(env.PORT, "0.0.0.0", () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://0.0.0.0:${env.PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});

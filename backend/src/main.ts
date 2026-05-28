import "dotenv/config";
import app from "./app";
import { prisma } from "./lib/prisma";

const PORT = Number(process.env.PORT) || 4000;

async function main() {
  await prisma.$connect();
  console.log("Database connected");

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

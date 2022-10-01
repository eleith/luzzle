import { PrismaClient } from "./dist/prisma/client";
import type { Prisma } from "./dist/prisma/client";

type PrismaOptions = Prisma.Subset<
  Prisma.PrismaClientOptions,
  Prisma.PrismaClientOptions
>;

let prisma: PrismaClient;

export type { Book, Prisma, PrismaClient } from "./dist/prisma/client";

export default function (options?: PrismaOptions) {
  if (!prisma) {
    prisma = new PrismaClient(options);
  }

  return prisma;
}

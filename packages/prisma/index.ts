import { PrismaClient } from "./prisma/client";
import type { Prisma } from "./prisma/client";

type PrismaOptions = Prisma.Subset<
  Prisma.PrismaClientOptions,
  Prisma.PrismaClientOptions
>;

let prisma: PrismaClient;

function getPrismaClient(options?: PrismaOptions) {
  if (!prisma) {
    prisma = new PrismaClient(options);
  }

  return prisma;
}

export type { Book, Tag, TagMap, Prisma, PrismaClient } from "./prisma/client";
export { getPrismaClient };

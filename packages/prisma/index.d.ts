import { PrismaClient } from "./prisma/client";
import type { Prisma } from "./prisma/client";
declare type PrismaOptions = Prisma.Subset<Prisma.PrismaClientOptions, Prisma.PrismaClientOptions>;
declare function getPrismaClient(options?: PrismaOptions): PrismaClient<Prisma.PrismaClientOptions, never, Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined>;
export type { Book, Prisma, PrismaClient } from "./prisma/client";
export { getPrismaClient };

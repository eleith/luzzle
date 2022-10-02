import { PrismaClient } from "./prisma/client";
let prisma;
function getPrismaClient(options) {
    if (!prisma) {
        prisma = new PrismaClient(options);
    }
    return prisma;
}
export { getPrismaClient };

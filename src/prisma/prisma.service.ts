import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: { url: process.env.DATABASE_URL },
      },
      // Keep connections alive for NeonDB serverless (prevents cold-start P1001)
      log: [],
    });

    // Middleware: auto-retry on P1001 (can't reach DB) and P1002 (timeout) — NeonDB wakes up
    this.$use(async (params, next) => {
      const MAX_RETRIES = 3;
      let attempt = 0;
      while (true) {
        try {
          return await next(params);
        } catch (err: any) {
          attempt++;
          const isRetryable =
            err?.code === 'P1001' || err?.code === 'P1002' || err?.code === 'P1008';
          if (isRetryable && attempt < MAX_RETRIES) {
            const delay = attempt * 1500; // 1.5s, 3s
            this.logger.warn(
              `DB connection error (${err.code}), retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`,
            );
            await new Promise(r => setTimeout(r, delay));
            try { await this.$connect(); } catch { /* ignore reconnect errors */ }
            continue;
          }
          throw err;
        }
      }
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

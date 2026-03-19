import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

function normalizeDatabaseUrl(raw: string): string {
  // Normalize a Neon Postgres URL for Prisma runtime.
  // - If using Neon pooler host, enable PgBouncer mode.
  // - Drop `channel_binding` param (can break some clients).
  // - Ensure `sslmode=require` (Neon requires TLS).
  try {
    const url = new URL(raw);
    const isNeonPooler = url.hostname.includes('-pooler.');

    if (isNeonPooler) url.searchParams.set('pgbouncer', 'true');
    url.searchParams.delete('channel_binding');
    if (!url.searchParams.get('sslmode')) url.searchParams.set('sslmode', 'require');

    return url.toString();
  } catch {
    return raw;
  }
}

// Support projects that only set DIRECT_URL locally.
if (!process.env.DATABASE_URL && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = normalizeDatabaseUrl(process.env.DATABASE_URL);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS
  app.enableCors();

  // Global Prefix
  app.setGlobalPrefix('api/v1');

  // Global Validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('AI Dental Exam API')
    .setDescription('Production MVP API for AI-powered dental education')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();

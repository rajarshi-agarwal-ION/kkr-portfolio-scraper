import { NestFactory } from '@nestjs/core';
import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';

async function bootstrap() {
  // Default to CLI mode; allow HTTP bootstrap via APP_MODE=http for future REST API usage.
  if (process.env.APP_MODE === 'http') {
    const app = await NestFactory.create(AppModule);
    await app.listen(process.env.PORT ?? 3000);
    return;
  }

  await CommandFactory.run(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
}

bootstrap();

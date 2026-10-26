import { ClassSerializerInterceptor, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Swagger UI needs inline styles; a CSP adds little to a JSON-only API.
  app.use(helmet({ contentSecurityPolicy: false }));

  const origins = config.get<string>('CORS_ORIGIN', '*');
  app.enableCors({ origin: origins === '*' ? true : origins.split(',').map((o) => o.trim()) });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  // Applies @Exclude() on entities, so password hashes never leave the API.
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const swagger = new DocumentBuilder()
    .setTitle('Backend Course: Shop API')
    .setDescription('Customers, staff, catalog and orders')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  Logger.log(
    `API on http://localhost:${port}/api/v1, docs on http://localhost:${port}/docs`,
    'Bootstrap',
  );
}

void bootstrap();

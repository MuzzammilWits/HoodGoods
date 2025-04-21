import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import "reflect-metadata";


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.enableCors({
    origin: 'http://localhost:5173', // Your frontend URL
    credentials: true, // This fixes the credentials header issue
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  await app.listen(process.env.PORT ?? 3000);

  console.log(process.env.PORT ?? 3000)
}
bootstrap();

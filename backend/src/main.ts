import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';// new for cart

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  //new for cart
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // Remove non-whitelisted properties
      forbidNonWhitelisted: true, // Throw errors for non-whitelisted properties
      transform: true,        // Automatically transform payloads to DTO instances
    })
  );
  
  app.enableCors({
    origin: 'http://localhost:3000', // Your frontend URL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  // new from cart

  await app.listen(process.env.PORT ?? 3000);

  console.log(process.env.PORT ?? 3000)
}
bootstrap();

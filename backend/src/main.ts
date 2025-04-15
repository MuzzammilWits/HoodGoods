import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NotFoundException } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // ✅ Catch all unknown routes and return a 404 response
  app.use('*', (req, res) => {
    res.status(404).json({
      statusCode: 404,
      message: 'Not Found',
      path: req.originalUrl,
    });
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

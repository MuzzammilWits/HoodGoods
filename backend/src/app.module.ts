// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mssql',
      host: 'hoodgoodsserver.database.windows.net',
      port: 1433,
      username: 'Muzzammil',
      password: 'Password123!',
      database: 'HoodGoodsDB',
      synchronize: false,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      extra: {
        // encrypt: true,
      },
    }),

    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

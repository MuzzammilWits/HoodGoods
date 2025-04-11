import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
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
      synchronize: false, // disable in prod!
      extra: {
        // trustServerCertificate: false,
        // encrypt: true,
      },
      entities: [__dirname + '/**/*.entity{.ts,.js}'], //check this out, for any mishaps in compare to / defining it directly type stuff
    }),
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

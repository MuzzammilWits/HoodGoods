import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { ValidationPipe } from '@nestjs/common';// new for cart
import { ProductsModule } from './products/products.module';
import { StoreModule } from './store/store.module';
import { UploadModule } from './upload/upload.module';
import { PaymentsModule } from './payments/payments.module';
import { OrdersModule } from './orders/orders.module'; // <<< Import the new module
import { ReportingModule } from './reporting/reporting.module'; 
import { RecommendationsModule } from './recommendations/recommendations.module'; // <--- IMPORT HERE


import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        synchronize: false,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        ssl: {
          rejectUnauthorized: false,
        },
      }),
    }),


    AuthModule,
    StoreModule,
    UploadModule, 
    CartModule,
    ProductsModule,
    PaymentsModule, // Add the StoreModule here
    OrdersModule,
    RecommendationsModule,
    ReportingModule

  ],
  

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

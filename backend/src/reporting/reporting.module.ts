// backend/src/reporting/reporting.module.ts
import { Module } from '@nestjs/common';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { AuthModule } from '../auth/auth.module'; // << IMPORT AuthModule
import { SupabaseService } from '../supabase.service'; // Assuming you still use this directly in ReportingService
                                                    // OR if ReportingService also needs TypeORM repositories,
                                                    // you'd import TypeOrmModule.forFeature([...]) here too.

@Module({
  imports: [
    AuthModule, // This makes exported providers from AuthModule (like AuthService) available
                // for injection into components within ReportingModule.
  ],
  controllers: [ReportingController],
  providers: [
    ReportingService,
    SupabaseService, // If ReportingService injects this directly for DB calls
                     // If ReportingService uses TypeORM repositories, it would get them
                     // from TypeOrmModule.forFeature imported above.
                     // For now, let's assume it uses SupabaseService as per earlier examples.
  ],
})
export class ReportingModule {}
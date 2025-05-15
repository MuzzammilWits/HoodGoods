// backend/src/reporting/reporting.controller.ts
import { Controller, Get, UseGuards, Req, Res, Header, Query, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // Use AuthGuard from passport
import { ReportingService } from './reporting.service';
import { AuthService } from '../auth/auth.service'; // << IMPORT AuthService
import { Request as ExpressRequest, Response } from 'express';

// This interface matches what req.user will be from your current JwtStrategy
interface AuthenticatedRequest extends ExpressRequest {
  user: { // This is the Auth0 payload
    sub: string; // Auth0 User ID (this is what you use as Users.userID in your DB)
    // It might contain other Auth0 claims like iss, aud, exp, iat, email, etc.
    [key: string]: any; // Allow other properties
  };
}

@Controller('api/reporting')
@UseGuards(AuthGuard('jwt')) // This uses your JwtStrategy
export class ReportingController {
  constructor(
    private readonly reportingService: ReportingService,
    private readonly authService: AuthService, // << INJECT AuthService
  ) {}

  @Get('seller/sales-trends')
  async getSalesTrendsForSeller(@Req() req: AuthenticatedRequest) {
    const auth0UserId = req.user.sub; // This is the User.userID in your DB

    // Fetch the role from your database using AuthService
    const userRoleData = await this.authService.getUserRole(auth0UserId); // getUserRole expects the Auth0 sub

    if (!userRoleData || userRoleData.role !== 'seller') {
      throw new ForbiddenException("Unauthorized: User is not a seller or role could not be determined.");
    }

    // Now proceed, passing the auth0UserId (which ReportingService.getStoreIdForSeller expects)
    return this.reportingService.getSalesTrendsForSeller(auth0UserId);
  }

  @Get('seller/sales-trends/csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=my_sales_trends.csv')
  async downloadSalesTrendsForSeller(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const auth0UserId = req.user.sub;

    // Fetch the role from your database
    const userRoleData = await this.authService.getUserRole(auth0UserId);

    if (!userRoleData || userRoleData.role !== 'seller') {
      throw new ForbiddenException("Unauthorized: User is not a seller or role could not be determined for CSV export.");
    }

    const data = await this.reportingService.getSalesTrendsForSeller(auth0UserId);
    const csvData = this.reportingService.generateCsvData(data);
    res.send(csvData);
  }
}
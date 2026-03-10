import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class WhatsappApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const configuredKey = process.env.WHATSAPP_API_KEY;
    if (!configuredKey) {
      // If no key is configured, we do not block requests in development.
      // In production you must set WHATSAPP_API_KEY.
      return true;
    }

    const headerKey =
      request.headers['x-api-key'] ??
      request.headers['X-API-KEY'] ??
      request.headers['x-api-key'.toLowerCase()];

    return String(headerKey ?? '') === String(configuredKey);
  }
}


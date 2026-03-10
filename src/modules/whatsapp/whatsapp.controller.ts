import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { SendWhatsappMessageDto } from './dto/send-whatsapp-message.dto';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('status')
  getStatus() {
    try {
      const status = this.whatsappService.getStatus();
      const qr = this.whatsappService.getLatestQr();

      return {
        success: true,
        data: {
          status,
          has_qr: !!qr,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch WhatsApp status',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('send')
  async sendMessage(@Body() body: SendWhatsappMessageDto) {
    try {
      const { phone, message } = body;

      if (!phone) {
        throw new HttpException(
          'Phone number is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!message) {
        throw new HttpException(
          'Message is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.whatsappService.sendMessage(phone, message);

      return {
        success: true,
        message: 'Message sent successfully',
      };
    } catch (error) {
      const errorMessage = (error as Error).message ?? 'Unknown error';

      if (errorMessage === 'WHATSAPP_CLIENT_NOT_INITIALIZED') {
        throw new HttpException(
          {
            success: false,
            message: 'WhatsApp client is not initialized',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (errorMessage === 'WHATSAPP_NOT_READY') {
        throw new HttpException(
          {
            success: false,
            message: 'WhatsApp is not ready. Please scan the QR code first.',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (errorMessage === 'INVALID_PHONE_NUMBER') {
        throw new HttpException(
          {
            success: false,
            message: 'Invalid phone number provided',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (errorMessage === 'WHATSAPP_RATE_LIMITED') {
        throw new HttpException(
          {
            success: false,
            message:
              'Too many WhatsApp messages requested. Please slow down and try again.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (errorMessage === 'WHATSAPP_BUSY') {
        throw new HttpException(
          {
            success: false,
            message:
              'WhatsApp is currently processing other messages. Please try again shortly.',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        {
          success: false,
          message: 'Failed to send WhatsApp message',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}


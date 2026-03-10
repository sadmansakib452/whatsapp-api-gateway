import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappGateway } from './whatsapp.gateway';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappApiKeyGuard } from './guards/whatsapp-api-key.guard';

@Module({
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappGateway, WhatsappApiKeyGuard],
  exports: [WhatsappService],
})
export class WhatsappModule {}


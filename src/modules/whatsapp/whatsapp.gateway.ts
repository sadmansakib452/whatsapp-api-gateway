import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WhatsappService } from './whatsapp.service';

@Injectable()
@WebSocketGateway({
  namespace: 'whatsapp',
  cors: {
    origin: '*',
  },
})
export class WhatsappGateway
  implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WhatsappGateway.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  onModuleInit(): void {
    this.whatsappService.getStatusChanges$().subscribe((status) => {
      this.server.emit('status', { status });
    });

    this.whatsappService.getQrChanges$().subscribe((qr) => {
      this.server.emit('qr', { qr });
    });
  }

  handleConnection(client: Socket): void {
    try {
      const status = this.whatsappService.getStatus();
      client.emit('status', { status });

      const qr = this.whatsappService.getLatestQr();
      if (qr) {
        client.emit('qr', { qr });
      }

      this.logger.log(`Client connected: ${client.id}`);
    } catch (error) {
      this.logger.error('Error during WhatsApp gateway connection', error as Error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }
}


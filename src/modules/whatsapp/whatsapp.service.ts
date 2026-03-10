import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Observable, Subject } from 'rxjs';

// We import lazily to avoid issues if the library is not installed in some environments.
// This keeps construction predictable and errors easier to trace.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Client, LocalAuth } = require('whatsapp-web.js');

export type WhatsappStatus =
  | 'INIT'
  | 'AUTH_REQUIRED'
  | 'QR_AVAILABLE'
  | 'READY'
  | 'DISCONNECTED'
  | 'ERROR';

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);

  private client: any;
  private status: WhatsappStatus = 'INIT';
  private latestQr: string | null = null;

  private readonly statusSubject = new Subject<WhatsappStatus>();
  private readonly qrSubject = new Subject<string>();

  private activeSends = 0;
  private readonly sendTimestamps: number[] = [];
  private readonly MAX_CONCURRENT_SENDS = 3;
  private readonly RATE_LIMIT_WINDOW_MS = 1000;
  private readonly RATE_LIMIT_MAX = 10;

  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Initializing WhatsApp client');

      const sessionPath =
        process.env.WHATSAPP_SESSION_PATH ??
        join(process.cwd(), '.whatsapp-session');

      if (!existsSync(sessionPath)) {
        mkdirSync(sessionPath, { recursive: true });
      }

      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: sessionPath,
        }),
        puppeteer: {
          headless: true,
        },
      });

      this.registerEventHandlers();

      this.status = 'AUTH_REQUIRED';
      this.statusSubject.next(this.status);
      await this.client.initialize();

      this.logger.log('WhatsApp client initialization requested');
    } catch (error) {
      this.status = 'ERROR';
      this.logger.error('Failed to initialize WhatsApp client', error as Error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.client) {
        await this.client.destroy();
      }
    } catch (error) {
      this.logger.error('Error while destroying WhatsApp client', error as Error);
    }
  }

  private registerEventHandlers(): void {
    if (!this.client) {
      this.logger.error('WhatsApp client is not initialized when registering handlers');
      return;
    }

    this.client.on('qr', (qr: string) => {
      this.latestQr = qr;
      this.status = 'QR_AVAILABLE';
      this.qrSubject.next(qr);
      this.statusSubject.next(this.status);
      this.logger.log('WhatsApp QR code received');
    });

    this.client.on('authenticated', () => {
      this.logger.log('WhatsApp authenticated');
    });

    this.client.on('ready', () => {
      this.status = 'READY';
      this.latestQr = null;
      this.statusSubject.next(this.status);
      this.logger.log('WhatsApp client is ready');
    });

    this.client.on('disconnected', (reason: string) => {
      this.status = 'DISCONNECTED';
      this.statusSubject.next(this.status);
      this.logger.warn(`WhatsApp client disconnected: ${reason}`);
    });

    this.client.on('auth_failure', (message: string) => {
      this.status = 'AUTH_REQUIRED';
      this.statusSubject.next(this.status);
      this.logger.error(`WhatsApp authentication failure: ${message}`);
    });

    this.client.on('change_state', (state: string) => {
      this.logger.log(`WhatsApp state changed: ${state}`);
    });

    this.client.on('error', (error: Error) => {
      this.status = 'ERROR';
      this.statusSubject.next(this.status);
      this.logger.error('WhatsApp client error', error);
    });
  }

  getStatus(): WhatsappStatus {
    return this.status;
  }

  getLatestQr(): string | null {
    return this.latestQr;
  }

  getStatusChanges$(): Observable<WhatsappStatus> {
    return this.statusSubject.asObservable();
  }

  getQrChanges$(): Observable<string> {
    return this.qrSubject.asObservable();
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    if (!this.client) {
      this.logger.error('Attempted to send message before WhatsApp client initialization');
      throw new Error('WHATSAPP_CLIENT_NOT_INITIALIZED');
    }

    if (this.status !== 'READY') {
      this.logger.warn(
        `Attempted to send message while WhatsApp status is ${this.status}`,
      );
      throw new Error('WHATSAPP_NOT_READY');
    }

    try {
      this.applyRateLimit();

      if (this.activeSends >= this.MAX_CONCURRENT_SENDS) {
        this.logger.warn(
          `Concurrent send limit reached: ${this.activeSends}/${this.MAX_CONCURRENT_SENDS}`,
        );
        throw new Error('WHATSAPP_BUSY');
      }

      this.activeSends += 1;

      const normalizedPhone = this.normalizePhoneNumber(phone);
      await this.client.sendMessage(normalizedPhone, message);
      this.logger.log(`Message sent to ${normalizedPhone}`);
    } catch (error) {
      this.logger.error('Failed to send WhatsApp message', error as Error);
      throw error;
    } finally {
      if (this.activeSends > 0) {
        this.activeSends -= 1;
      }
    }
  }

  private applyRateLimit(): void {
    const now = Date.now();
    const windowStart = now - this.RATE_LIMIT_WINDOW_MS;

    while (this.sendTimestamps.length > 0 && this.sendTimestamps[0] < windowStart) {
      this.sendTimestamps.shift();
    }

    if (this.sendTimestamps.length >= this.RATE_LIMIT_MAX) {
      this.logger.warn(
        `Rate limit exceeded: ${this.sendTimestamps.length}/${this.RATE_LIMIT_MAX} in ${this.RATE_LIMIT_WINDOW_MS}ms`,
      );
      throw new Error('WHATSAPP_RATE_LIMITED');
    }

    this.sendTimestamps.push(now);
  }

  private normalizePhoneNumber(phone: string): string {
    const trimmed = phone.replace(/\D/g, '');

    if (!trimmed) {
      throw new Error('INVALID_PHONE_NUMBER');
    }

    // This is a minimal placeholder normalization. In a real system,
    // you would apply proper E.164 formatting based on business rules.
    // WhatsApp Web typically expects a country code, so we rely on
    // the caller to provide the correct number format.
    return trimmed;
  }
}


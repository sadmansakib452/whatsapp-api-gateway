import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendWhatsappMessageDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  message: string;
}


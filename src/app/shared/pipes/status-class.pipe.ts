import { Pipe, PipeTransform } from '@angular/core';
import { StatusCobranca } from '../../domain/cobranca/cobranca.model';

@Pipe({ name: 'statusClass', standalone: true })
export class StatusClassPipe implements PipeTransform {
  transform(status: StatusCobranca): string {
    switch (status) {
      case 'paga': return 'positive';
      case 'expirada': return 'warning';
      case 'cancelada': return 'negative';
      default: return 'neutral';
    }
  }
}

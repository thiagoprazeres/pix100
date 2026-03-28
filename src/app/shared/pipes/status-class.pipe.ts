import { Pipe, PipeTransform } from '@angular/core';
import { StatusCobranca } from '../../domain/cobranca/cobranca.model';

@Pipe({ name: 'statusClass', standalone: true })
export class StatusClassPipe implements PipeTransform {
  transform(status: StatusCobranca): string {
    switch (status) {
      case 'paga': return 'badge-success';
      case 'expirada': return 'badge-warning';
      case 'cancelada': return 'badge-error';
      default: return 'badge-ghost';
    }
  }
}

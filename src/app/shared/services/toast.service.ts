import { Injectable } from '@angular/core';

export type ToastColor = 'primary' | 'success' | 'warning' | 'danger';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private container: HTMLDivElement | null = null;

  show(message: string, color: ToastColor = 'primary', duration: number = 3000): void {
    const root = this.ensureContainer();
    const el = document.createElement('div');
    el.className = `toast toast-${color}`;
    el.textContent = message;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast-show'));
    window.setTimeout(() => {
      el.classList.remove('toast-show');
      window.setTimeout(() => el.remove(), 200);
    }, duration);
  }

  private ensureContainer(): HTMLDivElement {
    if (this.container && document.body.contains(this.container)) return this.container;
    const el = document.createElement('div');
    el.className = 'toast-container';
    document.body.appendChild(el);
    this.container = el;
    return el;
  }
}

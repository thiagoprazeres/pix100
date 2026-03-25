import { Component, inject, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PerfilService } from './application/perfil.service';
import { ChavePixService } from './application/chave-pix.service';
import { ThemeService } from './services/theme-service';
import packageJson from '../../package.json';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  perfilService = inject(PerfilService);
  chavePixService = inject(ChavePixService);
  themeService = inject(ThemeService);
  version = packageJson.version;

  deferredPrompt = signal<any>(null);

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(e: Event) {
    e.preventDefault();
    this.deferredPrompt.set(e);
  }

  installPwa() {
    const prompt = this.deferredPrompt();
    if (prompt) {
      prompt.prompt();
      prompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('App instalado!');
        }
        this.deferredPrompt.set(null);
      });
    }
  }
}

import { Component, inject, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PerfilService } from './application/perfil.service';
import { ChavePixService } from './application/chave-pix.service';
import { ThemeService } from './services/theme-service';
import { IonTabBar, IonTabButton, IonBadge, IonLabel, IonButton } from '@ionic/angular/standalone';
import packageJson from '../../package.json';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IonTabBar, IonTabButton, IonBadge, IonLabel, IonButton],
  templateUrl: './app.html',
})
export class App {
  perfilService = inject(PerfilService);
  chavePixService = inject(ChavePixService);
  themeService = inject(ThemeService);
  version = packageJson.version;

  deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(e: Event) {
    e.preventDefault();
    this.deferredPrompt.set(e as BeforeInstallPromptEvent);
  }

  installPwa() {
    const prompt = this.deferredPrompt();
    if (prompt) {
      prompt.prompt();
      prompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('App instalado!');
        }
        this.deferredPrompt.set(null);
      });
    }
  }
}

import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PerfilService } from './services/perfil-service';
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
  themeService = inject(ThemeService);
  version = packageJson.version;
}

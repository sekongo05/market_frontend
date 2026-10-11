import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthPromptComponent } from './shared/components/auth-prompt.component';
import { AuthService } from './core/services/auth.service';
import { WebSocketService } from './core/services/websocket.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AuthPromptComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  title = 'market-frontend';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private authService: AuthService,
    private wsService: WebSocketService
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Si l'utilisateur n'est pas connecté, établir le WebSocket anonyme pour recevoir le stock (/topic/stock)
      if (!this.authService.isAuthenticated()) {
        this.wsService.connect(null, false);
      }
    }
  }
}
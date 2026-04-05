import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthPromptComponent } from './shared/components/auth-prompt.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AuthPromptComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'market-frontend';
}
import { Component, inject } from '@angular/core';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ButtonComponent } from '../../../../shared/ui/atoms/button/button.component';
import { InputFieldComponent } from '../../../../shared/ui/molecules/input-field/input-field.component';

@Component({
  selector: 'app-game-accounts-page',
  standalone: true,
  imports: [InputFieldComponent, ButtonComponent],
  templateUrl: './game-accounts.page.html',
  styleUrl: './game-accounts.page.css'
})
export class GameAccountsPage {
  private readonly languageService = inject(LanguageService);

  characterName = '';
  serverName = '';

  t(key: string): string {
    return this.languageService.t(key);
  }

  onCharacterNameChange(value: string): void {
    this.characterName = value;
  }

  onServerNameChange(value: string): void {
    this.serverName = value;
  }
}

import { Component } from '@angular/core';
import { InputFieldComponent } from '../../../../shared/ui/molecules/input-field/input-field.component';
import {
  MaskButtonComponent,
  type MaskButtonSize
} from '../../../../shared/ui/atoms/mask-button/mask-button.component';
import { ButtonComponent } from '../../../../shared/ui/atoms/button/button.component';
import { Chrome, type LucideIconData } from 'lucide-angular';

type MaskButtonSizeExample = {
  size: MaskButtonSize;
  title: string;
  copy: string;
};

@Component({
  selector: 'app-test2-page',
  standalone: true,
  imports: [MaskButtonComponent, InputFieldComponent, ButtonComponent],
  templateUrl: './test2.page.html',
  styleUrl: './test2.page.css'
})
export class Test2Page {
  readonly googleIcon: LucideIconData = Chrome;

  readonly sizeExamples: MaskButtonSizeExample[] = [
    { size: '2xs', title: '2XS', copy: 'Ultra compacta para labels breves o filtros chicos.' },
    { size: 'xs', title: 'XS', copy: 'Sirve para acciones secundarias densas.' },
    { size: 'sm', title: 'SM', copy: 'Un paso intermedio para barras o subnavs.' },
    { size: 'md', title: 'MD', copy: 'Base equilibrada para uso general.' },
    { size: 'lg', title: 'LG', copy: 'Empieza a sentirse mas protagonista.' },
    { size: 'xl', title: 'XL', copy: 'Buena para tabs anchas o CTAs livianos.' },
    { size: '2xl', title: '2XL', copy: 'Se acerca al gesto visual actual de configuration.' },
    { size: '3xl', title: '3XL', copy: 'Mas teatral, para bloques de navegacion grandes.' },
    { size: '4xl', title: '4XL', copy: 'Ya entra en territorio hero o destacadas.' },
    { size: '5xl', title: '5XL', copy: 'Maxima presencia para ver hasta donde aguanta la mascara.' }
  ];

  emailDefault = '';
  emailGodlike = '';
  emailGodlikePlain = '';
  passwordGodlike = '';
  passwordGodlikePlain = '';
  searchGodlike = 'Lineage';
  searchGodlikePlain = 'Aden Castle';

  onGoogleContinue(variant: string): void {
    // Demo visual para test2: cuando conectemos Firebase, este handler llamara al flujo real.
    console.log(`Google continue click (${variant})`);
  }
}

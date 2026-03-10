import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type AccordionItem = {
  title: string;
  content: string;
};

@Component({
  selector: 'ui-accordion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './accordion.component.html',
  styleUrl: './accordion.component.css'
})
export class AccordionComponent {
  @Input() items: AccordionItem[] = [];
  @Input() defaultOpenIndex = 0;

  openIndex = 0;

  ngOnInit(): void {
    this.openIndex = this.defaultOpenIndex;
  }

  toggle(index: number): void {
    this.openIndex = this.openIndex === index ? -1 : index;
  }

  isOpen(index: number): boolean {
    return this.openIndex === index;
  }
}

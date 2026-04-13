import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  PLATFORM_ID,
  Renderer2,
  inject
} from '@angular/core';

export type ModalSize = 'default' | 'large' | 'small';

@Component({
  selector: 'ui-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent implements AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly renderer = inject(Renderer2);

  private anchorComment: Comment | null = null;
  private originalParent: Node | null = null;
  private movedToBody = false;

  @Input() open = false;
  @Input() title = '';
  @Input() size: ModalSize = 'default';
  @Output() readonly closed = new EventEmitter<void>();

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || this.movedToBody) {
      return;
    }

    const host = this.elementRef.nativeElement;
    const parent = host.parentNode;
    const body = this.document.body;

    if (!parent || !body) {
      return;
    }

    this.anchorComment = this.renderer.createComment('ui-modal-anchor');
    this.originalParent = parent;

    this.renderer.insertBefore(parent, this.anchorComment, host);
    this.renderer.appendChild(body, host);

    this.movedToBody = true;
  }

  ngOnDestroy(): void {
    if (!this.movedToBody) {
      return;
    }

    const host = this.elementRef.nativeElement;

    if (this.originalParent && this.anchorComment && this.anchorComment.parentNode === this.originalParent) {
      this.renderer.insertBefore(this.originalParent, host, this.anchorComment);
      this.renderer.removeChild(this.originalParent, this.anchorComment);
    }

    this.anchorComment = null;
    this.originalParent = null;
    this.movedToBody = false;
  }

  close(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.close();
    }
  }
}

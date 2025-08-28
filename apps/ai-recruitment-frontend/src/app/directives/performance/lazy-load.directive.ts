import { 
  Directive, 
  ElementRef, 
  Input, 
  OnInit, 
  OnDestroy,
  Renderer2,
  Output,
  EventEmitter
} from '@angular/core';

export interface LazyLoadConfig {
  threshold?: number;
  rootMargin?: string;
  placeholder?: string;
  errorImage?: string;
  retryCount?: number;
  retryDelay?: number;
  fadeIn?: boolean;
  preload?: boolean;
}

@Directive({
  selector: '[arcLazyLoad]',
  standalone: true
})
export class LazyLoadDirective implements OnInit, OnDestroy {
  @Input('arcLazyLoad') imageSrc!: string;
  @Input() lazyLoadConfig: LazyLoadConfig = {};
  @Output() loaded = new EventEmitter<void>();
  @Output() error = new EventEmitter<Error>();
  
  private observer: IntersectionObserver | null = null;
  private retryCount = 0;
  private isLoaded = false;
  private placeholderElement: HTMLElement | null = null;
  
  private readonly defaultConfig: LazyLoadConfig = {
    threshold: 0.1,
    rootMargin: '50px',
    placeholder: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+',
    errorImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZmIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yPC90ZXh0Pjwvc3ZnPg==',
    retryCount: 3,
    retryDelay: 1000,
    fadeIn: true,
    preload: false
  };
  
  constructor(
    private el: ElementRef<HTMLImageElement | HTMLDivElement>,
    private renderer: Renderer2
  ) {}
  
  ngOnInit(): void {
    const config = { ...this.defaultConfig, ...this.lazyLoadConfig };
    
    // Set up placeholder
    this.setupPlaceholder(config);
    
    // Check if IntersectionObserver is supported
    if ('IntersectionObserver' in window) {
      this.setupIntersectionObserver(config);
    } else {
      // Fallback for older browsers
      this.loadImage();
    }
    
    // Preload if configured
    if (config.preload) {
      this.preloadImage();
    }
  }
  
  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.placeholderElement) {
      this.renderer.removeChild(this.el.nativeElement.parentElement, this.placeholderElement);
    }
  }
  
  private setupPlaceholder(config: LazyLoadConfig): void {
    const element = this.el.nativeElement;
    
    if (element instanceof HTMLImageElement) {
      // For img elements, set placeholder as src
      this.renderer.setAttribute(element, 'src', config.placeholder!);
      this.renderer.setAttribute(element, 'data-src', this.imageSrc);
      
      // Add loading styles
      this.renderer.addClass(element, 'lazy-loading');
      
      if (config.fadeIn) {
        this.renderer.setStyle(element, 'opacity', '0');
        this.renderer.setStyle(element, 'transition', 'opacity 0.3s ease-in-out');
      }
    } else {
      // For div elements (background images)
      this.renderer.setStyle(element, 'background-image', `url(${config.placeholder})`);
      this.renderer.setAttribute(element, 'data-bg', this.imageSrc);
      this.renderer.addClass(element, 'lazy-loading');
      
      if (config.fadeIn) {
        this.renderer.setStyle(element, 'opacity', '0.5');
        this.renderer.setStyle(element, 'transition', 'opacity 0.3s ease-in-out');
      }
    }
    
    // Add loading indicator overlay for divs
    if (!(element instanceof HTMLImageElement)) {
      this.createLoadingOverlay();
    }
  }
  
  private createLoadingOverlay(): void {
    const overlay = this.renderer.createElement('div');
    this.renderer.addClass(overlay, 'lazy-load-overlay');
    this.renderer.setStyle(overlay, 'position', 'absolute');
    this.renderer.setStyle(overlay, 'top', '0');
    this.renderer.setStyle(overlay, 'left', '0');
    this.renderer.setStyle(overlay, 'right', '0');
    this.renderer.setStyle(overlay, 'bottom', '0');
    this.renderer.setStyle(overlay, 'display', 'flex');
    this.renderer.setStyle(overlay, 'align-items', 'center');
    this.renderer.setStyle(overlay, 'justify-content', 'center');
    this.renderer.setStyle(overlay, 'background', 'rgba(255, 255, 255, 0.8)');
    this.renderer.setStyle(overlay, 'z-index', '1');
    
    const spinner = this.renderer.createElement('div');
    this.renderer.addClass(spinner, 'lazy-load-spinner');
    this.renderer.setStyle(spinner, 'width', '30px');
    this.renderer.setStyle(spinner, 'height', '30px');
    this.renderer.setStyle(spinner, 'border', '3px solid #ddd');
    this.renderer.setStyle(spinner, 'border-top-color', '#667eea');
    this.renderer.setStyle(spinner, 'border-radius', '50%');
    this.renderer.setStyle(spinner, 'animation', 'spin 0.6s linear infinite');
    
    this.renderer.appendChild(overlay, spinner);
    this.renderer.appendChild(this.el.nativeElement, overlay);
    this.placeholderElement = overlay;
  }
  
  private setupIntersectionObserver(config: LazyLoadConfig): void {
    const options: IntersectionObserverInit = {
      threshold: config.threshold,
      rootMargin: config.rootMargin
    };
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.isLoaded) {
          this.loadImage();
          if (this.observer) {
            this.observer.unobserve(entry.target);
          }
        }
      });
    }, options);
    
    this.observer.observe(this.el.nativeElement);
  }
  
  private loadImage(): void {
    const element = this.el.nativeElement;
    const config = { ...this.defaultConfig, ...this.lazyLoadConfig };
    
    if (element instanceof HTMLImageElement) {
      this.loadImageElement(element, config);
    } else {
      this.loadBackgroundImage(element, config);
    }
  }
  
  private loadImageElement(img: HTMLImageElement, config: LazyLoadConfig): void {
    const tempImg = new Image();
    
    tempImg.onload = () => {
      this.renderer.setAttribute(img, 'src', this.imageSrc);
      this.renderer.removeClass(img, 'lazy-loading');
      this.renderer.addClass(img, 'lazy-loaded');
      
      if (config.fadeIn) {
        this.renderer.setStyle(img, 'opacity', '1');
      }
      
      this.isLoaded = true;
      this.loaded.emit();
    };
    
    tempImg.onerror = () => {
      this.handleLoadError(img, config);
    };
    
    tempImg.src = this.imageSrc;
  }
  
  private loadBackgroundImage(element: HTMLElement, config: LazyLoadConfig): void {
    const tempImg = new Image();
    
    tempImg.onload = () => {
      this.renderer.setStyle(element, 'background-image', `url(${this.imageSrc})`);
      this.renderer.removeClass(element, 'lazy-loading');
      this.renderer.addClass(element, 'lazy-loaded');
      
      if (config.fadeIn) {
        this.renderer.setStyle(element, 'opacity', '1');
      }
      
      // Remove loading overlay
      if (this.placeholderElement) {
        this.renderer.removeChild(element, this.placeholderElement);
        this.placeholderElement = null;
      }
      
      this.isLoaded = true;
      this.loaded.emit();
    };
    
    tempImg.onerror = () => {
      this.handleLoadError(element, config);
    };
    
    tempImg.src = this.imageSrc;
  }
  
  private handleLoadError(element: HTMLElement, config: LazyLoadConfig): void {
    if (this.retryCount < config.retryCount!) {
      this.retryCount++;
      setTimeout(() => {
        this.loadImage();
      }, config.retryDelay! * this.retryCount);
    } else {
      // Load error image
      if (element instanceof HTMLImageElement) {
        this.renderer.setAttribute(element, 'src', config.errorImage!);
      } else {
        this.renderer.setStyle(element, 'background-image', `url(${config.errorImage})`);
      }
      
      this.renderer.removeClass(element, 'lazy-loading');
      this.renderer.addClass(element, 'lazy-error');
      
      if (config.fadeIn) {
        this.renderer.setStyle(element, 'opacity', '1');
      }
      
      // Remove loading overlay for error state
      if (this.placeholderElement) {
        this.renderer.removeChild(element, this.placeholderElement);
        this.placeholderElement = null;
      }
      
      const error = new Error(`Failed to load image: ${this.imageSrc}`);
      this.error.emit(error);
    }
  }
  
  private preloadImage(): void {
    const link = this.renderer.createElement('link');
    this.renderer.setAttribute(link, 'rel', 'preload');
    this.renderer.setAttribute(link, 'as', 'image');
    this.renderer.setAttribute(link, 'href', this.imageSrc);
    this.renderer.appendChild(document.head, link);
  }
}

// Add global styles for spinner animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  .lazy-loading {
    filter: blur(5px);
  }
  
  .lazy-loaded {
    filter: none;
  }
  
  .lazy-error {
    filter: none;
    opacity: 0.5;
  }
`;
document.head.appendChild(style);
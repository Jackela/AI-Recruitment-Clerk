import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'arc-score-visualization',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="score-section">
      <!-- SVG Gradient Definition -->
      <svg style="position: absolute; width: 0; height: 0;" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
          </linearGradient>
        </defs>
      </svg>

      <div class="score-circle">
        <svg class="score-ring" viewBox="0 0 120 120" aria-labelledby="score-title" aria-describedby="score-description">
          <title id="score-title">分析得分</title>
          <desc id="score-description">候选人匹配度得分为 {{ score }} 分，满分 100 分</desc>
          <circle cx="60" cy="60" r="50" class="score-bg" aria-hidden="true"></circle>
          <circle cx="60" cy="60" r="50" class="score-fill" 
                  [style.stroke-dasharray]="getScoreCircumference()"
                  [style.stroke-dashoffset]="getScoreOffset()"
                  aria-hidden="true"></circle>
        </svg>
        <div class="score-value" [attr.aria-label]="'得分' + score + '分'">
          <span class="score-number" [class.high-score]="score >= 80" [class.medium-score]="score >= 60 && score < 80" [class.low-score]="score < 60">{{ score }}</span>
          <span class="score-label">分</span>
        </div>
      </div>
      <div class="score-details">
        <h3>匹配度评分</h3>
        <p class="score-summary">{{ summary }}</p>
        <div class="score-indicator" *ngIf="showIndicator">
          <div class="indicator-item" [class.active]="score >= 80">
            <div class="indicator-dot high"></div>
            <span>优秀 (80-100分)</span>
          </div>
          <div class="indicator-item" [class.active]="score >= 60 && score < 80">
            <div class="indicator-dot medium"></div>
            <span>良好 (60-79分)</span>
          </div>
          <div class="indicator-item" [class.active]="score < 60">
            <div class="indicator-dot low"></div>
            <span>待提升 (<60分)</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .score-section {
      display: flex;
      align-items: center;
      gap: 2rem;
      margin-bottom: 2rem;
      padding: 2rem;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(139, 92, 246, 0.05));
      border-radius: 16px;
      border: 1px solid rgba(59, 130, 246, 0.1);
    }

    .score-circle {
      position: relative;
      width: 120px;
      height: 120px;
      flex-shrink: 0;
    }

    .score-ring {
      transform: rotate(-90deg);
      width: 100%;
      height: 100%;
    }

    .score-bg {
      fill: none;
      stroke: #e5e7eb;
      stroke-width: 8;
    }

    .score-fill {
      fill: none;
      stroke: url(#scoreGradient);
      stroke-width: 8;
      stroke-linecap: round;
      transition: stroke-dashoffset 2s ease-in-out;
    }

    .score-value {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }

    .score-number {
      font-size: 2rem;
      font-weight: 800;
      color: #1f2937;
      display: block;
      transition: color 0.3s ease;
    }

    .score-number.high-score {
      color: #10b981;
    }

    .score-number.medium-score {
      color: #f59e0b;
    }

    .score-number.low-score {
      color: #ef4444;
    }

    .score-label {
      font-size: 0.875rem;
      color: #6b7280;
      font-weight: 600;
    }

    .score-details {
      flex: 1;
    }

    .score-details h3 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 1rem 0;
    }

    .score-summary {
      font-size: 1rem;
      color: #6b7280;
      line-height: 1.6;
      margin: 0 0 1.5rem 0;
    }

    .score-indicator {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .indicator-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      opacity: 0.5;
      transition: opacity 0.3s ease;
    }

    .indicator-item.active {
      opacity: 1;
    }

    .indicator-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .indicator-dot.high {
      background: #10b981;
    }

    .indicator-dot.medium {
      background: #f59e0b;
    }

    .indicator-dot.low {
      background: #ef4444;
    }

    .indicator-item span {
      font-size: 0.875rem;
      color: #6b7280;
      font-weight: 500;
    }

    .indicator-item.active span {
      color: #374151;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .score-section {
        flex-direction: column;
        text-align: center;
        gap: 1.5rem;
      }
      
      .score-details {
        text-align: center;
      }
      
      .score-indicator {
        justify-content: center;
        align-items: center;
      }
    }
  `]
})
export class ScoreVisualizationComponent implements OnChanges {
  @Input() score: number = 0;
  @Input() summary: string = '';
  @Input() showIndicator: boolean = true;
  @Input() animated: boolean = true;

  private animatedScore = 0;
  private animationDuration = 2000; // 2 seconds

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['score'] && this.animated) {
      this.animateScore();
    }
  }

  private animateScore(): void {
    const startScore = this.animatedScore;
    const endScore = this.score;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / this.animationDuration, 1);
      
      // Easing function for smooth animation
      const easedProgress = this.easeOutCubic(progress);
      
      this.animatedScore = Math.round(startScore + (endScore - startScore) * easedProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.animatedScore = endScore;
      }
    };

    requestAnimationFrame(animate);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  getScoreCircumference(): string {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    return `${circumference} ${circumference}`;
  }

  getScoreOffset(): number {
    const displayScore = this.animated ? this.animatedScore : this.score;
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    return circumference - (displayScore / 100) * circumference;
  }

  getScoreColor(): string {
    if (this.score >= 80) return '#10b981';
    if (this.score >= 60) return '#f59e0b';
    return '#ef4444';
  }

  getScoreCategory(): string {
    if (this.score >= 80) return '优秀';
    if (this.score >= 60) return '良好';
    return '待提升';
  }
}
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { CandidateResult } from './mobile-results-item.component';
import { MobileResultsItemComponent } from './mobile-results-item.component';

// Re-export for convenience
export type { CandidateResult };
import { MobileResultsEmptyComponent } from './mobile-results-empty.component';
import { MobileResultsLoadingComponent } from './mobile-results-loading.component';

/**
 * Mobile results display component.
 * Main orchestrator that renders candidate lists using child components.
 *
 * This component manages the overall display state and delegates
 * rendering of individual items, empty state, and loading state
 * to specialized child components.
 */
@Component({
  selector: 'arc-mobile-results-display',
  standalone: true,
  imports: [
    CommonModule,
    MobileResultsItemComponent,
    MobileResultsEmptyComponent,
    MobileResultsLoadingComponent,
  ],
  template: `
    <div class="results-list" [class]="'view-' + viewMode">
      <div
        *ngFor="let candidate of candidates; trackBy: trackByCandidate"
        class="result-item-wrapper"
      >
        <arc-mobile-results-item
          [candidate]="candidate"
          [isSelected]="isSelected(candidate)"
          [showDetailed]="viewMode === 'detailed'"
          (candidateSelected)="onCandidateSelected(candidate)"
          (candidateAction)="onCandidateAction($event)"
          (selectionToggled)="onSelectionToggled(candidate, $event)"
        />
      </div>
    </div>

    <!-- Empty State -->
    <arc-mobile-results-empty
      *ngIf="candidates.length === 0 && !isLoading"
      (clearFilters)="onClearFilters()"
    />

    <!-- Loading State -->
    <arc-mobile-results-loading *ngIf="isLoading" />
  `,
  styles: [
    `
      .results-list {
        padding: 0 16px;

        &.view-card {
          .result-item-wrapper {
            margin-bottom: 12px;
          }
        }

        &.view-detailed {
          .result-item-wrapper {
            margin-bottom: 16px;
          }
        }

        .result-item-wrapper {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
        }
      }

      @media (min-width: 768px) {
        .results-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
          padding: 16px;

          .result-item-wrapper {
            margin-bottom: 0;
          }
        }
      }
    `,
  ],
})
export class MobileResultsDisplayComponent {
  @Input() public candidates: CandidateResult[] = [];
  @Input() public isLoading = false;
  @Input() public viewMode: 'card' | 'detailed' = 'card';
  @Input() public selectedCandidates: CandidateResult[] = [];

  @Output() public candidateSelected = new EventEmitter<CandidateResult>();
  @Output() public candidateAction = new EventEmitter<{
    action: string;
    candidate: CandidateResult;
  }>();
  @Output() public selectionToggled = new EventEmitter<{
    candidate: CandidateResult;
    event: Event;
  }>();
  @Output() public clearFilters = new EventEmitter<void>();

  /**
   * Checks if a candidate is selected.
   */
  public isSelected(candidate: CandidateResult): boolean {
    return this.selectedCandidates.some((c) => c.id === candidate.id);
  }

  /**
   * Handles candidate selection.
   */
  public onCandidateSelected(candidate: CandidateResult): void {
    this.candidateSelected.emit(candidate);
  }

  /**
   * Handles candidate action from item component.
   */
  public onCandidateAction(event: {
    action: string;
    candidate: CandidateResult;
  }): void {
    this.candidateAction.emit(event);
  }

  /**
   * Handles selection toggle from item component.
   */
  public onSelectionToggled(candidate: CandidateResult, event: Event): void {
    this.selectionToggled.emit({ candidate, event });
  }

  /**
   * Handles clear filters action.
   */
  public onClearFilters(): void {
    this.clearFilters.emit();
  }

  /**
   * Track by candidate ID for efficient rendering.
   */
  public trackByCandidate(_index: number, candidate: CandidateResult): string {
    return candidate.id;
  }
}

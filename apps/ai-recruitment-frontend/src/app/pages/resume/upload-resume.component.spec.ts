import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { UploadResumeComponent } from './upload-resume.component';
import { GuestApiService } from '../../services/guest/guest-api.service';
import { WebSocketService } from '../../services/websocket.service';

describe('UploadResumeComponent', () => {
  let component: UploadResumeComponent;
  let fixture: ComponentFixture<UploadResumeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadResumeComponent],
      providers: [
        {
          provide: GuestApiService,
          useValue: {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            analyzeResume: () => ({ subscribe: () => {} }),
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            getDemoAnalysis: () => ({ subscribe: () => {} }),
          },
        },
        {
          provide: WebSocketService,
          useValue: {
            onCompletion: () => ({ pipe: () => ({ subscribe: () => ({}) }) }),
            onError: () => ({ pipe: () => ({ subscribe: () => ({}) }) }),
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            disconnect: () => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UploadResumeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should accept both .pdf and .txt files in input accept attribute', () => {
    const input: HTMLInputElement | null =
      fixture.nativeElement.querySelector('input[type="file"]');
    expect(input).toBeTruthy();
    expect(input!.accept).toContain('.pdf');
    expect(input!.accept).toContain('.txt');
  });

  it('should set file on onFileChange for .pdf and .txt', () => {
    const pdf = new File([new Blob(['%PDF-1.7'])], 'resume.pdf', {
      type: 'application/pdf',
    });
    const txt = new File([new Blob(['hello'])], 'resume.txt', {
      type: 'text/plain',
    });

    // Simulate PDF selection
    const evPdf = {
      target: { files: [pdf] },
    } as any as Event;
    component.onFileChange(evPdf);
    expect(component.file?.name).toBe('resume.pdf');

    // Simulate TXT selection
    const evTxt = {
      target: { files: [txt] },
    } as any as Event;
    component.onFileChange(evTxt);
    expect(component.file?.name).toBe('resume.txt');
  });
});

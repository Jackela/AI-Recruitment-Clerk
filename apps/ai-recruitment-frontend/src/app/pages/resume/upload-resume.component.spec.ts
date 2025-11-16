import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UploadResumeComponent } from './upload-resume.component';
import { GuestApiService } from '../../services/guest/guest-api.service';
import { WebSocketService } from '../../services/websocket.service';
import { of } from 'rxjs';

class GuestApiServiceStub {
  analyzeResume = jest.fn().mockReturnValue(of({ data: { analysisId: 'foo' } }));
  getDemoAnalysis = jest.fn().mockReturnValue(of({}));
}

class WebSocketServiceStub {
  onCompletion = jest.fn().mockReturnValue(of({}));
  onError = jest.fn().mockReturnValue(of({}));
  disconnect = jest.fn();
}

type MockFileList = {
  length: number;
  item: (index: number) => File | null;
} & { [index: number]: File };

const createFileChangeEvent = (file: File): Event => {
  const mockFiles: MockFileList = {
    0: file,
    length: 1,
    item: (index) => (index === 0 ? file : null),
  };

  const target = { files: mockFiles } as Pick<HTMLInputElement, 'files'>;
  return { target } as Event;
};

describe('UploadResumeComponent', () => {
  let component: UploadResumeComponent;
  let fixture: ComponentFixture<UploadResumeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadResumeComponent],
      providers: [
        { provide: GuestApiService, useClass: GuestApiServiceStub },
        { provide: WebSocketService, useClass: WebSocketServiceStub },
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
    expect(input?.accept).toContain('.pdf');
    expect(input?.accept).toContain('.txt');
  });

  it('should set file on onFileChange for .pdf and .txt', () => {
    const pdf = new File([new Blob(['%PDF-1.7'])], 'resume.pdf', {
      type: 'application/pdf',
    });
    const txt = new File([new Blob(['hello'])], 'resume.txt', {
      type: 'text/plain',
    });

    // Simulate PDF selection
    const evPdf = createFileChangeEvent(pdf);
    component.onFileChange(evPdf);
    expect(component.file?.name).toBe('resume.pdf');

    // Simulate TXT selection
    const evTxt = createFileChangeEvent(txt);
    component.onFileChange(evTxt);
    expect(component.file?.name).toBe('resume.txt');
  });
});

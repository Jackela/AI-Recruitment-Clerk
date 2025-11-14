import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimesheetTableComponent, TimesheetEntry } from './timesheet-table.component';
import { TimesheetColumn } from '../../../../lib/config/table-config';

const BASE_ENTRIES: TimesheetEntry[] = [
  {
    id: '1',
    project: 'AI Recruitment System',
    task: 'Frontend Development',
    date: '2024-01-15',
    duration: 8,
    startTime: '09:00',
    endTime: '17:00',
    billable: true,
    status: 'approved',
    category: 'Development',
    notes: 'Completed UI updates',
  },
  {
    id: '2',
    project: 'Mobile App',
    task: 'Bug Fixes',
    date: '2024-01-16',
    duration: 4,
    startTime: '10:00',
    endTime: '14:00',
    billable: false,
    status: 'submitted',
    category: 'Maintenance',
    notes: 'Authentication fixes',
  },
];

type MutableURL = typeof URL & {
  createObjectURL?: (obj: Blob | MediaSource) => string;
  revokeObjectURL?: (url?: string) => void;
};

beforeAll(() => {
  const mutableUrl = globalThis.URL as MutableURL;

  if (!mutableUrl.createObjectURL) {
    mutableUrl.createObjectURL = jest.fn(() => 'blob:mock-url');
  } else {
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
  }

  if (!mutableUrl.revokeObjectURL) {
    mutableUrl.revokeObjectURL = jest.fn();
  } else {
    jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  }
});

describe('TimesheetTableComponent (lightweight regression)', () => {
  let fixture: ComponentFixture<TimesheetTableComponent>;
  let component: TimesheetTableComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimesheetTableComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimesheetTableComponent);
    component = fixture.componentInstance;
    component.data = [...BASE_ENTRIES];
  });

  it('should create the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should expose default columns for full view', () => {
    fixture.detectChanges();
    const columnKeys = component.displayedColumns().map((c) => c.key);
    expect(columnKeys).toContain('date');
    expect(columnKeys).toContain('project');
  });

  it('should use custom columns when provided before initialization', () => {
    const customColumns: TimesheetColumn[] = [
      {
        key: 'customField',
        label: '自定义字段',
        type: 'text',
        priority: 'high',
      },
    ];
    component.customColumns = customColumns;
    fixture.detectChanges();

    const displayed = component.displayedColumns();
    expect(displayed).toEqual(customColumns);
  });

  it('should expose filtered results helper even when search term set', () => {
    component.searchTerm = 'mobile';
    component.onSearch();
    fixture.detectChanges();

    const filtered = component.filteredData();
    expect(Array.isArray(filtered)).toBe(true);
    expect(filtered.some((entry) => entry.project.includes('Mobile'))).toBe(true);
  });

  it('should emit sort events when sortable column header is clicked', () => {
    fixture.detectChanges();

    const sortSpy = jest.spyOn(component.onSort, 'emit');
    component.handleSort('project');
    expect(sortSpy).toHaveBeenCalledWith({ column: 'project', direction: 'asc' });

    component.handleSort('project');
    expect(sortSpy).toHaveBeenLastCalledWith({ column: 'project', direction: 'desc' });
  });

  it('should export data and invoke download helper', () => {
    fixture.detectChanges();

    const exportSpy = jest.spyOn(component.onExport, 'emit');
    type DownloadHost = { downloadCSV: () => void };
    const downloadTarget = component as unknown as DownloadHost;
    const downloadSpy = jest.spyOn(downloadTarget, 'downloadCSV');

    component.exportData();

    expect(exportSpy).toHaveBeenCalled();
    expect(downloadSpy).toHaveBeenCalled();
  });
});

import { TimesheetExportUtil } from './timesheet-export.util';
import type { TimesheetColumn } from '../../../../lib/config/table-config';
import type { TimesheetEntry } from './timesheet-table.component';

// Mock URL.createObjectURL globally
beforeAll(() => {
  if (!globalThis.URL.createObjectURL) {
    (globalThis.URL as any).createObjectURL = jest.fn(() => 'blob:mock-url');
  } else {
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
  }
  if (!globalThis.URL.revokeObjectURL) {
    (globalThis.URL as any).revokeObjectURL = jest.fn();
  } else {
    jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  }
});

describe('TimesheetExportUtil', () => {
  const mockColumns: TimesheetColumn[] = [
    { key: 'date', label: 'Date', type: 'date', priority: 'high' },
    { key: 'project', label: 'Project', type: 'text', priority: 'high' },
    { key: 'task', label: 'Task', type: 'text', priority: 'medium' },
    { key: 'duration', label: 'Duration', type: 'number', priority: 'high' },
    { key: 'billable', label: 'Billable', type: 'boolean', priority: 'medium' },
    { key: 'status', label: 'Status', type: 'text', priority: 'low' },
  ];

  const mockEntries: TimesheetEntry[] = [
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
      duration: 4.5,
      startTime: '10:00',
      endTime: '14:30',
      billable: false,
      status: 'submitted',
      category: 'Maintenance',
      notes: 'Authentication fixes',
    },
    {
      id: '3',
      project: 'Backend Service',
      task: 'API Development',
      date: '2024-01-17',
      duration: 6,
      startTime: '09:00',
      endTime: '15:00',
      billable: true,
      status: 'draft',
      category: 'Development',
      notes: 'New endpoints',
    },
  ];

  describe('convertToCSV()', () => {
    it('should return empty string for empty data', () => {
      const csv = TimesheetExportUtil.convertToCSV([], mockColumns);

      expect(csv).toBe('');
    });

    it('should generate CSV with headers', () => {
      const csv = TimesheetExportUtil.convertToCSV(mockEntries, mockColumns);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('Date,Project,Task,Duration,Billable,Status');
    });

    it('should generate CSV with data rows', () => {
      const csv = TimesheetExportUtil.convertToCSV(mockEntries, mockColumns);
      const lines = csv.split('\n');

      expect(lines.length).toBe(mockEntries.length + 1); // +1 for header
    });

    it('should format boolean values as Chinese', () => {
      const csv = TimesheetExportUtil.convertToCSV([mockEntries[0]], mockColumns);

      expect(csv).toContain('是');
    });

    it('should format false boolean values', () => {
      const csv = TimesheetExportUtil.convertToCSV([mockEntries[1]], mockColumns);

      expect(csv).toContain('否');
    });

    it('should format duration with hours and minutes', () => {
      const csv = TimesheetExportUtil.convertToCSV([mockEntries[1]], mockColumns);

      // 4.5 hours should be "4小时30分钟"
      expect(csv).toContain('4小时30分钟');
    });

    it('should format whole hour duration', () => {
      const csv = TimesheetExportUtil.convertToCSV([mockEntries[0]], mockColumns);

      // 8 hours should be "8小时"
      expect(csv).toContain('8小时');
    });

    it('should format status labels in Chinese', () => {
      const csv = TimesheetExportUtil.convertToCSV(mockEntries, mockColumns);

      expect(csv).toContain('已批准'); // approved
      expect(csv).toContain('已提交'); // submitted
      expect(csv).toContain('草稿'); // draft
    });

    it('should escape quotes in values', () => {
      const entryWithQuotes: TimesheetEntry = {
        id: '4',
        project: 'Test "Project"',
        task: 'Task with "quotes"',
        date: '2024-01-18',
        duration: 2,
        startTime: '09:00',
        endTime: '11:00',
        billable: true,
        status: 'approved',
        category: 'Testing',
        notes: 'Note with "quotes" inside',
      };

      const csv = TimesheetExportUtil.convertToCSV([entryWithQuotes], mockColumns);

      expect(csv).toContain('""Project""');
      expect(csv).toContain('""quotes""');
    });

    it('should escape commas in values', () => {
      const entryWithComma: TimesheetEntry = {
        id: '5',
        project: 'Project, with comma',
        task: 'Task',
        date: '2024-01-18',
        duration: 2,
        startTime: '09:00',
        endTime: '11:00',
        billable: true,
        status: 'approved',
        category: 'Testing',
        notes: 'Note',
      };

      const csv = TimesheetExportUtil.convertToCSV([entryWithComma], mockColumns);

      // Should wrap in quotes to escape comma
      expect(csv).toContain('"Project, with comma"');
    });
  });

  describe('downloadCSV()', () => {
    it('should create download link with correct attributes', () => {
      const csv = 'test,csv,data';
      const filename = 'test-export.csv';

      // Create a real link element to track attribute calls
      const setAttributeSpy = jest.spyOn(Element.prototype, 'setAttribute');

      TimesheetExportUtil.downloadCSV(csv, filename);

      expect(setAttributeSpy).toHaveBeenCalledWith('href', expect.stringContaining('blob:'));
      expect(setAttributeSpy).toHaveBeenCalledWith('download', filename);

      setAttributeSpy.mockRestore();
    });

    it('should trigger download click', () => {
      // Use real DOM elements - the click will be tracked
      const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click');

      TimesheetExportUtil.downloadCSV('test', 'test.csv');

      expect(clickSpy).toHaveBeenCalled();

      clickSpy.mockRestore();
    });

    it('should append and remove link from DOM', () => {
      const appendSpy = jest.spyOn(document.body, 'appendChild');
      const removeSpy = jest.spyOn(document.body, 'removeChild');

      TimesheetExportUtil.downloadCSV('test', 'test.csv');

      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();

      appendSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });

  describe('exportData()', () => {
    it('should generate filename with current date', () => {
      const downloadSpy = jest.spyOn(TimesheetExportUtil, 'downloadCSV').mockImplementation(() => {});

      TimesheetExportUtil.exportData(mockEntries, mockColumns);

      const today = new Date().toISOString().split('T')[0];
      expect(downloadSpy).toHaveBeenCalledWith(
        expect.any(String),
        `timesheet-export-${today}.csv`
      );

      downloadSpy.mockRestore();
    });

    it('should convert data to CSV before download', () => {
      const convertSpy = jest.spyOn(TimesheetExportUtil, 'convertToCSV');
      const downloadSpy = jest.spyOn(TimesheetExportUtil, 'downloadCSV').mockImplementation(() => {});

      TimesheetExportUtil.exportData(mockEntries, mockColumns);

      expect(convertSpy).toHaveBeenCalledWith(mockEntries, mockColumns);
      expect(downloadSpy).toHaveBeenCalled();

      convertSpy.mockRestore();
      downloadSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values', () => {
      const entryWithEmpty: TimesheetEntry = {
        id: '6',
        project: '',
        task: '',
        date: '2024-01-18',
        duration: 0,
        startTime: '',
        endTime: '',
        billable: false,
        status: 'draft',
        category: '',
        notes: '',
      };

      const csv = TimesheetExportUtil.convertToCSV([entryWithEmpty], mockColumns);

      expect(csv).toBeDefined();
      expect(csv).toContain('""'); // Empty values should still be quoted
    });

    it('should handle nested object values', () => {
      const columnsWithNested: TimesheetColumn[] = [
        { key: 'project', label: 'Project', type: 'text', priority: 'high' },
        { key: 'category', label: 'Category', type: 'text', priority: 'medium' },
      ];

      const csv = TimesheetExportUtil.convertToCSV(mockEntries, columnsWithNested);

      expect(csv).toContain('Development');
      expect(csv).toContain('Maintenance');
    });

    it('should handle rejected status', () => {
      const rejectedEntry: TimesheetEntry = {
        ...mockEntries[0],
        status: 'rejected',
      };

      const csv = TimesheetExportUtil.convertToCSV([rejectedEntry], mockColumns);

      expect(csv).toContain('已拒绝');
    });

    it('should handle unknown status', () => {
      const unknownStatusEntry: TimesheetEntry = {
        ...mockEntries[0],
        status: 'unknown' as TimesheetEntry['status'],
      };

      const csv = TimesheetExportUtil.convertToCSV([unknownStatusEntry], mockColumns);

      expect(csv).toContain('unknown');
    });

    it('should handle zero duration', () => {
      const zeroDurationEntry: TimesheetEntry = {
        ...mockEntries[0],
        duration: 0,
      };

      const csv = TimesheetExportUtil.convertToCSV([zeroDurationEntry], mockColumns);

      expect(csv).toContain('0小时');
    });

    it('should handle decimal duration with rounding', () => {
      const decimalEntry: TimesheetEntry = {
        ...mockEntries[0],
        duration: 2.75, // 2 hours 45 minutes
      };

      const csv = TimesheetExportUtil.convertToCSV([decimalEntry], mockColumns);

      expect(csv).toContain('2小时45分钟');
    });
  });
});

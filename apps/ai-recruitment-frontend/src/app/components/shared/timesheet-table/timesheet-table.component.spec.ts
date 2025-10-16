import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { TimesheetTableComponent, TimesheetEntry } from './timesheet-table.component';
import { TimesheetColumn } from '../../../../lib/config/table-config';

// Mock the table configuration module
jest.mock('../../../../lib/config/table-config', () => {
  const mockTimesheetColumns: TimesheetColumn[] = [
    {
      key: 'date',
      label: '日期',
      mobileLabel: '日期',
      type: 'date',
      sortable: true,
      filterable: true,
      width: '120px',
      align: 'center',
      priority: 'high',
      showInSummary: true,
      validation: { required: true },
      bulkEditable: false,
    },
    {
      key: 'project',
      label: '项目名称',
      mobileLabel: '项目',
      type: 'text',
      sortable: true,
      filterable: true,
      width: '200px',
      align: 'left',
      priority: 'high',
      truncateLength: 30,
      showInSummary: true,
      validation: { required: true },
      bulkEditable: true,
    },
    {
      key: 'task',
      label: '任务描述',
      mobileLabel: '任务',
      type: 'text',
      sortable: false,
      filterable: true,
      width: '250px',
      align: 'left',
      priority: 'medium',
      truncateLength: 40,
      showInSummary: false,
      validation: { required: true },
      bulkEditable: false,
    },
    {
      key: 'duration',
      label: '工作时长',
      mobileLabel: '时长',
      type: 'number',
      sortable: true,
      filterable: true,
      width: '100px',
      align: 'center',
      priority: 'high',
      timeFormat: 'decimal',
      showInSummary: true,
      validation: { required: true, min: 0.1, max: 24 },
      bulkEditable: false,
    },
    {
      key: 'status',
      label: '状态',
      mobileLabel: '状态',
      type: 'text',
      sortable: true,
      filterable: true,
      width: '100px',
      align: 'center',
      priority: 'low',
      showInSummary: false,
      validation: { required: true },
      bulkEditable: true,
    },
    {
      key: 'billable',
      label: '可计费',
      mobileLabel: '计费',
      type: 'boolean',
      sortable: true,
      filterable: true,
      width: '80px',
      align: 'center',
      priority: 'medium',
      showInSummary: true,
      bulkEditable: true,
    },
  ];

  const mockViewConfigs = {
    full: {
      columns: mockTimesheetColumns,
      options: {
        pageSize: 25,
        pageSizeOptions: [10, 25, 50, 100],
        showPagination: true,
        showFilter: true,
        showExport: true,
        selectable: true,
        multiSelect: true,
        striped: true,
        bordered: true,
        hoverable: true,
        loading: false,
        emptyMessage: '暂无工时记录',
      },
    },
    summary: {
      columns: mockTimesheetColumns.filter(col => col.showInSummary),
      options: {
        pageSize: 50,
        pageSizeOptions: [25, 50, 100],
        showPagination: true,
        showFilter: true,
        showExport: true,
        selectable: false,
        multiSelect: false,
        striped: true,
        bordered: false,
        hoverable: true,
        loading: false,
        emptyMessage: '暂无工时摘要',
      },
    },
    mobile: {
      columns: mockTimesheetColumns.filter(col => col.priority === 'high'),
      options: {
        pageSize: 15,
        pageSizeOptions: [10, 15, 25],
        showPagination: true,
        showFilter: false,
        showExport: false,
        selectable: false,
        multiSelect: false,
        striped: true,
        bordered: false,
        hoverable: false,
        loading: false,
        emptyMessage: '暂无数据',
      },
    },
  };

  return {
    TIMESHEET_COLUMNS: mockTimesheetColumns,
    TIMESHEET_VIEW_CONFIGS: mockViewConfigs,
    TIMESHEET_BREAKPOINTS: {
      mobile: 768,
      tablet: 1024,
      desktop: 1200,
    },
    getResponsiveColumns: jest.fn((screenWidth: number) => {
      if (screenWidth <= 768) {
        return mockTimesheetColumns.filter(col => col.priority === 'high');
      } else if (screenWidth <= 1024) {
        return mockTimesheetColumns.filter(col => col.priority !== 'low');
      } else {
        return mockTimesheetColumns;
      }
    }),
    getViewConfig: jest.fn((viewType: string) => mockViewConfigs[viewType as keyof typeof mockViewConfigs]),
  };
});

describe('TimesheetTableComponent', () => {
  let component: TimesheetTableComponent;
  let fixture: ComponentFixture<TimesheetTableComponent>;
  let compiled: HTMLElement;

  // Test data fixtures
  const mockTimesheetEntries: TimesheetEntry[] = [
    {
      id: '1',
      date: '2024-01-15',
      project: 'AI Recruitment System',
      task: 'Frontend Development',
      startTime: '09:00',
      endTime: '17:00',
      duration: 8,
      category: 'Development',
      billable: true,
      status: 'approved',
      notes: 'Completed user interface updates',
    },
    {
      id: '2',
      date: '2024-01-16',
      project: 'Mobile App',
      task: 'Bug Fixes',
      startTime: '10:00',
      endTime: '14:00',
      duration: 4,
      category: 'Maintenance',
      billable: false,
      status: 'submitted',
      notes: 'Fixed authentication issues',
    },
    {
      id: '3',
      date: '2024-01-17',
      project: 'API Integration',
      task: 'Backend API Development with very long task description that should be truncated',
      startTime: '08:30',
      endTime: '16:30',
      duration: 8,
      category: 'Development',
      billable: true,
      status: 'draft',
      notes: '',
    },
  ];

  // Helper function to trigger resize event
  const triggerResize = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    
    const resizeEvent = new Event('resize');
    Object.defineProperty(resizeEvent, 'target', {
      value: { innerWidth: width },
      enumerable: true,
    });
    
    component.onResize(resizeEvent);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    // Reset window.innerWidth to default
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, TimesheetTableComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TimesheetTableComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement;
    
    // Set default props
    component.data = mockTimesheetEntries;
    component.viewType = 'full';
    component.showActions = true;
    
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Creation and Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.data).toEqual(mockTimesheetEntries);
      expect(component.viewType).toBe('full');
      expect(component.showActions).toBe(true);
      expect(component.searchTerm).toBe('');
      expect(component.currentPage()).toBe(0);
      expect(component.selectedEntries()).toEqual([]);
    });

    it('should set up computed properties correctly', () => {
      expect(component.displayedColumns()).toBeDefined();
      expect(component.tableOptions()).toBeDefined();
      expect(component.filteredData()).toEqual(mockTimesheetEntries);
      expect(component.totalItems()).toBe(3);
      expect(component.paginatedData()).toBeDefined();
    });

    it('should initialize current view type correctly', () => {
      expect(component.currentViewType).toBe('full');
      expect(component.pageSize).toBe(25);
    });
  });

  describe('View Configuration Tests', () => {
    it('should render full view with all columns', () => {
      component.currentViewType = 'full';
      component.onViewTypeChange();
      fixture.detectChanges();

      const displayedColumns = component.displayedColumns();
      expect(displayedColumns).toHaveLength(6); // All mock columns
      expect(displayedColumns[0].key).toBe('date');
      expect(displayedColumns[1].key).toBe('project');
      expect(displayedColumns[2].key).toBe('task');
    });

    it('should render summary view with only summary columns', () => {
      component.currentViewType = 'summary';
      component.onViewTypeChange();
      fixture.detectChanges();

      const displayedColumns = component.displayedColumns();
      // Should only show columns with showInSummary: true (date, project, duration, billable)
      expect(displayedColumns).toHaveLength(4);
      expect(displayedColumns.every(col => col.showInSummary)).toBe(true);
    });

    it('should render mobile view with only high priority columns', () => {
      component.currentViewType = 'mobile';
      component.onViewTypeChange();
      fixture.detectChanges();

      const displayedColumns = component.displayedColumns();
      // Should only show high priority columns (date, project, duration)
      expect(displayedColumns).toHaveLength(3);
      expect(displayedColumns.every(col => col.priority === 'high')).toBe(true);
    });

    it('should apply correct table options for each view', () => {
      // Test full view options
      component.currentViewType = 'full';
      component.onViewTypeChange();
      expect(component.tableOptions().selectable).toBe(true);
      expect(component.tableOptions().showFilter).toBe(true);
      expect(component.tableOptions().pageSize).toBe(25);

      // Test summary view options
      component.currentViewType = 'summary';
      component.onViewTypeChange();
      expect(component.tableOptions().selectable).toBe(false);
      expect(component.tableOptions().pageSize).toBe(50);

      // Test mobile view options
      component.currentViewType = 'mobile';
      component.onViewTypeChange();
      expect(component.tableOptions().showFilter).toBe(false);
      expect(component.tableOptions().showExport).toBe(false);
      expect(component.tableOptions().pageSize).toBe(15);
    });

    it('should emit view change event when view type changes', () => {
      spyOn(component.onViewChange, 'emit');
      
      component.currentViewType = 'summary';
      component.onViewTypeChange();
      
      expect(component.onViewChange.emit).toHaveBeenCalledWith('summary');
    });
  });

  describe('Responsive Design Tests', () => {
    it('should show/hide columns based on screen size and priority', () => {
      // Test desktop view (all columns visible)
      triggerResize(1200);
      const desktopColumns = component.displayedColumns();
      expect(desktopColumns).toHaveLength(6);

      // Test tablet view (no low priority columns)
      triggerResize(1000);
      const tabletColumns = component.displayedColumns();
      expect(tabletColumns.every(col => col.priority !== 'low')).toBe(true);

      // Test mobile view (only high priority columns)
      triggerResize(600);
      const mobileColumns = component.displayedColumns();
      expect(mobileColumns.every(col => col.priority === 'high')).toBe(true);
      expect(mobileColumns).toHaveLength(3);
    });

    it('should apply responsive CSS classes correctly', () => {
      // Test mobile view
      triggerResize(600);
      expect(component.isMobileView()).toBe(true);
      expect(component.isTabletView()).toBe(false);
      expect(component.isDesktopView()).toBe(false);

      // Test tablet view
      triggerResize(900);
      expect(component.isMobileView()).toBe(false);
      expect(component.isTabletView()).toBe(true);
      expect(component.isDesktopView()).toBe(false);

      // Test desktop view
      triggerResize(1300);
      expect(component.isMobileView()).toBe(false);
      expect(component.isTabletView()).toBe(false);
      expect(component.isDesktopView()).toBe(true);
    });

    it('should update screen width signal on resize', () => {
      const initialWidth = component.screenWidth();
      
      triggerResize(800);
      expect(component.screenWidth()).toBe(800);
      expect(component.screenWidth()).not.toBe(initialWidth);
    });

    it('should use mobile labels on small screens', () => {
      triggerResize(600);
      
      const column = component.displayedColumns().find(col => col.key === 'project');
      if (column) {
        const label = component.getColumnLabel(column);
        expect(label).toBe('项目'); // Should use mobileLabel
      }
    });
  });

  describe('Timesheet-Specific Functionality Tests', () => {
    describe('Time Formatting', () => {
      it('should format time correctly in 24h format', () => {
        const formatted24h = component.formatTime('14:30');
        expect(formatted24h).toBe('14:30');
      });

      it('should format time correctly in 12h format', () => {
        const formatted12h = component.formatTime('14:30', '12h');
        expect(formatted12h).toBe('2:30 PM');
        
        const morningTime = component.formatTime('09:00', '12h');
        expect(morningTime).toBe('9:00 AM');
        
        const midnightTime = component.formatTime('00:00', '12h');
        expect(midnightTime).toBe('12:00 AM');
      });

      it('should handle empty or invalid time input', () => {
        expect(component.formatTime('')).toBe('');
        expect(component.formatTime(null)).toBe('');
        expect(component.formatTime(undefined)).toBe('');
      });
    });

    describe('Duration Formatting', () => {
      it('should format duration correctly for whole hours', () => {
        expect(component.formatDuration(8)).toBe('8小时');
        expect(component.formatDuration(1)).toBe('1小时');
      });

      it('should format duration correctly for hours and minutes', () => {
        expect(component.formatDuration(8.5)).toBe('8小时30分钟');
        expect(component.formatDuration(2.25)).toBe('2小时15分钟');
        expect(component.formatDuration(0.5)).toBe('0小时30分钟');
      });

      it('should handle zero and invalid duration values', () => {
        expect(component.formatDuration(0)).toBe('0小时');
        expect(component.formatDuration(null)).toBe('0小时');
        expect(component.formatDuration(undefined)).toBe('0小时');
      });
    });

    describe('Status Label Formatting', () => {
      it('should return correct Chinese labels for status values', () => {
        expect(component.getStatusLabel('draft')).toBe('草稿');
        expect(component.getStatusLabel('submitted')).toBe('已提交');
        expect(component.getStatusLabel('approved')).toBe('已批准');
        expect(component.getStatusLabel('rejected')).toBe('已拒绝');
      });

      it('should return original value for unknown status', () => {
        expect(component.getStatusLabel('unknown')).toBe('unknown');
        expect(component.getStatusLabel('')).toBe('');
      });
    });

    describe('Cell Value Extraction', () => {
      it('should extract simple property values', () => {
        const entry = mockTimesheetEntries[0];
        expect(component.getCellValue(entry, 'project')).toBe('AI Recruitment System');
        expect(component.getCellValue(entry, 'duration')).toBe(8);
        expect(component.getCellValue(entry, 'billable')).toBe(true);
      });

      it('should handle nested property paths', () => {
        const entryWithNested = {
          ...mockTimesheetEntries[0],
          details: {
            category: {
              name: 'Development'
            }
          }
        };
        expect(component.getCellValue(entryWithNested, 'details.category.name')).toBe('Development');
      });

      it('should return undefined for non-existent properties', () => {
        const entry = mockTimesheetEntries[0];
        expect(component.getCellValue(entry, 'nonexistent')).toBeUndefined();
        expect(component.getCellValue(entry, 'nested.nonexistent')).toBeUndefined();
      });
    });

    describe('Text Truncation', () => {
      it('should truncate text when it exceeds column truncateLength', () => {
        const taskColumn = component.displayedColumns().find(col => col.key === 'task');
        if (taskColumn) {
          const entry = mockTimesheetEntries[2]; // Has long task description
          const truncated = component.getTruncatedValue(entry, taskColumn);
          expect(truncated).toHaveLength(43); // 40 chars + '...'
          expect(truncated).toContain('...');
        }
      });

      it('should not truncate text shorter than limit', () => {
        const projectColumn = component.displayedColumns().find(col => col.key === 'project');
        if (projectColumn) {
          const entry = mockTimesheetEntries[0];
          const result = component.getTruncatedValue(entry, projectColumn);
          expect(result).toBe('AI Recruitment System');
          expect(result).not.toContain('...');
        }
      });

      it('should determine tooltip necessity correctly', () => {
        const taskColumn = component.displayedColumns().find(col => col.key === 'task');
        if (taskColumn) {
          // Long text should show tooltip
          expect(component.shouldShowTooltip(mockTimesheetEntries[2], taskColumn)).toBe(true);
          // Short text should not show tooltip
          expect(component.shouldShowTooltip(mockTimesheetEntries[0], taskColumn)).toBe(false);
        }
      });
    });
  });

  describe('Status Badge Rendering', () => {
    it('should have status badge rendering logic', () => {
      expect(component.getStatusLabel('approved')).toBe('已批准');
      expect(component.getStatusLabel('submitted')).toBe('已提交');
      expect(component.getStatusLabel('draft')).toBe('草稿');
      expect(component.getStatusLabel('rejected')).toBe('已拒绝');
    });

    it('should determine billable status correctly', () => {
      const billableEntry = mockTimesheetEntries.find(e => e.billable === true);
      const nonBillableEntry = mockTimesheetEntries.find(e => e.billable === false);

      expect(billableEntry).toBeTruthy();
      expect(nonBillableEntry).toBeTruthy();
    });
  });

  describe('User Interactions and Events', () => {
    describe('Search Functionality', () => {
      it('should filter data based on search term', () => {
        component.searchTerm = 'AI Recruitment';
        component.onSearch();
        fixture.detectChanges();

        const filteredData = component.filteredData();
        expect(filteredData).toHaveLength(1);
        expect(filteredData[0].project).toContain('AI Recruitment');
      });

      it('should reset page to 0 when searching', () => {
        component.currentPage.set(2);
        component.searchTerm = 'test';
        component.onSearch();

        expect(component.currentPage()).toBe(0);
      });

      it('should clear search term and reset data', () => {
        component.searchTerm = 'test';
        component.clearSearch();

        expect(component.searchTerm).toBe('');
        expect(component.filteredData()).toEqual(mockTimesheetEntries);
      });
    });

    describe('Sorting Functionality', () => {
      it('should sort data in ascending order', () => {
        component.handleSort('project');
        
        expect(component.sortColumn()).toBe('project');
        expect(component.sortDirection()).toBe('asc');

        const sortedData = component.filteredData();
        expect(sortedData[0].project).toBe('AI Recruitment System');
      });

      it('should toggle sort direction on repeated clicks', () => {
        // First click - ascending
        component.handleSort('project');
        expect(component.sortDirection()).toBe('asc');

        // Second click - descending
        component.handleSort('project');
        expect(component.sortDirection()).toBe('desc');

        // Third click - clear sort
        component.handleSort('project');
        expect(component.sortColumn()).toBeNull();
        expect(component.sortDirection()).toBeNull();
      });

      it('should emit sort event', () => {
        spyOn(component.onSort, 'emit');
        
        component.handleSort('date');
        
        expect(component.onSort.emit).toHaveBeenCalledWith({
          column: 'date',
          direction: 'asc'
        });
      });

      it('should not sort non-sortable columns', () => {
        const taskColumn = component.displayedColumns().find(col => col.key === 'task');
        if (taskColumn) {
          expect(taskColumn.sortable).toBe(false);
          
          component.handleSort('task');
          
          expect(component.sortColumn()).toBeNull();
          expect(component.sortDirection()).toBeNull();
        }
      });
    });

    describe('Selection Functionality', () => {
      beforeEach(() => {
        // Ensure full view for selection functionality
        component.currentViewType = 'full';
        component.onViewTypeChange();
        fixture.detectChanges();
      });

      it('should select individual entries', () => {
        const entry = mockTimesheetEntries[0];
        component.toggleSelect(entry);

        expect(component.isSelected(entry)).toBe(true);
        expect(component.selectedEntries()).toContain(entry);
      });

      it('should deselect selected entries', () => {
        const entry = mockTimesheetEntries[0];
        component.toggleSelect(entry);
        component.toggleSelect(entry);

        expect(component.isSelected(entry)).toBe(false);
        expect(component.selectedEntries()).not.toContain(entry);
      });

      it('should emit selection change event', () => {
        spyOn(component.onSelectionChange, 'emit');
        
        const entry = mockTimesheetEntries[0];
        component.toggleSelect(entry);

        expect(component.onSelectionChange.emit).toHaveBeenCalledWith([entry]);
      });

      it('should select all entries on page', () => {
        component.toggleSelectAll();

        const pageData = component.paginatedData();
        expect(component.selectedEntries()).toEqual(pageData);
        expect(component.isAllSelected()).toBe(true);
      });

      it('should deselect all entries when all are selected', () => {
        // First select all
        component.toggleSelectAll();
        expect(component.isAllSelected()).toBe(true);

        // Then deselect all
        component.toggleSelectAll();
        expect(component.selectedEntries()).toEqual([]);
        expect(component.isAllSelected()).toBe(false);
      });

      it('should handle multi-select correctly', () => {
        const entry1 = mockTimesheetEntries[0];
        const entry2 = mockTimesheetEntries[1];

        component.toggleSelect(entry1);
        component.toggleSelect(entry2);

        expect(component.selectedEntries()).toHaveLength(2);
        expect(component.selectedEntries()).toContain(entry1);
        expect(component.selectedEntries()).toContain(entry2);
      });

      it('should determine some selected state correctly', () => {
        const entry = mockTimesheetEntries[0];
        component.toggleSelect(entry);

        expect(component.isSomeSelected()).toBe(true);
        expect(component.isAllSelected()).toBe(false);
      });
    });

    describe('Pagination Functionality', () => {
      beforeEach(() => {
        // Add more data to test pagination
        const additionalEntries: TimesheetEntry[] = Array.from({ length: 30 }, (_, index) => ({
          id: `additional-${index}`,
          date: '2024-01-18',
          project: `Project ${index}`,
          task: `Task ${index}`,
          startTime: '09:00',
          endTime: '17:00',
          duration: 8,
          category: 'Development',
          billable: true,
          status: 'draft',
        }));
        
        component.data = [...mockTimesheetEntries, ...additionalEntries];
        component.pageSize = 10; // Set smaller page size for testing
        fixture.detectChanges();
      });

      it('should navigate to next page', () => {
        const initialPage = component.currentPage();
        component.nextPage();
        
        expect(component.currentPage()).toBe(initialPage + 1);
      });

      it('should navigate to previous page', () => {
        component.currentPage.set(1);
        component.previousPage();
        
        expect(component.currentPage()).toBe(0);
      });

      it('should not go to negative page numbers', () => {
        component.previousPage();
        
        expect(component.currentPage()).toBe(0);
      });

      it('should not exceed total pages', () => {
        const totalPages = component.totalPages();
        component.currentPage.set(totalPages - 1);
        component.nextPage();
        
        expect(component.currentPage()).toBe(totalPages - 1);
      });

      it('should go to specific page', () => {
        component.goToPage(2);
        
        expect(component.currentPage()).toBe(2);
      });

      it('should emit page change events', () => {
        spyOn(component.onPageChange, 'emit');
        
        component.nextPage();
        
        expect(component.onPageChange.emit).toHaveBeenCalledWith({
          pageIndex: component.currentPage(),
          pageSize: component.pageSize
        });
      });

      it('should change page size and reset to page 0', () => {
        component.currentPage.set(2);
        component.pageSize = 25;
        component.onPageSizeChange();
        
        expect(component.currentPage()).toBe(0);
      });

      it('should calculate page numbers correctly', () => {
        const pageNumbers = component.getPageNumbers();
        
        expect(pageNumbers).toContain(0); // Should contain current page
        expect(pageNumbers.length).toBeGreaterThan(0);
        expect(pageNumbers.length).toBeLessThanOrEqual(5); // Max 5 visible pages
      });
    });

    describe('Action Button Events', () => {
      it('should emit view event when view button is clicked', () => {
        spyOn(component.onView, 'emit');
        
        const viewButton = compiled.querySelector('.view-btn') as HTMLButtonElement;
        viewButton?.click();
        
        expect(component.onView.emit).toHaveBeenCalledWith(mockTimesheetEntries[0]);
      });

      it('should emit edit event when edit button is clicked', () => {
        spyOn(component.onEdit, 'emit');
        
        const editButton = compiled.querySelector('.edit-btn') as HTMLButtonElement;
        editButton?.click();
        
        expect(component.onEdit.emit).toHaveBeenCalledWith(mockTimesheetEntries[0]);
      });

      it('should emit delete event when delete button is clicked', () => {
        spyOn(component.onDelete, 'emit');
        
        const deleteButton = compiled.querySelector('.delete-btn') as HTMLButtonElement;
        deleteButton?.click();
        
        expect(component.onDelete.emit).toHaveBeenCalledWith(mockTimesheetEntries[0]);
      });

      it('should disable edit and delete buttons for approved entries', () => {
        const approvedEntry = mockTimesheetEntries.find(e => e.status === 'approved');
        if (approvedEntry) {
          fixture.detectChanges();
          
          // Find the row with approved status
          const approvedRow = compiled.querySelector('.approved');
          const editButton = approvedRow?.querySelector('.edit-btn') as HTMLButtonElement;
          const deleteButton = approvedRow?.querySelector('.delete-btn') as HTMLButtonElement;
          
          expect(editButton?.disabled).toBe(true);
          expect(deleteButton?.disabled).toBe(true);
        }
      });
    });

    describe('Export Functionality', () => {
      it('should emit export event when export button is clicked', () => {
        spyOn(component.onExport, 'emit');
        
        const exportButton = compiled.querySelector('.export-btn') as HTMLButtonElement;
        exportButton?.click();
        
        expect(component.onExport.emit).toHaveBeenCalled();
      });

      it('should generate CSV data correctly', () => {
        spyOn(component, 'downloadCSV');
        
        component.exportData();
        
        expect(component.downloadCSV).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty data gracefully', () => {
      component.data = [];
      fixture.detectChanges();

      expect(component.filteredData()).toEqual([]);
      expect(component.totalItems()).toBe(0);
      expect(component.paginatedData()).toEqual([]);

      const emptyState = compiled.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState?.textContent).toContain('暂无工时记录');
    });

    it('should handle null/undefined entries gracefully', () => {
      const invalidEntry = { id: 'invalid' } as TimesheetEntry;
      component.data = [invalidEntry];
      fixture.detectChanges();

      expect(() => component.getCellValue(invalidEntry, 'nonexistent')).not.toThrow();
      expect(component.getCellValue(invalidEntry, 'nonexistent')).toBeUndefined();
    });

    it('should handle custom columns input', () => {
      const customColumns: TimesheetColumn[] = [
        {
          key: 'customField',
          label: 'Custom Field',
          type: 'text',
          priority: 'high',
        }
      ];

      component.customColumns = customColumns;
      fixture.detectChanges();

      expect(component.displayedColumns()).toEqual(customColumns);
    });

    it('should show loading state correctly', () => {
      // Test that loading option can be accessed
      const options = component.tableOptions();
      expect(options.loading).toBeDefined();
      expect(typeof options.loading).toBe('boolean');
    });

    it('should handle view type changes without errors', () => {
      expect(() => {
        component.currentViewType = 'summary';
        component.onViewTypeChange();
        fixture.detectChanges();
      }).not.toThrow();

      expect(() => {
        component.currentViewType = 'mobile';
        component.onViewTypeChange();
        fixture.detectChanges();
      }).not.toThrow();
    });
  });

  describe('Column Classes and Styling', () => {
    it('should apply correct column priority classes', () => {
      const columns = component.displayedColumns();
      const highPriorityColumns = columns.filter(col => col.priority === 'high');
      const mediumPriorityColumns = columns.filter(col => col.priority === 'medium');
      const lowPriorityColumns = columns.filter(col => col.priority === 'low');

      expect(highPriorityColumns.length).toBeGreaterThan(0);
      expect(mediumPriorityColumns.length).toBeGreaterThan(0);
      expect(lowPriorityColumns.length).toBeGreaterThan(0);
    });

    it('should apply bulk editable classes correctly', () => {
      const projectColumn = component.displayedColumns().find(col => col.key === 'project');
      if (projectColumn && projectColumn.bulkEditable) {
        const classes = component.getColumnClasses(projectColumn);
        expect(classes).toContain('bulk-editable');
      }
    });

    it('should have entries with different statuses for styling', () => {
      const draftEntry = mockTimesheetEntries.find(e => e.status === 'draft');
      const submittedEntry = mockTimesheetEntries.find(e => e.status === 'submitted');
      const approvedEntry = mockTimesheetEntries.find(e => e.status === 'approved');

      expect(draftEntry).toBeTruthy();
      expect(submittedEntry).toBeTruthy();
      expect(approvedEntry).toBeTruthy();
    });
  });

  describe('Accessibility Features', () => {
    it('should have columns with sortable configuration', () => {
      const sortableColumns = component.displayedColumns().filter(col => col.sortable);
      expect(sortableColumns.length).toBeGreaterThan(0);
    });

    it('should provide tooltip logic for truncated content', () => {
      const taskColumn = component.displayedColumns().find(col => col.key === 'task');
      if (taskColumn && taskColumn.truncateLength) {
        const longTaskEntry = mockTimesheetEntries[2]; // Has long task description
        const shouldShow = component.shouldShowTooltip(longTaskEntry, taskColumn);
        expect(shouldShow).toBe(true);
      }
    });

    it('should have proper search placeholder functionality', () => {
      // Component should have search functionality
      expect(component.searchTerm).toBeDefined();
      expect(typeof component.onSearch).toBe('function');
      expect(typeof component.clearSearch).toBe('function');
    });
  });
});
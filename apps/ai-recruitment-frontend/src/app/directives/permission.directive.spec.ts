import type { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PermissionDirective } from './permission.directive.ts';

@Component({
  template: `
    <div
      *arcPermission="'admin'"
      ;
      let
      userPermissions="['admin', 'user']"
      class="admin-content"
    >
      Admin Content
    </div>
    <div
      *arcPermission="'manager'"
      ;
      let
      userPermissions="['user']"
      class="manager-content"
    >
      Manager Content
    </div>
  `,
  standalone: true,
  imports: [PermissionDirective],
})
class TestComponent {}

@Component({
  template: `
    <ng-container *arcPermission="permission; userPermissions: userPerms">
      <div class="protected-content">Protected Content</div>
    </ng-container>
  `,
  standalone: true,
  imports: [PermissionDirective],
})
class DynamicTestComponent {
  permission = 'admin';
  userPerms = ['user'];
}

describe('PermissionDirective', () => {
  describe('with static permissions', () => {
    let fixture: ComponentFixture<TestComponent>;

    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [TestComponent, PermissionDirective],
      });
      fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();
    });

    it('should show element when user has permission', () => {
      const adminContent = fixture.debugElement.query(By.css('.admin-content'));
      expect(adminContent).toBeTruthy();
    });

    it('should hide element when user lacks permission', () => {
      const managerContent = fixture.debugElement.query(
        By.css('.manager-content'),
      );
      expect(managerContent).toBeFalsy();
    });
  });

  describe('with dynamic permissions', () => {
    let fixture: ComponentFixture<DynamicTestComponent>;
    let component: DynamicTestComponent;

    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [DynamicTestComponent, PermissionDirective],
      });
      fixture = TestBed.createComponent(DynamicTestComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should hide content when permission not in user permissions', () => {
      const protectedContent = fixture.debugElement.query(
        By.css('.protected-content'),
      );
      expect(protectedContent).toBeFalsy();
    });

    it('should show content when permission is granted', () => {
      component.userPerms = ['admin', 'user'];
      fixture.detectChanges();

      const protectedContent = fixture.debugElement.query(
        By.css('.protected-content'),
      );
      expect(protectedContent).toBeTruthy();
    });
  });

  describe('Lifecycle hooks', () => {
    it('should initialize without errors', () => {
      TestBed.configureTestingModule({
        imports: [TestComponent, PermissionDirective],
      });

      expect(() => {
        const fixture = TestBed.createComponent(TestComponent);
        fixture.detectChanges();
      }).not.toThrow();
    });
  });
});

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { VALIDATION_DIRECTIVES } from '../../../directives/validation';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'arc-form-example',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ...VALIDATION_DIRECTIVES,
  ],
  template: `
    <div class="form-example-container">
      <h2>表单验证示例</h2>

      <!-- Template-driven form example -->
      <div class="form-section">
        <h3>模板驱动表单</h3>
        <form
          #templateForm="ngForm"
          (ngSubmit)="onTemplateSubmit(templateForm.value)"
        >
          <div class="form-group">
            <label for="name">姓名 *</label>
            <input
              type="text"
              id="name"
              name="name"
              [(ngModel)]="templateModel.name"
              #nameControl="ngModel"
              arcRequired
              [arcMinLength]="2"
              minLengthMessage="姓名至少需要2个字符"
              class="form-control"
              [class.error]="nameControl.invalid && nameControl.touched"
              [class.success]="nameControl.valid && nameControl.touched"
            />
            <arc-validation-feedback
              [control]="nameControl.control"
              hint="请输入您的真实姓名"
              [showSuccess]="true"
              successMessage="姓名格式正确"
            >
            </arc-validation-feedback>
          </div>

          <div class="form-group">
            <label for="email">邮箱 *</label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="templateModel.email"
              #emailControl="ngModel"
              arcRequired
              arcEmailValidator
              class="form-control"
              [class.error]="emailControl.invalid && emailControl.touched"
              [class.success]="emailControl.valid && emailControl.touched"
            />
            <arc-validation-feedback
              [control]="emailControl.control"
              hint="例如：example@domain.com"
              [showSuccess]="true"
            >
            </arc-validation-feedback>
          </div>

          <div class="form-group">
            <label for="phone">手机号</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              [(ngModel)]="templateModel.phone"
              #phoneControl="ngModel"
              arcPhoneValidator
              class="form-control"
              [class.error]="phoneControl.invalid && phoneControl.touched"
              [class.success]="phoneControl.valid && phoneControl.touched"
            />
            <arc-validation-feedback
              [control]="phoneControl.control"
              hint="支持中国手机号或国际格式"
              [showSuccess]="true"
            >
            </arc-validation-feedback>
          </div>

          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="templateForm.invalid"
          >
            提交模板表单
          </button>
        </form>
      </div>

      <!-- Reactive form example -->
      <div class="form-section">
        <h3>响应式表单</h3>
        <form [formGroup]="reactiveForm" (ngSubmit)="onReactiveSubmit()">
          <div class="form-group">
            <label for="company">公司名称 *</label>
            <input
              type="text"
              id="company"
              formControlName="company"
              class="form-control"
              [class.error]="
                reactiveForm.get('company')?.invalid &&
                reactiveForm.get('company')?.touched
              "
              [class.success]="
                reactiveForm.get('company')?.valid &&
                reactiveForm.get('company')?.touched
              "
            />
            <arc-validation-feedback
              [control]="reactiveForm.get('company')"
              hint="请输入公司全称"
              [showSuccess]="true"
              [customErrors]="{
                required: '公司名称不能为空',
                minlength: '公司名称至少需要2个字符',
              }"
            >
            </arc-validation-feedback>
          </div>

          <div class="form-group">
            <label for="position">职位名称 *</label>
            <input
              type="text"
              id="position"
              formControlName="position"
              class="form-control"
              [class.error]="
                reactiveForm.get('position')?.invalid &&
                reactiveForm.get('position')?.touched
              "
              [class.success]="
                reactiveForm.get('position')?.valid &&
                reactiveForm.get('position')?.touched
              "
            />
            <arc-validation-feedback
              [control]="reactiveForm.get('position')"
              hint="例如：前端工程师、产品经理等"
              [showSuccess]="true"
            >
            </arc-validation-feedback>
          </div>

          <div class="form-group">
            <label for="salary">期望薪资</label>
            <input
              type="number"
              id="salary"
              formControlName="salary"
              class="form-control"
              [class.error]="
                reactiveForm.get('salary')?.invalid &&
                reactiveForm.get('salary')?.touched
              "
              [class.success]="
                reactiveForm.get('salary')?.valid &&
                reactiveForm.get('salary')?.touched
              "
            />
            <arc-validation-feedback
              [control]="reactiveForm.get('salary')"
              hint="请输入月薪范围（单位：元）"
              [showSuccess]="true"
              [customErrors]="{
                min: '薪资不能低于最低工资标准',
                max: '薪资超出合理范围',
              }"
            >
            </arc-validation-feedback>
          </div>

          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="reactiveForm.invalid"
          >
            提交响应式表单
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .form-example-container {
        max-width: 800px;
        margin: 2rem auto;
        padding: 2rem;
      }

      h2 {
        color: #111827;
        font-size: 1.875rem;
        font-weight: 700;
        margin-bottom: 2rem;
        text-align: center;
      }

      .form-section {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 2rem;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }

      h3 {
        color: #374151;
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1.5rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #e5e7eb;
      }

      .form-group {
        margin-bottom: 1.5rem;
      }

      label {
        display: block;
        font-weight: 500;
        color: #374151;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
      }

      .form-control {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 0.875rem;
        transition: all 0.2s;
        outline: none;
      }

      .form-control:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .form-control.error {
        border-color: #ef4444;
        background-color: #fef2f2;
      }

      .form-control.error:focus {
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
      }

      .form-control.success {
        border-color: #10b981;
        background-color: #f0fdf4;
      }

      .form-control.success:focus {
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
      }

      .btn {
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.875rem;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }

      .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .btn-primary:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      @media (max-width: 640px) {
        .form-example-container {
          padding: 1rem;
        }

        .form-section {
          padding: 1rem;
        }
      }
    `,
  ],
})
export class FormExampleComponent {
  // Template-driven form model
  templateModel = {
    name: '',
    email: '',
    phone: '',
  };

  // Reactive form
  reactiveForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private toastService: ToastService,
  ) {
    this.reactiveForm = this.fb.group({
      company: ['', [Validators.required, Validators.minLength(2)]],
      position: ['', [Validators.required, Validators.minLength(2)]],
      salary: [null, [Validators.min(2000), Validators.max(100000)]],
    });
  }

  onTemplateSubmit(value: any): void {
    this.toastService.success('模板表单提交成功！');
    console.log('Template form value:', value);
  }

  onReactiveSubmit(): void {
    if (this.reactiveForm.valid) {
      this.toastService.success('响应式表单提交成功！');
      console.log('Reactive form value:', this.reactiveForm.value);
    } else {
      this.toastService.warning('请先修正表单错误');
    }
  }
}

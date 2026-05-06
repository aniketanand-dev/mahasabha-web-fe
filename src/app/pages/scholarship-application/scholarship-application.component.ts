import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { AbstractControl, ReactiveFormsModule, ValidationErrors, ValidatorFn, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';
import {
  ScholarshipAcademicYearOption,
  ScholarshipApplicationFiles,
  ScholarshipApplicationPayload,
  ScholarshipService,
  ScholarshipSubmissionResponse,
} from '../../services/scholarship.service';
import { STATE_DISTRICT_TALUKS, STATE_OPTIONS } from '../../data/address-data';

type UploadField = 'profilePhoto' | 'casteCertificate' | 'marksCard' | 'aadhaarCard';
type UploadPreviewKind = 'image' | 'file';

interface UploadState {
  file: File | null;
  previewUrl: string | null;
}

const IMAGE_UPLOAD_MIN_BYTES = 200 * 1024;
const IMAGE_UPLOAD_MAX_BYTES = 1024 * 1024;
const IMAGE_UPLOAD_MIN_WIDTH = 1200;
const IMAGE_UPLOAD_MAX_WIDTH = 1600;
const IMAGE_UPLOAD_MIN_HEIGHT = 900;
const IMAGE_UPLOAD_MAX_HEIGHT = 1200;
const IMAGE_UPLOAD_REQUIREMENTS_MESSAGE = 'Upload an image between 200 KB and 1 MB with resolution from 1200 x 900 px to 1600 x 1200 px. If scanned, use 150-300 DPI so the text stays readable.';

const otherValueRequiredValidator = (
  selectorControlName: string,
  triggerValue: string,
  targetControlName: string,
): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const selectedValue = String(control.get(selectorControlName)?.value || '').trim();
    const targetValue = String(control.get(targetControlName)?.value || '').trim();

    if (selectedValue === triggerValue && !targetValue) {
      return { [targetControlName]: true };
    }

    return null;
  };
};

const marksValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const marksObtained = Number(control.get('marksObtained')?.value);
  const totalMarks = Number(control.get('totalMarks')?.value);

  if (!Number.isFinite(marksObtained) || !Number.isFinite(totalMarks) || totalMarks <= 0) {
    return null;
  }

  if (marksObtained > totalMarks) {
    return { marksExceeded: true };
  }

  return null;
};

const createAcademicYearLabel = (startYear: number): string => `AY-${startYear}-${startYear + 1}`;

const getDefaultAcademicYearLabel = (referenceDate = new Date()): string => {
  const startYear = referenceDate.getMonth() < 5
    ? referenceDate.getFullYear() - 1
    : referenceDate.getFullYear();

  return createAcademicYearLabel(startYear);
};

const minimumPercentageValidator = (minimumPercentage: number): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const marksObtained = Number(control.get('marksObtained')?.value);
    const totalMarks = Number(control.get('totalMarks')?.value);

    if (!Number.isFinite(marksObtained) || !Number.isFinite(totalMarks) || totalMarks <= 0 || marksObtained > totalMarks) {
      return null;
    }

    const percentage = (marksObtained / totalMarks) * 100;
    return percentage < minimumPercentage ? { minimumPercentage: true } : null;
  };
};

const MEMBER_CATEGORY_OPTIONS = [
  { value: 'Life Member', label: 'Life Member - Rs250' },
  { value: 'Ashrayadataru', label: 'Ashrayadataru - Rs1,000' },
  { value: 'Upaposhakaru', label: 'Upaposhakaru - Rs2,500' },
  { value: 'Sahaposhakaru', label: 'Sahaposhakaru - Rs5,000' },
  { value: 'Institutional Member', label: 'Institutional Member - Rs5,000' },
  { value: 'Poshakaru', label: 'Poshakaru - Rs10,000' },
  { value: 'Mahaposhakaru', label: 'Mahaposhakaru - Rs25,000' },
  { value: 'Danigalu', label: 'Danigalu - Rs50,000' },
  { value: 'Mahadanigalu', label: 'Mahadanigalu - Rs1,00,000' },
  { value: 'Danashiromanigalu', label: 'Danashiromanigalu - Rs2,50,000' },
  { value: 'Dasohigalu', label: 'Dasohigalu - Rs5,00,000' },
  { value: 'Mahadasohigalu', label: 'Mahadasohigalu - Rs10,00,000' },
  { value: 'Paramadasohigalu', label: 'Paramadasohigalu - Rs25,00,000' },
] as const;

@Component({
  selector: 'app-scholarship-application',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './scholarship-application.component.html',
  styleUrl: './scholarship-application.component.scss'
})
export class ScholarshipApplicationComponent {
  private static readonly MINIMUM_PERCENTAGE = 90;

  private readonly fb = inject(FormBuilder);
  private readonly scholarshipService = inject(ScholarshipService);
  private readonly destroyRef = inject(DestroyRef);

  readonly fallbackAcademicYearLabel = getDefaultAcademicYearLabel();
  readonly academicYearOptions = signal<ScholarshipAcademicYearOption[]>([]);
  readonly boardOptions = ['state', 'ICSE', 'CBSE'];
  readonly standardOptions = ['10th', '12th'];
  readonly genderOptions = ['Male', 'Female', 'Other'];
  readonly stateOptions = [...STATE_OPTIONS];
  readonly memberCategoryOptions = [...MEMBER_CATEGORY_OPTIONS];

  readonly form = this.fb.group(
    {
      academicYearId: ['', [Validators.required]],
      registrationNo: ['', [Validators.required, Validators.maxLength(40)]],
      firstName: ['', [Validators.required, Validators.maxLength(60)]],
      middleName: ['', [Validators.maxLength(60)]],
      lastName: ['', [Validators.required, Validators.maxLength(60)]],
      gender: ['', Validators.required],
      fatherName: ['', [Validators.required, Validators.maxLength(120)]],
      motherName: ['', [Validators.required, Validators.maxLength(120)]],
      mobile: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      emailId: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
      village: ['', [Validators.required, Validators.maxLength(120)]],
      taluk: ['', [Validators.required, Validators.maxLength(120)]],
      district: ['', [Validators.required, Validators.maxLength(120)]],
      state: ['', [Validators.required, Validators.maxLength(120)]],
      pinCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      aadhaarNumber: ['', [Validators.required, Validators.pattern(/^\d{12}$/)]],
      board: ['', Validators.required],
      otherBoard: [''],
      standard: ['', Validators.required],
      marksObtained: [null as number | null, [Validators.required, Validators.min(0), Validators.max(9999), Validators.pattern(/^\d{1,4}$/)]],
      totalMarks: [null as number | null, [Validators.required, Validators.min(1), Validators.max(9999), Validators.pattern(/^\d{1,4}$/)]],
      heardFromMember: [false],
      referringMemberCategory: [''],
      referringMemberName: [''],
      referringMemberRegistrationNo: ['', [Validators.maxLength(40)]],
      termsAccepted: [false, Validators.requiredTrue],
      declarationAccepted: [false, Validators.requiredTrue],
    },
    {
      validators: [
        otherValueRequiredValidator('board', 'Other', 'otherBoard'),
        marksValidator,
        minimumPercentageValidator(ScholarshipApplicationComponent.MINIMUM_PERCENTAGE),
      ],
    },
  );

  readonly previewMode = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal('');
  readonly submitSuccess = signal<ScholarshipSubmissionResponse | null>(null);
  readonly percentage = signal<number | null>(null);
  readonly registrationChecking = signal(false);
  readonly registrationStatusMessage = signal('');
  readonly imagePreviewSrc = signal<string | null>(null);
  readonly imagePreviewAlt = signal('Preview image');
  readonly imagePreviewKind = signal<UploadPreviewKind>('image');
  readonly uploadTypeErrors = signal<Record<UploadField, string>>({
    profilePhoto: '',
    casteCertificate: '',
    marksCard: '',
    aadhaarCard: '',
  });

  readonly uploads: Record<UploadField, UploadState> = {
    profilePhoto: { file: null, previewUrl: null },
    casteCertificate: { file: null, previewUrl: null },
    marksCard: { file: null, previewUrl: null },
    aadhaarCard: { file: null, previewUrl: null },
  };

  constructor() {
    this.onStateChanged();
    this.onHeardFromMemberChanged();
    void this.loadAcademicYears();
    this.destroyRef.onDestroy(() => {
      this.revokeAllObjectUrls();
    });
  }

  get selectedBoard(): string {
    return String(this.form.controls.board.value || '');
  }

  get selectedAcademicYearId(): string {
    return String(this.form.controls.academicYearId.value || '').trim();
  }

  get selectedAcademicYearLabel(): string {
    const selectedAcademicYear = this.academicYearOptions().find((year) => year._id === this.selectedAcademicYearId);
    return selectedAcademicYear?.label || this.fallbackAcademicYearLabel;
  }

  get selectedStandard(): string {
    return String(this.form.controls.standard.value || '');
  }

  get selectedDistrict(): string {
    return String(this.form.controls.district.value || '');
  }

  get selectedState(): string {
    return String(this.form.controls.state.value || '');
  }

  get districtOptions(): string[] {
    return Object.keys(STATE_DISTRICT_TALUKS[this.selectedState] || {});
  }

  get heardFromMemberSelected(): boolean {
    return !!this.form.controls.heardFromMember.value;
  }

  get talukOptions(): string[] {
    return STATE_DISTRICT_TALUKS[this.selectedState]?.[this.selectedDistrict] || [];
  }

  get isReadyForPreview(): boolean {
    return this.form.valid
      && this.hasAllUploads()
      && this.percentage() !== null;
  }

  get minimumPercentage(): number {
    return ScholarshipApplicationComponent.MINIMUM_PERCENTAGE;
  }

  updatePercentage(): void {
    const marksObtained = Number(this.form.controls.marksObtained.value);
    const totalMarks = Number(this.form.controls.totalMarks.value);

    if (!Number.isFinite(marksObtained) || !Number.isFinite(totalMarks) || totalMarks <= 0 || marksObtained > totalMarks) {
      this.percentage.set(null);
      return;
    }

    this.percentage.set(Number(((marksObtained / totalMarks) * 100).toFixed(2)));
  }

  async onFileSelected(field: UploadField, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    this.revokeObjectUrl(field);

    if (file && !this.isImageFile(file)) {
      this.uploads[field].file = null;
      this.uploads[field].previewUrl = null;
      this.setUploadTypeError(field, 'Only image files are allowed.');
      input.value = '';
      return;
    }

    if (file) {
      const imageValidationError = await this.validateImageUpload(file);

      if (imageValidationError) {
        this.uploads[field].file = null;
        this.uploads[field].previewUrl = null;
        this.setUploadTypeError(field, imageValidationError);
        input.value = '';
        return;
      }
    }

    this.setUploadTypeError(field, '');
    this.uploads[field].file = file;
    this.uploads[field].previewUrl = file && this.fileSupportsPreview(file) ? URL.createObjectURL(file) : null;
  }

  fileName(field: UploadField): string {
    return this.uploads[field].file?.name || '';
  }

  previewUrl(field: UploadField): string | null {
    return this.uploads[field].previewUrl;
  }

  previewKind(field: UploadField): UploadPreviewKind {
    return this.filePreviewKind(this.uploads[field].file);
  }

  controlHasError(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  groupHasError(errorName: string): boolean {
    return !!this.form.errors?.[errorName] && (this.form.dirty || this.form.touched);
  }

  hasUploadError(field: UploadField): boolean {
    return !this.uploads[field].file && (this.form.dirty || this.form.touched);
  }

  uploadTypeError(field: UploadField): string {
    return this.uploadTypeErrors()[field] || '';
  }

  imageUploadRequirementsMessage(): string {
    return IMAGE_UPLOAD_REQUIREMENTS_MESSAGE;
  }

  onAadhaarNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const normalizedValue = input.value.replace(/\D/g, '').slice(0, 12);

    if (input.value !== normalizedValue) {
      input.value = normalizedValue;
    }

    this.form.controls.aadhaarNumber.setValue(normalizedValue, { emitEvent: false });
  }

  onDistrictChanged(): void {
    this.form.controls.taluk.setValue('');
  }

  onStateChanged(): void {
    this.form.controls.district.setValue('');
    this.form.controls.taluk.setValue('');
  }

  onRegistrationNumberChanged(): void {
    this.registrationStatusMessage.set('');
    this.clearControlError(this.form.controls.registrationNo, 'registrationUnavailable');
    this.submitError.set('');
  }

  onAcademicYearChanged(): void {
    this.onRegistrationNumberChanged();
  }

  async onRegistrationNumberBlur(): Promise<void> {
    await this.checkRegistrationAvailability();
  }

  onHeardFromMemberChanged(): void {
    const categoryControl = this.form.controls.referringMemberCategory;
    const nameControl = this.form.controls.referringMemberName;
    const registrationControl = this.form.controls.referringMemberRegistrationNo;

    if (this.heardFromMemberSelected) {
      categoryControl.setValidators([Validators.required]);
      nameControl.setValidators([Validators.required, Validators.maxLength(120)]);
      registrationControl.setValidators([Validators.required, Validators.maxLength(40)]);
    } else {
      categoryControl.clearValidators();
      nameControl.clearValidators();
      registrationControl.setValidators([Validators.maxLength(40)]);
      categoryControl.setValue('');
      nameControl.setValue('');
      registrationControl.setValue('');
      this.clearControlError(categoryControl, 'required');
      this.clearControlError(nameControl, 'required');
      this.clearControlError(registrationControl, 'required');
    }

    categoryControl.updateValueAndValidity({ emitEvent: false });
    nameControl.updateValueAndValidity({ emitEvent: false });
    registrationControl.updateValueAndValidity({ emitEvent: false });
  }

  onMarksInput(controlName: 'marksObtained' | 'totalMarks', event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 4);

    input.value = digits;
    this.form.controls[controlName].setValue(digits ? Number(digits) : null);
    this.updatePercentage();
  }

  openImagePreview(src: string, alt: string, kind: UploadPreviewKind = 'image'): void {
    if (!src) {
      return;
    }

    this.imagePreviewSrc.set(src);
    this.imagePreviewAlt.set(alt || 'Preview image');
    this.imagePreviewKind.set(kind);
    document.body.style.overflow = 'hidden';
  }

  closeImagePreview(): void {
    this.imagePreviewSrc.set(null);
    this.imagePreviewKind.set('image');
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.imagePreviewSrc()) {
      this.closeImagePreview();
    }
  }

  async goToPreview(): Promise<void> {
    this.submitError.set('');
    this.form.markAllAsTouched();
    this.updatePercentage();

    if (this.form.errors?.['minimumPercentage']) {
      this.submitError.set(`Only students with ${this.minimumPercentage}% or above are eligible to submit this scholarship application.`);
      this.scrollToFirstError();
      return;
    }

    if (!this.isReadyForPreview) {
      this.scrollToFirstError();
      return;
    }

    const isRegistrationAvailable = await this.checkRegistrationAvailability();
    if (!isRegistrationAvailable) {
      this.scrollToFirstError();
      return;
    }

    this.previewMode.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  editApplication(): void {
    this.previewMode.set(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async submitApplication(): Promise<void> {
    this.updatePercentage();

    if (this.form.errors?.['minimumPercentage']) {
      this.submitError.set(`Only students with ${this.minimumPercentage}% or above are eligible to submit this scholarship application.`);
      return;
    }

    if (!this.isReadyForPreview) {
      return;
    }

    this.submitting.set(true);
    this.submitError.set('');

    try {
      const response = await this.scholarshipService.submitApplication(this.buildPayload(), this.buildFiles());
      this.submitSuccess.set(response);
      this.previewMode.set(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      const message = error instanceof Error && error.message.trim()
        ? error.message
        : 'Unable to submit the application right now. Please check the form and try again.';

      if (message === 'An application already exists for this registration number') {
        this.previewMode.set(false);
        this.registrationStatusMessage.set(message);
        this.setControlError(this.form.controls.registrationNo, 'registrationUnavailable');
        this.scrollToFirstError();
      }

      this.submitError.set(message);
    } finally {
      this.submitting.set(false);
    }
  }

  memberCategoryPreviewLabel(): string {
    const selectedValue = String(this.form.controls.referringMemberCategory.value || '').trim();
    const selectedOption = this.memberCategoryOptions.find((option) => option.value === selectedValue);
    return selectedOption?.label || selectedValue;
  }

  boardPreviewLabel(): string {
    return this.selectedBoard === 'Other'
      ? String(this.form.controls.otherBoard.value || '').trim()
      : this.selectedBoard;
  }

  standardPreviewLabel(): string {
    return this.selectedStandard;
  }

  private buildPayload(): ScholarshipApplicationPayload {
    return {
      academicYearId: this.selectedAcademicYearId,
      registrationNo: String(this.form.controls.registrationNo.value || '').trim(),
      firstName: String(this.form.controls.firstName.value || '').trim(),
      middleName: String(this.form.controls.middleName.value || '').trim(),
      lastName: String(this.form.controls.lastName.value || '').trim(),
      gender: String(this.form.controls.gender.value || '').trim(),
      fatherName: String(this.form.controls.fatherName.value || '').trim(),
      motherName: String(this.form.controls.motherName.value || '').trim(),
      mobile: String(this.form.controls.mobile.value || '').trim(),
      emailId: String(this.form.controls.emailId.value || '').trim(),
      village: String(this.form.controls.village.value || '').trim(),
      taluk: String(this.form.controls.taluk.value || '').trim(),
      district: String(this.form.controls.district.value || '').trim(),
      state: String(this.form.controls.state.value || '').trim(),
      pinCode: String(this.form.controls.pinCode.value || '').trim(),
      aadhaarNumber: String(this.form.controls.aadhaarNumber.value || '').trim(),
      board: this.selectedBoard,
      otherBoard: String(this.form.controls.otherBoard.value || '').trim(),
      standard: this.selectedStandard,
      otherStandard: '',
      marksObtained: Number(this.form.controls.marksObtained.value),
      totalMarks: Number(this.form.controls.totalMarks.value),
      percentage: Number(this.percentage()),
      heardFromMember: !!this.form.controls.heardFromMember.value,
      referringMemberCategory: String(this.form.controls.referringMemberCategory.value || '').trim(),
      referringMemberName: String(this.form.controls.referringMemberName.value || '').trim(),
      referringMemberRegistrationNo: String(this.form.controls.referringMemberRegistrationNo.value || '').trim(),
      termsAccepted: !!this.form.controls.termsAccepted.value,
      declarationAccepted: !!this.form.controls.declarationAccepted.value,
    };
  }

  private buildFiles(): ScholarshipApplicationFiles {
    return {
      profilePhoto: this.uploads.profilePhoto.file as File,
      casteCertificate: this.uploads.casteCertificate.file as File,
      marksCard: this.uploads.marksCard.file as File,
      aadhaarCard: this.uploads.aadhaarCard.file as File,
    };
  }

  private hasAllUploads(): boolean {
    return Object.values(this.uploads).every((upload) => !!upload.file);
  }

  private revokeObjectUrl(field: UploadField): void {
    const previewUrl = this.uploads[field].previewUrl;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }

  private fileSupportsPreview(file: File | null): boolean {
    return this.filePreviewKind(file) !== 'file';
  }

  private filePreviewKind(file: File | null): UploadPreviewKind {
    const mimeType = String(file?.type || '').toLowerCase();

    if (mimeType.startsWith('image/')) {
      return 'image';
    }

    return 'file';
  }

  private isImageFile(file: File | null): boolean {
    return String(file?.type || '').toLowerCase().startsWith('image/');
  }

  private async validateImageUpload(file: File): Promise<string> {
    if (file.size < IMAGE_UPLOAD_MIN_BYTES || file.size > IMAGE_UPLOAD_MAX_BYTES) {
      return IMAGE_UPLOAD_REQUIREMENTS_MESSAGE;
    }

    try {
      const { width, height } = await this.readImageDimensions(file);

      if (
        width < IMAGE_UPLOAD_MIN_WIDTH
        || width > IMAGE_UPLOAD_MAX_WIDTH
        || height < IMAGE_UPLOAD_MIN_HEIGHT
        || height > IMAGE_UPLOAD_MAX_HEIGHT
      ) {
        return IMAGE_UPLOAD_REQUIREMENTS_MESSAGE;
      }
    } catch {
      return 'Unable to read the selected image. Please upload a valid image file.';
    }

    return '';
  }

  private readImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        const dimensions = {
          width: image.naturalWidth,
          height: image.naturalHeight,
        };

        URL.revokeObjectURL(objectUrl);
        resolve(dimensions);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Invalid image'));
      };

      image.src = objectUrl;
    });
  }

  private setUploadTypeError(field: UploadField, message: string): void {
    this.uploadTypeErrors.update((current) => ({
      ...current,
      [field]: message,
    }));
  }

  private revokeAllObjectUrls(): void {
    (Object.keys(this.uploads) as UploadField[]).forEach((field) => this.revokeObjectUrl(field));
  }

  private async checkRegistrationAvailability(): Promise<boolean> {
    const academicYearControl = this.form.controls.academicYearId;
    const control = this.form.controls.registrationNo;
    const academicYearId = this.selectedAcademicYearId;
    const registrationNo = String(control.value || '').trim();

    this.registrationStatusMessage.set('');
    this.clearControlError(control, 'registrationUnavailable');

    if (!academicYearId || academicYearControl.invalid || !registrationNo || control.hasError('required') || control.hasError('maxlength')) {
      return false;
    }

    this.registrationChecking.set(true);

    try {
      const response = await this.scholarshipService.checkRegistrationAvailability(registrationNo, academicYearId);
      if (!response.available) {
        this.registrationStatusMessage.set(response.message);
        this.setControlError(control, 'registrationUnavailable');
        return false;
      }

      this.registrationStatusMessage.set('Registration number is available.');
      return true;
    } catch (error) {
      const message = error instanceof Error && error.message.trim()
        ? error.message
        : 'Unable to verify the registration number right now.';
      this.submitError.set(message);
      return false;
    } finally {
      this.registrationChecking.set(false);
    }
  }

  private async loadAcademicYears(): Promise<void> {
    try {
      const academicYears = await this.scholarshipService.getAcademicYears();
      this.academicYearOptions.set(academicYears);

      const preferredAcademicYear = academicYears.find((year) => year.label === this.fallbackAcademicYearLabel) || academicYears[0] || null;
      this.form.controls.academicYearId.setValue(preferredAcademicYear?._id || '');
      this.onAcademicYearChanged();
    } catch {
      this.academicYearOptions.set([]);
      this.form.controls.academicYearId.setValue('');
    }
  }

  private setControlError(control: AbstractControl, errorName: string): void {
    control.setErrors({ ...(control.errors || {}), [errorName]: true });
  }

  private clearControlError(control: AbstractControl, errorName: string): void {
    if (!control.errors?.[errorName]) {
      return;
    }

    const { [errorName]: _removed, ...remainingErrors } = control.errors;
    control.setErrors(Object.keys(remainingErrors).length ? remainingErrors : null);
  }

  private scrollToFirstError(): void {
    window.requestAnimationFrame(() => {
      const invalidInput = document.querySelector<HTMLElement>('.application-form input.ng-invalid, .application-form textarea.ng-invalid, .application-form select.ng-invalid');
      if (invalidInput) {
        invalidInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        invalidInput.focus({ preventScroll: true });
        return;
      }

      const fileOrGroupError = document.querySelector<HTMLElement>('.application-form .upload-field small, .application-form .full-error, .application-form .submit-error, .application-form .choice-group small');
      if (fileOrGroupError) {
        fileOrGroupError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
}

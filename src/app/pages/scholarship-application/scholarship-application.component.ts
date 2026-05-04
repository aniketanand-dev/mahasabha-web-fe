import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { AbstractControl, ReactiveFormsModule, ValidationErrors, ValidatorFn, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';
import {
  AadhaarPreviewResponse,
  ScholarshipAcademicYearOption,
  ScholarshipApplicationFiles,
  ScholarshipApplicationPayload,
  ScholarshipService,
  ScholarshipSubmissionResponse,
} from '../../services/scholarship.service';

type UploadField = 'profilePhoto' | 'casteCertificate' | 'marksCard' | 'aadhaarOfflineFile';

interface UploadState {
  file: File | null;
  previewUrl: string | null;
}

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

const KARNATAKA_DISTRICTS = [
  'Bagalkote',
  'Ballari',
  'Belagavi',
  'Bengaluru Rural',
  'Bengaluru Urban',
  'Bidar',
  'Chamarajanagara',
  'Chikkaballapura',
  'Chikkamagaluru',
  'Chitradurga',
  'Dakshina Kannada',
  'Davanagere',
  'Dharwad',
  'Gadag',
  'Hassan',
  'Haveri',
  'Kalaburagi',
  'Kodagu',
  'Kolar',
  'Koppal',
  'Mandya',
  'Mysuru',
  'Raichur',
  'Ramanagara',
  'Shivamogga',
  'Tumakuru',
  'Udupi',
  'Uttara Kannada',
  'Vijayapura',
  'Yadgir',
  'Vijayanagara',
] as const;

const KARNATAKA_TALUKS: Record<string, string[]> = {
  Bagalkote: ['Bagalkote', 'Badami', 'Bilgi', 'Hungund', 'Jamakhandi', 'Mudhol', 'Rabkavi Banhatti'],
  Ballari: ['Ballari', 'Hadagali', 'Kampli', 'Kurugodu', 'Sanduru', 'Hagaribommanahalli', 'Harapanahalli'],
  Belagavi: ['Athani', 'Bailahongal', 'Belagavi', 'Chikkodi', 'Gokak', 'Khanapur', 'Kittur', 'Mudalgi', 'Nipani', 'Ramdurg', 'Saundatti'],
  'Bengaluru Rural': ['Devanahalli', 'Doddaballapur', 'Hoskote', 'Nelamangala', 'Sidlaghatta'],
  'Bengaluru Urban': ['Anekal', 'Bangalore East', 'Bangalore North', 'Bangalore South', 'Bangalore West', 'Chickpet', 'Dasarahalli', 'Kengeri', 'Krishnarajapura', 'Yelahanka'],
  Bidar: ['Aurad', 'Bidar', 'Bhalki', 'Humnabad', 'Kamalnagar', 'Basavakalyan'],
  Chamarajanagara: ['Chamarajanagar', 'Gundlupet', 'Kollegal', 'Yelandur', 'Nanjangud'],
  Chikkaballapura: ['Bagepalli', 'Chikkaballapura', 'Chintamani', 'Gowribidanur', 'Gudibanda', 'Sidlaghatta'],
  Chikkamagaluru: ['Chikkamagaluru', 'Kadur', 'Koppa', 'Mudigere', 'Narasimharajapura', 'Sringeri', 'Tarikere'],
  Chitradurga: ['Challakere', 'Chitradurga', 'Hiriyur', 'Holalkere', 'Hosadurga', 'Molakalmuru'],
  'Dakshina Kannada': ['Mangaluru', 'Bantwal', 'Puttur', 'Sullia', 'Belthangady'],
  Davanagere: ['Channagiri', 'Davanagere', 'Harihar', 'Honnali', 'Jagalur', 'Nyamathi'],
  Dharwad: ['Dharwad', 'Hubli', 'Kalghatgi', 'Kundgol', 'Navalgund'],
  Gadag: ['Gadag', 'Nargund', 'Ron', 'Shirhatti', 'Lakshmeshwar'],
  Hassan: ['Arsikere', 'Belur', 'Channarayapatna', 'Hassan', 'Holenarasipura', 'Sakleshpura', 'Shravanabelagola', 'Arkalgud'],
  Haveri: ['Byadgi', 'Haveri', 'Hirekerur', 'Hanagal', 'Ranebennur', 'Savanur'],
  Kalaburagi: ['Afzalpur', 'Aland', 'Chincholi', 'Kalaburagi', 'Jevargi', 'Sedam', 'Shahabad'],
  Kodagu: ['Madikeri', 'Somvarpet', 'Virajpet'],
  Kolar: ['Bangarapet', 'Kolar', 'Malur', 'Mulbagal', 'Srinivaspur', 'Vemagal', 'KGF'],
  Koppal: ['Koppal', 'Gangavati', 'Yelburga', 'Kustagi'],
  Mandya: ['Krishnarajpet', 'Maddur', 'Malavalli', 'Mandya', 'Nagamangala', 'Pandavapura', 'Srirangapatna'],
  Mysuru: ['Hunsur', 'H.D. Kote', 'Krishnarajanagara', 'Mysuru', 'Nanjangud', 'Periyapatna', 'Tirumakudalu Narasipura'],
  Raichur: ['Deodurg', 'Lingsugur', 'Manvi', 'Raichur', 'Sindhanur', 'Devadurga'],
  Ramanagara: ['Channapatna', 'Kanakapura', 'Magadi', 'Ramanagara'],
  Shivamogga: ['Bhadravati', 'Hosanagara', 'Sagar', 'Shikarpur', 'Shivamogga', 'Sorab', 'Thirthahalli'],
  Tumakuru: ['Chikkanayakanahalli', 'Gubbi', 'Koratagere', 'Kunigal', 'Madhugiri', 'Pavagada', 'Sira', 'Tiptur', 'Tumakuru', 'Turuvekere'],
  Udupi: ['Byndoor', 'Karkala', 'Kundapura', 'Udupi', 'Brahmavar'],
  'Uttara Kannada': ['Karwar', 'Ankola', 'Bhatkal', 'Honnavar', 'Kumta', 'Sirsi', 'Siddapur', 'Yellapur', 'Haliyal', 'Mundgod', 'Joida'],
  Vijayapura: ['Vijayapura', 'Basavan Bagevadi', 'Muddebihal', 'Sindgi', 'Indi'],
  Yadgir: ['Shorapur', 'Yadgir', 'Shahpur', 'Surpur'],
  Vijayanagara: ['Hospet', 'Hagaribommanahalli', 'Harapanahalli', 'Kudligi'],
};

const MEMBER_CATEGORY_OPTIONS = [
  { value: 'Life Member', label: 'Life Member - Rs250' },
  { value: 'Ashrayadataru', label: 'Ashrayadataru - Rs1,000' },
  { value: 'Upaposhakaru', label: 'Upaposhakaru - Rs2,500' },
  { value: 'Sahaposhakaru', label: 'Sahaposhakaru - Rs5,000' },
  { value: 'District Committee Member', label: 'District Committee Member' },
  { value: 'Mahadanigalu', label: 'Mahadanigalu - Rs1,00,000' },
  { value: 'Danashiromanigalu', label: 'Danashiromanigalu - Rs2,50,000' },
  { value: 'Dasohigalu', label: 'Dasohigalu - Rs5,00,000' },
  { value: 'Mahadasohigalu', label: 'Mahadasohigalu - Rs10,00,000' },
  { value: 'Paramadasohigalu', label: 'Paramadasohigalu - Rs25,00,000' },
  { value: 'Institutional Member', label: 'Institutional Member - Rs5,000' },
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
  readonly districtOptions = [...KARNATAKA_DISTRICTS];
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
      state: ['Karnataka', [Validators.required, Validators.maxLength(120)]],
      pinCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      aadhaarNumber: ['', [Validators.required, Validators.pattern(/^\d{12}$/)]],
      aadhaarShareCode: ['', [Validators.required, Validators.pattern(/^\S{4,32}$/)]],
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
  readonly aadhaarPreview = signal<AadhaarPreviewResponse | null>(null);
  readonly aadhaarLoading = signal(false);
  readonly aadhaarError = signal('');
  readonly aadhaarWarning = signal('');
  readonly aadhaarGuideOpen = signal(false);
  readonly imagePreviewSrc = signal<string | null>(null);
  readonly imagePreviewAlt = signal('Preview image');

  readonly uploads: Record<UploadField, UploadState> = {
    profilePhoto: { file: null, previewUrl: null },
    casteCertificate: { file: null, previewUrl: null },
    marksCard: { file: null, previewUrl: null },
    aadhaarOfflineFile: { file: null, previewUrl: null },
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

  get shouldUseKarnatakaAddressData(): boolean {
    return true;
  }

  get heardFromMemberSelected(): boolean {
    return !!this.form.controls.heardFromMember.value;
  }

  get talukOptions(): string[] {
    if (!this.shouldUseKarnatakaAddressData) {
      return [];
    }

    return KARNATAKA_TALUKS[this.selectedDistrict] || [];
  }

  get hasAadhaarMismatch(): boolean {
    return !!this.aadhaarWarning();
  }

  get isReadyForPreview(): boolean {
    return this.form.valid
      && this.hasAllUploads()
      && this.percentage() !== null
      && this.aadhaarPreview() !== null
      && !this.hasAadhaarMismatch;
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

  onFileSelected(field: UploadField, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    this.revokeObjectUrl(field);
    this.uploads[field].file = file;
    this.uploads[field].previewUrl = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

    if (field === 'aadhaarOfflineFile') {
      this.clearAadhaarPreview();
    }
  }

  fileName(field: UploadField): string {
    return this.uploads[field].file?.name || '';
  }

  previewUrl(field: UploadField): string | null {
    return this.uploads[field].previewUrl;
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

  onAadhaarShareCodeChanged(): void {
    this.clearAadhaarPreview();
  }

  onAadhaarNumberChanged(): void {
    this.aadhaarWarning.set('');

    if (this.aadhaarPreview()) {
      this.updateAadhaarWarning(this.aadhaarPreview()!.referenceId);
    }
  }

  onDistrictChanged(): void {
    this.form.controls.taluk.setValue('');
    this.form.controls.taluk.markAsTouched();
  }

  onStateChanged(): void {
    this.form.controls.state.setValue('Karnataka');
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

  toggleAadhaarGuide(): void {
    this.aadhaarGuideOpen.update((isOpen) => !isOpen);
  }

  openImagePreview(src: string, alt: string): void {
    if (!src) {
      return;
    }

    this.imagePreviewSrc.set(src);
    this.imagePreviewAlt.set(alt || 'Preview image');
    document.body.style.overflow = 'hidden';
  }

  closeImagePreview(): void {
    this.imagePreviewSrc.set(null);
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.imagePreviewSrc()) {
      this.closeImagePreview();
    }
  }

  async fetchAadhaarData(): Promise<void> {
    const aadhaarFile = this.uploads.aadhaarOfflineFile.file;
    const aadhaarShareCode = String(this.form.controls.aadhaarShareCode.value || '').trim();

    this.aadhaarError.set('');
    this.aadhaarWarning.set('');
    this.form.controls.aadhaarShareCode.markAsTouched();

    if (!aadhaarFile) {
      this.aadhaarError.set('Upload the UIDAI Aadhaar offline ZIP or XML file first.');
      return;
    }

    if (this.form.controls.aadhaarShareCode.invalid) {
      this.aadhaarError.set('Enter the Aadhaar share code exactly as used while downloading the file.');
      return;
    }

    this.aadhaarLoading.set(true);

    try {
      const preview = await this.scholarshipService.previewAadhaarData(aadhaarFile, aadhaarShareCode);
      this.aadhaarPreview.set(preview);
      this.applyAadhaarName(preview.name);
      this.updateAadhaarWarning(preview.referenceId);
    } catch {
      this.aadhaarPreview.set(null);
      this.aadhaarError.set('Unable to fetch Aadhaar details. Please verify the share code and uploaded file.');
    } finally {
      this.aadhaarLoading.set(false);
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

    if (this.hasAadhaarMismatch) {
      this.submitError.set('Please enter the correct Aadhaar number. It must match the uploaded offline eKYC reference before submission.');
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

  maskedReferenceId(): string {
    const referenceId = this.aadhaarPreview()?.referenceId || '';

    if (!referenceId) {
      return '';
    }

    return `${referenceId.slice(0, 4)}-${referenceId.slice(4)}`;
  }

  formattedEnteredAadhaarNumber(): string {
    const aadhaarNumber = String(this.form.controls.aadhaarNumber.value || '').replace(/\D/g, '');

    if (!aadhaarNumber) {
      return '';
    }

    return aadhaarNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
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
      aadhaarShareCode: String(this.form.controls.aadhaarShareCode.value || '').trim(),
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
      aadhaarOfflineFile: this.uploads.aadhaarOfflineFile.file as File,
    };
  }

  private hasAllUploads(): boolean {
    return Object.values(this.uploads).every((upload) => !!upload.file);
  }

  private clearAadhaarPreview(): void {
    this.aadhaarPreview.set(null);
    this.aadhaarError.set('');
    this.aadhaarWarning.set('');
  }

  private applyAadhaarName(fullName: string): void {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || '';
    const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
    const middleName = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';

    this.form.patchValue({
      firstName,
      middleName,
      lastName,
    });
  }

  private updateAadhaarWarning(referenceId: string): void {
    const aadhaarNumber = String(this.form.controls.aadhaarNumber.value || '').trim();

    if (!referenceId || aadhaarNumber.length !== 12) {
      return;
    }

    const aadhaarLastFourDigits = aadhaarNumber.slice(-4);
    const referenceLastFourDigits = referenceId.slice(0, 4);

    if (aadhaarLastFourDigits !== referenceLastFourDigits) {
      this.aadhaarWarning.set('Please enter the correct Aadhaar number. The last 4 digits must match the uploaded offline eKYC reference.');
    }
  }

  private revokeObjectUrl(field: UploadField): void {
    const previewUrl = this.uploads[field].previewUrl;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
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

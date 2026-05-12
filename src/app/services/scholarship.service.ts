import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { buildApiUrl } from './api-base';

export interface ScholarshipApplicationPayload {
  academicYearId: string;
  registrationNo: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  fatherName: string;
  motherName: string;
  mobile: string;
  emailId: string;
  village: string;
  taluk: string;
  district: string;
  state: string;
  pinCode: string;
  accountHolderName: string;
  bankName: string;
  bankBranchName: string;
  accountNumber: string;
  ifscCode: string;
  aadhaarNumber: string;
  board: string;
  otherBoard: string;
  standard: string;
  otherStandard: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  heardFromMember: boolean;
  referringMemberCategory: string;
  referringMemberName: string;
  referringMemberRegistrationNo: string;
  termsAccepted: boolean;
  declarationAccepted: boolean;
}

export interface ScholarshipApplicationFiles {
  profilePhoto: File;
  casteCertificate: File;
  marksCard: File;
  aadhaarCard: File;
}

interface ScholarshipApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ScholarshipApiErrorResponse {
  success?: boolean;
  message?: string;
}

export interface ScholarshipSubmissionResponse {
  id: string;
  applicationNumber: string;
  serialNumber: number;
  totalApplications: number;
  submittedAt: string;
  status: string;
}

export interface ScholarshipSummaryResponse {
  totalApplications: number;
}

export interface RegistrationAvailabilityResponse {
  academicYearId: string;
  academicYear: string;
  registrationNo: string;
  available: boolean;
  message: string;
}

export interface ScholarshipAcademicYearOption {
  _id: string;
  label: string;
  startYear: number;
}

export interface ScholarshipPortalSettings {
  displayYear: string;
  applicationDeadline: string;
  closedTitle: string;
  closedMessage: string;
  isOpen: boolean;
}

interface ScholarshipAcademicYearsApiData {
  items: ScholarshipAcademicYearOption[];
}

interface ScholarshipAcademicYearsApiResponse {
  success: boolean;
  message: string;
  data: ScholarshipAcademicYearsApiData;
}

interface ScholarshipPortalSettingsApiResponse {
  success: boolean;
  message: string;
  data: ScholarshipPortalSettings;
}

const SCHOLARSHIP_API_BASE = buildApiUrl('/api/v1/scholarships');

@Injectable({ providedIn: 'root' })
export class ScholarshipService {
  private readonly http = inject(HttpClient);

  private errorMessageFromApi(error: unknown, fallback: string): string {
    const maybeError = error as { error?: ScholarshipApiErrorResponse };
    const message = maybeError?.error?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
  }

  async getSummary(): Promise<ScholarshipSummaryResponse> {
    let response: ScholarshipApiResponse<ScholarshipSummaryResponse>;
    try {
      response = await firstValueFrom(
        this.http.get<ScholarshipApiResponse<ScholarshipSummaryResponse>>(
          `${SCHOLARSHIP_API_BASE}/summary`,
        ),
      );
    } catch (error) {
      throw new Error(this.errorMessageFromApi(error, 'Unable to load scholarship summary.'));
    }

    return response.data;
  }

  async getAcademicYears(): Promise<ScholarshipAcademicYearOption[]> {
    let response: ScholarshipAcademicYearsApiResponse;
    try {
      response = await firstValueFrom(
        this.http.get<ScholarshipAcademicYearsApiResponse>(
          `${SCHOLARSHIP_API_BASE}/academic-years`,
        ),
      );
    } catch (error) {
      throw new Error(this.errorMessageFromApi(error, 'Unable to load academic years right now.'));
    }

    return response.data.items;
  }

  async getPortalSettings(): Promise<ScholarshipPortalSettings> {
    let response: ScholarshipPortalSettingsApiResponse;
    try {
      response = await firstValueFrom(
        this.http.get<ScholarshipPortalSettingsApiResponse>(
          `${SCHOLARSHIP_API_BASE}/portal-settings`,
        ),
      );
    } catch (error) {
      throw new Error(this.errorMessageFromApi(error, 'Unable to load scholarship portal settings right now.'));
    }

    return response.data;
  }

  async checkRegistrationAvailability(registrationNo: string, academicYearId: string): Promise<RegistrationAvailabilityResponse> {
    let response: ScholarshipApiResponse<RegistrationAvailabilityResponse>;
    try {
      response = await firstValueFrom(
        this.http.get<ScholarshipApiResponse<RegistrationAvailabilityResponse>>(
          `${SCHOLARSHIP_API_BASE}/registration-status`,
          {
            params: { registrationNo, academicYearId },
          },
        ),
      );
    } catch (error) {
      throw new Error(this.errorMessageFromApi(error, 'Unable to verify the registration number right now.'));
    }

    return response.data;
  }

  async submitApplication(
    payload: ScholarshipApplicationPayload,
    files: ScholarshipApplicationFiles,
  ): Promise<ScholarshipSubmissionResponse> {
    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    formData.append('profilePhoto', files.profilePhoto);
    formData.append('casteCertificate', files.casteCertificate);
    formData.append('marksCard', files.marksCard);
    formData.append('aadhaarCard', files.aadhaarCard);

    let response: ScholarshipApiResponse<ScholarshipSubmissionResponse>;
    try {
      response = await firstValueFrom(
        this.http.post<ScholarshipApiResponse<ScholarshipSubmissionResponse>>(
          `${SCHOLARSHIP_API_BASE}/applications`,
          formData,
        ),
      );
    } catch (error) {
      throw new Error(this.errorMessageFromApi(error, 'Unable to submit the application right now.'));
    }

    return response.data;
  }
}

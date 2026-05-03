import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ScholarshipApplicationPayload {
  academicYear: string;
  registrationNo: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  fatherName: string;
  motherName: string;
  mobile: string;
  village: string;
  taluk: string;
  district: string;
  state: string;
  pinCode: string;
  aadhaarNumber: string;
  aadhaarShareCode: string;
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
  aadhaarOfflineFile: File;
}

export interface AadhaarPreviewResponse {
  referenceId: string;
  name: string;
  dob: string;
  gender: string;
  address: string;
  emailHash: string;
  mobileHash: string;
  photoDataUrl: string | null;
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
  registrationNo: string;
  available: boolean;
  message: string;
}

const SCHOLARSHIP_API_BASE = '/api/v1/scholarships';

@Injectable({ providedIn: 'root' })
export class ScholarshipService {
  private readonly http = inject(HttpClient);

  private errorMessageFromApi(error: unknown, fallback: string): string {
    const maybeError = error as { error?: ScholarshipApiErrorResponse };
    const message = maybeError?.error?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
  }

  async previewAadhaarData(file: File, aadhaarShareCode: string): Promise<AadhaarPreviewResponse> {
    const formData = new FormData();
    formData.append('aadhaarOfflineFile', file);
    formData.append('aadhaarShareCode', aadhaarShareCode);

    let response: ScholarshipApiResponse<AadhaarPreviewResponse>;
    try {
      response = await firstValueFrom(
        this.http.post<ScholarshipApiResponse<AadhaarPreviewResponse>>(
          `${SCHOLARSHIP_API_BASE}/aadhaar/preview`,
          formData,
        ),
      );
    } catch (error) {
      throw new Error(this.errorMessageFromApi(error, 'Unable to fetch Aadhaar details.'));
    }

    return response.data;
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

  async checkRegistrationAvailability(registrationNo: string): Promise<RegistrationAvailabilityResponse> {
    let response: ScholarshipApiResponse<RegistrationAvailabilityResponse>;
    try {
      response = await firstValueFrom(
        this.http.get<ScholarshipApiResponse<RegistrationAvailabilityResponse>>(
          `${SCHOLARSHIP_API_BASE}/registration-status`,
          {
            params: { registrationNo },
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
    formData.append('aadhaarOfflineFile', files.aadhaarOfflineFile);

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

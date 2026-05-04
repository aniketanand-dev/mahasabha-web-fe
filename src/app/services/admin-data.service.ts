import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

interface AdminApiErrorResponse {
  success?: boolean;
  message?: string;
}

export interface AdminGalleryItem {
  id: number;
  src: string;
  caption: string;
}

export interface AdminFounder {
  id: number;
  img: string;
  name: string;
  title: string;
  bio: string;
}

export interface AdminTicker {
  id: number;
  text: string;
}

export interface AdminHostel {
  id: number;
  name: string;
  location: string;
  contact: string;
  description: string;
  capacity: string;
  img: string;
}

export interface AdminHeroStat {
  id: number;
  value: string;
  label: string;
}

export interface AdminHeroContent {
  logoUrl: string;
  englishTitle: string;
  scrollLabel: string;
  stats: AdminHeroStat[];
}

export interface AdminPresidentNoteContent {
  photoUrl: string;
}

export interface AdminBhavanContent {
  imageUrls: string[];
  address: string;
  phone: string;
  email: string;
}

export interface AdminNavbarContent {
  logoUrl: string;
  nameKn: string;
  nameEn: string;
}

export interface AdminFooterContent {
  logoSymbol: string;
  orgNameKn: string;
  orgNameEn: string;
  facebookUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  instagramUrl: string;
  address: string;
  phone: string;
  email: string;
}

export interface AdminCmLeader {
  id: number;
  img: string;
  name: string;
  state: string;
  party: string;
}

export interface AdminPastPresident {
  id: number;
  img: string;
  name: string;
  tenure: string;
}

export type AdminEventCategory = 'upcoming' | 'past' | 'president';
export type AdminEventBadge = 'upcoming' | 'past' | 'open' | 'president';

export interface AdminEvent {
  id: number;
  category: AdminEventCategory;
  img: string;
  date: string;
  title: string;
  description: string;
  badgeClass: AdminEventBadge;
  link: string;
}

export type AdminDirectoryType = 'hostel' | 'crematory';

export interface AdminDirectoryEntry {
  id: number;
  name: string;
  state: string;
  district: string;
  address: string;
  contact: string;
  type: AdminDirectoryType;
}

export interface AdminOrgNode {
  id: number;
  parentId: number | null;
  title: string;
  subtitle: string;
  order: number;
}

export interface AdminScholarshipApplication {
  _id: string;
  applicationNumber: string;
  academicYearId: string;
  academicYear: string;
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
  aadhaarNumber: string;
  board: string;
  standard: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  profilePhotoUrl: string;
  casteCertificateUrl: string;
  marksCardUrl: string;
  aadhaarOfflineFileUrl: string;
  status: string;
  rejectionComment?: string;
  reviewedAt?: string | null;
  submittedAt: string;
}

export interface AdminScholarshipPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ScholarshipAcademicYearOption {
  _id: string;
  label: string;
  startYear: number;
}

type ScholarshipStatus = 'pending' | 'accepted' | 'rejected';

interface ScholarshipListApiData {
  items: AdminScholarshipApplication[];
  pagination: AdminScholarshipPagination;
}

interface ScholarshipAcademicYearsApiData {
  items: ScholarshipAcademicYearOption[];
}

interface ScholarshipListApiResponse {
  success: boolean;
  message: string;
  data: ScholarshipListApiData;
}

interface ScholarshipAcademicYearsApiResponse {
  success: boolean;
  message: string;
  data: ScholarshipAcademicYearsApiData;
}

interface ScholarshipStatusUpdateApiResponse {
  success: boolean;
  message: string;
  data: AdminScholarshipApplication;
}

const normalizeScholarshipStatus = (status: string): ScholarshipStatus => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'accepted' || normalized === 'rejected') {
    return normalized;
  }

  return 'pending';
};

const normalizeScholarshipApplication = (item: AdminScholarshipApplication): AdminScholarshipApplication => {
  const status = normalizeScholarshipStatus(item.status);

  return {
    ...item,
    status,
    rejectionComment: status === 'rejected' ? item.rejectionComment || '' : '',
  };
};

export type AdminTextOverrides = Record<string, string>;

type UploadFolder =
  | 'gallery'
  | 'navbar'
  | 'hero'
  | 'president'
  | 'bhavan'
  | 'leaders'
  | 'past-presidents'
  | 'events'
  | 'founders'
  | 'hostels';

interface UploadResponse {
  src: string;
}

const MANAGED_UPLOAD_PREFIX = '/uploads/';
const DEFAULT_ICON_IMAGE = '/uploads/placeholders/default-icon.svg';
const DEFAULT_SQUARE_IMAGE = '/uploads/placeholders/default-square.svg';
const DEFAULT_LANDSCAPE_IMAGE = '/uploads/placeholders/default-landscape.svg';
const DEFAULT_PORTRAIT_IMAGE = '/uploads/placeholders/default-portrait.svg';

const DEFAULT_GALLERY_CAPTIONS = [
  'Annual Event',
  'Basava Jayanti',
  'Educational Programme',
  'Blood Donation Camp',
  'Youth Convention',
  "Women's Session",
  'Religious Conference',
  'Cultural Festival',
  'Award Ceremony',
  'Service Camp',
  'Inauguration Ceremony',
  'Memorial Event',
];

const DEFAULT_GALLERY: AdminGalleryItem[] = DEFAULT_GALLERY_CAPTIONS.map((caption, index) => ({
  id: index + 1,
  src: DEFAULT_LANDSCAPE_IMAGE,
  caption,
}));

const DEFAULT_FOUNDERS: AdminFounder[] = [
  {
    id: 1,
    img: DEFAULT_PORTRAIT_IMAGE,
    name: 'ಹನಗಲ್ ಶ್ರೀ ಕುಮಾರಸ್ವಾಮೀಜಿ',
    title: 'Founder, Veerashiva Mahasabha',
    bio: 'Founder and spiritual guide of the Mahasabha. Empowered the community through social service and education.'
  },
  {
    id: 2,
    img: DEFAULT_PORTRAIT_IMAGE,
    name: 'ಶ್ರೀ ಬಸವಣ್ಣ',
    title: '12th Century Social Reformer',
    bio: 'The great social reformer whose equality principles form the timeless foundation of the Veerashiva community.'
  },
  {
    id: 3,
    img: DEFAULT_PORTRAIT_IMAGE,
    name: 'ಡಾ. ಶ್ರೀಕುಮಾರ್ ರೆಡ್ಡಿ',
    title: 'National President',
    bio: 'Current National President of Akhila Bharata Veerashiva Mahasabha, working tirelessly for community welfare.'
  },
];

const DEFAULT_TICKERS: AdminTicker[] = [
  { id: 1, text: 'Annual Mahasabha Convention - Jan 15, 2025 - Bengaluru' },
  { id: 2, text: 'Hanagal Kumaraswamiji Jayanti - Feb 3, 2025' },
  { id: 3, text: 'Youth Convention - Mar 10, 2025 - Mysuru' },
  { id: 4, text: 'Scholarship Applications Open - Deadline: December 31' },
];

const DEFAULT_HERO_CONTENT: AdminHeroContent = {
  logoUrl: DEFAULT_ICON_IMAGE,
  englishTitle: 'Akhila Bharata Veerashiva Mahasabha',
  scrollLabel: 'SCROLL',
  stats: [
    { id: 1, value: '120+', label: 'YEARS' },
    { id: 2, value: '28', label: 'STATES' },
    { id: 3, value: '500+', label: 'HOSTELS' },
    { id: 4, value: '2Cr+', label: 'COMMUNITY' },
  ]
};

const DEFAULT_PRESIDENT_NOTE_CONTENT: AdminPresidentNoteContent = {
  photoUrl: DEFAULT_PORTRAIT_IMAGE
};

const DEFAULT_BHAVAN_CONTENT: AdminBhavanContent = {
  imageUrls: [
    DEFAULT_LANDSCAPE_IMAGE,
    DEFAULT_LANDSCAPE_IMAGE,
    DEFAULT_LANDSCAPE_IMAGE,
  ],
  address: 'Veerashiva Lingayat Bhavan\nRacecourse Road, Bengaluru - 560 001\nKarnataka, India',
  phone: '+91 80 2226 XXXX',
  email: 'info@veerashaivamahasabha.org'
};

const DEFAULT_NAVBAR_CONTENT: AdminNavbarContent = {
  logoUrl: DEFAULT_ICON_IMAGE,
  nameKn: 'ವೀರಶೈವ ಮಹಾಸಭಾ',
  nameEn: 'Veerashiva Mahasabha'
};

const DEFAULT_FOOTER_CONTENT: AdminFooterContent = {
  logoSymbol: 'ॐ',
  orgNameKn: 'ಅಖಿಲ ಭಾರತ ವೀರಶೈವ ಲಿಂಗಾಯತ ಮಹಾಸಭಾ',
  orgNameEn: 'Akhila Bharata Veerashiva Lingayat Mahasabha',
  facebookUrl: '#',
  twitterUrl: '#',
  youtubeUrl: '#',
  instagramUrl: '#',
  address: 'ಮಹಾಸಭಾ ಭವನ, ಬಸವೇಶ್ವರ ನಗರ,\nಬೆಂಗಳೂರು - ೫೬೦ ೦೭೯',
  phone: '+91 80 2345 6789',
  email: 'exploreunlimitted@gmail.com'
};

const DEFAULT_CM_LEADERS: AdminCmLeader[] = [
  { id: 1, img: DEFAULT_SQUARE_IMAGE, name: 'ಡಾ. ವೀರೇಂದ್ರ ಪಾಟೀಲ್', state: 'Karnataka CM (1968-71, 1989)', party: 'Indian National Congress' },
  { id: 2, img: DEFAULT_SQUARE_IMAGE, name: 'ಶ್ರೀ ಎಸ್. ಬಂಗಾರಪ್ಪ', state: 'Karnataka CM (1990-92)', party: 'Indian National Congress' },
  { id: 3, img: DEFAULT_SQUARE_IMAGE, name: 'ಶ್ರೀ ಎಂ. ವೀರಪ್ಪ ಮೊಯ್ಲಿ', state: 'Karnataka CM (1992-94)', party: 'Indian National Congress' },
  { id: 4, img: DEFAULT_SQUARE_IMAGE, name: 'ಶ್ರೀ ಜಗದೀಶ ಶೆಟ್ಟರ್', state: 'Karnataka CM (2012-13)', party: 'Bharatiya Janata Party' },
  { id: 5, img: DEFAULT_SQUARE_IMAGE, name: 'ಶ್ರೀ ಯಡಿಯೂರಪ್ಪ', state: 'Karnataka CM (2007, 2008-11)', party: 'Bharatiya Janata Party' },
  { id: 6, img: DEFAULT_SQUARE_IMAGE, name: 'ಶ್ರೀ ಲಿಂಗಯ್ಯ ಕೊಡ್ಲಿ', state: 'Maharashtra Leader', party: 'Shiv Sena' },
];

const DEFAULT_PAST_PRESIDENTS: AdminPastPresident[] = [
  { id: 1, img: DEFAULT_PORTRAIT_IMAGE, name: 'ಶ್ರೀ ರಾಮಚಂದ್ರ', tenure: '1904 - 1918' },
  { id: 2, img: DEFAULT_PORTRAIT_IMAGE, name: 'ಶ್ರೀ ಸಿದ್ಧರಾಮ', tenure: '1918 - 1932' },
  { id: 3, img: DEFAULT_PORTRAIT_IMAGE, name: 'ಶ್ರೀ ಗುರುಸಿದ್ಧ', tenure: '1932 - 1948' },
  { id: 4, img: DEFAULT_PORTRAIT_IMAGE, name: 'ಶ್ರೀ ಬಸವರಾಜ', tenure: '1948 - 1960' },
  { id: 5, img: DEFAULT_PORTRAIT_IMAGE, name: 'ಶ್ರೀ ಚಂದ್ರಶೇಖರ', tenure: '1960 - 1974' },
  { id: 6, img: DEFAULT_PORTRAIT_IMAGE, name: 'ಶ್ರೀ ವೀರಭದ್ರ', tenure: '1974 - 1986' },
  { id: 7, img: DEFAULT_PORTRAIT_IMAGE, name: 'ಶ್ರೀ ಮಲ್ಲಿಕಾರ್ಜುನ', tenure: '1986 - 1998' },
  { id: 8, img: DEFAULT_PORTRAIT_IMAGE, name: 'ಡಾ. ಪ್ರಭುದೇವ', tenure: '1998 - 2010' },
  { id: 9, img: DEFAULT_PORTRAIT_IMAGE, name: 'ಡಾ. ಶಿವಕುಮಾರ', tenure: '2010 - 2020' },
];

const DEFAULT_EVENTS: AdminEvent[] = [
  {
    id: 1,
    category: 'upcoming',
    img: DEFAULT_LANDSCAPE_IMAGE,
    date: 'January 15, 2025',
    title: 'Annual Mahasabha 2025',
    description: 'The annual Mahasabha convention of the Veerashiva Lingayat community will be held in Bengaluru.',
    badgeClass: 'upcoming',
    link: '#'
  },
  {
    id: 2,
    category: 'upcoming',
    img: DEFAULT_LANDSCAPE_IMAGE,
    date: 'February 1, 2025',
    title: 'Youth Leadership Camp',
    description: 'A leadership development workshop for the youth community.',
    badgeClass: 'open',
    link: '#'
  },
  {
    id: 3,
    category: 'upcoming',
    img: DEFAULT_LANDSCAPE_IMAGE,
    date: 'March 10, 2025',
    title: 'Educational Symposium',
    description: 'State-level symposium on the educational progress of the community.',
    badgeClass: 'upcoming',
    link: '#'
  },
  {
    id: 4,
    category: 'past',
    img: DEFAULT_LANDSCAPE_IMAGE,
    date: 'November 20, 2024',
    title: 'Basava Jayanti Celebration',
    description: "Vishwa Guru Basavanna's Jayanti was celebrated with great joy.",
    badgeClass: 'past',
    link: '#'
  },
  {
    id: 5,
    category: 'past',
    img: DEFAULT_LANDSCAPE_IMAGE,
    date: 'October 5, 2024',
    title: 'Blood Donation Camp',
    description: 'Blood donation camps were held at hundreds of centres across the state.',
    badgeClass: 'past',
    link: '#'
  },
  {
    id: 6,
    category: 'past',
    img: DEFAULT_LANDSCAPE_IMAGE,
    date: 'September 12, 2024',
    title: 'Scholarship Distribution',
    description: 'Scholarships were distributed to meritorious students.',
    badgeClass: 'past',
    link: '#'
  },
  {
    id: 7,
    category: 'president',
    img: DEFAULT_LANDSCAPE_IMAGE,
    date: 'January 20, 2025',
    title: "President's Memorial Meet",
    description: 'A special memorial event organised by the Mahasabha President.',
    badgeClass: 'president',
    link: '#'
  },
  {
    id: 8,
    category: 'president',
    img: DEFAULT_LANDSCAPE_IMAGE,
    date: 'February 14, 2025',
    title: 'Community Dialogue',
    description: 'An open dialogue between the President and community leaders.',
    badgeClass: 'president',
    link: '#'
  },
];

const DEFAULT_DIRECTORY_ENTRIES: AdminDirectoryEntry[] = [
  { id: 1, name: 'ವೀರಶೈವ ಛಾತ್ರಾವಾಸ, ಬೆಂಗಳೂರು', state: 'ಕರ್ನಾಟಕ', district: 'ಬೆಂಗಳೂರು', address: 'ರಾಜಾಜಿನಗರ, ಬೆಂಗಳೂರು - ೫೬೦ ೦೧೦', contact: '080-23456789', type: 'hostel' },
  { id: 2, name: 'ಲಿಂಗಾಯತ ವಿದ್ಯಾರ್ಥಿ ನಿಲಯ, ಧಾರವಾಡ', state: 'ಕರ್ನಾಟಕ', district: 'ಧಾರವಾಡ', address: 'ಸ್ಟೇಷನ್ ರೋಡ್, ಧಾರವಾಡ - ೫೮೦ ೦೦೧', contact: '0836-2345678', type: 'hostel' },
  { id: 3, name: 'ಮಹಾಸಭಾ ಛಾತ್ರಾವಾಸ, ಮೈಸೂರು', state: 'ಕರ್ನಾಟಕ', district: 'ಮೈಸೂರು', address: 'ಸಯ್ಯಾಜಿ ರಾವ್ ರಸ್ತೆ, ಮೈಸೂರು - ೫೭೦ ೦೦೧', contact: '0821-2345678', type: 'hostel' },
  { id: 4, name: 'ವೀರಶೈವ ಬಾಲಕರ ನಿಲಯ, ಹುಬ್ಬಳ್ಳಿ', state: 'ಕರ್ನಾಟಕ', district: 'ಹುಬ್ಬಳ್ಳಿ', address: 'ಕಲ್ಲವಾಡ ರಸ್ತೆ, ಹುಬ್ಬಳ್ಳಿ - ೫೮೦ ೦೨೩', contact: '0836-3456789', type: 'hostel' },
  { id: 5, name: 'ಲಿಂಗಾಯತ ಬಾಲಕಿಯರ ನಿಲಯ, ಕಲಬುರಗಿ', state: 'ಕರ್ನಾಟಕ', district: 'ಕಲಬುರಗಿ', address: 'ಸ್ಟೇಷನ್ ಬಜಾರ್, ಕಲಬುರಗಿ - ೫೮೫ ೧೦೧', contact: '08472-234567', type: 'hostel' },
  { id: 6, name: 'ಮಹಾಸಭಾ ವಿದ್ಯಾಲಯ ನಿಲಯ, ಬೆಳಗಾವಿ', state: 'ಕರ್ನಾಟಕ', district: 'ಬೆಳಗಾವಿ', address: 'ಕ್ಯಾಂಪ್ ರಸ್ತೆ, ಬೆಳಗಾವಿ - ೫೯೦ ೦೦೧', contact: '0831-2345678', type: 'hostel' },
  { id: 7, name: 'ವೀರಶೈವ ಮಸಣ, ಬೆಂಗಳೂರು ಉತ್ತರ', state: 'ಕರ್ನಾಟಕ', district: 'ಬೆಂಗಳೂರು', address: 'ಹೆಬ್ಬಾಳ, ಬೆಂಗಳೂರು - ೫೬೦ ೦೨೪', contact: '080-28456789', type: 'crematory' },
  { id: 8, name: 'ಲಿಂಗಾಯತ ಚಿತಾಭೂಮಿ, ಮೈಸೂರು', state: 'ಕರ್ನಾಟಕ', district: 'ಮೈಸೂರು', address: 'ಜೆ.ಪಿ. ನಗರ, ಮೈಸೂರು - ೫೭೦ ೦೦೮', contact: '0821-2456789', type: 'crematory' },
  { id: 9, name: 'ಮಹಾಸಭಾ ಸ್ಮಶಾನ, ಹುಬ್ಬಳ್ಳಿ', state: 'ಕರ್ನಾಟಕ', district: 'ಹುಬ್ಬಳ್ಳಿ', address: 'ಗೋಕುಲ್ ರಸ್ತೆ, ಹುಬ್ಬಳ್ಳಿ - ೫೮೦ ೦೩೦', contact: '0836-2567890', type: 'crematory' },
  { id: 10, name: 'ವೀರಶೈವ ಮಸಣ, ಕಲಬುರಗಿ', state: 'ಕರ್ನಾಟಕ', district: 'ಕಲಬುರಗಿ', address: 'ವಿಶ್ವನಾಥ ನಗರ, ಕಲಬುರಗಿ - ೫೮೫ ೧೦೨', contact: '08472-245678', type: 'crematory' },
];

const DEFAULT_ORG_NODES: AdminOrgNode[] = [
  { id: 1, parentId: null, title: 'President', subtitle: '', order: 1 },
  { id: 2, parentId: 1, title: 'Representative General Body', subtitle: '', order: 1 },
  { id: 3, parentId: 1, title: 'Working Committee', subtitle: '', order: 2 },
  { id: 4, parentId: 1, title: 'Office Bearers', subtitle: '', order: 3 },
  { id: 5, parentId: 1, title: 'Nominated National Level Wings', subtitle: '', order: 4 },
  { id: 6, parentId: 1, title: 'Nominated Sub-Committees', subtitle: '', order: 5 },
  { id: 7, parentId: 1, title: 'State Units', subtitle: '', order: 6 },
  { id: 8, parentId: 5, title: "Women's Wing", subtitle: '', order: 1 },
  { id: 9, parentId: 5, title: 'Youth Wing', subtitle: '', order: 2 },
  { id: 10, parentId: 5, title: 'Think Tank', subtitle: '', order: 3 },
  { id: 11, parentId: 6, title: 'Krishi Samithi', subtitle: '', order: 1 },
  { id: 12, parentId: 6, title: 'Industries & Commerce', subtitle: '', order: 2 },
  { id: 13, parentId: 6, title: 'Etc.', subtitle: '', order: 3 },
  { id: 14, parentId: 7, title: 'Dist Units', subtitle: '', order: 1 },
  { id: 15, parentId: 14, title: 'Taluk Units', subtitle: '', order: 1 },
  { id: 16, parentId: 14, title: 'Mahanagara Palike Units', subtitle: '', order: 2 },
  { id: 17, parentId: 14, title: "Nominated Women's Wing", subtitle: '', order: 3 },
  { id: 18, parentId: 14, title: 'Nominated Youth Wing', subtitle: '', order: 4 },
  { id: 19, parentId: 14, title: 'Etc.', subtitle: '', order: 5 },
  { id: 20, parentId: 16, title: 'Assembly Units', subtitle: '', order: 1 },
  { id: 21, parentId: 20, title: 'Municipal Council Units', subtitle: '', order: 1 },
  { id: 22, parentId: 20, title: 'City Municipality Units', subtitle: '', order: 2 },
  { id: 23, parentId: 20, title: 'Town Municipality Units', subtitle: '', order: 3 },
  { id: 24, parentId: 20, title: 'Grama Panchayath Units', subtitle: '', order: 4 },
  { id: 25, parentId: 20, title: "Nominated Women's Wing", subtitle: '', order: 5 },
  { id: 26, parentId: 20, title: 'Nominated Youth Wing', subtitle: '', order: 6 },
  { id: 27, parentId: 20, title: 'Etc.', subtitle: '', order: 7 },
];

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function loadArray<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : cloneData(fallback);
  } catch {
    return cloneData(fallback);
  }
}

function loadValue<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : cloneData(fallback);
  } catch {
    return cloneData(fallback);
  }
}

function saveValue<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

@Injectable({ providedIn: 'root' })
export class AdminDataService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private errorMessageFromApi(error: unknown, fallback: string): string {
    const maybeError = error as { error?: AdminApiErrorResponse };
    const message = maybeError?.error?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
  }

  textOverrides = signal<AdminTextOverrides>(loadValue('adm_text_overrides', {}));
  heroContent = signal<AdminHeroContent>(this.normalizeHeroContent(loadValue('adm_hero_content', DEFAULT_HERO_CONTENT)));
  presidentNoteContent = signal<AdminPresidentNoteContent>(this.normalizePresidentNoteContent(loadValue('adm_president_note_content', DEFAULT_PRESIDENT_NOTE_CONTENT)));
  bhavanContent = signal<AdminBhavanContent>(this.normalizeBhavanContent(loadValue('adm_bhavan_content', DEFAULT_BHAVAN_CONTENT)));
  navbarContent = signal<AdminNavbarContent>(this.normalizeNavbarContent(loadValue('adm_navbar_content', DEFAULT_NAVBAR_CONTENT)));
  footerContent = signal<AdminFooterContent>(loadValue('adm_footer_content', DEFAULT_FOOTER_CONTENT));
  cmLeaders = signal<AdminCmLeader[]>(this.normalizeCmLeaders(loadArray('adm_cm_leaders', DEFAULT_CM_LEADERS)));
  pastPresidents = signal<AdminPastPresident[]>(this.normalizePastPresidents(loadArray('adm_past_presidents', DEFAULT_PAST_PRESIDENTS)));
  events = signal<AdminEvent[]>(this.normalizeEvents(loadArray('adm_events', DEFAULT_EVENTS)));
  directoryEntries = signal<AdminDirectoryEntry[]>(loadArray('adm_directory_entries', DEFAULT_DIRECTORY_ENTRIES));
  orgNodes = signal<AdminOrgNode[]>(this.normalizeOrgNodes(loadArray('adm_org_nodes', DEFAULT_ORG_NODES)));
  gallery = signal<AdminGalleryItem[]>(this.normalizeGallery(loadArray('adm_gallery', DEFAULT_GALLERY)));
  founders = signal<AdminFounder[]>(this.normalizeFounders(loadArray('adm_founders', DEFAULT_FOUNDERS)));
  tickers = signal<AdminTicker[]>(loadArray('adm_tickers', DEFAULT_TICKERS));
  hostels = signal<AdminHostel[]>(this.normalizeHostels(loadArray('adm_hostels', [])));

  constructor() {
    void this.refreshGalleryFromApi();
  }

  private isManagedUpload(src: string | null | undefined) {
    return this.toManagedPath(src) !== null;
  }

  private uploadApiUrl(path: string) {
    return path;
  }

  private authHeaders(): Record<string, string> | undefined {
    const token = this.auth.getAuthToken();
    return token ? { Authorization: token } : undefined;
  }

  private toManagedPath(src: string | null | undefined) {
    if (typeof src !== 'string' || !src.trim()) {
      return null;
    }

    if (src.startsWith(MANAGED_UPLOAD_PREFIX)) {
      return src;
    }

    try {
      const url = new URL(src);
      return url.pathname.startsWith(MANAGED_UPLOAD_PREFIX) ? url.pathname : null;
    } catch {
      return null;
    }
  }

  private toManagedAssetUrl(src: string) {
    const managedPath = this.toManagedPath(src);
    return managedPath ?? src;
  }

  private normalizeGallery(items: AdminGalleryItem[]) {
    return items.map(item => ({ ...item, src: this.toManagedAssetUrl(item.src) }));
  }

  private normalizeFounders(items: AdminFounder[]) {
    return items.map(item => ({ ...item, img: this.toManagedAssetUrl(item.img) }));
  }

  private normalizeCmLeaders(items: AdminCmLeader[]) {
    return items.map(item => ({ ...item, img: this.toManagedAssetUrl(item.img) }));
  }

  private normalizePastPresidents(items: AdminPastPresident[]) {
    return items.map(item => ({ ...item, img: this.toManagedAssetUrl(item.img) }));
  }

  private normalizeEvents(items: AdminEvent[]) {
    return items.map(item => ({ ...item, img: this.toManagedAssetUrl(item.img) }));
  }

  private normalizeOrgNodes(items: AdminOrgNode[]) {
    return items
      .map(item => ({
        ...item,
        title: item.title.trim(),
        subtitle: item.subtitle.trim(),
        order: Number.isFinite(item.order) ? item.order : 0,
      }))
      .sort((a, b) => a.order - b.order || a.id - b.id);
  }

  private normalizeHostels(items: AdminHostel[]) {
    return items.map(item => ({ ...item, img: this.toManagedAssetUrl(item.img) }));
  }

  private normalizeHeroContent(content: AdminHeroContent) {
    return { ...content, logoUrl: this.toManagedAssetUrl(content.logoUrl) };
  }

  private normalizePresidentNoteContent(content: AdminPresidentNoteContent) {
    return { ...content, photoUrl: this.toManagedAssetUrl(content.photoUrl) };
  }

  private normalizeBhavanContent(content: AdminBhavanContent) {
    return {
      ...content,
      imageUrls: content.imageUrls.map(imageUrl => this.toManagedAssetUrl(imageUrl)),
    };
  }

  private normalizeNavbarContent(content: AdminNavbarContent) {
    return { ...content, logoUrl: this.toManagedAssetUrl(content.logoUrl) };
  }

  private async uploadImage(file: File, folder: UploadFolder) {
    const formData = new FormData();
    formData.append('image', file);

    return firstValueFrom(this.http.post<UploadResponse>(this.uploadApiUrl(`/api/uploads/${folder}`), formData));
  }

  private async deleteImage(src: string | null | undefined) {
    const managedPath = this.toManagedPath(src);

    if (!managedPath) {
      return;
    }

    await firstValueFrom(this.http.delete<void>(this.uploadApiUrl('/api/uploads'), { body: { path: managedPath } }));
  }

  private async replaceImage(currentSrc: string, file: File, folder: UploadFolder) {
    const uploaded = await this.uploadImage(file, folder);
    await this.deleteImage(currentSrc);
    return this.toManagedAssetUrl(uploaded.src);
  }

  private setGallery(items: AdminGalleryItem[]) {
    const next = this.normalizeGallery(cloneData(items));
    this.gallery.set(next);
    saveValue('adm_gallery', next);
  }

  getTextOverride(key: string): string | undefined {
    return this.textOverrides()[key];
  }

  setTextOverride(key: string, value: string) {
    const next = { ...this.textOverrides(), [key]: value };
    this.textOverrides.set(next);
    saveValue('adm_text_overrides', next);
  }

  clearTextOverride(key: string) {
    const next = { ...this.textOverrides() };
    delete next[key];
    this.textOverrides.set(next);
    saveValue('adm_text_overrides', next);
  }

  async saveHeroContent(content: AdminHeroContent, logoFile?: File | null) {
    const next = this.normalizeHeroContent(cloneData(content));

    if (logoFile) {
      next.logoUrl = await this.replaceImage(next.logoUrl, logoFile, 'hero');
    }

    this.heroContent.set(next);
    saveValue('adm_hero_content', next);
  }

  async savePresidentNoteContent(content: AdminPresidentNoteContent, photoFile?: File | null) {
    const next = this.normalizePresidentNoteContent(cloneData(content));

    if (photoFile) {
      next.photoUrl = await this.replaceImage(next.photoUrl, photoFile, 'president');
    }

    this.presidentNoteContent.set(next);
    saveValue('adm_president_note_content', next);
  }

  async saveBhavanContent(content: AdminBhavanContent, imageFiles: Array<File | null> = []) {
    const next = this.normalizeBhavanContent(cloneData(content));

    for (let index = 0; index < next.imageUrls.length; index += 1) {
      const file = imageFiles[index];

      if (file) {
        next.imageUrls[index] = await this.replaceImage(next.imageUrls[index], file, 'bhavan');
      }
    }

    this.bhavanContent.set(next);
    saveValue('adm_bhavan_content', next);
  }

  async saveNavbarContent(content: AdminNavbarContent, logoFile?: File | null) {
    const next = this.normalizeNavbarContent(cloneData(content));

    if (logoFile) {
      next.logoUrl = await this.replaceImage(next.logoUrl, logoFile, 'navbar');
    }

    this.navbarContent.set(next);
    saveValue('adm_navbar_content', next);
  }

  saveFooterContent(content: AdminFooterContent) {
    const next = cloneData(content);
    this.footerContent.set(next);
    saveValue('adm_footer_content', next);
  }

  private saveCmLeaders(items: AdminCmLeader[]) {
    const next = this.normalizeCmLeaders(cloneData(items));
    this.cmLeaders.set(next);
    saveValue('adm_cm_leaders', next);
  }

  async addCmLeader(item: Omit<AdminCmLeader, 'id' | 'img'>, file: File) {
    const uploaded = await this.uploadImage(file, 'leaders');
    this.saveCmLeaders([...this.cmLeaders(), { ...item, img: uploaded.src, id: Date.now() }]);
  }

  async updateCmLeader(id: number, patch: Partial<Omit<AdminCmLeader, 'id' | 'img'>>, file?: File | null) {
    const current = this.cmLeaders().find(item => item.id === id);
    if (!current) {
      return;
    }

    let nextImg = current.img;
    if (file) {
      nextImg = await this.replaceImage(current.img, file, 'leaders');
    }

    this.saveCmLeaders(this.cmLeaders().map(item => item.id === id ? { ...item, ...patch, img: nextImg } : item));
  }

  async deleteCmLeader(id: number) {
    const current = this.cmLeaders().find(item => item.id === id);
    await this.deleteImage(current?.img);
    this.saveCmLeaders(this.cmLeaders().filter(item => item.id !== id));
  }

  private savePastPresidents(items: AdminPastPresident[]) {
    const next = this.normalizePastPresidents(cloneData(items));
    this.pastPresidents.set(next);
    saveValue('adm_past_presidents', next);
  }

  async addPastPresident(item: Omit<AdminPastPresident, 'id' | 'img'>, file: File) {
    const uploaded = await this.uploadImage(file, 'past-presidents');
    this.savePastPresidents([...this.pastPresidents(), { ...item, img: uploaded.src, id: Date.now() }]);
  }

  async updatePastPresident(id: number, patch: Partial<Omit<AdminPastPresident, 'id' | 'img'>>, file?: File | null) {
    const current = this.pastPresidents().find(item => item.id === id);
    if (!current) {
      return;
    }

    let nextImg = current.img;
    if (file) {
      nextImg = await this.replaceImage(current.img, file, 'past-presidents');
    }

    this.savePastPresidents(this.pastPresidents().map(item => item.id === id ? { ...item, ...patch, img: nextImg } : item));
  }

  async deletePastPresident(id: number) {
    const current = this.pastPresidents().find(item => item.id === id);
    await this.deleteImage(current?.img);
    this.savePastPresidents(this.pastPresidents().filter(item => item.id !== id));
  }

  private saveEvents(items: AdminEvent[]) {
    const next = this.normalizeEvents(cloneData(items));
    this.events.set(next);
    saveValue('adm_events', next);
  }

  async addEvent(item: Omit<AdminEvent, 'id' | 'img'>, file: File) {
    const uploaded = await this.uploadImage(file, 'events');
    this.saveEvents([...this.events(), { ...item, img: uploaded.src, id: Date.now() }]);
  }

  async updateEvent(id: number, patch: Partial<Omit<AdminEvent, 'id' | 'img'>>, file?: File | null) {
    const current = this.events().find(item => item.id === id);
    if (!current) {
      return;
    }

    let nextImg = current.img;
    if (file) {
      nextImg = await this.replaceImage(current.img, file, 'events');
    }

    this.saveEvents(this.events().map(item => item.id === id ? { ...item, ...patch, img: nextImg } : item));
  }

  async deleteEvent(id: number) {
    const current = this.events().find(item => item.id === id);
    await this.deleteImage(current?.img);
    this.saveEvents(this.events().filter(item => item.id !== id));
  }

  saveDirectoryEntries(items: AdminDirectoryEntry[]) {
    const next = cloneData(items);
    this.directoryEntries.set(next);
    saveValue('adm_directory_entries', next);
  }

  private saveOrgNodes(items: AdminOrgNode[]) {
    const next = this.normalizeOrgNodes(cloneData(items));
    this.orgNodes.set(next);
    saveValue('adm_org_nodes', next);
  }

  addDirectoryEntry(item: Omit<AdminDirectoryEntry, 'id'>) {
    this.saveDirectoryEntries([...this.directoryEntries(), { ...item, id: Date.now() }]);
  }

  updateDirectoryEntry(id: number, patch: Partial<AdminDirectoryEntry>) {
    this.saveDirectoryEntries(this.directoryEntries().map(item => item.id === id ? { ...item, ...patch } : item));
  }

  deleteDirectoryEntry(id: number) {
    this.saveDirectoryEntries(this.directoryEntries().filter(item => item.id !== id));
  }

  private nextOrgNodeOrder(parentId: number | null) {
    return this.orgNodes()
      .filter(item => item.parentId === parentId)
      .reduce((maxOrder, item) => Math.max(maxOrder, item.order), 0) + 1;
  }

  addOrgNode(item: Omit<AdminOrgNode, 'id'>) {
    const order = item.order > 0 ? item.order : this.nextOrgNodeOrder(item.parentId);
    this.saveOrgNodes([...this.orgNodes(), { ...item, order, id: Date.now() }]);
  }

  updateOrgNode(id: number, patch: Partial<Omit<AdminOrgNode, 'id'>>) {
    this.saveOrgNodes(this.orgNodes().map(item => item.id === id ? { ...item, ...patch } : item));
  }

  deleteOrgNode(id: number) {
    const descendants = new Set<number>();
    const queue = [id];

    while (queue.length) {
      const currentId = queue.shift() as number;
      descendants.add(currentId);

      for (const child of this.orgNodes()) {
        if (child.parentId === currentId && !descendants.has(child.id)) {
          queue.push(child.id);
        }
      }
    }

    this.saveOrgNodes(this.orgNodes().filter(item => !descendants.has(item.id)));
  }

  async refreshGalleryFromApi() {
    try {
      const items = await firstValueFrom(this.http.get<AdminGalleryItem[]>(this.uploadApiUrl('/api/gallery')));
      this.setGallery(items);
    } catch {
      // Keep the cached gallery when the local upload server is unavailable.
    }
  }

  async addGalleryItem(item: { caption: string; file: File }) {
    const formData = new FormData();
    formData.append('folder', 'gallery');
    formData.append('image', item.file);
    formData.append('caption', item.caption.trim());

    const created = await firstValueFrom(this.http.post<AdminGalleryItem>(this.uploadApiUrl('/api/gallery'), formData));
    this.setGallery([...this.gallery(), created]);
    return created;
  }

  async updateGalleryItem(id: number, patch: { caption?: string; file?: File | null }) {
    const formData = new FormData();

    if (patch.caption !== undefined) {
      formData.append('caption', patch.caption.trim());
    }

    if (patch.file) {
      formData.append('image', patch.file);
    }

    const updated = await firstValueFrom(this.http.patch<AdminGalleryItem>(this.uploadApiUrl(`/api/gallery/${id}`), formData));
    this.setGallery(this.gallery().map(galleryItem => galleryItem.id === id ? updated : galleryItem));
    return updated;
  }

  async deleteGalleryItem(id: number) {
    await firstValueFrom(this.http.delete<void>(this.uploadApiUrl(`/api/gallery/${id}`)));
    this.setGallery(this.gallery().filter(galleryItem => galleryItem.id !== id));
  }

  private saveFounders(items: AdminFounder[]) {
    const next = this.normalizeFounders(cloneData(items));
    this.founders.set(next);
    saveValue('adm_founders', next);
  }

  async addFounder(item: Omit<AdminFounder, 'id' | 'img'>, file: File) {
    const uploaded = await this.uploadImage(file, 'founders');
    this.saveFounders([...this.founders(), { ...item, img: uploaded.src, id: Date.now() }]);
  }

  async updateFounder(id: number, patch: Partial<Omit<AdminFounder, 'id' | 'img'>>, file?: File | null) {
    const current = this.founders().find(item => item.id === id);
    if (!current) {
      return;
    }

    let nextImg = current.img;
    if (file) {
      nextImg = await this.replaceImage(current.img, file, 'founders');
    }

    this.saveFounders(this.founders().map(item => item.id === id ? { ...item, ...patch, img: nextImg } : item));
  }

  async deleteFounder(id: number) {
    const current = this.founders().find(item => item.id === id);
    await this.deleteImage(current?.img);
    this.saveFounders(this.founders().filter(item => item.id !== id));
  }

  saveTickers(items: AdminTicker[]) {
    const next = cloneData(items);
    this.tickers.set(next);
    saveValue('adm_tickers', next);
  }

  addTicker(text: string) {
    this.saveTickers([...this.tickers(), { id: Date.now(), text }]);
  }

  updateTicker(id: number, text: string) {
    this.saveTickers(this.tickers().map(item => item.id === id ? { ...item, text } : item));
  }

  deleteTicker(id: number) {
    this.saveTickers(this.tickers().filter(item => item.id !== id));
  }

  private saveHostels(items: AdminHostel[]) {
    const next = this.normalizeHostels(cloneData(items));
    this.hostels.set(next);
    saveValue('adm_hostels', next);
  }

  async addHostel(item: Omit<AdminHostel, 'id' | 'img'>, file: File) {
    const uploaded = await this.uploadImage(file, 'hostels');
    this.saveHostels([...this.hostels(), { ...item, img: uploaded.src, id: Date.now() }]);
  }

  async updateHostel(id: number, patch: Partial<Omit<AdminHostel, 'id' | 'img'>>, file?: File | null) {
    const current = this.hostels().find(item => item.id === id);
    if (!current) {
      return;
    }

    let nextImg = current.img;
    if (file) {
      nextImg = await this.replaceImage(current.img, file, 'hostels');
    }

    this.saveHostels(this.hostels().map(item => item.id === id ? { ...item, ...patch, img: nextImg } : item));
  }

  async deleteHostel(id: number) {
    const current = this.hostels().find(item => item.id === id);
    await this.deleteImage(current?.img);
    this.saveHostels(this.hostels().filter(item => item.id !== id));
  }

  async getScholarshipApplications(params: { page?: number; limit?: number; all?: boolean; academicYearId?: string; search?: string } = {}) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const all = params.all === true;
    const academicYearId = params.academicYearId?.trim() || '';
    const search = params.search?.trim() || '';

    const response = await firstValueFrom(this.http.get<ScholarshipListApiResponse>(
      '/api/v1/scholarships/applications',
      {
        params: {
          page: String(page),
          limit: String(limit),
          all: String(all),
          academicYearId,
          search,
        },
        headers: this.authHeaders(),
      },
    ));

    return {
      ...response.data,
      items: response.data.items.map(normalizeScholarshipApplication),
    };
  }

  async getScholarshipAcademicYears() {
    let response: ScholarshipAcademicYearsApiResponse;
    try {
      response = await firstValueFrom(this.http.get<ScholarshipAcademicYearsApiResponse>(
        '/api/v1/scholarships/academic-years',
        {
          headers: this.authHeaders(),
        },
      ));
    } catch (error) {
      throw new Error(this.errorMessageFromApi(error, 'Unable to load academic years right now.'));
    }

    return response.data.items;
  }

  async downloadScholarshipUploadsZip(academicYearId?: string) {
    return firstValueFrom(this.http.get('/api/v1/scholarships/applications/export-zip', {
      params: {
        academicYearId: academicYearId?.trim() || '',
      },
      headers: this.authHeaders(),
      responseType: 'blob',
    }));
  }

  async updateScholarshipApplicationStatus(id: string, status: ScholarshipStatus, rejectionComment = '') {
    const response = await firstValueFrom(this.http.patch<ScholarshipStatusUpdateApiResponse>(
      `/api/v1/scholarships/applications/${id}/status`,
      {
        status,
        rejectionComment,
      },
      {
        headers: this.authHeaders(),
      },
    ));

    return normalizeScholarshipApplication(response.data);
  }
}

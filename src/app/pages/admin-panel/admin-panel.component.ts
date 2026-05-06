import { Component, HostListener, computed, signal, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  AdminDataService,
  AdminBhavanContent,
  AdminCmLeader,
  AdminDirectoryEntry,
  AdminEvent,
  AdminEventBadge,
  AdminEventCategory,
  AdminFooterContent,
  AdminFounder,
  AdminGalleryItem,
  AdminHeroContent,
  AdminHostel,
  AdminNavbarContent,
  AdminOrgNode,
  AdminPastPresident,
  AdminPresidentNoteContent,
  AdminScholarshipApplication,
  AdminTicker,
  ScholarshipAcademicYearOption,
} from '../../services/admin-data.service';
import { buildManagedAssetUrl } from '../../services/api-base';
import { translations } from '../../i18n/translations';

type Tab =
  | 'header'
  | 'hero'
  | 'founders'
  | 'mission'
  | 'president'
  | 'org'
  | 'leaders'
  | 'bhavan'
  | 'past-presidents'
  | 'events'
  | 'gallery'
  | 'directory'
  | 'scholarships'
  | 'ticker'
  | 'hostels'
  | 'footer';

interface TextField {
  key: string;
  label: string;
  multiline?: boolean;
  rows?: number;
}

type CmLeaderForm = {
  img: string;
  name: string;
  state: string;
  party: string;
};

type PastPresidentForm = {
  img: string;
  name: string;
  tenure: string;
};

type EventForm = {
  category: AdminEventCategory;
  img: string;
  date: string;
  title: string;
  description: string;
  badgeClass: AdminEventBadge;
  link: string;
};

type DirectoryEntryForm = {
  name: string;
  state: string;
  district: string;
  address: string;
  contact: string;
  type: AdminDirectoryEntry['type'];
};

type GalleryForm = {
  src: string;
  caption: string;
};

type FounderForm = {
  img: string;
  name: string;
  title: string;
  bio: string;
};

type OrgNodeForm = {
  parentId: number | null;
  title: string;
  subtitle: string;
  order: number;
};

type HostelForm = {
  name: string;
  location: string;
  contact: string;
  description: string;
  capacity: string;
  img: string;
};

type ScholarshipGenderKey = 'boys' | 'girls';

type ScholarshipGenderCount = {
  boys: number;
  girls: number;
  total: number;
};

type ScholarshipBoardSummary = ScholarshipGenderCount & {
  key: string;
  label: string;
};

type ScholarshipRangeSummary = {
  key: string;
  label: string;
  tenth: ScholarshipGenderCount;
  twelfth: ScholarshipGenderCount;
};

type ScholarshipSummary = {
  totalApplications: number;
  boys: number;
  girls: number;
  others: number;
  tenth: ScholarshipGenderCount;
  twelfth: ScholarshipGenderCount;
  outOfOut: {
    tenth: number;
    twelfth: number;
    total: number;
  };
  boards: ScholarshipBoardSummary[];
  ranges: ScholarshipRangeSummary[];
};

type ScholarshipPreviewDetails = {
  title: string;
  registrationNo?: string;
  totalMarks?: number;
  marksObtained?: number;
  percentage?: number;
};

type ScholarshipDocumentKind = 'image' | 'pdf' | 'file';

type ScholarshipPreviewItem = {
  src: string;
  alt: string;
  kind: ScholarshipDocumentKind;
  details: ScholarshipPreviewDetails;
};

type ScholarshipStatus = 'pending' | 'accepted' | 'rejected';
type ScholarshipListTab = 'all' | ScholarshipStatus;

const createAcademicYearLabel = (startYear: number): string => `AY-${startYear}-${startYear + 1}`;

const getDefaultAcademicYearLabel = (referenceDate = new Date()): string => {
  const startYear = referenceDate.getMonth() < 5
    ? referenceDate.getFullYear() - 1
    : referenceDate.getFullYear();

  return createAcademicYearLabel(startYear);
};

const SCHOLARSHIP_PERCENTAGE_BUCKETS = [
  { key: '90-91', label: '>=90% <91%', min: 90, max: 91 },
  { key: '91-92', label: '>=91% <92%', min: 91, max: 92 },
  { key: '92-93', label: '>=92% <93%', min: 92, max: 93 },
  { key: '93-94', label: '>=93% <94%', min: 93, max: 94 },
  { key: '94-95', label: '>=94% <95%', min: 94, max: 95 },
  { key: '95-96', label: '>=95% <96%', min: 95, max: 96 },
  { key: '96-97', label: '>=96% <97%', min: 96, max: 97 },
  { key: '97-98', label: '>=97% <98%', min: 97, max: 98 },
  { key: '98-99', label: '>=98% <99%', min: 98, max: 99 },
  { key: '99+', label: '>=99%', min: 99, max: 101 },
] as const;

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss'
})
export class AdminPanelComponent {
  private static readonly SCHOLARSHIP_SEARCH_DEBOUNCE_MS = 700;
  private static readonly SCHOLARSHIP_SEARCH_MIN_LENGTH = 3;
  readonly scholarshipListTabs: Array<{ key: ScholarshipListTab; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'rejected', label: 'Rejected' },
  ];

  auth   = inject(AuthService);
  data   = inject(AdminDataService);
  router = inject(Router);
  readonly cmLeaderItems = this.data.cmLeaders;
  readonly pastPresidentItems = this.data.pastPresidents;
  readonly eventItems = this.data.events;
  readonly galleryItems = this.data.gallery;
  readonly directoryItems = this.data.directoryEntries;
  readonly orgNodeItems = this.data.orgNodes;
  readonly tickerItems = this.data.tickers;
  readonly founderItems = this.data.founders;
  readonly hostelItems = this.data.hostels;

  activeTab = signal<Tab>('header');

  readonly textFieldsByTab: Partial<Record<Tab, TextField[]>> = {
    header: [
      { key: 'langbar.tagline', label: 'Language bar tagline' },
      { key: 'nav.home', label: 'Home label' },
      { key: 'nav.about', label: 'About label' },
      { key: 'nav.community', label: 'Community label' },
      { key: 'nav.events', label: 'Events label' },
      { key: 'nav.gallery', label: 'Gallery label' },
      { key: 'nav.directory', label: 'Directory label' },
      { key: 'nav.contact', label: 'Contact label' },
    ],
    hero: [
      { key: 'hero.title', label: 'Hero title' },
      { key: 'hero.tagline', label: 'Hero tagline', multiline: true, rows: 3 },
    ],
    founders: [
      { key: 'founders.title', label: 'Section title' },
      { key: 'founders.subtitle', label: 'Section subtitle' },
    ],
    mission: [
      { key: 'mv.title', label: 'Section title' },
      { key: 'mv.subtitle', label: 'Section subtitle' },
      { key: 'mv.missionCardTitle', label: 'Mission card title' },
      { key: 'mv.visionCardTitle', label: 'Vision card title' },
      { key: 'mv.m1', label: 'Mission point 1', multiline: true, rows: 2 },
      { key: 'mv.m2', label: 'Mission point 2', multiline: true, rows: 2 },
      { key: 'mv.m3', label: 'Mission point 3', multiline: true, rows: 2 },
      { key: 'mv.m4', label: 'Mission point 4', multiline: true, rows: 2 },
      { key: 'mv.visionText', label: 'Vision text', multiline: true, rows: 5 },
    ],
    president: [
      { key: 'presNote.title', label: 'Section title' },
      { key: 'presNote.subtitle', label: 'Section subtitle' },
      { key: 'presNote.name', label: 'President name' },
      { key: 'presNote.desg', label: 'President designation' },
      { key: 'presNote.quote', label: 'Quote', multiline: true, rows: 4 },
      { key: 'presNote.body', label: 'Message body', multiline: true, rows: 6 },
    ],
    org: [
      { key: 'orgChart.title', label: 'Section title' },
      { key: 'orgChart.subtitle', label: 'Section subtitle' },
    ],
    leaders: [
      { key: 'cmGallery.title', label: 'Section title' },
      { key: 'cmGallery.subtitle', label: 'Section subtitle' },
    ],
    bhavan: [
      { key: 'bhavan.title', label: 'Section title' },
      { key: 'bhavan.subtitle', label: 'Section subtitle' },
      { key: 'bhavan.infoTitle', label: 'Info card title' },
      { key: 'bhavan.info1', label: 'Info paragraph 1', multiline: true, rows: 3 },
      { key: 'bhavan.info2', label: 'Info paragraph 2', multiline: true, rows: 3 },
      { key: 'bhavan.addressLabel', label: 'Address label' },
    ],
    'past-presidents': [
      { key: 'pastPres.title', label: 'Section title' },
      { key: 'pastPres.subtitle', label: 'Section subtitle' },
    ],
    events: [
      { key: 'events.title', label: 'Section title' },
      { key: 'events.subtitle', label: 'Section subtitle' },
      { key: 'events.tabUpcoming', label: 'Upcoming tab label' },
      { key: 'events.tabPast', label: 'Past tab label' },
      { key: 'events.tabPresident', label: 'President tab label' },
      { key: 'events.learnMore', label: 'Learn more label' },
      { key: 'events.badge.upcoming', label: 'Upcoming badge label' },
      { key: 'events.badge.past', label: 'Past badge label' },
      { key: 'events.badge.open', label: 'Registration open badge label' },
      { key: 'events.badge.president', label: 'President badge label' },
    ],
    gallery: [
      { key: 'gallery.title', label: 'Section title' },
      { key: 'gallery.subtitle', label: 'Section subtitle' },
    ],
    directory: [
      { key: 'dir.title', label: 'Section title' },
      { key: 'dir.subtitle', label: 'Section subtitle' },
      { key: 'dir.tabHostels', label: 'Hostels tab label' },
      { key: 'dir.tabCrematories', label: 'Crematories tab label' },
      { key: 'dir.searchPlaceholder', label: 'Search placeholder' },
      { key: 'dir.allStates', label: 'All states option' },
      { key: 'dir.empty', label: 'Empty state message' },
    ],
    ticker: [
      { key: 'announce.label', label: 'Announcement label' },
    ],
    hostels: [
      { key: 'hostels.title', label: 'Section title' },
      { key: 'hostels.subtitle', label: 'Section subtitle' },
    ],
    footer: [
      { key: 'footer.tagline', label: 'Footer tagline', multiline: true, rows: 3 },
      { key: 'footer.quickLinks', label: 'Quick links heading' },
      { key: 'footer.community', label: 'Community heading' },
      { key: 'footer.contact', label: 'Contact heading' },
      { key: 'footer.hours', label: 'Working hours' },
      { key: 'footer.copyright', label: 'Copyright text' },
      { key: 'footer.link.home', label: 'Footer home link' },
      { key: 'footer.link.founders', label: 'Footer founders link' },
      { key: 'footer.link.mission', label: 'Footer mission link' },
      { key: 'footer.link.presNote', label: 'Footer president note link' },
      { key: 'footer.link.org', label: 'Footer organisation link' },
      { key: 'footer.link.cms', label: 'Footer leaders link' },
      { key: 'footer.link.bhavan', label: 'Footer bhavan link' },
      { key: 'footer.link.pastPres', label: 'Footer past presidents link' },
      { key: 'footer.link.events', label: 'Footer events link' },
      { key: 'footer.link.gallery', label: 'Footer gallery link' },
      { key: 'footer.link.hostels', label: 'Footer hostels link' },
      { key: 'footer.link.crematories', label: 'Footer crematories link' },
    ],
  };

  readonly eventCategories: AdminEventCategory[] = ['upcoming', 'past', 'president'];
  readonly eventBadges: AdminEventBadge[] = ['upcoming', 'past', 'open', 'president'];

  textDrafts: Record<string, string> = {};
  mediaBusy = signal(false);
  mediaError = signal('');
  navbarContent!: AdminNavbarContent;
  heroContent!: AdminHeroContent;
  presidentNoteContent!: AdminPresidentNoteContent;
  bhavanContent!: AdminBhavanContent;
  footerContent!: AdminFooterContent;
  navbarLogoFile: File | null = null;
  heroLogoFile: File | null = null;
  presidentPhotoFile: File | null = null;
  bhavanFiles: Array<File | null> = [null, null, null];

  showCmLeaderAdd = signal(false);
  editingCmLeaderId = signal<number | null>(null);
  newCmLeader: CmLeaderForm = { img: '', name: '', state: '', party: '' };
  editCmLeader: CmLeaderForm = { img: '', name: '', state: '', party: '' };
  newCmLeaderFile: File | null = null;
  editCmLeaderFile: File | null = null;

  showPastPresidentAdd = signal(false);
  editingPastPresidentId = signal<number | null>(null);
  newPastPresident: PastPresidentForm = { img: '', name: '', tenure: '' };
  editPastPresident: PastPresidentForm = { img: '', name: '', tenure: '' };
  newPastPresidentFile: File | null = null;
  editPastPresidentFile: File | null = null;

  showEventAdd = signal(false);
  editingEventId = signal<number | null>(null);
  newEvent: EventForm = {
    category: 'upcoming',
    img: '',
    date: '',
    title: '',
    description: '',
    badgeClass: 'upcoming',
    link: '#'
  };
  editEvent: EventForm = {
    category: 'upcoming',
    img: '',
    date: '',
    title: '',
    description: '',
    badgeClass: 'upcoming',
    link: '#'
  };
  newEventFile: File | null = null;
  editEventFile: File | null = null;

  showDirectoryAdd = signal(false);
  editingDirectoryId = signal<number | null>(null);
  newDirectoryEntry: DirectoryEntryForm = { name: '', state: '', district: '', address: '', contact: '', type: 'hostel' };
  editDirectoryEntry: DirectoryEntryForm = { name: '', state: '', district: '', address: '', contact: '', type: 'hostel' };

  showOrgNodeAdd = signal(false);
  editingOrgNodeId = signal<number | null>(null);
  newOrgNode: OrgNodeForm = this.emptyOrgNodeForm();
  editOrgNode: OrgNodeForm = this.emptyOrgNodeForm();

  // ── Gallery state ────────────────────────────────────
  showGalleryAdd   = signal(false);
  editingGalleryId = signal<number | null>(null);
  galleryBusy = signal(false);
  galleryError = signal('');
  newGallery: GalleryForm = { src: '', caption: '' };
  editGallery: GalleryForm = { src: '', caption: '' };
  newGalleryFile: File | null = null;
  editGalleryFile: File | null = null;

  startEditGallery(item: AdminGalleryItem) {
    this.editGallery = { src: item.src, caption: item.caption };
    this.editGalleryFile = null;
    this.galleryError.set('');
    this.editingGalleryId.set(item.id);
  }

  onNewGalleryFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.newGalleryFile = input.files?.[0] ?? null;
    this.galleryError.set('');
  }

  onEditGalleryFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.editGalleryFile = input.files?.[0] ?? null;
    this.galleryError.set('');
  }

  async addGallery() {
    if (!this.newGalleryFile) {
      this.galleryError.set('Select an image file before saving.');
      return;
    }

    this.galleryBusy.set(true);
    this.galleryError.set('');

    try {
      await this.data.addGalleryItem({ caption: this.newGallery.caption, file: this.newGalleryFile });
      this.newGallery = { src: '', caption: '' };
      this.newGalleryFile = null;
      this.showGalleryAdd.set(false);
    } catch {
      this.galleryError.set('Image upload failed. Make sure the local upload server is running.');
    } finally {
      this.galleryBusy.set(false);
    }
  }

  async saveGallery(id: number) {
    this.galleryBusy.set(true);
    this.galleryError.set('');

    try {
      await this.data.updateGalleryItem(id, {
        caption: this.editGallery.caption,
        file: this.editGalleryFile,
      });
      this.editGalleryFile = null;
      this.editingGalleryId.set(null);
    } catch {
      this.galleryError.set('Image update failed. Make sure the local upload server is running.');
    } finally {
      this.galleryBusy.set(false);
    }
  }

  async deleteGallery(id: number) {
    if (!confirm('Delete this image?')) return;

    this.galleryBusy.set(true);
    this.galleryError.set('');

    try {
      await this.data.deleteGalleryItem(id);
    } catch {
      this.galleryError.set('Image delete failed. Make sure the local upload server is running.');
    } finally {
      this.galleryBusy.set(false);
    }
  }

  cancelGalleryEdit() {
    this.editGalleryFile = null;
    this.editingGalleryId.set(null);
  }

  cancelGalleryAdd() {
    this.newGallery = { src: '', caption: '' };
    this.newGalleryFile = null;
    this.galleryError.set('');
    this.showGalleryAdd.set(false);
  }

  // ── Founders state ───────────────────────────────────
  showFounderAdd   = signal(false);
  editingFounderId = signal<number | null>(null);
  newFounder: FounderForm = { img: '', name: '', title: '', bio: '' };
  editFounder: FounderForm = { img: '', name: '', title: '', bio: '' };
  newFounderFile: File | null = null;
  editFounderFile: File | null = null;

  startEditFounder(f: AdminFounder) {
    this.editFounder = { img: f.img, name: f.name, title: f.title, bio: f.bio };
    this.editingFounderId.set(f.id);
  }

  // ── Ticker state ─────────────────────────────────────
  showTickerAdd   = signal(false);
  editingTickerId = signal<number | null>(null);
  newTickerText   = '';
  editTickerText  = '';

  startEditTicker(t: AdminTicker) {
    this.editTickerText = t.text;
    this.editingTickerId.set(t.id);
  }
  addTicker() {
    if (!this.newTickerText.trim()) return;
    this.data.addTicker(this.newTickerText.trim());
    this.newTickerText = '';
    this.showTickerAdd.set(false);
  }
  saveTicker(id: number) {
    this.data.updateTicker(id, this.editTickerText);
    this.editingTickerId.set(null);
  }
  deleteTicker(id: number) {
    if (confirm('Delete this announcement?')) this.data.deleteTicker(id);
  }

  // ── Hostels state ────────────────────────────────────
  showHostelAdd   = signal(false);
  editingHostelId = signal<number | null>(null);
  newHostel: HostelForm = { name: '', location: '', contact: '', description: '', capacity: '', img: '' };
  editHostel: HostelForm = { name: '', location: '', contact: '', description: '', capacity: '', img: '' };
  newHostelFile: File | null = null;
  editHostelFile: File | null = null;

  scholarshipApplications = signal<AdminScholarshipApplication[]>([]);
  scholarshipSummaryItems = signal<AdminScholarshipApplication[]>([]);
  scholarshipLoading = signal(false);
  scholarshipExporting = signal(false);
  scholarshipZipExporting = signal(false);
  scholarshipError = signal('');
  scholarshipPage = signal(1);
  scholarshipLimit = 10;
  scholarshipTotalItems = signal(0);
  scholarshipTotalPages = signal(0);
  scholarshipAcademicYearOptions = signal<ScholarshipAcademicYearOption[]>([]);
  scholarshipSelectedAcademicYearId = signal('');
  scholarshipActiveListTab = signal<ScholarshipListTab>('all');
  readonly scholarshipSelectedAcademicYearLabel = computed(() => {
    const selectedAcademicYear = this.scholarshipAcademicYearOptions()
      .find((year) => year._id === this.scholarshipSelectedAcademicYearId());

    return selectedAcademicYear?.label || getDefaultAcademicYearLabel();
  });
  scholarshipSearchDraft = signal('');
  scholarshipSearchTerm = signal('');
  scholarshipRegionSeedItems = signal<AdminScholarshipApplication[]>([]);
  scholarshipSelectedState = signal('');
  scholarshipSelectedDistrict = signal('');
  scholarshipSelectedTaluk = signal('');
  scholarshipStatusDrafts = signal<Record<string, ScholarshipStatus>>({});
  scholarshipCommentDrafts = signal<Record<string, string>>({});
  scholarshipStatusUpdating = signal<Record<string, boolean>>({});
  scholarshipPreviewApplication = signal<AdminScholarshipApplication | null>(null);
  scholarshipImagePreviewSrc = signal('');
  scholarshipImagePreviewAlt = signal('Scholarship document preview');
  scholarshipImagePreviewKind = signal<ScholarshipDocumentKind>('image');
  scholarshipImagePreviewDetails = signal<ScholarshipPreviewDetails | null>(null);
  scholarshipImagePreviewItems = signal<ScholarshipPreviewItem[]>([]);
  scholarshipImagePreviewIndex = signal(0);
  scholarshipImageZoom = signal(1);
  readonly scholarshipSummary = computed(() => this.buildScholarshipSummary(this.scholarshipSummaryItems()));
  readonly scholarshipTabCounts = computed(() => {
    const counts: Record<ScholarshipListTab, number> = {
      all: 0,
      pending: 0,
      accepted: 0,
      rejected: 0,
    };

    for (const item of this.scholarshipSummaryItems()) {
      const normalizedStatus = String(item.status || '').toLowerCase();
      counts.all += 1;

      if (normalizedStatus === 'accepted' || normalizedStatus === 'rejected') {
        counts[normalizedStatus] += 1;
      } else {
        counts.pending += 1;
      }
    }

    return counts;
  });
  private scholarshipSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private scholarshipLoadRequestId = 0;
  private scholarshipImagePanStage: HTMLDivElement | null = null;
  private scholarshipImagePanOriginX = 0;
  private scholarshipImagePanOriginY = 0;
  private scholarshipImagePanScrollLeft = 0;
  private scholarshipImagePanScrollTop = 0;
  isScholarshipImagePanning = false;

  constructor() {
    this.seedTextDrafts();
    this.navbarContent = this.clone(this.data.navbarContent());
    this.heroContent = this.clone(this.data.heroContent());
    this.presidentNoteContent = this.clone(this.data.presidentNoteContent());
    this.bhavanContent = this.clone(this.data.bhavanContent());
    this.footerContent = this.clone(this.data.footerContent());
  }

  async setTab(tab: Tab) {
    this.activeTab.set(tab);

    if (tab === 'scholarships') {
      await this.loadScholarshipAcademicYears();
      await this.loadScholarshipApplications(1);
    }
  }

  async loadScholarshipAcademicYears() {
    try {
      const years = await this.data.getScholarshipAcademicYears();
      this.scholarshipAcademicYearOptions.set(years);

      const preferredAcademicYear = years.find((year) => year.label === getDefaultAcademicYearLabel()) || years[0] || null;
      const selectedAcademicYearId = this.scholarshipSelectedAcademicYearId();
      const hasSelectedAcademicYear = years.some((year) => year._id === selectedAcademicYearId);

      if (!hasSelectedAcademicYear) {
        this.scholarshipSelectedAcademicYearId.set(preferredAcademicYear?._id || '');
      }
    } catch {
      this.scholarshipAcademicYearOptions.set([]);
      this.scholarshipSelectedAcademicYearId.set('');
      this.scholarshipError.set('Unable to load academic year right now.');
    }
  }

  async loadScholarshipApplications(page = 1) {
    const requestId = ++this.scholarshipLoadRequestId;
    this.scholarshipLoading.set(true);
    this.scholarshipError.set('');
    const academicYearId = this.scholarshipSelectedAcademicYearId();
    const search = this.scholarshipSearchTerm();
    const status = this.scholarshipActiveListTab() === 'all' ? '' : this.scholarshipActiveListTab();
    const state = this.scholarshipSelectedState();
    const district = this.scholarshipSelectedDistrict();
    const taluk = this.scholarshipSelectedTaluk();

    try {
      const [result, summaryResult, regionSeedResult] = await Promise.all([
        this.data.getScholarshipApplications({ page, limit: this.scholarshipLimit, academicYearId, search, status, state, district, taluk }),
        this.data.getScholarshipApplications({ all: true, academicYearId, search, status, state, district, taluk }).catch(() => null),
        this.data.getScholarshipApplications({ all: true, academicYearId }).catch(() => null),
      ]);

      if (requestId !== this.scholarshipLoadRequestId) {
        return;
      }

      this.scholarshipApplications.set(result.items);
      this.scholarshipSummaryItems.set(summaryResult?.items ?? result.items);
      this.scholarshipRegionSeedItems.set(regionSeedResult?.items ?? []);
      this.initializeScholarshipStatusDrafts(summaryResult?.items ?? result.items);
      this.scholarshipPage.set(result.pagination.page);
      this.scholarshipTotalItems.set(result.pagination.totalItems);
      this.scholarshipTotalPages.set(result.pagination.totalPages);
    } catch {
      if (requestId !== this.scholarshipLoadRequestId) {
        return;
      }

      this.scholarshipError.set('Unable to load scholarship applications. Please login again and retry.');
    } finally {
      if (requestId === this.scholarshipLoadRequestId) {
        this.scholarshipLoading.set(false);
      }
    }
  }

  async goToScholarshipPage(page: number) {
    const totalPages = this.scholarshipTotalPages();
    if (this.scholarshipLoading() || page < 1 || (totalPages > 0 && page > totalPages)) {
      return;
    }

    await this.loadScholarshipApplications(page);
  }

  async exportScholarshipsToExcel() {
    if (this.scholarshipExporting()) {
      return;
    }

    this.scholarshipExporting.set(true);
    this.scholarshipError.set('');

    try {
      const { utils, writeFile } = await import('xlsx');
      const academicYearId = this.scholarshipSelectedAcademicYearId();
      const academicYearLabel = this.scholarshipSelectedAcademicYearLabel();
      const result = await this.data.getScholarshipApplications({ all: true, academicYearId });

      const rows = result.items.map((item: AdminScholarshipApplication, index: number) => ({
        'Sl No': index + 1,
        'Application No': item.applicationNumber,
        'Academic Year': item.academicYear,
        'Registration No': item.registrationNo,
        'Student Name': `${item.firstName} ${item.middleName || ''} ${item.lastName}`.replace(/\s+/g, ' ').trim(),
        Gender: item.gender,
        'Father Name': item.fatherName,
        'Mother Name': item.motherName,
        Mobile: item.mobile,
        'Email ID': item.emailId,
        Village: item.village,
        Taluk: item.taluk,
        District: item.district,
        State: item.state,
        'PIN Code': item.pinCode,
        'Aadhaar Number': item.aadhaarNumber,
        Board: item.board,
        Standard: item.standard,
        'Marks Obtained': item.marksObtained,
        'Total Marks': item.totalMarks,
        Percentage: item.percentage,
        'Heard From Member': item.heardFromMember ? 'Yes' : 'No',
        'Reference Member Category': item.referringMemberCategory,
        'Reference Member Name': item.referringMemberName,
        'Reference Member Registration No': item.referringMemberRegistrationNo,
        Status: item.status,
        'Submitted At': item.submittedAt,
        'Profile Photo URL': this.imageUrl(item.profilePhotoUrl),
        'Caste Certificate URL': this.imageUrl(item.casteCertificateUrl),
        'Marks Card URL': this.imageUrl(item.marksCardUrl),
        'Aadhaar Copy URL': this.imageUrl(item.aadhaarCardUrl || ''),
        'Aadhaar Offline File URL': item.aadhaarOfflineFileUrl ? this.imageUrl(item.aadhaarOfflineFileUrl) : '',
      }));

      const worksheet = utils.json_to_sheet(rows);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Scholarships');

      const safeYear = academicYearLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      writeFile(workbook, `scholarship-applications-${safeYear}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      this.scholarshipError.set('Excel export failed. Please retry.');
    } finally {
      this.scholarshipExporting.set(false);
    }
  }

  async downloadScholarshipUploadsZip() {
    if (this.scholarshipZipExporting()) {
      return;
    }

    this.scholarshipZipExporting.set(true);
    this.scholarshipError.set('');
    const academicYearId = this.scholarshipSelectedAcademicYearId();
    const academicYearLabel = this.scholarshipSelectedAcademicYearLabel();

    try {
      const zipBlob = await this.data.downloadScholarshipUploadsZip(academicYearId);
      const blobUrl = URL.createObjectURL(zipBlob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = `scholarship-uploads-${academicYearLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.zip`;
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      this.scholarshipError.set('ZIP export failed. Please retry.');
    } finally {
      this.scholarshipZipExporting.set(false);
    }
  }

  async onScholarshipAcademicYearChanged(academicYearId: string) {
    this.scholarshipSelectedAcademicYearId.set(academicYearId);
    await this.loadScholarshipApplications(1);
  }

  async setScholarshipListTab(tab: ScholarshipListTab) {
    if (this.scholarshipActiveListTab() === tab) {
      return;
    }

    this.scholarshipActiveListTab.set(tab);
    await this.loadScholarshipApplications(1);
  }

  onScholarshipSearchDraftChanged(value: string) {
    this.scholarshipSearchDraft.set(value);

    if (this.scholarshipSearchDebounceTimer) {
      clearTimeout(this.scholarshipSearchDebounceTimer);
    }

    this.scholarshipSearchDebounceTimer = setTimeout(() => {
      this.scholarshipSearchDebounceTimer = null;
      void this.applyScholarshipSearch();
    }, AdminPanelComponent.SCHOLARSHIP_SEARCH_DEBOUNCE_MS);
  }

  async submitScholarshipSearchFromKeyboard(event: Event) {
    event.preventDefault();
    if (this.scholarshipSearchDebounceTimer) {
      clearTimeout(this.scholarshipSearchDebounceTimer);
      this.scholarshipSearchDebounceTimer = null;
    }
    await this.applyScholarshipSearch();
  }

  async applyScholarshipSearch() {
    const nextSearchTerm = this.scholarshipSearchDraft().trim();
    if (nextSearchTerm && nextSearchTerm.length < AdminPanelComponent.SCHOLARSHIP_SEARCH_MIN_LENGTH) {
      return;
    }

    if (nextSearchTerm === this.scholarshipSearchTerm()) {
      return;
    }

    this.scholarshipSearchTerm.set(nextSearchTerm);
    await this.loadScholarshipApplications(1);
  }

  async clearScholarshipSearch() {
    if (this.scholarshipSearchDebounceTimer) {
      clearTimeout(this.scholarshipSearchDebounceTimer);
      this.scholarshipSearchDebounceTimer = null;
    }

    this.scholarshipSearchDraft.set('');
    this.scholarshipSearchTerm.set('');
    await this.loadScholarshipApplications(1);
  }

  get scholarshipStateOptions(): string[] {
    return [...new Set(this.scholarshipRegionSeedItems().map((item) => item.state).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  }

  get scholarshipDistrictOptions(): string[] {
    const selectedState = this.scholarshipSelectedState();
    return [...new Set(this.scholarshipRegionSeedItems()
      .filter((item) => !selectedState || item.state === selectedState)
      .map((item) => item.district)
      .filter(Boolean))].sort((left, right) => left.localeCompare(right));
  }

  get scholarshipTalukOptions(): string[] {
    const selectedState = this.scholarshipSelectedState();
    const selectedDistrict = this.scholarshipSelectedDistrict();
    return [...new Set(this.scholarshipRegionSeedItems()
      .filter((item) => (!selectedState || item.state === selectedState) && (!selectedDistrict || item.district === selectedDistrict))
      .map((item) => item.taluk)
      .filter(Boolean))].sort((left, right) => left.localeCompare(right));
  }

  async onScholarshipStateChanged(state: string) {
    this.scholarshipSelectedState.set(state);
    this.scholarshipSelectedDistrict.set('');
    this.scholarshipSelectedTaluk.set('');
    await this.loadScholarshipApplications(1);
  }

  async onScholarshipDistrictChanged(district: string) {
    this.scholarshipSelectedDistrict.set(district);
    this.scholarshipSelectedTaluk.set('');
    await this.loadScholarshipApplications(1);
  }

  async onScholarshipTalukChanged(taluk: string) {
    this.scholarshipSelectedTaluk.set(taluk);
    await this.loadScholarshipApplications(1);
  }

  async clearScholarshipRegionFilters() {
    this.scholarshipSelectedState.set('');
    this.scholarshipSelectedDistrict.set('');
    this.scholarshipSelectedTaluk.set('');
    await this.loadScholarshipApplications(1);
  }

  scholarshipStatusLabel(status: string) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'accepted') {
      return 'Accepted';
    }

    if (normalized === 'rejected') {
      return 'Rejected';
    }

    return 'Pending';
  }

  scholarshipStatusDraft(id: string) {
    return this.scholarshipStatusDrafts()[id] || 'pending';
  }

  scholarshipCommentDraft(id: string) {
    return this.scholarshipCommentDrafts()[id] || '';
  }

  onScholarshipStatusDraftChanged(id: string, status: ScholarshipStatus) {
    this.scholarshipStatusDrafts.update((drafts) => ({ ...drafts, [id]: status }));

    if (status !== 'rejected') {
      this.scholarshipCommentDrafts.update((drafts) => ({ ...drafts, [id]: '' }));
    }
  }

  onScholarshipCommentDraftChanged(id: string, comment: string) {
    this.scholarshipCommentDrafts.update((drafts) => ({ ...drafts, [id]: comment }));
  }

  async updateScholarshipStatus(item: AdminScholarshipApplication) {
    const nextStatus = this.scholarshipStatusDraft(item._id);
    const rejectionComment = this.scholarshipCommentDraft(item._id).trim();

    if (nextStatus === 'rejected' && !rejectionComment) {
      this.scholarshipError.set('Rejection comment is required when rejecting an application.');
      return;
    }

    this.scholarshipStatusUpdating.update((drafts) => ({ ...drafts, [item._id]: true }));
    this.scholarshipError.set('');

    try {
      const updated = await this.data.updateScholarshipApplicationStatus(item._id, nextStatus, rejectionComment);
      if (this.scholarshipPreviewApplication()?._id === updated._id) {
        this.scholarshipPreviewApplication.set(updated);
      }
      if (this.scholarshipActiveListTab() !== 'all' && this.scholarshipActiveListTab() !== updated.status) {
        this.closeScholarshipImagePreview();
      }
      await this.loadScholarshipApplications(this.scholarshipPage());
    } catch {
      this.scholarshipError.set('Unable to update scholarship status. Please retry.');
    } finally {
      this.scholarshipStatusUpdating.update((drafts) => ({ ...drafts, [item._id]: false }));
    }
  }

  imageUrl(path: string) {
    if (!path) {
      return '';
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    return buildManagedAssetUrl(path);
  }

  scholarshipStatusClass(status: string) {
    const normalized = String(status || '').toLowerCase();

    if (normalized === 'accepted') {
      return 'is-accepted';
    }

    if (normalized === 'rejected') {
      return 'is-rejected';
    }

    return 'is-pending';
  }

  scholarshipDocumentKind(path: string): ScholarshipDocumentKind {
    const normalized = String(path || '').split('?')[0].toLowerCase();

    if (/\.(png|jpe?g|webp|gif|bmp|svg)$/.test(normalized)) {
      return 'image';
    }

    if (/\.pdf$/.test(normalized)) {
      return 'pdf';
    }

    return 'file';
  }

  openScholarshipApplicationImagePreview(item: AdminScholarshipApplication, startIndex: number) {
    const previewItems: ScholarshipPreviewItem[] = [
      {
        src: this.imageUrl(item.profilePhotoUrl),
        alt: 'Profile photo',
        kind: this.scholarshipDocumentKind(item.profilePhotoUrl),
        details: { title: 'Profile photo' },
      },
      {
        src: this.imageUrl(item.casteCertificateUrl),
        alt: 'Caste certificate',
        kind: this.scholarshipDocumentKind(item.casteCertificateUrl),
        details: { title: 'Caste certificate' },
      },
      {
        src: this.imageUrl(item.marksCardUrl),
        alt: 'Marks card',
        kind: this.scholarshipDocumentKind(item.marksCardUrl),
        details: {
          title: 'Marks card verification',
          registrationNo: item.registrationNo,
          totalMarks: item.totalMarks,
          marksObtained: item.marksObtained,
          percentage: item.percentage,
        },
      },
      {
        src: this.imageUrl(item.aadhaarCardUrl || ''),
        alt: 'Aadhaar copy',
        kind: this.scholarshipDocumentKind(item.aadhaarCardUrl || ''),
        details: { title: 'Aadhaar copy' },
      },
    ].filter((entry) => !!entry.src);

    if (!previewItems.length) {
      return;
    }

    const safeIndex = Math.min(Math.max(startIndex, 0), previewItems.length - 1);
    this.scholarshipPreviewApplication.set(item);
    this.scholarshipImagePreviewItems.set(previewItems);
    this.setScholarshipPreviewIndex(safeIndex);
    document.body.style.overflow = 'hidden';
  }

  openScholarshipImagePreview(path: string, alt: string, details?: ScholarshipPreviewDetails) {
    const resolvedUrl = this.imageUrl(path);
    if (!resolvedUrl) {
      return;
    }

    const kind = this.scholarshipDocumentKind(path);

    this.scholarshipImagePreviewItems.set([
      {
        src: resolvedUrl,
        alt: alt || 'Scholarship document preview',
        kind,
        details: details ?? { title: alt || 'Scholarship document preview' },
      },
    ]);
    this.scholarshipPreviewApplication.set(null);
    this.setScholarshipPreviewIndex(0);
    document.body.style.overflow = 'hidden';
  }

  closeScholarshipImagePreview() {
    this.scholarshipPreviewApplication.set(null);
    this.scholarshipImagePreviewSrc.set('');
    this.scholarshipImagePreviewDetails.set(null);
    this.scholarshipImagePreviewKind.set('image');
    this.scholarshipImagePreviewItems.set([]);
    this.scholarshipImagePreviewIndex.set(0);
    this.scholarshipImageZoom.set(1);
    this.scholarshipImagePanStage = null;
    this.isScholarshipImagePanning = false;
    document.body.style.overflow = '';
  }

  showPreviousScholarshipImage() {
    const items = this.scholarshipImagePreviewItems();
    const index = this.scholarshipImagePreviewIndex();
    if (items.length <= 1 || index <= 0) {
      return;
    }

    this.setScholarshipPreviewIndex(index - 1);
  }

  showNextScholarshipImage() {
    const items = this.scholarshipImagePreviewItems();
    const index = this.scholarshipImagePreviewIndex();
    if (items.length <= 1 || index >= items.length - 1) {
      return;
    }

    this.setScholarshipPreviewIndex(index + 1);
  }

  zoomInScholarshipImage() {
    this.scholarshipImageZoom.update((zoom) => Math.min(zoom + 0.25, 3));
  }

  zoomOutScholarshipImage() {
    this.scholarshipImageZoom.update((zoom) => Math.max(zoom - 0.25, 0.5));
  }

  resetScholarshipImageZoom() {
    this.scholarshipImageZoom.set(1);
  }

  private setScholarshipPreviewIndex(index: number) {
    const items = this.scholarshipImagePreviewItems();
    const current = items[index];
    if (!current) {
      return;
    }

    this.scholarshipImagePreviewIndex.set(index);
    this.scholarshipImagePreviewSrc.set(current.src);
    this.scholarshipImagePreviewAlt.set(current.alt);
    this.scholarshipImagePreviewKind.set(current.kind);
    this.scholarshipImagePreviewDetails.set(current.details);
    this.scholarshipImageZoom.set(1);
    if (this.scholarshipImagePanStage) {
      this.scholarshipImagePanStage.scrollLeft = 0;
      this.scholarshipImagePanStage.scrollTop = 0;
    }
  }

  startScholarshipImagePan(event: MouseEvent, stage: HTMLDivElement) {
    if (this.scholarshipImageZoom() <= 1) {
      return;
    }

    event.preventDefault();
    this.scholarshipImagePanStage = stage;
    this.scholarshipImagePanOriginX = event.clientX;
    this.scholarshipImagePanOriginY = event.clientY;
    this.scholarshipImagePanScrollLeft = stage.scrollLeft;
    this.scholarshipImagePanScrollTop = stage.scrollTop;
    this.isScholarshipImagePanning = true;
  }

  @HostListener('document:mousemove', ['$event'])
  onScholarshipImagePan(event: MouseEvent) {
    if (!this.isScholarshipImagePanning || !this.scholarshipImagePanStage) {
      return;
    }

    const deltaX = event.clientX - this.scholarshipImagePanOriginX;
    const deltaY = event.clientY - this.scholarshipImagePanOriginY;
    this.scholarshipImagePanStage.scrollLeft = this.scholarshipImagePanScrollLeft - deltaX;
    this.scholarshipImagePanStage.scrollTop = this.scholarshipImagePanScrollTop - deltaY;
  }

  @HostListener('document:mouseup')
  stopScholarshipImagePan() {
    this.isScholarshipImagePanning = false;
    this.scholarshipImagePanStage = null;
  }

  downloadScholarshipPreviewImage() {
    const src = this.scholarshipImagePreviewSrc();
    if (!src) {
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = src;
    anchor.download = this.scholarshipImagePreviewAlt().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'scholarship-document';
    anchor.click();
  }

  private initializeScholarshipStatusDrafts(items: AdminScholarshipApplication[]) {
    const statusDrafts: Record<string, ScholarshipStatus> = {};
    const commentDrafts: Record<string, string> = {};

    for (const item of items) {
      const normalizedStatus = String(item.status || 'pending').toLowerCase();
      statusDrafts[item._id] = (normalizedStatus === 'accepted' || normalizedStatus === 'rejected' ? normalizedStatus : 'pending');
      commentDrafts[item._id] = item.rejectionComment || '';
    }

    this.scholarshipStatusDrafts.set(statusDrafts);
    this.scholarshipCommentDrafts.set(commentDrafts);
  }

  clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private createScholarshipGenderCount(): ScholarshipGenderCount {
    return { boys: 0, girls: 0, total: 0 };
  }

  private addScholarshipCount(target: ScholarshipGenderCount, gender: ScholarshipGenderKey | null) {
    target.total += 1;

    if (gender) {
      target[gender] += 1;
    }
  }

  private scholarshipGenderKey(gender: string): ScholarshipGenderKey | null {
    const normalized = gender.trim().toLowerCase();

    if (normalized === 'male' || normalized === 'boy' || normalized === 'boys') {
      return 'boys';
    }

    if (normalized === 'female' || normalized === 'girl' || normalized === 'girls') {
      return 'girls';
    }

    return null;
  }

  private scholarshipBoardKey(board: string): string | null {
    const normalized = board.trim().toLowerCase();

    if (normalized === 'state' || normalized === 'state board' || normalized === 'sb' || normalized === 'sslc') {
      return 'SB';
    }

    if (normalized === 'cbse') {
      return 'CBSE';
    }

    if (normalized === 'icse') {
      return 'ICSE';
    }

    return null;
  }

  private scholarshipStandardKey(standard: string): '10th' | '12th' | null {
    const normalized = standard.trim().toLowerCase();

    if (normalized.includes('10')) {
      return '10th';
    }

    if (normalized.includes('12')) {
      return '12th';
    }

    return null;
  }

  private scholarshipRangeKey(percentage: number): string | null {
    const bucket = SCHOLARSHIP_PERCENTAGE_BUCKETS.find(entry => percentage >= entry.min && percentage < entry.max);
    return bucket?.key ?? null;
  }

  private buildScholarshipSummary(items: AdminScholarshipApplication[]): ScholarshipSummary {
    const tenth = this.createScholarshipGenderCount();
    const twelfth = this.createScholarshipGenderCount();
    const boards: ScholarshipBoardSummary[] = [
      { key: 'SB', label: 'SB', ...this.createScholarshipGenderCount() },
      { key: 'CBSE', label: 'CBSE', ...this.createScholarshipGenderCount() },
      { key: 'ICSE', label: 'ICSE', ...this.createScholarshipGenderCount() },
    ];
    const boardMap = new Map(boards.map(entry => [entry.key, entry]));
    const ranges: ScholarshipRangeSummary[] = SCHOLARSHIP_PERCENTAGE_BUCKETS.map(entry => ({
      key: entry.key,
      label: entry.label,
      tenth: this.createScholarshipGenderCount(),
      twelfth: this.createScholarshipGenderCount(),
    }));
    const rangeMap = new Map(ranges.map(entry => [entry.key, entry]));
    const outOfOut = { tenth: 0, twelfth: 0, total: 0 };

    let boys = 0;
    let girls = 0;

    for (const item of items) {
      const gender = this.scholarshipGenderKey(item.gender);
      const boardKey = this.scholarshipBoardKey(item.board);
      const board = boardKey ? boardMap.get(boardKey) : undefined;
      const standard = this.scholarshipStandardKey(item.standard);
      const range = rangeMap.get(this.scholarshipRangeKey(item.percentage) ?? '');

      if (gender === 'boys') {
        boys += 1;
      } else if (gender === 'girls') {
        girls += 1;
      }

      if (board) {
        this.addScholarshipCount(board, gender);
      }

      if (standard === '10th') {
        this.addScholarshipCount(tenth, gender);

        if (item.marksObtained >= item.totalMarks) {
          outOfOut.tenth += 1;
          outOfOut.total += 1;
        }

        if (range) {
          this.addScholarshipCount(range.tenth, gender);
        }
      } else if (standard === '12th') {
        this.addScholarshipCount(twelfth, gender);

        if (item.marksObtained >= item.totalMarks) {
          outOfOut.twelfth += 1;
          outOfOut.total += 1;
        }

        if (range) {
          this.addScholarshipCount(range.twelfth, gender);
        }
      }
    }

    return {
      totalApplications: items.length,
      boys,
      girls,
      others: Math.max(items.length - boys - girls, 0),
      tenth,
      twelfth,
      outOfOut,
      boards,
      ranges,
    };
  }

  private emptyOrgNodeForm(parentId: number | null = null): OrgNodeForm {
    return { parentId, title: '', subtitle: '', order: 0 };
  }

  private fileFromEvent(event: Event) {
    const input = event.target as HTMLInputElement;
    return input.files?.[0] ?? null;
  }

  private async runMediaAction(action: () => Promise<void>, errorMessage: string) {
    if (this.mediaBusy()) {
      return;
    }

    this.mediaBusy.set(true);
    this.mediaError.set('');

    try {
      await action();
    } catch {
      this.mediaError.set(errorMessage);
    } finally {
      this.mediaBusy.set(false);
    }
  }

  selectedFileName(file: File | null) {
    return file?.name ?? '';
  }

  defaultTextValue(key: string): string {
    const override = this.data.getTextOverride(key);
    if (override !== undefined) return override;
    const map = translations[key];
    return map?.en ?? map?.kn ?? '';
  }

  seedTextDrafts() {
    for (const fields of Object.values(this.textFieldsByTab)) {
      for (const field of fields ?? []) {
        this.textDrafts[field.key] = this.defaultTextValue(field.key);
      }
    }
  }

  textFieldsFor(tab: Tab): TextField[] {
    return this.textFieldsByTab[tab] ?? [];
  }

  hasTextFields(tab: Tab): boolean {
    return this.textFieldsFor(tab).length > 0;
  }

  saveTextFields(tab: Tab) {
    for (const field of this.textFieldsFor(tab)) {
      this.data.setTextOverride(field.key, this.textDrafts[field.key] ?? '');
    }
  }

  resetTextFields(tab: Tab) {
    for (const field of this.textFieldsFor(tab)) {
      this.data.clearTextOverride(field.key);
      this.textDrafts[field.key] = this.defaultTextValue(field.key);
    }
  }

  addHeroStat() {
    this.heroContent.stats = [...this.heroContent.stats, { id: Date.now(), value: '', label: '' }];
  }

  deleteHeroStat(id: number) {
    this.heroContent.stats = this.heroContent.stats.filter(stat => stat.id !== id);
  }

  onNavbarLogoSelected(event: Event) {
    this.navbarLogoFile = this.fileFromEvent(event);
  }

  onHeroLogoSelected(event: Event) {
    this.heroLogoFile = this.fileFromEvent(event);
  }

  onPresidentPhotoSelected(event: Event) {
    this.presidentPhotoFile = this.fileFromEvent(event);
  }

  onBhavanImageSelected(index: number, event: Event) {
    this.bhavanFiles[index] = this.fileFromEvent(event);
  }

  async saveNavbarContent() {
    await this.runMediaAction(async () => {
      await this.data.saveNavbarContent(this.navbarContent, this.navbarLogoFile);
      this.navbarContent = this.clone(this.data.navbarContent());
      this.navbarLogoFile = null;
    }, 'Header image save failed. Make sure the local upload server is running.');
  }

  async saveHeroContent() {
    await this.runMediaAction(async () => {
      await this.data.saveHeroContent(this.heroContent, this.heroLogoFile);
      this.heroContent = this.clone(this.data.heroContent());
      this.heroLogoFile = null;
    }, 'Hero image save failed. Make sure the local upload server is running.');
  }

  async savePresidentNoteContent() {
    await this.runMediaAction(async () => {
      await this.data.savePresidentNoteContent(this.presidentNoteContent, this.presidentPhotoFile);
      this.presidentNoteContent = this.clone(this.data.presidentNoteContent());
      this.presidentPhotoFile = null;
    }, 'President image save failed. Make sure the local upload server is running.');
  }

  async saveBhavanContent() {
    await this.runMediaAction(async () => {
      await this.data.saveBhavanContent(this.bhavanContent, this.bhavanFiles);
      this.bhavanContent = this.clone(this.data.bhavanContent());
      this.bhavanFiles = [null, null, null];
    }, 'Bhavan image save failed. Make sure the local upload server is running.');
  }

  saveFooterContent() {
    this.data.saveFooterContent(this.footerContent);
    this.footerContent = this.clone(this.data.footerContent());
  }

  startEditCmLeader(item: AdminCmLeader) {
    this.editCmLeader = { img: item.img, name: item.name, state: item.state, party: item.party };
    this.editCmLeaderFile = null;
    this.editingCmLeaderId.set(item.id);
  }

  onNewCmLeaderFileSelected(event: Event) {
    this.newCmLeaderFile = this.fileFromEvent(event);
  }

  onEditCmLeaderFileSelected(event: Event) {
    this.editCmLeaderFile = this.fileFromEvent(event);
  }

  async addCmLeader() {
    if (!this.newCmLeader.name.trim() || !this.newCmLeaderFile) return;

    await this.runMediaAction(async () => {
      await this.data.addCmLeader({
        name: this.newCmLeader.name,
        state: this.newCmLeader.state,
        party: this.newCmLeader.party,
      }, this.newCmLeaderFile as File);
      this.newCmLeader = { img: '', name: '', state: '', party: '' };
      this.newCmLeaderFile = null;
      this.showCmLeaderAdd.set(false);
    }, 'Leader image upload failed. Make sure the local upload server is running.');
  }

  async saveCmLeader(id: number) {
    await this.runMediaAction(async () => {
      await this.data.updateCmLeader(id, {
        name: this.editCmLeader.name,
        state: this.editCmLeader.state,
        party: this.editCmLeader.party,
      }, this.editCmLeaderFile);
      this.editCmLeaderFile = null;
      this.editingCmLeaderId.set(null);
    }, 'Leader image update failed. Make sure the local upload server is running.');
  }

  async deleteCmLeader(id: number) {
    if (!confirm('Delete this leader?')) return;

    await this.runMediaAction(async () => {
      await this.data.deleteCmLeader(id);
    }, 'Leader delete failed. Make sure the local upload server is running.');
  }

  startEditPastPresident(item: AdminPastPresident) {
    this.editPastPresident = { img: item.img, name: item.name, tenure: item.tenure };
    this.editPastPresidentFile = null;
    this.editingPastPresidentId.set(item.id);
  }

  onNewPastPresidentFileSelected(event: Event) {
    this.newPastPresidentFile = this.fileFromEvent(event);
  }

  onEditPastPresidentFileSelected(event: Event) {
    this.editPastPresidentFile = this.fileFromEvent(event);
  }

  async addPastPresident() {
    if (!this.newPastPresident.name.trim() || !this.newPastPresidentFile) return;

    await this.runMediaAction(async () => {
      await this.data.addPastPresident({
        name: this.newPastPresident.name,
        tenure: this.newPastPresident.tenure,
      }, this.newPastPresidentFile as File);
      this.newPastPresident = { img: '', name: '', tenure: '' };
      this.newPastPresidentFile = null;
      this.showPastPresidentAdd.set(false);
    }, 'Past president image upload failed. Make sure the local upload server is running.');
  }

  async savePastPresident(id: number) {
    await this.runMediaAction(async () => {
      await this.data.updatePastPresident(id, {
        name: this.editPastPresident.name,
        tenure: this.editPastPresident.tenure,
      }, this.editPastPresidentFile);
      this.editPastPresidentFile = null;
      this.editingPastPresidentId.set(null);
    }, 'Past president image update failed. Make sure the local upload server is running.');
  }

  async deletePastPresident(id: number) {
    if (!confirm('Delete this record?')) return;

    await this.runMediaAction(async () => {
      await this.data.deletePastPresident(id);
    }, 'Past president delete failed. Make sure the local upload server is running.');
  }

  startEditEvent(item: AdminEvent) {
    this.editEvent = {
      category: item.category,
      img: item.img,
      date: item.date,
      title: item.title,
      description: item.description,
      badgeClass: item.badgeClass,
      link: item.link,
    };
    this.editEventFile = null;
    this.editingEventId.set(item.id);
  }

  onNewEventFileSelected(event: Event) {
    this.newEventFile = this.fileFromEvent(event);
  }

  onEditEventFileSelected(event: Event) {
    this.editEventFile = this.fileFromEvent(event);
  }

  async addEvent() {
    if (!this.newEvent.title.trim() || !this.newEventFile) return;

    await this.runMediaAction(async () => {
      await this.data.addEvent({
        category: this.newEvent.category,
        date: this.newEvent.date,
        title: this.newEvent.title,
        description: this.newEvent.description,
        badgeClass: this.newEvent.badgeClass,
        link: this.newEvent.link,
      }, this.newEventFile as File);
      this.newEvent = { category: 'upcoming', img: '', date: '', title: '', description: '', badgeClass: 'upcoming', link: '#' };
      this.newEventFile = null;
      this.showEventAdd.set(false);
    }, 'Event image upload failed. Make sure the local upload server is running.');
  }

  async saveEvent(id: number) {
    await this.runMediaAction(async () => {
      await this.data.updateEvent(id, {
        category: this.editEvent.category,
        date: this.editEvent.date,
        title: this.editEvent.title,
        description: this.editEvent.description,
        badgeClass: this.editEvent.badgeClass,
        link: this.editEvent.link,
      }, this.editEventFile);
      this.editEventFile = null;
      this.editingEventId.set(null);
    }, 'Event image update failed. Make sure the local upload server is running.');
  }

  async deleteEvent(id: number) {
    if (!confirm('Delete this event?')) return;

    await this.runMediaAction(async () => {
      await this.data.deleteEvent(id);
    }, 'Event delete failed. Make sure the local upload server is running.');
  }

  startEditDirectoryEntry(item: AdminDirectoryEntry) {
    this.editDirectoryEntry = {
      name: item.name,
      state: item.state,
      district: item.district,
      address: item.address,
      contact: item.contact,
      type: item.type,
    };
    this.editingDirectoryId.set(item.id);
  }

  addDirectoryEntry() {
    if (!this.newDirectoryEntry.name.trim()) return;
    this.data.addDirectoryEntry({ ...this.newDirectoryEntry });
    this.newDirectoryEntry = { name: '', state: '', district: '', address: '', contact: '', type: 'hostel' };
    this.showDirectoryAdd.set(false);
  }

  saveDirectoryEntry(id: number) {
    this.data.updateDirectoryEntry(id, { ...this.editDirectoryEntry });
    this.editingDirectoryId.set(null);
  }

  deleteDirectoryEntry(id: number) {
    if (confirm('Delete this entry?')) this.data.deleteDirectoryEntry(id);
  }

  private isOrgNodeInSubtree(candidateId: number, rootId: number): boolean {
    const childrenByParent = new Map<number, number[]>();

    for (const node of this.orgNodeItems()) {
      if (node.parentId === null) {
        continue;
      }

      const children = childrenByParent.get(node.parentId) ?? [];
      children.push(node.id);
      childrenByParent.set(node.parentId, children);
    }

    const queue = [rootId];
    while (queue.length) {
      const current = queue.shift() as number;
      if (current === candidateId) {
        return true;
      }

      for (const childId of childrenByParent.get(current) ?? []) {
        queue.push(childId);
      }
    }

    return false;
  }

  orgParentOptions(excludeId: number | null = null) {
    return this.orgNodeItems()
      .filter(node => excludeId === null ? true : !this.isOrgNodeInSubtree(node.id, excludeId))
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  orgNodeDepth(node: AdminOrgNode) {
    let depth = 0;
    let currentParentId = node.parentId;
    const nodesById = new Map(this.orgNodeItems().map(item => [item.id, item] as const));

    while (currentParentId !== null) {
      const parent = nodesById.get(currentParentId);
      if (!parent) {
        break;
      }

      depth += 1;
      currentParentId = parent.parentId;
    }

    return depth;
  }

  orgNodePath(node: AdminOrgNode) {
    const nodesById = new Map(this.orgNodeItems().map(item => [item.id, item] as const));
    const segments = [node.title];
    let currentParentId = node.parentId;

    while (currentParentId !== null) {
      const parent = nodesById.get(currentParentId);
      if (!parent) {
        break;
      }

      segments.unshift(parent.title);
      currentParentId = parent.parentId;
    }

    return segments.join(' / ');
  }

  orgNodesForDisplay() {
    const nodes = [...this.orgNodeItems()].sort((a, b) => a.order - b.order || a.id - b.id);
    const childrenByParent = new Map<number | null, AdminOrgNode[]>();

    for (const node of nodes) {
      const children = childrenByParent.get(node.parentId) ?? [];
      children.push(node);
      childrenByParent.set(node.parentId, children);
    }

    const ordered: Array<{ node: AdminOrgNode; depth: number }> = [];
    const visit = (parentId: number | null, depth: number) => {
      for (const child of childrenByParent.get(parentId) ?? []) {
        ordered.push({ node: child, depth });
        visit(child.id, depth + 1);
      }
    };

    visit(null, 0);
    return ordered;
  }

  startAddOrgNode(parent?: AdminOrgNode) {
    this.newOrgNode = this.emptyOrgNodeForm(parent?.id ?? null);
    this.showOrgNodeAdd.set(true);
  }

  cancelAddOrgNode() {
    this.newOrgNode = this.emptyOrgNodeForm();
    this.showOrgNodeAdd.set(false);
  }

  startEditOrgNode(node: AdminOrgNode) {
    this.editOrgNode = {
      parentId: node.parentId,
      title: node.title,
      subtitle: node.subtitle,
      order: node.order,
    };
    this.editingOrgNodeId.set(node.id);
  }

  cancelEditOrgNode() {
    this.editOrgNode = this.emptyOrgNodeForm();
    this.editingOrgNodeId.set(null);
  }

  addOrgNode() {
    if (!this.newOrgNode.title.trim()) return;

    this.data.addOrgNode({
      parentId: this.newOrgNode.parentId,
      title: this.newOrgNode.title,
      subtitle: this.newOrgNode.subtitle,
      order: this.newOrgNode.order,
    });
    this.cancelAddOrgNode();
  }

  saveOrgNode(id: number) {
    if (!this.editOrgNode.title.trim()) return;

    this.data.updateOrgNode(id, {
      parentId: this.editOrgNode.parentId,
      title: this.editOrgNode.title,
      subtitle: this.editOrgNode.subtitle,
      order: this.editOrgNode.order,
    });
    this.cancelEditOrgNode();
  }

  deleteOrgNode(id: number) {
    if (confirm('Delete this organisation item and all its child items?')) {
      this.data.deleteOrgNode(id);
    }
  }

  startEditHostel(h: AdminHostel) {
    this.editHostel = { name: h.name, location: h.location, contact: h.contact, description: h.description, capacity: h.capacity, img: h.img };
    this.editHostelFile = null;
    this.editingHostelId.set(h.id);
  }

  onNewFounderFileSelected(event: Event) {
    this.newFounderFile = this.fileFromEvent(event);
  }

  onEditFounderFileSelected(event: Event) {
    this.editFounderFile = this.fileFromEvent(event);
  }

  async addFounder() {
    if (!this.newFounder.name.trim() || !this.newFounderFile) return;

    await this.runMediaAction(async () => {
      await this.data.addFounder({
        name: this.newFounder.name,
        title: this.newFounder.title,
        bio: this.newFounder.bio,
      }, this.newFounderFile as File);
      this.newFounder = { img: '', name: '', title: '', bio: '' };
      this.newFounderFile = null;
      this.showFounderAdd.set(false);
    }, 'Founder image upload failed. Make sure the local upload server is running.');
  }

  async saveFounder(id: number) {
    await this.runMediaAction(async () => {
      await this.data.updateFounder(id, {
        name: this.editFounder.name,
        title: this.editFounder.title,
        bio: this.editFounder.bio,
      }, this.editFounderFile);
      this.editFounderFile = null;
      this.editingFounderId.set(null);
    }, 'Founder image update failed. Make sure the local upload server is running.');
  }

  async deleteFounder(id: number) {
    if (!confirm('Delete this person?')) return;

    await this.runMediaAction(async () => {
      await this.data.deleteFounder(id);
    }, 'Founder delete failed. Make sure the local upload server is running.');
  }

  onNewHostelFileSelected(event: Event) {
    this.newHostelFile = this.fileFromEvent(event);
  }

  onEditHostelFileSelected(event: Event) {
    this.editHostelFile = this.fileFromEvent(event);
  }

  async addHostel() {
    if (!this.newHostel.name.trim() || !this.newHostelFile) return;

    await this.runMediaAction(async () => {
      await this.data.addHostel({
        name: this.newHostel.name,
        location: this.newHostel.location,
        contact: this.newHostel.contact,
        description: this.newHostel.description,
        capacity: this.newHostel.capacity,
      }, this.newHostelFile as File);
      this.newHostel = { name: '', location: '', contact: '', description: '', capacity: '', img: '' };
      this.newHostelFile = null;
      this.showHostelAdd.set(false);
    }, 'Hostel image upload failed. Make sure the local upload server is running.');
  }

  async saveHostel(id: number) {
    await this.runMediaAction(async () => {
      await this.data.updateHostel(id, {
        name: this.editHostel.name,
        location: this.editHostel.location,
        contact: this.editHostel.contact,
        description: this.editHostel.description,
        capacity: this.editHostel.capacity,
      }, this.editHostelFile);
      this.editHostelFile = null;
      this.editingHostelId.set(null);
    }, 'Hostel image update failed. Make sure the local upload server is running.');
  }

  async deleteHostel(id: number) {
    if (!confirm('Delete this hostel?')) return;

    await this.runMediaAction(async () => {
      await this.data.deleteHostel(id);
    }, 'Hostel delete failed. Make sure the local upload server is running.');
  }

  truncate(text: string, max = 100) {
    return text.length > max ? text.slice(0, max) + '…' : text;
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}

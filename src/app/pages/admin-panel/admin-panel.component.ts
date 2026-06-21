import { Component, ElementRef, HostListener, ViewChild, computed, effect, signal, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  AdminDataService,
  AdminBhavanContent,
  AdminCmLeader,
  AdminDirectoryEntry,
  AdminDailyVachanaContent,
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
  AdminOrgNodeLevel,
  AdminPastPresident,
  AdminPresidentNoteContent,
  AdminScholarshipApplication,
  AdminScholarshipSettings,
  AdminTicker,
  AdminVisitorStats,
  ScholarshipAcademicYearOption,
} from '../../services/admin-data.service';
import { buildManagedAssetUrl } from '../../services/api-base';
import { translations } from '../../i18n/translations';

type Tab =
  | 'header'
  | 'magazine'
  | 'vachana'
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
  mediaType: 'image' | 'video';
  caption: string;
};

type FounderForm = {
  img: string;
  name: string;
  title: string;
  bio: string;
};

type OrgNodeForm = {
  parentId: string | null;
  title: string;
  subtitle: string;
  contact: string;
  order: number;
  description: string;
  level: AdminOrgNodeLevel;
  state: string;
  district: string;
  taluk: string;
  sidebarLabel: string;
  imageUrl: string;
  imageAlt: string;
  isActive: boolean;
};

type OrgMemberEntryForm = {
  firstName: string;
  designation: string;
  contact: string;
  description: string;
  imageAlt: string;
};

type OrgQuickSection = 'president' | 'office-bearer' | 'working' | 'representative' | 'nominated' | 'state';

type OrgAdminView =
  | { kind: 'overview' }
  | { kind: 'section'; section: OrgQuickSection }
  | { kind: 'node'; section: OrgQuickSection; nodeId: string }
  | { kind: 'members'; section: OrgQuickSection; nodeId: string };

type OrgSectionCard = {
  key: OrgQuickSection;
  title: string;
  description: string;
};

type OrgBreadcrumb = {
  label: string;
  view: OrgAdminView;
  current: boolean;
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
  aadhaarNumber?: string;
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

const TALUK_COMMITTEE_SECTION_LABEL = 'taluk-committee';
const STATE_COMMITTEE_MEMBER_LABEL = 'state-committee-member';
const TALUK_COMMITTEE_MEMBER_LABEL = 'taluk-committee-member';
const TALUK_COMMITTEE_TITLE = 'CMC/TMC/GP';
const CITY_GBA_LEVEL_TITLE = 'City / GBA';
const ORG_SECTION_CARDS: OrgSectionCard[] = [
  {
    key: 'president',
    title: 'President Office',
    description: 'Manage the president section on its own page and keep member actions in a popup.',
  },
  {
    key: 'office-bearer',
    title: 'Office Bearers',
    description: 'Open the office-bearer page, review members, and add or edit them from a modal.',
  },
  {
    key: 'working',
    title: 'General Working Committee',
    description: 'Keep the working committee on a dedicated admin page and use it as the main flow for its linked nominated body section.',
  },
  {
    key: 'nominated',
    title: 'Nominated Body',
    description: 'Manage nominated body members as the linked body that sits with the General Working Committee flow.',
  },
  {
    key: 'representative',
    title: 'Representative General Body',
    description: 'Review representative members on their own page and use the popup form for changes.',
  },
  {
    key: 'state',
    title: 'State Committee',
    description: 'Handle the organisation hierarchy level by level, with separate member pages for the same level.',
  },
] as const;

const ADMIN_ACTIVE_TAB_STORAGE_KEY = 'admin_active_tab';
const ADMIN_ORG_VIEW_STORAGE_KEY = 'admin_org_view';
const ADMIN_VALID_TABS: readonly Tab[] = [
  'header',
  'magazine',
  'vachana',
  'hero',
  'founders',
  'mission',
  'president',
  'org',
  'leaders',
  'bhavan',
  'past-presidents',
  'events',
  'gallery',
  'directory',
  'scholarships',
  'ticker',
  'hostels',
  'footer',
];
const ORG_QUICK_SECTIONS: readonly OrgQuickSection[] = [
  'president',
  'office-bearer',
  'working',
  'representative',
  'nominated',
  'state',
];

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

const DEFAULT_VISITOR_STATS: AdminVisitorStats = {
  totalVisits: 0,
  uniqueVisitors: 0,
  lastVisitedAt: null,
};

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss'
})
export class AdminPanelComponent {
  @ViewChild('scholarshipStatusTabs') private scholarshipStatusTabsRef?: ElementRef<HTMLDivElement>;
  @ViewChild('orgNodeAddForm') private orgNodeAddFormRef?: ElementRef<HTMLDivElement>;

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
  private readonly formBuilder = inject(FormBuilder);
  readonly cmLeaderItems = this.data.cmLeaders;
  readonly pastPresidentItems = this.data.pastPresidents;
  readonly eventItems = this.data.events;
  readonly galleryItems = this.data.gallery;
  readonly directoryItems = this.data.directoryEntries;
  readonly orgNodeItems = this.data.orgNodes;
  readonly tickerItems = this.data.tickers;
  readonly founderItems = this.data.founders;
  readonly hostelItems = this.data.hostels;
  readonly orgMemberPageSize = 24;
  readonly hostelPageSize = 6;
  readonly hostelPage = signal(1);
  readonly hostelTotalPages = computed(() => {
    const total = this.data.hostels().length;
    return total === 0 ? 0 : Math.ceil(total / this.hostelPageSize);
  });
  readonly hostelVisibleItems = computed(() => {
    const items = this.data.hostels();
    const totalPages = this.hostelTotalPages();

    if (items.length === 0 || totalPages === 0) {
      return [] as AdminHostel[];
    }

    const currentPage = Math.min(Math.max(this.hostelPage(), 1), totalPages);
    const startIndex = (currentPage - 1) * this.hostelPageSize;
    return items.slice(startIndex, startIndex + this.hostelPageSize);
  });
  readonly hostelPageLabel = computed(() => {
    const totalPages = this.hostelTotalPages();
    if (totalPages === 0) {
      return '0 / 0';
    }

    const currentPage = Math.min(Math.max(this.hostelPage(), 1), totalPages);
    return `${currentPage} / ${totalPages}`;
  });

  activeTab = signal<Tab>('header');
  visitorStats = signal<AdminVisitorStats>({ ...DEFAULT_VISITOR_STATS });
  visitorStatsLoading = signal(false);
  visitorStatsError = signal('');
  adminActionsMenuOpen = signal(false);
  scholarshipSettingsMenuOpen = signal(false);
  scholarshipSettingsDialogOpen = signal(false);

  readonly textFieldsByTab: Partial<Record<Tab, TextField[]>> = {
    header: [
      { key: 'langbar.tagline', label: 'Language bar tagline' },
      { key: 'nav.home', label: 'Home label' },
      { key: 'nav.about', label: 'About label' },
      { key: 'nav.community', label: 'Community label' },
      { key: 'nav.events', label: 'Events label' },
      { key: 'nav.gallery', label: 'Gallery label' },
      { key: 'nav.byeLaw', label: 'By-law label' },
      { key: 'nav.directory', label: 'Directory label' },
      { key: 'nav.contact', label: 'Contact label' },
    ],
    magazine: [
      { key: 'nav.magazine', label: 'Magazine label' },
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
  scholarshipSettings!: AdminScholarshipSettings;
  dailyVachanaContent!: AdminDailyVachanaContent;
  heroContent!: AdminHeroContent;
  presidentNoteContent!: AdminPresidentNoteContent;
  bhavanContent!: AdminBhavanContent;
  footerContent!: AdminFooterContent;
  navbarLogoFile: File | null = null;
  byeLawFile: File | null = null;
  magazineFile: File | null = null;
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
  editingOrgNodeId = signal<string | null>(null);
  orgView = signal<OrgAdminView>({ kind: 'overview' });
  readonly orgSectionCards = ORG_SECTION_CARDS;
  readonly orgMemberSearchDraft = signal('');
  readonly orgMemberSearchTerm = signal('');
  readonly orgMemberPage = signal(1);
  readonly orgNodesById = computed(() => {
    const nodes = new Map<string, AdminOrgNode>();

    for (const node of this.orgNodeItems()) {
      nodes.set(node.id, node);
    }

    return nodes;
  });
  readonly orgChildrenByParentId = computed(() => {
    const childrenByParent = new Map<string | null, AdminOrgNode[]>();

    for (const node of this.orgNodeItems()) {
      const siblings = childrenByParent.get(node.parentId);

      if (siblings) {
        siblings.push(node);
      } else {
        childrenByParent.set(node.parentId, [node]);
      }
    }

    for (const [parentId, children] of childrenByParent.entries()) {
      childrenByParent.set(parentId, this.orgSortedNodes(children));
    }

    return childrenByParent;
  });
  readonly orgCurrentMembers = computed(() => {
    const view = this.orgView();

    if (view.kind === 'section' && view.section !== 'state') {
      return this.orgSimpleSectionMembers(view.section);
    }

    if (view.kind === 'node' || view.kind === 'members') {
      const node = this.orgNodeById(view.nodeId);
      return node ? this.orgDirectMembers(node) : [];
    }

    return [] as AdminOrgNode[];
  });
  readonly orgCurrentMemberCount = computed(() => this.orgCurrentMembers().length);
  readonly orgMemberSearchActive = computed(() => this.orgMemberSearchTokens(this.orgMemberSearchTerm()).length > 0);
  readonly orgFilteredMembers = computed(() => {
    const items = this.orgCurrentMembers();
    const tokens = this.orgMemberSearchTokens(this.orgMemberSearchTerm());

    if (tokens.length === 0) {
      return items;
    }

    return items.filter((node) => {
      const text = this.normalizeOrgSearchText([
        node.title,
        node.subtitle,
        node.description,
        node.contact,
        node.location.state,
        node.location.district,
        node.location.taluk,
        node.sidebarLabel,
      ].join(' '));

      return tokens.every((token) => text.includes(token));
    });
  });
  readonly orgMemberTotalPages = computed(() => {
    const total = this.orgFilteredMembers().length;
    return total === 0 ? 0 : Math.ceil(total / this.orgMemberPageSize);
  });
  readonly orgVisibleMembers = computed(() => {
    const items = this.orgFilteredMembers();
    const totalPages = this.orgMemberTotalPages();

    if (items.length === 0 || totalPages === 0) {
      return [] as AdminOrgNode[];
    }

    const currentPage = Math.min(Math.max(this.orgMemberPage(), 1), totalPages);
    const startIndex = (currentPage - 1) * this.orgMemberPageSize;
    return items.slice(startIndex, startIndex + this.orgMemberPageSize);
  });
  readonly orgMemberPageLabel = computed(() => {
    const totalPages = this.orgMemberTotalPages();

    if (totalPages === 0) {
      return '0 / 0';
    }

    const currentPage = Math.min(Math.max(this.orgMemberPage(), 1), totalPages);
    return `${currentPage} / ${totalPages}`;
  });
  readonly orgMemberResultsSummary = computed(() => {
    const totalVisible = this.orgFilteredMembers().length;
    const units = this.orgCurrentListUnits();

    if (totalVisible === 0) {
      return this.orgMemberSearchActive()
        ? `No ${units.plural} match this search.`
        : `No ${units.plural} found.`;
    }

    const currentPage = Math.min(Math.max(this.orgMemberPage(), 1), this.orgMemberTotalPages());
    const startIndex = (currentPage - 1) * this.orgMemberPageSize + 1;
    const endIndex = Math.min(startIndex + this.orgMemberPageSize - 1, totalVisible);
    const label = `Showing ${startIndex}-${endIndex} of ${totalVisible}`;

    return this.orgMemberSearchActive()
      ? `${label} matching ${units.plural}`
      : `${label} ${units.plural}`;
  });
  readonly orgMemberBatchForm = this.formBuilder.group({
    members: this.formBuilder.array([this.createOrgMemberEntryGroup()]),
  });
  private orgMemberEntryFiles: Array<File | null> = [null];
  newOrgNode: OrgNodeForm = this.emptyOrgNodeForm();
  editOrgNode: OrgNodeForm = this.emptyOrgNodeForm();
  newOrgNodeImageFile: File | null = null;
  editOrgNodeImageFile: File | null = null;

  // ── Gallery state ────────────────────────────────────
  showGalleryAdd   = signal(false);
  editingGalleryId = signal<number | null>(null);
  galleryBusy = signal(false);
  galleryError = signal('');
  newGallery: GalleryForm = { src: '', mediaType: 'image', caption: '' };
  editGallery: GalleryForm = { src: '', mediaType: 'image', caption: '' };
  newGalleryFile: File | null = null;
  editGalleryFile: File | null = null;

  startEditGallery(item: AdminGalleryItem) {
    this.editGallery = { src: item.src, mediaType: item.mediaType, caption: item.caption };
    this.editGalleryFile = null;
    this.galleryError.set('');
    this.editingGalleryId.set(item.id);
  }

  onNewGalleryFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.newGalleryFile = input.files?.[0] ?? null;
    this.newGallery.mediaType = this.newGalleryFile?.type.startsWith('video/') ? 'video' : 'image';
    this.galleryError.set('');
  }

  onEditGalleryFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.editGalleryFile = input.files?.[0] ?? null;
    if (this.editGalleryFile) {
      this.editGallery.mediaType = this.editGalleryFile.type.startsWith('video/') ? 'video' : 'image';
    }
    this.galleryError.set('');
  }

  async addGallery() {
    if (!this.newGalleryFile) {
      this.galleryError.set('Select an image or video file before saving.');
      return;
    }

    this.galleryBusy.set(true);
    this.galleryError.set('');

    try {
      await this.data.addGalleryItem({ caption: this.newGallery.caption, file: this.newGalleryFile });
      this.newGallery = { src: '', mediaType: 'image', caption: '' };
      this.newGalleryFile = null;
      this.showGalleryAdd.set(false);
    } catch {
      this.galleryError.set('Gallery upload failed. Make sure the backend is running and the file is an image or video.');
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
      this.galleryError.set('Gallery update failed. Make sure the backend is running and the file is an image or video.');
    } finally {
      this.galleryBusy.set(false);
    }
  }

  async deleteGallery(id: number) {
    if (!confirm('Delete this gallery item?')) return;

    this.galleryBusy.set(true);
    this.galleryError.set('');

    try {
      await this.data.deleteGalleryItem(id);
    } catch {
      this.galleryError.set('Gallery delete failed. Make sure the backend is running.');
    } finally {
      this.galleryBusy.set(false);
    }
  }

  cancelGalleryEdit() {
    this.editGalleryFile = null;
    this.editingGalleryId.set(null);
  }

  cancelGalleryAdd() {
    this.newGallery = { src: '', mediaType: 'image', caption: '' };
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
  newTickerLink   = '';
  editTickerText  = '';
  editTickerLink   = '';

  startEditTicker(t: AdminTicker) {
    this.editTickerText = t.text;
    this.editTickerLink = t.link;
    this.editingTickerId.set(t.id);
  }
  addTicker() {
    if (!this.newTickerText.trim()) return;
    this.data.addTicker(this.newTickerText.trim(), this.newTickerLink.trim());
    this.newTickerText = '';
    this.newTickerLink = '';
    this.showTickerAdd.set(false);
  }
  saveTicker(id: number) {
    this.data.updateTicker(id, this.editTickerText.trim(), this.editTickerLink.trim());
    this.editingTickerId.set(null);
  }
  deleteTicker(id: number) {
    if (confirm('Delete this announcement?')) this.data.deleteTicker(id);
  }

  goToHostelPage(page: number) {
    const totalPages = this.hostelTotalPages();

    if (totalPages === 0) {
      this.hostelPage.set(1);
      return;
    }

    const nextPage = Math.min(Math.max(page, 1), totalPages);
    this.hostelPage.set(nextPage);
  }

  private resetOrgMemberBrowser() {
    this.orgMemberSearchDraft.set('');
    this.orgMemberSearchTerm.set('');
    this.orgMemberPage.set(1);
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
  scholarshipSubmittedFrom = signal('');
  scholarshipSubmittedTo = signal('');
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
  private scholarshipSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private scholarshipLoadRequestId = 0;
  private scholarshipImagePanStage: HTMLDivElement | null = null;
  private scholarshipImagePanOriginX = 0;
  private scholarshipImagePanOriginY = 0;
  private scholarshipImagePanScrollLeft = 0;
  private scholarshipImagePanScrollTop = 0;
  isScholarshipImagePanning = false;

  private readPersistedTab(): Tab | null {
    try {
      const value = localStorage.getItem(ADMIN_ACTIVE_TAB_STORAGE_KEY);
      if (value && ADMIN_VALID_TABS.includes(value as Tab)) {
        return value as Tab;
      }
    } catch {
      // Ignore localStorage read failures.
    }

    return null;
  }

  private persistActiveTab(tab: Tab) {
    try {
      localStorage.setItem(ADMIN_ACTIVE_TAB_STORAGE_KEY, tab);
    } catch {
      // Ignore localStorage write failures.
    }
  }

  private readPersistedOrgView(): OrgAdminView | null {
    try {
      const rawValue = localStorage.getItem(ADMIN_ORG_VIEW_STORAGE_KEY);

      if (!rawValue) {
        return null;
      }

      const parsed = JSON.parse(rawValue) as Partial<OrgAdminView> & { kind?: string; section?: string; nodeId?: string };

      if (parsed.kind === 'overview') {
        return { kind: 'overview' };
      }

      if (
        parsed.kind === 'section'
        && parsed.section
        && ORG_QUICK_SECTIONS.includes(parsed.section as OrgQuickSection)
      ) {
        return { kind: 'section', section: parsed.section as OrgQuickSection };
      }

      if (
        (parsed.kind === 'node' || parsed.kind === 'members')
        && parsed.section
        && ORG_QUICK_SECTIONS.includes(parsed.section as OrgQuickSection)
        && typeof parsed.nodeId === 'string'
        && parsed.nodeId.trim()
      ) {
        return {
          kind: parsed.kind,
          section: parsed.section as OrgQuickSection,
          nodeId: parsed.nodeId.trim(),
        };
      }
    } catch {
      // Ignore localStorage read failures.
    }

    return null;
  }

  private persistOrgView(view: OrgAdminView) {
    try {
      localStorage.setItem(ADMIN_ORG_VIEW_STORAGE_KEY, JSON.stringify(view));
    } catch {
      // Ignore localStorage write failures.
    }
  }

  constructor() {
    this.seedTextDrafts();
    this.navbarContent = this.clone(this.data.navbarContent());
    this.scholarshipSettings = this.clone(this.data.scholarshipSettings());
    this.dailyVachanaContent = this.clone(this.data.dailyVachanaContent());
    this.heroContent = this.clone(this.data.heroContent());
    this.presidentNoteContent = this.clone(this.data.presidentNoteContent());
    this.bhavanContent = this.clone(this.data.bhavanContent());
    this.footerContent = this.clone(this.data.footerContent());

    effect(() => {
      this.navbarContent = this.clone(this.data.navbarContent());
    });

    effect(() => {
      this.scholarshipSettings = this.clone(this.data.scholarshipSettings());
    });

    effect(() => {
      this.dailyVachanaContent = this.clone(this.data.dailyVachanaContent());
    });

    effect(() => {
      const totalPages = this.orgMemberTotalPages();
      const currentPage = this.orgMemberPage();

      if (totalPages === 0) {
        if (currentPage !== 1) {
          this.orgMemberPage.set(1);
        }
        return;
      }

      if (currentPage > totalPages) {
        this.orgMemberPage.set(totalPages);
      }
    });

    const persistedTab = this.readPersistedTab();
    if (persistedTab) {
      this.activeTab.set(persistedTab);
      if (persistedTab === 'scholarships') {
        void this.loadScholarshipAcademicYears();
        void this.loadScholarshipApplications(1);
      }
    }

    const persistedOrgView = this.readPersistedOrgView();
    if (persistedOrgView) {
      this.orgView.set(persistedOrgView);
    }

    effect(() => {
      this.persistOrgView(this.orgView());
    });

    void this.loadVisitorStats();
  }

  get visitorStatsLastSeenLabel() {
    const lastVisitedAt = this.visitorStats().lastVisitedAt;

    if (!lastVisitedAt) {
      return 'No visits recorded yet';
    }

    return new Date(lastVisitedAt).toLocaleString();
  }

  async setTab(tab: Tab) {
    this.activeTab.set(tab);
    this.persistActiveTab(tab);
    this.adminActionsMenuOpen.set(false);
    this.scholarshipSettingsMenuOpen.set(false);
    this.scholarshipSettingsDialogOpen.set(false);
    this.cancelAddOrgNode();
    this.cancelEditOrgNode();

    if (tab === 'org') {
      this.resetOrgMemberBrowser();
      this.orgView.set({ kind: 'overview' });
    }

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

  async addScholarshipAcademicYear(direction: 'next' | 'previous' = 'next') {
    if (this.scholarshipLoading()) {
      return;
    }

    this.scholarshipError.set('');

    try {
      const created = await this.data.addScholarshipAcademicYear(direction);
      await this.loadScholarshipAcademicYears();
      this.scholarshipSelectedAcademicYearId.set(created._id);
      await this.loadScholarshipApplications(1);
    } catch {
      this.scholarshipError.set('Unable to create scholarship academic year right now.');
    }
  }

  async loadVisitorStats() {
    this.visitorStatsLoading.set(true);
    this.visitorStatsError.set('');

    try {
      const stats = await this.data.getVisitorStats();
      this.visitorStats.set(stats);
    } catch {
      this.visitorStatsError.set('Unable to load visitor stats right now.');
    } finally {
      this.visitorStatsLoading.set(false);
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
    const submittedFrom = this.scholarshipSubmittedFrom();
    const submittedTo = this.scholarshipSubmittedTo();

    try {
      const [result, summaryResult, regionSeedResult] = await Promise.all([
        this.data.getScholarshipApplications({ page, limit: this.scholarshipLimit, academicYearId, search, status, state, district, taluk, submittedFrom, submittedTo }),
        this.data.getScholarshipApplications({ all: true, academicYearId, search, state, district, taluk, submittedFrom, submittedTo }).catch(() => null),
        this.data.getScholarshipApplications({ all: true, academicYearId }).catch(() => null),
      ]);

      if (requestId !== this.scholarshipLoadRequestId) {
        return;
      }

      const nextSummaryItems = summaryResult?.items
        ?? (this.scholarshipSummaryItems().length > 0 ? this.scholarshipSummaryItems() : result.items);

      this.scholarshipApplications.set(result.items);
      this.scholarshipSummaryItems.set(nextSummaryItems);
      this.scholarshipRegionSeedItems.set(regionSeedResult?.items ?? []);
      this.initializeScholarshipStatusDrafts(result.items);
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
        'Account Holder Name': item.accountHolderName,
        'Bank Name': item.bankName,
        'Bank Branch Name': item.bankBranchName,
        'Account Number': item.accountNumber,
        'IFSC Code': item.ifscCode,
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

  private scholarshipTabsTop() {
    return this.scholarshipStatusTabsRef?.nativeElement.getBoundingClientRect().top ?? null;
  }

  private restoreScholarshipScroll(anchorTopBefore: number | null, windowScrollBefore: number) {
    if (typeof window === 'undefined') {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const anchorTopAfter = this.scholarshipTabsTop();

        if (anchorTopBefore === null || anchorTopAfter === null) {
          window.scrollTo({ top: windowScrollBefore, behavior: 'auto' });
          return;
        }

        const delta = anchorTopAfter - anchorTopBefore;
        window.scrollTo({ top: windowScrollBefore + delta, behavior: 'auto' });
      });
    });
  }

  async setScholarshipListTab(tab: ScholarshipListTab) {
    if (this.scholarshipActiveListTab() === tab) {
      return;
    }

    const scrollPosition = typeof window === 'undefined' ? 0 : window.scrollY;
    const anchorTop = this.scholarshipTabsTop();
    this.scholarshipActiveListTab.set(tab);
    await this.loadScholarshipApplications(1);
    this.restoreScholarshipScroll(anchorTop, scrollPosition);
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

  async onScholarshipSubmittedFromChanged(submittedFrom: string) {
    this.scholarshipSubmittedFrom.set(submittedFrom);
    await this.loadScholarshipApplications(1);
  }

  async onScholarshipSubmittedToChanged(submittedTo: string) {
    this.scholarshipSubmittedTo.set(submittedTo);
    await this.loadScholarshipApplications(1);
  }

  async clearScholarshipDateFilters() {
    this.scholarshipSubmittedFrom.set('');
    this.scholarshipSubmittedTo.set('');
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
        details: {
          title: 'Aadhaar copy verification',
          aadhaarNumber: item.aadhaarNumber,
        },
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

  scholarshipTabCount(tab: ScholarshipListTab): number {
    const items = this.scholarshipSummaryItems();

    if (tab === 'all') {
      return items.length;
    }

    return items.filter((item) => {
      const normalizedStatus = String(item.status || '').trim().toLowerCase();

      if (tab === 'accepted' || tab === 'rejected') {
        return normalizedStatus === tab;
      }

      return normalizedStatus !== 'accepted' && normalizedStatus !== 'rejected';
    }).length;
  }

  private emptyOrgNodeForm(parentId: string | null = null): OrgNodeForm {
    return {
      parentId,
      title: '',
      subtitle: '',
      contact: '',
      order: 0,
      description: '',
      level: parentId ? 'district' : 'state',
      state: '',
      district: '',
      taluk: '',
      sidebarLabel: '',
      imageUrl: '',
      imageAlt: '',
      isActive: true,
    };
  }

  private inferChildLevel(parent?: AdminOrgNode | null): AdminOrgNodeLevel {
    if (!parent) {
      return 'state';
    }

    if (this.isStateCommitteeContainer(parent)) {
      return 'state';
    }

    if (parent.level === 'state') {
      return 'district';
    }

    if (parent.level === 'district') {
      return 'taluk';
    }

    if (parent.level === 'city') {
      return 'corporation';
    }

    if (parent.level === 'corporation') {
      return 'assembly';
    }

    return 'taluk';
  }

  private normalizeOrgSearchText(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private orgMemberSearchTokens(value: string): string[] {
    const normalized = this.normalizeOrgSearchText(value);
    return normalized ? normalized.split(/\s+/).filter(Boolean) : [];
  }

  private orgCurrentListUnits(): { singular: string; plural: string } {
    const view = this.orgView();

    if (view.kind === 'section' && view.section === 'president') {
      return {
        singular: 'president',
        plural: 'presidents',
      };
    }

    return {
      singular: 'member',
      plural: 'members',
    };
  }

  protected isPresidentProfileForm(form: OrgNodeForm): boolean {
    const sectionConfig = this.simpleOrgSectionConfig(form.sidebarLabel);

    return !!sectionConfig
      && sectionConfig.memberTitle === 'President'
      && !this.isHierarchyMemberForm(form)
      && !this.isStructuralHierarchyEntry(form);
  }

  private isRepresentativeSectionLabel(label: string | null | undefined): boolean {
    return this.normalizeOrgSearchText(String(label || '')) === this.normalizeOrgSearchText('representative-general-body');
  }

  private isStateCommitteeSectionLabel(label: string | null | undefined): boolean {
    return this.normalizeOrgSearchText(String(label || '')) === this.normalizeOrgSearchText('state-committee');
  }

  private isStateCommitteeMemberLabel(label: string | null | undefined): boolean {
    return this.normalizeOrgSearchText(String(label || '')) === this.normalizeOrgSearchText(STATE_COMMITTEE_MEMBER_LABEL);
  }

  private isTalukCommitteeSectionLabel(label: string | null | undefined): boolean {
    return this.normalizeOrgSearchText(String(label || '')) === this.normalizeOrgSearchText(TALUK_COMMITTEE_SECTION_LABEL);
  }

  private isTalukCommitteeMemberLabel(label: string | null | undefined): boolean {
    return this.normalizeOrgSearchText(String(label || '')) === this.normalizeOrgSearchText(TALUK_COMMITTEE_MEMBER_LABEL);
  }

  private isDistrictOnlyOrgLevel(level: AdminOrgNodeLevel): boolean {
    return level === 'district';
  }

  private usesStateOnlyOrgLevel(level: AdminOrgNodeLevel): boolean {
    return level === 'state' || level === 'city' || level === 'corporation' || level === 'assembly';
  }

  private usesTalukOrgLevel(level: AdminOrgNodeLevel): boolean {
    return level === 'taluk';
  }

  private usesCustomStructuralTitle(level: AdminOrgNodeLevel): boolean {
    return level === 'city' || level === 'corporation' || level === 'assembly';
  }

  private matchesStateCommitteeStateBranchIdentity(node: Pick<AdminOrgNode, 'title' | 'subtitle' | 'location'>): boolean {
    const normalizedState = this.normalizeOrgSearchText(String(node.location.state || ''));
    const normalizedTitle = this.normalizeOrgSearchText(String(node.title || ''));
    const normalizedSubtitle = this.normalizeOrgSearchText(String(node.subtitle || ''));

    return !!normalizedState
      && normalizedTitle === normalizedState
      && normalizedSubtitle === normalizedState;
  }

  private orgLevelLabel(level: AdminOrgNodeLevel): string {
    if (level === 'city') {
      return CITY_GBA_LEVEL_TITLE;
    }

    if (level === 'corporation') {
      return 'Corporation';
    }

    if (level === 'assembly') {
      return 'Assembly';
    }

    if (level === 'district') {
      return 'District';
    }

    if (level === 'taluk') {
      return 'Taluk';
    }

    return 'State';
  }

  protected isTalukCommitteeContainerNode(node: AdminOrgNode | null | undefined): boolean {
    return !!node
      && this.isTalukCommitteeSectionLabel(node.sidebarLabel);
  }

  private isTalukCommitteeMemberNode(node: AdminOrgNode | null | undefined): boolean {
    if (!node || !this.isTalukCommitteeMemberLabel(node.sidebarLabel)) {
      return false;
    }

    const parent = this.orgNodeById(node.parentId);
    if (!parent || !this.isTalukCommitteeContainerNode(parent)) {
      return false;
    }

    return parent.level === node.level
      && parent.location.state === node.location.state
      && parent.location.district === node.location.district
      && parent.location.taluk === node.location.taluk;
  }

  private matchesOrgKeywords(node: AdminOrgNode, groups: string[][]): boolean {
    const text = this.normalizeOrgSearchText(`${node.title} ${node.subtitle} ${node.sidebarLabel}`);
    return groups.some((group) => group.every((keyword) => text.includes(this.normalizeOrgSearchText(keyword))));
  }

  private sectionKeywords(section: OrgQuickSection): string[][] {
    if (section === 'president') {
      return [
        ['president', 'office'],
        ['national', 'president'],
        ['president'],
      ];
    }

    if (section === 'office-bearer') {
      return [
        ['office-bearer'],
        ['office', 'bearer'],
        ['office', 'bearers'],
      ];
    }

    if (section === 'working') {
      return [
        ['general', 'working', 'committee'],
        ['working', 'committee'],
        ['central', 'committee'],
        ['working'],
      ];
    }

    if (section === 'representative') {
      return [
        ['representative', 'general', 'body'],
        ['representative'],
        ['general', 'body'],
      ];
    }

    if (section === 'nominated') {
      return [
        ['nominated-body'],
        ['nominated', 'body'],
        ['nominated'],
      ];
    }

    return [
      ['state', 'committee'],
      ['state'],
    ];
  }

  private sectionDefaultSidebarLabel(section: OrgQuickSection): string {
    if (section === 'president') {
      return 'president-office';
    }

    if (section === 'office-bearer') {
      return 'office-bearer';
    }

    if (section === 'working') {
      return 'working-committee';
    }

    if (section === 'representative') {
      return 'representative-general-body';
    }

    if (section === 'nominated') {
      return 'nominated-body';
    }

    return 'state-committee';
  }

  private simpleOrgSectionLabels(): string[] {
    return ['president-office', 'office-bearer', 'working-committee', 'representative-general-body', 'nominated-body'];
  }

  private simpleOrgSectionConfig(label: string) {
    const normalizedLabel = this.normalizeOrgSearchText(label);

    if (normalizedLabel === this.normalizeOrgSearchText('president-office')) {
      return {
        sectionTitle: 'President Office',
        memberTitle: 'President',
      };
    }

    if (normalizedLabel === this.normalizeOrgSearchText('office-bearer')) {
      return {
        sectionTitle: 'Office Bearers',
        memberTitle: 'Member',
      };
    }

    if (normalizedLabel === this.normalizeOrgSearchText('working-committee')) {
      return {
        sectionTitle: 'General Working Committee',
        memberTitle: 'Member',
      };
    }

    if (normalizedLabel === this.normalizeOrgSearchText('representative-general-body')) {
      return {
        sectionTitle: 'Representative General Body',
        memberTitle: 'Member',
      };
    }

    if (normalizedLabel === this.normalizeOrgSearchText('nominated-body')) {
      return {
        sectionTitle: 'Nominated Bodies',
        memberTitle: 'Member',
      };
    }

    return null;
  }

  private isSimpleOrgSectionLabel(label: string | null | undefined): boolean {
    const normalizedLabel = this.normalizeOrgSearchText(String(label || ''));
    return this.simpleOrgSectionLabels().some((candidate) => this.normalizeOrgSearchText(candidate) === normalizedLabel);
  }

  private isNominatedBodyLabel(label: string | null | undefined): boolean {
    return this.normalizeOrgSearchText(String(label || '')) === this.normalizeOrgSearchText('nominated-body');
  }

  protected isSimpleOrgSection(form: OrgNodeForm): boolean {
    return this.isSimpleOrgSectionLabel(form.sidebarLabel);
  }

  protected isStateScopedNominatedForm(form: OrgNodeForm): boolean {
    if (!this.isNominatedBodyLabel(form.sidebarLabel)) {
      return false;
    }

    const parent = this.orgNodeById(form.parentId);

    return !!parent
      && this.isStateCommitteeNode(parent)
      && !this.isStateCommitteeContainer(parent)
      && !this.isStateCommitteeMemberNode(parent)
      && parent.level === 'state';
  }

  protected isHierarchyMemberForm(form: OrgNodeForm): boolean {
    const parent = this.orgNodeById(form.parentId);

    if (!parent) {
      return false;
    }

    if (this.isStateCommitteeSectionLabel(form.sidebarLabel) || this.isStateCommitteeMemberLabel(form.sidebarLabel)) {
      if (!this.isStateCommitteeNode(parent) || this.isStateCommitteeMemberNode(parent)) {
        return false;
      }

      if (form.level !== parent.level || parent.location.state !== form.state) {
        return false;
      }

      if (parent.level === 'state') {
        if (form.district.trim() || form.taluk.trim()) {
          return false;
        }

        if (this.isStateCommitteeContainer(parent)) {
          return this.isStateCommitteeMemberLabel(form.sidebarLabel);
        }

        return true;
      }

      return parent.location.district === form.district
        && parent.location.taluk === form.taluk;
    }

    if (this.isTalukCommitteeMemberLabel(form.sidebarLabel)) {
      if (!this.isTalukCommitteeContainerNode(parent)) {
        return false;
      }

      return form.level === parent.level
        && parent.location.state === form.state
        && parent.location.district === form.district
        && parent.location.taluk === form.taluk;
    }

    return false;
  }

  protected isStateHierarchyEntry(form: OrgNodeForm): boolean {
    return this.isStateCommitteeSectionLabel(form.sidebarLabel)
      && form.level === 'state'
      && !this.isHierarchyMemberForm(form);
  }

  protected isStructuralHierarchyEntry(form: OrgNodeForm): boolean {
    return (this.isStateCommitteeSectionLabel(form.sidebarLabel) || this.isTalukCommitteeSectionLabel(form.sidebarLabel))
      && !this.isHierarchyMemberForm(form);
  }

  protected structuralHierarchyLabel(form: OrgNodeForm): string {
    if (this.isTalukCommitteeSectionLabel(form.sidebarLabel) || this.isTalukCommitteeMemberLabel(form.sidebarLabel)) {
      return TALUK_COMMITTEE_TITLE;
    }

    return this.orgLevelLabel(form.level);
  }

  protected requiresOrgDisplayOrder(form: OrgNodeForm): boolean {
    return this.requiresOrgHierarchyControls(form) && !this.isStructuralHierarchyEntry(form);
  }

  protected requiresOrgImageFields(form: OrgNodeForm): boolean {
    return !this.isStructuralHierarchyEntry(form);
  }

  protected orgAddHeading(form: OrgNodeForm): string {
    const parent = this.orgNodeById(form.parentId);
    const sectionConfig = this.simpleOrgSectionConfig(form.sidebarLabel);

    if (this.isStructuralHierarchyEntry(form)) {
      const label = this.structuralHierarchyLabel(form);
      return parent ? `Add ${label} under ${parent.title}` : `Add ${label}`;
    }

    if (this.isStateScopedNominatedForm(form)) {
      return parent ? `Add Nominated Member for ${parent.title}` : 'Add Nominated Member';
    }

    if (this.isHierarchyMemberForm(form)) {
      const parentLabel = parent ? ` under ${parent.title}` : '';
      return `Add ${this.structuralHierarchyLabel(form)} Member${parentLabel}`;
    }

    if (sectionConfig) {
      return parent
        ? `Add ${sectionConfig.memberTitle} under ${parent.title}`
        : `Add ${sectionConfig.memberTitle}`;
    }

    return parent ? `Add Item under ${parent.title}` : 'Add Organisation Item';
  }

  private scrollOrgAddFormIntoView(): void {
    setTimeout(() => {
      this.orgNodeAddFormRef?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  protected requiresOrgLocation(form: OrgNodeForm): boolean {
    if (this.isHierarchyMemberForm(form)) {
      return false;
    }

    return !this.isSimpleOrgSectionLabel(form.sidebarLabel);
  }

  protected requiresOrgHierarchyControls(form: OrgNodeForm): boolean {
    if (this.isHierarchyMemberForm(form)) {
      return false;
    }

    return !this.isSimpleOrgSectionLabel(form.sidebarLabel);
  }

  protected requiresOrgTitleInput(form: OrgNodeForm, nodeId: string | null = null): boolean {
    if (this.isPresidentProfileForm(form)) {
      return false;
    }

    if (this.isTalukCommitteeSectionLabel(form.sidebarLabel)) {
      return true;
    }

    if (this.isStructuralHierarchyEntry(form)) {
      return this.usesCustomStructuralTitle(form.level);
    }

    if (this.isHierarchyMemberForm(form)) {
      return false;
    }

    if (!this.isSimpleOrgSection(form)) {
      return true;
    }

    if (!nodeId) {
      return false;
    }

    const node = this.orgNodeItems().find((item) => item.id === nodeId);
    return node?.parentId === null;
  }

  protected shouldShowOrgTitleInput(form: OrgNodeForm, nodeId: string | null = null): boolean {
    if (this.isPresidentProfileForm(form)) {
      return false;
    }

    return this.requiresOrgTitleInput(form, nodeId) || !this.isStructuralHierarchyEntry(form);
  }

  protected orgTitleFieldLabel(form: OrgNodeForm): string {
    if (this.isTalukCommitteeSectionLabel(form.sidebarLabel)) {
      return `${TALUK_COMMITTEE_TITLE} Name *`;
    }

    if (this.usesCustomStructuralTitle(form.level)) {
      return `${this.structuralHierarchyLabel(form)} Name *`;
    }

    if (!this.isStructuralHierarchyEntry(form)) {
      return 'Designation *';
    }

    return 'Title *';
  }

  protected orgTitlePlaceholder(form: OrgNodeForm): string {
    if (this.isTalukCommitteeSectionLabel(form.sidebarLabel)) {
      return `Enter ${TALUK_COMMITTEE_TITLE} name`;
    }

    if (this.usesCustomStructuralTitle(form.level)) {
      return `Enter ${this.structuralHierarchyLabel(form)} name`;
    }

    if (this.isStructuralHierarchyEntry(form)) {
      return `Enter ${this.structuralHierarchyLabel(form)} name`;
    }

    return 'e.g. President / Secretary / Treasurer';
  }

  protected orgFormTypeBadge(form: OrgNodeForm): string {
    const sectionConfig = this.simpleOrgSectionConfig(form.sidebarLabel);

    if (this.isTalukCommitteeSectionLabel(form.sidebarLabel)) {
      return `${TALUK_COMMITTEE_TITLE} Branch`;
    }

    if (this.isStateScopedNominatedForm(form)) {
      return 'State Nominated Member';
    }

    if (this.isHierarchyMemberForm(form)) {
      return `${this.structuralHierarchyLabel(form)} Member`;
    }

    if (this.isStructuralHierarchyEntry(form)) {
      return `${this.structuralHierarchyLabel(form)} Node`;
    }

    if (sectionConfig) {
      return sectionConfig.memberTitle === 'President'
        ? 'President Profile'
        : 'Section Member';
    }

    return 'Organisation Item';
  }

  protected orgFormModeLabel(form: OrgNodeForm): string {
    if (this.isPresidentProfileForm(form)) {
      return 'President Profile';
    }

    if (this.isStructuralHierarchyEntry(form)) {
      return 'Structure';
    }

    if (this.isStateScopedNominatedForm(form)) {
      return 'State Nominated';
    }

    if (this.isHierarchyMemberForm(form)) {
      return 'Hierarchy Member';
    }

    if (this.isSimpleOrgSection(form)) {
      return 'Section Member';
    }

    return 'Organisation Item';
  }

  protected orgSaveButtonLabel(form: OrgNodeForm): string {
    if (this.isPresidentProfileForm(form)) {
      return 'Save President';
    }

    if (form === this.newOrgNode && this.usesOrgMemberFormArray(form) && this.orgMemberEntryControls.length > 1) {
      return 'Save Members';
    }

    return this.isStructuralHierarchyEntry(form) ? 'Save Structure' : 'Save Member';
  }

  protected orgSelectedParentLabel(form: OrgNodeForm): string {
    const parent = this.orgNodeById(form.parentId);
    return parent ? this.orgNodePath(parent) : 'Top level';
  }

  protected orgSaveTargetHint(form: OrgNodeForm): string {
    const sectionConfig = this.simpleOrgSectionConfig(form.sidebarLabel);

    if (this.isTalukCommitteeSectionLabel(form.sidebarLabel)) {
      return `Creates a ${TALUK_COMMITTEE_TITLE} branch under the selected taluk. Members can be added inside it.`;
    }

    if (this.isStateScopedNominatedForm(form)) {
      return 'Creates a nominated body member for the selected state.';
    }

    if (this.isHierarchyMemberForm(form)) {
      return 'Creates a member inside the selected hierarchy node.';
    }

    if (this.isStructuralHierarchyEntry(form)) {
      return 'Creates a structural node in the hierarchy tree.';
    }

    if (this.usesOrgMemberFormArray(form)) {
      return 'Add one or more members in this popup. Use + Add Member to create extra rows.';
    }

    if (sectionConfig?.memberTitle === 'President') {
      return 'Creates the president profile with name, photo, contact, and the details shown on the public hover card.';
    }

    return 'Creates a member/profile entry under the selected section.';
  }

  protected orgSectionAddButtonLabel(section: OrgQuickSection): string {
    if (section === 'state') {
      return '+ State Committee State';
    }

    if (section === 'president') {
      return '+ Add President';
    }

    return '+ Add Member';
  }

  protected orgStructuralEntryHelpText(form: OrgNodeForm): string {
    if (this.isTalukCommitteeSectionLabel(form.sidebarLabel)) {
      return `Enter the ${TALUK_COMMITTEE_TITLE} name here. Member name will be derived from this title.`;
    }

    if (form.level === 'city') {
      return `Enter the ${CITY_GBA_LEVEL_TITLE} branch name here. It sits beside the district branch under the selected state, and members or corporations can be added inside it.`;
    }

    if (form.level === 'corporation') {
      return 'Enter the corporation branch name. It will be created under the selected city / GBA branch.';
    }

    if (form.level === 'assembly') {
      return 'Enter the assembly branch name. It will be created under the selected corporation branch.';
    }

    return `Only the ${this.structuralHierarchyLabel(form).toLowerCase()} name is required here. When adding members under this node you'll be asked to provide the member name and choose where to add them.`;
  }

  protected showOrgDistrictField(form: OrgNodeForm): boolean {
    return this.requiresOrgLocation(form)
      && (form.level === 'district' || form.level === 'taluk');
  }

  protected showOrgTalukField(form: OrgNodeForm): boolean {
    return this.requiresOrgLocation(form) && this.usesTalukOrgLevel(form.level);
  }

  protected isOrgStateLocked(form: OrgNodeForm): boolean {
    const parent = this.orgNodeById(form.parentId);

    if (!parent) {
      return false;
    }

    if (this.isTalukCommitteeSectionLabel(form.sidebarLabel)) {
      return true;
    }

    if (this.isStateCommitteeSectionLabel(form.sidebarLabel) || this.isStateCommitteeMemberLabel(form.sidebarLabel)) {
      return !this.isStateCommitteeContainer(parent);
    }

    return false;
  }

  protected isOrgDistrictLocked(form: OrgNodeForm): boolean {
    const parent = this.orgNodeById(form.parentId);

    if (!parent) {
      return false;
    }

    if (this.isTalukCommitteeSectionLabel(form.sidebarLabel)) {
      return true;
    }

    if (this.isStateCommitteeSectionLabel(form.sidebarLabel) || this.isStateCommitteeMemberLabel(form.sidebarLabel)) {
      return !this.isStateCommitteeContainer(parent) && parent.level !== 'state';
    }

    return false;
  }

  protected isOrgTalukLocked(form: OrgNodeForm): boolean {
    const parent = this.orgNodeById(form.parentId);

    if (!parent) {
      return false;
    }

    if (this.isTalukCommitteeSectionLabel(form.sidebarLabel)) {
      return true;
    }

    if (this.isStateCommitteeSectionLabel(form.sidebarLabel) || this.isStateCommitteeMemberLabel(form.sidebarLabel)) {
      return parent.level === 'taluk';
    }

    return false;
  }

  protected canAddOrgChild(node: AdminOrgNode): boolean {
    if (this.isTalukCommitteeContainerNode(node) || this.isTalukCommitteeMemberNode(node) || this.isStateCommitteeMemberNode(node)) {
      return false;
    }

    if (this.isSimpleOrgSectionLabel(node.sidebarLabel)) {
      return false;
    }

    if (!this.isStateCommitteeNode(node)) {
      return false;
    }

    return this.isStateCommitteeContainer(node)
      || node.level === 'state'
      || node.level === 'district'
      || node.level === 'city'
      || node.level === 'corporation'
      || node.level === 'taluk';
  }

  protected showsSplitStateBranchActions(node: AdminOrgNode): boolean {
    return this.isStateCommitteeNode(node)
      && node.level === 'state'
      && !this.isStateCommitteeContainer(node)
      && !this.isStateCommitteeMemberNode(node);
  }

  protected canAddOrgMember(node: AdminOrgNode): boolean {
    if (this.isSimpleOrgSectionLabel(node.sidebarLabel) && node.parentId === null) {
      return true;
    }

    return (this.isStateCommitteeNode(node)
      && !this.isStateCommitteeMemberNode(node))
      || this.isTalukCommitteeContainerNode(node);
  }

  protected canAddStateNominatedMember(node: AdminOrgNode): boolean {
    return this.isStateCommitteeNode(node)
      && !this.isStateCommitteeContainer(node)
      && !this.isStateCommitteeMemberNode(node)
      && node.level === 'state';
  }

  protected orgChildActionLabel(node: AdminOrgNode): string {
    if (this.isStateCommitteeNode(node)) {
      if (this.isStateCommitteeContainer(node)) {
        return '+ State';
      }

      if (node.level === 'state') {
        return '+ District';
      }

      if (node.level === 'district') {
        return '+ Taluk';
      }

      if (node.level === 'city') {
        return '+ Corporation';
      }

      if (node.level === 'corporation') {
        return '+ Assembly';
      }

      if (node.level === 'taluk') {
        return `+ ${TALUK_COMMITTEE_TITLE}`;
      }
    }

    return '+ Child';
  }

  protected orgMemberActionLabel(node: AdminOrgNode): string {
    if (this.isSimpleOrgSectionLabel(node.sidebarLabel)) {
      return '+ Member';
    }

    if (this.isStateCommitteeContainer(node)) {
      return '+ State Committee Member';
    }

    if (this.isTalukCommitteeContainerNode(node)) {
      return `+ ${TALUK_COMMITTEE_TITLE} Member`;
    }

    if (node.level === 'state') {
      return '+ State Member';
    }

    if (node.level === 'district') {
      return '+ District Member';
    }

    if (node.level === 'city') {
      return `+ ${CITY_GBA_LEVEL_TITLE} Member`;
    }

    if (node.level === 'corporation') {
      return '+ Corporation Member';
    }

    if (node.level === 'assembly') {
      return '+ Assembly Member';
    }

    return '+ Taluk Member';
  }

  protected startAddOrgNodeAtLevel(parent: AdminOrgNode, level: AdminOrgNodeLevel) {
    this.mediaError.set('');
    this.editingOrgNodeId.set(null);
    this.newOrgNode = this.emptyOrgNodeForm(parent.id);
    this.newOrgNode.level = level;
    this.newOrgNode.sidebarLabel = parent.level === 'taluk'
      ? TALUK_COMMITTEE_SECTION_LABEL
      : parent.sidebarLabel;
    this.newOrgNode.state = parent.location.state;
    this.newOrgNode.district = parent.level === 'state' ? '' : parent.location.district;
    this.newOrgNode.taluk = parent.level === 'taluk' ? parent.location.taluk : '';
    this.newOrgNode = this.applyParentDefaults(this.newOrgNode);
    this.resetOrgMemberEntryArray();
    this.newOrgNodeImageFile = null;
    this.showOrgNodeAdd.set(true);
    this.scrollOrgAddFormIntoView();
  }

  protected startAddStateNominatedMember(parent: AdminOrgNode) {
    this.mediaError.set('');
    this.editingOrgNodeId.set(null);
    this.newOrgNode = this.emptyOrgNodeForm(parent.id);
    this.newOrgNode.sidebarLabel = 'nominated-body';
    this.newOrgNode.level = 'state';
    this.newOrgNode.state = parent.location.state || 'Karnataka';
    this.newOrgNode.district = '';
    this.newOrgNode.taluk = '';
    this.newOrgNode = this.applyParentDefaults(this.newOrgNode);
    this.resetOrgMemberEntryArray();
    this.newOrgNodeImageFile = null;
    this.showOrgNodeAdd.set(true);
    this.scrollOrgAddFormIntoView();
  }

  private normalizeOrgFormForSave(form: OrgNodeForm): OrgNodeForm {
    const normalizedContact = String(form.contact || '').trim();

    if (this.isStructuralHierarchyEntry(form)) {
      const stateName = String(form.state || '').trim();
      const districtName = String(form.district || '').trim();
      const talukName = String(form.taluk || '').trim();
      const branchTitle = String(form.title || '').trim();

      if (this.isTalukCommitteeSectionLabel(form.sidebarLabel)) {
        const committeeTitle = String(form.title || '').trim();
        return {
          ...form,
          contact: normalizedContact,
          title: committeeTitle,
          subtitle: committeeTitle,
          district: districtName,
          taluk: talukName,
        };
      }

      const title = form.level === 'district'
        ? districtName
        : form.level === 'taluk'
          ? talukName
          : this.usesCustomStructuralTitle(form.level)
            ? branchTitle
            : stateName;

      return {
        ...form,
        contact: normalizedContact,
        title,
        subtitle: title,
        district: form.level === 'district' || form.level === 'taluk' ? districtName : '',
        taluk: this.usesTalukOrgLevel(form.level) ? talukName : '',
      };
    }

    const sectionConfig = this.simpleOrgSectionConfig(form.sidebarLabel);

    if (sectionConfig) {
      return {
        ...form,
        contact: normalizedContact,
        title: String(form.title || '').trim() || sectionConfig.memberTitle,
        level: 'state',
        state: String(form.state || '').trim() || 'Karnataka',
        district: '',
        taluk: '',
      };
    }

    if (this.isHierarchyMemberForm(form)) {
      return {
        ...form,
        contact: normalizedContact,
        title: String(form.title || '').trim() || 'Member',
      };
    }

    return {
      ...form,
      contact: normalizedContact,
    };
  }

  private findSimpleSectionAnchor(label: string) {
    const normalizedLabel = this.normalizeOrgSearchText(label);
    const rootNodes = this.orgChildrenByParentId().get(null) ?? [];

    return rootNodes.find((node) => this.normalizeOrgSearchText(node.sidebarLabel) === normalizedLabel) ?? null;
  }

  private async ensureSimpleSectionAnchor(label: string): Promise<AdminOrgNode | null> {
    const config = this.simpleOrgSectionConfig(label);

    if (!config) {
      return null;
    }

    const existing = this.findSimpleSectionAnchor(label);
    if (existing) {
      return existing;
    }

    await this.data.addOrgNode({
      parentId: null,
      title: config.sectionTitle,
      subtitle: config.sectionTitle,
      contact: '',
      order: 0,
      description: '',
      level: 'state',
      location: {
        state: 'Karnataka',
        district: '',
        taluk: '',
      },
      sidebarLabel: label,
      imageUrl: '',
      imageAlt: '',
      isActive: true,
    });

    return this.findSimpleSectionAnchor(label);
  }

  private findSectionAnchor(section: OrgQuickSection): AdminOrgNode | null {
    const rootNodes = this.orgChildrenByParentId().get(null) ?? [];
    const groups = this.sectionKeywords(section);

    if (section === 'state') {
      return rootNodes.find((node) =>
        this.isStateCommitteeSectionLabel(node.sidebarLabel)
        && this.normalizeOrgSearchText(node.title) === this.normalizeOrgSearchText('State Committee')
      ) ?? null;
    }

    const exactLabel = rootNodes.find((node) =>
      this.normalizeOrgSearchText(node.sidebarLabel) === this.normalizeOrgSearchText(this.sectionDefaultSidebarLabel(section))
    );

    if (exactLabel) {
      return exactLabel;
    }

    return rootNodes.find((node) => this.matchesOrgKeywords(node, groups)) ?? null;
  }

  private applySectionDefaults(section: OrgQuickSection) {
    this.newOrgNode.sidebarLabel = this.sectionDefaultSidebarLabel(section);

    if (section === 'president') {
      this.newOrgNode.parentId = null;
      this.newOrgNode.level = 'state';
      this.newOrgNode.district = '';
      this.newOrgNode.taluk = '';
      if (!this.newOrgNode.title.trim()) {
        this.newOrgNode.title = 'President';
      }
      this.newOrgNode.state = this.newOrgNode.state || 'Karnataka';
      return;
    }

    if (section === 'office-bearer' || section === 'working' || section === 'nominated') {
      this.newOrgNode.level = 'state';
      this.newOrgNode.state = this.newOrgNode.state || 'Karnataka';
      this.newOrgNode.district = '';
      this.newOrgNode.taluk = '';
      return;
    }

    if (section === 'representative') {
      this.newOrgNode.level = 'state';
      this.newOrgNode.state = this.newOrgNode.state || 'Karnataka';
      this.newOrgNode.district = '';
      this.newOrgNode.taluk = '';
      return;
    }

    if (section === 'state') {
      // Preserve parentId if already set (adding as child); only clear if not set (root)
      if (!this.newOrgNode.parentId) {
        this.newOrgNode.parentId = null;
      }
      this.newOrgNode.level = 'state';
      this.newOrgNode.district = '';
      this.newOrgNode.taluk = '';
    }
  }

  private isOrgLocationValid(form: OrgNodeForm) {
    if (this.isSimpleOrgSection(form)) {
      return true;
    }

    if (this.isHierarchyMemberForm(form)) {
      const parent = this.orgNodeById(form.parentId);

      if (!parent || parent.location.state !== form.state) {
        return false;
      }

      if (parent.level === 'state') {
        return !form.district.trim() && !form.taluk.trim();
      }

      return parent.location.district === form.district
        && parent.location.taluk === form.taluk;
    }

    const level = form.level;

    if (!form.state.trim()) {
      return false;
    }

    if (this.usesStateOnlyOrgLevel(level)) {
      return !form.district.trim() && !form.taluk.trim();
    }

    if (this.isDistrictOnlyOrgLevel(level)) {
      return !!form.district.trim() && !form.taluk.trim();
    }

    return !!form.district.trim() && !!form.taluk.trim();
  }

  private orgLocationValidationMessage(level: AdminOrgNodeLevel): string {
    if (this.usesStateOnlyOrgLevel(level)) {
      if (level === 'state') {
        return 'For state level, keep district and taluk empty.';
      }

      return `For ${this.orgLevelLabel(level).toLowerCase()} level, keep district and taluk empty.`;
    }

    if (this.isDistrictOnlyOrgLevel(level)) {
      return `For ${this.orgLevelLabel(level).toLowerCase()} level, district is required and taluk must be empty.`;
    }

    return 'For taluk level, both district and taluk are required.';
  }

  private orgFormValidationError(form: OrgNodeForm): string | null {
    const normalizedForm = this.normalizeOrgFormForSave(form);

    if (this.isStructuralHierarchyEntry(normalizedForm)) {
      if (this.isTalukCommitteeSectionLabel(normalizedForm.sidebarLabel) && !normalizedForm.title.trim()) {
        return `${TALUK_COMMITTEE_TITLE} name is required.`;
      }

      if (this.usesCustomStructuralTitle(normalizedForm.level) && !normalizedForm.title.trim()) {
        return `${this.structuralHierarchyLabel(normalizedForm)} name is required.`;
      }

      if (!normalizedForm.state.trim()) {
        return 'State is required.';
      }

      if (this.isDistrictOnlyOrgLevel(normalizedForm.level) && !normalizedForm.district.trim()) {
        return 'District is required.';
      }

      if (this.usesTalukOrgLevel(normalizedForm.level) && !normalizedForm.taluk.trim()) {
        return 'Taluk is required.';
      }

      if (!this.isOrgLocationValid(normalizedForm)) {
        return this.orgLocationValidationMessage(normalizedForm.level);
      }

      return null;
    }

    if (!normalizedForm.title.trim()) {
      return 'Title is required.';
    }

    if (!normalizedForm.subtitle.trim()) {
      return 'Member name is required.';
    }

    if (this.requiresOrgLocation(normalizedForm) && !normalizedForm.state.trim()) {
      return 'State is required.';
    }

    if (!this.isOrgLocationValid(normalizedForm)) {
      return this.orgLocationValidationMessage(normalizedForm.level);
    }

    return null;
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
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      const apiMessage = typeof httpError?.error?.message === 'string'
        ? httpError.error.message.trim()
        : '';
      this.mediaError.set(apiMessage || errorMessage);
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

  onByeLawSelected(event: Event) {
    this.byeLawFile = this.fileFromEvent(event);
  }

  onMagazineSelected(event: Event) {
    this.magazineFile = this.fileFromEvent(event);
  }

  saveDailyVachanaContent() {
    this.mediaError.set('');
    this.data.saveDailyVachanaContent(this.dailyVachanaContent);
    this.dailyVachanaContent = this.clone(this.data.dailyVachanaContent());
  }

  saveScholarshipSettings() {
    this.mediaError.set('');
    this.data.saveScholarshipSettings(this.scholarshipSettings);
    this.scholarshipSettings = this.clone(this.data.scholarshipSettings());
    this.scholarshipSettingsDialogOpen.set(false);
    this.scholarshipSettingsMenuOpen.set(false);
  }

  toggleScholarshipSettingsMenu() {
    this.scholarshipSettingsMenuOpen.update((isOpen) => !isOpen);
  }

  toggleAdminActionsMenu() {
    this.adminActionsMenuOpen.update((isOpen) => !isOpen);
  }

  closeAdminActionsMenu() {
    this.adminActionsMenuOpen.set(false);
  }

  logoutFromAdminMenu() {
    this.adminActionsMenuOpen.set(false);
    this.logout();
  }

  openScholarshipSettingsDialog() {
    this.scholarshipSettingsMenuOpen.set(false);
    this.scholarshipSettingsDialogOpen.set(true);
  }

  closeScholarshipSettingsDialog() {
    this.scholarshipSettingsDialogOpen.set(false);
    this.scholarshipSettingsMenuOpen.set(false);
    this.scholarshipSettings = this.clone(this.data.scholarshipSettings());
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
      await this.data.saveNavbarContent(this.navbarContent, this.navbarLogoFile, this.byeLawFile, this.magazineFile);
      this.navbarContent = this.clone(this.data.navbarContent());
      this.navbarLogoFile = null;
      this.byeLawFile = null;
      this.magazineFile = null;
    }, 'Header save failed. Make sure the backend is running and the PDF files are valid.');
  }

  async deleteByeLaw() {
    if (!this.navbarContent.byeLawUrl) {
      return;
    }

    if (!confirm('Delete the current by-law PDF?')) {
      return;
    }

    await this.runMediaAction(async () => {
      this.navbarContent = { ...this.navbarContent, byeLawUrl: '' };
      this.byeLawFile = null;
      await this.data.saveNavbarContent(this.navbarContent, null, null, null);
      this.navbarContent = this.clone(this.data.navbarContent());
    }, 'By-law PDF delete failed. Make sure the backend is running.');
  }

  async deleteMagazine() {
    if (!this.navbarContent.magazineUrl) {
      return;
    }

    if (!confirm('Delete the current magazine PDF?')) {
      return;
    }

    await this.runMediaAction(async () => {
      this.navbarContent = { ...this.navbarContent, magazineUrl: '' };
      this.magazineFile = null;
      await this.data.saveNavbarContent(this.navbarContent, null, null, null);
      this.navbarContent = this.clone(this.data.navbarContent());
    }, 'Magazine PDF delete failed. Make sure the backend is running.');
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

  private isOrgNodeInSubtree(candidateId: string, rootId: string): boolean {
    const childrenByParent = new Map<string, string[]>();

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
      const current = queue.shift() as string;
      if (current === candidateId) {
        return true;
      }

      for (const childId of childrenByParent.get(current) ?? []) {
        queue.push(childId);
      }
    }

    return false;
  }

  orgParentOptions(excludeId: string | null = null) {
    return this.orgNodeItems()
      .filter(node => excludeId === null ? true : !this.isOrgNodeInSubtree(node.id, excludeId))
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  orgParentOptionsForForm(form: OrgNodeForm, excludeId: string | null = null) {
    const isAllowed = (node: AdminOrgNode) => {
      if (excludeId !== null && this.isOrgNodeInSubtree(node.id, excludeId)) {
        return false;
      }

      if (this.isSimpleOrgSection(form)) {
        return false;
      }

      if (this.isTalukCommitteeSectionLabel(form.sidebarLabel)) {
        return this.isStateCommitteeNode(node)
          && node.level === 'taluk'
          && !this.isStateCommitteeMemberNode(node)
          && !this.isTalukCommitteeContainerNode(node)
          && !this.isTalukCommitteeMemberNode(node);
      }

      if (this.isStateCommitteeMemberLabel(form.sidebarLabel)) {
        return this.isStateCommitteeNode(node)
          && node.level === form.level
          && !this.isStateCommitteeMemberNode(node);
      }

      if (this.isStateCommitteeSectionLabel(form.sidebarLabel)) {
        if (form.level === 'state') {
          return this.isStateCommitteeContainer(node);
        }

        if (form.level === 'district' || form.level === 'city') {
          return this.isStateCommitteeNode(node)
            && node.level === 'state'
            && !this.isStateCommitteeContainer(node)
            && !this.isStateCommitteeMemberNode(node);
        }

        if (form.level === 'corporation') {
          return this.isStateCommitteeNode(node)
            && node.level === 'city'
            && !this.isStateCommitteeMemberNode(node);
        }

        if (form.level === 'assembly') {
          return this.isStateCommitteeNode(node)
            && node.level === 'corporation'
            && !this.isStateCommitteeMemberNode(node);
        }

        return this.isStateCommitteeNode(node)
          && node.level === 'district'
          && !this.isStateCommitteeMemberNode(node);
      }

      return true;
    };

    return this.orgNodeItems()
      .filter(isAllowed)
      .sort((a, b) => this.orgNodePath(a).localeCompare(this.orgNodePath(b)));
  }

  orgNodeDepth(node: AdminOrgNode) {
    let depth = 0;
    let currentParentId = node.parentId;
    const nodesById = this.orgNodesById();

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
    const nodesById = this.orgNodesById();
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

  private orgSectionRoot(node: AdminOrgNode): AdminOrgNode {
    const nodesById = this.orgNodesById();
    let current = node;

    while (current.parentId) {
      const parent = nodesById.get(current.parentId);
      if (!parent) {
        break;
      }
      current = parent;
    }

    return current;
  }

  private orgNodeById(id: string | null): AdminOrgNode | null {
    if (!id) {
      return null;
    }

    return this.orgNodesById().get(id) ?? null;
  }

  private findStateCommitteeAnchor(): AdminOrgNode | null {
    const rootNodes = this.orgChildrenByParentId().get(null) ?? [];

    return rootNodes.find((node) =>
      this.isStateCommitteeSectionLabel(node.sidebarLabel)
      && this.normalizeOrgSearchText(node.title) === this.normalizeOrgSearchText('State Committee')
    ) ?? null;
  }

  private async ensureStateCommitteeAnchor(): Promise<AdminOrgNode | null> {
    const existing = this.findStateCommitteeAnchor();
    if (existing) {
      return existing;
    }

    await this.data.addOrgNode({
      parentId: null,
      title: 'State Committee',
      subtitle: 'State Committee',
      contact: '',
      order: 0,
      description: '',
      level: 'state',
      location: {
        state: 'Karnataka',
        district: '',
        taluk: '',
      },
      sidebarLabel: 'state-committee',
      imageUrl: '',
      imageAlt: '',
      isActive: true,
    });

    return this.findStateCommitteeAnchor();
  }

  private applyParentDefaults(form: OrgNodeForm): OrgNodeForm {
    const parent = this.orgNodeById(form.parentId);

    if (!parent) {
      return form;
    }

    if (this.isHierarchyMemberForm(form)) {
      return form;
    }

    // If a State Committee node is attached under Representative, normalize it into the State Committee tree shape.
    const isRepresentative = this.isRepresentativeSectionLabel(parent.sidebarLabel);
    if (isRepresentative && this.isStateCommitteeSectionLabel(form.sidebarLabel)) {
      return {
        ...form,
        sidebarLabel: 'state-committee', // Change label to state-committee for proper hierarchy
        level: 'state',
        state: parent.location.state || form.state || 'Karnataka',
        district: '',
        taluk: '',
      };
    }

    if (this.isSimpleOrgSection(form)) {
      return {
        ...form,
        level: 'state',
        state: parent.location.state || form.state || 'Karnataka',
        district: '',
        taluk: '',
      };
    }

    if (this.isTalukCommitteeSectionLabel(form.sidebarLabel)) {
      return {
        ...form,
        level: 'taluk',
        state: parent.location.state || form.state,
        district: parent.location.district || form.district,
        taluk: parent.location.taluk || form.taluk,
      };
    }

    if (this.isStateCommitteeContainer(parent)) {
      return {
        ...form,
        level: 'state',
        state: parent.location.state || form.state || 'Karnataka',
        district: '',
        taluk: '',
      };
    }

    if (parent.level === 'state') {
      return {
        ...form,
        level: form.level === 'city' ? 'city' : 'district',
        state: parent.location.state || form.state,
        district: form.level === 'district' ? form.district : '',
        taluk: '',
      };
    }

    if (parent.level === 'city') {
      return {
        ...form,
        level: form.level === 'assembly' ? 'assembly' : 'corporation',
        state: parent.location.state || form.state,
        district: '',
        taluk: '',
      };
    }

    if (parent.level === 'corporation') {
      return {
        ...form,
        level: 'assembly',
        state: parent.location.state || form.state,
        district: '',
        taluk: '',
      };
    }

    if (parent.level === 'district') {
      return {
        ...form,
        level: 'taluk',
        state: parent.location.state || form.state,
        district: parent.location.district || form.district,
        taluk: form.taluk,
      };
    }

    return {
      ...form,
      level: 'taluk',
      state: parent.location.state || form.state,
      district: parent.location.district || form.district,
      taluk: parent.level === 'taluk' ? (parent.location.taluk || form.taluk) : '',
    };
  }

  protected onNewOrgParentChanged(parentId: string | null): void {
    this.newOrgNode.parentId = parentId;
    this.newOrgNode = this.applyParentDefaults(this.newOrgNode);
  }

  protected onEditOrgParentChanged(parentId: string | null): void {
    this.editOrgNode.parentId = parentId;
    this.editOrgNode = this.applyParentDefaults(this.editOrgNode);
  }

  protected isStateCommitteeNode(node: AdminOrgNode): boolean {
    const section = this.orgSectionRoot(node);
    return this.normalizeOrgSearchText(section.sidebarLabel) === this.normalizeOrgSearchText('state-committee');
  }

  protected isStateCommitteeContainer(node: AdminOrgNode): boolean {
    return this.isStateCommitteeNode(node)
      && this.normalizeOrgSearchText(node.title) === this.normalizeOrgSearchText('state committee');
  }

  protected isStateCommitteeMemberNode(node: AdminOrgNode): boolean {
    if (
      !this.isStateCommitteeNode(node)
      || (!this.isStateCommitteeSectionLabel(node.sidebarLabel) && !this.isStateCommitteeMemberLabel(node.sidebarLabel))
      || this.isStateCommitteeContainer(node)
    ) {
      return false;
    }

    const parent = this.orgNodeById(node.parentId);

    if (!parent || !this.isStateCommitteeSectionLabel(parent.sidebarLabel)) {
      return false;
    }

    if (parent.level !== node.level || parent.location.state !== node.location.state) {
      return false;
    }

    if (node.level === 'state') {
      if (node.location.district || node.location.taluk) {
        return false;
      }

      if (this.isStateCommitteeContainer(parent)) {
        return this.isStateCommitteeMemberLabel(node.sidebarLabel)
          || !this.matchesStateCommitteeStateBranchIdentity(node);
      }

      return true;
    }

    return parent.location.district === node.location.district
      && parent.location.taluk === node.location.taluk;
  }

  isOrgSectionHeader(node: AdminOrgNode): boolean {
    return node.parentId === null;
  }

  orgSectionLabel(node: AdminOrgNode): string {
    return this.orgSectionRoot(node).title || 'Organisation Section';
  }

  isOrgSectionMember(node: AdminOrgNode): boolean {
    return node.parentId !== null;
  }

  protected orgNodeBadgeLabel(node: AdminOrgNode): string {
    if (this.isTalukCommitteeContainerNode(node)) {
      return TALUK_COMMITTEE_TITLE;
    }

    if (this.isTalukCommitteeMemberNode(node)) {
      return `${TALUK_COMMITTEE_TITLE} Member`;
    }

    if (this.isStateCommitteeContainer(node)) {
      return 'State Committee Root';
    }

    if (this.isStateCommitteeNode(node)) {
      return `${this.orgLevelLabel(node.level)} ${this.isStateCommitteeMemberNode(node) ? 'Member' : 'Node'}`;
    }

    if (this.isOrgSectionHeader(node)) {
      return 'Section Root';
    }

    return 'Member';
  }

  protected orgModalOpen(): boolean {
    return this.showOrgNodeAdd() || !!this.editingOrgNodeId();
  }

  protected closeOrgModal() {
    this.cancelAddOrgNode();
    this.cancelEditOrgNode();
  }

  protected updateOrgMemberSearch(value: string) {
    this.orgMemberSearchDraft.set(value);
    this.orgMemberSearchTerm.set(value);
    this.orgMemberPage.set(1);
  }

  protected clearOrgMemberSearch() {
    this.orgMemberSearchDraft.set('');
    this.orgMemberSearchTerm.set('');
    this.orgMemberPage.set(1);
  }

  protected goToOrgMemberPage(page: number) {
    const totalPages = this.orgMemberTotalPages();

    if (totalPages === 0) {
      this.orgMemberPage.set(1);
      return;
    }

    const nextPage = Math.min(Math.max(page, 1), totalPages);
    this.orgMemberPage.set(nextPage);
  }

  protected orgMemberEmptyText(): string {
    const units = this.orgCurrentListUnits();

    if (this.orgMemberSearchActive()) {
      return `No ${units.plural} match the current search.`;
    }

    const view = this.orgView();

    if (view.kind === 'section') {
      return this.orgSectionEmptyText(view.section);
    }

    if (view.kind === 'node' || view.kind === 'members') {
      const node = this.orgNodeById(view.nodeId);

      if (node) {
        return `No ${units.plural} have been added for this ${this.orgNodeLevelBadge(node).toLowerCase()} yet.`;
      }
    }

    return `No same-level ${units.plural} have been added here yet.`;
  }

  protected orgSearchFieldLabel(): string {
    const units = this.orgCurrentListUnits();
    return units.singular === 'president' ? 'Search President' : 'Search Members';
  }

  protected orgPersonNameLabel(form: OrgNodeForm): string {
    return this.isPresidentProfileForm(form) ? 'President Name *' : 'Member Name *';
  }

  protected orgPersonNamePlaceholder(form: OrgNodeForm): string {
    return this.isPresidentProfileForm(form) ? 'Full president name' : 'Full member name';
  }

  protected orgSectionInfoLabel(form: OrgNodeForm): string {
    return this.isPresidentProfileForm(form) ? 'President Profile' : 'Member Section';
  }

  protected orgSectionInfoCopy(form: OrgNodeForm): string {
    if (this.isPresidentProfileForm(form)) {
      return 'Use the president name, photo, contact, and the details shown on the public hover card.';
    }

    return 'For President, Office Bearers, General Working Committee, Representative, Nominated, and local-unit members, member name, image, description, and contact are supported.';
  }

  protected orgImageLabel(form: OrgNodeForm): string {
    return this.isPresidentProfileForm(form) ? 'President Photo' : 'Image';
  }

  protected orgImageAltLabel(form: OrgNodeForm): string {
    return this.isPresidentProfileForm(form) ? 'President Photo Alt Text' : 'Image Alt Text';
  }

  protected orgImageAltPlaceholder(form: OrgNodeForm): string {
    return this.isPresidentProfileForm(form) ? 'President photo alt text' : 'Member photo alt text';
  }

  protected orgDescriptionLabel(form: OrgNodeForm): string {
    return this.isPresidentProfileForm(form) ? 'Hover Details / Description' : 'Description';
  }

  protected orgDescriptionPlaceholder(form: OrgNodeForm): string {
    if (this.isPresidentProfileForm(form)) {
      return 'Short details shown on the public president hover card';
    }

    return 'Short description shown on public pages';
  }

  protected orgBranchMembersHeading(node: AdminOrgNode): string {
    if (this.isTalukCommitteeContainerNode(node)) {
      return `${TALUK_COMMITTEE_TITLE} Members`;
    }

    if (node.level === 'city') {
      return `${CITY_GBA_LEVEL_TITLE} Members`;
    }

    return `${this.orgLevelLabel(node.level)} Members`;
  }

  protected orgBranchMembersCopy(node: AdminOrgNode): string {
    if (this.isTalukCommitteeContainerNode(node)) {
      return `Manage ${TALUK_COMMITTEE_TITLE} members for this branch here.`;
    }

    if (node.level === 'state') {
      return `Manage state members here, then open the district or ${CITY_GBA_LEVEL_TITLE} list below.`;
    }

    if (node.level === 'district') {
      return 'Manage district members here, then open the taluk list below.';
    }

    if (node.level === 'taluk') {
      return `Manage taluk members here, then open the ${TALUK_COMMITTEE_TITLE} list below.`;
    }

    if (node.level === 'city') {
      return `Manage ${CITY_GBA_LEVEL_TITLE} members here, then open the corporation list below.`;
    }

    if (node.level === 'corporation') {
      return 'Manage corporation members here, then open the assembly list below.';
    }

    return 'Manage members for this branch here.';
  }

  protected orgBranchChildrenHeading(node: AdminOrgNode): string {
    if (node.level === 'state') {
      return `District and ${CITY_GBA_LEVEL_TITLE} List`;
    }

    if (node.level === 'district') {
      return 'Taluk List';
    }

    if (node.level === 'taluk') {
      return `${TALUK_COMMITTEE_TITLE} List`;
    }

    if (node.level === 'city') {
      return 'Corporation List';
    }

    if (node.level === 'corporation') {
      return 'Assembly List';
    }

    return 'Child Levels';
  }

  protected orgBranchChildrenCopy(node: AdminOrgNode): string {
    if (node.level === 'state') {
      return `Open a district or ${CITY_GBA_LEVEL_TITLE} branch to manage its members and the next level under it.`;
    }

    if (node.level === 'district') {
      return 'Open a taluk to manage that taluk members and its CMC/TMC/GP list.';
    }

    if (node.level === 'taluk') {
      return `Open a ${TALUK_COMMITTEE_TITLE} branch to manage its members.`;
    }

    if (node.level === 'city') {
      return 'Open a corporation branch to manage its members and assembly list.';
    }

    if (node.level === 'corporation') {
      return 'Open an assembly branch to manage its members.';
    }

    return 'Open a child branch to continue down the hierarchy.';
  }

  protected showsOrgBranchChildren(node: AdminOrgNode): boolean {
    return !this.isTalukCommitteeContainerNode(node);
  }

  protected orgBranchChildrenEmptyText(node: AdminOrgNode): string {
    if (node.level === 'state') {
      return `No districts or ${CITY_GBA_LEVEL_TITLE.toLowerCase()} branches have been added under this state yet.`;
    }

    if (node.level === 'district') {
      return 'No taluk branches have been added under this district yet.';
    }

    if (node.level === 'taluk') {
      return `No ${TALUK_COMMITTEE_TITLE.toLowerCase()} branches have been added under this taluk yet.`;
    }

    if (node.level === 'city') {
      return 'No corporation branches have been added under this city / GBA yet.';
    }

    if (node.level === 'corporation') {
      return 'No assembly branches have been added under this corporation yet.';
    }

    return 'No lower-level branches are available under this node yet.';
  }

  protected usesOrgMemberFormArray(form: OrgNodeForm): boolean {
    return !this.isStructuralHierarchyEntry(form) && !this.isPresidentProfileForm(form);
  }

  protected get orgMemberEntries(): FormArray {
    return this.orgMemberBatchForm.get('members') as FormArray;
  }

  protected get orgMemberEntryControls(): FormGroup[] {
    return this.orgMemberEntries.controls as FormGroup[];
  }

  protected addOrgMemberEntry(): void {
    this.orgMemberEntries.push(this.createOrgMemberEntryGroup());
    this.orgMemberEntryFiles.push(null);
  }

  protected removeOrgMemberEntry(index: number): void {
    if (this.orgMemberEntries.length === 1) {
      return;
    }

    this.orgMemberEntries.removeAt(index);
    this.orgMemberEntryFiles.splice(index, 1);
  }

  protected isOrgMemberFieldInvalid(group: FormGroup, controlName: 'firstName' | 'designation' | 'contact' | 'description' | 'imageAlt'): boolean {
    const control = group.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected onOrgMemberEntryImageSelected(event: Event, index: number): void {
    this.orgMemberEntryFiles[index] = this.fileFromEvent(event);
  }

  protected orgMemberEntrySelectedFileName(index: number): string {
    return this.selectedFileName(this.orgMemberEntryFiles[index]);
  }

  protected openOrgOverview() {
    this.closeOrgModal();
    this.resetOrgMemberBrowser();
    this.orgView.set({ kind: 'overview' });
  }

  protected openOrgSection(section: OrgQuickSection) {
    this.closeOrgModal();
    this.resetOrgMemberBrowser();
    this.orgView.set({ kind: 'section', section });
  }

  protected openOrgNodePage(node: AdminOrgNode) {
    this.closeOrgModal();
    this.resetOrgMemberBrowser();
    this.orgView.set({
      kind: 'node',
      section: this.orgSectionKeyForNode(node),
      nodeId: node.id,
    });
  }

  protected openOrgMembersPage(node: AdminOrgNode) {
    this.closeOrgModal();
    this.resetOrgMemberBrowser();
    this.orgView.set({
      kind: 'members',
      section: this.orgSectionKeyForNode(node),
      nodeId: node.id,
    });
  }

  protected openStateCommitteeMembersPage() {
    const anchor = this.findStateCommitteeAnchor();

    if (anchor) {
      this.openOrgMembersPage(anchor);
    }
  }

  protected async startAddStateCommitteeSectionMember() {
    this.mediaError.set('');

    try {
      const anchor = await this.ensureStateCommitteeAnchor();

      if (anchor) {
        this.startAddOrgMember(anchor);
      }
    } catch {
      this.mediaError.set('State committee member form could not be opened. Try again.');
    }
  }

  protected orgBreadcrumbs(): OrgBreadcrumb[] {
    const view = this.orgView();
    const crumbs: OrgBreadcrumb[] = [
      {
        label: 'Organisation Sections',
        view: { kind: 'overview' },
        current: view.kind === 'overview',
      },
    ];

    if (view.kind === 'overview') {
      return crumbs;
    }

    crumbs.push({
      label: this.orgSectionTitle(view.section),
      view: { kind: 'section', section: view.section },
      current: view.kind === 'section',
    });

    if (view.kind === 'node' || view.kind === 'members') {
      const node = this.orgNodeById(view.nodeId);

      if (node) {
        crumbs.push({
          label: node.title,
          view: { kind: 'node', section: view.section, nodeId: node.id },
          current: view.kind === 'node',
        });
      }
    }

    if (view.kind === 'members') {
      crumbs.push({
        label: 'Members',
        view,
        current: true,
      });
    }

    return crumbs;
  }

  protected followOrgBreadcrumb(crumb: OrgBreadcrumb) {
    this.closeOrgModal();
    this.resetOrgMemberBrowser();
    this.orgView.set({ ...crumb.view });
  }

  protected currentOrgSection(): OrgQuickSection | null {
    const view = this.orgView();
    return view.kind === 'overview' ? null : view.section;
  }

  protected currentOrgNode(): AdminOrgNode | null {
    const view = this.orgView();

    if (view.kind !== 'node' && view.kind !== 'members') {
      return null;
    }

    return this.orgNodeById(view.nodeId);
  }

  protected orgSectionTitle(section: OrgQuickSection): string {
    return this.orgSectionCards.find((item) => item.key === section)?.title || 'Organisation Section';
  }

  protected orgSectionDescription(section: OrgQuickSection): string {
    return this.orgSectionCards.find((item) => item.key === section)?.description || '';
  }

  protected orgSectionAnchor(section: OrgQuickSection): AdminOrgNode | null {
    return this.findSectionAnchor(section);
  }

  protected orgSectionCount(section: OrgQuickSection): number {
    if (section === 'state') {
      return this.orgStateRootNodes().length;
    }

    return this.orgSimpleSectionMembers(section).length;
  }

  protected orgSectionCountLabel(section: OrgQuickSection): string {
    const count = this.orgSectionCount(section);
    if (section === 'president') {
      return `${count} ${count === 1 ? 'president' : 'presidents'}`;
    }

    return section === 'state'
      ? `${count} ${count === 1 ? 'state' : 'states'}`
      : `${count} ${count === 1 ? 'member' : 'members'}`;
  }

  protected orgSectionEmptyText(section: OrgQuickSection): string {
    if (section === 'state') {
      return 'No state committee hierarchy has been added yet.';
    }

    if (section === 'president') {
      return 'No president profile has been added yet.';
    }

    return `No ${this.orgSectionTitle(section).toLowerCase()} members have been added yet.`;
  }

  protected orgSectionMembers(section: OrgQuickSection): AdminOrgNode[] {
    if (section === 'state') {
      return [];
    }

    return this.orgSimpleSectionMembers(section);
  }

  protected orgStateRootNodes(): AdminOrgNode[] {
    const anchor = this.findStateCommitteeAnchor();

    if (!anchor) {
      return [];
    }

    return this.orgNavigableChildNodes(anchor);
  }

  protected orgStateSectionAnchor(): AdminOrgNode | null {
    return this.findStateCommitteeAnchor();
  }

  protected orgDirectMembers(node: AdminOrgNode): AdminOrgNode[] {
    return this.orgDirectChildNodes(node).filter((child) => this.isDirectOrgMemberNode(node, child));
  }

  protected orgDirectMemberPreview(node: AdminOrgNode, limit = 3): AdminOrgNode[] {
    return this.orgDirectMembers(node).slice(0, limit);
  }

  protected orgRemainingDirectMemberCount(node: AdminOrgNode, limit = 3): number {
    return Math.max(this.orgDirectMembers(node).length - limit, 0);
  }

  protected orgNavigableChildNodes(node: AdminOrgNode): AdminOrgNode[] {
    return this.orgDirectChildNodes(node).filter((child) =>
      !this.isDirectOrgMemberNode(node, child)
      && !this.isLinkedOrgSectionChild(node, child)
    );
  }

  protected orgLinkedChildSections(node: AdminOrgNode): AdminOrgNode[] {
    return this.orgDirectChildNodes(node).filter((child) => this.isLinkedOrgSectionChild(node, child));
  }

  protected orgHasDirectMembers(node: AdminOrgNode): boolean {
    return this.orgDirectMembers(node).length > 0;
  }

  protected orgNodeSummary(node: AdminOrgNode): string {
    if (node.description) {
      return node.description;
    }

    if (node.subtitle && node.subtitle !== node.title) {
      return node.subtitle;
    }

    const childCount = this.orgNavigableChildNodes(node).length;
    const memberCount = this.orgDirectMembers(node).length;
    const linkedCount = this.orgLinkedChildSections(node).length;

    if (childCount > 0 && memberCount > 0) {
      return `${childCount} child levels and ${memberCount} same-level members are available from this page.`;
    }

    if (childCount > 0) {
      return 'Open this branch to continue level by level.';
    }

    if (memberCount > 0) {
      return 'Same-level members are available on a separate members page.';
    }

    if (linkedCount > 0) {
      return 'Linked organisation members are available under this branch.';
    }

    return 'No child levels or members are configured under this branch yet.';
  }

  protected orgNodeStats(node: AdminOrgNode): string {
    const childCount = this.orgNavigableChildNodes(node).length;
    const memberCount = this.orgDirectMembers(node).length;

    if (childCount > 0 && memberCount > 0) {
      return `${childCount} child levels · ${memberCount} members`;
    }

    if (childCount > 0) {
      return `${childCount} child level${childCount === 1 ? '' : 's'}`;
    }

    if (memberCount > 0) {
      return `${memberCount} member${memberCount === 1 ? '' : 's'}`;
    }

    return `${this.orgLinkedChildSections(node).length} linked section${this.orgLinkedChildSections(node).length === 1 ? '' : 's'}`;
  }

  protected orgMemberName(node: AdminOrgNode): string {
    return node.subtitle || node.title || 'Member';
  }

  protected orgMemberTitle(node: AdminOrgNode): string | null {
    const title = String(node.title || '').trim();

    if (!title || title.toLowerCase() === 'member' || title === node.subtitle) {
      return null;
    }

    return title;
  }

  protected orgMemberSummary(node: AdminOrgNode): string {
    if (node.description) {
      return node.description;
    }

    const designation = this.orgMemberTitle(node);

    if (designation) {
      return designation;
    }

    const parent = this.orgNodeById(node.parentId);

    if (parent) {
      return `Member under ${parent.title}`;
    }

    return 'Organisation member';
  }

  protected orgNodeLocation(node: AdminOrgNode): string {
    return [
      node.location.state,
      node.location.district,
      node.location.taluk,
    ].filter((value) => String(value || '').trim()).join(' / ');
  }

  protected orgNodeLevelBadge(node: AdminOrgNode): string {
    if (this.isTalukCommitteeContainerNode(node)) {
      return TALUK_COMMITTEE_TITLE;
    }

    if (node.level === 'city') {
      return CITY_GBA_LEVEL_TITLE;
    }

    return this.orgLevelLabel(node.level);
  }

  protected orgEditHeading(): string {
    const node = this.orgNodeById(this.editingOrgNodeId());

    if (!node) {
      return 'Edit Organisation Item';
    }

    if (this.isStructuralHierarchyEntry(this.editOrgNode)) {
      return `Edit ${this.structuralHierarchyLabel(this.editOrgNode)}`;
    }

    if (this.isHierarchyMemberForm(this.editOrgNode)) {
      return `Edit ${this.structuralHierarchyLabel(this.editOrgNode)} Member`;
    }

    return `Edit ${node.subtitle || node.title}`;
  }

  protected orgEditSubtitle(): string {
    const node = this.orgNodeById(this.editingOrgNodeId());

    if (!node) {
      return 'Update the selected organisation item.';
    }

    return `Editing ${this.orgNodePath(node)}. Parent and hierarchy rules will stay validated in this popup.`;
  }

  private orgSectionKeyForNode(node: AdminOrgNode): OrgQuickSection {
    const root = this.orgSectionRoot(node);
    const label = this.normalizeOrgSearchText(root.sidebarLabel);

    if (label === this.normalizeOrgSearchText('president-office')) {
      return 'president';
    }

    if (label === this.normalizeOrgSearchText('office-bearer')) {
      return 'office-bearer';
    }

    if (label === this.normalizeOrgSearchText('working-committee')) {
      return 'working';
    }

    if (label === this.normalizeOrgSearchText('representative-general-body')) {
      return 'representative';
    }

    if (label === this.normalizeOrgSearchText('nominated-body')) {
      return 'nominated';
    }

    return 'state';
  }

  private orgSortedNodes(nodes: AdminOrgNode[]): AdminOrgNode[] {
    return [...nodes].sort((a, b) =>
      a.order - b.order
      || a.title.localeCompare(b.title)
      || a.subtitle.localeCompare(b.subtitle)
    );
  }

  private orgDirectChildNodes(parent: AdminOrgNode | null | undefined): AdminOrgNode[] {
    if (!parent) {
      return [];
    }

    return this.orgChildrenByParentId().get(parent.id) ?? [];
  }

  private orgSubtreeNodes(root: AdminOrgNode | null | undefined): AdminOrgNode[] {
    if (!root) {
      return [];
    }

    const ordered: AdminOrgNode[] = [];
    const visit = (parent: AdminOrgNode) => {
      for (const child of this.orgDirectChildNodes(parent)) {
        ordered.push(child);
        visit(child);
      }
    };

    visit(root);
    return ordered;
  }

  private orgSimpleSectionMembers(section: OrgQuickSection): AdminOrgNode[] {
    const anchor = this.orgSectionAnchor(section);

    if (!anchor) {
      return [];
    }

    return this.orgSubtreeNodes(anchor);
  }

  private orgSharesLocation(left: AdminOrgNode, right: AdminOrgNode): boolean {
    return left.location.state === right.location.state
      && left.location.district === right.location.district
      && left.location.taluk === right.location.taluk;
  }

  private isLinkedOrgSectionChild(parent: AdminOrgNode, child: AdminOrgNode): boolean {
    return !this.isSimpleOrgSectionLabel(parent.sidebarLabel)
      && this.isSimpleOrgSectionLabel(child.sidebarLabel);
  }

  private isDirectOrgMemberNode(parent: AdminOrgNode, child: AdminOrgNode): boolean {
    if (this.isSimpleOrgSectionLabel(parent.sidebarLabel)) {
      return true;
    }

    if (this.isLinkedOrgSectionChild(parent, child)) {
      return false;
    }

    if (this.isTalukCommitteeContainerNode(child) || this.isStateCommitteeContainer(child)) {
      return false;
    }

    if (this.isTalukCommitteeMemberNode(child) || this.isStateCommitteeMemberNode(child)) {
      return true;
    }

    if (this.isStateCommitteeContainer(parent)) {
      return false;
    }

    return parent.level === child.level && this.orgSharesLocation(parent, child);
  }

  orgNodesForDisplay() {
    const nodes = [...this.orgNodeItems()].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    const childrenByParent = new Map<string | null, AdminOrgNode[]>();

    for (const node of nodes) {
      const children = childrenByParent.get(node.parentId) ?? [];
      children.push(node);
      childrenByParent.set(node.parentId, children);
    }

    const ordered: Array<{ node: AdminOrgNode; depth: number }> = [];
    const visit = (parentId: string | null, depth: number) => {
      for (const child of childrenByParent.get(parentId) ?? []) {
        ordered.push({ node: child, depth });
        visit(child.id, depth + 1);
      }
    };

    visit(null, 0);
    return ordered;
  }

  startAddOrgNode(parent?: AdminOrgNode) {
    this.mediaError.set('');
    this.editingOrgNodeId.set(null);
    this.newOrgNode = this.emptyOrgNodeForm(parent?.id ?? null);
    this.newOrgNode.level = this.inferChildLevel(parent);

    if (parent) {
      this.newOrgNode.sidebarLabel = parent.level === 'taluk'
        ? TALUK_COMMITTEE_SECTION_LABEL
        : parent.sidebarLabel;
      this.newOrgNode.state = parent.location.state;
      this.newOrgNode.district = parent.level === 'state' ? '' : parent.location.district;
      this.newOrgNode.taluk = parent.level === 'taluk' ? parent.location.taluk : '';
    }

    this.newOrgNode = this.applyParentDefaults(this.newOrgNode);
    this.resetOrgMemberEntryArray();

    this.newOrgNodeImageFile = null;
    this.showOrgNodeAdd.set(true);
    this.scrollOrgAddFormIntoView();
  }

  startAddOrgMember(parent: AdminOrgNode) {
    this.mediaError.set('');
    this.editingOrgNodeId.set(null);
    this.newOrgNode = this.emptyOrgNodeForm(parent.id);
    this.newOrgNode.sidebarLabel = this.isTalukCommitteeContainerNode(parent)
      ? TALUK_COMMITTEE_MEMBER_LABEL
      : this.isStateCommitteeNode(parent)
        ? STATE_COMMITTEE_MEMBER_LABEL
        : parent.sidebarLabel;
    this.newOrgNode.level = parent.level;
    this.newOrgNode.state = parent.location.state;
    this.newOrgNode.district = parent.location.district;
    this.newOrgNode.taluk = parent.location.taluk;
    this.resetOrgMemberEntryArray();
    this.newOrgNodeImageFile = null;
    this.showOrgNodeAdd.set(true);
    this.scrollOrgAddFormIntoView();
  }

  startQuickAddOrgNode(section: OrgQuickSection) {
    this.mediaError.set('');
    const anchor = this.findSectionAnchor(section);
    this.startAddOrgNode(anchor ?? undefined);
    this.applySectionDefaults(section);
    this.resetOrgMemberEntryArray();
  }

  setNewOrgSidebarLabel(value: string) {
    this.newOrgNode.sidebarLabel = value;
  }

  setEditOrgSidebarLabel(value: string) {
    this.editOrgNode.sidebarLabel = value;
  }

  cancelAddOrgNode() {
    this.newOrgNode = this.emptyOrgNodeForm();
    this.newOrgNodeImageFile = null;
    this.resetOrgMemberEntryArray();
    this.mediaError.set('');
    this.showOrgNodeAdd.set(false);
  }

  startEditOrgNode(node: AdminOrgNode) {
    this.mediaError.set('');
    this.showOrgNodeAdd.set(false);
    this.editOrgNode = {
      parentId: node.parentId,
      title: node.title,
      subtitle: node.subtitle,
      contact: String((node as AdminOrgNode & { contact?: string }).contact || ''),
      order: node.order,
      description: node.description,
      level: node.level,
      state: node.location.state,
      district: node.location.district,
      taluk: node.location.taluk,
      sidebarLabel: this.isStateCommitteeMemberNode(node)
        ? STATE_COMMITTEE_MEMBER_LABEL
        : node.sidebarLabel,
      imageUrl: node.imageUrl,
      imageAlt: node.imageAlt,
      isActive: node.isActive,
    };
    this.editOrgNode = this.applyParentDefaults(this.editOrgNode);
    this.editOrgNodeImageFile = null;
    this.editingOrgNodeId.set(node.id);
  }

  cancelEditOrgNode() {
    this.editOrgNode = this.emptyOrgNodeForm();
    this.editOrgNodeImageFile = null;
    this.mediaError.set('');
    this.editingOrgNodeId.set(null);
  }

  onNewOrgNodeImageSelected(event: Event) {
    this.newOrgNodeImageFile = this.fileFromEvent(event);
  }

  onEditOrgNodeImageSelected(event: Event) {
    this.editOrgNodeImageFile = this.fileFromEvent(event);
  }

  async addOrgNode() {
    if (this.usesOrgMemberFormArray(this.newOrgNode)) {
      this.orgMemberBatchForm.markAllAsTouched();
    }

    const normalizedForm = this.normalizeOrgFormForSave(this.newOrgNode);
    const validationError = this.usesOrgMemberFormArray(normalizedForm)
      ? this.orgMemberFormArrayValidationError(normalizedForm)
      : this.orgFormValidationError(normalizedForm);
    if (validationError) {
      this.mediaError.set(validationError);
      return;
    }

    await this.runMediaAction(async () => {
      let imageUrl = this.newOrgNode.imageUrl;
      let parentId = normalizedForm.parentId;
      const memberEntries = this.usesOrgMemberFormArray(normalizedForm)
        ? this.orgMemberEntryValues()
        : [{
            firstName: normalizedForm.subtitle,
            designation: normalizedForm.title,
            contact: String(normalizedForm.contact || '').trim(),
            description: normalizedForm.description,
            imageAlt: normalizedForm.imageAlt,
          }];

      if (!this.usesOrgMemberFormArray(normalizedForm) && this.newOrgNodeImageFile) {
        imageUrl = await this.data.uploadOrgMemberImage(this.newOrgNodeImageFile);
      }

      if (this.isSimpleOrgSection(normalizedForm)) {
        const anchor = await this.ensureSimpleSectionAnchor(normalizedForm.sidebarLabel);
        parentId = anchor?.id ?? parentId;
      } else if (this.isStateHierarchyEntry(normalizedForm) && !parentId) {
        const anchor = await this.ensureStateCommitteeAnchor();
        parentId = anchor?.id ?? parentId;
      }

      for (const [index, entry] of memberEntries.entries()) {
        const memberForm = this.usesOrgMemberFormArray(normalizedForm)
          ? this.normalizeOrgFormForSave({
              ...normalizedForm,
              parentId,
              title: entry.designation,
              subtitle: entry.firstName,
              order: normalizedForm.order > 0 ? normalizedForm.order + index : normalizedForm.order,
            })
          : normalizedForm;
        const memberImageUrl = this.usesOrgMemberFormArray(normalizedForm)
          ? (this.orgMemberEntryFiles[index] ? await this.data.uploadOrgMemberImage(this.orgMemberEntryFiles[index] as File) : '')
          : imageUrl;

        await this.data.addOrgNode({
          parentId,
          title: memberForm.title,
          subtitle: memberForm.subtitle,
          contact: this.usesOrgMemberFormArray(normalizedForm)
            ? entry.contact
            : String(memberForm.contact || '').trim(),
          order: memberForm.order,
          description: this.usesOrgMemberFormArray(normalizedForm)
            ? entry.description
            : memberForm.description,
          level: memberForm.level,
          location: {
            state: memberForm.state,
            district: memberForm.district,
            taluk: memberForm.taluk,
          },
          sidebarLabel: memberForm.sidebarLabel,
          imageUrl: memberImageUrl,
          imageAlt: this.usesOrgMemberFormArray(normalizedForm)
            ? entry.imageAlt
            : memberForm.imageAlt,
          isActive: memberForm.isActive,
        });
      }

      this.cancelAddOrgNode();
    }, 'Organization member create failed. Check required hierarchy fields and try again.');
  }

  async saveOrgNode(id: string) {
    const normalizedForm = this.normalizeOrgFormForSave(this.editOrgNode);
    const validationError = this.orgFormValidationError(normalizedForm);
    if (validationError) {
      this.mediaError.set(validationError);
      return;
    }

    await this.runMediaAction(async () => {
      let imageUrl = this.editOrgNode.imageUrl;
      let parentId = normalizedForm.parentId;

      if (this.editOrgNodeImageFile) {
        imageUrl = await this.data.uploadOrgMemberImage(this.editOrgNodeImageFile);
      }

      if (this.isStateHierarchyEntry(normalizedForm) && !parentId) {
        const normalizedTitle = this.normalizeOrgSearchText(normalizedForm.title);

        if (normalizedTitle !== this.normalizeOrgSearchText('State Committee')) {
          const anchor = await this.ensureStateCommitteeAnchor();
          parentId = anchor?.id ?? parentId;
        }
      }

      await this.data.updateOrgNode(id, {
        parentId,
        title: normalizedForm.title,
        subtitle: normalizedForm.subtitle,
        contact: String(normalizedForm.contact || '').trim(),
        order: normalizedForm.order,
        description: normalizedForm.description,
        level: normalizedForm.level,
        location: {
          state: normalizedForm.state,
          district: normalizedForm.district,
          taluk: normalizedForm.taluk,
        },
        sidebarLabel: normalizedForm.sidebarLabel,
        imageUrl,
        imageAlt: normalizedForm.imageAlt,
        isActive: normalizedForm.isActive,
      });
      this.cancelEditOrgNode();
    }, 'Organization member update failed. Check hierarchy fields and try again.');
  }

  async deleteOrgNode(id: string) {
    if (!confirm('Delete this organisation item? Delete child items first if present.')) return;

    const deletedNode = this.orgNodeById(id);

    await this.runMediaAction(async () => {
      await this.data.deleteOrgNode(id);

      const view = this.orgView();

      if (deletedNode && (view.kind === 'node' || view.kind === 'members') && view.nodeId === id) {
        const parent = this.orgNodeById(deletedNode.parentId);

        if (parent) {
          this.openOrgNodePage(parent);
        } else {
          this.openOrgSection(this.orgSectionKeyForNode(deletedNode));
        }
      }
    }, 'Organization member delete failed. Delete child members first and retry.');
  }

  private createOrgMemberEntryGroup(value?: Partial<OrgMemberEntryForm>): FormGroup {
    return this.formBuilder.group({
      firstName: [String(value?.firstName || '').trim(), Validators.required],
      designation: [String(value?.designation || '').trim(), Validators.required],
      contact: [String(value?.contact || '').trim()],
      description: [String(value?.description || '').trim()],
      imageAlt: [String(value?.imageAlt || '').trim()],
    });
  }

  private orgMemberEntryValues(): OrgMemberEntryForm[] {
    return this.orgMemberEntryControls.map((group) => ({
      firstName: String(group.get('firstName')?.value || '').trim(),
      designation: String(group.get('designation')?.value || '').trim(),
      contact: String(group.get('contact')?.value || '').trim(),
      description: String(group.get('description')?.value || '').trim(),
      imageAlt: String(group.get('imageAlt')?.value || '').trim(),
    }));
  }

  private orgMemberEntryFromForm(form: OrgNodeForm): OrgMemberEntryForm {
    return {
      firstName: String(form.subtitle || '').trim(),
      designation: String(form.title || '').trim(),
      contact: String(form.contact || '').trim(),
      description: String(form.description || '').trim(),
      imageAlt: String(form.imageAlt || '').trim(),
    };
  }

  private resetOrgMemberEntryArray(entries: OrgMemberEntryForm[] = [this.orgMemberEntryFromForm(this.newOrgNode)]): void {
    const nextEntries = entries.length ? entries : [this.orgMemberEntryFromForm(this.newOrgNode)];

    while (this.orgMemberEntries.length) {
      this.orgMemberEntries.removeAt(0);
    }

    for (const entry of nextEntries) {
      this.orgMemberEntries.push(this.createOrgMemberEntryGroup(entry));
    }

    this.orgMemberEntryFiles = new Array(nextEntries.length).fill(null);

    this.orgMemberBatchForm.markAsPristine();
    this.orgMemberBatchForm.markAsUntouched();
  }

  private orgMemberFormArrayValidationError(form: OrgNodeForm): string | null {
    const entries = this.orgMemberEntryValues();

    if (!entries.length) {
      return 'Add at least one member.';
    }

    for (const [index, entry] of entries.entries()) {
      if (!entry.firstName) {
        return `Member ${index + 1}: First name is required.`;
      }

      if (!entry.designation) {
        return `Member ${index + 1}: Designation is required.`;
      }

      const candidate = this.normalizeOrgFormForSave({
        ...form,
        title: entry.designation,
        subtitle: entry.firstName,
        order: form.order > 0 ? form.order + index : form.order,
      });
      const error = this.orgFormValidationError(candidate);

      if (error) {
        return `Member ${index + 1}: ${error
          .replace('Title is required.', 'Designation is required.')
          .replace('Member name is required.', 'First name is required.')}`;
      }
    }

    return null;
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
      this.goToHostelPage(this.hostelTotalPages());
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
    this.adminActionsMenuOpen.set(false);
    this.auth.logout();
    try {
      localStorage.removeItem(ADMIN_ACTIVE_TAB_STORAGE_KEY);
      localStorage.removeItem(ADMIN_ORG_VIEW_STORAGE_KEY);
    } catch {
      // Ignore localStorage cleanup failures.
    }
    this.router.navigate(['/']);
  }
}

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { FooterComponent } from '../../components/footer/footer.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { AdminDataService } from '../../services/admin-data.service';
import { clampPage, paginateItems } from '../../utils/pagination';
import {
  buildOrgTree,
  buildOrgTreeIndex,
  findOrgParent,
  findOrgSectionRoot,
  orgBranchUsesCityLevel,
  getOrgDirectMembers,
  getOrgLinkedSectionChildren,
  getOrgNavigableChildren,
  isSameOrgLabel,
  isStateCommitteeSectionLabel,
  isTalukCommitteeContainerNode,
  OrgTreeNode
} from '../../utils/org-structure';

@Component({
  selector: 'app-org-node-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './org-node-detail.component.html',
  styleUrl: './org-node-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgNodeDetailComponent {
  private readonly data = inject(AdminDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly childPageSize = 24;
  private readonly branchUsesCityLevel = (node: Pick<OrgTreeNode, 'title' | 'subtitle' | 'location'> | null | undefined) =>
    orgBranchUsesCityLevel(node);
  private readonly normalized = (value: string) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  private readonly tree = computed(() => buildOrgTree(this.data.orgNodes()));
  private readonly treeIndex = computed(() => buildOrgTreeIndex(this.tree()));
  private readonly nodeId = toSignal(
    this.route.paramMap.pipe(map((params) => {
      const value = String(params.get('nodeId') || '').trim();
      return value || null;
    })),
    {
      initialValue: String(this.route.snapshot.paramMap.get('nodeId') || '').trim() || null,
    }
  );
  protected readonly childPage = signal<number>(1);
  protected readonly childSearchTerm = signal<string>('');

  protected readonly node = computed(() => {
    const nodeId = this.nodeId();

    if (!nodeId) {
      return null;
    }

    return this.treeIndex().nodesById.get(nodeId) ?? null;
  });

  protected readonly parentNode = computed(() => {
    const node = this.node();

    if (!node) {
      return null;
    }

    return findOrgParent(node, this.treeIndex().flatNodes);
  });

  protected readonly sectionRoot = computed(() => findOrgSectionRoot(this.node(), this.treeIndex().flatNodes));

  protected readonly childUnits = computed(() => {
    const node = this.node();

    if (!node) {
      return [] as OrgTreeNode[];
    }

    return getOrgNavigableChildren(node, this.treeIndex().flatNodes);
  });
  protected readonly filteredChildUnits = computed(() => {
    const query = this.normalized(this.childSearchTerm());

    if (!query) {
      return this.childUnits();
    }

    return this.childUnits().filter((child) => this.matchesNodeSearch(child, query));
  });
  protected readonly paginatedChildUnits = computed(() =>
    paginateItems(this.filteredChildUnits(), this.childPage(), this.childPageSize)
  );

  protected readonly memberNodes = computed(() => {
    const node = this.node();

    if (!node) {
      return [] as OrgTreeNode[];
    }

    return getOrgDirectMembers(node, this.treeIndex().flatNodes);
  });

  protected readonly linkedSectionNodes = computed(() => {
    const node = this.node();

    if (!node) {
      return [] as OrgTreeNode[];
    }

    return getOrgLinkedSectionChildren(node);
  });

  protected readonly introText = computed(() => {
    const node = this.node();

    if (!node) {
      return '';
    }

    if (node.description) {
      return node.description;
    }

    const branchCount = this.childUnits().length;
    const memberCount = this.memberNodes().length;

    if (branchCount > 0) {
      return `Open the next level branches available under ${node.title}.`;
    }

    if (memberCount > 0) {
      return `This level has ${memberCount} member${memberCount === 1 ? '' : 's'} on a separate page.`;
    }

    if (node.subtitle) {
      return node.subtitle;
    }

    return `${node.title} is currently available in the organisation structure.`;
  });

  protected readonly statCards = computed(() => {
    const node = this.node();

    if (!node) {
      return [] as Array<{ label: string; value: string }>;
    }

    return [
      { label: 'Next Level Units', value: String(this.paginatedChildUnits().total) },
      { label: 'Members', value: String(this.memberNodes().length) },
      { label: 'Nested Entries', value: String(this.treeIndex().descendantCountById.get(node.id) ?? 0) },
    ];
  });

  protected readonly backLink = computed(() => {
    const parent = this.parentNode();

    if (parent) {
      return ['/organisation/node', parent.id];
    }

    return this.sectionRoute(this.sectionRoot());
  });

  protected readonly backLabel = computed(() => {
    const parent = this.parentNode();

    if (parent) {
      return `Back to ${parent.title}`;
    }

    return `Back to ${this.sectionRoot()?.title || 'Organisation'}`;
  });

  protected readonly sectionLink = computed(() => this.sectionRoute(this.sectionRoot()));
  protected readonly sectionLinkQueryParams = computed(() => this.sectionRouteQueryParams(this.node(), this.sectionRoot()));
  protected readonly currentLocation = computed(() => this.locationLabel(this.node()));

  constructor() {
    effect(() => {
      this.nodeId();

      untracked(() => {
        this.childPage.set(1);
      });
    });

    effect(() => {
      const nextPage = clampPage(this.childPage(), this.filteredChildUnits().length, this.childPageSize);

      if (nextPage === this.childPage()) {
        return;
      }

      untracked(() => {
        this.childPage.set(nextPage);
      });
    });

    effect(() => {
      this.childSearchTerm();

      untracked(() => {
        this.childPage.set(1);
      });
    });
  }

  protected readonly leafName = computed(() => {
    const node = this.node();
    return node ? (node.subtitle || node.title) : '';
  });

  protected readonly leafDesignation = computed(() => {
    const node = this.node();

    if (!node) {
      return null;
    }

    const title = String(node.title || '').trim();

    if (!title || title === node.subtitle) {
      return null;
    }

    return title;
  });

  protected readonly leafDescription = computed(() => {
    const node = this.node();

    if (!node) {
      return '';
    }

    if (node.description) {
      return node.description;
    }

    if (this.leafDesignation()) {
      return `${this.leafDesignation()} entry under ${node.path.slice(0, -1).join(' / ') || 'the selected organisation branch'}.`;
    }

    return `No lower-level branches or members are configured under ${node.title} yet.`;
  });

  protected readonly hasNominatedBody = computed(() =>
    this.linkedSectionNodes().some((node) => isSameOrgLabel(node.sidebarLabel, 'nominated-body'))
  );

  protected nodeBadge(node: OrgTreeNode | null): string {
    if (!node) {
      return 'Organisation';
    }

    if (isTalukCommitteeContainerNode(node)) {
      return 'CMC/GP / Assembly';
    }

    if (node.level === 'city') {
      return this.branchUsesCityLevel(node) ? 'City / GBA Level' : 'Corporation Level';
    }

    return `${this.titleCase(node.level)} Level`;
  }

  protected nodeSummary(node: OrgTreeNode): string {
    if (node.description) {
      return node.description;
    }

    if (node.subtitle) {
      return node.subtitle;
    }

    const childCount = getOrgNavigableChildren(node, this.treeIndex().flatNodes).length;
    const memberCount = getOrgDirectMembers(node, this.treeIndex().flatNodes).length;

    if (childCount > 0 && memberCount > 0) {
      return `${childCount} next-level units and ${memberCount} member${memberCount === 1 ? '' : 's'} are available under this branch.`;
    }

    if (childCount > 0) {
      return 'Open this branch to continue to the next level.';
    }

    if (memberCount > 0) {
      return 'Same-level members are available on a separate page.';
    }

    if (this.hasChildNominatedBody(node)) {
      return 'This branch has a linked nominated body page.';
    }

    return 'No lower-level entries are available under this branch yet.';
  }

  protected nodeContact(node: OrgTreeNode | null): string {
    return String((node as (OrgTreeNode & { contact?: string }) | null)?.contact || '').trim();
  }

  protected locationLabel(node: OrgTreeNode | null): string {
    if (!node) {
      return '';
    }

    return [
      node.location.state,
      node.location.district,
      node.location.taluk,
    ].filter((value) => String(value || '').trim()).join(' / ');
  }

  protected childStats(node: OrgTreeNode): string {
    const childCount = getOrgNavigableChildren(node, this.treeIndex().flatNodes).length;
    const memberCount = getOrgDirectMembers(node, this.treeIndex().flatNodes).length;

    if (childCount > 0 && memberCount > 0) {
      return `${childCount} units · ${memberCount} members`;
    }

    if (childCount > 0) {
      return `${childCount} unit${childCount === 1 ? '' : 's'}`;
    }

    if (memberCount > 0) {
      return `${memberCount} member${memberCount === 1 ? '' : 's'}`;
    }

    if (this.hasChildNominatedBody(node)) {
      return 'Linked nominated body';
    }

    return 'No entries yet';
  }

  protected hasMembers(node: OrgTreeNode): boolean {
    return getOrgDirectMembers(node, this.treeIndex().flatNodes).length > 0;
  }

  protected hasChildNominatedBody(node: OrgTreeNode): boolean {
    return getOrgLinkedSectionChildren(node)
      .some((child) => isSameOrgLabel(child.sidebarLabel, 'nominated-body'));
  }

  protected goToChildPage(page: number): void {
    this.childPage.set(clampPage(page, this.filteredChildUnits().length, this.childPageSize));
  }

  protected updateChildSearch(value: string): void {
    this.childSearchTerm.set(value);
  }

  protected clearChildSearch(): void {
    this.childSearchTerm.set('');
  }

  private sectionRoute(node: OrgTreeNode | null): string[] {
    if (!node) {
      return ['/'];
    }

    if (isStateCommitteeSectionLabel(node.sidebarLabel)) {
      return ['/organisation/state-committee'];
    }

    if (isSameOrgLabel(node.sidebarLabel, 'office-bearer')) {
      return ['/organisation/office-bearers'];
    }

    if (isSameOrgLabel(node.sidebarLabel, 'working-committee')) {
      return ['/organisation/working-committee'];
    }

    if (isSameOrgLabel(node.sidebarLabel, 'representative-general-body')) {
      return ['/organisation/representative-general-body'];
    }

    if (isSameOrgLabel(node.sidebarLabel, 'nominated-body')) {
      return ['/organisation/nominated-body'];
    }

    return ['/'];
  }

  private sectionRouteQueryParams(
    currentNode: OrgTreeNode | null,
    sectionRoot: OrgTreeNode | null,
  ): Record<string, string> | undefined {
    if (!currentNode || !sectionRoot || !isStateCommitteeSectionLabel(sectionRoot.sidebarLabel)) {
      return undefined;
    }

    return { selected: currentNode.id };
  }

  private titleCase(value: string): string {
    return String(value || '')
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private matchesNodeSearch(node: OrgTreeNode, query: string): boolean {
    return this.normalized([
      node.title,
      node.subtitle,
      node.description,
      node.contact || '',
      node.location.state,
      node.location.district,
      node.location.taluk,
      node.path.join(' '),
    ].join(' ')).includes(query);
  }
}

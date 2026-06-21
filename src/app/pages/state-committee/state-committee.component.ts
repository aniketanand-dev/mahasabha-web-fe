import { CommonModule, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { FooterComponent } from '../../components/footer/footer.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { AdminDataService } from '../../services/admin-data.service';
import { clampPage, paginateItems } from '../../utils/pagination';
import {
  buildOrgTree,
  buildOrgTreeIndex,
  flattenOrgDescendants,
  getOrgDirectMembers,
  getOrgNavigableChildren,
  isOrgMemberChild,
  OrgTreeNode
} from '../../utils/org-structure';

@Component({
  selector: 'app-state-committee',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './state-committee.component.html',
  styleUrl: './state-committee.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StateCommitteeComponent {
  private readonly data = inject(AdminDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly detailPageSize = 48;
  private readonly treeBatchSize = 120;
  private readonly normalized = (value: string) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  private readonly isStateCommitteeMemberLabel = (value: string) =>
    this.normalized(value) === this.normalized('state-committee-member');
  private readonly matchesStateCommitteeStateBranchIdentity = (node: Pick<OrgTreeNode, 'title' | 'subtitle' | 'location'>) => {
    const normalizedState = this.normalized(String(node.location.state || ''));
    const normalizedTitle = this.normalized(String(node.title || ''));
    const normalizedSubtitle = this.normalized(String(node.subtitle || ''));

    return !!normalizedState
      && normalizedTitle === normalizedState
      && normalizedSubtitle === normalizedState;
  };

  private readonly tree = computed(() => buildOrgTree(this.data.orgNodes()));
  private readonly treeIndex = computed(() => buildOrgTreeIndex(this.tree()));

  private readonly isStateCommitteeSection = (node: OrgTreeNode) =>
    this.normalized(node.sidebarLabel) === this.normalized('state-committee');

  private readonly stateSectionRoot = (node: OrgTreeNode, nodesById: Map<string, OrgTreeNode>) => {
    let current = node;
    let matched: OrgTreeNode | null = this.isStateCommitteeSection(node) ? node : null;

    while (current.parentId) {
      const parent = nodesById.get(current.parentId);

      if (!parent) {
        break;
      }

      if (this.isStateCommitteeSection(parent)) {
        matched = parent;
      }

      current = parent;
    }

    return matched;
  };

  private readonly hasStateLevelAncestor = (node: OrgTreeNode, stopAtId: string, nodesById: Map<string, OrgTreeNode>) => {
    let parentId = node.parentId;

    while (parentId && parentId !== stopAtId) {
      const parent = nodesById.get(parentId);

      if (!parent) {
        break;
      }

      if (parent.level === 'state') {
        return true;
      }

      parentId = parent.parentId;
    }

    return false;
  };

  protected readonly stateRoots = computed(() => {
    const { flatNodes, nodesById } = this.treeIndex();

    return flatNodes.filter((node) => {
      if (node.level !== 'state') {
        return false;
      }

      const root = this.stateSectionRoot(node, nodesById);

      if (!root) {
        return false;
      }

      const isAnchorNode = node.id === root.id
        && this.normalized(node.title) === this.normalized('state committee')
        && node.children.length > 0;
      if (isAnchorNode) {
        return false;
      }

      if (this.isStateCommitteeMemberNode(node)) {
        return false;
      }

      return !this.hasStateLevelAncestor(node, root.id, nodesById);
    });
  });

  private readonly scopedNodes = computed(() => {
    const roots = this.stateRoots();
    return roots.flatMap((root) => [root, ...flattenOrgDescendants(root)]);
  });
  private readonly scopedNodesById = computed(() => new Map(this.scopedNodes().map((node) => [node.id, node] as const)));
  private readonly branchNodes = computed(() =>
    this.scopedNodes().filter((node) => this.isTreeBranchNode(node))
  );

  private readonly selectedQueryId = toSignal(
    this.route.queryParamMap.pipe(map(params => {
      const value = String(params.get('selected') || '').trim();
      return value || null;
    })),
    { initialValue: String(this.route.snapshot.queryParamMap.get('selected') || '').trim() || null }
  );

  protected readonly selectedNodeId = signal<string | null>(null);
  protected readonly expandedIds = signal<Set<string>>(new Set<string>());
  protected readonly branchVisibleCounts = signal<Record<string, number>>({});
  protected readonly detailPage = signal<number>(1);
  protected readonly treeSearchTerm = signal<string>('');
  protected readonly detailSearchTerm = signal<string>('');
  private readonly lastSyncedQueryId = signal<string | null>(null);
  private readonly lastPagedNodeId = signal<string | null>(null);

  protected readonly selectedNode = computed(() => {
    const roots = this.stateRoots();
    if (!roots.length) {
      return null;
    }

    const selectedNodeId = this.selectedNodeId() ?? this.selectedQueryId();
    const candidate = selectedNodeId ? this.scopedNodesById().get(selectedNodeId) ?? null : null;
    return (candidate ? this.resolveSelectedBranch(candidate) : null) ?? roots[0];
  });

  protected readonly selectedPathIds = computed(() => new Set(this.findPathIds(this.selectedNode()?.id ?? null)));
  protected readonly homeBackQueryParams = computed(() => {
    const selected = this.selectedNode();

    if (!selected) {
      return undefined;
    }

    const stateRootId = this.findPathIds(selected.id)[0] ?? selected.id;
    return { selectedState: stateRootId };
  });
  protected readonly navigatorCrumbs = computed(() => {
    const selected = this.selectedNode();

    if (!selected) {
      return [] as Array<{ id: string; label: string; current: boolean; node: OrgTreeNode }>;
    }

      const pathIds = this.findPathIds(selected.id);
      const nodesById = this.scopedNodesById();

    return pathIds
      .map((id, index) => {
        const node = nodesById.get(id);

        if (!node) {
          return null;
        }

        return {
          id,
          label: this.nodeLabel(node),
          current: index === pathIds.length - 1,
          node,
        };
      })
      .filter((crumb): crumb is { id: string; label: string; current: boolean; node: OrgTreeNode } => !!crumb);
  });
  protected readonly stateCount = computed(() => this.stateRoots().length);
  protected readonly treeSearchResults = computed(() => {
    const query = this.normalized(this.treeSearchTerm());

    if (!query) {
      return [] as OrgTreeNode[];
    }

    return this.branchNodes()
      .filter((node) => this.matchesNodeSearch(node, query))
      .slice(0, 30);
  });
  protected readonly memberCards = computed(() => {
    const selected = this.selectedNode();

    if (!selected) {
      return [] as OrgTreeNode[];
    }

    return getOrgDirectMembers(selected, this.treeIndex().flatNodes);
  });
  protected readonly filteredMemberCards = computed(() => {
    const query = this.normalized(this.detailSearchTerm());

    if (!query) {
      return this.memberCards();
    }

    return this.memberCards().filter((node) => this.matchesNodeSearch(node, query));
  });
  protected readonly paginatedMemberCards = computed(() =>
    paginateItems(this.filteredMemberCards(), this.detailPage(), this.detailPageSize)
  );
  protected readonly statCards = computed(() => {
    const selectedNode = this.selectedNode();

    if (!selectedNode) {
      return [] as Array<{ label: string; value: string }>;
    }

    const nestedCount = this.treeIndex().descendantCountById.get(selectedNode.id) ?? 0;
    const directUnits = this.treeChildren(selectedNode).length;
    const directMembers = this.memberCards().length;

    return [
      { label: 'Members', value: String(directMembers) },
      { label: 'Direct Units', value: String(directUnits) },
      { label: 'Nested Entries', value: String(nestedCount) },
      { label: 'Level', value: this.nodeKind(selectedNode) },
    ];
  });

  constructor() {
    // Sync query-param ?selected=id → selectedNodeId
    effect(() => {
      const selectedQueryId = this.selectedQueryId();
      if (this.lastSyncedQueryId() !== selectedQueryId) {
        this.selectedNodeId.set(selectedQueryId);
        this.lastSyncedQueryId.set(selectedQueryId);
      }
    });

    // Keep the selected node in the URL so refresh restores the same level.
    effect(() => {
      const selected = this.selectedNode();
      const selectedQueryId = this.selectedQueryId();

      if (!selected || selectedQueryId === selected.id) {
        return;
      }

      untracked(() => {
        const urlTree = this.router.createUrlTree([], {
          relativeTo: this.route,
          queryParams: { selected: selected.id },
          queryParamsHandling: 'merge',
        });
        this.location.replaceState(this.router.serializeUrl(urlTree));
      });
    });

    // Auto-expand state root nodes when data first loads.
    // expandedIds is read/written via untracked so it is NOT a reactive
    // dependency of this effect — user collapses are never overridden.
    effect(() => {
      const roots = this.stateRoots(); // reactive: re-runs when roots change
      if (!roots.length) return;

      untracked(() => {
        const current = this.expandedIds();
        const next = new Set(current);
        let changed = false;
        for (const stateNode of roots) {
          if (!next.has(stateNode.id)) {
            next.add(stateNode.id);
            changed = true;
          }
        }
        if (changed) this.expandedIds.set(next);
      });
    });

    // Ensure the selected path is visible after refresh or direct linking.
    effect(() => {
      const pathIds = this.findPathIds(this.selectedNode()?.id ?? null);
      if (!pathIds.length) return;
      const nodesById = this.scopedNodesById();

      untracked(() => {
        const current = this.expandedIds();
        const next = new Set(current);
        let expandedChanged = false;

        for (const pathId of pathIds) {
          if (!next.has(pathId)) {
            next.add(pathId);
            expandedChanged = true;
          }
        }

        if (expandedChanged) {
          this.expandedIds.set(next);
        }

        const currentVisibleCounts = this.branchVisibleCounts();
        const nextVisibleCounts = { ...currentVisibleCounts };
        let visibleCountsChanged = false;

        for (let index = 0; index < pathIds.length - 1; index += 1) {
          const parent = nodesById.get(pathIds[index]);
          const childId = pathIds[index + 1];

          if (!parent) {
            continue;
          }

          const childIndex = this.treeChildren(parent).findIndex((child) => child.id === childId);

          if (childIndex < 0) {
            continue;
          }

          const requiredCount = Math.max(this.treeBatchSize, childIndex + 1);
          const currentCount = nextVisibleCounts[parent.id] ?? this.treeBatchSize;

          if (currentCount < requiredCount) {
            nextVisibleCounts[parent.id] = requiredCount;
            visibleCountsChanged = true;
          }
        }

        if (visibleCountsChanged) {
          this.branchVisibleCounts.set(nextVisibleCounts);
        }
      });
    });

    effect(() => {
      const selectedNodeId = this.selectedNode()?.id ?? null;

      if (this.lastPagedNodeId() === selectedNodeId) {
        return;
      }

      untracked(() => {
        this.detailPage.set(1);
        this.lastPagedNodeId.set(selectedNodeId);
      });
    });

    effect(() => {
      const nextPage = clampPage(this.detailPage(), this.filteredMemberCards().length, this.detailPageSize);

      if (nextPage === this.detailPage()) {
        return;
      }

      untracked(() => {
        this.detailPage.set(nextPage);
      });
    });

    effect(() => {
      this.detailSearchTerm();

      untracked(() => {
        this.detailPage.set(1);
      });
    });
  }

  protected selectNode(node: OrgTreeNode): void {
    this.selectedNodeId.set(node.id);
  }

  protected followBreadcrumb(node: OrgTreeNode): void {
    this.selectNode(node);
  }

  protected visibleTreeChildren(node: OrgTreeNode): OrgTreeNode[] {
    const visibleCount = this.branchVisibleCounts()[node.id] ?? this.treeBatchSize;
    return this.treeChildren(node).slice(0, visibleCount);
  }

  protected hasTreeChildren(node: OrgTreeNode): boolean {
    return this.treeChildren(node).length > 0;
  }

  protected hasHiddenTreeChildren(node: OrgTreeNode): boolean {
    return this.visibleTreeChildren(node).length < this.treeChildren(node).length;
  }

  protected remainingTreeChildren(node: OrgTreeNode): number {
    return Math.max(0, this.treeChildren(node).length - this.visibleTreeChildren(node).length);
  }

  protected showMoreTreeChildren(node: OrgTreeNode): void {
    const currentVisibleCounts = this.branchVisibleCounts();
    const currentCount = currentVisibleCounts[node.id] ?? this.treeBatchSize;
    const totalChildren = this.treeChildren(node).length;

    this.branchVisibleCounts.set({
      ...currentVisibleCounts,
      [node.id]: Math.min(totalChildren, currentCount + this.treeBatchSize),
    });
  }

  protected goToDetailPage(page: number): void {
    this.detailPage.set(clampPage(page, this.filteredMemberCards().length, this.detailPageSize));
  }

  protected updateTreeSearch(value: string): void {
    this.treeSearchTerm.set(value);
  }

  protected clearTreeSearch(): void {
    this.treeSearchTerm.set('');
  }

  protected updateDetailSearch(value: string): void {
    this.detailSearchTerm.set(value);
  }

  protected clearDetailSearch(): void {
    this.detailSearchTerm.set('');
  }

  protected selectSearchResult(node: OrgTreeNode): void {
    this.treeSearchTerm.set('');
    this.selectNode(node);
  }

  /** Clicking a row selects the node AND toggles its children open/closed. */
  protected selectAndToggle(node: OrgTreeNode, event: Event): void {
    this.selectedNodeId.set(node.id);
    if (this.treeChildren(node).length) {
      const nextExpandedIds = new Set(this.expandedIds());
      if (nextExpandedIds.has(node.id)) {
        nextExpandedIds.delete(node.id);
      } else {
        nextExpandedIds.add(node.id);
      }
      this.expandedIds.set(nextExpandedIds);
    }
  }

  protected toggleNode(node: OrgTreeNode, event: Event): void {
    event.stopPropagation();

    const nextExpandedIds = new Set(this.expandedIds());

    if (nextExpandedIds.has(node.id)) {
      nextExpandedIds.delete(node.id);
    } else {
      nextExpandedIds.add(node.id);
    }

    this.expandedIds.set(nextExpandedIds);
  }

  // Uses only expandedIds so manual collapse works even when a node is selected.
  protected isExpanded(node: OrgTreeNode): boolean {
    return this.expandedIds().has(node.id);
  }

  private nodeParent(node: OrgTreeNode): OrgTreeNode | null {
    return this.treeIndex().parentById.get(node.id) ?? null;
  }

  private isStateCommitteeContainerNode(node: OrgTreeNode): boolean {
    return this.normalized(node.sidebarLabel) === this.normalized('state-committee')
      && this.normalized(node.title) === this.normalized('state committee')
      && node.level === 'state'
      && !node.location.district
      && !node.location.taluk;
  }

  private isStateCommitteeMemberNode(node: OrgTreeNode): boolean {
    if (
      (
        this.normalized(node.sidebarLabel) !== this.normalized('state-committee')
        && !this.isStateCommitteeMemberLabel(node.sidebarLabel)
      )
      || this.isStateCommitteeContainerNode(node)
    ) {
      return false;
    }

    const parent = this.nodeParent(node);

    if (!parent || this.normalized(parent.sidebarLabel) !== this.normalized('state-committee')) {
      return false;
    }

    if (parent.level !== node.level || parent.location.state !== node.location.state) {
      return false;
    }

    if (node.level === 'state') {
      if (node.location.district || node.location.taluk) {
        return false;
      }

      if (this.isStateCommitteeContainerNode(parent)) {
        return this.isStateCommitteeMemberLabel(node.sidebarLabel)
          || !this.matchesStateCommitteeStateBranchIdentity(node);
      }

      return true;
    }

    if (node.level === 'district' || node.level === 'city' || node.level === 'corporation' || node.level === 'assembly') {
      return parent.location.district === node.location.district && !node.location.taluk;
    }

    return parent.location.district === node.location.district
      && parent.location.taluk === node.location.taluk;
  }

  private isStructuralStateCommitteeNode(node: OrgTreeNode): boolean {
    return this.normalized(node.sidebarLabel) === this.normalized('state-committee')
      && !this.isStateCommitteeContainerNode(node)
      && !this.isStateCommitteeMemberNode(node);
  }

  private isLeafMemberNode(node: OrgTreeNode): boolean {
    if (node.children.length > 0) {
      return false;
    }

    if (this.isStructuralStateCommitteeNode(node) || this.normalized(node.sidebarLabel) === this.normalized('taluk-committee')) {
      return false;
    }

    return !!String(node.subtitle || '').trim() || !!String(node.imageUrl || '').trim();
  }

  protected nodeKind(node: OrgTreeNode): string {
    const title = node.title.toLowerCase();
    const sidebarLabel = this.normalized(node.sidebarLabel);

    if (sidebarLabel === this.normalized('taluk-committee')) {
      if (title.includes('cmc') || title.includes('tmc') || title.includes('gp')) {
        return 'CMC/TMC/GP';
      }

      return 'Local Unit';
    }

    if (sidebarLabel === this.normalized('taluk-committee-member')) {
      return 'Local Unit Member';
    }

    if (this.isStructuralStateCommitteeNode(node)) {
      if (node.level === 'state') {
        return 'State';
      }

      if (node.level === 'district') {
        return 'District';
      }

      if (node.level === 'city') {
        return 'City / GBA';
      }

      if (node.level === 'corporation') {
        return 'Corporation';
      }

      if (node.level === 'assembly') {
        return 'Assembly';
      }

      if (node.level === 'taluk') {
        return 'Taluk';
      }
    }

    if (this.isLeafMemberNode(node)) {
      return 'Member';
    }

    if (node.level === 'state') {
      return 'State';
    }

    if (node.level === 'district') {
      return 'District';
    }

    if (node.level === 'city') {
      return 'City / GBA';
    }

    if (node.level === 'corporation') {
      return 'Corporation';
    }

    if (node.level === 'assembly') {
      return 'Assembly';
    }

    if (node.level === 'taluk') {
      return 'Taluk';
    }

    if (title.includes('assembly')) {
      return 'Assembly';
    }

    if (title.includes('member') || title.startsWith('+')) {
      return 'Member';
    }

    return node.children.length ? 'Unit' : 'Member';
  }

  protected nodeLabel(node: OrgTreeNode): string {
    if (node.level === 'state') {
      return String(node.location.state || node.subtitle || node.title || '').trim() || 'State';
    }

    return String(node.title || node.subtitle || '').trim() || 'Unnamed Node';
  }

  protected nodeSummary(node: OrgTreeNode): string {
    if (node.subtitle) {
      return node.subtitle;
    }

    const childrenCount = this.treeChildren(node).length;
    const memberCount = getOrgDirectMembers(node, this.treeIndex().flatNodes).length;
    const descendantsCount = this.treeIndex().descendantCountById.get(node.id) ?? 0;

    if (!childrenCount && !memberCount) {
      return 'No child branches or members added yet';
    }

    if (!childrenCount) {
      return `${memberCount} direct member${memberCount === 1 ? '' : 's'}`;
    }

    if (descendantsCount > childrenCount) {
      return memberCount
        ? `${childrenCount} direct units · ${memberCount} members · ${descendantsCount} nested entries`
        : `${childrenCount} direct units · ${descendantsCount} nested entries`;
    }

    return memberCount
      ? `${childrenCount} direct units · ${memberCount} members`
      : `${childrenCount} direct units`;
  }

  protected nodeDescription(node: OrgTreeNode): string {
    const kind = this.nodeKind(node);

    if (kind === 'Member') {
      return node.description || node.subtitle || 'This is a member entry recorded under the selected branch.';
    }

    if (kind === 'State') {
      return `Inspect district branches, city / GBA branches, taluks, corporations, assemblies, and related members configured under ${this.nodeLabel(node)}.`;
    }

    if (kind === 'District') {
      return 'This district branch groups the district-level hierarchy available under the selected state.';
    }

    if (kind === 'City / GBA') {
      return 'Use this city / GBA node to review corporation branches, assemblies, and members added under it.';
    }

    if (kind === 'Taluk') {
      return 'Use this taluk node to review its CMC/TMC/GP branches and inspect taluk-level members.';
    }

    if (kind === 'Corporation') {
      return 'Use this corporation node to review the assembly branches and members configured under it.';
    }

    if (kind === 'CMC/TMC/GP' || kind === 'Local Unit') {
      return 'Use this local-unit branch to review its members and open their dedicated member view.';
    }

    if (kind === 'Local Unit Member') {
      return 'This local-unit member entry belongs to the selected taluk committee branch.';
    }

    if (kind === 'Assembly') {
      return 'This assembly node can open a focused member page for the selected assembly unit.';
    }

    return 'Select nested nodes from the tree or open a focused page for member details.';
  }

  protected nodeContact(node: OrgTreeNode): string {
    return String((node as OrgTreeNode & { contact?: string }).contact || '').trim();
  }

  protected showsNominatedAction(node: OrgTreeNode): boolean {
    const kind = this.nodeKind(node);
    return kind === 'State'
      || kind === 'District'
      || kind === 'City / GBA'
      || kind === 'Corporation'
      || kind === 'Taluk'
      || kind === 'Local Unit'
      || kind === 'Unit';
  }

  protected nodeDetailLink(node: OrgTreeNode): string[] {
    return ['/organisation/node', String(node.id)];
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
      node.sidebarLabel,
    ].join(' ')).includes(query);
  }

  private treeChildren(node: OrgTreeNode): OrgTreeNode[] {
    return getOrgNavigableChildren(node, this.treeIndex().flatNodes);
  }

  private isTreeBranchNode(node: OrgTreeNode): boolean {
    const parent = this.nodeParent(node);

    if (!parent) {
      return true;
    }

    return !isOrgMemberChild(parent, node, this.treeIndex().flatNodes);
  }

  private resolveSelectedBranch(node: OrgTreeNode): OrgTreeNode | null {
    let current: OrgTreeNode | null = node;

    while (current) {
      if (this.isTreeBranchNode(current)) {
        return current;
      }

      current = this.nodeParent(current);
    }

    return null;
  }

  private findPathIds(targetId: string | null): string[] {
    const roots = this.stateRoots();

    if (!targetId || !roots.length) {
      return [];
    }

    for (const root of roots) {
      const path = this.findPathIdsRecursive(root, targetId);

      if (path.length) {
        return path;
      }
    }

    return [];
  }

  private findPathIdsRecursive(node: OrgTreeNode, targetId: string): string[] {
    if (node.id === targetId) {
      return [node.id];
    }

    for (const child of node.children) {
      const childPath = this.findPathIdsRecursive(child, targetId);

      if (childPath.length) {
        return [node.id, ...childPath];
      }
    }

    return [];
  }
}

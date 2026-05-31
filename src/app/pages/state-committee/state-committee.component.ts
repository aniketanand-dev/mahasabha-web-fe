import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { FooterComponent } from '../../components/footer/footer.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { AdminDataService } from '../../services/admin-data.service';
import { buildOrgTree, flattenOrgDescendants, flattenOrgTree, OrgTreeNode } from '../../utils/org-structure';

@Component({
  selector: 'app-state-committee',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './state-committee.component.html',
  styleUrl: './state-committee.component.scss'
})
export class StateCommitteeComponent {
  private readonly data = inject(AdminDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly normalized = (value: string) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  private readonly tree = computed(() => buildOrgTree(this.data.orgNodes()));

  private readonly isStateCommitteeSection = (node: OrgTreeNode) =>
    this.normalized(node.sidebarLabel) === this.normalized('state-committee');

  private readonly sectionRoot = (node: OrgTreeNode, flatNodes: OrgTreeNode[]) => {
    let current = node;

    while (current.parentId) {
      const parent = flatNodes.find((candidate) => candidate.id === current.parentId);

      if (!parent) {
        break;
      }

      current = parent;
    }

    return current;
  };

  private readonly hasStateLevelAncestor = (node: OrgTreeNode, stopAtId: string, flatNodes: OrgTreeNode[]) => {
    let parentId = node.parentId;

    while (parentId && parentId !== stopAtId) {
      const parent = flatNodes.find((candidate) => candidate.id === parentId);

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
    const flatNodes = flattenOrgTree(this.tree());

    return flatNodes.filter((node) => {
      if (node.level !== 'state') {
        return false;
      }

      const root = this.sectionRoot(node, flatNodes);

      if (!this.isStateCommitteeSection(root)) {
        return false;
      }

      const isAnchorNode = node.id === root.id && node.children.length > 0;
      if (isAnchorNode) {
        return false;
      }

      return !this.hasStateLevelAncestor(node, root.id, flatNodes);
    });
  });

  private readonly scopedNodes = computed(() => {
    const roots = this.stateRoots();
    return roots.flatMap((root) => [root, ...flattenOrgDescendants(root)]);
  });

  private readonly selectedQueryId = toSignal(
    this.route.queryParamMap.pipe(map(params => {
      const value = String(params.get('selected') || '').trim();
      return value || null;
    })),
    { initialValue: String(this.route.snapshot.queryParamMap.get('selected') || '').trim() || null }
  );

  protected readonly selectedNodeId = signal<string | null>(null);
  protected readonly expandedIds = signal<Set<string>>(new Set<string>());
  private readonly lastSyncedQueryId = signal<string | null>(null);

  protected readonly selectedNode = computed(() => {
    const roots = this.stateRoots();
    if (!roots.length) {
      return null;
    }

    const selectedNodeId = this.selectedNodeId() ?? this.selectedQueryId();
    return this.scopedNodes().find(node => node.id === selectedNodeId) ?? roots[0];
  });

  protected readonly selectedPathIds = computed(() => new Set(this.findPathIds(this.selectedNode()?.id ?? null)));
  protected readonly stateCount = computed(() => this.stateRoots().length);
  protected readonly memberCards = computed(() => {
    const selected = this.selectedNode();

    if (!selected) {
      return [] as OrgTreeNode[];
    }

    return selected.children.length ? selected.children : [selected];
  });
  protected readonly statCards = computed(() => {
    const selectedNode = this.selectedNode();

    if (!selectedNode) {
      return [] as Array<{ label: string; value: string }>;
    }

    const nestedCount = flattenOrgDescendants(selectedNode).length;

    return [
      { label: 'Direct Units', value: String(selectedNode.children.length) },
      { label: 'Nested Entries', value: String(nestedCount) },
      { label: 'Level', value: `L${selectedNode.depth + 1}` },
    ];
  });

  constructor() {
    // Sync query-param ?selected=id → selectedNodeId
    effect(() => {
      const selectedQueryId = this.selectedQueryId();
      if (selectedQueryId && this.lastSyncedQueryId() !== selectedQueryId) {
        this.selectedNodeId.set(selectedQueryId);
        this.lastSyncedQueryId.set(selectedQueryId);
      }
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
  }

  protected selectNode(node: OrgTreeNode): void {
    this.selectedNodeId.set(node.id);
  }

  /** Clicking a row selects the node AND toggles its children open/closed. */
  protected selectAndToggle(node: OrgTreeNode, event: Event): void {
    this.selectedNodeId.set(node.id);
    if (node.children.length) {
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

  private isLeafMemberNode(node: OrgTreeNode): boolean {
    if (node.children.length > 0) {
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

      return 'Taluk Committee';
    }

    if (sidebarLabel === this.normalized('taluk-committee-member')) {
      return 'CMC/TMC/GP Member';
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

    if (node.level === 'taluk') {
      return 'Taluk';
    }

    if (title.includes('district')) {
      return 'District Cluster';
    }

    if (title.includes('taluk')) {
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

  protected nodeSummary(node: OrgTreeNode): string {
    if (node.subtitle) {
      return node.subtitle;
    }

    const childrenCount = node.children.length;
    const descendantsCount = flattenOrgDescendants(node).length;

    if (!childrenCount) {
      return 'Leaf member node';
    }

    if (descendantsCount > childrenCount) {
      return `${childrenCount} direct units · ${descendantsCount} nested entries`;
    }

    return `${childrenCount} direct units`;
  }

  protected nodeDescription(node: OrgTreeNode): string {
    const kind = this.nodeKind(node);

    if (kind === 'Member') {
      return node.description || node.subtitle || 'This is a member entry recorded under the selected branch.';
    }

    if (kind === 'State') {
      return `Inspect districts, taluks, assembly units, and related nominated bodies configured under ${node.title}.`;
    }

    if (kind === 'District Cluster') {
      return 'This district cluster groups the district-level branches available under the selected state.';
    }

    if (kind === 'Taluk') {
      return 'Use this taluk node to review the assembly units and open its dedicated member view.';
    }

    if (kind === 'CMC/TMC/GP' || kind === 'Taluk Committee') {
      return 'Use this taluk committee node to review its members and open their dedicated member view.';
    }

    if (kind === 'CMC/TMC/GP Member') {
      return 'This CMC/TMC/GP member entry belongs to the selected taluk committee branch.';
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
    return kind === 'State' || kind === 'District Cluster' || kind === 'Unit' || kind === 'CMC/TMC/GP';
  }

  protected nodeDetailLink(node: OrgTreeNode): string[] {
    return ['/organisation/node', String(node.id)];
  }

  private sameSet(nextValue: Set<string>, currentValue: Set<string>): boolean {
    if (nextValue.size !== currentValue.size) {
      return false;
    }

    for (const item of nextValue) {
      if (!currentValue.has(item)) {
        return false;
      }
    }

    return true;
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

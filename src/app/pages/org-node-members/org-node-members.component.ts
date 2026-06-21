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
  getOrgDirectMembers,
  isSameOrgLabel,
  isStateCommitteeSectionLabel,
  OrgTreeNode
} from '../../utils/org-structure';

@Component({
  selector: 'app-org-node-members',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './org-node-members.component.html',
  styleUrl: './org-node-members.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgNodeMembersComponent {
  private readonly data = inject(AdminDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly memberPageSize = 48;
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
  protected readonly memberPage = signal<number>(1);
  protected readonly memberSearchTerm = signal<string>('');

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

  protected readonly members = computed(() => {
    const node = this.node();

    if (!node) {
      return [] as OrgTreeNode[];
    }

    return getOrgDirectMembers(node, this.treeIndex().flatNodes);
  });
  protected readonly filteredMembers = computed(() => {
    const query = this.normalized(this.memberSearchTerm());

    if (!query) {
      return this.members();
    }

    return this.members().filter((member) => this.matchesMemberSearch(member, query));
  });
  protected readonly paginatedMembers = computed(() =>
    paginateItems(this.filteredMembers(), this.memberPage(), this.memberPageSize)
  );

  protected readonly statCards = computed(() => {
    const node = this.node();

    if (!node) {
      return [] as Array<{ label: string; value: string }>;
    }

    return [
      { label: 'Members', value: String(this.paginatedMembers().total) },
      { label: 'Level', value: this.nodeLevelLabel(node) },
      { label: 'Path Depth', value: String(node.path.length) },
    ];
  });

  protected readonly backLink = computed(() => {
    const node = this.node();

    if (!node) {
      return ['/organisation/state-committee'];
    }

    return ['/organisation/node', node.id];
  });

  protected readonly sectionLink = computed(() => this.sectionRoute(this.sectionRoot()));
  protected readonly sectionLinkQueryParams = computed(() => this.sectionRouteQueryParams(this.node(), this.sectionRoot()));
  protected readonly currentLocation = computed(() => this.locationLabel(this.node()));

  constructor() {
    effect(() => {
      this.nodeId();

      untracked(() => {
        this.memberPage.set(1);
      });
    });

    effect(() => {
      const nextPage = clampPage(this.memberPage(), this.filteredMembers().length, this.memberPageSize);

      if (nextPage === this.memberPage()) {
        return;
      }

      untracked(() => {
        this.memberPage.set(nextPage);
      });
    });

    effect(() => {
      this.memberSearchTerm();

      untracked(() => {
        this.memberPage.set(1);
      });
    });
  }

  protected memberName(member: OrgTreeNode): string {
    return member.subtitle || member.title || 'Member';
  }

  protected memberTitle(member: OrgTreeNode): string | null {
    const title = String(member.title || '').trim();

    if (!title || title.toLowerCase() === 'member' || title === member.subtitle) {
      return null;
    }

    return title;
  }

  protected memberMeta(member: OrgTreeNode): string {
    if (member.description) {
      return member.description;
    }

    const designation = this.memberTitle(member);

    if (designation) {
      return designation;
    }

    return member.path.slice(0, -1).join(' / ') || 'Organisation member';
  }

  protected memberContact(member: OrgTreeNode): string {
    return String((member as OrgTreeNode & { contact?: string }).contact || '').trim();
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

  protected nodeLevelLabel(node: OrgTreeNode): string {
    if (node.level === 'city') {
      return 'City / GBA';
    }

    return this.titleCase(node.level);
  }

  protected goToMemberPage(page: number): void {
    this.memberPage.set(clampPage(page, this.filteredMembers().length, this.memberPageSize));
  }

  protected updateMemberSearch(value: string): void {
    this.memberSearchTerm.set(value);
  }

  protected clearMemberSearch(): void {
    this.memberSearchTerm.set('');
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

  private matchesMemberSearch(member: OrgTreeNode, query: string): boolean {
    return this.normalized([
      this.memberName(member),
      this.memberTitle(member) || '',
      member.description,
      member.contact || '',
      member.location.state,
      member.location.district,
      member.location.taluk,
      member.path.join(' '),
    ].join(' ')).includes(query);
  }
}

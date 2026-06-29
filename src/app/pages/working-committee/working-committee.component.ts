import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../components/footer/footer.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { AdminDataService } from '../../services/admin-data.service';
import { buildOrgTree, findOrgNode, flattenOrgDescendants, flattenOrgTree, OrgTreeNode } from '../../utils/org-structure';

interface CommitteeDisplaySection {
  id: string;
  levelLabel: string;
  title: string;
  summary: string;
  emptyText: string;
  members: OrgTreeNode[];
}

@Component({
  selector: 'app-working-committee',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './working-committee.component.html',
  styleUrl: './working-committee.component.scss'
})
export class WorkingCommitteeComponent {
  private readonly data = inject(AdminDataService);
  private readonly pageSize = 8;
  private readonly sectionPageMap = signal<Record<string, number>>({});

  private readonly normalized = (value: string) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  private readonly hasWorkingTag = (node: OrgTreeNode) => {
    const text = this.normalized(`${node.title} ${node.subtitle} ${node.sidebarLabel}`);
    return [
      ['central', 'working', 'committee'],
      ['general', 'working', 'committee'],
      ['working', 'committee'],
      ['working'],
      ['working committee'],
    ].some((group) => group.every((token) => text.includes(this.normalized(token))));
  };

  private readonly hasPresidentTag = (node: OrgTreeNode) => {
    const text = this.normalized(`${node.title} ${node.subtitle} ${node.sidebarLabel}`);
    return [
      ['president-office'],
      ['national', 'president'],
      ['president'],
    ].some((group) => group.every((token) => text.includes(this.normalized(token))));
  };

  private readonly hasOfficeBearerTag = (node: OrgTreeNode) => {
    const text = this.normalized(`${node.title} ${node.subtitle} ${node.sidebarLabel}`);
    return [
      ['office-bearer'],
      ['office', 'bearer'],
      ['office', 'bearers'],
    ].some((group) => group.every((token) => text.includes(this.normalized(token))));
  };

  private readonly isNominatedNode = (node: OrgTreeNode | null | undefined) =>
    !!node && this.normalized(node.sidebarLabel) === this.normalized('nominated-body');

  private readonly isWorkingMemberNode = (node: OrgTreeNode, workingNode: OrgTreeNode | null | undefined) =>
    this.normalized(node.sidebarLabel) === this.normalized(workingNode?.sidebarLabel || 'working-committee');

  private readonly tree = computed(() => buildOrgTree(this.data.orgNodes()));
  private readonly displayRoots = computed(() => {
    const tree = this.tree();

    if (tree.length === 1 && tree[0].children.length) {
      return tree[0].children;
    }

    return tree;
  });

  protected readonly presidentNode = computed(() =>
    findOrgNode(this.displayRoots(), [
      ['president-office'],
      ['president', 'office'],
      ['president', 'body'],
      ['president'],
    ]) ?? null
  );

  protected readonly presidentMember = computed(() => {
    const presidentNode = this.presidentNode();

    if (!presidentNode) {
      return null;
    }

    return findOrgNode([presidentNode], [
      ['president-office'],
      ['national', 'president'],
      ['president'],
    ], presidentNode.id)
      ?? presidentNode.children[0]
      ?? (this.hasPresidentTag(presidentNode) ? presidentNode : null);
  });

  protected readonly officeBearerNode = computed(() =>
    findOrgNode(this.displayRoots(), [
      ['office-bearer'],
      ['office', 'bearer'],
      ['office', 'bearers'],
    ]) ?? null
  );

  protected readonly officeBearerMembers = computed(() => {
    const officeBearerNode = this.officeBearerNode();

    if (officeBearerNode) {
      const descendants = flattenOrgDescendants(officeBearerNode);

      if (descendants.length > 0) {
        return descendants;
      }

      if (officeBearerNode.children.length > 0) {
        return officeBearerNode.children;
      }
    }

    const taggedMembers = flattenOrgTree(this.displayRoots()).filter((node) => this.hasOfficeBearerTag(node));

    if (taggedMembers.length > 0) {
      return taggedMembers;
    }

    return [] as OrgTreeNode[];
  });

  protected readonly workingNode = computed(() =>
    findOrgNode(this.displayRoots(), [
      ['central', 'working', 'committee'],
      ['general', 'working', 'committee'],
      ['working-committee'],
      ['working'],
    ]) ?? null
  );

  protected readonly nominatedNode = computed(() =>
    this.displayRoots().find((node) => this.normalized(node.sidebarLabel) === this.normalized('nominated-body')) ?? null
  );

  private visibleNominatedMembers(roots: OrgTreeNode[]): OrgTreeNode[] {
    const visibleMembers: OrgTreeNode[] = [];

    for (const root of roots) {
      const descendants = flattenOrgDescendants(root).filter((node) => this.isNominatedNode(node));

      if (descendants.length > 0) {
        visibleMembers.push(...descendants);
        continue;
      }

      visibleMembers.push(root);
    }

    return visibleMembers;
  }

  protected readonly nationalNominatedMembers = computed(() => {
    const roots = this.displayRoots().filter((node) => this.isNominatedNode(node));
    return this.visibleNominatedMembers(roots);
  });

  protected readonly workingMembers = computed(() => {
    const workingNode = this.workingNode();

    if (workingNode) {
      const descendants = flattenOrgDescendants(workingNode)
        .filter((node) => this.isWorkingMemberNode(node, workingNode));

      if (descendants.length > 0) {
        return descendants;
      }

      const directMembers = workingNode.children
        .filter((node) => this.isWorkingMemberNode(node, workingNode));

      if (directMembers.length > 0) {
        return directMembers;
      }
    }

    const taggedMembers = flattenOrgTree(this.displayRoots()).filter((node) => this.hasWorkingTag(node));

    if (taggedMembers.length > 0) {
      return taggedMembers;
    }

    return [] as OrgTreeNode[];
  });

  protected readonly workingTitle = computed(() => 'CENTRAL WORKING COMMITTEE');
  protected readonly committeeSections = computed<CommitteeDisplaySection[]>(() => {
    const presidentMember = this.presidentMember();

    return [
      {
        id: 'president',
        levelLabel: 'Level 1',
        title: 'President',
        summary: 'National president profile shown at the top of the central leadership flow.',
        emptyText: 'No president member has been added yet.',
        members: presidentMember ? [presidentMember] : [],
      },
      {
        id: 'office-bearers',
        levelLabel: 'Level 2',
        title: 'Office Bearers',
        summary: 'National office bearer members grouped separately under the president level.',
        emptyText: 'No office bearer members have been added yet.',
        members: this.officeBearerMembers(),
      },
      {
        id: 'nominated',
        levelLabel: 'Level 3',
        title: 'National Nominated Members',
        summary: 'Only top-level nominated members are shown here. State nominated members stay inside their own state.',
        emptyText: 'No national nominated members have been added yet.',
        members: this.nationalNominatedMembers(),
      },
      {
        id: 'working',
        levelLabel: 'Level 4',
        title: 'Central Working Committee Members',
        summary: 'Members added directly under the Central Working Committee are shown here.',
        emptyText: 'No central working committee members have been added yet.',
        members: this.workingMembers(),
      },
    ];
  });

  protected hasPagination(section: CommitteeDisplaySection): boolean {
    return section.members.length > this.pageSize;
  }

  protected totalPages(section: CommitteeDisplaySection): number {
    return Math.max(1, Math.ceil(section.members.length / this.pageSize));
  }

  protected currentPage(section: CommitteeDisplaySection): number {
    const storedPage = this.sectionPageMap()[section.id] ?? 1;
    return Math.min(Math.max(storedPage, 1), this.totalPages(section));
  }

  protected pagedMembers(section: CommitteeDisplaySection): OrgTreeNode[] {
    const page = this.currentPage(section);
    const start = (page - 1) * this.pageSize;
    return section.members.slice(start, start + this.pageSize);
  }

  protected pageNumbers(section: CommitteeDisplaySection): number[] {
    return Array.from({ length: this.totalPages(section) }, (_, index) => index + 1);
  }

  protected setPage(section: CommitteeDisplaySection, page: number): void {
    const targetPage = Math.min(Math.max(page, 1), this.totalPages(section));

    this.sectionPageMap.update((state) => ({
      ...state,
      [section.id]: targetPage,
    }));
  }

  protected previousPage(section: CommitteeDisplaySection): void {
    this.setPage(section, this.currentPage(section) - 1);
  }

  protected nextPage(section: CommitteeDisplaySection): void {
    this.setPage(section, this.currentPage(section) + 1);
  }

  protected memberName(member: OrgTreeNode): string {
    return member.subtitle || member.title || 'Committee Member';
  }

  protected memberTitle(member: OrgTreeNode): string | null {
    const title = String(member.title || '').trim();

    if (!title || title.toLowerCase() === 'member' || title === this.workingTitle()) {
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

    if (member.path.length > 1) {
      return member.path.slice(0, -1).join(' / ');
    }

    return 'Committee member';
  }

  protected memberContact(member: OrgTreeNode): string {
    return (member as OrgTreeNode & { contact?: string }).contact || '';
  }
}

import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { FooterComponent } from '../../components/footer/footer.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { AdminDataService } from '../../services/admin-data.service';
import {
  buildOrgTree,
  buildOrgTreeIndex,
  findOrgParent,
  flattenOrgDescendants,
  OrgTreeNode,
  isStateCommitteeSectionLabel,
} from '../../utils/org-structure';

@Component({
  selector: 'app-nominated-body',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './nominated-body.component.html',
  styleUrl: './nominated-body.component.scss'
})
export class NominatedBodyComponent {
  private readonly data = inject(AdminDataService);
  private readonly route = inject(ActivatedRoute);

  private readonly normalizeLabel = (v: string) =>
    String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  private readonly tree = computed(() => buildOrgTree(this.data.orgNodes()));
  private readonly treeIndex = computed(() => buildOrgTreeIndex(this.tree()));
  private readonly displayRoots = computed(() => {
    const tree = this.tree();

    if (tree.length === 1 && tree[0].children.length) {
      return tree[0].children;
    }

    return tree;
  });
  private readonly scopeId = toSignal(
    this.route.queryParamMap.pipe(map((params) => {
      const value = String(params.get('scopeId') || '').trim();
      return value || null;
    })),
    { initialValue: String(this.route.snapshot.queryParamMap.get('scopeId') || '').trim() || null }
  );

  protected readonly scopeNode = computed(() => {
    const scopeId = this.scopeId();

    if (!scopeId) {
      return null;
    }

    return this.treeIndex().nodesById.get(scopeId) ?? null;
  });

  protected readonly scopeBranch = computed(() => {
    let current = this.scopeNode();

    while (current) {
      if (current.level === 'state' && isStateCommitteeSectionLabel(current.sidebarLabel)) {
        return current;
      }

      current = findOrgParent(current, this.treeIndex().flatNodes);
    }

    return this.scopeNode();
  });

  private readonly isNominatedNode = (node: OrgTreeNode | null | undefined) =>
    !!node && this.normalizeLabel(node.sidebarLabel) === 'nominated-body';

  private visibleNominatedMembers(roots: OrgTreeNode[]): OrgTreeNode[] {
    const visibleMembers: OrgTreeNode[] = [];

    for (const root of roots) {
      const descendants = flattenOrgDescendants(root).filter((node) => this.isNominatedNode(node));

      if (descendants.length) {
        visibleMembers.push(...descendants);
        continue;
      }

      visibleMembers.push(root);
    }

    return visibleMembers;
  }

  protected readonly globalMembers = computed(() => {
    const roots = this.displayRoots().filter((node) => this.isNominatedNode(node));
    return this.visibleNominatedMembers(roots);
  });

  protected readonly scopedMembers = computed(() => {
    const scopeBranch = this.scopeBranch();

    if (!scopeBranch) {
      return [] as OrgTreeNode[];
    }

    const roots = scopeBranch.children.filter((node) => this.isNominatedNode(node));
    return this.visibleNominatedMembers(roots);
  });

  protected readonly members = computed(() => {
    if (this.scopeId()) {
      return this.scopedMembers();
    }

    return this.globalMembers();
  });

  protected readonly pageTitle = computed(() => {
    const scopeBranch = this.scopeBranch();
    return scopeBranch ? `${scopeBranch.location.state} Nominated Body` : 'NOMINATED BODY';
  });

  protected readonly introText = computed(() => {
    const scopeBranch = this.scopeBranch();

    if (!scopeBranch) {
      return 'Members and representatives currently configured under the Nominated Body.';
    }

    return `Members and representatives currently configured under the Nominated Body for ${scopeBranch.location.state}.`;
  });

  protected readonly emptyText = computed(() => {
    const scopeBranch = this.scopeBranch();

    if (!scopeBranch) {
      return 'No nominated body members have been added yet.';
    }

    return `No nominated body members have been added for ${scopeBranch.location.state} yet.`;
  });

  protected memberName(member: OrgTreeNode): string {
    return member.subtitle || member.title || 'Nominated Member';
  }

  protected memberDesignation(member: OrgTreeNode): string | null {
    const title = String(member.title || '').trim();
    if (!title || title.toLowerCase() === 'member' || title.toLowerCase().includes('nominated')) return null;
    if (member.subtitle && title === member.subtitle) return null;
    return title;
  }

  protected memberDesc(member: OrgTreeNode): string {
    return member.description || '';
  }

  protected memberContact(member: OrgTreeNode): string {
    return (member as OrgTreeNode & { contact?: string }).contact || '';
  }
}

import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../components/footer/footer.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { AdminDataService } from '../../services/admin-data.service';
import { buildOrgTree, findOrgNode, flattenOrgDescendants, flattenOrgTree, OrgTreeNode } from '../../utils/org-structure';

@Component({
  selector: 'app-office-bearers',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './office-bearers.component.html',
  styleUrl: '../working-committee/working-committee.component.scss'
})
export class OfficeBearersComponent {
  private readonly data = inject(AdminDataService);

  private readonly normalized = (value: string) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  private readonly hasOfficeBearerTag = (node: OrgTreeNode) => {
    const text = this.normalized(`${node.title} ${node.subtitle} ${node.sidebarLabel}`);
    return [
      ['office-bearer'],
      ['office', 'bearer'],
      ['office', 'bearers'],
    ].some((group) => group.every((token) => text.includes(this.normalized(token))));
  };

  private readonly tree = computed(() => buildOrgTree(this.data.orgNodes()));
  private readonly displayRoots = computed(() => {
    const tree = this.tree();

    if (tree.length === 1 && tree[0].children.length) {
      return tree[0].children;
    }

    return tree;
  });

  protected readonly officeBearerNode = computed(() =>
    findOrgNode(this.displayRoots(), [
      ['office-bearer'],
      ['office', 'bearer'],
      ['office', 'bearers'],
    ]) ?? null
  );

  protected readonly members = computed(() => {
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

  protected readonly pageTitle = computed(() => 'OFFICE BEARERS');

  protected memberName(member: OrgTreeNode): string {
    return member.subtitle || member.title || 'Office Bearer';
  }

  protected memberTitle(member: OrgTreeNode): string | null {
    const title = String(member.title || '').trim();

    if (!title || title.toLowerCase() === 'member' || title === this.pageTitle()) {
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

    return 'Office bearer';
  }

  protected memberContact(member: OrgTreeNode): string {
    return (member as OrgTreeNode & { contact?: string }).contact || '';
  }
}

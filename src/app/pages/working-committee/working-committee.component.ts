import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../components/footer/footer.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { AdminDataService } from '../../services/admin-data.service';
import { buildOrgTree, findOrgNode, flattenOrgDescendants, flattenOrgTree, OrgTreeNode } from '../../utils/org-structure';

@Component({
  selector: 'app-working-committee',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './working-committee.component.html',
  styleUrl: './working-committee.component.scss'
})
export class WorkingCommitteeComponent {
  private readonly data = inject(AdminDataService);

  private readonly normalized = (value: string) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  private readonly hasWorkingTag = (node: OrgTreeNode) => {
    const text = this.normalized(`${node.title} ${node.subtitle} ${node.sidebarLabel}`);
    return [
      ['general', 'working', 'committee'],
      ['working', 'committee'],
      ['central', 'committee'],
      ['working'],
      ['working committee'],
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

  protected readonly workingNode = computed(() =>
    findOrgNode(this.displayRoots(), [
      ['general', 'working', 'committee'],
      ['working-committee'],
      ['working'],
      ['central', 'committee'],
    ]) ?? null
  );

  protected readonly nominatedNode = computed(() =>
    findOrgNode(this.tree(), [
      ['nominated', 'body'],
      ['nominated'],
    ])
  );

  protected readonly members = computed(() => {
    const workingNode = this.workingNode();

    if (workingNode) {
      const descendants = flattenOrgDescendants(workingNode);

      if (descendants.length > 0) {
        return descendants;
      }

      if (workingNode.children.length > 0) {
        return workingNode.children;
      }
    }

    const taggedMembers = flattenOrgTree(this.displayRoots()).filter((node) => this.hasWorkingTag(node));

    if (taggedMembers.length > 0) {
      return taggedMembers;
    }

    return [] as OrgTreeNode[];
  });

  protected readonly workingTitle = computed(() => 'GENERAL WORKING COMMITTEE');

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

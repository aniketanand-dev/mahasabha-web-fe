import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../components/footer/footer.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { AdminDataService } from '../../services/admin-data.service';
import { buildOrgTree, findOrgNode, flattenOrgDescendants, flattenOrgTree, OrgTreeNode } from '../../utils/org-structure';

@Component({
  selector: 'app-representative-general-body',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './representative-general-body.component.html',
  styleUrl: './representative-general-body.component.scss'
})
export class RepresentativeGeneralBodyComponent {
  private readonly data = inject(AdminDataService);

  private readonly normalized = (value: string) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  private readonly hasRepresentativeTag = (node: OrgTreeNode) => {
    const text = this.normalized(`${node.title} ${node.subtitle} ${node.sidebarLabel}`);
    return [
      ['representative-general-body'],
      ['representative', 'general', 'body'],
      ['representative'],
      ['general', 'body'],
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

  protected readonly representativeNode = computed(() =>
    findOrgNode(this.displayRoots(), [
      ['representative-general-body'],
      ['representative', 'general', 'body'],
      ['general', 'body'],
      ['representative'],
    ]) ?? this.displayRoots()[2] ?? null
  );

  protected readonly members = computed(() => {
    const representativeNode = this.representativeNode();

    if (representativeNode) {
      const descendants = flattenOrgDescendants(representativeNode);

      if (descendants.length > 0) {
        return descendants;
      }

      if (representativeNode.children.length > 0) {
        return representativeNode.children;
      }
    }

    const taggedMembers = flattenOrgTree(this.displayRoots()).filter((node) => this.hasRepresentativeTag(node));

    if (taggedMembers.length > 0) {
      return taggedMembers;
    }

    return [] as OrgTreeNode[];
  });

  protected readonly representativeTitle = computed(() =>
    this.representativeNode()?.title || 'REPRESENTATIVE GENERAL BODY'
  );

  protected memberName(member: OrgTreeNode): string {
    return member.subtitle || member.title || 'Representative Member';
  }

  protected memberTitle(member: OrgTreeNode): string | null {
    const title = String(member.title || '').trim();

    if (!title || title.toLowerCase() === 'member' || title === this.representativeTitle()) {
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
      return member.path.slice(1, -1).join(' / ') || 'Representative member';
    }

    return 'Representative member';
  }

  protected memberContact(member: OrgTreeNode): string {
    return (member as OrgTreeNode & { contact?: string }).contact || '';
  }
}

import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../components/footer/footer.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { AdminDataService } from '../../services/admin-data.service';
import { buildOrgTree, flattenOrgDescendants, flattenOrgTree, OrgTreeNode } from '../../utils/org-structure';

@Component({
  selector: 'app-nominated-body',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './nominated-body.component.html',
  styleUrl: './nominated-body.component.scss'
})
export class NominatedBodyComponent {
  private readonly data = inject(AdminDataService);

  private readonly normalizeLabel = (v: string) =>
    String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  private readonly tree = computed(() => buildOrgTree(this.data.orgNodes()));
  private readonly flatNodes = computed(() => flattenOrgTree(this.tree()));

  protected readonly members = computed(() => {
    const allNodes = this.flatNodes();

    // All nodes tagged with nominated-body sidebarLabel
    const nominatedNodes = allNodes.filter(
      n => this.normalizeLabel(n.sidebarLabel) === 'nominated-body'
    );

    if (!nominatedNodes.length) return [] as OrgTreeNode[];

    // Find root-level nominated nodes (parent is not also a nominated-body node)
    const nominatedIds = new Set(nominatedNodes.map(n => n.id));
    const roots = nominatedNodes.filter(n => !n.parentId || !nominatedIds.has(n.parentId));

    // Single container node with children → show its descendants (the actual members)
    if (roots.length === 1 && roots[0].children.length) {
      const descendants = flattenOrgDescendants(roots[0]);
      return descendants.length ? descendants : roots[0].children;
    }

    return roots;
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

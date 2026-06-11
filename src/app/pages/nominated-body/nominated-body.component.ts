import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { FooterComponent } from '../../components/footer/footer.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { AdminDataService } from '../../services/admin-data.service';
import { buildOrgTree, flattenOrgTree, OrgTreeNode } from '../../utils/org-structure';

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
  private readonly flatNodes = computed(() => flattenOrgTree(this.tree()));
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

    return this.flatNodes().find((node) => node.id === scopeId) ?? null;
  });

  protected readonly members = computed(() => {
    const allNodes = this.flatNodes();
    const scopeNode = this.scopeNode();
    const scopedState = String(scopeNode?.location.state || '').trim();

    // All nodes tagged with nominated-body sidebarLabel
    const nominatedNodes = allNodes.filter((node) => {
      if (this.normalizeLabel(node.sidebarLabel) !== 'nominated-body') {
        return false;
      }

      if (!scopedState) {
        return true;
      }

      return String(node.location.state || '').trim() === scopedState;
    });

    if (!nominatedNodes.length) return [] as OrgTreeNode[];

    // Find root-level nominated nodes (parent is not also a nominated-body node)
    const nominatedIds = new Set(nominatedNodes.map(n => n.id));
    const roots = nominatedNodes.filter(n => !n.parentId || !nominatedIds.has(n.parentId));

    // Single container node with children → show its descendants (the actual members)
    if (roots.length === 1 && nominatedNodes.some((node) => node.parentId === roots[0].id)) {
      const descendants = nominatedNodes.filter((node) => node.id !== roots[0].id);
      return descendants.length ? descendants : roots[0].children;
    }

    return roots;
  });

  protected readonly pageTitle = computed(() => {
    const scopeNode = this.scopeNode();
    return scopeNode ? `${scopeNode.location.state} Nominated Body` : 'NOMINATED BODY';
  });

  protected readonly introText = computed(() => {
    const scopeNode = this.scopeNode();

    if (!scopeNode) {
      return 'Members and representatives currently configured under the Nominated Body.';
    }

    return `Members and representatives currently configured under the Nominated Body for ${scopeNode.location.state}.`;
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

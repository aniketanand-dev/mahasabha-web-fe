import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { FooterComponent } from '../../components/footer/footer.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { AdminDataService } from '../../services/admin-data.service';
import { buildOrgTree, flattenOrgDescendants, flattenOrgTree, OrgTreeNode } from '../../utils/org-structure';

@Component({
  selector: 'app-org-node-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './org-node-detail.component.html',
  styleUrl: './org-node-detail.component.scss'
})
export class OrgNodeDetailComponent {
  private readonly data = inject(AdminDataService);
  private readonly route = inject(ActivatedRoute);

  private readonly tree = computed(() => buildOrgTree(this.data.orgNodes()));
  private readonly flatNodes = computed(() => flattenOrgTree(this.tree()));
  private readonly nodeId = toSignal(
    this.route.paramMap.pipe(map(params => {
      const value = String(params.get('nodeId') || '').trim();
      return value || null;
    })),
    {
      initialValue: String(this.route.snapshot.paramMap.get('nodeId') || '').trim() || null,
    }
  );

  protected readonly node = computed(() => {
    const nodeId = this.nodeId();

    if (!nodeId) {
      return null;
    }

    return this.flatNodes().find(node => node.id === nodeId) ?? null;
  });

  protected readonly members = computed(() => {
    const node = this.node();

    if (!node) {
      return [] as OrgTreeNode[];
    }

    const descendants = flattenOrgDescendants(node);

    if (descendants.length > 0) {
      return descendants;
    }

    return node.children;
  });

  protected readonly statCards = computed(() => {
    const node = this.node();

    if (!node) {
      return [] as Array<{ label: string; value: string }>;
    }

    return [
      { label: 'Direct Units', value: String(node.children.length) },
      { label: 'Nested Entries', value: String(flattenOrgDescendants(node).length) },
      { label: 'Path Depth', value: `${node.path.length}` },
    ];
  });

  protected memberMeta(member: OrgTreeNode): string {
    if (member.description) {
      return member.description;
    }

    if (member.subtitle) {
      return member.subtitle;
    }

    if (member.path.length > 1) {
      return member.path.slice(0, -1).join(' / ') || 'Organisation member';
    }

    return 'Organisation member';
  }
}

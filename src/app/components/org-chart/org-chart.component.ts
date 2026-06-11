import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminDataService } from '../../services/admin-data.service';
import { LanguageService } from '../../services/language.service';
import { buildOrgTree, findOrgNode, OrgTreeNode } from '../../utils/org-structure';

@Component({
  selector: 'app-org-chart',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './org-chart.component.html',
  styleUrls: ['./org-chart.component.scss']
})
export class OrgChartComponent {
  protected readonly lang = inject(LanguageService);
  private readonly data = inject(AdminDataService);

  private readonly tree = computed(() => buildOrgTree(this.data.orgNodes()));
  private readonly displayRoots = computed(() => {
    const tree = this.tree();

    if (tree.length === 1 && tree[0].children.length) {
      return tree[0].children;
    }

    return tree;
  });

  protected readonly structure = computed(() => {
    const roots = this.displayRoots();
    const presidentNode = findOrgNode(roots, [
      ['president-office'],
      ['president', 'office'],
      ['president', 'body'],
      ['president'],
    ]) ?? roots[0] ?? null;
    const officeBearerNode = findOrgNode(roots, [
      ['office-bearer'],
      ['office', 'bearer'],
      ['office', 'bearers'],
    ]);
    const workingNode = findOrgNode(roots, [
      ['working'],
      ['central', 'committee'],
      ['general', 'working', 'committee'],
    ]) ?? roots[1] ?? null;
    const stateNode = findOrgNode(roots, [
      ['state', 'committee'],
      ['state'],
    ]) ?? findOrgNode(this.tree(), [
      ['state', 'committee'],
      ['state'],
    ]);
    const representativeNode = findOrgNode(roots, [
      ['representative', 'general', 'body'],
      ['general', 'body'],
      ['representative'],
    ]) ?? findOrgNode(this.tree(), [
      ['representative', 'general', 'body'],
      ['general', 'body'],
      ['representative'],
    ]) ?? null;
    const nominatedNode = findOrgNode(this.tree(), [
      ['nominated', 'body'],
      ['nominated'],
    ]);
    const presidentDisplayNode = presidentNode
      ? findOrgNode([presidentNode], [
        ['president-office'],
        ['national', 'president'],
        ['president'],
      ], presidentNode.id) ?? presidentNode.children[0] ?? presidentNode
      : null;

    return {
      presidentNode,
      officeBearerNode,
      workingNode,
      stateNode,
      statePreviewNodes: stateNode?.children.slice(0, 4) ?? [],
      representativeNode,
      nominatedNode,
      presidentPhoto: presidentDisplayNode?.imageUrl || this.data.presidentNoteContent().photoUrl,
      presidentName: presidentDisplayNode?.subtitle || this.lang.t('presNote.name'),
      presidentDescription: presidentDisplayNode?.description || presidentDisplayNode?.title || this.lang.t('presNote.desg'),
    };
  });

  protected cardTitle(node: OrgTreeNode | null, fallback: string): string {
    return node?.title || fallback;
  }
}

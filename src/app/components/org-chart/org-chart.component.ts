import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AdminDataService } from '../../services/admin-data.service';
import { LanguageService } from '../../services/language.service';
import { buildOrgTree, buildOrgTreeIndex, findOrgNode, getOrgNavigableChildren, OrgTreeNode } from '../../utils/org-structure';

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
  private readonly route = inject(ActivatedRoute);

  private readonly tree = computed(() => buildOrgTree(this.data.orgNodes()));
  private readonly treeIndex = computed(() => buildOrgTreeIndex(this.tree()));
  private readonly selectedStateQueryId = toSignal(
    this.route.queryParamMap.pipe(map((params) => {
      const value = String(params.get('selectedState') || '').trim();
      return value || null;
    })),
    { initialValue: String(this.route.snapshot.queryParamMap.get('selectedState') || '').trim() || null }
  );
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
      ['working-committee'],
      ['general', 'working', 'committee'],
      ['working'],
      ['central', 'committee'],
    ]) ?? null;
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
      statePreviewNodes: stateNode ? this.statePreviewNodes(stateNode) : [],
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

  protected isSelectedState(node: OrgTreeNode): boolean {
    return node.id === this.selectedStateQueryId();
  }

  private statePreviewNodes(stateNode: OrgTreeNode): OrgTreeNode[] {
    const nodes = getOrgNavigableChildren(stateNode, this.treeIndex().flatNodes);
    const selectedStateId = this.selectedStateQueryId();

    if (!selectedStateId) {
      return nodes.slice(0, 4);
    }

    const selectedNode = nodes.find((node) => node.id === selectedStateId);

    if (!selectedNode) {
      return nodes.slice(0, 4);
    }

    return [selectedNode, ...nodes.filter((node) => node.id !== selectedStateId)].slice(0, 4);
  }
}

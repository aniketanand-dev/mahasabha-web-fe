import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AdminDataService, AdminOrgNode } from '../../services/admin-data.service';
import { LanguageService } from '../../services/language.service';

interface OrgLevel {
  depth: number;
  nodes: AdminOrgNode[];
}

@Component({
  selector: 'app-org-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './org-chart.component.html',
  styleUrls: ['./org-chart.component.scss']
})
export class OrgChartComponent {
  protected lang = inject(LanguageService);
  private readonly data = inject(AdminDataService);

  protected readonly levels = computed(() => this.buildLevels(this.data.orgNodes()));

  private buildLevels(nodes: AdminOrgNode[]): OrgLevel[] {
    const sortedNodes = [...nodes].sort((a, b) => a.order - b.order || a.id - b.id);
    const childrenByParent = new Map<number | null, AdminOrgNode[]>();
    const levels: OrgLevel[] = [];

    for (const node of sortedNodes) {
      const siblings = childrenByParent.get(node.parentId) ?? [];
      siblings.push(node);
      childrenByParent.set(node.parentId, siblings);
    }

    let currentLevel = childrenByParent.get(null) ?? [];
    let depth = 0;

    while (currentLevel.length) {
      levels.push({ depth, nodes: currentLevel });

      const nextLevel: AdminOrgNode[] = [];
      for (const node of currentLevel) {
        nextLevel.push(...(childrenByParent.get(node.id) ?? []));
      }

      currentLevel = nextLevel;
      depth += 1;
    }

    return levels;
  }
}

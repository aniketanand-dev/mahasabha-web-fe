import { AdminOrgNode } from '../services/admin-data.service';

export interface OrgTreeNode extends AdminOrgNode {
  depth: number;
  path: string[];
  children: OrgTreeNode[];
}

const normalizeOrgText = (value: string): string =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const buildOrgTree = (nodes: AdminOrgNode[]): OrgTreeNode[] => {
  const sortedNodes = [...nodes].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  const childrenByParent = new Map<string | null, AdminOrgNode[]>();
  const nodeIds = new Set(sortedNodes.map(node => node.id));

  for (const node of sortedNodes) {
    const siblings = childrenByParent.get(node.parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parentId, siblings);
  }

  const rootNodes = sortedNodes.filter(node => node.parentId === null || !nodeIds.has(node.parentId));

  const buildBranch = (node: AdminOrgNode, depth: number, path: string[]): OrgTreeNode => ({
    ...node,
    depth,
    path,
    children: (childrenByParent.get(node.id) ?? []).map(child => buildBranch(child, depth + 1, [...path, child.title])),
  });

  return rootNodes.map(root => buildBranch(root, 0, [root.title]));
};

export const flattenOrgTree = (nodes: OrgTreeNode[]): OrgTreeNode[] => {
  const items: OrgTreeNode[] = [];

  for (const node of nodes) {
    items.push(node, ...flattenOrgTree(node.children));
  }

  return items;
};

export const flattenOrgDescendants = (node: OrgTreeNode): OrgTreeNode[] => flattenOrgTree(node.children);

export const findOrgNode = (
  roots: OrgTreeNode[],
  keywordGroups: string[][],
  excludeId?: string,
): OrgTreeNode | null => {
  const items = flattenOrgTree(roots);

  for (const node of items) {
    if (excludeId !== undefined && node.id === excludeId) {
      continue;
    }

    const text = normalizeOrgText(`${node.title} ${node.subtitle} ${node.sidebarLabel} ${node.description}`);
    const isMatch = keywordGroups.some(group => group.every(keyword => text.includes(normalizeOrgText(keyword))));

    if (isMatch) {
      return node;
    }
  }

  return null;
};

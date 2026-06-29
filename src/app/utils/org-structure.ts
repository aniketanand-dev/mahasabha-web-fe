import { AdminOrgNode } from '../services/admin-data.service';

export interface OrgTreeNode extends AdminOrgNode {
  depth: number;
  path: string[];
  children: OrgTreeNode[];
}

export interface OrgTreeIndex {
  flatNodes: OrgTreeNode[];
  nodesById: Map<string, OrgTreeNode>;
  parentById: Map<string, OrgTreeNode | null>;
  pathIdsById: Map<string, string[]>;
  descendantCountById: Map<string, number>;
}

const normalizeOrgText = (value: string): string =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const orgStateAllowsCityLevel = (state: string | null | undefined): boolean =>
  normalizeOrgText(String(state || '')) === normalizeOrgText('karnataka');

const SIMPLE_ORG_SECTION_LABELS = [
  'president-office',
  'office-bearer',
  'working-committee',
  'representative-general-body',
  'nominated-body',
] as const;

const STATE_COMMITTEE_SECTION_LABEL = 'state-committee';
const STATE_COMMITTEE_MEMBER_LABEL = 'state-committee-member';
const STATE_COMMITTEE_CONTAINER_TITLE = 'state committee';
const TALUK_COMMITTEE_SECTION_LABEL = 'taluk-committee';
const TALUK_COMMITTEE_MEMBER_LABEL = 'taluk-committee-member';

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
  const stack = [...nodes].reverse();

  while (stack.length) {
    const node = stack.pop();

    if (!node) {
      continue;
    }

    items.push(node);

    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      stack.push(node.children[index]);
    }
  }

  return items;
};

export const flattenOrgDescendants = (node: OrgTreeNode): OrgTreeNode[] => flattenOrgTree(node.children);

export const buildOrgTreeIndex = (roots: OrgTreeNode[]): OrgTreeIndex => {
  const flatNodes: OrgTreeNode[] = [];
  const nodesById = new Map<string, OrgTreeNode>();
  const parentById = new Map<string, OrgTreeNode | null>();
  const pathIdsById = new Map<string, string[]>();
  const descendantCountById = new Map<string, number>();
  const stack = roots
    .slice()
    .reverse()
    .map((node) => ({ node, parent: null as OrgTreeNode | null }));

  while (stack.length) {
    const current = stack.pop();

    if (!current) {
      continue;
    }

    const { node, parent } = current;
    const parentPath = parent ? (pathIdsById.get(parent.id) ?? []) : [];

    flatNodes.push(node);
    nodesById.set(node.id, node);
    parentById.set(node.id, parent);
    pathIdsById.set(node.id, [...parentPath, node.id]);

    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      stack.push({ node: node.children[index], parent: node });
    }
  }

  const measureDescendants = (node: OrgTreeNode): number => {
    let count = 0;

    for (const child of node.children) {
      count += 1 + measureDescendants(child);
    }

    descendantCountById.set(node.id, count);
    return count;
  };

  for (const root of roots) {
    measureDescendants(root);
  }

  return {
    flatNodes,
    nodesById,
    parentById,
    pathIdsById,
    descendantCountById,
  };
};

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

export const isSameOrgLabel = (value: string | null | undefined, expected: string): boolean =>
  normalizeOrgText(String(value || '')) === normalizeOrgText(expected);

export const isSimpleOrgSectionLabel = (label: string | null | undefined): boolean => {
  const normalizedLabel = normalizeOrgText(String(label || ''));
  return SIMPLE_ORG_SECTION_LABELS.some((candidate) => normalizeOrgText(candidate) === normalizedLabel);
};

export const isStateCommitteeSectionLabel = (label: string | null | undefined): boolean =>
  isSameOrgLabel(label, STATE_COMMITTEE_SECTION_LABEL);

export const isStateCommitteeMemberLabel = (label: string | null | undefined): boolean =>
  isSameOrgLabel(label, STATE_COMMITTEE_MEMBER_LABEL);

export const isTalukCommitteeSectionLabel = (label: string | null | undefined): boolean =>
  isSameOrgLabel(label, TALUK_COMMITTEE_SECTION_LABEL);

export const isTalukCommitteeMemberLabel = (label: string | null | undefined): boolean =>
  isSameOrgLabel(label, TALUK_COMMITTEE_MEMBER_LABEL);

export const findOrgParent = (
  node: Pick<OrgTreeNode, 'parentId'> | null | undefined,
  nodes: OrgTreeNode[],
): OrgTreeNode | null => {
  if (!node?.parentId) {
    return null;
  }

  return nodes.find((candidate) => candidate.id === node.parentId) ?? null;
};

export const findOrgSectionRoot = (
  node: OrgTreeNode | null | undefined,
  nodes: OrgTreeNode[],
): OrgTreeNode | null => {
  if (!node) {
    return null;
  }

  let current: OrgTreeNode | null = node;

  while (current) {
    const parent = findOrgParent(current, nodes);

    if (!parent) {
      return current;
    }

    current = parent;
  }

  return null;
};

const sameOrgLocation = (left: OrgTreeNode, right: OrgTreeNode): boolean =>
  left.location.state === right.location.state
  && left.location.district === right.location.district
  && left.location.taluk === right.location.taluk;

const matchesStateCommitteeStateBranchIdentity = (node: Pick<OrgTreeNode, 'title' | 'subtitle' | 'location'>): boolean => {
  const normalizedState = normalizeOrgText(String(node.location.state || ''));
  const normalizedTitle = normalizeOrgText(String(node.title || ''));
  const normalizedSubtitle = normalizeOrgText(String(node.subtitle || ''));

  return !!normalizedState
    && normalizedTitle === normalizedState
    && normalizedSubtitle === normalizedState;
};

export const isStateCommitteeContainerNode = (node: OrgTreeNode | null | undefined): boolean =>
  !!node
  && isStateCommitteeSectionLabel(node.sidebarLabel)
  && isSameOrgLabel(node.title, STATE_COMMITTEE_CONTAINER_TITLE)
  && node.level === 'state'
  && !node.location.district
  && !node.location.taluk;

export const isStateCommitteeMemberNode = (
  node: OrgTreeNode | null | undefined,
  nodes: OrgTreeNode[],
): boolean => {
  if (
    !node
    || (!isStateCommitteeSectionLabel(node.sidebarLabel) && !isStateCommitteeMemberLabel(node.sidebarLabel))
    || isStateCommitteeContainerNode(node)
  ) {
    return false;
  }

  const parent = findOrgParent(node, nodes);

  if (!parent || !isStateCommitteeSectionLabel(parent.sidebarLabel)) {
    return false;
  }

  if (parent.level !== node.level || parent.location.state !== node.location.state) {
    return false;
  }

  if (node.level === 'state') {
    if (node.location.district || node.location.taluk) {
      return false;
    }

    if (isStateCommitteeContainerNode(parent)) {
      return isStateCommitteeMemberLabel(node.sidebarLabel)
        || !matchesStateCommitteeStateBranchIdentity(node);
    }

    return true;
  }

  return parent.location.district === node.location.district
    && parent.location.taluk === node.location.taluk;
};

export const isTalukCommitteeContainerNode = (node: OrgTreeNode | null | undefined): boolean =>
  !!node && isTalukCommitteeSectionLabel(node.sidebarLabel);

export const isTalukCommitteeMemberNode = (
  node: OrgTreeNode | null | undefined,
  nodes: OrgTreeNode[],
): boolean => {
  if (!node || !isTalukCommitteeMemberLabel(node.sidebarLabel)) {
    return false;
  }

  const parent = findOrgParent(node, nodes);

  if (!parent || !isTalukCommitteeContainerNode(parent)) {
    return false;
  }

  return parent.level === node.level
    && sameOrgLocation(parent, node);
};

export const isLinkedOrgSectionChild = (
  parent: OrgTreeNode,
  child: OrgTreeNode,
): boolean =>
  !isSimpleOrgSectionLabel(parent.sidebarLabel)
  && isSimpleOrgSectionLabel(child.sidebarLabel);

export const isOrgMemberChild = (
  parent: OrgTreeNode,
  child: OrgTreeNode,
  nodes: OrgTreeNode[],
): boolean => {
  if (isSimpleOrgSectionLabel(parent.sidebarLabel)) {
    return true;
  }

  if (isLinkedOrgSectionChild(parent, child)) {
    return false;
  }

  if (isTalukCommitteeContainerNode(child) || isStateCommitteeContainerNode(child)) {
    return false;
  }

  if (isTalukCommitteeMemberNode(child, nodes) || isStateCommitteeMemberNode(child, nodes)) {
    return true;
  }

  if (isStateCommitteeContainerNode(parent)) {
    return false;
  }

  return parent.level === child.level
    && sameOrgLocation(parent, child);
};

export const getOrgDirectMembers = (
  node: OrgTreeNode,
  nodes: OrgTreeNode[],
): OrgTreeNode[] => node.children.filter((child) => isOrgMemberChild(node, child, nodes));

export const getOrgLinkedSectionChildren = (node: OrgTreeNode): OrgTreeNode[] =>
  node.children.filter((child) => isLinkedOrgSectionChild(node, child));

export const getOrgNavigableChildren = (
  node: OrgTreeNode,
  nodes: OrgTreeNode[],
): OrgTreeNode[] => node.children.filter((child) =>
  !(child.level === 'city' && !orgStateAllowsCityLevel(child.location.state || node.location.state))
  && !(node.level === 'city' && !orgStateAllowsCityLevel(node.location.state))
  && !isOrgMemberChild(node, child, nodes)
  && !isLinkedOrgSectionChild(node, child)
);

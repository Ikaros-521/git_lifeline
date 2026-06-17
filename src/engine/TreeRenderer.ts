import * as d3 from 'd3'
import type { TreeNode } from '../data/types'

/** A point where a particle burst should fire, in canvas-local pixel coords. */
export interface BurstPoint {
  x: number
  y: number
  kind: 'added' | 'deleted' | 'modified'
}

export interface TreeRendererOptions {
  svgEl: SVGSVGElement
  width: number
  height: number
  theme: {
    treeBranch: string
    treeLeaf: string
    treeAdded: string
    treeDeleted: string
    treeModified: string
    treeNodeStroke: string
    treeLabelColor: string
    treeLabelOutline: string
    treeLabelAdded: string
    treeLabelDeleted: string
    treeLabelModified: string
  }
  /** Called with the change points of the current commit so the host can fire particle bursts. */
  onBurst?: (points: BurstPoint[]) => void
}

const LABEL_FONT_SIZE = 11
const LABEL_CHAR_WIDTH = 6.2
const LABEL_MAX_CHARS = 28
const BLOB_LABEL_DY = 15
const TREE_LABEL_DY = -11
const FOCUS_FONT_SIZE = 13
const FOCUS_PAD_X = 10
const FOCUS_PAD_Y = 5

interface NodePosition {
  x: number
  y: number
  data: TreeNode
}

export class TreeRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  private g: d3.Selection<SVGGElement, unknown, null, undefined>
  private focusG: d3.Selection<SVGGElement, unknown, null, undefined>
  private width: number
  private height: number
  private theme: TreeRendererOptions['theme']
  private treeLayout: d3.TreeLayout<TreeNode>
  private onBurst?: (points: BurstPoint[]) => void
  /** Commit index of the last fired burst, to avoid re-firing every animation frame. */
  private lastBurstKey = ''
  private hoveredId: string | null = null
  private pinnedId: string | null = null
  private nodePositions = new Map<string, NodePosition>()

  /** Truncate long file names while preserving the extension. */
  private truncateLabel(name: string, maxLen = LABEL_MAX_CHARS): string {
    if (name.length <= maxLen) return name
    const dot = name.lastIndexOf('.')
    const ext = dot > 0 ? name.slice(dot) : ''
    const base = ext ? name.slice(0, -ext.length) : name
    const keep = maxLen - ext.length - 1
    if (keep < 4) return name.slice(0, maxLen - 1) + '…'
    return base.slice(0, keep) + '…' + ext
  }

  private estimateLabelWidth(name: string): number {
    return this.truncateLabel(name).length * LABEL_CHAR_WIDTH + 12
  }

  /** Widen layout when many siblings or long labels would crowd the viewport. */
  private computeLayoutWidth(root: d3.HierarchyNode<TreeNode>): number {
    let maxSiblings = 0
    let maxLabel = 0
    root.each(d => {
      if (d.children) maxSiblings = Math.max(maxSiblings, d.children.length)
      if (d.data.type === 'blob') {
        maxLabel = Math.max(maxLabel, this.estimateLabelWidth(d.data.name))
      }
    })
    const perSibling = maxLabel + 36
    const needed = Math.max(this.width - 120, maxSiblings * perSibling, 520)
    return Math.min(needed, Math.max(this.width * 2.5, 900))
  }

  private getNodeLabelColor(node: TreeNode): string {
    if (node.isNew) return this.theme.treeLabelAdded
    if (node.isDeleted) return this.theme.treeLabelDeleted
    if (node.isModified) return this.theme.treeLabelModified
    return this.theme.treeLabelColor
  }

  private getActiveNodeId(): string | null {
    return this.pinnedId ?? this.hoveredId
  }

  private getNodeDisplayName(node: TreeNode): string {
    return node.type === 'blob' && node.path ? node.path : node.name
  }

  private estimateFullLabelWidth(name: string): number {
    return name.length * LABEL_CHAR_WIDTH + FOCUS_PAD_X * 2
  }

  private syncNodePositions(root: d3.HierarchyNode<TreeNode>) {
    this.nodePositions.clear()
    for (const d of root.descendants() as d3.HierarchyPointNode<TreeNode>[]) {
      this.nodePositions.set(d.data.id, { x: d.x, y: d.y, data: d.data })
    }
    if (this.hoveredId && !this.nodePositions.has(this.hoveredId)) this.hoveredId = null
    if (this.pinnedId && !this.nodePositions.has(this.pinnedId)) this.pinnedId = null
  }

  private bindNodeInteractions(
    nodesEnter: d3.Selection<SVGGElement, d3.HierarchyNode<TreeNode>, SVGGElement, unknown>
  ) {
    nodesEnter
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => {
        this.hoveredId = d.data.id
        this.renderFocusHighlight()
      })
      .on('mouseleave', () => {
        this.hoveredId = null
        this.renderFocusHighlight()
      })
      .on('click', (event, d) => {
        event.stopPropagation()
        this.pinnedId = this.pinnedId === d.data.id ? null : d.data.id
        this.renderFocusHighlight()
      })
  }

  /** Draw floating label card for hovered or pinned node. */
  private renderFocusHighlight() {
    const activeId = this.getActiveNodeId()
    this.focusG.selectAll('*').remove()
    this.g.selectAll('g.node').classed('node-active', false)

    if (!activeId) return

    const node = this.nodePositions.get(activeId)
    if (!node) return

    const isBlob = node.data.type === 'blob'
    const label = this.getNodeDisplayName(node.data)
    const color = this.getNodeLabelColor(node.data)
    const dy = isBlob ? BLOB_LABEL_DY : TREE_LABEL_DY
    const labelW = this.estimateFullLabelWidth(label)
    const labelH = FOCUS_FONT_SIZE + FOCUS_PAD_Y * 2
    const isPinned = this.pinnedId === activeId

    const focus = this.focusG.append('g')
      .attr('class', 'node-focus')
      .attr('transform', `translate(${node.x},${node.y})`)

    focus.append('circle')
      .attr('class', 'focus-ring')
      .attr('r', isBlob ? 10 : 12)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', isPinned ? 2.5 : 1.8)
      .attr('stroke-dasharray', isPinned ? '5 3' : null)
      .attr('opacity', 0.95)
      .attr('filter', 'url(#node-glow)')

    focus.append('rect')
      .attr('class', 'focus-bg')
      .attr('x', -labelW / 2)
      .attr('y', dy - labelH / 2)
      .attr('width', labelW)
      .attr('height', labelH)
      .attr('rx', 5)
      .attr('fill', this.theme.treeLabelOutline)
      .attr('stroke', color)
      .attr('stroke-width', isPinned ? 2 : 1.5)
      .attr('opacity', 0.97)

    focus.append('text')
      .attr('class', 'focus-label')
      .attr('dy', dy + 4)
      .attr('text-anchor', 'middle')
      .style('font-size', `${FOCUS_FONT_SIZE}px`)
      .style('font-weight', '600')
      .style('fill', color)
      .style('paint-order', 'stroke')
      .style('stroke', this.theme.treeLabelOutline)
      .style('stroke-width', '2px')
      .style('stroke-linejoin', 'round')
      .text(label)

    this.g.selectAll<SVGGElement, d3.HierarchyPointNode<TreeNode>>('g.node')
      .filter(d => d.data.id === activeId)
      .classed('node-active', true)
      .raise()

    this.focusG.raise()
  }

  constructor(opts: TreeRendererOptions) {
    this.svg = d3.select(opts.svgEl)
    this.width = opts.width
    this.height = opts.height
    this.theme = opts.theme
    this.onBurst = opts.onBurst

    // Clear previous content
    this.svg.selectAll('*').remove()

    // Glow filter used to make changed nodes pop.
    const defs = this.svg.append('defs')
    const glow = defs.append('filter')
      .attr('id', 'node-glow')
      .attr('x', '-150%')
      .attr('y', '-150%')
      .attr('width', '400%')
      .attr('height', '400%')
    glow.append('feGaussianBlur')
      .attr('stdDeviation', '3.5')
      .attr('result', 'blur')
    const merge = glow.append('feMerge')
    merge.append('feMergeNode').attr('in', 'blur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')

    this.g = this.svg.append('g')
      .attr('transform', `translate(0, 40)`)

    this.focusG = this.g.append('g')
      .attr('class', 'focus-layer')
      .attr('pointer-events', 'none')

    this.svg.on('click.focus-clear', () => {
      if (!this.pinnedId) return
      this.pinnedId = null
      this.renderFocusHighlight()
    })

    this.treeLayout = d3.tree<TreeNode>()
      .size([this.width - 120, this.height - 120])
      .separation((a, b) => {
        if (a.parent !== b.parent) return 2
        const wA = a.data.type === 'blob' ? this.estimateLabelWidth(a.data.name) : 56
        const wB = b.data.type === 'blob' ? this.estimateLabelWidth(b.data.name) : 56
        const unit = Math.max(44, (this.width - 120) / 18)
        // Centered labels: node centers need half-width clearance on each side.
        return Math.max(1.5, ((wA + wB) / 2 + 18) / unit)
      })

    // Add zoom/pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        this.g.attr('transform', event.transform)
      })
    this.svg.call(zoom)
  }

  update(treeData: TreeNode, interProgress: number, commitIndex = 0) {
    // Eased progress for snappier, more cinematic motion.
    const p = interProgress
    const popIn = d3.easeBackOut.overshoot(2.2)(Math.min(1, p * 1.4))
    const pulse = Math.sin(p * Math.PI) // 0 -> 1 -> 0 over the transition

    // Build hierarchy from tree data
    const root = d3.hierarchy(treeData)

    const layoutWidth = this.computeLayoutWidth(root)
    this.treeLayout.size([layoutWidth, this.height - 120])

    // Apply the tree layout
    this.treeLayout(root)

    this.syncNodePositions(root)

    // Join links (edges)
    const links = this.g.selectAll<SVGPathElement, d3.HierarchyPointLink<TreeNode>>('path.link')
      .data(root.links(), d => `${d.source.data.id}-${d.target.data.id}`)

    // Remove immediately: update() runs every frame, so a .transition().remove()
    // here would be re-scheduled each frame and the node would never actually leave.
    // Animated departures are handled via the isDeleted flag in the snapshot itself.
    links.exit().remove()

    const linksEnter = links.enter().append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', this.theme.treeBranch)
      .attr('stroke-width', 1.5)
      .attr('opacity', 0)

    // Set links directly per frame (update() runs every animation frame, so a
    // d3 .transition() here would be interrupted every frame and never finish).
    linksEnter.merge(links)
      .attr('d', (d: any) => {
        const sx = d.source.x, sy = d.source.y
        const tx = d.target.x, ty = d.target.y
        return `M${sx},${sy}C${sx},${(sy + ty) / 2} ${tx},${(sy + ty) / 2} ${tx},${ty}`
      })
      .attr('stroke', d => {
        if (d.target.data.isNew) return this.theme.treeAdded
        if (d.target.data.isDeleted) return this.theme.treeDeleted
        if (d.target.data.isModified) return this.theme.treeModified
        return this.theme.treeBranch
      })
      .attr('stroke-width', d => d.target.data.type === 'blob' ? 1 : 2)
      .attr('opacity', d => {
        if (d.target.data.isDeleted) return 1 - p
        if (d.target.data.isNew) return Math.min(1, p * 2)
        return 1
      })

    // Join nodes
    const nodes = this.g.selectAll<SVGGElement, d3.HierarchyPointNode<TreeNode>>('g.node')
      .data(root.descendants(), d => d.data.id)

    nodes.exit().remove()

    const nodesEnter = nodes.enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('opacity', 0)

    this.bindNodeInteractions(nodesEnter)

    // Larger invisible hit target for hover / click
    nodesEnter.append('circle')
      .attr('class', 'hit-area')
      .attr('r', d => d.data.type === 'blob' ? 14 : 16)
      .attr('fill', 'transparent')
      .style('pointer-events', 'all')

    // Add circles for tree nodes
    nodesEnter.append('circle')
      .attr('class', 'node-dot')
      .attr('r', d => d.data.type === 'blob' ? 4 : 6)
      .attr('fill', d => {
        if (d.data.isNew) return this.theme.treeAdded
        if (d.data.isDeleted) return this.theme.treeDeleted
        if (d.data.isModified) return this.theme.treeModified
        return this.theme.treeLeaf
      })
      .attr('stroke', this.theme.treeNodeStroke)
      .attr('stroke-width', 1.5)

    // Add labels for nodes — centered on node; dirs above, files below
    nodesEnter.append('text')
      .attr('dx', 0)
      .attr('dy', d => d.data.type === 'blob' ? BLOB_LABEL_DY : TREE_LABEL_DY)
      .attr('text-anchor', 'middle')
      .style('font-size', `${LABEL_FONT_SIZE}px`)
      .style('fill', d => this.getNodeLabelColor(d.data))
      .style('paint-order', 'stroke')
      .style('stroke', this.theme.treeLabelOutline)
      .style('stroke-width', '3px')
      .style('stroke-linejoin', 'round')
      .text(d => this.truncateLabel(d.data.name))
      .append('title')
      .text(d => d.data.name)

    // Merge transition
    const nodesMerge = nodesEnter.merge(nodes)
    const activeId = this.getActiveNodeId()

    nodesMerge
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('opacity', d => {
        if (d.data.isDeleted) return 1 - p
        if (d.data.isNew) return Math.min(1, p * 2)
        return 1
      })

    nodesMerge.select('circle.node-dot')
      .attr('fill', d => {
        if (d.data.isNew) return this.theme.treeAdded
        if (d.data.isDeleted) return this.theme.treeDeleted
        if (d.data.isModified) return this.theme.treeModified
        return this.theme.treeLeaf
      })
      .attr('r', d => {
        const base = d.data.type === 'blob' ? 4 : 6
        const activeBoost = d.data.id === activeId ? 1.35 : 1
        if (d.data.isNew) return base * popIn * activeBoost
        if (d.data.isDeleted) return base * (1 - p) * activeBoost
        if (d.data.isModified) return base * (1 + 0.8 * pulse) * activeBoost
        return base * activeBoost
      })
      .attr('stroke', d => d.data.id === activeId ? this.getNodeLabelColor(d.data) : this.theme.treeNodeStroke)
      .attr('stroke-width', d => {
        if (d.data.id === activeId) return 2.5
        if (d.data.isModified) return 1.5 + 2 * pulse
        return 1.5
      })
      .attr('filter', d => {
        if (d.data.id === activeId) return 'url(#node-glow)'
        if (d.data.isNew || d.data.isModified || d.data.isDeleted) return 'url(#node-glow)'
        return null
      })

    nodesMerge.select('text')
      .attr('dx', 0)
      .attr('dy', d => d.data.type === 'blob' ? BLOB_LABEL_DY : TREE_LABEL_DY)
      .attr('text-anchor', 'middle')
      .style('fill', d => this.getNodeLabelColor(d.data))
      .style('stroke', this.theme.treeLabelOutline)
      .style('opacity', d => d.data.id === activeId ? 0 : 1)
      .text(d => this.truncateLabel(d.data.name))

    nodesMerge.select('text title')
      .text(d => this.getNodeDisplayName(d.data))

    this.renderFocusHighlight()

    // Fire particle bursts once per commit, when the transition kicks off.
    this.maybeFireBursts(root, commitIndex, p)
  }

  /** Collect change points and emit a single burst per commit transition. */
  private maybeFireBursts(root: d3.HierarchyNode<TreeNode>, commitIndex: number, p: number) {
    if (!this.onBurst) return
    const key = String(commitIndex)
    // Only fire near the start of a transition, and only once per commit.
    if (p > 0.35 || this.lastBurstKey === key) return
    this.lastBurstKey = key

    const transform = d3.zoomTransform(this.svg.node()!)
    const points: BurstPoint[] = []
    for (const d of root.descendants() as d3.HierarchyPointNode<TreeNode>[]) {
      let kind: BurstPoint['kind'] | null = null
      if (d.data.isNew) kind = 'added'
      else if (d.data.isDeleted) kind = 'deleted'
      else if (d.data.isModified) kind = 'modified'
      if (!kind) continue
      // Node coords live in `g` space (base translate 0,40 then zoom). Apply zoom transform.
      const gx = d.x
      const gy = d.y + 40
      points.push({
        x: transform.applyX(gx),
        y: transform.applyY(gy),
        kind
      })
    }
    if (points.length) this.onBurst(points)
  }

  resize(width: number, height: number) {
    this.width = width
    this.height = height
    this.treeLayout.size([Math.max(width - 120, 480), height - 120])
  }

  setTheme(theme: TreeRendererOptions['theme']) {
    this.theme = theme
  }

  setOnBurst(cb: (points: BurstPoint[]) => void) {
    this.onBurst = cb
  }

  destroy() {
    this.svg.on('click.focus-clear', null)
    this.hoveredId = null
    this.pinnedId = null
    this.nodePositions.clear()
    this.svg.selectAll('*').remove()
  }
}
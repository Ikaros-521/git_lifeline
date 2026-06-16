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

export class TreeRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  private g: d3.Selection<SVGGElement, unknown, null, undefined>
  private width: number
  private height: number
  private theme: TreeRendererOptions['theme']
  private treeLayout: d3.TreeLayout<TreeNode>
  private onBurst?: (points: BurstPoint[]) => void
  /** Commit index of the last fired burst, to avoid re-firing every animation frame. */
  private lastBurstKey = ''

  private getNodeLabelColor(node: TreeNode): string {
    if (node.isNew) return this.theme.treeLabelAdded
    if (node.isDeleted) return this.theme.treeLabelDeleted
    if (node.isModified) return this.theme.treeLabelModified
    return this.theme.treeLabelColor
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

    this.treeLayout = d3.tree<TreeNode>()
      .size([this.width - 200, this.height - 120])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.5))

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

    // Apply the tree layout
    this.treeLayout(root)

    // Join links (edges)
    const links = this.g.selectAll<SVGPathElement, d3.HierarchyPointLink<TreeNode>>('path.link')
      .data(root.links(), d => `${d.source.data.id}-${d.target.data.id}`)

    links.exit()
      .transition()
      .duration(300)
      .attr('opacity', 0)
      .remove()

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

    nodes.exit()
      .transition()
      .duration(300)
      .attr('opacity', 0)
      .remove()

    const nodesEnter = nodes.enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('opacity', 0)

    // Add circles for tree nodes
    nodesEnter.append('circle')
      .attr('r', d => d.data.type === 'blob' ? 4 : 6)
      .attr('fill', d => {
        if (d.data.isNew) return this.theme.treeAdded
        if (d.data.isDeleted) return this.theme.treeDeleted
        if (d.data.isModified) return this.theme.treeModified
        return this.theme.treeLeaf
      })
      .attr('stroke', this.theme.treeNodeStroke)
      .attr('stroke-width', 1.5)

    // Add labels for nodes
    nodesEnter.append('text')
      .attr('dx', d => d.data.type === 'blob' ? 8 : 0)
      .attr('dy', d => d.data.type === 'blob' ? 4 : -8)
      .attr('text-anchor', d => d.data.type === 'blob' ? 'start' : 'middle')
      .style('font-size', '11px')
      .style('fill', d => this.getNodeLabelColor(d.data))
      .style('paint-order', 'stroke')
      .style('stroke', this.theme.treeLabelOutline)
      .style('stroke-width', '3px')
      .style('stroke-linejoin', 'round')
      .text(d => d.data.name)

    // Merge transition
    const nodesMerge = nodesEnter.merge(nodes)

    nodesMerge
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('opacity', d => {
        if (d.data.isDeleted) return 1 - p
        if (d.data.isNew) return Math.min(1, p * 2)
        return 1
      })

    nodesMerge.select('circle')
      .attr('fill', d => {
        if (d.data.isNew) return this.theme.treeAdded
        if (d.data.isDeleted) return this.theme.treeDeleted
        if (d.data.isModified) return this.theme.treeModified
        return this.theme.treeLeaf
      })
      .attr('r', d => {
        const base = d.data.type === 'blob' ? 4 : 6
        if (d.data.isNew) return base * popIn               // bounce in from 0
        if (d.data.isDeleted) return base * (1 - p)         // shrink out
        if (d.data.isModified) return base * (1 + 0.8 * pulse) // pulse swell
        return base
      })
      .attr('stroke', this.theme.treeNodeStroke)
      .attr('stroke-width', d => d.data.isModified ? 1.5 + 2 * pulse : 1.5)
      .attr('filter', d =>
        (d.data.isNew || d.data.isModified || d.data.isDeleted) ? 'url(#node-glow)' : null
      )

    nodesMerge.select('text')
      .style('fill', d => this.getNodeLabelColor(d.data))
      .style('stroke', this.theme.treeLabelOutline)
      .text(d => d.data.name)

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
  }

  setTheme(theme: TreeRendererOptions['theme']) {
    this.theme = theme
  }

  setOnBurst(cb: (points: BurstPoint[]) => void) {
    this.onBurst = cb
  }

  destroy() {
    this.svg.selectAll('*').remove()
  }
}
import * as d3 from 'd3'
import type { TreeNode } from '../data/types'

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
  }
}

export class TreeRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  private g: d3.Selection<SVGGElement, unknown, null, undefined>
  private width: number
  private height: number
  private theme: TreeRendererOptions['theme']
  private treeLayout: d3.TreeLayout<TreeNode>

  constructor(opts: TreeRendererOptions) {
    this.svg = d3.select(opts.svgEl)
    this.width = opts.width
    this.height = opts.height
    this.theme = opts.theme

    // Clear previous content
    this.svg.selectAll('*').remove()

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

  update(treeData: TreeNode, interProgress: number) {
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

    linksEnter.merge(links)
      .transition()
      .duration(400)
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
      .attr('opacity', d => d.target.data.isDeleted ? 1 - interProgress : 1)

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
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)

    // Add labels for nodes
    nodesEnter.append('text')
      .attr('dx', d => d.data.type === 'blob' ? 8 : 0)
      .attr('dy', d => d.data.type === 'blob' ? 4 : -8)
      .attr('text-anchor', d => d.data.type === 'blob' ? 'start' : 'middle')
      .style('font-size', '11px')
      .style('fill', '#ccc')
      .text(d => d.data.name)

    // Merge transition
    const nodesMerge = nodesEnter.merge(nodes)

    nodesMerge.transition()
      .duration(400)
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('opacity', d => d.data.isDeleted ? 1 - interProgress : 1)

    nodesMerge.select('circle')
      .transition()
      .duration(400)
      .attr('fill', d => {
        if (d.data.isNew) return this.theme.treeAdded
        if (d.data.isDeleted) return this.theme.treeDeleted
        if (d.data.isModified) return this.theme.treeModified
        return this.theme.treeLeaf
      })
      .attr('r', d => {
        if (d.data.type === 'blob') return 4 + interProgress * 2
        return 6
      })

    nodesMerge.select('text')
      .style('fill', d => {
        if (d.data.isNew) return this.theme.treeAdded
        if (d.data.isDeleted) return this.theme.treeDeleted
        return this.theme.treeLeaf
      })
      .text(d => d.data.name)
  }

  resize(width: number, height: number) {
    this.width = width
    this.height = height
  }

  setTheme(theme: TreeRendererOptions['theme']) {
    this.theme = theme
  }

  destroy() {
    this.svg.selectAll('*').remove()
  }
}
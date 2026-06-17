interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  color: string
  life: number
  maxLife: number
  type: 'background' | 'sparkle'
}

export class ParticleSystem {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private particles: Particle[] = []
  private animationId: number | null = null
  private running = false
  private color: string = '#4ade80'
  private count: number = 80

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.resize()
  }

  resize() {
    this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio
    this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
  }

  setTheme(color: string, count: number) {
    this.color = color
    this.count = count
  }

  /** Spawn particles at a specific position (for add/delete animations) */
  spawnBurst(x: number, y: number, color: string, n: number = 15) {
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.5
      const speed = 40 + Math.random() * 60
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        alpha: 1,
        color,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.6,
        type: 'sparkle'
      })
    }
  }

  start() {
    this.running = true
    this.loop()
  }

  stop() {
    this.running = false
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  /** Pause the automatic animation loop (e.g. during video export). */
  pause() {
    this.stop()
  }

  /** Resume the automatic animation loop. */
  resume() {
    if (!this.running) this.start()
  }

  /** Advance simulation by dt seconds and redraw (for export stepping). */
  step(dt: number) {
    this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight)
    this.simulate(dt)
    this.draw()
  }

  private loop() {
    if (!this.running) return
    this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight)
    this.simulate(1 / 60)
    this.draw()
    this.animationId = requestAnimationFrame(() => this.loop())
  }

  private simulate(dt: number) {
    // Maintain background particle count
    while (this.particles.filter(p => p.type === 'background').length < this.count) {
      this.particles.push({
        x: Math.random() * this.canvas.clientWidth,
        y: Math.random() * this.canvas.clientHeight,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        size: 1 + Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.4,
        color: this.color,
        life: 0,
        maxLife: 3 + Math.random() * 4,
        type: 'background'
      })
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life += dt
      p.x += p.vx * dt
      p.y += p.vy * dt

      if (p.type === 'background') {
        // Wrap around screen edges
        if (p.x < 0) p.x = this.canvas.clientWidth
        if (p.x > this.canvas.clientWidth) p.x = 0
        if (p.y < 0) p.y = this.canvas.clientHeight
        if (p.y > this.canvas.clientHeight) p.y = 0
      }

      if (p.life >= p.maxLife) {
        if (p.type === 'sparkle') {
          this.particles.splice(i, 1)
        } else {
          p.life = 0
          p.x = Math.random() * this.canvas.clientWidth
          p.y = Math.random() * this.canvas.clientHeight
        }
      }
    }
  }

  private draw() {
    for (const p of this.particles) {
      const alpha = p.type === 'sparkle'
        ? Math.max(0, 1 - p.life / p.maxLife)
        : p.alpha * (0.5 + 0.5 * Math.sin(p.life * 2))

      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      this.ctx.fillStyle = p.color
      this.ctx.globalAlpha = alpha
      this.ctx.fill()
    }
    this.ctx.globalAlpha = 1
  }
}
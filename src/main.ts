import { Howl } from "howler"

const GAME_SIZE = 100
const START_SPEED = 0.004
const MAX_SPEED = 0.012
const ZOOM_DURATION = 300
const ZOOM_STRENGTH = 0.05
const RING_MARGIN = 5
const BALL_RADIUS = 5
const RING_RADIUS = GAME_SIZE / 2 - BALL_RADIUS - RING_MARGIN
const INNER_SIZE = 0.75
const PARTICLE_MAX_AGE = 0.1

const hitmarkerSound = new Howl({ src: ["/hitmarker.mp3"] })
const missSound = new Howl({ src: ["/miss.wav"] })
const canvas = document.getElementById("canvas") as HTMLCanvasElement

function setupCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
  const parent = canvas.parentElement as HTMLElement
  const minSide = Math.min(parent.clientWidth, parent.clientHeight)
  canvas.style.width = canvas.style.height = minSide + "px"
  canvas.width = canvas.height = minSide * window.devicePixelRatio
  ctx.resetTransform()
  const scale = (minSide / GAME_SIZE) * window.devicePixelRatio
  ctx.scale(scale, scale)
  ctx.lineCap = "round"
  ctx.fillStyle = "black"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = "bold 10px sans-serif"
  return ctx
}

const angleToPos = (angle: number) => ({
  x: 50 + RING_RADIUS * Math.cos(angle),
  y: 50 + RING_RADIUS * Math.sin(angle),
})

let ctx = setupCanvas(canvas)
window.onresize = () => (ctx = setupCanvas(canvas))

type Particle = {
  age: number
  angle: number
}

type GameState = {
  type: "instructions" | "playing" | "gameover"
  score: number
  ballAngle: number
  particles: Particle[]
  dir: 1 | -1
  targetAngle: number
  zoom: number
}

const state: GameState = {
  type: "instructions",
  score: 0,
  ballAngle: 0,
  particles: [],
  dir: -1,
  targetAngle: Math.random() * 2 * Math.PI,
  zoom: 0,
}

function isOnTarget() {
  const playerPos = angleToPos(state.ballAngle)
  const targetPos = angleToPos(state.targetAngle)
  const dist = Math.hypot(playerPos.x - targetPos.x, playerPos.y - targetPos.y)
  return dist < BALL_RADIUS * 2
}

const drawCircle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string
) => {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(x, y, r, r, 0, 0, 2 * Math.PI)
  ctx.fill()
}

function draw(ctx: CanvasRenderingContext2D) {
  if (state.type === "instructions") {
    ctx.fillStyle = "black"
    ctx.font = "bold 5px sans-serif"
    ctx.fillText("spacebar or click", 50, 50)
    return
  }
  ctx.save()
  ctx.clearRect(0, 0, GAME_SIZE, GAME_SIZE)
  if (state.zoom > 0) {
    const zoom = 1 + state.zoom ** 2 * ZOOM_STRENGTH
    ctx.translate(GAME_SIZE / 2, GAME_SIZE / 2)
    ctx.scale(zoom, zoom)
    ctx.translate(-GAME_SIZE / 2, -GAME_SIZE / 2)
  }
  const fgColor = state.type === "gameover" ? "white" : "black"
  const bgColor = state.type === "gameover" ? "black" : "white"
  ctx.fillStyle = state.type === "gameover" ? "white" : "black"
  ctx.strokeStyle = state.type === "gameover" ? "white" : "black"

  ctx.fillStyle = state.type === "gameover" ? "#00000040" : "#ffffff40"
  ctx.fillRect(0, 0, GAME_SIZE, GAME_SIZE)
  document.body.style.backgroundColor = bgColor

  const MIN_RADIUS = 1
  state.particles.forEach((p) => {
    const radius = BALL_RADIUS * (1 - p.age / PARTICLE_MAX_AGE)
    const pos = angleToPos(p.angle)
    if (radius > MIN_RADIUS) drawCircle(ctx, pos.x, pos.y, radius, fgColor)
  })

  const onTarget = isOnTarget()
  const pos1 = angleToPos(state.targetAngle)
  drawCircle(ctx, pos1.x, pos1.y, BALL_RADIUS, fgColor)
  const pos2 = angleToPos(state.ballAngle)
  drawCircle(ctx, pos2.x, pos2.y, BALL_RADIUS, fgColor)
  if (onTarget) {
    drawCircle(ctx, pos1.x, pos1.y, BALL_RADIUS * INNER_SIZE, bgColor)
    drawCircle(ctx, pos2.x, pos2.y, BALL_RADIUS * INNER_SIZE, bgColor)
  }
  ctx.fillStyle = fgColor
  ctx.fillText(state.score.toString(), 50, 50)
  ctx.restore()
}

const curSpeed = (score: number) =>
  MAX_SPEED - (MAX_SPEED - START_SPEED) / (1 + score * 0.01)

function tick(dt: number, ctx: CanvasRenderingContext2D) {
  if (state.type === "playing")
    state.ballAngle += dt * curSpeed(state.score) * state.dir
  if (state.zoom > 0) state.zoom -= dt / ZOOM_DURATION
  state.particles.push({
    age: 0,
    angle: state.ballAngle,
  })
  state.particles.forEach((p) => (p.age += dt / 1000))
  state.particles = state.particles.filter((p) => p.age <= PARTICLE_MAX_AGE)
  draw(ctx)
}

function press() {
  if (state.type === "instructions") {
    state.type = "playing"
    return
  }
  if (state.type === "gameover") {
    infoA.style.display = "none"
    state.type = "playing"
    state.score = 0
  } else if (isOnTarget()) {
    state.zoom = 1
    hitmarkerSound.play()
    state.score++
    state.dir = -state.dir as 1 | -1
    state.targetAngle = Math.random() * 2 * Math.PI
  } else {
    missSound.play()
    state.zoom = 1
    state.type = "gameover"
    infoA.style.display = "block"
    if (
      localStorage["high-score"] === undefined ||
      state.score > Number(localStorage["high-score"])
    )
      localStorage["high-score"] = state.score.toString()
  }
}

window.onkeydown = (e) => (e.key === " " ? press() : 0)
window.onpointerdown = press

let lastTime = performance.now()
function loop() {
  const now = performance.now()
  const dt = now - lastTime
  lastTime = now
  tick(dt, ctx)
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)

const infoA = document.getElementById("info-a") as HTMLAnchorElement
infoA.onpointerdown = (e) => e.stopPropagation()
infoA.style.display = "none"

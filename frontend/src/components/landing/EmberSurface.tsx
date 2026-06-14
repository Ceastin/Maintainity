import { useEffect, useRef } from "react"

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  vec2 shift = vec2(100.0);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - u_res * 0.5) / min(u_res.x, u_res.y);
  uv += u_mouse * 0.03;

  float t = u_time * 0.08;
  vec2 p = uv * 2.2;

  float n1 = fbm(p + vec2(t * 0.6, t * 0.3));
  float n2 = fbm(p * 1.4 - vec2(t * 0.2, t * 0.5));

  float pattern = smoothstep(0.25, 0.75, n1 * 0.8 + n2 * 0.2);

  vec3 mint = vec3(0.72, 0.95, 0.88);
  vec3 seaBlue = vec3(0.42, 0.72, 0.82);
  vec3 deepTeal = vec3(0.14, 0.42, 0.48);
  vec3 softWhite = vec3(0.94, 0.99, 0.98);

  vec3 col = mix(mint, seaBlue, pattern);
  col = mix(col, deepTeal, n2 * 0.35);
  col = mix(col, softWhite, n1 * 0.18);

  float wave = 0.5 + 0.5 * sin((uv.x + uv.y) * 4.0 + t * 2.0);
  col += vec3(0.05, 0.10, 0.08) * wave * 0.18;

  float glow = pow(max(0.0, 1.0 - length(uv) * 0.85), 1.8);
  col += vec3(0.10, 0.18, 0.16) * glow * 0.12;

  float vignette = 1.0 - dot(uv, uv) * 0.28;
  col *= clamp(vignette, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export default function EmberSurface() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false })
    if (!gl) return

    const vs = createShader(gl, gl.VERTEX_SHADER, VERT)
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return

    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)

    const posLoc = gl.getAttribLocation(program, "a_pos")
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(program, "u_time")
    const uRes = gl.getUniformLocation(program, "u_res")
    const uMouse = gl.getUniformLocation(program, "u_mouse")

    let mouseX = 0, mouseY = 0
    let targetMX = 0, targetMY = 0
    let raf = 0

    const onMove = (e: MouseEvent) => {
      targetMX = (e.clientX / window.innerWidth) * 2 - 1
      targetMY = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener("mousemove", onMove)

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener("resize", resize)

    const startTime = performance.now()
    const render = () => {
      mouseX += (targetMX - mouseX) * 0.04
      mouseY += (targetMY - mouseY) * 0.04
      gl.uniform1f(uTime, (performance.now() - startTime) / 1000)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform2f(uMouse, mouseX, -mouseY)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("resize", resize)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buf)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  )
}
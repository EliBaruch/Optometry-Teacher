import { useEffect, useRef } from 'preact/hooks';

interface Drop { x: number; y: number; r: number; vy: number; wait: number; trail: number[]; mass: number }
interface Streak { x: number; y: number; len: number; v: number; a: number }

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Rain on the observatory glass: fine streaks racing down, plus fat beads that
 * cling, then slide and leave a wet trail. Each bead is drawn as a tiny lens:
 * dark rim, an inverted warm glow at the bottom (refraction) and a catchlight.
 */
export function RainGlass({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let w = 0, h = 0, raf = 0, dead = false, last = performance.now();
    let drops: Drop[] = [];
    let streaks: Streak[] = [];

    const mk = (): Drop => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(2, 6.5), vy: 0, wait: rnd(0.5, 6), trail: [], mass: 0 });
    const mkStreak = (): Streak => ({ x: rnd(-40, w + 40), y: rnd(-h, h), len: rnd(30, 110), v: rnd(700, 1250), a: rnd(0.05, 0.22) });

    const resize = () => {
      const cw = canvas.clientWidth || window.innerWidth;
      const ch = canvas.clientHeight || window.innerHeight;
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = cw; h = ch;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const area = (cw * ch) / (1440 * 900);
      drops = Array.from({ length: Math.round(Math.max(22, 46 * area)) }, mk);
      streaks = reduced ? [] : Array.from({ length: Math.round(Math.max(26, 70 * area)) }, mkStreak);
    };

    const bead = (d: Drop) => {
      const { x, y, r } = d;
      // wet trail
      if (d.trail.length > 2) {
        ctx.beginPath();
        ctx.moveTo(x, d.trail[0]! + 0);
        for (let i = 0; i < d.trail.length; i++) ctx.lineTo(x, d.trail[i]!);
        ctx.lineTo(x, y);
        ctx.strokeStyle = 'rgba(190,200,255,0.07)';
        ctx.lineWidth = Math.max(1, r * 0.55);
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      const sy = r * 1.18; // slightly elongated bead
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, sy / r);
      const g = ctx.createRadialGradient(0, r * 0.35, r * 0.1, 0, 0, r);
      g.addColorStop(0, 'rgba(255,214,150,0.5)'); // refracted lamp light, inverted
      g.addColorStop(0.55, 'rgba(120,130,200,0.12)');
      g.addColorStop(1, 'rgba(8,6,20,0.55)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = 'rgba(210,220,255,0.28)';
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(x - r * 0.35, y - r * 0.45, Math.max(0.6, r * 0.18), 0, Math.PI * 2);
      ctx.fill();
    };

    const frame = (now: number) => {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      // streaks
      ctx.lineCap = 'round';
      for (const s of streaks) {
        s.y += s.v * dt;
        s.x -= s.v * dt * 0.12;
        if (s.y - s.len > h) { s.y = -rnd(20, 200); s.x = rnd(-40, w + 40); }
        const g = ctx.createLinearGradient(s.x, s.y - s.len, s.x - s.len * 0.12, s.y);
        g.addColorStop(0, 'rgba(200,210,255,0)');
        g.addColorStop(1, `rgba(214,222,255,${s.a})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - s.len);
        ctx.lineTo(s.x - s.len * 0.12, s.y);
        ctx.stroke();
      }
      // beads
      for (const d of drops) {
        if (!reduced) {
          if (d.vy === 0) {
            d.wait -= dt;
            if (d.wait <= 0 && d.r > 3) d.vy = rnd(20, 60) * (d.r / 4);
            else if (d.wait <= 0) d.wait = rnd(2, 6);
          } else {
            d.y += d.vy * dt;
            d.vy *= Math.random() < 0.02 ? 0.3 : 1; // stick-slip
            if (d.vy < 6) d.vy = 0, d.wait = rnd(1, 5);
            d.trail.push(d.y);
            if (d.trail.length > 28) d.trail.shift();
            if (d.y > h + 20) Object.assign(d, mk(), { y: -10 });
          }
        }
        bead(d);
      }
      raf = reduced ? 0 : requestAnimationFrame(frame);
    };

    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);
    frame(performance.now());
    return () => { dead = true; cancelAnimationFrame(raf); ro?.disconnect(); };
  }, [reduced]);

  return <canvas ref={ref} class="ttl-rain" aria-hidden="true" />;
}

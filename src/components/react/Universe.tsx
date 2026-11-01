/**
 * Universe (WebGL2). One rAF loop, adaptive quality, scroll/auto-tour = travel along z.
 * Journey: star tunnel -> pulsar -> planetary system (Kepler) -> black hole (point-lens deflection,
 * photon-shadow, Doppler-beamed disc) -> lensed galaxies -> 4D Hopf fibration -> 5D penteract.
 * Visualizations built on real formulas (see #mathematics); scales/speeds are exaggerated, not GR ray tracing.
 * (WebGPU star renderer lives in ../three/webgpu.ts, currently unused.)
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const NOISE = /* glsl */ `
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float h3(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float f3(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n3(p);p*=2.1;a*=.5;}return s;}`;

// Stars/galaxies. Uniforms: uBH (lens pos), uRs (lens r_s). Point-lens equation: theta = (b + sqrt(b^2+4 thetaE^2))/2.
const STAR_VERT = /* glsl */ `
attribute float aSize; attribute float aTemp; attribute float aPhase;
uniform float uTime,uPx,uMax,uRs; uniform vec2 uPointer; uniform vec3 uBH;
varying vec3 vCol; varying float vA;
void main(){
  vec4 mv=modelViewMatrix*vec4(position,1.); float mag=1.;
  vec4 bh=viewMatrix*vec4(uBH,1.); float Dl=-bh.z, Ds=-mv.z;
  if(uRs>0.&&Dl>1.&&Ds>Dl+1.){
    vec2 tb=bh.xy/Dl, b=mv.xy/Ds-tb; float bl=length(b)+1e-5, te2=2.*uRs*(Ds-Dl)/(Dl*Ds);
    float u=bl/sqrt(te2); mag=min(.5*(1.+(u*u+2.)/(u*sqrt(u*u+4.))),4.);
    mv.xy=(tb+b/bl*.5*(bl+sqrt(bl*bl+4.*te2)))*Ds;
  }
  vec4 clip=projectionMatrix*mv; vec2 d=clip.xy/clip.w-uPointer; float f=exp(-dot(d,d)*30.);
  mv.xy+=normalize(d+1e-4)*f*.02*abs(mv.z);
  float tw=.85+.15*sin(uTime*1.3+aPhase*40.);
  vCol=mix(vec3(1.,.82,.62),vec3(.64,.74,1.),aTemp)*tw; vA=clamp(.35+aSize*.25,0.,1.);
  gl_PointSize=clamp(aSize*mag*uPx*(260./-mv.z),1.,uMax); gl_Position=projectionMatrix*mv;
}`;
const STAR_FRAG = /* glsl */ `varying vec3 vCol; varying float vA;
void main(){float d=length(gl_PointCoord-.5); float a=1.-smoothstep(0.,.5,d); gl_FragColor=vec4(vCol,a*a*vA);}`;

// Nebula: domain-warped fbm, uOct = quality (octaves).
const NEB_FRAG = NOISE + /* glsl */ `
uniform float uTime,uSeed; uniform int uOct; uniform vec3 uA,uB; varying vec2 vUv;
float fb(vec2 p){float a=.5,s=0.;for(int i=0;i<6;i++){if(i>=uOct)break;s+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
void main(){vec2 p=(vUv-.5)*vec2(3.,2.)+uSeed; vec2 q=vec2(fb(p+uTime*.01),fb(p+vec2(5.2,1.3)));
 float d=smoothstep(.35,.85,fb(p+3.*q)); float v=1.-smoothstep(.2,.5,length((vUv-.5)*vec2(1.,1.5)));
 gl_FragColor=vec4(mix(uA,uB,q.x)*d*v,d*v*.5);}`;

// Planet: procedural 3D fbm surface, Lambert + terminator + Fresnel atmosphere.
const PLANET_VERT = `varying vec3 vO,vN,vP; void main(){vO=position;vN=mat3(modelMatrix)*normal;vP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vP,1.);}`;
const PLANET_FRAG = NOISE + /* glsl */ `
uniform vec3 uSun,uC1,uC2,uAtm; uniform float uType,uSeed; varying vec3 vO,vN,vP;
void main(){vec3 p=normalize(vO)*2.2+uSeed;
 float t=uType<.5?f3(p):f3(vec3(p.x*.5,p.y*7.,p.z*.5)+vec3(f3(p*1.5)*1.4));
 vec3 base=uType<.5?mix(uC1,uC2,smoothstep(.48,.56,t))*(.65+.7*t):mix(uC1,uC2,t);
 vec3 N=normalize(vN),V=normalize(cameraPosition-vP),L=normalize(uSun-vP);
 float l=max(dot(N,L),0.),rim=pow(1.-max(dot(N,V),0.),3.);
 gl_FragColor=vec4(base*(.03+l)+uAtm*rim*(.1+.9*l),1.);}`;

// Accretion disc: T ~ r^-3/4 (1-sqrt(r_in/r))^1/4, local orbital speed v=sqrt(rs/(2(r-rs))), Doppler delta=1/(gamma(1-v.n)), I~delta^3.
const DISK_VERT = `varying vec3 vL,vW; void main(){vL=position;vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);}`;
const DISK_FRAG = NOISE + /* glsl */ `
uniform float uTime,uRs; varying vec3 vL,vW;
void main(){float r=length(vL.xy)/uRs; if(r<3.)discard;
 float T=pow(r/3.,-.75)*pow(max(1.-sqrt(3./r),0.),.25);
 float a=atan(vL.y,vL.x)-uTime*pow(r,-1.5)*5.; float tur=.55+.45*n2(vec2(cos(a),sin(a))*r*1.6);
 float v=sqrt(1./(2.*(r-1.))); vec3 tw=normalize(mat3(modelMatrix)*vec3(-vL.y,vL.x,0.)), nW=normalize(cameraPosition-vW);
 float dl=sqrt(1.-v*v)/(1.-v*dot(tw,nW)); float I=T*T*pow(dl,3.)*tur*(1.-smoothstep(7.,9.,r));
 vec3 c=mix(vec3(1.,.35,.1),vec3(1.,.92,.75),clamp(T*dl*1.3,0.,1.));
 gl_FragColor=vec4(c*I*1.3,clamp(I,0.,1.));}`;

// Hopf fibration: (z1,z2)=(cos(eta)e^{it}, sin(eta)e^{i(t+gam)}) in S^3, 4D rotation uR, perspective p=xyz/(d-w).
const HOPF_VERT = `uniform mat4 uR; uniform float uD,uScale,uPx; uniform vec3 uO; varying vec3 vCol; varying float vA;
void main(){float e=position.x,g=position.y,t=position.z;
 vec4 r=uR*vec4(cos(e)*cos(t),cos(e)*sin(t),sin(e)*cos(t+g),sin(e)*sin(t+g)); vec3 p=r.xyz/(uD-r.w);
 vec4 mv=viewMatrix*vec4(uO+p*uScale,1.); vCol=mix(vec3(.9,.7,.4),vec3(.35,.82,.9),.5+.5*cos(2.*e)); vA=.8;
 gl_PointSize=clamp(2.2*uPx*(260./-mv.z),1.,6.); gl_Position=projectionMatrix*mv;}`;

let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
const LEN = 400;

function pts(n: number, fill: (o: { p: number[]; s: number; t: number }) => void) {
  const pos = new Float32Array(n * 3), s = new Float32Array(n), t = new Float32Array(n), ph = new Float32Array(n), o = { p: [0, 0, 0], s: 1, t: 0.5 };
  for (let i = 0; i < n; i++) { fill(o); pos.set(o.p, i * 3); s[i] = o.s; t[i] = o.t; ph[i] = rnd(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(s, 1));
  g.setAttribute('aTemp', new THREE.BufferAttribute(t, 1)); g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  return g;
}
const rot4 = (i: number, j: number, a: number) => { const m = new THREE.Matrix4(), e = m.elements, c = Math.cos(a), s = Math.sin(a); e[i * 4 + i] = c; e[j * 4 + j] = c; e[j * 4 + i] = -s; e[i * 4 + j] = s; return m; };
const SECTORS: [number, string][] = [[-45, 'PULSAR · 3D'], [-110, 'PLANETARY SYSTEM · KEPLER'], [-200, 'BLACK HOLE · POINT-LENS'], [-290, 'LENSED GALAXIES'], [-1e9, 'S³ HOPF FIBRATION · 4D / PENTERACT · 5D']];

export default function Universe() {
  const hud = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = cv.current!, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = matchMedia('(max-width: 800px)').matches || navigator.maxTouchPoints > 0;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); }
    catch { if (hud.current) hud.current.textContent = 'STATIC · no WebGL'; return; }

    const levels = [1, 0.55, 0.28, 0.1]; let level = reduced ? 2 : mobile ? 1 : 0;
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
    const BH = new THREE.Vector3(-16, 2, -150), RS = 3.2, C = new THREE.Vector3(14, -3, -80);
    const U = { uTime: { value: 0 }, uPx: { value: 1 }, uPointer: { value: new THREE.Vector2(9, 9) }, uBH: { value: BH }, uRs: { value: RS }, uMax: { value: 14 } };
    const starMat = new THREE.ShaderMaterial({ vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const bigMat = new THREE.ShaderMaterial({ vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, uniforms: { ...U, uMax: { value: 110 }, uRs: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const scalable: [THREE.BufferGeometry, number][] = [];
    const add = (g: THREE.BufferGeometry, n: number, m = starMat) => { scalable.push([g, n]); return new THREE.Points(g, m); };

    const NS = mobile ? 14000 : 42000;
    scene.add(add(pts(NS, o => { const r = Math.sqrt(rnd()) * 80, a = rnd() * 6.283; o.p = [Math.cos(a) * r, Math.sin(a) * r * 0.6, -rnd() * (LEN + 60) + 30]; o.s = 0.4 + Math.pow(rnd(), 7) * 3.2; o.t = Math.pow(rnd(), 1.6); }), NS));
    const galaxy = (n: number, R: number, pos: number[], rx: number) => {
      const g = new THREE.Group(); const k = mobile ? 0.4 : 1, N = Math.floor(n * k);
      g.add(add(pts(N, o => { const arm = Math.floor(rnd() * 3), r = Math.pow(rnd(), 0.6) * R, th = r * (8.8 / R) + (arm * 6.283) / 3 + gauss() * 0.3; o.p = [Math.cos(th) * r, gauss() * 0.04 * R * (1 - r / (1.3 * R)), Math.sin(th) * r]; o.s = 0.5 + Math.pow(rnd(), 5) * 2; o.t = Math.min(1, r / R + 0.1); }), N));
      g.position.set(pos[0], pos[1], pos[2]); g.rotation.x = rx; scene.add(g); return g;
    };
    const gals = [galaxy(16000, 40, [14, 4, -230], 0.9), galaxy(5000, 16, [-60, 22, -262], 0.5), galaxy(5000, 14, [52, -26, -245], 1.2), galaxy(4000, 12, [-8, 42, -330], 0.3)];

    // nebulae (Halpha red/OIII cyan/gold)
    const nebs = [[0, -8, -40, [0.7, 0.15, 0.1], [0.2, 0.4, 0.6]], [1, 12, -100, [0.8, 0.5, 0.2], [0.4, 0.2, 0.5]], [2, -20, -205, [0.2, 0.5, 0.6], [0.7, 0.3, 0.2]], [3, 10, -270, [0.8, 0.6, 0.3], [0.2, 0.3, 0.6]]].map(([sd, x, z, a, b]: any) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(260, 160), new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: NEB_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: U.uTime, uSeed: { value: sd * 7.3 }, uOct: { value: 5 }, uA: { value: new THREE.Vector3(...a) }, uB: { value: new THREE.Vector3(...b) } } }));
      m.position.set(x, 0, z); m.renderOrder = -1; scene.add(m); return m;
    });

    // pulsar: neutron star + two rotating beams (rotation sped up for visibility)
    const pulsar = new THREE.Group(); pulsar.position.set(6, 3, -35);
    const pc = add(pts(1, o => { o.p = [0, 0, 0]; o.s = 3; o.t = 0.9; }), 1, bigMat); pulsar.add(pc);
    const tilt = new THREE.Group(); tilt.rotation.z = 0.5; pulsar.add(tilt);
    const cg = new THREE.ConeGeometry(0.7, 18, 24, 1, true); cg.translate(0, -9, 0);
    const bm = new THREE.MeshBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const b1 = new THREE.Mesh(cg, bm), b2 = new THREE.Mesh(cg, bm); b2.rotation.x = Math.PI; tilt.add(b1, b2); scene.add(pulsar);

    // star + planets; Kepler: omega ~ a^-3/2
    scene.add(add(pts(1, o => { o.p = [C.x, C.y, C.z]; o.s = 9; o.t = 0.45; }), 1, bigMat));
    const PL = [[8, 0.9, 0, [.05, .15, .35], [.35, .4, .2], [.3, .6, 1], 0], [14, 1.1, 0, [.4, .2, .12], [.7, .4, .25], [.8, .4, .2], 3], [24, 3, 1, [.75, .6, .4], [.5, .35, .25], [.6, .5, .3], 7], [36, 2, 1, [.5, .7, .8], [.7, .85, .9], [.5, .8, 1], 11]] as const;
    const planets = PL.map(([a, r, ty, c1, c2, at, sd]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 48), new THREE.ShaderMaterial({ vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG, uniforms: { uSun: { value: C }, uC1: { value: new THREE.Vector3(...c1) }, uC2: { value: new THREE.Vector3(...c2) }, uAtm: { value: new THREE.Vector3(...at) }, uType: { value: ty }, uSeed: { value: sd } } }));
      if (ty === 1 && a === 24) { const rg = new THREE.Mesh(new THREE.RingGeometry(r * 1.4, r * 2.3, 96), new THREE.MeshBasicMaterial({ color: 0xc9b38a, transparent: true, opacity: 0.5, side: THREE.DoubleSide })); rg.rotation.x = 1.2; m.add(rg); }
      scene.add(m); return m;
    });

    // black hole: shadow b_c = (3*sqrt(3)/2) r_s, photon ring, disc from ISCO 3 r_s
    const bhb = new THREE.Group(); bhb.position.copy(BH); scene.add(bhb);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(2.598 * RS, 64), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.598 * RS, 2.9 * RS, 96), new THREE.MeshBasicMaterial({ color: 0xd9b46a, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })); ring.position.z = 0.05;
    bhb.add(sh, ring);
    const disk = new THREE.Mesh(new THREE.RingGeometry(3 * RS, 9 * RS, 160, 6), new THREE.ShaderMaterial({ vertexShader: DISK_VERT, fragmentShader: DISK_FRAG, uniforms: { uTime: U.uTime, uRs: { value: RS } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    disk.position.copy(BH); disk.rotation.set(1.35, 0, 0.3); scene.add(disk);

    // 4D Hopf fibration (GPU) and 5D penteract (CPU, 80 edges)
    const FE = mobile ? 5 : 7, FG = 12, FT = mobile ? 100 : 180, hp = new Float32Array(FE * FG * FT * 3); let k = 0;
    for (let a = 0; a < FE; a++) for (let b = 0; b < FG; b++) for (let c = 0; c < FT; c++) { hp[k++] = ((a + 0.5) / FE) * Math.PI / 2; hp[k++] = (b / FG) * 6.283; hp[k++] = (c / FT) * 6.283; }
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(hp, 3)); scalable.push([hg, FE * FG * FT]);
    const hmat = new THREE.ShaderMaterial({ vertexShader: HOPF_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uR: { value: new THREE.Matrix4() }, uD: { value: 1.6 }, uScale: { value: 9 }, uPx: U.uPx, uO: { value: new THREE.Vector3(-9, 0, -306) } } });
    const hopf = new THREE.Points(hg, hmat); hopf.frustumCulled = false; scene.add(hopf);
    const V5: number[][] = [], E5: number[][] = [];
    for (let i = 0; i < 32; i++) V5.push([0, 1, 2, 3, 4].map(b => ((i >> b) & 1 ? 1 : -1)));
    for (let i = 0; i < 32; i++) for (let b = 0; b < 5; b++) if (!((i >> b) & 1)) E5.push([i, i | (1 << b)]);
    const pg = new THREE.BufferGeometry(), pa = new THREE.BufferAttribute(new Float32Array(E5.length * 6), 3); pa.setUsage(THREE.DynamicDrawUsage); pg.setAttribute('position', pa);
    const pent = new THREE.LineSegments(pg, new THREE.LineBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })); pent.frustumCulled = false; scene.add(pent);
    const P5 = [[0, 3, 0.31], [1, 4, 0.23], [2, 3, 0.17], [0, 4, 0.11]];
    const proj5 = (v: number[], t: number) => {
      const x = v.slice(); for (const [i, j, w] of P5) { const c = Math.cos(w * t), s = Math.sin(w * t), a = x[i], b = x[j]; x[i] = a * c - b * s; x[j] = a * s + b * c; }
      const q = [0, 1, 2, 3].map(i => x[i] / (3 - x[4])); return [0, 1, 2].map(i => (q[i] / (3 - q[3])) * 5.5 + [9, 0, -318][i]);
    };

    const applyQuality = () => {
      const f = levels[level];
      scalable.forEach(([g, n]) => g.setDrawRange(0, Math.max(1, Math.floor(n * f))));
      nebs.forEach(m => { const u = (m.material as THREE.ShaderMaterial).uniforms; u.uOct.value = [5, 4, 3, 2][level]; m.visible = level < 3; });
      const dpr = Math.min(devicePixelRatio, [1.75, 1.25, 1, 1][level]); renderer.setPixelRatio(dpr); U.uPx.value = dpr; resize();
    };
    function resize() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
    let prog = 0, target = 0, px = 0, py = 0, tx = 0, ty = 0, tour = false, frame = 0;
    const onScroll = () => { if (tour) return; const m = document.documentElement.scrollHeight - innerHeight; target = m > 0 ? scrollY / m : 0; };
    const onMove = (e: PointerEvent) => { tx = (e.clientX / innerWidth) * 2 - 1; ty = -((e.clientY / innerHeight) * 2 - 1); };
    const onQ = (e: Event) => { level = Math.max(0, Math.min(3, (e as CustomEvent<number>).detail)); applyQuality(); draw(); };
    const onKey = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 't' && !(e.target as HTMLElement)?.closest('input,textarea')) tour = !tour; };
    addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', resize); addEventListener('pointermove', onMove, { passive: true });
    addEventListener('universe:quality', onQ); addEventListener('keydown', onKey); onScroll(); applyQuality();

    const clock = new THREE.Clock(), RZ = new THREE.Matrix4();
    function draw() {
      const t = U.uTime.value; prog += (target - prog) * 0.05; px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      cam.position.set(px * 1.2 + Math.sin(prog * 9) * 3, py * 0.8 + Math.sin(t * 0.2) * 0.4, 20 - prog * LEN * 0.88);
      cam.rotation.set(py * 0.03, -px * 0.04 + Math.sin(prog * 9 + 1) * 0.04, Math.sin(t * 0.1) * 0.02);
      U.uPointer.value.set(tx, ty);
      gals.forEach((g, i) => (g.rotation.y += 0.0004 * (i + 1)));
      planets.forEach((p, i) => { const a = PL[i][0], th = i * 1.7 + (3 * t) / Math.pow(a, 1.5); p.position.set(C.x + a * Math.cos(th), C.y + a * 0.12 * Math.sin(th), C.z + a * Math.sin(th)); p.rotation.y = t * 0.3; });
      pulsar.rotation.y = t * 4.2; bhb.quaternion.copy(cam.quaternion);
      hmat.uniforms.uR.value.copy(rot4(0, 3, 0.31 * t)).multiply(rot4(2, 3, 0.23 * t)).multiply(RZ.copy(rot4(0, 1, 0.17 * t)));
      const arr = pa.array as Float32Array; E5.forEach(([a, b], i) => arr.set([...proj5(V5[a], t), ...proj5(V5[b], t)], i * 6)); pa.needsUpdate = true;
      renderer.render(scene, cam);
      if (hud.current && frame++ % 12 === 0) {
        const z = cam.position.z, s = SECTORS.find(([lim]) => z > lim)![1];
        hud.current.textContent = `WebGL2 · ${['ULTRA', 'HIGH', 'BALANCED', 'LOW'][level]} · TRAVEL ${(prog * 100).toFixed(0)}% · z=${z.toFixed(0)} · ${s} · [T] auto-tour ${tour ? 'ON' : 'off'}`;
      }
    }
    let raf = 0, acc = 0, n = 0;
    function loop() {
      raf = requestAnimationFrame(loop); const dt = clock.getDelta(); U.uTime.value += dt;
      if (tour) target = Math.min(1, target + dt * 0.012);
      draw(); acc += dt; if (++n === 120) { if (acc / 120 > 0.024 && level < 3) { level++; applyQuality(); } acc = 0; n = 0; }
    }
    const start = () => { if (!raf && !reduced && !document.hidden) { clock.getDelta(); loop(); } }, stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const onVis = () => (document.hidden ? stop() : start()); document.addEventListener('visibilitychange', onVis);
    if (reduced) { draw(); addEventListener('scroll', draw, { passive: true }); } else start();

    return () => {
      stop(); document.removeEventListener('visibilitychange', onVis);
      ['scroll', 'resize', 'pointermove', 'universe:quality', 'keydown'].forEach((ev, i) => removeEventListener(ev, [onScroll, resize, onMove, onQ, onKey][i] as any)); removeEventListener('scroll', draw);
      scene.traverse((o: any) => { o.geometry?.dispose(); (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m: any) => m.dispose()); });
      renderer.dispose();
    };
  }, []);

  return (<><canvas ref={cv} className="universe" aria-hidden="true" /><div ref={hud} className="hud" aria-hidden="true" /></>);
}

/**
 * WebGPU star renderer (WGSL). Same visual model as the WebGL2 path in Universe.tsx.
 * Purpose: draw instanced soft-disc stars; twinkle + pointer repulsion computed in the vertex stage.
 * Uniforms: view-projection (z remapped to WebGPU's 0..1 clip range), time, px scale, resolution, pointer.
 * Cost: one render pass, 6 vertices per star, no depth buffer. Fallback: initWebGPU() returns null -> caller uses WebGL2.
 * Not yet used: compute shaders (motion is vertex-stage only).
 */
const WGSL = /* wgsl */ `
struct U { vp: mat4x4<f32>, time: f32, px: f32, res: vec2<f32>, pointer: vec2<f32>, pad: vec2<f32> };
@group(0) @binding(0) var<uniform> u: U;
struct VOut { @builtin(position) p: vec4<f32>, @location(0) col: vec3<f32>, @location(1) uv: vec2<f32>, @location(2) a: f32 };

@vertex fn vs(@builtin(vertex_index) vi: u32, @location(0) pos: vec3<f32>, @location(1) meta: vec3<f32>) -> VOut {
  var q = array<vec2<f32>, 6>(vec2(-1.0,-1.0), vec2(1.0,-1.0), vec2(-1.0,1.0), vec2(-1.0,1.0), vec2(1.0,-1.0), vec2(1.0,1.0));
  let corner = q[vi];
  var clip = u.vp * vec4<f32>(pos, 1.0);
  let d = clip.xy / clip.w - u.pointer;
  let f = exp(-dot(d, d) * 30.0);
  clip = vec4<f32>(clip.xy + normalize(d + vec2<f32>(1e-4)) * f * 0.03 * clip.w, clip.zw);
  let size = clamp(meta.x * u.px * (260.0 / max(clip.w, 0.1)), 1.0, 14.0);
  clip = vec4<f32>(clip.xy + corner * size / u.res * clip.w, clip.zw);
  let tw = 0.85 + 0.15 * sin(u.time * 1.3 + meta.z * 40.0);
  var o: VOut;
  o.p = clip; o.uv = corner; o.a = clamp(0.35 + meta.x * 0.25, 0.0, 1.0);
  o.col = mix(vec3<f32>(1.0, 0.82, 0.62), vec3<f32>(0.64, 0.74, 1.0), meta.y) * tw;
  return o;
}
@fragment fn fs(i: VOut) -> @location(0) vec4<f32> {
  let a = 1.0 - smoothstep(0.0, 1.0, length(i.uv));
  return vec4<f32>(i.col, a * a * i.a);
}`;

export type StarGPU = {
  render(vp: Float32Array, time: number, px: number, w: number, h: number, pointer: [number, number]): void;
  setQuality(k: number): void;
  dispose(): void;
};

/** data: interleaved [x,y,z,size,temp,phase] per star; groups: instance counts drawn in order. */
export async function initWebGPU(canvas: HTMLCanvasElement, data: Float32Array, groups: number[]): Promise<StarGPU | null> {
  try {
    const nav = navigator as any;
    if (!nav.gpu) return null;
    const adapter = await nav.gpu.requestAdapter();
    if (!adapter) return null;
    const device = await adapter.requestDevice();
    device.pushErrorScope('validation');
    const ctx = canvas.getContext('webgpu') as any;
    if (!ctx) return null;
    const format = nav.gpu.getPreferredCanvasFormat();
    ctx.configure({ device, format, alphaMode: 'premultiplied' });

    const vbuf = device.createBuffer({ size: data.byteLength, usage: 0x20 | 0x8, mappedAtCreation: false }); // VERTEX | COPY_DST
    device.queue.writeBuffer(vbuf, 0, data);
    const ubuf = device.createBuffer({ size: 96, usage: 0x40 | 0x8 }); // UNIFORM | COPY_DST
    const mod = device.createShaderModule({ code: WGSL });
    const add = { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' };
    const pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: mod, entryPoint: 'vs', buffers: [{ arrayStride: 24, stepMode: 'instance', attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' }] }] },
      fragment: { module: mod, entryPoint: 'fs', targets: [{ format, blend: { color: add, alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' } } }] },
      primitive: { topology: 'triangle-list' },
    });
    const info = await mod.getCompilationInfo();
    const bad = info.messages.filter((m: any) => m.type === 'error');
    const perr = await device.popErrorScope();
    if (bad.length || perr) { console.error('WebGPU init failed, using WebGL2:', bad, perr); return null; }
    const bind = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: ubuf } }] });
    const u = new Float32Array(24);
    let k = 1;

    return {
      setQuality(v) { k = v; },
      render(vp, time, px, w, h, pointer) {
        u.set(vp, 0); u[16] = time; u[17] = px; u[18] = w; u[19] = h; u[20] = pointer[0]; u[21] = pointer[1];
        device.queue.writeBuffer(ubuf, 0, u);
        const enc = device.createCommandEncoder();
        const pass = enc.beginRenderPass({ colorAttachments: [{ view: ctx.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
        pass.setPipeline(pipeline); pass.setBindGroup(0, bind); pass.setVertexBuffer(0, vbuf);
        let first = 0;
        for (const g of groups) { pass.draw(6, Math.floor(g * k), 0, first); first += g; }
        pass.end(); device.queue.submit([enc.finish()]);
      },
      dispose() { vbuf.destroy(); ubuf.destroy(); device.destroy(); },
    };
  } catch { return null; }
}

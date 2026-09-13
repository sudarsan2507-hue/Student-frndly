import React, { useEffect, useRef, useState } from 'react';
import voxelSrc from '../assets/login-portrait-voxel.png';
import realSrc from '../assets/login-portrait-color.png';
import './VoxelPortrait.css';

/**
 * VoxelPortrait — full-screen login background.
 *
 * The user's own reference portrait (colourised — the source art is
 * monochrome line-work except the eyes — background knocked out), shown
 * two ways in sequence:
 *
 * 1. A small pixel/voxel grid of it (box-filtered down from the full-res
 *    cutout) built up cell by cell on a canvas, each "cube" a front face
 *    plus two thin bevel faces (top/right) — not WebGL, cheap enough at
 *    ~2,000 cells to redraw every frame with Canvas2D.
 * 2. Once the build finishes, a crossfade to the actual full-resolution
 *    cutout (`login-portrait-color.png`) — the blocky voxel "resolves"
 *    into the real image.
 *
 * The grid is a front-facing block projection (col→x, row→y, no skew),
 * not a true isometric projection — an actual isometric transform is for
 * representing a 3D scene viewed at an angle (terrain, a Minecraft
 * world), and applying it to an already-front-facing portrait rotates
 * the face into an unrecognisable diagonal smear rather than a blocky
 * version of the same face. Cells are centred and fit using the bounding
 * box of the actually-opaque cells (not the padded source grid), so the
 * character isn't pushed off-centre or clipped by leftover transparent
 * margin baked into the source crop.
 *
 * `onComplete` fires once, the moment the build finishes (or immediately
 * if `animate` is false) — the login page uses it to bring in the "log
 * in or sign up?" prompt only once she's fully formed.
 *
 * Cells don't sweep on in row order — each one flies in from its own
 * random angle/distance, on its own staggered timer, so she assembles
 * from every direction at once rather than as a mechanical top-to-bottom
 * scan. Order-of-appearance is shuffled for the same reason.
 */

const ARRIVE_WINDOW_MS = 1750; // cell arrival times are spread across this
const FLIGHT_MIN_MS = 320;
const FLIGHT_MAX_MS = 620;
const BUILD_MS = ARRIVE_WINDOW_MS + FLIGHT_MAX_MS; // last cell to arrive still gets a full flight
const BEVEL = 0.22; // top/right bevel thickness, as a fraction of one cell

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const shade = (r, g, b, f) => `rgb(${r * f | 0},${g * f | 0},${b * f | 0})`;
const easeOutCubic = (p) => 1 - (1 - p) ** 3;

const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

// Critically-damped spring ("SmoothDamp") step — frame-rate independent,
// carries velocity between frames so the cursor parallax glides instead of
// snapping toward each new (noisy) mouse sample. A plain per-frame lerp
// (`cur += (target-cur)*k`) is what was here before: it re-solves from a
// standing start every frame, so it visibly jumps direction on fast mouse
// moves and runs at a different effective speed on every refresh rate.
// This is the same shape of fix a Kalman filter buys you for this kind of
// noisy-measurement/constant-velocity tracking, minus the process-noise
// bookkeeping this 2D pointer-follow doesn't need.
const smoothDamp = (current, velocity, target, smoothTimeMs, dtMs) => {
    const omega = 2 / Math.max(1, smoothTimeMs);
    const x = omega * dtMs;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = current - target;
    const temp = (velocity + omega * change) * dtMs;
    const newVelocity = (velocity - omega * temp) * exp;
    const newValue = target + (change + temp) * exp;
    return [newValue, newVelocity];
};

const VoxelPortrait = ({ animate = true, className = '', onComplete }) => {
    const canvasRef = useRef(null);
    const stageRef = useRef(null);
    const [built, setBuilt] = useState(!animate);

    useEffect(() => {
        const canvas = canvasRef.current;
        const stage = stageRef.current;
        if (!canvas || !stage) return undefined;
        const ctx = canvas.getContext('2d');

        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const moving = animate && !reduced;
        const hasFinePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;

        if (!moving) {
            setBuilt(true);
            onComplete?.();
            return undefined;
        }

        let cells = null;        // { col, row, r, g, b }[], col/row relative to content bbox centre
        let bboxW = 0, bboxH = 0;
        let raf = 0;
        let dpr = Math.min(window.devicePixelRatio || 1, 2);
        let cw = 0, ch = 0; // stage box, CSS px (already excludes reserved chrome via layout)
        let tile = 10;      // cell size in CSS px, computed on resize to fit
        let completed = false;
        const target = { x: 0, y: 0 };
        const cur = { x: 0, y: 0, vx: 0, vy: 0 };
        const SMOOTH_TIME_MS = 220; // roughly how long the parallax takes to settle onto a new target

        const img = new Image();
        img.decoding = 'async';
        img.src = voxelSrc;

        // Front-facing grid: col -> x, row -> y, no skew (see file-level note
        // on why not to run this through an isometric transform).
        const project = (col, row) => ({ x: col * tile, y: row * tile });

        const drawFrame = (elapsedMs, t, idle) => {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, cw, ch);
            if (!cells) return;

            const breathe = idle ? 1 + Math.sin(t * 1.1) * 0.008 : 1;
            const originX = cw / 2 + cur.x * 10;
            const originY = ch / 2 + cur.y * 6;
            const bevel = tile * BEVEL;

            ctx.save();
            ctx.translate(originX, originY);
            ctx.scale(breathe, breathe);

            for (let i = 0; i < cells.length; i++) {
                const c = cells[i];
                const p = clamp01((elapsedMs - c.arrival) / c.flight);
                if (p <= 0) continue;
                const ease = easeOutCubic(p);
                const flying = ease < 1;

                const finalX = c.col * tile, finalY = c.row * tile;
                // Converges toward its final spot from a random angle/distance...
                const x = flying ? finalX + Math.cos(c.flyAngle) * c.flyDist * tile * (1 - ease) : finalX;
                const y = flying ? finalY + Math.sin(c.flyAngle) * c.flyDist * tile * (1 - ease) : finalY;
                // ...while shrinking down from an oversized cube to its true size.
                const scale = flying ? 1 + (c.flyScale - 1) * (1 - ease) : 1;

                if (flying) {
                    ctx.globalAlpha = ease;
                    ctx.save();
                    ctx.translate(x + tile / 2, y + tile / 2);
                    ctx.scale(scale, scale);
                    ctx.translate(-tile / 2, -tile / 2);
                }
                const dx = flying ? 0 : x;
                const dy = flying ? 0 : y;

                ctx.fillStyle = shade(c.r, c.g, c.b, 1);
                ctx.fillRect(dx, dy, tile + 0.6, tile + 0.6); // +0.6 closes hairline seams between cells

                ctx.fillStyle = shade(c.r, c.g, c.b, 1.35);
                ctx.beginPath();
                ctx.moveTo(dx, dy);
                ctx.lineTo(dx + tile, dy);
                ctx.lineTo(dx + tile - bevel, dy - bevel);
                ctx.lineTo(dx - bevel, dy - bevel);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = shade(c.r, c.g, c.b, 0.6);
                ctx.beginPath();
                ctx.moveTo(dx + tile, dy);
                ctx.lineTo(dx + tile, dy + tile);
                ctx.lineTo(dx + tile + bevel, dy + tile - bevel);
                ctx.lineTo(dx + tile + bevel, dy - bevel);
                ctx.closePath();
                ctx.fill();

                if (flying) {
                    ctx.restore();
                    ctx.globalAlpha = 1;
                }
            }
            ctx.restore();
        };

        // Cell size that fits the whole (bbox-trimmed) grid inside the stage,
        // with only a small margin so she reads as close to full-screen as
        // the box allows without her edges (or bevels) clipping.
        const fitTile = () => {
            if (!bboxW || !bboxH) return 10;
            const margin = 0.94;
            const byWidth = (cw * margin) / bboxW;
            const byHeight = (ch * margin) / bboxH;
            return Math.max(2, Math.min(byWidth, byHeight));
        };

        const resize = () => {
            cw = stage.clientWidth || 1;
            ch = stage.clientHeight || 1;
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = cw * dpr;
            canvas.height = ch * dpr;
            tile = fitTile();
            drawFrame(lastElapsed, lastT, true);
        };

        let lastElapsed = 0;
        let lastT = 0;
        let buildStart = 0;
        let idleT = 0;
        let prevNow = 0;

        const loop = (now) => {
            raf = requestAnimationFrame(loop);
            if (!buildStart) { buildStart = now; prevNow = now; }
            const elapsed = now - buildStart;
            lastElapsed = elapsed;
            // Clamp dt so a dropped/backgrounded frame (tab switch, devtools
            // pause) can't fling the spring — cap at ~3 frames' worth.
            const dt = Math.min(50, now - prevNow || 16.7);
            prevNow = now;

            [cur.x, cur.vx] = smoothDamp(cur.x, cur.vx, target.x, SMOOTH_TIME_MS, dt);
            [cur.y, cur.vy] = smoothDamp(cur.y, cur.vy, target.y, SMOOTH_TIME_MS, dt);

            idleT += dt / 1000;
            lastT = idleT;
            drawFrame(elapsed, idleT, true);

            if (elapsed >= BUILD_MS && !completed) {
                completed = true;
                setBuilt(true);
                onComplete?.();
            }
        };

        const onMove = (e) => {
            const r = stage.getBoundingClientRect();
            target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
            target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
        };
        if (hasFinePointer) window.addEventListener('pointermove', onMove, { passive: true });

        img.onload = () => {
            const off = document.createElement('canvas');
            off.width = img.width; off.height = img.height;
            const octx = off.getContext('2d');
            octx.drawImage(img, 0, 0);
            const { data } = octx.getImageData(0, 0, img.width, img.height);

            const found = [];
            let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
            for (let row = 0; row < img.height; row++) {
                for (let col = 0; col < img.width; col++) {
                    const idx = (row * img.width + col) * 4;
                    const a = data[idx + 3];
                    if (a > 40) {
                        found.push({ col, row, r: data[idx], g: data[idx + 1], b: data[idx + 2] });
                        if (col < minCol) minCol = col;
                        if (col > maxCol) maxCol = col;
                        if (row < minRow) minRow = row;
                        if (row > maxRow) maxRow = row;
                    }
                }
            }
            // Re-centre on the actual opaque content's bounding box, not the
            // padded source grid — the crop isn't perfectly symmetric (hair
            // spikes thin out the top rows, shoulders fill the bottom ones),
            // so centring on the raw grid pushed/cropped her off-centre.
            const cx = (minCol + maxCol) / 2;
            const cy = (minRow + maxRow) / 2;
            found.forEach((c) => { c.col -= cx; c.row -= cy; });
            bboxW = maxCol - minCol + 1;
            bboxH = maxRow - minRow + 1;

            // Shuffle so cells pop in scattered across the whole silhouette
            // at once, not as a mechanical top-to-bottom scan — then give
            // each one its own random arrival time, direction, distance and
            // starting (oversized) scale, so every cube flies in from a
            // different angle and shrinks down into place as it lands.
            shuffle(found);
            const n = found.length;
            found.forEach((c, i) => {
                c.arrival = (i / Math.max(1, n - 1)) * ARRIVE_WINDOW_MS;
                c.flight = FLIGHT_MIN_MS + Math.random() * (FLIGHT_MAX_MS - FLIGHT_MIN_MS);
                c.flyAngle = Math.random() * Math.PI * 2;
                c.flyDist = 5 + Math.random() * 14;   // in cell/tile units
                c.flyScale = 2.4 + Math.random() * 1.6; // starts 2.4x-4x oversized
            });
            cells = found;

            const ro = new ResizeObserver(resize);
            ro.observe(stage);
            resize();
            raf = requestAnimationFrame(loop);
            canvas.dataset.ready = 'true';

            canvas._cleanup = () => {
                cancelAnimationFrame(raf);
                ro.disconnect();
                window.removeEventListener('pointermove', onMove);
            };
        };

        return () => {
            img.onload = null;
            if (canvas._cleanup) canvas._cleanup();
            else {
                cancelAnimationFrame(raf);
                window.removeEventListener('pointermove', onMove);
            }
        };
    }, [animate]);

    return (
        <div className={`voxel-portrait ${className}`}>
            <div className="voxel-stage">
                <div ref={stageRef} className="voxel-content">
                    <canvas
                        ref={canvasRef}
                        className={`voxel-canvas ${built ? 'is-out' : ''}`}
                        role="img"
                        aria-label="An illustrated portrait, dark-haired with large detailed eyes"
                    />
                    <img
                        src={realSrc}
                        alt="An illustrated portrait, dark-haired with large detailed eyes"
                        className={`voxel-real ${built ? 'is-in' : ''}`}
                        draggable="false"
                    />
                </div>
            </div>
        </div>
    );
};

export default VoxelPortrait;

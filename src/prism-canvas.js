/**
 * Pink Floyd Prism Light Refraction Canvas Logic
 * Ported from original app.js for WordPress Block use
 */

export default class PrismCanvas {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.cfg = { ...config };

        this.canvasWidth = 0;
        this.canvasHeight = 0;
        this.animationId = null;
        this.lastFrameTime = 0;
        this.frameInterval = 1000 / (this.cfg.targetFPS || 60);
        this.fpsCounter = { frames: 0, lastTime: 0, fps: 0 };
        this.needsRedraw = true;

        this.mouse = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            isInValidArea: false,
            isOnCanvas: false
        };

        this.prismCache = {
            vertices: [],
            center: { x: 0, y: 0 },
            leftEdge: { start: null, end: null },
            dirty: true
        };

        this.grainCanvas = document.createElement('canvas');
        this.grainCtx = this.grainCanvas.getContext('2d');
        this.ALBUM_COLORS = ['#ff0000', '#ff7700', '#ffdd00', '#00cc00', '#0066ff', '#7700dd'];

        // DOM rainbow container
        this.domRainbowContainer = null;

        this.init();
    }

    init() {
        this.generateGrainPattern();
        this.setupCanvas();
        this.setupEventListeners();

        // Get DOM rainbow container
        this.domRainbowContainer = this.canvas.parentElement?.querySelector('.dom-rainbow-container');

        // Initial default beam position
        this.updateDefaultBeamOrigin();
        this.mouse.x = this.defaultBeamOrigin.x;
        this.mouse.y = this.defaultBeamOrigin.y;
        this.mouse.targetX = this.defaultBeamOrigin.x;
        this.mouse.targetY = this.defaultBeamOrigin.y;

        this.start();
    }

    updateConfig(newConfig) {
        const oldBoxedMode = this.cfg.boxedMode;
        const oldAntiAliasing = this.cfg.antiAliasing;
        const oldFPS = this.cfg.targetFPS;
        const oldDomRainbow = this.cfg.domRainbowShapes;

        this.cfg = { ...this.cfg, ...newConfig };

        if (this.cfg.boxedMode !== oldBoxedMode || this.cfg.antiAliasing !== oldAntiAliasing) {
            this.setupCanvas();
        }

        if (this.cfg.targetFPS !== oldFPS) {
            this.frameInterval = 1000 / (this.cfg.targetFPS || 60);
        }

        // Clear DOM shapes if disabled
        if (this.cfg.domRainbowShapes !== oldDomRainbow && !this.cfg.domRainbowShapes) {
            this.clearDOMRainbowShapes();
        }

        this.prismCache.dirty = true;
        this.updatePrismGeometry();
        this.needsRedraw = true;
    }

    setupCanvas() {
        if (this.cfg.boxedMode) {
            this.canvasWidth = this.cfg.boxWidth || 900;
            this.canvasHeight = this.cfg.boxHeight || 600;
        } else {
            // In a block context, we might want to use the parent's width
            // For now, we'll use window dimensions or a fallback
            const rect = this.canvas.parentElement?.getBoundingClientRect();
            this.canvasWidth = rect?.width || window.innerWidth;
            this.canvasHeight = rect?.height || window.innerHeight;
        }

        const dpr = this.cfg.antiAliasing ? Math.min(window.devicePixelRatio || 1, 2) : 1;
        this.canvas.width = this.canvasWidth * dpr;
        this.canvas.height = this.canvasHeight * dpr;
        this.canvas.style.width = this.canvasWidth + 'px';
        this.canvas.style.height = this.canvasHeight + 'px';
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        this.ctx.scale(dpr, dpr);

        this.prismCache.dirty = true;
        this.updatePrismGeometry();
        this.updateDefaultBeamOrigin();
        this.clearDOMRainbowShapes();
        this.needsRedraw = true;
    }

    updatePrismGeometry() {
        if (!this.prismCache.dirty) return;

        const centerX = this.canvasWidth * (this.cfg.prismX / 100);
        const centerY = this.canvasHeight * (this.cfg.prismY / 100);
        const size = this.cfg.prismSize;

        const height = size * Math.sqrt(3) / 2;

        this.prismCache.vertices = [
            { x: centerX, y: centerY - height * 0.5 },                    // Top
            { x: centerX - size / 2, y: centerY + height * 0.5 },         // Bottom-left
            { x: centerX + size / 2, y: centerY + height * 0.5 }          // Bottom-right
        ];

        this.prismCache.center = { x: centerX, y: centerY };
        this.prismCache.leftEdge = {
            start: this.prismCache.vertices[0],
            end: this.prismCache.vertices[1]
        };

        this.prismCache.dirty = false;
    }

    updateDefaultBeamOrigin() {
        this.defaultBeamOrigin = {
            x: this.canvasWidth * 0.08,
            y: this.canvasHeight * 0.85
        };
    }

    generateGrainPattern() {
        const size = 256;
        this.grainCanvas.width = size;
        this.grainCanvas.height = size;
        const imageData = this.grainCtx.createImageData(size, size);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random() * 255;
            data[i] = data[i + 1] = data[i + 2] = noise;
            data[i + 3] = 255;
        }
        this.grainCtx.putImageData(imageData, 0, 0);
    }

    setupEventListeners() {
        const handleMove = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            let x, y;
            if (e.touches && e.touches.length > 0) {
                x = e.touches[0].clientX - rect.left;
                y = e.touches[0].clientY - rect.top;
            } else {
                x = e.clientX - rect.left;
                y = e.clientY - rect.top;
            }
            this.updateMousePosition(x, y);
        };

        this.canvas.addEventListener('mousemove', handleMove);
        this.canvas.addEventListener('touchmove', handleMove, { passive: true });

        this.canvas.addEventListener('mouseenter', () => { this.mouse.isOnCanvas = true; this.needsRedraw = true; });
        this.canvas.addEventListener('mouseleave', () => { this.mouse.isOnCanvas = false; this.needsRedraw = true; });
        this.canvas.addEventListener('touchstart', () => { this.mouse.isOnCanvas = true; this.needsRedraw = true; });
        this.canvas.addEventListener('touchend', () => { this.mouse.isOnCanvas = false; this.needsRedraw = true; });

        window.addEventListener('resize', this.debounce(() => {
            if (!this.cfg.boxedMode) this.setupCanvas();
        }, 100));
    }

    updateMousePosition(x, y) {
        this.mouse.isInValidArea = this.isInValidBeamArea(x, y);
        if (this.mouse.isOnCanvas && this.mouse.isInValidArea) {
            this.mouse.targetX = x;
            this.mouse.targetY = y;
        } else {
            this.mouse.targetX = this.defaultBeamOrigin.x;
            this.mouse.targetY = this.defaultBeamOrigin.y;
        }
        this.needsRedraw = true;
    }

    isInValidBeamArea(x, y) {
        const edge = this.prismCache.leftEdge;
        if (!edge.start || !edge.end) return false;
        const dx = edge.end.x - edge.start.x;
        const dy = edge.end.y - edge.start.y;
        const cross = (x - edge.start.x) * dy - (y - edge.start.y) * dx;
        return cross < 0;
    }

    start() {
        const loop = (timestamp) => {
            const elapsed = timestamp - this.lastFrameTime;
            if (elapsed >= this.frameInterval) {
                this.lastFrameTime = timestamp - (elapsed % this.frameInterval);
                this.updateDampedMouse();
                if (this.needsRedraw) {
                    this.render();
                    this.needsRedraw = false;
                }
                this.updateFPSCounter(timestamp);
            }
            this.animationId = requestAnimationFrame(loop);
        };
        this.animationId = requestAnimationFrame(loop);
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    updateDampedMouse() {
        if (this.cfg.dampingEnabled) {
            const dx = this.mouse.targetX - this.mouse.x;
            const dy = this.mouse.targetY - this.mouse.y;
            if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                this.mouse.x += dx * this.cfg.dampingFactor;
                this.mouse.y += dy * this.cfg.dampingFactor;
                this.needsRedraw = true;
            }
        } else {
            if (this.mouse.x !== this.mouse.targetX || this.mouse.y !== this.mouse.targetY) {
                this.mouse.x = this.mouse.targetX;
                this.mouse.y = this.mouse.targetY;
                this.needsRedraw = true;
            }
        }
    }

    updateFPSCounter(timestamp) {
        this.fpsCounter.frames++;
        if (timestamp - this.fpsCounter.lastTime >= 1000) {
            this.fpsCounter.fps = this.fpsCounter.frames;
            this.fpsCounter.frames = 0;
            this.fpsCounter.lastTime = timestamp;
        }
    }

    render() {
        this.ctx.fillStyle = '#0a0a0c';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        const beamPath = this.calculateBeamPath();
        if (beamPath) {
            this.drawIncomingBeam(beamPath);
            this.drawInnerBeam(beamPath);
            this.drawStylizedRainbow(beamPath);
            this.updateDOMRainbowShapes(beamPath);
        } else {
            if (this.cfg.domRainbowShapes) {
                this.clearDOMRainbowShapes();
            }
        }
        this.drawPrism();
    }

    calculateBeamPath() {
        const beamOrigin = { x: this.mouse.x, y: this.mouse.y };
        const vertices = this.prismCache.vertices;
        if (vertices.length < 3) return null;

        const leftEdge = { p1: vertices[0], p2: vertices[1] };
        let t = beamOrigin.y / this.canvasHeight;
        const minT = this.cfg.beamEntryMinY / 100;
        const maxT = this.cfg.beamEntryMaxY / 100;
        t = Math.max(minT, Math.min(maxT, t));

        const entryPoint = {
            x: leftEdge.p1.x + t * (leftEdge.p2.x - leftEdge.p1.x),
            y: leftEdge.p1.y + t * (leftEdge.p2.y - leftEdge.p1.y)
        };

        const beamHalfWidth = this.cfg.beamWidth / 2;
        const edgeDir = this.normalize({ x: leftEdge.p2.x - leftEdge.p1.x, y: leftEdge.p2.y - leftEdge.p1.y });
        const entryTop = { x: entryPoint.x - edgeDir.x * beamHalfWidth, y: entryPoint.y - edgeDir.y * beamHalfWidth };
        const entryBottom = { x: entryPoint.x + edgeDir.x * beamHalfWidth, y: entryPoint.y + edgeDir.y * beamHalfWidth };

        const leftNormal = this.normalize({ x: -edgeDir.y, y: edgeDir.x });
        const toInside = { x: this.prismCache.center.x - entryPoint.x, y: this.prismCache.center.y - entryPoint.y };
        if (this.dot(leftNormal, toInside) < 0) {
            leftNormal.x = -leftNormal.x;
            leftNormal.y = -leftNormal.y;
        }

        const beamDir = this.normalize({ x: entryPoint.x - beamOrigin.x, y: entryPoint.y - beamOrigin.y });
        const incidentDir = beamDir;
        let refractedDir = this.refract(incidentDir, leftNormal, 1.0, this.cfg.refractionIndex);

        if (!refractedDir) return null;

        if (this.cfg.innerBeamAngle !== 0) {
            const angleRad = this.cfg.innerBeamAngle * Math.PI / 180;
            const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
            refractedDir = {
                x: refractedDir.x * cos - refractedDir.y * sin,
                y: refractedDir.x * sin + refractedDir.y * cos
            };
        }

        const rightEdge = { p1: vertices[0], p2: vertices[2] };
        const bottomEdge = { p1: vertices[1], p2: vertices[2] };

        let exitEdge = rightEdge;
        let exitPoint = this.lineIntersection(entryPoint, { x: entryPoint.x + refractedDir.x * 2000, y: entryPoint.y + refractedDir.y * 2000 }, rightEdge.p1, rightEdge.p2);

        if (!exitPoint) {
            exitEdge = bottomEdge;
            exitPoint = this.lineIntersection(entryPoint, { x: entryPoint.x + refractedDir.x * 2000, y: entryPoint.y + refractedDir.y * 2000 }, bottomEdge.p1, bottomEdge.p2);
        }

        if (!exitPoint) {
            exitEdge = leftEdge;
            exitPoint = this.lineIntersection(entryPoint, { x: entryPoint.x + refractedDir.x * 2000, y: entryPoint.y + refractedDir.y * 2000 }, leftEdge.p1, leftEdge.p2);
            if (exitPoint && this.distance(exitPoint, entryPoint) < 5) exitPoint = null;
        }

        if (!exitPoint) return null;

        const exitEdgeDir = this.normalize({ x: exitEdge.p2.x - exitEdge.p1.x, y: exitEdge.p2.y - exitEdge.p1.y });
        let exitNormal = { x: -exitEdgeDir.y, y: exitEdgeDir.x };
        const toOutside = { x: exitPoint.x - this.prismCache.center.x, y: exitPoint.y - this.prismCache.center.y };
        if (this.dot(exitNormal, toOutside) < 0) {
            exitNormal.x = -exitNormal.x;
            exitNormal.y = -exitNormal.y;
        }

        const rainbowRays = [];
        const numRays = this.cfg.bandCount;
        for (let i = 0; i < numRays; i++) {
            const t = i / (numRays - 1);
            const wavelengthFactor = 1 - 2 * (t - 0.5);
            const n = this.cfg.refractionIndex + wavelengthFactor * this.cfg.dispersion;
            let exitRefractedDir = this.refract(refractedDir, { x: -exitNormal.x, y: -exitNormal.y }, n, 1.0);

            if (exitRefractedDir) {
                if (this.cfg.rainbowAngle !== 0) {
                    const angleRad = this.cfg.rainbowAngle * Math.PI / 180;
                    const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
                    exitRefractedDir = {
                        x: exitRefractedDir.x * cos - exitRefractedDir.y * sin,
                        y: exitRefractedDir.x * sin + exitRefractedDir.y * cos
                    };
                }
                const dispersionOffset = wavelengthFactor * this.cfg.dispersion * this.cfg.beamWidth * 2;
                rainbowRays.push({
                    exitPoint: { x: exitPoint.x + exitEdgeDir.x * dispersionOffset, y: exitPoint.y + exitEdgeDir.y * dispersionOffset },
                    direction: exitRefractedDir,
                    t: t
                });
            }
        }

        return { origin: beamOrigin, entryPoint, entryTop, entryBottom, exitPoint, refractedDir, rainbowRays, exitEdge };
    }

    drawIncomingBeam(beamPath) {
        const width = this.cfg.beamWidth;
        const dir = this.normalize({ x: beamPath.entryPoint.x - beamPath.origin.x, y: beamPath.entryPoint.y - beamPath.origin.y });
        let beamY = beamPath.origin.y + dir.y * (0 - beamPath.origin.x) / dir.x;
        const minY = this.canvasHeight * (this.cfg.beamExitMinY / 100);
        const maxY = this.canvasHeight * (this.cfg.beamExitMaxY / 100);
        beamY = Math.max(minY, Math.min(maxY, beamY));
        const beamStart = { x: 0, y: beamY };

        const gradient = this.ctx.createLinearGradient(beamStart.x, beamStart.y, beamPath.entryPoint.x, beamPath.entryPoint.y);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 1)');

        const perp = { x: -dir.y, y: dir.x };
        const entryEdgeDir = this.normalize({ x: this.prismCache.vertices[1].x - this.prismCache.vertices[0].x, y: this.prismCache.vertices[1].y - this.prismCache.vertices[0].y });
        const entryWidth = this.cfg.beamWidth / 2;
        const overlap = 2;

        const entryPt1 = { x: beamPath.entryPoint.x - entryEdgeDir.x * entryWidth + dir.x * overlap, y: beamPath.entryPoint.y - entryEdgeDir.y * entryWidth + dir.y * overlap };
        const entryPt2 = { x: beamPath.entryPoint.x + entryEdgeDir.x * entryWidth + dir.x * overlap, y: beamPath.entryPoint.y + entryEdgeDir.y * entryWidth + dir.y * overlap };

        this.ctx.beginPath();
        this.ctx.moveTo(beamStart.x - perp.x * (width / 2), beamStart.y - perp.y * (width / 2));
        this.ctx.lineTo(beamStart.x + perp.x * (width / 2), beamStart.y + perp.y * (width / 2));
        this.ctx.lineTo(entryPt2.x, entryPt2.y);
        this.ctx.lineTo(entryPt1.x, entryPt1.y);
        this.ctx.closePath();
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }

    drawInnerBeam(beamPath) {
        const entryWidth = this.cfg.beamWidth / 2;
        const desiredExitWidth = Math.max(entryWidth * 4, this.cfg.beamWidth / 2 + this.cfg.dispersion * this.cfg.beamWidth * 4);
        const entryEdgeDir = this.normalize({ x: this.prismCache.vertices[1].x - this.prismCache.vertices[0].x, y: this.prismCache.vertices[1].y - this.prismCache.vertices[0].y });
        const exitEdgeDir = this.normalize({ x: beamPath.exitEdge.p2.x - beamPath.exitEdge.p1.x, y: beamPath.exitEdge.p2.y - beamPath.exitEdge.p1.y });

        const entryPt1 = { x: beamPath.entryPoint.x - entryEdgeDir.x * entryWidth, y: beamPath.entryPoint.y - entryEdgeDir.y * entryWidth };
        const entryPt2 = { x: beamPath.entryPoint.x + entryEdgeDir.x * entryWidth, y: beamPath.entryPoint.y + entryEdgeDir.y * entryWidth };

        let exitPt1 = { x: beamPath.exitPoint.x - exitEdgeDir.x * desiredExitWidth, y: beamPath.exitPoint.y - exitEdgeDir.y * desiredExitWidth };
        let exitPt2 = { x: beamPath.exitPoint.x + exitEdgeDir.x * desiredExitWidth, y: beamPath.exitPoint.y + exitEdgeDir.y * desiredExitWidth };

        const edgeLength = this.distance(beamPath.exitEdge.p1, beamPath.exitEdge.p2);
        const projectToEdge = (pt) => {
            const dx = pt.x - beamPath.exitEdge.p1.x, dy = pt.y - beamPath.exitEdge.p1.y;
            return Math.max(0, Math.min(1, (dx * exitEdgeDir.x + dy * exitEdgeDir.y) / edgeLength));
        };

        const t1 = projectToEdge(exitPt1), t2 = projectToEdge(exitPt2);
        exitPt1 = { x: beamPath.exitEdge.p1.x + t1 * (beamPath.exitEdge.p2.x - beamPath.exitEdge.p1.x), y: beamPath.exitEdge.p1.y + t1 * (beamPath.exitEdge.p2.y - beamPath.exitEdge.p1.y) };
        exitPt2 = { x: beamPath.exitEdge.p1.x + t2 * (beamPath.exitEdge.p2.x - beamPath.exitEdge.p1.x), y: beamPath.exitEdge.p1.y + t2 * (beamPath.exitEdge.p2.y - beamPath.exitEdge.p1.y) };

        const entryUpper = entryPt1.y < entryPt2.y ? entryPt1 : entryPt2;
        const entryLower = entryPt1.y < entryPt2.y ? entryPt2 : entryPt1;
        const exitUpper = exitPt1.y < exitPt2.y ? exitPt1 : exitPt2;
        const exitLower = exitPt1.y < exitPt2.y ? exitPt2 : exitPt1;

        this.ctx.beginPath();
        this.ctx.moveTo(entryUpper.x, entryUpper.y);
        this.ctx.lineTo(exitUpper.x, exitUpper.y);
        this.ctx.lineTo(exitLower.x, exitLower.y);
        this.ctx.lineTo(entryLower.x, entryLower.y);
        this.ctx.closePath();

        const gradient = this.ctx.createLinearGradient(beamPath.entryPoint.x, beamPath.entryPoint.y, beamPath.exitPoint.x, beamPath.exitPoint.y);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }

    drawStylizedRainbow(beamPath) {
        if (beamPath.rainbowRays.length < 2) return;
        const bandCount = this.cfg.bandCount;
        const rayLength = this.canvasWidth * 2;
        const bounds = this.getClippedExitBounds(beamPath);
        const centerRayIndex = Math.floor(beamPath.rainbowRays.length / 2);
        const centerRay = beamPath.rainbowRays[centerRayIndex];
        if (!centerRay) return;
        const uniformDirection = centerRay.direction;
        const exitMidpoint = { x: (bounds.clippedPt1.x + bounds.clippedPt2.x) / 2, y: (bounds.clippedPt1.y + bounds.clippedPt2.y) / 2 };

        for (let i = 0; i < bandCount; i++) {
            const t1 = i / bandCount, t2 = (i + 1) / bandCount;
            const colorIndex1 = t1 * (this.ALBUM_COLORS.length - 1), colorIndex2 = t2 * (this.ALBUM_COLORS.length - 1);
            const color1 = this.interpolateColors(this.ALBUM_COLORS[Math.floor(colorIndex1)], this.ALBUM_COLORS[Math.ceil(colorIndex1)], colorIndex1 % 1);
            const color2 = this.interpolateColors(this.ALBUM_COLORS[Math.floor(colorIndex2)], this.ALBUM_COLORS[Math.ceil(colorIndex2)], colorIndex2 % 1);

            const offset1 = (t1 - 0.5) * bounds.bandWidth, offset2 = (t2 - 0.5) * bounds.bandWidth;
            const exitStart = { x: exitMidpoint.x + bounds.exitEdgeDir.x * offset1, y: exitMidpoint.y + bounds.exitEdgeDir.y * offset1 };
            const exitEnd = { x: exitMidpoint.x + bounds.exitEdgeDir.x * offset2, y: exitMidpoint.y + bounds.exitEdgeDir.y * offset2 };

            const spreadOffset1 = offset1 * this.cfg.rainbowSpread, spreadOffset2 = offset2 * this.cfg.rainbowSpread;
            const endStart = {
                x: exitStart.x + uniformDirection.x * rayLength + bounds.exitEdgeDir.x * (spreadOffset1 - offset1) * rayLength / 100,
                y: exitStart.y + uniformDirection.y * rayLength + bounds.exitEdgeDir.y * (spreadOffset1 - offset1) * rayLength / 100
            };
            const endEnd = {
                x: exitEnd.x + uniformDirection.x * rayLength + bounds.exitEdgeDir.x * (spreadOffset2 - offset2) * rayLength / 100,
                y: exitEnd.y + uniformDirection.y * rayLength + bounds.exitEdgeDir.y * (spreadOffset2 - offset2) * rayLength / 100
            };

            this.ctx.beginPath();
            this.ctx.moveTo(exitStart.x, exitStart.y);
            this.ctx.lineTo(exitEnd.x, exitEnd.y);
            this.ctx.lineTo(endEnd.x, endEnd.y);
            this.ctx.lineTo(endStart.x, endStart.y);
            this.ctx.closePath();

            const gradient = this.ctx.createLinearGradient(exitStart.x, exitStart.y, exitEnd.x, exitEnd.y);
            gradient.addColorStop(0, color1);
            gradient.addColorStop(1, color2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }
    }

    drawPrism() {
        const vertices = this.prismCache.vertices;
        if (vertices.length < 3) return;

        this.ctx.beginPath();
        this.ctx.moveTo(vertices[0].x, vertices[0].y);
        this.ctx.lineTo(vertices[1].x, vertices[1].y);
        this.ctx.lineTo(vertices[2].x, vertices[2].y);
        this.ctx.closePath();

        const gradient = this.ctx.createLinearGradient(vertices[0].x, vertices[0].y, this.prismCache.center.x, vertices[1].y);
        gradient.addColorStop(0, 'rgba(25, 25, 35, 0.95)');
        gradient.addColorStop(0.5, 'rgba(35, 35, 50, 0.9)');
        gradient.addColorStop(1, 'rgba(20, 20, 30, 0.95)');
        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        if (this.cfg.fadeBorder > 0) this.drawPrismFadeBorder();
        if (this.cfg.grain > 0) this.applyGrain();

        this.ctx.beginPath();
        this.ctx.moveTo(vertices[0].x, vertices[0].y);
        this.ctx.lineTo(vertices[1].x, vertices[1].y);
        this.ctx.lineTo(vertices[2].x, vertices[2].y);
        this.ctx.closePath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    drawPrismFadeBorder() {
        const vertices = this.prismCache.vertices;
        const fadeSize = this.cfg.fadeBorder;
        const center = this.prismCache.center;
        const innerVertices = vertices.map(v => ({
            x: v.x + (center.x - v.x) * (fadeSize / 100),
            y: v.y + (center.y - v.y) * (fadeSize / 100)
        }));

        for (let i = 0; i < 3; i++) {
            const v1 = vertices[i], v2 = vertices[(i + 1) % 3], iv1 = innerVertices[i], iv2 = innerVertices[(i + 1) % 3];
            this.ctx.beginPath();
            this.ctx.moveTo(v1.x, v1.y);
            this.ctx.lineTo(v2.x, v2.y);
            this.ctx.lineTo(iv2.x, iv2.y);
            this.ctx.lineTo(iv1.x, iv1.y);
            this.ctx.closePath();
            const midOuter = { x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 }, midInner = { x: (iv1.x + iv2.x) / 2, y: (iv1.y + iv2.y) / 2 };
            const gradient = this.ctx.createLinearGradient(midOuter.x, midOuter.y, midInner.x, midInner.y);
            gradient.addColorStop(0, 'rgba(60, 60, 80, 0.3)');
            gradient.addColorStop(1, 'rgba(60, 60, 80, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }
    }

    applyGrain() {
        const vertices = this.prismCache.vertices;
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(vertices[0].x, vertices[0].y);
        this.ctx.lineTo(vertices[1].x, vertices[1].y);
        this.ctx.lineTo(vertices[2].x, vertices[2].y);
        this.ctx.closePath();
        this.ctx.clip();
        this.ctx.globalAlpha = this.cfg.grain;
        this.ctx.globalCompositeOperation = 'overlay';
        const patternSize = 256;
        for (let x = 0; x < this.canvasWidth; x += patternSize) {
            for (let y = 0; y < this.canvasHeight; y += patternSize) {
                this.ctx.drawImage(this.grainCanvas, x, y);
            }
        }
        this.ctx.restore();
    }

    getClippedExitBounds(beamPath) {
        const entryWidth = this.cfg.beamWidth / 2;
        const desiredExitWidth = Math.max(entryWidth * 4, this.cfg.beamWidth / 2 + this.cfg.dispersion * this.cfg.beamWidth * 4);
        const exitEdgeDir = this.normalize({ x: beamPath.exitEdge.p2.x - beamPath.exitEdge.p1.x, y: beamPath.exitEdge.p2.y - beamPath.exitEdge.p1.y });
        const edgeLength = this.distance(beamPath.exitEdge.p1, beamPath.exitEdge.p2);
        const exitPt1 = { x: beamPath.exitPoint.x - exitEdgeDir.x * desiredExitWidth, y: beamPath.exitPoint.y - exitEdgeDir.y * desiredExitWidth };
        const exitPt2 = { x: beamPath.exitPoint.x + exitEdgeDir.x * desiredExitWidth, y: beamPath.exitPoint.y + exitEdgeDir.y * desiredExitWidth };
        const projectToEdge = (pt) => {
            const dx = pt.x - beamPath.exitEdge.p1.x, dy = pt.y - beamPath.exitEdge.p1.y;
            return Math.max(0, Math.min(1, (dx * exitEdgeDir.x + dy * exitEdgeDir.y) / edgeLength));
        };
        const t1 = projectToEdge(exitPt1), t2 = projectToEdge(exitPt2);
        const clippedPt1 = { x: beamPath.exitEdge.p1.x + t1 * (beamPath.exitEdge.p2.x - beamPath.exitEdge.p1.x), y: beamPath.exitEdge.p1.y + t1 * (beamPath.exitEdge.p2.y - beamPath.exitEdge.p1.y) };
        const clippedPt2 = { x: beamPath.exitEdge.p1.x + t2 * (beamPath.exitEdge.p2.x - beamPath.exitEdge.p1.x), y: beamPath.exitEdge.p1.y + t2 * (beamPath.exitEdge.p2.y - beamPath.exitEdge.p1.y) };
        const actualWidth = this.distance(clippedPt1, clippedPt2) / 2;
        return { exitWidth: actualWidth, bandWidth: actualWidth * 2, exitEdgeDir, clippedPt1, clippedPt2, t1, t2 };
    }

    normalize(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y);
        return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
    }

    dot(a, b) { return a.x * b.x + a.y * b.y; }
    distance(a, b) { const dx = b.x - a.x, dy = b.y - a.y; return Math.sqrt(dx * dx + dy * dy); }

    lineIntersection(p1, p2, p3, p4) {
        const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
        if (Math.abs(d) < 0.0001) return null;
        const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
        const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d;
        if (u >= 0 && u <= 1) return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
        return null;
    }

    refract(incident, normal, n1, n2) {
        const ratio = n1 / n2;
        const cosI = -this.dot(incident, normal);
        const sinT2 = ratio * ratio * (1 - cosI * cosI);
        if (sinT2 > 1) return null;
        const cosT = Math.sqrt(1 - sinT2);
        return { x: ratio * incident.x + (ratio * cosI - cosT) * normal.x, y: ratio * incident.y + (ratio * cosI - cosT) * normal.y };
    }

    interpolateColors(color1, color2, t) {
        const parse = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
        const [r1, g1, b1] = parse(color1), [r2, g2, b2] = parse(color2);
        return `rgb(${Math.round(r1 + (r2 - r1) * t)}, ${Math.round(g1 + (g2 - g1) * t)}, ${Math.round(b1 + (b2 - b1) * t)})`;
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    // DOM Rainbow Shapes
    updateDOMRainbowShapes(beamPath) {
        if (!this.cfg.boxedMode || !this.cfg.domRainbowShapes || !this.domRainbowContainer || !beamPath) {
            return;
        }

        if (beamPath.rainbowRays.length < 2) return;

        const bandCount = this.cfg.bandCount;
        const canvasRect = this.canvas.getBoundingClientRect();
        const bounds = this.getClippedExitBounds(beamPath);

        const centerRayIndex = Math.floor(beamPath.rainbowRays.length / 2);
        const centerRay = beamPath.rainbowRays[centerRayIndex];
        if (!centerRay) return;

        const exitMidpoint = {
            x: (bounds.clippedPt1.x + bounds.clippedPt2.x) / 2,
            y: (bounds.clippedPt1.y + bounds.clippedPt2.y) / 2
        };

        const existingBands = this.domRainbowContainer.querySelectorAll('.dom-rainbow-band');

        // Remove excess bands
        if (existingBands.length > bandCount) {
            for (let i = bandCount; i < existingBands.length; i++) {
                existingBands[i].remove();
            }
        }

        for (let i = 0; i < bandCount; i++) {
            const t1 = i / bandCount;
            const t2 = (i + 1) / bandCount;

            const colorIndex1 = t1 * (this.ALBUM_COLORS.length - 1);
            const colorIndex2 = t2 * (this.ALBUM_COLORS.length - 1);

            const color1 = this.interpolateColors(
                this.ALBUM_COLORS[Math.floor(colorIndex1)],
                this.ALBUM_COLORS[Math.ceil(colorIndex1)],
                colorIndex1 % 1
            );
            const color2 = this.interpolateColors(
                this.ALBUM_COLORS[Math.floor(colorIndex2)],
                this.ALBUM_COLORS[Math.ceil(colorIndex2)],
                colorIndex2 % 1
            );

            const offset1 = (t1 - 0.5) * bounds.bandWidth;
            const offset2 = (t2 - 0.5) * bounds.bandWidth;

            const exitStart = {
                x: exitMidpoint.x + bounds.exitEdgeDir.x * offset1,
                y: exitMidpoint.y + bounds.exitEdgeDir.y * offset1
            };
            const exitEnd = {
                x: exitMidpoint.x + bounds.exitEdgeDir.x * offset2,
                y: exitMidpoint.y + bounds.exitEdgeDir.y * offset2
            };

            const uniformDirection = centerRay.direction;

            // Calculate canvas endpoints
            const canvasRayLength = this.canvasWidth * 2;
            const spreadOffset1 = offset1 * this.cfg.rainbowSpread;
            const spreadOffset2 = offset2 * this.cfg.rainbowSpread;

            const canvasEndStart = {
                x: exitStart.x + uniformDirection.x * canvasRayLength + bounds.exitEdgeDir.x * (spreadOffset1 - offset1) * canvasRayLength / 100,
                y: exitStart.y + uniformDirection.y * canvasRayLength + bounds.exitEdgeDir.y * (spreadOffset1 - offset1) * canvasRayLength / 100
            };
            const canvasEndEnd = {
                x: exitEnd.x + uniformDirection.x * canvasRayLength + bounds.exitEdgeDir.x * (spreadOffset2 - offset2) * canvasRayLength / 100,
                y: exitEnd.y + uniformDirection.y * canvasRayLength + bounds.exitEdgeDir.y * (spreadOffset2 - offset2) * canvasRayLength / 100
            };

            // Extend rays to reach far beyond the canvas (container-relative)
            const viewportEndStart = this.extendPointToContainerEdge(exitStart, canvasEndStart);
            const viewportEndEnd = this.extendPointToContainerEdge(exitEnd, canvasEndEnd);

            // Use canvas coordinates directly (container-relative, not viewport-relative)
            const exitStartViewport = {
                x: exitStart.x,
                y: exitStart.y
            };
            const exitEndViewport = {
                x: exitEnd.x,
                y: exitEnd.y
            };

            // Create or update DOM element
            let bandElement = existingBands[i];
            if (!bandElement) {
                bandElement = document.createElement('div');
                bandElement.className = 'dom-rainbow-band';
                this.domRainbowContainer.appendChild(bandElement);
            }

            // Create trapezoid using clip-path
            const points = [
                `${exitStartViewport.x}px ${exitStartViewport.y}px`,
                `${exitEndViewport.x}px ${exitEndViewport.y}px`,
                `${viewportEndEnd.x}px ${viewportEndEnd.y}px`,
                `${viewportEndStart.x}px ${viewportEndStart.y}px`
            ].join(', ');

            // Apply gradient
            const gradientAngle = Math.atan2(
                exitEndViewport.y - exitStartViewport.y,
                exitEndViewport.x - exitStartViewport.x
            ) * 180 / Math.PI + 90;

            bandElement.style.background = `linear-gradient(${gradientAngle}deg, ${color1}, ${color2})`;
            bandElement.style.clipPath = `polygon(${points})`;
            bandElement.style.width = '100vw';
            bandElement.style.height = '100vh';
            bandElement.style.top = '0';
            bandElement.style.left = '0';
            bandElement.style.opacity = '1';
        }
    }

    extendPointToContainerEdge(startPoint, endPoint) {
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return { x: endPoint.x, y: endPoint.y };

        const dirX = dx / len;
        const dirY = dy / len;
        const maxDistance = Math.max(window.innerWidth, window.innerHeight) * 5;

        return {
            x: startPoint.x + dirX * maxDistance,
            y: startPoint.y + dirY * maxDistance
        };
    }

    clearDOMRainbowShapes() {
        if (this.domRainbowContainer) {
            this.domRainbowContainer.innerHTML = '';
        }
    }
}

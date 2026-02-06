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

    parseColorToRGBA(color) {
        if (!color) return { r: 255, g: 255, b: 255, a: 1 };
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            if (hex.length === 3) return { r: parseInt(hex[0] + hex[0], 16), g: parseInt(hex[1] + hex[1], 16), b: parseInt(hex[2] + hex[2], 16), a: 1 };
            if (hex.length >= 6) return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1 };
        }
        const match = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/);
        if (match) return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]), a: match[4] !== undefined ? parseFloat(match[4]) : 1 };
        return { r: 255, g: 255, b: 255, a: 1 };
    }

    _cacheColors() {
        this._colors = {
            bg: this.cfg.bgColor || '#0a0a0c',
            beam: this.parseColorToRGBA(this.cfg.beamColor || '#ffffff'),
            prism: this.parseColorToRGBA(this.cfg.prismColor || 'rgba(25, 25, 35, 0.95)'),
            prismBorder: this.cfg.prismBorderColor || 'rgba(255, 255, 255, 0.08)',
            grain: this.parseColorToRGBA(this.cfg.grainColor || '#ffffff'),
        };
    }

    init() {
        this._cacheColors();
        this.generateGrainPattern();
        this.setupCanvas();
        this.setupEventListeners();

        // Create DOM rainbow container on body level for natural scrolling
        this.setupDOMRainbowContainer();

        // Initial default beam position
        this.updateDefaultBeamOrigin();
        this.mouse.x = this.defaultBeamOrigin.x;
        this.mouse.y = this.defaultBeamOrigin.y;
        this.mouse.targetX = this.defaultBeamOrigin.x;
        this.mouse.targetY = this.defaultBeamOrigin.y;

        this.start();
    }

    setupDOMRainbowContainer() {
        // Remove any existing body-level container for this canvas
        if (this.domRainbowContainer && this.domRainbowContainer.parentElement === document.body) {
            this.domRainbowContainer.remove();
        }

        // Create new container on body level
        this.domRainbowContainer = document.createElement('div');
        this.domRainbowContainer.className = 'dom-rainbow-container-body';
        this.domRainbowContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 99999;
            overflow: visible;
        `;
        document.body.appendChild(this.domRainbowContainer);

        // Store reference for cleanup
        this._canvasId = 'prism-canvas-' + Math.random().toString(36).substr(2, 9);
        this.domRainbowContainer.setAttribute('data-canvas-id', this._canvasId);
    }

    updateConfig(newConfig) {
        const oldBoxedMode = this.cfg.boxedMode;
        const oldAntiAliasing = this.cfg.antiAliasing;
        const oldFPS = this.cfg.targetFPS;
        const oldDomRainbow = this.cfg.domRainbowShapes;
        const oldBoxWidth = this.cfg.boxWidth;
        const oldBoxHeight = this.cfg.boxHeight;
        const oldBoxWidthUnit = this.cfg.boxWidthUnit;
        const oldBoxHeightUnit = this.cfg.boxHeightUnit;
        const oldAspectRatioEnabled = this.cfg.aspectRatioEnabled;
        const oldAspectRatio = this.cfg.aspectRatio;
        const oldGrainColor = this.cfg.grainColor;

        this.cfg = { ...this.cfg, ...newConfig };
        this._cacheColors();

        if (this.cfg.grainColor !== oldGrainColor) {
            this.generateGrainPattern();
        }

        // Check if canvas needs to be resized
        const dimensionsChanged =
            this.cfg.boxedMode !== oldBoxedMode ||
            this.cfg.antiAliasing !== oldAntiAliasing ||
            this.cfg.boxWidth !== oldBoxWidth ||
            this.cfg.boxHeight !== oldBoxHeight ||
            this.cfg.boxWidthUnit !== oldBoxWidthUnit ||
            this.cfg.boxHeightUnit !== oldBoxHeightUnit ||
            this.cfg.aspectRatioEnabled !== oldAspectRatioEnabled ||
            this.cfg.aspectRatio !== oldAspectRatio;

        if (dimensionsChanged) {
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
        const MAX_CANVAS_SIZE = 4000; // Prevent performance issues
        const MIN_CANVAS_SIZE = this.cfg.minCanvasSize || 100;

        if (this.cfg.boxedMode) {
            // Parse width with unit
            this.canvasWidth = this.parseUnit(
                this.cfg.boxWidth || 900,
                this.cfg.boxWidthUnit || 'px',
                'width'
            );

            // Calculate height based on aspect ratio or use specified height
            if (this.cfg.aspectRatioEnabled) {
                const ratio = this.parseAspectRatio(this.cfg.aspectRatio || '16:9');
                this.canvasHeight = Math.round(this.canvasWidth / ratio);
            } else {
                this.canvasHeight = this.parseUnit(
                    this.cfg.boxHeight || 600,
                    this.cfg.boxHeightUnit || 'px',
                    'height'
                );
            }
        } else {
            // In a block context, we might want to use the parent's width
            // For now, we'll use window dimensions or a fallback
            const rect = this.canvas.parentElement?.getBoundingClientRect();
            this.canvasWidth = rect?.width || window.innerWidth;
            this.canvasHeight = rect?.height || window.innerHeight;
        }

        // Apply sanity limits to prevent crashes
        this.canvasWidth = Math.max(MIN_CANVAS_SIZE, Math.min(MAX_CANVAS_SIZE, this.canvasWidth || 900));
        this.canvasHeight = Math.max(MIN_CANVAS_SIZE, Math.min(MAX_CANVAS_SIZE, this.canvasHeight || 600));

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

    parseUnit(value, unit, dimension) {
        const numValue = parseFloat(value) || 0;

        switch (unit) {
            case 'px':
                return numValue;
            case 'rem':
                // Get root font size (default 16px)
                const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
                return numValue * rootFontSize;
            case 'vw':
                return (numValue / 100) * window.innerWidth;
            case 'vh':
                return (numValue / 100) * window.innerHeight;
            case '%':
                const parentRect = this.canvas.parentElement?.getBoundingClientRect();
                if (dimension === 'width') {
                    return (numValue / 100) * (parentRect?.width || window.innerWidth);
                } else {
                    return (numValue / 100) * (parentRect?.height || window.innerHeight);
                }
            default:
                return numValue;
        }
    }

    parseAspectRatio(ratioString) {
        const parts = ratioString.split(':');
        if (parts.length === 2) {
            const width = parseFloat(parts[0]) || 16;
            const height = parseFloat(parts[1]) || 9;
            return width / height;
        }
        return 16 / 9; // Default fallback
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
        const gc = this._colors ? this._colors.grain : { r: 255, g: 255, b: 255, a: 1 };
        const imageData = this.grainCtx.createImageData(size, size);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random();
            data[i] = Math.round(gc.r * noise);
            data[i + 1] = Math.round(gc.g * noise);
            data[i + 2] = Math.round(gc.b * noise);
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
        // Cleanup body-level container
        if (this.domRainbowContainer && this.domRainbowContainer.parentElement === document.body) {
            this.domRainbowContainer.remove();
            this.domRainbowContainer = null;
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
        this.ctx.fillStyle = this._colors.bg;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        const beamPath = this.calculateBeamPath();
        if (beamPath) {
            this.drawIncomingBeam(beamPath);
            this.drawInnerBeam(beamPath);
            // Only draw canvas rainbow if not hidden
            if (!this.cfg.hideCanvasRainbow || !this.cfg.domRainbowShapes) {
                this.drawStylizedRainbow(beamPath);
            }
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
        const bc = this._colors.beam;
        gradient.addColorStop(0, `rgba(${bc.r}, ${bc.g}, ${bc.b}, ${bc.a * 0.6})`);
        gradient.addColorStop(0.7, `rgba(${bc.r}, ${bc.g}, ${bc.b}, ${bc.a * 0.9})`);
        gradient.addColorStop(1, `rgba(${bc.r}, ${bc.g}, ${bc.b}, ${bc.a})`);

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
        const ibc = this._colors.beam;
        gradient.addColorStop(0, `rgba(${ibc.r}, ${ibc.g}, ${ibc.b}, ${ibc.a * 0.95})`);
        gradient.addColorStop(0.5, `rgba(${ibc.r}, ${ibc.g}, ${ibc.b}, ${ibc.a * 0.7})`);
        gradient.addColorStop(1, `rgba(${ibc.r}, ${ibc.g}, ${ibc.b}, ${ibc.a * 0.3})`);
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

        const pc = this._colors.prism;
        const gradient = this.ctx.createLinearGradient(vertices[0].x, vertices[0].y, this.prismCache.center.x, vertices[1].y);
        gradient.addColorStop(0, `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${pc.a})`);
        gradient.addColorStop(0.5, `rgba(${Math.min(255, pc.r + 10)}, ${Math.min(255, pc.g + 10)}, ${Math.min(255, pc.b + 15)}, ${pc.a * 0.95})`);
        gradient.addColorStop(1, `rgba(${Math.max(0, pc.r - 5)}, ${Math.max(0, pc.g - 5)}, ${Math.max(0, pc.b - 5)}, ${pc.a})`);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        if (this.cfg.fadeBorder > 0) this.drawPrismFadeBorder();
        if (this.cfg.grain > 0) this.applyGrain();

        this.ctx.beginPath();
        this.ctx.moveTo(vertices[0].x, vertices[0].y);
        this.ctx.lineTo(vertices[1].x, vertices[1].y);
        this.ctx.lineTo(vertices[2].x, vertices[2].y);
        this.ctx.closePath();
        this.ctx.strokeStyle = this._colors.prismBorder;
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
            const fc = this._colors.prism;
            const gradient = this.ctx.createLinearGradient(midOuter.x, midOuter.y, midInner.x, midInner.y);
            gradient.addColorStop(0, `rgba(${Math.min(255, fc.r + 35)}, ${Math.min(255, fc.g + 35)}, ${Math.min(255, fc.b + 45)}, 0.3)`);
            gradient.addColorStop(1, `rgba(${Math.min(255, fc.r + 35)}, ${Math.min(255, fc.g + 35)}, ${Math.min(255, fc.b + 45)}, 0)`);
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

            // Convert canvas coordinates to document coordinates (for position: absolute on body)
            const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;

            const exitStartDoc = {
                x: canvasRect.left + scrollX + exitStart.x,
                y: canvasRect.top + scrollY + exitStart.y
            };
            const exitEndDoc = {
                x: canvasRect.left + scrollX + exitEnd.x,
                y: canvasRect.top + scrollY + exitEnd.y
            };

            // Extend rays to reach document edges
            const viewportEndStart = this.extendPointToDocumentEdge(exitStartDoc, {
                x: canvasRect.left + scrollX + canvasEndStart.x,
                y: canvasRect.top + scrollY + canvasEndStart.y
            });
            const viewportEndEnd = this.extendPointToDocumentEdge(exitEndDoc, {
                x: canvasRect.left + scrollX + canvasEndEnd.x,
                y: canvasRect.top + scrollY + canvasEndEnd.y
            });

            // Create or update DOM element
            let bandElement = existingBands[i];
            if (!bandElement) {
                bandElement = document.createElement('div');
                bandElement.className = 'dom-rainbow-band';
                bandElement.style.cssText = `
                    position: absolute;
                    pointer-events: none;
                    will-change: clip-path;
                    z-index: 99999;
                `;
                this.domRainbowContainer.appendChild(bandElement);
            }

            // Create trapezoid using clip-path with document coordinates
            const points = [
                `${exitStartDoc.x}px ${exitStartDoc.y}px`,
                `${exitEndDoc.x}px ${exitEndDoc.y}px`,
                `${viewportEndEnd.x}px ${viewportEndEnd.y}px`,
                `${viewportEndStart.x}px ${viewportEndStart.y}px`
            ].join(', ');

            // Apply gradient - calculate angle perpendicular to exit edge (same as canvas)
            // The gradient goes from exitStart to exitEnd in canvas space
            const gradientAngle = Math.atan2(
                exitEnd.y - exitStart.y,
                exitEnd.x - exitStart.x
            ) * 180 / Math.PI + 90;

            // Use large dimensions to cover extended area
            const docWidth = Math.max(document.documentElement.scrollWidth, window.innerWidth * 3);
            const docHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight * 3);

            bandElement.style.background = `linear-gradient(${gradientAngle}deg, ${color1}, ${color2})`;
            bandElement.style.clipPath = `polygon(${points})`;
            bandElement.style.width = docWidth + 'px';
            bandElement.style.height = docHeight + 'px';
            bandElement.style.top = '0';
            bandElement.style.left = '0';
            bandElement.style.opacity = (this.cfg.domRainbowOpacity ?? 1).toString();
        }
    }

    extendPointToDocumentEdge(startPoint, endPoint) {
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return { x: endPoint.x, y: endPoint.y };

        const dirX = dx / len;
        const dirY = dy / len;

        // Calculate distance to reach well beyond document edges
        const docWidth = Math.max(document.documentElement.scrollWidth, window.innerWidth * 3);
        const docHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight * 3);
        const maxDistance = Math.max(docWidth, docHeight) * 2;

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

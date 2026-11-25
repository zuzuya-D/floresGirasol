// Interactive Animated Sunflower Engine for 🌻
// Dedicated exclusively to the yellow sunflower bouquet with Login (12ces / cesar) and step-by-step drawing animation.

class SunflowerApp {
    constructor() {
        this.canvas = document.getElementById('flowerCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Offscreen canvas for caching rendered petals
        this.flowerCanvas = document.createElement('canvas');
        this.flowerCtx = this.flowerCanvas.getContext('2d');

        this.flowerKey = 'sunflowers';
        this.speed = 'normal'; // 'slow', 'normal', 'fast', 'instant'
        this.isPaused = false;
        this.isCompleted = false;
        this.isUnlocked = false;

        // Sunflower region data
        this.regions = [];
        this.totalRegions = 0;
        this.currentRegionIdx = 0;
        this.currentPointIdx = 0;
        this.lastStepTime = 0;

        this.bounds = { minX: 0, maxX: 1000, minY: 0, maxY: 1000, scale: 1, cx: 0, cy: 0 };

        // Glowing Turtle pen tip cursor
        this.cursor = { x: 0, y: 0, active: false, color: '#ffbe26' };

        // Ambient particles
        this.stars = [];
        this.petals = [];
        this.sparkles = [];

        // Audio state
        this.audioElement = document.getElementById('bgMusic');
        this.isPlayingCustomAudio = false;

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.initStars();
        this.initPetals();
        this.setupEventListeners();
        this.setupLogin();
        this.setupAudio();

        // Load data but do not start drawing until login is completed
        if (typeof FLOWERS_DATA !== 'undefined' && FLOWERS_DATA[this.flowerKey]) {
            this.regions = FLOWERS_DATA[this.flowerKey];
            this.totalRegions = this.regions.length;
            this.calculateBounds();
        }

        // Start render loop
        requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.flowerCanvas.width = this.width * dpr;
        this.flowerCanvas.height = this.height * dpr;
        this.flowerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.calculateBounds();

        if (this.isCompleted) {
            this.drawCompleteFlower();
        } else if (this.currentRegionIdx > 0) {
            this.redrawUpToCurrent();
        }
    }

    calculateBounds() {
        if (!this.regions || this.regions.length === 0) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let r of this.regions) {
            for (let pt of r.contour) {
                if (pt[0] < minX) minX = pt[0];
                if (pt[0] > maxX) maxX = pt[0];
                if (pt[1] < minY) minY = pt[1];
                if (pt[1] > maxY) maxY = pt[1];
            }
        }

        const dataW = maxX - minX || 1;
        const dataH = maxY - minY || 1;

        const isMobile = this.width < 768;
        const marginX = isMobile ? 24 : 80;
        const marginY = isMobile ? 110 : 90;

        const maxDrawW = Math.max(100, this.width - marginX * 2);
        const maxDrawH = Math.max(100, this.height - marginY * 2);

        const scale = Math.min(maxDrawW / dataW, maxDrawH / dataH);

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        this.bounds = {
            minX, maxX, minY, maxY,
            scale,
            cx, cy,
            screenCx: this.width / 2,
            screenCy: isMobile ? (this.height / 2 - 25) : (this.height / 2 - 10)
        };
    }

    toScreen(x, y) {
        const sx = this.bounds.screenCx + (x - this.bounds.cx) * this.bounds.scale;
        const sy = this.bounds.screenCy + (y - this.bounds.cy) * this.bounds.scale;
        return [sx, sy];
    }

    initStars() {
        this.stars = [];
        const count = Math.floor((this.width * this.height) / 7500);
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 1.5 + 0.6,
                alpha: Math.random() * 0.8 + 0.2,
                speed: Math.random() * 0.025 + 0.008,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    initPetals() {
        this.petals = [];
        const count = 20;
        for (let i = 0; i < count; i++) {
            this.petals.push(this.createPetal(true));
        }
    }

    createPetal(randomY = false) {
        const colors = [
            'rgba(255, 190, 38, 0.75)',
            'rgba(255, 215, 0, 0.7)',
            'rgba(243, 156, 18, 0.65)',
            'rgba(255, 230, 109, 0.7)'
        ];
        return {
            x: Math.random() * this.width,
            y: randomY ? Math.random() * this.height : -25,
            size: Math.random() * 7 + 7,
            vx: (Math.random() - 0.5) * 1.1,
            vy: Math.random() * 0.7 + 0.75,
            rot: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.035,
            color: colors[Math.floor(Math.random() * colors.length)],
            opacity: Math.random() * 0.5 + 0.35,
            osc: Math.random() * 50
        };
    }

    /* =========================================
       LOGIN LOGIC (creamos la contraseña y usuario)
       ========================================= */
    setupLogin() {
        const overlay = document.getElementById('loginOverlay');
        const form = document.getElementById('loginForm');
        const userInput = document.getElementById('loginUser');
        const passInput = document.getElementById('loginPass');
        const togglePassBtn = document.getElementById('togglePassBtn');
        const errorMsg = document.getElementById('loginError');
        const card = document.getElementById('loginCard');

        // Toggle password view
        togglePassBtn.addEventListener('click', () => {
            if (passInput.type === 'password') {
                passInput.type = 'text';
                togglePassBtn.textContent = '🙈';
            } else {
                passInput.type = 'password';
                togglePassBtn.textContent = '👁️';
            }
        });

        const tryLogin = () => {
            const user = (userInput.value || '').trim().toLowerCase();
            const pass = (passInput.value || '').trim().toLowerCase();

            // Credentials requested: Usuario: 12ces | Contraseña: cesar
            if (user === 'zuzuya' && pass === 'cesar') {
                errorMsg.textContent = '';
                this.isUnlocked = true;

                // Unlock animation
                overlay.classList.add('unlocked');

                // Start audio (user gesture allows autoplay)
                this.startMusic();

                // Start flower drawing from 0
                this.startFlowerAnimation();
//puedes poner cualquier nombre
                this.showToast('✨ ¡Bienvenida ! Tu detalle está comenzando 🌻');
            } else {
                errorMsg.textContent = 'Usuario o contraseña incorrectos 💖';
                card.classList.remove('shake');
                void card.offsetWidth; // trigger reflow
                card.classList.add('shake');
            }
        };

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            tryLogin();
        });

        // Focus first input automatically
        setTimeout(() => userInput.focus(), 300);
    }

    startFlowerAnimation() {
        this.isCompleted = false;
        this.isPaused = false;
        this.currentRegionIdx = 0;
        this.currentPointIdx = 0;
        this.cursor.active = true;
        this.lastStepTime = performance.now();

        // Clear offscreen flower canvas
        this.flowerCtx.clearRect(0, 0, this.width, this.height);

        const banner = document.getElementById('dedicationBanner');
        if (banner) banner.classList.remove('completed');

        this.updateBannerText();

        const playBtn = document.getElementById('playPauseBtn');
        if (playBtn) playBtn.innerHTML = '⏸️';
    }

    renderSingleRegion(targetCtx, region) {
        const pts = region.contour;
        if (!pts || pts.length < 3) return;

        const rgb = region.color;
        const colorHex = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

        targetCtx.beginPath();
        const start = this.toScreen(pts[0][0], pts[0][1]);
        targetCtx.moveTo(start[0], start[1]);

        for (let i = 1; i < pts.length; i++) {
            const p = this.toScreen(pts[i][0], pts[i][1]);
            targetCtx.lineTo(p[0], p[1]);
        }
        targetCtx.closePath();

        targetCtx.fillStyle = colorHex;
        targetCtx.fill();
        targetCtx.strokeStyle = colorHex;
        targetCtx.lineWidth = 0.8;
        targetCtx.stroke();
    }

    redrawUpToCurrent() {
        this.flowerCtx.clearRect(0, 0, this.width, this.height);
        for (let i = 0; i < this.currentRegionIdx; i++) {
            this.renderSingleRegion(this.flowerCtx, this.regions[i]);
        }
    }

    drawCompleteFlower() {
        this.flowerCtx.clearRect(0, 0, this.width, this.height);
        for (let r of this.regions) {
            this.renderSingleRegion(this.flowerCtx, r);
        }
        this.cursor.active = false;
    }

    updateBannerText() {
        const bannerText = document.getElementById('bannerText');
        const banner = document.getElementById('dedicationBanner');
        if (!bannerText) return;

        if (this.isCompleted) {
            if (banner) banner.classList.add('completed');
            bannerText.innerHTML = `¡Feliz día amor, te quiero mucho! 🌻💛`;
        } else {
            if (banner) banner.classList.remove('completed');
            const percent = Math.min(100, Math.round((this.currentRegionIdx / this.totalRegions) * 100));
            bannerText.innerHTML = `Armando tus girasoles con amor... 🌻 (${percent}%)`;
        }
    }

    addSparkle(x, y, color = '#ffdf6d') {
        if (this.sparkles.length > 60) return;
        this.sparkles.push({
            x, y,
            vx: (Math.random() - 0.5) * 2.5,
            vy: (Math.random() - 0.5) * 2.5,
            size: Math.random() * 3 + 2,
            alpha: 1,
            color
        });
    }

    /* =========================================
       ANIMACIÓN DE DIBUJO ("TIENE QUE ARMARSE")
       ========================================= */
    stepDraw(currentTime) {
        if (!this.isUnlocked || this.isCompleted || this.isPaused || !this.regions || this.regions.length === 0) return;

        if (this.speed === 'instant') {
            this.drawCompleteFlower();
            this.finishDrawing();
            return;
        }

        // Determine step timing depending on speed
        let delayMs = 65; // 'normal' default (~11 seconds total)
        if (this.speed === 'slow') delayMs = 180;
        if (this.speed === 'fast') delayMs = 20;

        const elapsed = currentTime - this.lastStepTime;
        if (elapsed < delayMs) return;

        this.lastStepTime = currentTime;

        if (this.currentRegionIdx >= this.totalRegions) {
            this.finishDrawing();
            return;
        }

        const region = this.regions[this.currentRegionIdx];
        const pts = region.contour;

        // Render current region to flower canvas
        this.renderSingleRegion(this.flowerCtx, region);

        // Position cursor at representative vertex and emit sparkles
        const midIdx = Math.floor(pts.length / 2);
        const samplePt = this.toScreen(pts[midIdx][0], pts[midIdx][1]);
        this.cursor.x = samplePt[0];
        this.cursor.y = samplePt[1];
        this.cursor.color = `rgb(${region.color[0]}, ${region.color[1]}, ${region.color[2]})`;

        this.addSparkle(samplePt[0], samplePt[1], this.cursor.color);

        this.currentRegionIdx++;
        this.updateBannerText();

        if (this.currentRegionIdx >= this.totalRegions) {
            this.finishDrawing();
        }
    }

    finishDrawing() {
        this.isCompleted = true;
        this.cursor.active = false;
        this.updateBannerText();

        const playBtn = document.getElementById('playPauseBtn');
        if (playBtn) playBtn.innerHTML = '🔄';

        // Play gentle chime on completion if synthesizer active
        if (window.romanticAudio) {
            window.romanticAudio.playChime();
        }

        // Sparkle explosion celebration
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 220;
            this.addSparkle(
                this.bounds.screenCx + Math.cos(angle) * dist,
                this.bounds.screenCy + Math.sin(angle) * dist,
                '#ffd700'
            );
        }

        this.showToast("✨ ¡Feliz día amor, te quiero mucho ! 🌻💛");
    }

    /* =========================================
       MAIN RENDER LOOP
       ========================================= */
    loop(timestamp) {
        this.stepDraw(timestamp);

        // 1. Clear background
        this.ctx.fillStyle = '#07070b';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 2. Stars
        this.drawStars(timestamp);

        // 3. Ambient warm gold glow behind sunflowers
        this.drawAmbientGlow();

        // 4. Draw sunflower offscreen canvas
        this.ctx.drawImage(this.flowerCanvas, 0, 0, this.width, this.height);

        // 5. Active pen cursor with golden aura
        if (this.cursor.active && !this.isCompleted) {
            this.drawCursor();
        }

        // 6. Floating petals
        this.drawPetals();

        // 7. Sparkles
        this.drawSparkles();

        requestAnimationFrame((t) => this.loop(t));
    }

    drawStars(t) {
        for (let s of this.stars) {
            const flicker = Math.sin(t * s.speed + s.phase) * 0.35 + 0.65;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * flicker})`;
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawAmbientGlow() {
        const glowRadius = Math.min(this.width, this.height) * 0.45;
        const radial = this.ctx.createRadialGradient(
            this.bounds.screenCx, this.bounds.screenCy, 10,
            this.bounds.screenCx, this.bounds.screenCy, glowRadius
        );

        radial.addColorStop(0, 'rgba(255, 190, 38, 0.09)');
        radial.addColorStop(0.5, 'rgba(255, 180, 20, 0.03)');
        radial.addColorStop(1, 'rgba(7, 7, 11, 0)');

        this.ctx.fillStyle = radial;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawCursor() {
        const { x, y, color } = this.cursor;

        // Outer radial aura
        const rad = this.ctx.createRadialGradient(x, y, 1, x, y, 18);
        rad.addColorStop(0, '#ffffff');
        rad.addColorStop(0.3, color);
        rad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        this.ctx.fillStyle = rad;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 18, 0, Math.PI * 2);
        this.ctx.fill();

        // Core pen point
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawPetals() {
        for (let i = 0; i < this.petals.length; i++) {
            const p = this.petals[i];
            p.y += p.vy;
            p.x += Math.sin((p.y + p.osc) * 0.02) * 0.8 + p.vx;
            p.rot += p.vRot;

            if (p.y > this.height + 30) {
                this.petals[i] = this.createPetal(false);
            }

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rot);
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.opacity;

            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, p.size * 0.45, p.size, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
        this.ctx.globalAlpha = 1.0;
    }

    drawSparkles() {
        for (let i = this.sparkles.length - 1; i >= 0; i--) {
            const sp = this.sparkles[i];
            sp.x += sp.vx;
            sp.y += sp.vy;
            sp.alpha -= 0.024;

            if (sp.alpha <= 0) {
                this.sparkles.splice(i, 1);
                continue;
            }

            this.ctx.fillStyle = sp.color;
            this.ctx.globalAlpha = sp.alpha;
            this.ctx.beginPath();
            this.ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1.0;
    }

    /* =========================================
       AUDIO INTEGRATION
       ========================================= */
    setupAudio() {
        const musicBtn = document.getElementById('musicBtn');
        const uploadBtn = document.getElementById('uploadMusicBtn');
        const fileInput = document.getElementById('audioFileInput');

        if (musicBtn) {
            musicBtn.addEventListener('click', () => {
                this.toggleMusic();
            });
        }

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const fileUrl = URL.createObjectURL(file);
                if (this.audioElement) {
                    this.audioElement.src = fileUrl;
                    this.audioElement.play().then(() => {
                        this.isPlayingCustomAudio = true;
                        if (window.romanticAudio) window.romanticAudio.stop();
                        this.setMusicBtnState(true);
                        this.showToast(`🎵 Reproduciendo: ${file.name}`);
                    }).catch(err => {
                        console.error('Error al reproducir audio seleccionado:', err);
                    });
                }
            });
        }
    }

    startMusic() {
        const musicBtn = document.getElementById('musicBtn');

        if (this.audioElement) {
            const playPromise = this.audioElement.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    this.isPlayingCustomAudio = true;
                    this.setMusicBtnState(true);
                    console.log('Reproduciendo musica.mp3');
                }).catch(err => {
                    console.log('musica.mp3 no encontrada o bloqueada, activando sintetizador romántico:', err);
                    this.isPlayingCustomAudio = false;
                    if (window.romanticAudio) {
                        window.romanticAudio.start();
                        this.setMusicBtnState(true);
                    }
                });
                return;
            }
        }

        if (window.romanticAudio) {
            window.romanticAudio.start();
            this.setMusicBtnState(true);
        }
    }

    toggleMusic() {
        const musicBtn = document.getElementById('musicBtn');
        const isPlaying = musicBtn && musicBtn.classList.contains('playing');

        if (isPlaying) {
            if (this.audioElement && this.isPlayingCustomAudio) {
                this.audioElement.pause();
            }
            if (window.romanticAudio) {
                window.romanticAudio.stop();
            }
            this.setMusicBtnState(false);
            this.showToast('🔇 Música pausada');
        } else {
            this.startMusic();
            this.showToast('🎵 Música activada');
        }
    }

    setMusicBtnState(isPlaying) {
        const musicBtn = document.getElementById('musicBtn');
        if (!musicBtn) return;
        if (isPlaying) {
            musicBtn.classList.add('playing');
        } else {
            musicBtn.classList.remove('playing');
        }
    }

    /* =========================================
       USER CONTROLS & LISTENERS
       ========================================= */
    setupEventListeners() {
        // Play / Pause
        const playBtn = document.getElementById('playPauseBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (this.isCompleted) {
                    this.startFlowerAnimation();
                    return;
                }
                this.isPaused = !this.isPaused;
                playBtn.innerHTML = this.isPaused ? '▶️' : '⏸️';
            });
        }

        // Replay from scratch
        const replayBtn = document.getElementById('replayBtn');
        if (replayBtn) {
            replayBtn.addEventListener('click', () => {
                this.startFlowerAnimation();
                this.showToast('🔄 Armando el ramo nuevamente...');
            });
        }

        // Speed select
        const speedSelect = document.getElementById('speedSelect');
        if (speedSelect) {
            speedSelect.addEventListener('change', (e) => {
                this.speed = e.target.value;
                this.showToast(`⚡ Velocidad cambiada a: ${e.target.options[e.target.selectedIndex].text}`);
            });
        }

        // Dedication letter toggle
        const letterBtn = document.getElementById('letterBtn');
        const card = document.getElementById('dedicationCard');
        const cardCloseBtn = document.getElementById('cardCloseBtn');

        if (letterBtn && card) {
            letterBtn.addEventListener('click', () => {
                card.classList.toggle('minimized');
            });
        }
        if (cardCloseBtn && card) {
            cardCloseBtn.addEventListener('click', () => {
                card.classList.add('minimized');
            });
        }

        // Banner click opens letter
        const banner = document.getElementById('dedicationBanner');
        if (banner && card) {
            banner.addEventListener('click', () => {
                card.classList.toggle('minimized');
            });
        }

        // Capture / Export PNG
        const captureBtn = document.getElementById('captureBtn');
        if (captureBtn) {
            captureBtn.addEventListener('click', () => {
                this.exportImage();
            });
        }

        // Fullscreen
        const fsBtn = document.getElementById('fullscreenBtn');
        if (fsBtn) {
            fsBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                } else {
                    document.exitFullscreen().catch(() => {});
                }
            });
        }
    }

    exportImage() {
        const exportCanvas = document.createElement('canvas');
        const expCtx = exportCanvas.getContext('2d');
        const w = 1200;
        const h = 1200;
        exportCanvas.width = w;
        exportCanvas.height = h;

        // Background
        expCtx.fillStyle = '#07070b';
        expCtx.fillRect(0, 0, w, h);

        // Radial glow
        const rad = expCtx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, 500);
        rad.addColorStop(0, 'rgba(255, 190, 38, 0.15)');
        rad.addColorStop(1, 'rgba(7, 7, 11, 0)');
        expCtx.fillStyle = rad;
        expCtx.fillRect(0, 0, w, h);

        // Draw flowers
        expCtx.drawImage(this.flowerCanvas, (w - this.width) / 2, (h - this.height) / 2);

        // Dedication text watermark
        expCtx.font = 'bold 36px "Playfair Display", Georgia, serif';
        expCtx.fillStyle = '#ffd166';
        expCtx.textAlign = 'center';
        expCtx.fillText('¡Feliz día amor, te quiero mucho! 🌻', w / 2, h - 80);

        expCtx.font = '22px "Poppins", sans-serif';
        expCtx.fillStyle = '#f0f0f5';
        expCtx.fillText('Con todo mi amor, César 💛', w / 2, h - 40);

        const dataUrl = exportCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'Girasoles_Para_ti.png';
        a.click();
        this.showToast('📸 ¡Imagen guardada con éxito!');
    }

    showToast(msg) {
        const toast = document.getElementById('toastMsg');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3200);
    }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
    window.sunflowerApp = new SunflowerApp();
});

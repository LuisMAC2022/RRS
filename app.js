const OBJECT_TYPES = Object.freeze({
  PET: 'pet',
  BASURA: 'basura',
  COMPONENTE: 'componente',
});

const PET_COLORS = [
  { id: 'transparente', label: 'Transparente', color: '#a6e3ff' },
  { id: 'azul', label: 'Azul', color: '#60a5fa' },
  { id: 'verde', label: 'Verde', color: '#34d399' },
  { id: 'dorado', label: 'Dorado', color: '#fbbf24' },
];

class ObjetoCayendo {
  constructor(type, x, y, speed, colorId = null, contamination = 0) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.radius = 14;
    this.speed = speed;
    this.colorId = colorId;
    this.contamination = contamination; // 0 a 1
  }

  update(delta) {
    this.y += this.speed * delta;
  }

  draw(ctx) {
    ctx.save();
    if (this.type === OBJECT_TYPES.PET) {
      const petColor = PET_COLORS.find((c) => c.id === this.colorId) || PET_COLORS[0];
      ctx.fillStyle = petColor.color;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
    } else if (this.type === OBJECT_TYPES.BASURA) {
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 2;
    } else {
      ctx.fillStyle = '#c084fc';
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 2;
    }
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

class Bote {
  constructor(canvasWidth, canvasHeight) {
    this.width = 90;
    this.height = 24;
    this.x = canvasWidth / 2 - this.width / 2;
    this.y = canvasHeight - this.height - 12;
    this.speed = 240;
    this.capacidadMaxima = 10;
    this.capacidadActual = 0;
    this.contaminacion = 0; // 0 a 1
  }

  move(direction, delta, canvasWidth) {
    this.x += direction * this.speed * delta;
    this.x = Math.max(0, Math.min(this.x, canvasWidth - this.width));
  }

  puedeRecoger() {
    return this.capacidadActual < this.capacidadMaxima;
  }

  collect(objeto) {
    if (!this.puedeRecoger()) return false;
    this.capacidadActual += 1;
    this.contaminacion = Math.min(
      1,
      this.contaminacion + (objeto.type === OBJECT_TYPES.BASURA ? 0.35 : objeto.contamination)
    );
    return true;
  }

  vaciar() {
    const carga = {
      pet: this.capacidadActual,
      contaminacion: this.contaminacion,
    };
    this.capacidadActual = 0;
    this.contaminacion = 0;
    return carga;
  }

  draw(ctx) {
    ctx.save();
    const baseGradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
    baseGradient.addColorStop(0, '#0ea5e9');
    baseGradient.addColorStop(1, '#0369a1');
    ctx.fillStyle = baseGradient;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    const contaminationHeight = this.contaminacion * this.height;
    if (contaminationHeight > 0) {
      ctx.fillStyle = 'rgba(239,68,68,0.35)';
      ctx.fillRect(this.x, this.y + this.height - contaminationHeight, this.width, contaminationHeight);
    }

    ctx.restore();
  }
}

class Almacenamiento {
  constructor() {
    this.materialesSinProcesar = PET_COLORS.reduce((acc, color) => ({ ...acc, [color.id]: 0 }), {});
    this.materialesProcesados = 0;
    this.componentes = 0;
    this.maquinaria = 0;
    this.contaminacionHistorica = [];
  }

  depositarCarga(carga, detalles) {
    if (detalles.petColores.length) {
      detalles.petColores.forEach((colorId) => {
        this.materialesSinProcesar[colorId] += 1;
      });
    }
    if (detalles.componentes > 0) {
      this.componentes += detalles.componentes;
    }
    this.contaminacionHistorica.push(carga.contaminacion);
    if (this.contaminacionHistorica.length > 20) {
      this.contaminacionHistorica.shift();
    }
  }
}

class HUD {
  constructor() {
    this.capacidadActual = document.getElementById('hud-capacidad-actual');
    this.capacidadMaxima = document.getElementById('hud-capacidad-maxima');
    this.contaminacion = document.getElementById('hud-contaminacion');
    this.petPorColor = {
      transparente: document.getElementById('hud-pet-transparente'),
      azul: document.getElementById('hud-pet-azul'),
      verde: document.getElementById('hud-pet-verde'),
      dorado: document.getElementById('hud-pet-dorado'),
    };
    this.componentes = document.getElementById('hud-componentes');
    this.maquinaria = document.getElementById('hud-maquinaria');
  }

  updateBote(bote) {
    this.capacidadActual.textContent = bote.capacidadActual.toString();
    this.capacidadMaxima.textContent = bote.capacidadMaxima.toString();
    this.contaminacion.textContent = `${Math.round(bote.contaminacion * 100)}%`;
  }

  updateAlmacenamiento(almacenamiento) {
    PET_COLORS.forEach((color) => {
      this.petPorColor[color.id].textContent = almacenamiento.materialesSinProcesar[color.id];
    });
    this.componentes.textContent = almacenamiento.componentes;
    this.maquinaria.textContent = almacenamiento.maquinaria;
  }
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.objects = [];
    this.bote = new Bote(canvas.width, canvas.height);
    this.almacenamiento = new Almacenamiento();
    this.hud = new HUD();
    this.lastTimestamp = 0;
    this.spawnTimer = 0;
    this.reducedMotion = canvas.dataset.reducedMotion === 'true';
    const intervaloPreferido = canvas.dataset.spawnInterval
      ? Number.parseInt(canvas.dataset.spawnInterval, 10)
      : 950;
    this.spawnInterval = Number.isFinite(intervaloPreferido) ? intervaloPreferido : 950;
    this.spawnRange = this.reducedMotion ? [1100, 1600] : [800, 1300];
    this.keys = new Set();
    this.petColoresEnBote = [];
    this.componentesEnBote = 0;
    this.inicializarEventos();
    this.resizeCanvas();
    window.requestAnimationFrame((ts) => this.loop(ts));
  }

  inicializarEventos() {
    window.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        this.keys.add(event.key);
      }
      if (event.code === 'Space') {
        event.preventDefault();
        this.vaciarBote();
      }
    });

    window.addEventListener('keyup', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        this.keys.delete(event.key);
      }
    });

    document.getElementById('mover-izquierda').addEventListener('click', () => {
      this.moverBote(-1, 1 / 60);
    });
    document.getElementById('mover-derecha').addEventListener('click', () => {
      this.moverBote(1, 1 / 60);
    });
    document.getElementById('vaciar-bote').addEventListener('click', () => this.vaciarBote());

    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const ratio = this.canvas.width / this.canvas.height;
    const availableWidth = this.canvas.clientWidth;
    const newWidth = Math.max(320, availableWidth);
    const newHeight = newWidth / ratio;
    this.canvas.width = newWidth;
    this.canvas.height = newHeight;
    this.bote.y = this.canvas.height - this.bote.height - 12;
  }

  loop(timestamp) {
    const delta = Math.min(1, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;

    this.update(delta);
    this.draw();

    window.requestAnimationFrame((ts) => this.loop(ts));
  }

  update(delta) {
    this.spawnTimer += delta * 1000;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnObjeto();
      const [min, max] = this.spawnRange;
      this.spawnInterval = min + Math.random() * (max - min);
    }

    this.applyInput(delta);
    this.objects.forEach((obj) => obj.update(delta));
    this.detectarColisiones();
    this.objects = this.objects.filter((obj) => obj.y - obj.radius <= this.canvas.height + 20);
    this.hud.updateBote(this.bote);
    this.hud.updateAlmacenamiento(this.almacenamiento);
  }

  applyInput(delta) {
    let direction = 0;
    if (this.keys.has('ArrowLeft')) direction -= 1;
    if (this.keys.has('ArrowRight')) direction += 1;
    if (direction !== 0) {
      this.moverBote(direction, delta);
    }
  }

  moverBote(direction, delta) {
    this.bote.move(direction, delta, this.canvas.width);
  }

  spawnObjeto() {
    const x = Math.random() * (this.canvas.width - 40) + 20;
    const speed = (this.reducedMotion ? 60 : 90) + Math.random() * 90;
    const typeRoll = Math.random();
    if (typeRoll < 0.65) {
      const color = PET_COLORS[Math.floor(Math.random() * PET_COLORS.length)];
      const contamination = 0.05 + Math.random() * 0.25;
      this.objects.push(new ObjetoCayendo(OBJECT_TYPES.PET, x, -10, speed, color.id, contamination));
    } else if (typeRoll < 0.85) {
      const contamination = 0.45 + Math.random() * 0.3;
      this.objects.push(new ObjetoCayendo(OBJECT_TYPES.BASURA, x, -10, speed, null, contamination));
    } else {
      this.objects.push(new ObjetoCayendo(OBJECT_TYPES.COMPONENTE, x, -10, speed, null, 0));
    }
  }

  detectarColisiones() {
    this.objects = this.objects.filter((objeto) => {
      if (!this.bote.puedeRecoger()) return true;
      const enRangoVertical = objeto.y + objeto.radius >= this.bote.y;
      const enRangoHorizontal =
        objeto.x + objeto.radius >= this.bote.x && objeto.x - objeto.radius <= this.bote.x + this.bote.width;

      if (enRangoVertical && enRangoHorizontal) {
        const recogido = this.bote.collect(objeto);
        if (recogido) {
          if (objeto.type === OBJECT_TYPES.PET) {
            this.petColoresEnBote.push(objeto.colorId);
          }
          if (objeto.type === OBJECT_TYPES.COMPONENTE) {
            this.componentesEnBote += 1;
          }
          return false;
        }
      }
      return true;
    });
  }

  vaciarBote() {
    if (this.bote.capacidadActual === 0) return;
    const carga = this.bote.vaciar();
    this.almacenamiento.depositarCarga(carga, {
      petColores: [...this.petColoresEnBote],
      componentes: this.componentesEnBote,
    });
    this.petColoresEnBote = [];
    this.componentesEnBote = 0;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBackground();
    this.objects.forEach((obj) => obj.draw(this.ctx));
    this.bote.draw(this.ctx);
    this.drawHUDOverlay();
  }

  drawBackground() {
    const { width, height } = this.canvas;
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0f273b');
    gradient.addColorStop(1, '#0a1322');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    this.ctx.lineWidth = 1;
    const gridSize = 80;
    for (let x = 0; x < width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
  }

  drawHUDOverlay() {
    const label = `Capacidad: ${this.bote.capacidadActual}/${this.bote.capacidadMaxima}`;
    this.ctx.fillStyle = 'rgba(255,255,255,0.85)';
    this.ctx.font = '16px "Inter", system-ui, sans-serif';
    this.ctx.fillText(label, 12, 22);

    const contaminationText = `Contaminación: ${Math.round(this.bote.contaminacion * 100)}%`;
    this.ctx.fillText(contaminationText, 12, 44);

    if (this.bote.contaminacion >= 0.9) {
      this.ctx.fillStyle = '#ef4444';
      this.ctx.fillText('Lote no vendible por contaminación alta', 12, 66);
    }
  }
}

function init() {
  const canvas = document.getElementById('juego-canvas');
  if (!canvas.getContext) return;
  // Respeta preferencia por reducir movimiento con velocidades menores.
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    canvas.dataset.reducedMotion = 'true';
    canvas.dataset.spawnInterval = '1200';
  }
  new Game(canvas);
}

document.addEventListener('DOMContentLoaded', init);

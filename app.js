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

// --- Jardín emergente 42x42 ---

const PLANT_STATES = Object.freeze({
  EMPTY: 'empty',
  SEEDLING: 'seedling',
  JUVENILE: 'juvenile',
  MATURE: 'mature',
  DORMANT: 'dormant',
  DEAD: 'dead',
});

const GARDEN_SIZE = 42;
const STEP_DURATION = 0.25; // segundos

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

class SoilCell {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.moisture = 0.42 + Math.random() * 0.18;
    this.nutrients = 0.38 + Math.random() * 0.2;
    this.sunlight = clamp(0.55 + 0.25 * (1 - y / (height - 1)) + (Math.random() * 0.05 - 0.025), 0.45, 1);
    this.compaction = clamp(0.22 + Math.random() * 0.18 + 0.08 * (y / (height - 1)), 0.18, 0.85);
    this.temperature = 0.58 + Math.random() * 0.08;
    this.plantState = PLANT_STATES.EMPTY;
    this.health = 0;
    this.biomass = 0;
    this.timeInState = 0;
  }
}

class GardenGrid {
  constructor(width = GARDEN_SIZE, height = GARDEN_SIZE) {
    this.width = width;
    this.height = height;
    this.cells = [];
    this.elapsed = 0;
    this.metrics = {
      moistureAvg: 0,
      nutrientAvg: 0,
      coverage: 0,
      reproductionRate: 0,
    };
    this.seedInitialCells();
  }

  seedInitialCells() {
    this.cells = [];
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const cell = new SoilCell(x, y, this.width, this.height);
        if (Math.hypot(x - this.width / 2, y - this.height / 2) < 4) {
          cell.plantState = PLANT_STATES.SEEDLING;
          cell.health = 0.25;
          cell.biomass = 0.12;
        }
        this.cells.push(cell);
      }
    }
  }

  index(x, y) {
    return y * this.width + x;
  }

  getNeighbors(x, y, source = this.cells) {
    const neighbors = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          neighbors.push(source[this.index(nx, ny)]);
        }
      }
    }
    return neighbors;
  }

  calculateEnvQuality(cell) {
    const structure = 1 - cell.compaction * 0.6;
    const tempPenalty = Math.abs(cell.temperature - 0.65) * 0.35;
    const base = cell.moisture * 0.35 + cell.nutrients * 0.35 + cell.sunlight * 0.2 + structure * 0.1;
    return clamp(base - tempPenalty, 0, 1);
  }

  step(delta) {
    this.elapsed += delta;
    if (this.elapsed < STEP_DURATION) return;
    this.elapsed = 0;

    const newCells = this.cells.map((cell) => ({ ...cell }));
    let reproductionEvents = 0;
    let coverage = 0;
    let moistureSum = 0;
    let nutrientSum = 0;

    const reproductionCandidates = [];

    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const idx = this.index(x, y);
        const cell = newCells[idx];
        const envQuality = this.calculateEnvQuality(cell);
        const neighbors = this.getNeighbors(x, y, newCells);

        const neighborMoisture = neighbors.reduce((acc, n) => acc + n.moisture, 0) / Math.max(neighbors.length, 1);
        const neighborNutrients = neighbors.reduce((acc, n) => acc + n.nutrients, 0) / Math.max(neighbors.length, 1);

        const moistureRecovery = 0.015 + (0.52 - cell.moisture) * 0.02;
        const nutrientRecovery = 0.002 + (0.5 - cell.compaction) * 0.002;

        if (cell.plantState !== PLANT_STATES.EMPTY && cell.plantState !== PLANT_STATES.DEAD) {
          const consumption = cell.plantState === PLANT_STATES.MATURE ? 0.028 : 0.018;
          cell.moisture = clamp(cell.moisture - consumption, 0, 1);
          cell.nutrients = clamp(cell.nutrients - consumption * 0.35, 0, 1);

          let growth = (envQuality - 0.52) * 0.35;
          if (cell.plantState === PLANT_STATES.SEEDLING) growth *= 1.1;
          if (envQuality < 0.38) growth -= 0.06;
          if (cell.compaction > 0.75) growth -= 0.03;
          cell.health = clamp(cell.health + growth, -1, 1);
          cell.biomass = clamp(cell.biomass + Math.max(0, growth) * 0.6, 0, 1);
          cell.timeInState += STEP_DURATION;

          if (cell.plantState === PLANT_STATES.SEEDLING && cell.timeInState > 4 && cell.health > 0.05) {
            cell.plantState = PLANT_STATES.JUVENILE;
            cell.timeInState = 0;
          } else if (cell.plantState === PLANT_STATES.JUVENILE && cell.timeInState > 10 && envQuality > 0.55) {
            cell.plantState = PLANT_STATES.MATURE;
            cell.timeInState = 0;
          }

          if (cell.health < -0.35 || cell.moisture < 0.1) {
            cell.plantState = PLANT_STATES.DEAD;
            cell.health = -0.4;
            cell.timeInState = 0;
            cell.nutrients = clamp(cell.nutrients + 0.12 + cell.biomass * 0.2, 0, 1);
            cell.compaction = clamp(cell.compaction - 0.05, 0.05, 1);
          }

          if (cell.plantState === PLANT_STATES.MATURE && cell.health > 0.25 && envQuality > 0.6) {
            reproductionCandidates.push({ x, y, vigor: envQuality });
          }
        }

        if (cell.plantState === PLANT_STATES.DEAD && cell.timeInState > 8) {
          cell.plantState = PLANT_STATES.EMPTY;
          cell.health = 0;
          cell.biomass = 0;
          cell.timeInState = 0;
        }

        cell.moisture = clamp(
          cell.moisture + moistureRecovery + (neighborMoisture - cell.moisture) * 0.08,
          0,
          1
        );
        cell.nutrients = clamp(
          cell.nutrients + nutrientRecovery + (neighborNutrients - cell.nutrients) * 0.04,
          0,
          1
        );
        cell.temperature = clamp(cell.temperature + (0.6 - cell.temperature) * 0.02, 0, 1);
        cell.compaction = clamp(
          cell.compaction + (cell.moisture < 0.25 ? 0.002 : -0.003) + (0.48 - cell.compaction) * 0.01,
          0.08,
          0.9
        );

        if (cell.plantState !== PLANT_STATES.EMPTY && cell.plantState !== PLANT_STATES.DEAD) {
          coverage += 1;
        }
        moistureSum += cell.moisture;
        nutrientSum += cell.nutrients;
      }
    }

    reproductionCandidates.forEach((candidate) => {
      const { x, y, vigor } = candidate;
      const targets = this.getNeighbors(x, y, newCells);
      targets.forEach((neighbor) => {
        if (neighbor.plantState === PLANT_STATES.EMPTY) {
          const envQuality = this.calculateEnvQuality(neighbor);
          if (envQuality > 0.55 && neighbor.moisture > 0.35 && neighbor.nutrients > 0.32) {
            const probability = 0.2 + vigor * 0.35;
            if (Math.random() < probability) {
              neighbor.plantState = PLANT_STATES.SEEDLING;
              neighbor.health = 0.18;
              neighbor.biomass = 0.08;
              neighbor.timeInState = 0;
              neighbor.moisture = clamp(neighbor.moisture - 0.08, 0, 1);
              neighbor.nutrients = clamp(neighbor.nutrients - 0.05, 0, 1);
              reproductionEvents += 1;
            }
          }
        }
      });
    });

    const totalCells = this.width * this.height;
    coverage += reproductionEvents;
    this.metrics.moistureAvg = moistureSum / totalCells;
    this.metrics.nutrientAvg = nutrientSum / totalCells;
    this.metrics.coverage = coverage / totalCells;
    const eventsPerMinute = reproductionEvents * (60 / STEP_DURATION);
    this.metrics.reproductionRate = this.metrics.reproductionRate * 0.85 + eventsPerMinute * 0.15;

    this.cells = newCells;
  }
}

class GardenHUD {
  constructor() {
    this.humedad = document.getElementById('hud-humedad-promedio');
    this.nutrientes = document.getElementById('hud-nutrientes-promedio');
    this.cobertura = document.getElementById('hud-cobertura');
    this.reproduccion = document.getElementById('hud-reproduccion');
  }

  update(metrics) {
    this.humedad.textContent = metrics.moistureAvg.toFixed(2);
    this.nutrientes.textContent = metrics.nutrientAvg.toFixed(2);
    this.cobertura.textContent = `${Math.round(metrics.coverage * 100)}%`;
    this.reproduccion.textContent = `${metrics.reproductionRate.toFixed(1)} eventos/min`;
  }
}

class GardenGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.grid = new GardenGrid();
    this.hud = new GardenHUD();
    this.lastTimestamp = 0;
    window.requestAnimationFrame((ts) => this.loop(ts));
  }

  loop(timestamp) {
    const delta = Math.min(1, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;

    this.grid.step(delta);
    this.draw();
    this.hud.update(this.grid.metrics);

    window.requestAnimationFrame((ts) => this.loop(ts));
  }

  draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    const cellSize = Math.floor(Math.min(width, height) / this.grid.width);
    const offsetX = (width - cellSize * this.grid.width) / 2;
    const offsetY = (height - cellSize * this.grid.height) / 2;

    this.grid.cells.forEach((cell, index) => {
      const x = index % this.grid.width;
      const y = Math.floor(index / this.grid.width);
      const px = offsetX + x * cellSize;
      const py = offsetY + y * cellSize;

      this.ctx.fillStyle = this.getSoilColor(cell);
      this.ctx.fillRect(px, py, cellSize, cellSize);

      const plantColor = this.getPlantColor(cell.plantState, cell.health);
      if (plantColor) {
        this.ctx.fillStyle = plantColor;
        const padding = cellSize * 0.15;
        this.ctx.fillRect(px + padding, py + padding, cellSize - padding * 2, cellSize - padding * 2);
      }
    });

    this.ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= this.grid.width; x += 1) {
      const px = offsetX + x * cellSize + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(px, offsetY);
      this.ctx.lineTo(px, offsetY + cellSize * this.grid.height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.grid.height; y += 1) {
      const py = offsetY + y * cellSize + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(offsetX, py);
      this.ctx.lineTo(offsetX + cellSize * this.grid.width, py);
      this.ctx.stroke();
    }
  }

  getSoilColor(cell) {
    const moistureTone = 60 + cell.moisture * 80;
    const nutrientTone = 45 + cell.nutrients * 90;
    const compactionShadow = (1 - cell.compaction) * 40;
    return `rgb(${Math.round(moistureTone + 10)}, ${Math.round(nutrientTone)}, ${Math.round(40 + compactionShadow)})`;
  }

  getPlantColor(state, health) {
    if (state === PLANT_STATES.SEEDLING) return 'rgba(52, 211, 153, 0.75)';
    if (state === PLANT_STATES.JUVENILE) return 'rgba(34, 197, 94, 0.85)';
    if (state === PLANT_STATES.MATURE) return 'rgba(21, 128, 61, 0.95)';
    if (state === PLANT_STATES.DEAD) return 'rgba(148, 163, 184, 0.65)';
    if (state === PLANT_STATES.DORMANT) return 'rgba(120, 113, 108, 0.55)';
    return null;
  }
}

function initGarden() {
  const canvas = document.getElementById('garden-canvas');
  if (!canvas || !canvas.getContext) return;
  new GardenGame(canvas);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGarden, { once: true });
} else {
  initGarden();
}

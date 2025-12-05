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

const CLOVER_SPECIES = Object.freeze({
  name: 'Trébol blanco',
  baseGrowth: 0.35,
  idealMoisture: [0.35, 0.75],
  idealNutrients: [0.4, 1],
  compactionTolerance: 0.7,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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

class GardenGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.grid = new GardenGrid(42, 42);
    this.hud = new GardenHUD();
    this.cellSize = 12;
    this.lastTimestamp = 0;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    window.requestAnimationFrame((ts) => this.loop(ts));
  }

  resizeCanvas() {
    const minSize = 420;
    const maxSize = 760;
    const available = Math.max(minSize, Math.min(maxSize, this.canvas.clientWidth || this.canvas.width));
    this.canvas.width = available;
    this.canvas.height = available;
    this.cellSize = this.canvas.width / this.grid.width;
  }

  loop(timestamp) {
    const delta = Math.min(1, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;
    const step = this.reducedMotion ? delta * 0.6 : delta;
    this.grid.update(step);
    this.draw();
    this.hud.update(this.grid.getStats());
    window.requestAnimationFrame((ts) => this.loop(ts));
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.grid.draw(this.ctx, this.cellSize);
    this.drawGridOverlay();
  }

  drawGridOverlay() {
    this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= this.canvas.width; x += this.cellSize * 6) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.canvas.height; y += this.cellSize * 6) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
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

class SoilCell {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.moisture = 0.45 + Math.random() * 0.25;
    this.nutrients = 0.5 + Math.random() * 0.2;
    this.sun = 0.55 + Math.random() * 0.25;
    this.compaction = 0.25 + Math.random() * 0.35;
    this.temperature = 0.55 + Math.random() * 0.15;
    this.plant = null;
  }

  adjustEnvironment(delta) {
    const evaporation = 0.02 * delta + this.sun * 0.015 * delta;
    const lightRain = Math.random() < 0.04 ? 0.12 * delta : 0;
    this.moisture = clamp(this.moisture - evaporation + lightRain, 0, 1);

    const nutrientRecovery = 0.01 * delta;
    this.nutrients = clamp(this.nutrients + nutrientRecovery, 0, 1.1);

    const heatDrift = (this.sun - 0.5) * 0.02 * delta;
    this.temperature = clamp(this.temperature + heatDrift, 0, 1.1);
  }
}

class Plant {
  constructor(species) {
    this.species = species;
    this.growth = 0.2 + Math.random() * 0.1;
    this.vigor = 1;
  }

  clone() {
    const copy = new Plant(this.species);
    copy.growth = this.growth;
    copy.vigor = this.vigor;
    return copy;
  }

  comfortScore(value, [min, max]) {
    if (value < min) return (value - min) * 1.8;
    if (value > max) return (max - value) * 1.6;
    return 0.5 + (value - min) / (max - min + 0.0001);
  }

  update(cell, neighborPlants, delta) {
    const waterFit = this.comfortScore(cell.moisture, this.species.idealMoisture);
    const nutrientFit = this.comfortScore(cell.nutrients, this.species.idealNutrients);
    const compactionPenalty = cell.compaction > this.species.compactionTolerance ? 0.25 : 0;
    const crowdingPenalty = Math.max(0, neighborPlants.length - 4) * 0.05;

    const heatPenalty = cell.temperature > 0.9 ? 0.15 : 0;
    const growthDelta = (this.species.baseGrowth + 0.25 * waterFit + 0.2 * nutrientFit - compactionPenalty - heatPenalty) * delta;
    const stress = Math.max(0, 0.4 - (waterFit + nutrientFit) * 0.35);
    this.growth = clamp(this.growth + growthDelta - stress * delta - crowdingPenalty * delta, 0, 1.3);

    if (waterFit < 0.2 || nutrientFit < 0.2) {
      this.vigor -= 0.25 * delta;
    } else {
      this.vigor = clamp(this.vigor + 0.1 * delta, 0, 1.2);
    }

    const survives = this.vigor > 0 && this.growth > 0.05;
    const canSpread = this.growth > 0.65 && this.vigor > 0.35 && cell.moisture > 0.4 && cell.nutrients > 0.45;
    return { survives, canSpread };
  }
}

class GardenGrid {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.cells = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => new SoilCell(x, y))
    );
    this.stepDuration = 0.35;
    this.accumulator = 0;
    this.seedInitialPlants();
  }

  seedInitialPlants() {
    for (let i = 0; i < 40; i += 1) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      const cell = this.cells[y][x];
      cell.plant = new Plant(CLOVER_SPECIES);
      cell.moisture = clamp(cell.moisture + 0.05, 0, 1);
    }
  }

  getNeighbors(x, y) {
    const neighbors = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          neighbors.push(this.cells[ny][nx]);
        }
      }
    }
    return neighbors;
  }

  update(delta) {
    this.accumulator += delta;
    while (this.accumulator >= this.stepDuration) {
      this.step();
      this.accumulator -= this.stepDuration;
    }
  }

  step() {
    const currentPlants = this.cells.map((row) => row.map((cell) => cell.plant));
    const nextPlants = this.cells.map((row) => row.map((cell) => (cell.plant ? cell.plant.clone() : null)));

    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const cell = this.cells[y][x];
        cell.adjustEnvironment(this.stepDuration);

        const plant = currentPlants[y][x];
        if (!plant) continue;

        const neighbors = this.getNeighbors(x, y);
        const neighborPlants = neighbors.map((c) => c.plant).filter(Boolean);
        const { survives, canSpread } = nextPlants[y][x].update(cell, neighborPlants, this.stepDuration);

        cell.moisture = clamp(cell.moisture - 0.05 * this.stepDuration, 0, 1);
        cell.nutrients = clamp(cell.nutrients - 0.04 * this.stepDuration, 0, 1.1);
        cell.compaction = clamp(cell.compaction + 0.005 * this.stepDuration, 0, 1.2);

        if (!survives) {
          nextPlants[y][x] = null;
        }

        if (canSpread) {
          const candidates = neighbors.filter(
            (neighbor) =>
              !neighbor.plant &&
              neighbor.moisture > 0.35 &&
              neighbor.nutrients > 0.35 &&
              neighbor.compaction < 0.78
          );
          const chosen = candidates.filter(() => Math.random() < 0.2);
          chosen.forEach((target) => {
            nextPlants[target.y][target.x] = new Plant(CLOVER_SPECIES);
            target.moisture = clamp(target.moisture - 0.04, 0, 1);
            target.nutrients = clamp(target.nutrients - 0.02, 0, 1);
          });
        }
      }
    }

    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        this.cells[y][x].plant = nextPlants[y][x];
      }
    }
  }

  draw(ctx, cellSize) {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const cell = this.cells[y][x];
        const soilHue = 28 + cell.nutrients * 22;
        const moistureLightness = 20 + cell.moisture * 35;
        ctx.fillStyle = `hsl(${soilHue}, 35%, ${moistureLightness}%)`;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

        if (cell.plant) {
          const radius = (cellSize / 2) * clamp(0.35 + cell.plant.growth, 0.35, 1);
          ctx.fillStyle = 'rgba(34,197,94,0.85)';
          ctx.beginPath();
          ctx.arc(x * cellSize + cellSize / 2, y * cellSize + cellSize / 2, radius * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  getStats() {
    let plantCount = 0;
    let biomass = 0;
    let moisture = 0;
    let nutrients = 0;
    let compaction = 0;

    this.cells.forEach((row) => {
      row.forEach((cell) => {
        if (cell.plant) {
          plantCount += 1;
          biomass += cell.plant.growth;
        }
        moisture += cell.moisture;
        nutrients += cell.nutrients;
        compaction += cell.compaction;
      });
    });

    const total = this.width * this.height;
    return {
      coverage: plantCount / total,
      biomass,
      moisture: moisture / total,
      nutrients: nutrients / total,
      compaction: compaction / total,
    };
  }
}

class GardenHUD {
  constructor() {
    this.cobertura = document.getElementById('hud-cobertura');
    this.biomasa = document.getElementById('hud-biomasa');
    this.humedad = document.getElementById('hud-humedad');
    this.nutrientes = document.getElementById('hud-nutrientes');
    this.compactacion = document.getElementById('hud-compactacion');
  }

  update(stats) {
    this.cobertura.textContent = `${Math.round(stats.coverage * 100)}%`;
    this.biomasa.textContent = stats.biomass.toFixed(1);
    this.humedad.textContent = stats.moisture.toFixed(2);
    this.nutrientes.textContent = stats.nutrients.toFixed(2);
    this.compactacion.textContent = stats.compaction.toFixed(2);
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

  const gardenCanvas = document.getElementById('jardin-canvas');
  if (gardenCanvas && gardenCanvas.getContext) {
    new GardenGame(gardenCanvas);
  }
}

document.addEventListener('DOMContentLoaded', init);

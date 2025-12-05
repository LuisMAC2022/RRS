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

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

class SoilCell {
  constructor() {
    this.moisture = 0.35 + Math.random() * 0.25;
    this.nutrients = 0.35 + Math.random() * 0.25;
    this.compaction = 0.25 + Math.random() * 0.2; // 0 blando, 1 muy compactado
    this.temperature = 18 + Math.random() * 6; // °C
  }

  hydrate(amount) {
    this.moisture = clamp(this.moisture + amount, 0, 1);
  }

  enrich(amount) {
    this.nutrients = clamp(this.nutrients + amount, 0, 1);
  }
}

class PlantSpecies {
  constructor({ name, growthRate, waterNeed, nutrientNeed, optimalTemp, seedEnergy, maxEnergy }) {
    this.name = name;
    this.growthRate = growthRate;
    this.waterNeed = waterNeed;
    this.nutrientNeed = nutrientNeed;
    this.optimalTemp = optimalTemp;
    this.seedEnergy = seedEnergy;
    this.maxEnergy = maxEnergy;
  }

  static trifolium() {
    return new PlantSpecies({
      name: 'Trébol blanco',
      growthRate: 0.12,
      waterNeed: 0.35,
      nutrientNeed: 0.3,
      optimalTemp: 20,
      seedEnergy: 0.7,
      maxEnergy: 1.3,
    });
  }
}

class Plant {
  constructor(species) {
    this.species = species;
    this.energy = 0.5;
    this.age = 0;
  }
}

class GardenGrid {
  constructor(width = 42, height = 42) {
    this.width = width;
    this.height = height;
    this.species = PlantSpecies.trifolium();
    this.soil = Array.from({ length: height }, () => Array.from({ length: width }, () => new SoilCell()));
    this.plants = Array.from({ length: height }, () => Array.from({ length: width }, () => null));
    this.seedInitialPatches();
  }

  seedInitialPatches() {
    const centerX = Math.floor(this.width / 2);
    const centerY = Math.floor(this.height / 2);
    for (let y = centerY - 2; y <= centerY + 2; y += 1) {
      for (let x = centerX - 2; x <= centerX + 2; x += 1) {
        if (Math.random() > 0.45) {
          this.plants[y][x] = new Plant(this.species);
        }
      }
    }
  }

  countNeighbors(x, y) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && this.plants[ny][nx]) {
          count += 1;
        }
      }
    }
    return count;
  }

  step() {
    const nextPlants = Array.from({ length: this.height }, () => Array.from({ length: this.width }, () => null));
    let livePlants = 0;
    let healthyPlants = 0;
    let moistureSum = 0;
    let nutrientSum = 0;

    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const soil = this.soil[y][x];
        const plant = this.plants[y][x];
        const neighbors = this.countNeighbors(x, y);

        // Fluctuaciones ambientales suaves
        const rainfall = Math.random() < 0.03 ? 0.08 : 0;
        soil.hydrate(-0.01 + rainfall);
        soil.enrich(-0.003 + 0.001 * neighbors);
        soil.compaction = clamp(soil.compaction + (Math.random() - 0.5) * 0.01, 0.1, 0.9);
        soil.temperature = clamp(soil.temperature + (Math.random() - 0.5) * 0.4, 14, 28);

        if (plant) {
          const waterDelta = soil.moisture - plant.species.waterNeed;
          const nutrientDelta = soil.nutrients - plant.species.nutrientNeed;
          const compactionPenalty = soil.compaction * 0.35;
          const tempPenalty = Math.max(0, Math.abs(soil.temperature - plant.species.optimalTemp) / 14) * 0.25;
          const neighborBonus = neighbors >= 2 && neighbors <= 4 ? 0.12 : neighbors > 5 ? -0.2 : -0.05;

          const growthPotential =
            plant.species.growthRate + waterDelta * 0.4 + nutrientDelta * 0.45 + neighborBonus - compactionPenalty - tempPenalty;
          plant.energy = clamp(plant.energy + growthPotential, 0, plant.species.maxEnergy);
          plant.age += 1;

          soil.hydrate(-0.03);
          soil.enrich(-0.012);

          if (plant.energy <= 0 || plant.age > 420) {
            soil.enrich(0.08);
            nextPlants[y][x] = null;
          } else {
            nextPlants[y][x] = plant;
            livePlants += 1;
            if (plant.energy > 0.6) healthyPlants += 1;

            if (plant.energy >= plant.species.seedEnergy && soil.moisture > 0.32 && soil.nutrients > 0.28) {
              this.spreadSeeds(x, y, nextPlants, plant);
              plant.energy -= 0.08;
            }
          }
        } else {
          // Recuperación del suelo en espacios vacíos
          soil.hydrate(0.008);
          soil.enrich(0.004);
        }

        moistureSum += soil.moisture;
        nutrientSum += soil.nutrients;
      }
    }

    this.plants = nextPlants;
    const totalCells = this.width * this.height;
    const coverage = (livePlants / totalCells) * 100;
    return {
      coverage: Math.round(coverage),
      avgMoisture: (moistureSum / totalCells).toFixed(2),
      avgNutrients: (nutrientSum / totalCells).toFixed(2),
      healthyPlants,
    };
  }

  spreadSeeds(x, y, nextPlants, parentPlant) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
        if (this.plants[ny][nx] || nextPlants[ny][nx]) continue;
        const soil = this.soil[ny][nx];
        const fertility = (soil.moisture + soil.nutrients) / 2 - soil.compaction * 0.2;
        if (fertility > 0.35 && Math.random() < fertility) {
          nextPlants[ny][nx] = new Plant(parentPlant.species);
        }
      }
    }
  }

  draw(ctx, cellSize) {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const soil = this.soil[y][x];
        const plant = this.plants[y][x];
        const moistureColor = Math.round(140 + soil.moisture * 60);
        ctx.fillStyle = `rgb(${moistureColor - 30}, ${moistureColor}, ${moistureColor - 10})`;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

        const nutrientOverlay = Math.round(soil.nutrients * 120);
        ctx.fillStyle = `rgba(80, ${90 + nutrientOverlay}, 60, 0.25)`;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

        if (plant) {
          const energyColor = Math.round(80 + plant.energy * 120);
          ctx.fillStyle = `rgb(34, ${energyColor}, 90)`;
          ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
        }
      }
    }
  }
}

class GardenHUD {
  constructor() {
    this.coverage = document.getElementById('hud-cobertura');
    this.moisture = document.getElementById('hud-humedad');
    this.nutrients = document.getElementById('hud-nutrientes');
    this.health = document.getElementById('hud-salud');
  }

  update(metrics) {
    this.coverage.textContent = `${metrics.coverage}%`;
    this.moisture.textContent = metrics.avgMoisture;
    this.nutrients.textContent = metrics.avgNutrients;
    this.health.textContent = metrics.healthyPlants.toString();
  }
}

class GardenGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.grid = new GardenGrid(42, 42);
    this.hud = new GardenHUD();
    this.lastTimestamp = 0;
    this.stepAccumulator = 0;
    this.stepInterval = 650; // milisegundos entre evaluaciones del autómata
    this.cellSize = Math.floor(Math.min(canvas.width, canvas.height) / this.grid.width);
    window.requestAnimationFrame((ts) => this.loop(ts));
  }

  loop(timestamp) {
    const delta = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    this.stepAccumulator += delta;

    if (this.stepAccumulator >= this.stepInterval) {
      const metrics = this.grid.step();
      this.hud.update(metrics);
      this.stepAccumulator = 0;
    }

    this.draw();
    window.requestAnimationFrame((ts) => this.loop(ts));
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.grid.draw(this.ctx, this.cellSize);
  }
}

function init() {
  const canvas = document.getElementById('juego-canvas');
  if (canvas && canvas.getContext) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      canvas.dataset.reducedMotion = 'true';
      canvas.dataset.spawnInterval = '1200';
    }
    new Game(canvas);
  }

  const gardenCanvas = document.getElementById('garden-canvas');
  if (gardenCanvas && gardenCanvas.getContext) {
    new GardenGame(gardenCanvas);
  }
}

document.addEventListener('DOMContentLoaded', init);

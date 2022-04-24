class ImageMeta {
  constructor(url, width, height) {
    this.url = `media/${url}.png`;
    this.width = width;
    this.height = height;
  }
}

class SoundMeta {
  constructor(url, loop=false) {
    this.url = `media/sfx/${url}.wav`;
    this.loop = loop;
  }
}

class RunnerGame {
  height = 400;
  width = 700;

  bounds = {
    top: 100,
    bottom: this.height - 30
  }

  spawnPos = [135, 220, 310];

  canvas = $(`<canvas />`)[0];
  context = this.canvas.getContext("2d");

  container = $(".r-game");

  images = {
    background: new ImageMeta("game-bg", this.width, this.height),
    player: new ImageMeta("player-car", 126, 48),
    
    car1: new ImageMeta("car-1", 95, 66),
    car2: new ImageMeta("car-2", 120, 62),
    car3: new ImageMeta("car-3", 109, 64),
    
  }
  imagesLoaded = false;

  sounds = {
    engine: new SoundMeta("engine-loop", true),
    crash: new SoundMeta("car-crash"),
    coin: new SoundMeta("coin-collect"),
    ignition: new SoundMeta("ignition"),
  }
  soundsLoaded = false;

  ui = {
    score: new TextComponent(this, "Score: 0", 36, "Consolas", this.width - 225, 35, "white"),
    title: new TextComponent(this, "Dodge the cars!", 36, "Consolas", this.width / 2, 70, "white"),
    msg: new TextComponent(this, "", 36, "Consolas", 40, 50, "white"),
  }

  $playBtn = $("<button class='r-btn'>Start Game</button>");

  constructor() {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.innerText = "Your browser does not support the canvas element.";
    this.#loadImages();
    this.#loadSounds();

    

    // wire the play button
    this.$playBtn.on("click", () => {
      this.start();
    });
  }
  

  #loadImages() {
    const numImages = Object.keys(this.images).length;
    let numLoaded = 0;
    for (const [_, image] of Object.entries(this.images)) {
      console.log(image)
      image.obj = new Image();
      image.obj.src = image.url;
      image.obj.onload = () => {
        numLoaded++;
        console.log(numLoaded)
        if (numLoaded === numImages) {
          this.imagesLoaded = true;
          this.#mediaLoaded();
        }
      };
    }
  }
  
  #mediaLoaded() {
    if (!this.soundsLoaded || !this.imagesLoaded) return;
    
    // display play button
    this.container.append(this.$playBtn);
  }

  #loadSounds() {
    const numSounds = Object.keys(this.sounds).length;
    let numLoaded = 0;
    for (const [_, sound] of Object.entries(this.sounds)) {
      sound.obj = new Audio(sound.url);
      sound.obj.loop = sound.loop;
      sound.obj.addEventListener("loadeddata", () => {
        numLoaded++;
        if (numLoaded === numSounds) {
          this.soundsLoaded = true;
          this.#mediaLoaded();
        }
      });
    }
  }

  #registerKeyControls() {
    this.keys = {};
    $(window).on("keydown", e => {
      // this.keys = (this.keys || {});
      this.keys[e.key] = true;
      if (/^Arrow/.test(e.key)) {
        e.preventDefault();
      }
    })
    
    $(window).on("keyup", e => {
      this.keys[e.key] = false;
    })
  }

  #randSpawnPos() {
    return this.spawnPos[Math.floor(Math.random() * this.spawnPos.length)];
  }

  #randCarMeta() {
    const carMeta = [this.images.car1, this.images.car2, this.images.car3];
    return carMeta[Math.floor(Math.random() * carMeta.length)];
  }

  
  stop() {
    this.ui.msg.text = "Game over!";
    clearInterval(this.interval);
    this.sounds.engine.obj.pause();
    this.sounds.crash.obj.play();
  }
  
  clearScreen() {
    this.context.clearRect(0, 0, this.width, this.height);
  }
  
  everyInterval(num) {
    return (this.frameNo / num) % 1 == 0;
  }
  
  start() {
    this.container.append(this.canvas);
    this.frameNo = 0;
    this.score = 0;
    this.ui.msg.text = "";

    this.#registerKeyControls();

    this.obstacles = [];
    this.player = new CarComponent(this, this.images.player, 50, 220, 0, 0, true);

    Object.entries(this.sounds).forEach(([_, sound]) => {
      sound.obj.pause();
      sound.obj.currentTime = 0;
    });

    // play ignition, then engine loop
    this.sounds.ignition.obj.play();
    setTimeout(() => {
      this.sounds.ignition.obj.pause();
      this.sounds.engine.obj.play();
    }, 1000)

    // set the crash sound to skip the beginning of the audio
    this.sounds.crash.obj.currentTime = .4;
    
    // game reset and start the game loop
    clearInterval(this.interval);
    this.interval = setInterval(this.update.bind(this), 20);
  }

  update() {
    this.frameNo += 1;
    this.clearScreen();

    // check for car collisions
    for (let obs of this.obstacles) {
      if (obs.collideWith(this.player)) {
        this.stop();
      }
    }

    // check for player movement
    if (this.keys["ArrowUp"]) {
      this.player.speedY = -3;
    } else if (this.keys["ArrowDown"]) {
      this.player.speedY = 3;
    } else {
      this.player.speedY = 0;
    }

    if (this.keys["ArrowLeft"]) {
      this.player.speedX = -3;
    } else if (this.keys["ArrowRight"]) {
      this.player.speedX = 5;
    } else {
      this.player.speedX = 0;
    }

    // // keep piece within bounds
    // if (this.player.x < 0) {
    //   this.player.x = 0;
    // } else if (this.player.x > this.width - this.player.width) {
    //   this.player.x = this.width - this.player.width;
    // }
    // if (this.player.y < this.bounds.top) {
    //   console.log("out of bounds top");
    //   this.player.y = this.bounds.top;
    // } else if (this.player.y > this.bounds.bottom - this.player.height) {
    //   console.log("out of bounds bottom");
    //   this.player.y = this.bounds.bottom - this.player.height;
    // }

    // create new cars
    if (this.frameNo == 1 || this.everyInterval(55)) {
      const car = new CarComponent(this, this.#randCarMeta(), this.width, this.#randSpawnPos(), -5, 0);
      this.obstacles.push(car);
    }

    // keep all cars within bounds
    [this.player, ...this.obstacles].forEach(car => this.keepInBounds(car));

    // remove offscreen cars
    this.obstacles = this.obstacles.filter(obs => {
      if (obs.x < -(obs.width)) {
        this.addPoint();
        return false;
      }
      return true;
    })

    // draw screen
    this.drawBg();

    this.obstacles.forEach(obs => obs.update());
    this.player.update();

    this.drawUI();


  }

  keepInBounds(car) {
    if (car.x < 0 && car.isPlayer) {
      car.x = 0;
    } else if (car.x > this.width - car.width && car.isPlayer) {
      car.x = this.width - car.width;
    }
    if (car.y < this.bounds.top) {
      car.y = this.bounds.top;
    } else if (car.y > this.bounds.bottom - car.height) {
      car.y = this.bounds.bottom - car.height;
    }
  }

  addPoint() {
    this.sounds.coin.obj.play();
    this.score += 1;
  }

  drawBg() {
    // draw an image as the background
    
    this.context.drawImage(
      this.images.background.obj,
      0,
      0,
      this.width,
      this.height
    );
  }

  drawUI() {
    // draw the score
    this.ui.score.text = `Score: ${this.score}`;
    this.ui.score.update();

    this.ui.title.update();

    this.ui.msg.update();
  }
}

class CarComponent {
  constructor(game, imgMeta, x, y, speedX=0, speedY=0, isPlayer=false) {
    this.game = game;
    this.image = imgMeta.obj;
    this.width = imgMeta.width;
    this.height = imgMeta.height;
    this.x = x;
    this.y = y;
    this.speedX = speedX;
    this.speedY = speedY;
    this.isPlayer = isPlayer;

  }

  update() {
    this.newPos();
    this.game.context.drawImage(this.image, this.x, this.y, this.width, this.height);
  }

  newPos() {
    if (!this.isPlayer && this.game.everyInterval(20)) {
      // generate a random number -2 to 2
      const rand = Math.floor(Math.random() * 3) - 1;
      console.log(rand)
      this.speedY = rand;
    }
    this.x += this.speedX;
    this.y += this.speedY;
  }

  collideWith(other) {
    const errorMarginX = 8;
    const errorMarginY = 12;
    return (
      this.x < other.x + other.width - errorMarginX &&
      this.x + this.width > other.x + errorMarginX &&
      this.y < other.y + other.height - errorMarginY &&
      this.y + this.height > other.y + errorMarginY
    );
  }
}

class TextComponent {
  constructor(game, text, size, font, x, y, color="white") {
    this.game = game;
    this.text = text;
    this.size = size;
    this.font = font;
    this.x = x;
    this.y = y;
    this.color = color;
  }

  update() {
    this.game.context.font = `${this.size}px ${this.font}`;
    this.game.context.fillStyle = this.color;
    this.game.context.fillText(this.text, this.x, this.y);
  }
}


game = new RunnerGame();

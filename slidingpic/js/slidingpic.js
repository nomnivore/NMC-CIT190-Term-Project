

class SlidingPic {
  $emptyCell;
  $cells;
  $grid = $(".sp-grid");
  isComplete = false;
  allowClicks = true; // set to false during sliding to prevent double clicks
  $overlay = $(".sp-overlay");
  gridCols = 4;
  defaultImageUrl = "test.jpg";
  imageFileType = "image/jpeg";
  canvas = document.createElement("canvas");
  $uploadForm = $("#sp-puzzleImage");
  $resetBtn = $("#sp-reset");
  $hintBtn = $("#sp-hint").first();
  isShuffling = false;

  constructor() {
    // initialize the board (for now, using numbers instead of images)
    this.#addCellDOM();

    // start with overlay hidden
    this.$overlay.css("display", "none");

    // load the default image
    this.loadImage(this.defaultImageUrl);

    this.#addEventListeners();
  }
  
  // game initialization methods
  #addCellDOM() {
    let boardString = "";
    for (let n = 1; n <= 16; n++) {
      boardString += `<div class="sp-slide" data-pos=${n} data-target-pos=${n}></div>`;
    }
    $(".sp-grid").html(boardString);

    // initialize the empty cell
    this.setEmptyCell(16);

    // initialize the cells
    this.$cells = $(".sp-slide");
    
    const game = this;
    this.$cells.on("click", function () {
      game.move($(this));
    });
  }


  #addEventListeners() {
    const game = this;

    this.$uploadForm.on("change", function () {
      game.#onFileUpload();
    });

    this.$resetBtn.on("click", function () {
      game.loadImage(game.img.src);
    });

    this.$hintBtn.on("click", function () {
      console.log("click")
      game.toggleHintMode();
    });
  }

  #onFileUpload() {

    const file = this.$uploadForm[0].files[0]
    this.imageFileType = file.type;

    URL.revokeObjectURL(this.img.src);
    const imgPath = URL.createObjectURL(file);

    this.loadImage(imgPath);
  }

  setEmptyCell(pos) {
    if (this.$emptyCell) this.$emptyCell.removeClass("empty");

    this.$emptyCell = $(`[data-pos=${pos}]`);
    this.$emptyCell.addClass("empty");
  }

  // overlay controls
  showOverlay(text="") {
    this.setOverlayText(text);
    this.$overlay.css("display", "flex");
    this.$overlay.stop().animate({opacity: 1}, 100);
  }

  setOverlayText(text) {
    this.$overlay.text(text);
  }

  hideOverlay() {
    this.$overlay.stop().animate({opacity: 0}, 500, () => {

      this.$overlay.css("display", "none");
    })
  }

  canMove($cell) {
    // check to see if a cell is allowed to move
    const pos = parseInt($cell.attr("data-pos"));
    const emptyPos = parseInt(this.$emptyCell.attr("data-pos"));
    if (
      pos == emptyPos - 1 ||
      pos == emptyPos + 1 ||
      pos == emptyPos - this.gridCols ||
      pos == emptyPos + this.gridCols
    ) {
      // edge case: prevent +/- 1 from working when cells are on diff rows
      if (
        !(pos % this.gridCols == 0 && emptyPos % this.gridCols == 1) &&
        !(pos % this.gridCols == 1 && emptyPos % this.gridCols == 0)
      )
        return true;
    }
    return false;
  }

  getMoveDirection($cell) {
    // used to correlate a movement direction to the animation CSS class
    const pos = parseInt($cell.attr("data-pos"));
    const emptyPos = parseInt(this.$emptyCell.attr("data-pos"));

    if (pos == emptyPos - 1) {
      return "right";
    } else if (pos == emptyPos + 1) {
      return "left";
    } else if (pos == emptyPos - 4) {
      return "down";
    } else if (pos == emptyPos + 4) {
      return "up";
    }

    console.log(`pos: ${pos}, emptyPos: ${emptyPos}`);
  }

  move($cell) {
    if ($cell.hasClass("empty") || !this.allowClicks) return;

    const pos = $cell.attr("data-pos");
    const emptyPos = this.$emptyCell.attr("data-pos");
    if (this.canMove($cell)) {
      const direction = this.getMoveDirection($cell);
      const game = this;

      if ($cell.css("transitionDuration") != "0s") {
        this.allowClicks = false;
        $cell.on("transitionend", function () {
          $cell.off("transitionend");
          game.allowClicks = true;
          game.#moveCell($cell, pos, emptyPos);
          $cell.removeClass(`move-${direction}`);
        });
        $cell.addClass(`move-${direction}`);
      } else {
        console.log("no animation")
        game.#moveCell($cell, pos, emptyPos);
      }
    }
  }

  #moveCell($cell, pos, emptyPos) {
    // swap data-pos attrs
    $cell.attr("data-pos", emptyPos);
    game.$emptyCell.attr("data-pos", pos);
    // swap DOM positions
    const $temp = $("<div>");
    $cell.before($temp);
    game.$emptyCell.before($cell);
    $temp.before(game.$emptyCell);
    $temp.remove();

    this.#afterCellMoved();
  }

  #afterCellMoved() {
    // check to see if puzzle is complete
    if (!this.isShuffling && this.#isComplete()) {
      this.showOverlay("You win!");
    }
  }

  reset() {
    clearInterval(this.shuffler)
    this.$cells.removeClass("noanim");
    this.isShuffling = false;
    this.$grid.empty();
    this.hideOverlay();
    this.#addCellDOM();
  }

  shuffle() {
    const maxMoves = 1000;
    let moves = 0;

    // disable animation
    this.$cells.addClass("noanim");
    this.isShuffling = true;
    // show message overlay
    this.showOverlay("Shuffling...");
    this.shuffler = setInterval(() => {
      if (moves >= maxMoves) {
        clearInterval(this.shuffler);
        this.$cells.removeClass("noanim");
        this.isShuffling = false;
        this.hideOverlay();
        return;
      }

      let moved = false;
      while (!moved) {
        const emptyPos = parseInt(this.$emptyCell.attr("data-pos"));
        const pos = Math.floor(Math.random() * 16) + 1;
        
        if (this.canMove($(`[data-pos=${pos}]`))) {
          this.#moveCell($(`[data-pos=${pos}]`), pos, emptyPos);
          moves++;
          moved = true;
        }
      }
    }, 2);

  }

  // image manipulation
  #getImageObj(url) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = url;
    })
  }

  loadImage(url) {
    this.#getImageObj(url).then(img => {
      this.img = img;
      this.squareSize = Math.min(img.width, img.height) / this.gridCols;
      this.canvas.width = this.squareSize;
      this.canvas.height = this.squareSize;

      // reset the board, apply backgrounds, and reshuffle
      this.reset();
      this.$cells.each((i, cell) => {
        const pos = parseInt($(cell).attr("data-pos")) - 1;
        $(cell).css("background-image", this.getSquareBg(pos));
      });
      this.shuffle();
    })
  }

  getSquareBg(idx) {
    const ctx = this.canvas.getContext("2d");
    const x = (idx % this.gridCols) * this.squareSize;
    const y = Math.floor(idx / this.gridCols) * this.squareSize;

    ctx.drawImage(this.img, x, y, this.squareSize, this.squareSize, 0, 0, this.squareSize, this.squareSize);

    return `url(${this.canvas.toDataURL(this.imageFileType)})`;
  }

  // hints toggle
  isHintMode() {
    return this.$grid.hasClass("sp-show-hints");
  }

  toggleHintMode(desired = undefined) {
    this.$grid.toggleClass("sp-show-hints");
    this.$hintBtn.toggleClass("enabled");
  }

  // check if complete
  #isComplete() {
    let complete = true;
    this.$cells.each(function() {
      const $cell = $(this);
      const pos = parseInt($cell.attr("data-pos"));
      const targetPos = parseInt($cell.attr("data-target-pos"));
      if (pos != targetPos)
        complete = false;
    });
    return complete;
  }


}

// create and start the game

const game = new SlidingPic();
// game.shuffle();

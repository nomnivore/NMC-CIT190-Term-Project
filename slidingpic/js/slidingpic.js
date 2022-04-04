class SlidingPic {
  $emptyCell;
  $cells;
  $grid = $(".sp-grid");
  isComplete = false;
  allowClicks = true; // set to false during sliding to prevent double clicks
  $overlay = $(".sp-overlay");

  constructor() {
    // initialize the board (for now, using numbers instead of images)
    let boardString = "";
    for (let n = 1; n <= 16; n++) {
      boardString += `<div class="sp-slide" data-pos=${n} data-target-pos=${n}>${n}</div>`;
    }
    $(".sp-grid").html(boardString);
    
    // initialize the empty cell
    this.setEmptyCell(16);

    // initialize the cells
    this.$cells = $(".sp-slide");
    this.#addEventListeners();
  }
  
  // game initialization methods
  #addEventListeners() {
    const game = this;
    this.$cells.on("click", function () {
      game.move($(this));
    });
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
    this.$overlay.animate({opacity: 1}, 500);
  }

  setOverlayText(text) {
    this.$overlay.text(text);
  }

  hideOverlay() {
    this.$overlay.animate({opacity: 0}, 500, () => {

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
      pos == emptyPos - 4 ||
      pos == emptyPos + 4
    ) {
      // edge case: prevent +/- 1 from working when cells are on diff rows
      if (
        !(pos % 4 == 0 && emptyPos % 4 == 1) &&
        !(pos % 4 == 1 && emptyPos % 4 == 0)
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
  }

  shuffle() {
    const maxMoves = 1000;
    let moves = 0;

    // disable animation
    this.$cells.addClass("noanim");

    // show message overlay
    this.showOverlay("Shuffling...");
    const shuffler = setInterval(() => {
      if (moves >= maxMoves) {
        clearInterval(shuffler);
        this.$cells.removeClass("noanim");
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
    }, 5);

  }
}

// create and start the game

const game = new SlidingPic();
game.shuffle();

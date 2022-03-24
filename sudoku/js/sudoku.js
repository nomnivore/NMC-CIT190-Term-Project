// $var = jquery object

//  hide navbar
function showNavOnScroll() {
  if ($(window).scrollTop() >= $("#game").offset().top) {
    $("nav").addClass("nav-hidden");
  } else {
    $("nav").removeClass("nav-hidden");
  }
}
$(function () {
  $(window).on("scroll", showNavOnScroll);

  showNavOnScroll();
});

class Sudoku {
  api;
  $grid = $(".sd-grid");
  $notesBtn = $("#toggle-notes");
  $newGameBtn = $("#new-game");
  $difficultySelect = $("#difficulty");
  $msgSpan = $(".sd-message");
  startTime = performance.now();
  hasDupes = false;
  isComplete = false;
  $currentCell;

  allowedInputs = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  constructor() {
    this.api = new SdApi();
    // initialize the board
    let boardString = "";
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        let region = Math.floor(y / 3) * 3 + Math.floor(x / 3);
        boardString += `<div class="sd-cell" data-x=${x} data-y=${y} data-region=${region} data-has-notes="false"><div class="sd-input" tabindex=0 onclick=""></div></div>`;
      }
    }
    this.$grid.append(boardString);

    // DOM properties
    this.$cells = this.$grid.find(".sd-cell");

    // add notes to cells
    this.#addNoteDOM();
    this.#addNumpadDOM();

    this.#addEventListeners();
  }

  // DOM ELEMENT GENERATION

  #addNoteDOM() {
    this.$cells.each(function () {
      const $cell = $(this);
      let noteString = "";
      for (let i = 1; i <= 9; i++) {
        noteString += `<div class="sd-note-${i}">${i}</div>`;
      }
      $cell.append(`<div class="sd-note-grid">${noteString}</div>`);
    });
  }

  #addNumpadDOM() {
    const game = this;
    [...this.allowedInputs, 0].forEach(function (val) {
      const $btn = $(`<button class="sd-btn">${val}</button>`);
      // change 0 to C
      if (val == 0) {
        $btn.text("C");
        $btn.addClass(".sd-pad-clear");
      }
      $btn.on("click", function () {
        if (!game.$currentCell) return;
        const $input = game.$currentCell.find(".sd-input");
        game.#beforeInputUpdate($input, val);
      });
      $(".sd-numpad").append($btn);
    });
  }

  // EVENT LISTENERS

  #addEventListeners() {
    // listen for cell selections
    const game = this; // game object because 'this' will be rebinded
    this.$cells.on("focusin", function () {
      const $cell = $(this);
      // if ($cell.attr("data-locked") == "true") return;
      game.selectCell($cell);
    });

    // game buttons
    this.$notesBtn.on("click", function () {
      game.toggleNoteMode();
    });

    this.$newGameBtn.on("click", function () {
      const difficulty = game.$difficultySelect.val();
      const $btn = $(this);
      // disabling avoids double-clicks during api call
      $btn.attr("disabled");
      game.newGame(difficulty);
      $btn.removeAttr("disabled");
    });

    $("#reset").on("click", function () {
      game.reset();
    });

    // de-select when clicking outside of game
    $(document).on("click", function (e) {
      const $clicked = $(e.target);
      if (
        !$clicked.is(".sd-cell") &&
        !$clicked.is(".sd-cell .sd-input") &&
        !$clicked.is(".sd-cell .sd-note-grid") &&
        !$clicked.is(".sd-btn") &&
        !$clicked.is(".sd-numpad")
      ) {
        game.deselectCell();
      }
    });

    // * IOS issue fix! the 'click' event fires strangely on ios.
    this.$cells.on("click", "*", function () {
      game.selectCell($(this).closest(".sd-cell"));
    });

    // listen for keyboard input
    $(document).on("keydown", function (e) {
      game.#keyPressed(e);
    });
  }

  #keyPressed(event) {
    const $cell = this.$currentCell;
    if (!$cell) return;

    const key = event.key;
    const $input = $cell.find(".sd-input");

    if (this.allowedInputs.includes(key)) this.#beforeInputUpdate($input, key);
    else if (["Backspace", "Delete", "0"].includes(key))
      this.#beforeInputUpdate($input, "0");
    else if (key == "ArrowUp") {
      const $newCell = this.$grid.find(
        `.sd-cell[data-x=${$cell.attr("data-x")}][data-y=${
          parseInt($cell.attr("data-y")) - 1
        }]`
      );
      if ($newCell.length) {
        this.selectCell($newCell);
        event.preventDefault();
      }
    } else if (key == "ArrowDown") {
      const $newCell = this.$grid.find(
        `.sd-cell[data-x=${$cell.attr("data-x")}][data-y=${
          parseInt($cell.attr("data-y")) + 1
        }]`
      );
      if ($newCell.length) {
        this.selectCell($newCell);
        event.preventDefault();
      }
    } else if (key == "ArrowLeft") {
      const $newCell = this.$grid.find(
        `.sd-cell[data-x=${
          parseInt($cell.attr("data-x")) - 1
        }][data-y=${$cell.attr("data-y")}]`
      );
      if ($newCell.length) {
        this.selectCell($newCell);
        event.preventDefault();
      }
    } else if (key == "ArrowRight") {
      const $newCell = this.$grid.find(
        `.sd-cell[data-x=${
          parseInt($cell.attr("data-x")) + 1
        }][data-y=${$cell.attr("data-y")}]`
      );
      if ($newCell.length) {
        this.selectCell($newCell);
        event.preventDefault();
      }
    } else if (key == "n") {
      this.toggleNoteMode();
    }
  }

  #beforeInputUpdate(input, value) {
    const $input = input instanceof jQuery ? input : $(input);
    const $cell = $input.parent();
    const val = value;
    // different functionality based on if note mode is enabled
    if ($cell.attr("data-locked") == "true" || this.isComplete) return;
    if (this.isNoteMode()) {
      // * note input mode
      // if the value is an allowed input, add it as a note
      if (this.allowedInputs.includes(val)) {
        this.toggleCellNote($cell, val);
        if (this.cellHasNotes($cell)) {
          $input.text("");
        }
      }
    } else {
      // * value input mode
      // if the value is an allowed input, set the input value
      if (this.allowedInputs.includes(val) || val == null) {
        $input.text(val);
        this.toggleCellNote($cell, "all", false);
        this.#afterInputUpdate($input);
      } else if (val == "0") {
        $input.text("");
        this.toggleCellNote($cell, "all", false);
      } else {
        // deny invalid inputs
      }
    }
  }

  #afterInputUpdate(input) {
    const $input = input instanceof jQuery ? input : $(input);
    const $cell = $input.parent();
    this.setMsg();
    $input.select();

    // clear hints within range of cell
    this.clearRelatedNotes($cell);

    // check for duplicates
    this.checkCellDuplicates($cell);

    // highlight same-numbers
    this.focusNums($input.text());

    // check if game is done
    this.checkGameComplete();
  }

  // GAME & UI LOGIC

  #getRelatedCells($cell) {
    return {
      $row: this.$getRow($cell),
      $col: this.$getCol($cell),
      $region: this.$getRegion($cell),
    };
  }

  clearRelatedNotes($cell) {
    const val = $cell.find(".sd-input").text();
    const { $row, $col, $region } = this.#getRelatedCells($cell);

    this.toggleCellNote($row, val, false);
    this.toggleCellNote($col, val, false);
    this.toggleCellNote($region, val, false);
  }

  checkCellDuplicates() {
    // clear error classes
    this.$cells.removeClass("error");

    // check for duplicates
    const rows = this.getRows();
    const cols = this.getCols();
    const regions = this.getRegions();

    const dupes = [];

    let hasDupes = false;

    [rows, cols, regions].forEach((cellSet) => {
      cellSet.forEach(($cells) => {
        const cellsDupes = this.#arrayHasDuplicates(this.getValues($cells));
        if (cellsDupes) dupes.push([$cells, cellsDupes]);
      });
    });

    dupes.forEach(([$cells, vals]) => {
      $cells.each(function () {
        const $cell = $(this);
        if (vals.includes($cell.find(".sd-input").text())) {
          $cell.addClass("error");
          hasDupes = true;
        }
      });
    });

    this.hasDupes = hasDupes;
  }

  #arrayHasDuplicates(arr) {
    return arr.filter((num, index, array) => array.indexOf(num) !== index);
  }

  toggleCellNote($cells, val, desired = undefined) {
    // this function accepts one or more cells, a value or "all"
    const game = this;
    $cells.each(function (_, cell) {
      const $cell = $(cell);
      let $notes;
      if (val == "all") {
        $notes = $cell.find(".sd-note-grid *");
      } else {
        $notes = $cell.find(".sd-note-" + val);
      }
      if ($notes.length) {
        $notes.toggleClass("show", desired);
      }
      $cell.attr("data-has-notes", `${game.cellHasNotes($cell)}`);
    });
  }

  cellHasNotes($cell) {
    const notes = $cell.find(".sd-note-grid .show").length;
    if (notes > 0) {
      return true;
    }
    return false;
  }

  isNoteMode() {
    return this.$grid.hasClass("note-mode");
  }

  toggleNoteMode(desired = undefined) {
    this.$grid.toggleClass("note-mode", desired);
    this.$notesBtn.toggleClass("enabled", desired);
  }

  deselectCell() {
    if (this.$currentCell) this.$currentCell.removeClass("selected");
    this.$currentCell = null;

    // remove highlights
    this.$cells.removeClass("highlight");
    this.$cells.removeClass("num-focused");
  }

  selectCell($cell) {
    this.deselectCell();

    // add class to new selected element
    $cell.addClass("selected");
    this.$currentCell = $cell;

    // highlight related cells
    const { $row, $col, $region } = this.#getRelatedCells($cell);

    [$row, $col, $region].forEach(($cells) => $cells.addClass("highlight"));

    const val = $cell.find(".sd-input").text();

    this.focusNums(val);
  }

  focusNums(val) {
    // remove old num highlights
    this.$cells.removeClass("num-focused");

    if (!val) return;

    const sameNums = this.$cells.filter(function () {
      return $(this).find(".sd-input").text() == val;
    });

    sameNums.addClass("num-focused");
  }

  // JQUERY HELPERS

  $getRow(num) {
    if (num instanceof jQuery) {
      num = num.data("y");
    }
    return this.$grid.find(`[data-y=${num}]`);
  }

  $getCol(num) {
    if (num instanceof jQuery) {
      num = num.data("x");
    }
    return this.$grid.find(`[data-x=${num}]`);
  }

  $getRegion(num) {
    if (num instanceof jQuery) {
      num = num.data("region");
    }
    return this.$grid.find(`[data-region=${num}]`);
  }

  getRows() {
    let rows = [];
    for (let i = 0; i < 9; i++) {
      rows.push(this.$getRow(i));
    }
    return rows;
  }

  getCols() {
    let cols = [];
    for (let i = 0; i < 9; i++) {
      cols.push(this.$getCol(i));
    }
    return cols;
  }

  getRegions() {
    let regions = [];
    for (let i = 0; i < 9; i++) {
      regions.push(this.$getRegion(i));
    }
    return regions;
  }

  // VALUE GET/SET

  getValuesWithZero($cells) {
    let values = [];
    let $inputs = $cells.find(".sd-input");
    $inputs.each(function () {
      const val = $(this).text();
      if (val != "") {
        values.push($(this).text());
      } else {
        values.push("0");
      }
    });
    return values;
  }

  getValues($cells) {
    const values = this.getValuesWithZero($cells);
    return values.filter((val) => val != 0);
  }

  setValues($cells, values) {
    let $inputs = $cells.find(".sd-input");
    $inputs.each(function (i) {
      // ignore zero values
      if (values[i] != 0) $(this).text(values[i]);
    });
  }

  // GAME RESET & INIT

  newGame(difficulty = "random") {
    // reset the game state
    this.reset();
    // generate a new board
    const puzzle = this.api.getPuzzle(difficulty);
    for (const [i, row] of puzzle.entries()) {
      this.setValues(this.$getRow(i), row);
    }

    // lock the board
    this.lockFilledCells();

    this.setMsg();
    this.isComplete = false;
    this.startTimer();

    // console.log(this.api.getSolution(this.toNumArray()))
  }

  lockFilledCells() {
    this.$cells.each(function () {
      const $cell = $(this);
      const val = $cell.find(".sd-input").text();
      if (val != "") {
        $cell.attr("data-locked", true);
      }
    });
  }

  unlockAllCells() {
    this.$cells.removeAttr("data-locked");
  }

  emptyAllCells() {
    this.$cells.find(".sd-input").text("");
  }

  reset() {
    this.deselectCell();
    this.toggleNoteMode(false);
    this.toggleCellNote(this.$cells, "all", false);
    this.emptyAllCells();
    this.unlockAllCells();
  }

  toNumArray() {
    let arr = [];
    this.getRows().forEach(($row) => {
      arr.push(this.getValuesWithZero($row).map((v) => parseInt(v)));
    });
    return arr;
  }

  checkGameComplete() {
    if (this.isBoardFilled() && !this.hasDupes) {
      this.stopTimer();
      this.isComplete = true;
      this.setMsg(`You win! Time elapsed: ${this.timeElapsed}`);
    }
  }

  isBoardFilled() {
    // check if all inputs are filled
    // const $inputs = this.$cells.find(".sd-input");
    // const $filledInputs = $inputs.filter(function() {
    //   return $(this).text() != "";
    // })
    // return $filledInputs.length == $inputs.length;
    const arr = this.toNumArray();
    const filled = arr.every((row) => row.every((val) => val != 0));
    return filled;
  }

  setMsg(msg = "") {
    this.$msgSpan.text(msg);
  }

  startTimer() {
    this.startTime = performance.now();
  }

  stopTimer() {
    this.stopTime = performance.now();
    const timeElapsed = performance.now() - this.startTime; // in seconds

    // convert to minutes:seconds
    const minutes = Math.floor(timeElapsed / 60000).toLocaleString("en-US", {
      minimumIntegerDigits: 2,
    });
    const seconds = Math.floor((timeElapsed % 60000) / 1000).toLocaleString(
      "en-US",
      {
        minimumIntegerDigits: 2,
      }
    );
    this.timeElapsed = `${minutes}:${seconds}`;
  }
}

// instantiate the game

const game = new Sudoku();

game.newGame();

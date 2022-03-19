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
        boardString += `<div class="sd-cell" data-x=${x} data-y=${y} data-region=${region} data-has-notes="false"><input type="text" maxLength="1" inputmode="none"></div>`;
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
        const $input = game.$currentCell.find("input");
        // spoof the event
        // ? hacky code? not sure...
        const event = {
          originalEvent: {
            data: val,
          },
          preventDefault: function () {},
        };
        game.#beforeInputUpdate($input, event);
      });
      $(".sd-numpad").append($btn);
    });
  }

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
        !$clicked.is(".sd-cell input") &&
        !$clicked.is(".sd-btn") &&
        !$clicked.is(".sd-numpad")
      ) {
        game.deselectCell();
      }
    });

    // auto-select text when cell is focused or changed
    const $inputs = this.$cells.find("input");
    $inputs.on("click", function () {
      $(this).select();
    });

    // ! due to the nature of the beforeInput listener, this doesn't actually run.
    // $inputs.on("input", function () {
    //   game.#afterInputUpdate(this);
    // });

    $inputs.on("beforeinput", function (event) {
      game.#beforeInputUpdate(this, event);
    });
  }

  #beforeInputUpdate(input, event) {
    const $input = input instanceof jQuery ? input : $(input);
    const $cell = $input.parent();
    const val = event.originalEvent.data;
    // different functionality based on if note mode is enabled
    event.preventDefault();
    if ($cell.attr("data-locked") == "true" || this.isComplete) return;
    if (this.isNoteMode()) {
      // * note input mode
      // if the value is an allowed input, add it as a note
      if (this.allowedInputs.includes(val)) {
        this.toggleCellNote($cell, val);
        if (this.cellHasNotes($cell)) {
          $input.val("");
        }
      }
    } else {
      // * value input mode
      // if the value is an allowed input, set the input value
      if (this.allowedInputs.includes(val) || val == null) {
        $input.val(val);
        this.toggleCellNote($cell, "all", false);
        this.#afterInputUpdate($input);
      } else if (val == "0") {
        $input.val("");
        this.toggleCellNote($cell, "all", false);
      } else {
        // deny invalid inputs
        event.preventDefault();
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
    this.focusNums($input.val());

    // check if game is done
    this.checkGameComplete();
  }

  #getRelatedCells($cell) {
    return {
      $row: this.$getRow($cell),
      $col: this.$getCol($cell),
      $region: this.$getRegion($cell),
    };
  }

  clearRelatedNotes($cell) {
    const val = $cell.find("input").val();
    const { $row, $col, $region } = this.#getRelatedCells($cell);

    this.toggleCellNote($row, val, false);
    this.toggleCellNote($col, val, false);
    this.toggleCellNote($region, val, false);
  }

  // checkCellDuplicates($cell) {
  //   const val = $cell.find("input").val();
  //   const { $row, $col, $region } = this.#getRelatedCells($cell);

  //   // remove related error classes
  //   $row.removeClass("error");
  //   $col.removeClass("error");
  //   $region.removeClass("error");

  //   const rowDupes = this.#arrayHasDuplicates(this.getValues($row));
  //   const colDupes = this.#arrayHasDuplicates(this.getValues($col));
  //   const regionDupes = this.#arrayHasDuplicates(this.getValues($region));

  //   const dupes = [
  //     [$row, rowDupes],
  //     [$col, colDupes],
  //     [$region, regionDupes]
  //   ];

  //   dupes.forEach(([$cells, vals]) => {
  //     if (vals) {
  //       $cells.each(function() {
  //         const $cell = $(this);
  //         if (vals.includes($cell.find("input").val()))
  //           $cell.addClass("error");
  //       })
  //     }
  //   })
  // }

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
        if (vals.includes($cell.find("input").val())) {
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

    const val = $cell.find("input").val();

    this.focusNums(val);
  }

  focusNums(val) {
    // remove old num highlights
    this.$cells.removeClass("num-focused");

    if (!val) return;

    const sameNums = this.$cells.filter(function () {
      return $(this).find("input").val() == val;
    });

    sameNums.addClass("num-focused");
  }

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

  getValuesWithZero($cells) {
    let values = [];
    let $inputs = $cells.find("input");
    $inputs.each(function () {
      const val = $(this).val();
      if (val != "") {
        values.push($(this).val());
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
    let $inputs = $cells.find("input");
    $inputs.each(function (i) {
      // ignore zero values
      if (values[i] != 0) $(this).val(values[i]);
    });
  }

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
      const val = $cell.find("input").val();
      if (val != "") {
        $cell.attr("data-locked", true);
      }
    });
  }

  unlockAllCells() {
    this.$cells.removeAttr("data-locked");
  }

  emptyAllCells() {
    this.$cells.find("input").val("");
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
    // const $inputs = this.$cells.find("input");
    // const $filledInputs = $inputs.filter(function() {
    //   return $(this).val() != "";
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
    const minutes = Math.floor(timeElapsed / 60000);
    const seconds = Math.floor((timeElapsed % 60000) / 1000);
    this.timeElapsed = `${minutes}:${seconds}`;
  }
}

const game = new Sudoku();

game.newGame();

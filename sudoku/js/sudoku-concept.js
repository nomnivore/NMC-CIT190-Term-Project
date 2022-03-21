// generate the board
// data values:
// data-y = 1-9
// data-x = 1-9
function makeBoard() {
  let boardString = "";
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      let region = Math.floor(y / 3) * 3 + Math.floor(x / 3);
      boardString += `<div class="sd-cell" data-x=${x} data-y=${y} data-region=${region} data-has-notes="false"><input type="text" maxLength="1"></div>`;
    }
  }

  $(".sd-grid").append(boardString);
}
makeBoard();
// ! wrap all this stuff in a class

function $getRow(num) {
  if (num instanceof jQuery) {
    num = num.attr("data-x");
  }
  return $(`.sd-cell[data-y=${num}]`);
}
function $getCol(num) {
  return $(`.sd-cell[data-x=${num}]`);
}
// function getSquare(num) {
//   let x = Math.floor(num / 3);
//   let y = num % 3;
//   return $(`.sd-cell[data-x="${x}"][data-y="${y}"]`);
// }
function $getRegion(num) {
  return $(`.sd-cell[data-region=${num}]`);
}

function getValues($cells) {
  let values = [];
  let $inputs = $cells.map(function(){
    return $(this).find("input");
  })
  $inputs.each(function(){
    values.push($(this).val());
  });
  return values;
}

// ! testing
// $getRow($(`.sd-cell[data-x=2][data-y=2]`)).addClass("selected")
// $(".sd-cell[data-x=3] input").val("1");
// console.log(getValues($getCol(3)))

let $currentCell;

// listen for cell selections
$(".sd-cell").on("focusin", function() {
  // remove class from last selected element
  if ($currentCell)
    $currentCell.removeClass("selected");
  
  // add class to current selected element
  $currentCell = $(this);
  $currentCell.addClass("selected");
})

// de-select when clicking outside of game
$(document).on("click", function(e) {
  let $clicked = $(e.target);
  if (!$clicked.is(".sd-cell") && !$clicked.is(".sd-cell input") && !$clicked.is(".sd-btn")) {
    console.log("clicked outside")
    if ($currentCell){
      $currentCell.removeClass("selected");
      $currentCell = null;
    }
  }
})

$(".sd-cell input").on("click", function() {
  $(this).select();
})
$(".sd-cell input").on("input", function() {
  $(this).select();
})

$("#check-val").on("click", function() {
  let val = $currentCell?.find("input").val();
  console.log(val);
});



// ! testing notes grid
const $testCell = $(".sd-cell");

$testCell.append(`<div class="sd-note-grid">
<div class="sd-note-1">1</div>
<div class="sd-note-2">2</div>
<div class="sd-note-3">3</div>
<div class="sd-note-4">4</div>
<div class="sd-note-5">5</div>
<div class="sd-note-6">6</div>
<div class="sd-note-7">7</div>
<div class="sd-note-8">8</div>
<div class="sd-note-9">9</div>
</div>`);


// ! testing button enabled state
$("#toggle-notes").on("click", function() {
  $(this).toggleClass("enabled");
  $(".sd-grid").toggleClass("note-mode");
});


// ! testing input beforeinput for notes
$(".sd-cell input").on("beforeinput", function(event){
  let val = event.originalEvent.data

  const $grid = $(".sd-grid");
  if ($grid.hasClass("note-mode")) {
    console.log("note mode")
    event.preventDefault();
    let $cell = $(".sd-cell.selected");
    // let $note = $(".sd-cell.selected .sd-note-" + val);
    let $input = $cell.find("input");
    $input.val("");
    let $note = $cell.find(".sd-note-" + val);
    console.log($note)
    if ($note)
      $note.toggleClass("show");
    
    // check if any notes are shown
    if ($cell.find(".sd-note-grid .show").length) {
      console.log("notes shown?:")
      $cell.attr("data-has-notes", "true");
    } else {
      $cell.attr("data-has-notes", "false");
    }
  } else {
    console.log("not note mode")
    let $cell = $(".sd-cell.selected");
    if ($cell.attr("data-has-notes") == "true") {
      // remove notes
      $cell.find(".sd-note-grid .show").removeClass("show");
      $cell.attr("data-has-notes", "false");
    }
  }
})

class SdApi {
  host = "https://sugoku.herokuapp.com";

  constructor() {}

  getPuzzle(difficulty = "random") {
    let url = `${this.host}/board?difficulty=${difficulty}`;
    let puzzle;
    $.ajax({
      url: url,
      method: "get",
      async: false,
      success: (data) => {
        puzzle = data;
      },
    });

    return puzzle.board;
  }

  getSolution(puzzle) {
    let url = `${this.host}/solve`;
    let solution;
    $.ajax({
      url: url,
      method: "post",
      data: { board: JSON.stringify(puzzle) },
      async: false,
      success: (data) => {
        solution = data;
      },
    });

    return solution.solution;
  }
}

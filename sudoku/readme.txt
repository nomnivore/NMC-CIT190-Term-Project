# Sudoku

## Objective

Fill a 9x9 grid with digits so that each row, column, and 3x3
subgrid contains all of the digits from 1 to 9 without any 
repeating sequences. As you fill the grid,cells will highlight 
red if there are duplicate digits within its vicinity.

The game uses the sugoku API to generate starting boards.
https://github.com/bertoort/sugoku

## How to play
Click on a cell to select it. You can also use the arrow keys 
on your keyboard to traverse the board.

While selected, you can click a number from the options below 
the board, or press a number key on your keyboard.

You can toggle Note Mode by clicking the Note button below or 
pressing 'n' on your keyboard.

To start a new game, select a difficulty and click 
the "New Game" button.

Be cautious with the "New Game" and "Reset" buttons - these will erase all your progress!

## Current problems or issues
The current version of the game is free of almost all issues, to my knowledge,
and has been playtested to that fact.
I have noticed an issue where sometimes the red "error" highlight will persist
on a cell even if the error was corrected - until something else updates that cell.

I think I could fix this simply by resetting error highlights and re-checking them
*after* the selected cell is updated.

## Plans for future releases
Some ideas for future updates:
    - Saving game session to local storage
    - Game timer that persists on screen at all times
    - A way to share sudoku boards with others (without embedding an entire json 
        file in a query string)
    - Daily Challenge

## Copyright & info
Made for the CIT190 term project.

Do not reproduce or distribute this software without permission.


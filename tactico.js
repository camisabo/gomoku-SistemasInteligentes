class TacticoPlayer extends Agent {
    constructor() {
        super();
        this.board = new Board();
        this.directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        this.maxDepth = 12;
        this.maxBranches = 14;
    }

    compute(board, moveState, time) {
        if (moveState === '1') return this.movimientosApertura(board);
        if (moveState === '2' || moveState === '3') return 'BLACK';

        var candidates = this.generarCandidatos(board);
        if (candidates.length === 0) return this.board.valid_moves(board)[0];
        var availableTime = Number.isFinite(time) ? time : 1000;
        return this.encontrarMejorMovimiento(
            board,
            moveState,
            Date.now() + Math.max(1, Math.min(150, availableTime * 0.1)),
            candidates
        );
    }

    movimientosApertura(board) {
        var size = board.length;
        var center = Math.floor(size / 2);
        var preferred = [
            [center, center],
            [center - 1, center],
            [center, center + 1],
            [center + 1, center],
            [center, center - 1]
        ];
        var moves = [];

        for (var i = 0; i < preferred.length && moves.length < 3; i++) {
            var x = preferred[i][0];
            var y = preferred[i][1];
            if (x >= 0 && x < size && y >= 0 && y < size && board[y][x] === ' ') {
                moves.push(preferred[i]);
            }
        }

        var validMoves = this.board.valid_moves(board);
        for (var j = 0; moves.length < 3 && j < validMoves.length; j++) {
            if (!moves.some(move => move[0] === validMoves[j][0] && move[1] === validMoves[j][1])) {
                moves.push(validMoves[j]);
            }
        }
        return moves;
    }

    generarCandidatos(board) {
        var size = board.length;
        var candidates = [];
        var seen = new Set();
        var hasPieces = false;

        for (var y = 0; y < size; y++) {
            for (var x = 0; x < size; x++) {
                if (board[y][x] === ' ') continue;
                hasPieces = true;
                for (var dy = -2; dy <= 2; dy++) {
                    for (var dx = -2; dx <= 2; dx++) {
                        var nx = x + dx;
                        var ny = y + dy;
                        if (nx < 0 || nx >= size || ny < 0 || ny >= size ||
                            board[ny][nx] !== ' ') continue;
                        var key = ny * size + nx;
                        if (!seen.has(key)) {
                            seen.add(key);
                            candidates.push([nx, ny]);
                        }
                    }
                }
            }
        }

        if (!hasPieces) return [[Math.floor(size / 2), Math.floor(size / 2)]];
        return candidates;
    }

    puntuarMovimiento(board, move, color) {
        var x = move[0];
        var y = move[1];
        var size = board.length;
        var score = 0;

        for (var i = 0; i < this.directions.length; i++) {
            var dx = this.directions[i][0];
            var dy = this.directions[i][1];
            var count = 1;
            var openEnds = 0;

            for (var direction = -1; direction <= 1; direction += 2) {
                var nx = x + dx * direction;
                var ny = y + dy * direction;
                while (nx >= 0 && nx < size && ny >= 0 && ny < size &&
                    board[ny][nx] === color) {
                    count++;
                    nx += dx * direction;
                    ny += dy * direction;
                }
                if (nx >= 0 && nx < size && ny >= 0 && ny < size &&
                    board[ny][nx] === ' ') openEnds++;
            }

            if (count >= 5) score += 5000000;
            else if (count === 4) score += openEnds === 2 ? 500000 : 50000;
            else if (count === 3) score += openEnds === 2 ? 12000 : 1500;
            else if (count === 2) score += openEnds === 2 ? 300 : 60;
            else score += openEnds === 2 ? 4 : 1;
        }
        return score;
    }

    esGanador(board, move, color) {
        var x = move[0];
        var y = move[1];
        var size = board.length;

        for (var i = 0; i < this.directions.length; i++) {
            var dx = this.directions[i][0];
            var dy = this.directions[i][1];
            var count = 1;
            for (var direction = -1; direction <= 1; direction += 2) {
                var nx = x + dx * direction;
                var ny = y + dy * direction;
                while (nx >= 0 && nx < size && ny >= 0 && ny < size &&
                    board[ny][nx] === color) {
                    count++;
                    nx += dx * direction;
                    ny += dy * direction;
                }
            }
            if (count >= 5) return true;
        }
        return false;
    }

    ordenarMovimientos(board, moves, color) {
        var opponent = color === 'B' ? 'W' : 'B';
        var scored = moves.map(move => ({
            move: move,
            wins: this.esGanador(board, move, color),
            blocks: this.esGanador(board, move, opponent),
            score: this.puntuarMovimiento(board, move, color) +
                this.puntuarMovimiento(board, move, opponent) * 0.95
        }));

        scored.sort((a, b) =>
            Number(b.wins) - Number(a.wins) ||
            Number(b.blocks) - Number(a.blocks) ||
            b.score - a.score
        );

        var winningMoves = scored.filter(item => item.wins);
        if (winningMoves.length > 0) {
            return winningMoves.slice(0, 100).map(item => item.move);
        }

        var opponentThreats = scored.filter(item => item.blocks);
        if (opponentThreats.length > 0) {
            return opponentThreats.slice(0, 100).map(item => item.move);
        }

        return scored.slice(0, this.maxBranches).map(item => item.move);
    }

    evaluarTablero(board) {
        var size = board.length;
        var scores = { B: 0, W: 0 };
        var windowValues = [0, 2, 20, 250, 12000, 1000000];

        for (var y = 0; y < size; y++) {
            for (var x = 0; x < size; x++) {
                for (var d = 0; d < this.directions.length; d++) {
                    var dx = this.directions[d][0];
                    var dy = this.directions[d][1];
                    var endX = x + dx * 4;
                    var endY = y + dy * 4;
                    if (endX < 0 || endX >= size || endY < 0 || endY >= size) continue;

                    var black = 0;
                    var white = 0;
                    for (var step = 0; step < 5; step++) {
                        var piece = board[y + dy * step][x + dx * step];
                        if (piece === 'B') black++;
                        else if (piece === 'W') white++;
                    }
                    if (black > 0 && white === 0) scores.B += windowValues[black];
                    if (white > 0 && black === 0) scores.W += windowValues[white];
                }
            }
        }
        return scores;
    }

    buscar(board, depth, alpha, beta, color, deadline) {
        if (Date.now() >= deadline) return null;
        var opponent = color === 'B' ? 'W' : 'B';
        if (depth === 0) {
            var scores = this.evaluarTablero(board);
            return color === 'B' ? scores.B - scores.W : scores.W - scores.B;
        }

        var moves = this.ordenarMovimientos(board, this.generarCandidatos(board), color);
        if (moves.length === 0) return 0;

        var best = -Infinity;
        for (var i = 0; i < moves.length; i++) {
            var next = this.board.clone(board);
            this.board.move(next, moves[i], color);
            var value;
            if (this.esGanador(next, moves[i], color)) {
                value = 100000000 - depth;
            } else {
                var childValue = this.buscar(next, depth - 1, -beta, -alpha, opponent, deadline);
                if (childValue === null) return null;
                value = -childValue;
            }
            best = Math.max(best, value);
            alpha = Math.max(alpha, value);
            if (alpha >= beta) break;
        }
        return best;
    }

    encontrarMejorMovimiento(board, color, deadline, candidates) {
        var moves = this.ordenarMovimientos(board, candidates, color);
        var bestMove = moves[0];
        if (this.esGanador(board, bestMove, color)) return bestMove;
        var opponent = color === 'B' ? 'W' : 'B';

        for (var depth = 1; depth <= this.maxDepth; depth++) {
            var bestValue = -Infinity;
            var iterationBest = bestMove;
            var alpha = -Infinity;
            var complete = true;

            for (var i = 0; i < moves.length; i++) {
                if (Date.now() >= deadline) {
                    complete = false;
                    break;
                }
                var next = this.board.clone(board);
                this.board.move(next, moves[i], color);
                var value;
                if (this.esGanador(next, moves[i], color)) {
                    value = 100000000 - depth;
                } else {
                    var childValue = this.buscar(next, depth - 1, -Infinity, -alpha, opponent, deadline);
                    if (childValue === null) {
                        complete = false;
                        break;
                    }
                    value = -childValue;
                }
                if (value > bestValue) {
                    bestValue = value;
                    iterationBest = moves[i];
                }
                alpha = Math.max(alpha, value);
            }

            if (!complete) break;
            bestMove = iterationBest;
            moves = [bestMove].concat(moves.filter(move => move !== bestMove));
        }
        return bestMove;
    }
}

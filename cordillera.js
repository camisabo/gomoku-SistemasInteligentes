class CordilleraPlayer extends Agent {
    constructor(){ 
        super() 
        this.board = new Board()
        this.criba = null 
    }

    compute(board, move_state, time){
        var moves = this.board.valid_moves(board);

        switch(move_state){
            case '1':
                return this.movimientosApertura(board);
            case '2':
                return this.movimientoGanador(board, 'W') || 'BLACK';
            case '3':
                return this.movimientoGanador(board, 'W') || 'BLACK';
            default:
                if (!this.criba || this.criba.size !== board.length) {
                    this.criba = new Criba(board.length);
                }
                var agentColor = move_state; 
                var arbol = new ArbolOptimizacion(this.criba, board, 20, 18);
                var mejorMovimiento = arbol.encontrarMejorMovimiento(board, agentColor, time);
                return mejorMovimiento || moves[0];
        }
    }

    movimientosApertura(board) {
        var size = board.length;
        var center = Math.floor(size / 2);
        var candidates = [];
        for (var y = Math.max(0, center - 1); y <= Math.min(size - 1, center + 1); y++) {
            for (var x = Math.max(0, center - 1); x <= Math.min(size - 1, center + 1); x++) {
                if (board[y][x] === ' ') candidates.push([x, y]);
            }
        }
        if (candidates.length < 3) return this.board.valid_moves(board).slice(0, 3);

        var bestMoves = null;
        var bestScore = -Infinity;
        for (var first = 0; first < candidates.length; first++) {
            board[candidates[first][1]][candidates[first][0]] = 'B';
            for (var second = first + 1; second < candidates.length; second++) {
                board[candidates[second][1]][candidates[second][0]] = 'B';
                for (var third = 0; third < candidates.length; third++) {
                    if (third === first || third === second) continue;
                    board[candidates[third][1]][candidates[third][0]] = 'W';
                    var score = this.evaluarBalanceApertura(board);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMoves = [candidates[first], candidates[second], candidates[third]];
                    }
                    board[candidates[third][1]][candidates[third][0]] = ' ';
                }
                board[candidates[second][1]][candidates[second][0]] = ' ';
            }
            board[candidates[first][1]][candidates[first][0]] = ' ';
        }
        return bestMoves;
    }

    evaluarBalanceApertura(board) {
        var size = board.length;
        var values = [0, 1, 8, 70, 800, 100000];
        var scores = { B: 0, W: 0 };
        var directions = [[1, 0], [0, 1], [1, 1], [1, -1]];

        for (var y = 0; y < size; y++) {
            for (var x = 0; x < size; x++) {
                for (var d = 0; d < directions.length; d++) {
                    var dx = directions[d][0];
                    var dy = directions[d][1];
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
                    if (black > 0 && white === 0) scores.B += values[black];
                    if (white > 0 && black === 0) scores.W += values[white];
                }
            }
        }

        var weakerSide = Math.min(scores.B, scores.W);
        var imbalance = Math.abs(scores.B - scores.W);
        return weakerSide * 2 - imbalance * 0.25 + (scores.B + scores.W) * 0.05;
    }

    movimientoGanador(board, color) {
        var arbol = new ArbolOptimizacion(new Criba(board.length), board, 1, 100);
        var candidates = arbol.generarCandidatos(board);
        for (var i = 0; i < candidates.length; i++) {
            if (arbol.esMovimientoGanador(board, candidates[i], color)) return candidates[i];
        }
        return null;
    }
}

class Criba {
    constructor(size) {
        this.board = new Board();
        this.size = size;
        this.pesos = [];
        this.criticos = [];
        
        for (var i = 0; i < size; i++) {
            this.pesos[i] = [];
            this.criticos[i] = [];
            for (var j = 0; j < size; j++) {
                this.pesos[i][j] = [0,0,0,0,0,0,0,0,0,0];
                this.criticos[i][j] = [0,0,0,0];
            }
        }
    }

    // Calcula los pesos desde cero para cualquier tablero (seguro para minimax)
    calcularPesos(board) {
        var size = this.size;
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                this.pesos[i][j].fill(0);
            }
        }

        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (board[i][j] == 'B') {
                    for (let k = 1; k < 5; k++) {
                        const cercania = 6 - k;
                        if(i + k < size) {
                            this.pesos[i + k][j][0] += 1;
                            this.pesos[i + k][j][8] += cercania;
                        }
                        if(j + k < size) {
                            this.pesos[i][j + k][1] += 1;
                            this.pesos[i][j + k][8] += cercania;
                        }
                        if(i + k < size && j + k < size) {
                            this.pesos[i + k][j + k][2] += 1;
                            this.pesos[i + k][j + k][8] += cercania;
                        }
                        if(i + k < size && j - k >= 0) {
                            this.pesos[i + k][j - k][3] += 1;
                            this.pesos[i + k][j - k][8] += cercania;
                        }
                        if(i - k >= 0) {
                            this.pesos[i - k][j][0] += 1;
                            this.pesos[i - k][j][8] += cercania;
                        }
                        if(j - k >= 0) {
                            this.pesos[i][j - k][1] += 1;
                            this.pesos[i][j - k][8] += cercania;
                        }
                        if(i - k >= 0 && j - k >= 0) {
                            this.pesos[i - k][j - k][2] += 1;
                            this.pesos[i - k][j - k][8] += cercania;
                        }
                        if(i - k >= 0 && j + k < size) {
                            this.pesos[i - k][j + k][3] += 1;
                            this.pesos[i - k][j + k][8] += cercania;
                        }
                    }
                } else if (board[i][j] == 'W') {
                    for (let k = 1; k < 5; k++) {
                        const cercania = 6 - k;
                        if(i + k < size) {
                            this.pesos[i + k][j][4] += 1;
                            this.pesos[i + k][j][9] += cercania;
                        }
                        if(j + k < size) {
                            this.pesos[i][j + k][5] += 1;
                            this.pesos[i][j + k][9] += cercania;
                        }
                        if(i + k < size && j + k < size) {
                            this.pesos[i + k][j + k][6] += 1;
                            this.pesos[i + k][j + k][9] += cercania;
                        }
                        if(i + k < size && j - k >= 0) {
                            this.pesos[i + k][j - k][7] += 1;
                            this.pesos[i + k][j - k][9] += cercania;
                        }
                        if(i - k >= 0) {
                            this.pesos[i - k][j][4] += 1;
                            this.pesos[i - k][j][9] += cercania;
                        }
                        if(j - k >= 0) {
                            this.pesos[i][j - k][5] += 1;
                            this.pesos[i][j - k][9] += cercania;
                        }
                        if(i - k >= 0 && j - k >= 0) {
                            this.pesos[i - k][j - k][6] += 1;
                            this.pesos[i - k][j - k][9] += cercania;
                        }
                        if(i - k >= 0 && j + k < size) {
                            this.pesos[i - k][j + k][7] += 1;
                            this.pesos[i - k][j + k][9] += cercania;
                        }
                    }
                }
            }
        }
    }

    calcularCriticos(color) {
        var size = this.size;
        for(var i = 0; i < size; i++) {
            for(var j = 0; j < size; j++) {
                this.criticos[i][j][0] = Math.max(this.pesos[i][j][0], this.pesos[i][j][1], this.pesos[i][j][2], this.pesos[i][j][3]);
                this.criticos[i][j][1] = Math.max(this.pesos[i][j][4], this.pesos[i][j][5], this.pesos[i][j][6], this.pesos[i][j][7]);
                this.criticos[i][j][2] = 2 * Math.min(this.criticos[i][j][0], this.criticos[i][j][1]);

                // Adaptación según si el color actual es Negro ('B') o Blanco ('W')
                if (this.criticos[i][j][1] !== 0 && color === 'B') {
                    this.criticos[i][j][3] = (this.criticos[i][j][0] / this.criticos[i][j][1]) * (this.criticos[i][j][2] / 5);
                } else if (this.criticos[i][j][0] !== 0 && color === 'W') {
                    this.criticos[i][j][3] = (this.criticos[i][j][1] / this.criticos[i][j][0]) * (this.criticos[i][j][2] / 5);
                } else {
                    this.criticos[i][j][3] = 0;
                }
            }
        }
    }
}


class ArbolOptimizacion {
    constructor(criba, board, maxDepth = 20, maxBranches = 18) {
        this.criba = criba;
        this.maxDepth = Math.min(maxDepth, 20);
        this.maxBranches = Math.max(1, Math.min(maxBranches, 100));
        this.directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
    }

    esMovimientoGanador(board, move, color) {
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
                while (nx >= 0 && nx < size && ny >= 0 && ny < size && board[ny][nx] === color) {
                    count++;
                    nx += dx * direction;
                    ny += dy * direction;
                }
            }

            if (count >= 5) return true;
        }
        return false;
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

            if (count >= 5) score += 1000000;
            else if (count === 4) score += openEnds === 2 ? 100000 : 20000;
            else if (count === 3) score += openEnds === 2 ? 4000 : 500;
            else if (count === 2) score += openEnds === 2 ? 100 : 20;
            else score += openEnds === 2 ? 2 : 1;
        }
        return score;
    }

    puntuarConectividad(board, move, color) {
        var size = board.length;
        var x = move[0];
        var y = move[1];
        var score = 0;

        for (var dy = -2; dy <= 2; dy++) {
            for (var dx = -2; dx <= 2; dx++) {
                if (dx === 0 && dy === 0) continue;
                var nx = x + dx;
                var ny = y + dy;
                if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
                if (board[ny][nx] === color) score += 3 - Math.max(Math.abs(dx), Math.abs(dy));
                else if (board[ny][nx] !== ' ') score += 0.5;
            }
        }
        return score;
    }

    ordenarMovimientos(board, validMoves, colorToMove) {
        this.criba.calcularPesos(board);
        this.criba.calcularCriticos(colorToMove);
        var opponentColor = colorToMove === 'B' ? 'W' : 'B';
        var scoredMoves = validMoves.map(move => {
            var x = move[0];
            var y = move[1];
            var attack = this.puntuarMovimiento(board, move, colorToMove);
            var defense = this.puntuarMovimiento(board, move, opponentColor);
            return {
                move: move,
                wins: this.esMovimientoGanador(board, move, colorToMove),
                blocksOpponent: this.esMovimientoGanador(board, move, opponentColor),
                critical3: this.criba.criticos[y][x][3],
                tacticalScore: attack + defense * 0.9,
                connectivity: this.puntuarConectividad(board, move, colorToMove)
            };
        });

        scoredMoves.sort((a, b) =>
            Number(b.wins) - Number(a.wins) ||
            Number(b.blocksOpponent) - Number(a.blocksOpponent) ||
            b.tacticalScore - a.tacticalScore ||
            b.connectivity - a.connectivity ||
            b.critical3 - a.critical3
        );

        return scoredMoves.slice(0, this.maxBranches).map(item => item.move);
    }

    evaluarTablero(board, agentColor) {
        var opponentColor = agentColor === 'B' ? 'W' : 'B';
        var moves = this.generarCandidatos(board);
        if (moves.length === 0) return 0;

        this.criba.calcularPesos(board);
        this.criba.calcularCriticos(agentColor);
        var agentBest = this.maximoCriticoDisponible(moves);
        var agentThreat = this.maximoPatronDisponible(board, moves, agentColor);

        this.criba.calcularCriticos(opponentColor);
        var opponentBest = this.maximoCriticoDisponible(moves);
        var opponentThreat = this.maximoPatronDisponible(board, moves, opponentColor);
        return agentThreat - opponentThreat + (agentBest - opponentBest) * 10;
    }

    maximoPatronDisponible(board, moves, color) {
        var best = 0;
        for (var i = 0; i < moves.length; i++) {
            best = Math.max(best, this.puntuarMovimiento(board, moves[i], color));
        }
        return best;
    }

    maximoCriticoDisponible(moves) {
        var best = 0;
        for (var i = 0; i < moves.length; i++) {
            var x = moves[i][0];
            var y = moves[i][1];
            best = Math.max(best, this.criba.criticos[y][x][3]);
        }
        return best;
    }

    buscar(board, depth, alpha, beta, maximizingPlayer, agentColor, deadline) {
        if (Date.now() >= deadline) return null;
        if (depth === 0) {
            return this.evaluarTablero(board, agentColor);
        }

        var validMoves = this.generarCandidatos(board);
        if (validMoves.length === 0) return 0;

        var opponentColor = (agentColor === 'B') ? 'W' : 'B';
        var colorToMove = maximizingPlayer ? agentColor : opponentColor;
        var topMoves = this.ordenarMovimientos(board, validMoves, colorToMove);
        if (topMoves.length === 0) return 0;
        if (this.esMovimientoGanador(board, topMoves[0], colorToMove)) {
            return maximizingPlayer ? 1000000000 + depth : -1000000000 - depth;
        }

        if (maximizingPlayer) {
            var maxEval = -Infinity;
            for (var i = 0; i < topMoves.length; i++) {
                var move = topMoves[i];
                var newBoard = this.criba.board.clone(board);
                this.criba.board.move(newBoard, move, agentColor);

                var evaluation = this.esMovimientoGanador(newBoard, move, agentColor)
                    ? 100000 + depth
                    : this.buscar(newBoard, depth - 1, alpha, beta, false, agentColor, deadline);
                if (evaluation === null) return null;
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            var minEval = Infinity;
            for (var i = 0; i < topMoves.length; i++) {
                var move = topMoves[i];
                var newBoard = this.criba.board.clone(board);
                this.criba.board.move(newBoard, move, opponentColor);

                var evaluation = this.esMovimientoGanador(newBoard, move, opponentColor)
                    ? -100000 - depth
                    : this.buscar(newBoard, depth - 1, alpha, beta, true, agentColor, deadline);
                if (evaluation === null) return null;
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    encontrarMejorMovimiento(board, agentColor, time) {
        var validMoves = this.generarCandidatos(board);
        if (validMoves.length === 0) return null;

        var topMoves = this.ordenarMovimientos(board, validMoves, agentColor);
        var bestMove = topMoves[0];
        if (this.esMovimientoGanador(board, bestMove, agentColor)) return bestMove;
        var opponentColor = agentColor === 'B' ? 'W' : 'B';
        for (var i = 0; i < validMoves.length; i++) {
            if (this.esMovimientoGanador(board, validMoves[i], opponentColor)) {
                var block = topMoves.find(move =>
                    move[0] === validMoves[i][0] && move[1] === validMoves[i][1]
                );
                if (block) return block;
            }
        }
        var availableTime = Number.isFinite(time) ? time : 1000;
        var deadline = Date.now() + Math.max(1, Math.min(150, availableTime * 0.1));

        for (var depth = 1; depth <= this.maxDepth; depth++) {
            var bestEval = -Infinity;
            var iterationBestMove = bestMove;
            var alpha = -Infinity;
            var beta = Infinity;
            var completed = true;

            for (var i = 0; i < topMoves.length; i++) {
                if (Date.now() >= deadline) {
                    completed = false;
                    break;
                }

                var move = topMoves[i];
                var methodBoard = this.criba.board.clone(board);
                this.criba.board.move(methodBoard, move, agentColor);
                var evaluation = this.esMovimientoGanador(methodBoard, move, agentColor)
                    ? 100000 + depth
                    : this.buscar(methodBoard, depth - 1, alpha, beta, false, agentColor, deadline);

                if (evaluation === null) {
                    completed = false;
                    break;
                }
                if (evaluation > bestEval) {
                    bestEval = evaluation;
                    iterationBestMove = move;
                }
                alpha = Math.max(alpha, evaluation);
            }

            if (!completed) break;
            bestMove = iterationBestMove;
        }

        return bestMove;
    }
}
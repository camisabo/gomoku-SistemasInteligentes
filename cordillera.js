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
                return [moves[0], moves[1], moves[2]];
            case '2':
            case '3':
                return 'BLACK';
            default:
                if (!this.criba || this.criba.size !== board.length) {
                    this.criba = new Criba(board.length);
                }
                var agentColor = move_state; 
                var arbol = new ArbolOptimizacion(this.criba, board, 3, 4);
                var mejorMovimiento = arbol.encontrarMejorMovimiento(board, agentColor);
                return mejorMovimiento || moves[0];
        }
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
                this.criticos[i][j] = [0,0,0];
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

    calcularCriticos() {
        var size = this.size;
        for(var i = 0; i < size; i++) {
            for(var j = 0; j < size; j++) {
                this.criticos[i][j][0] = Math.max(this.pesos[i][j][0], this.pesos[i][j][1], this.pesos[i][j][2], this.pesos[i][j][3]);
                this.criticos[i][j][1] = Math.max(this.pesos[i][j][4], this.pesos[i][j][5], this.pesos[i][j][6], this.pesos[i][j][7]);
                this.criticos[i][j][2] = 2 * Math.min(this.criticos[i][j][0], this.criticos[i][j][1]);
            }
        }
    }
}

class ArbolOptimizacion {
    constructor(criba, board, maxDepth = 4, maxBranches = 5) {
        this.criba = criba;
        this.maxDepth = maxDepth;
        this.maxBranches = maxBranches;
    }

    esMovimientoGanador(board, move, color) {
        var directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        var x = move[0];
        var y = move[1];
        var size = board.length;

        for (var i = 0; i < directions.length; i++) {
            var dx = directions[i][0];
            var dy = directions[i][1];
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

    ordenarMovimientos(board, validMoves, colorToMove) {
        this.criba.calcularPesos(board);
        this.criba.calcularCriticos();

        var opponentColor = colorToMove === 'B' ? 'W' : 'B';
        var opponentWins = new Set();
        for (var i = 0; i < validMoves.length; i++) {
            if (this.esMovimientoGanador(board, validMoves[i], opponentColor)) {
                opponentWins.add(validMoves[i][0] + ',' + validMoves[i][1]);
            }
        }

        var ownCriticalIndex = colorToMove === 'B' ? 0 : 1;
        var opponentCriticalIndex = colorToMove === 'B' ? 1 : 0;
        var scoredMoves = validMoves.map(move => {
            var x = move[0];
            var y = move[1];
            return {
                move: move,
                wins: this.esMovimientoGanador(board, move, colorToMove),
                bothCritical: this.criba.criticos[y][x][2],
                blocksOpponent: opponentWins.has(x + ',' + y),
                ownCritical: this.criba.criticos[y][x][ownCriticalIndex],
                opponentCritical: this.criba.criticos[y][x][opponentCriticalIndex]
            };
        });

        scoredMoves.sort((a, b) =>
            Number(b.wins) - Number(a.wins) ||
            b.bothCritical - a.bothCritical ||
            Number(b.blocksOpponent) - Number(a.blocksOpponent) ||
            b.ownCritical - a.ownCritical ||
            b.opponentCritical - a.opponentCritical
        );

        var selectedMoves = scoredMoves.slice(0, this.maxBranches);
        var selectedPositions = new Set(selectedMoves.map(item => item.move[0] + ',' + item.move[1]));
        for (var j = 0; j < scoredMoves.length; j++) {
            var candidate = scoredMoves[j];
            var position = candidate.move[0] + ',' + candidate.move[1];
            if ((candidate.wins || candidate.blocksOpponent) && !selectedPositions.has(position)) {
                selectedMoves.push(candidate);
                selectedPositions.add(position);
            }
        }

        return selectedMoves.map(item => item.move);
    }

    buscar(board, depth, alpha, beta, maximizingPlayer, agentColor) {
        var winner = this.criba.board.winner(board);
        if (winner !== '') {
            return (winner === agentColor) ? (100000 + depth) : (-100000 - depth);
        }
        if (depth === 0) {
            return this.evaluarTablero(board, agentColor);
        }

        var validMoves = this.criba.board.valid_moves(board);
        if (validMoves.length === 0) return 0;

        var opponentColor = (agentColor === 'B') ? 'W' : 'B';
        var colorToMove = maximizingPlayer ? agentColor : opponentColor;
        var topMoves = this.ordenarMovimientos(board, validMoves, colorToMove);

        if (maximizingPlayer) {
            var maxEval = -Infinity;
            for (var i = 0; i < topMoves.length; i++) {
                var move = topMoves[i];
                var newBoard = this.criba.board.clone(board);
                this.criba.board.move(newBoard, move, agentColor);

                var evaluation = this.buscar(newBoard, depth - 1, alpha, beta, false, agentColor);
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

                var evaluation = this.buscar(newBoard, depth - 1, alpha, beta, true, agentColor);
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    evaluarTablero(board, agentColor) {
        var score = 0;
        this.criba.calcularPesos(board);
        this.criba.calcularCriticos();

        var size = board.length;
        for (var i = 0; i < size; i++) {
            for (var j = 0; j < size; j++) {
                var crit = this.criba.criticos[i][j];
                if (agentColor === 'B') {
                    score += (crit[0] * 2) - (crit[1] * 2.5);
                } else {
                    score += (crit[1] * 2) - (crit[0] * 2.5);
                }
            }
        }
        return score;
    }

    encontrarMejorMovimiento(board, agentColor) {
        var validMoves = this.criba.board.valid_moves(board);
        if (validMoves.length === 0) return null;

        var topMoves = this.ordenarMovimientos(board, validMoves, agentColor);

        var bestEval = -Infinity;
        var bestMove = topMoves[0];
        var alpha = -Infinity;
        var beta = Infinity;

        for (var i = 0; i < topMoves.length; i++) {
            var move = topMoves[i];
            var methodBoard = this.criba.board.clone(board);
            this.criba.board.move(methodBoard, move, agentColor);

            var evaluation = this.buscar(methodBoard, this.maxDepth - 1, alpha, beta, false, agentColor);

            if (evaluation > bestEval) {
                bestEval = evaluation;
                bestMove = move;
            }
            alpha = Math.max(alpha, evaluation);
        }

        return bestMove;
    }
}
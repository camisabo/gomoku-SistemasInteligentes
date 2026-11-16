# Gomoku

Abre `index.html` para ejecutar el juego. En los campos de jugadores puedes
seleccionar cualquiera de estos agentes:

- `cordillera1` y `cordillera2`: agente Cordillera, con búsqueda Minimax,
  poda alfa-beta y evaluación basada en `criticos`. Explora aperturas centrales
  balanceando las opciones de ambos colores y prioriza victorias/bloqueos
  inmediatos, incluso al decidir en las fases de apertura.
- `tactico1` y `tactico2`: agente táctico independiente, con evaluación de
  patrones de cinco casillas y búsqueda alfa-beta.

Ambos agentes admiten los dos colores y priorizan ganar o bloquear una victoria
inmediata. La búsqueda se limita a casillas cercanas a las fichas y al tiempo
restante de cada jugador.

---
description: Crea un worktree de git en .worktrees/<nombre> sin cambiar de rama
agent: build
---

Crea un worktree de git con el nombre: $ARGUMENTS

Reglas para el nombre:
1. Normalízalo a kebab-case (minúsculas, palabras unidas con guiones, sin espacios ni acentos).
2. Si el nombre tiene más de 4 palabras, redúcelo primero a un nombre corto y significativo
   que capture la idea en 2–4 palabras (en español). Si tiene 4 palabras o menos, úsalo
   tal cual, solo normalizado.

Luego ejecuta exactamente este comando (uno solo):

git worktree add .worktrees/<nombre>

Restricciones estrictas:
- No cambies de rama ni hagas checkout en el repositorio principal (git worktree add ya
  crea la rama nueva dentro del worktree).
- No te cambies al worktree ni muevas la sesión de trabajo al nuevo directorio.
- No ejecutes ningún otro comando, ni siquiera de verificación (nada de git status,
  git worktree list, ls, cd, mkdir...).
- No crees, modifiques ni borres ningún archivo; git crea el directorio .worktrees/ solo.
- Si el comando falla, reporta el error tal cual y no intentes nada más.

Ejemplos:
- /worktree fix collision bug → git worktree add .worktrees/fix-collision-bug
- /worktree sistema de animaciones de explosion para la nave → git worktree add .worktrees/animaciones-explosion

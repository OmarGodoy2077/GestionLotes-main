# Skills del proyecto — GestionLotes

Esta carpeta contiene **skills específicos del proyecto** para Claude Code. Se versionan en git (a diferencia de `settings.local.json`) para que viajen con el repo y cualquier sesión futura de Claude en cualquier máquina los detecte automáticamente.

## Skills disponibles

| Skill | Cuándo se activa |
|---|---|
| [`gestionlotes-db`](gestionlotes-db/SKILL.md) | Cualquier modificación a la base de datos: agregar/quitar/renombrar tablas, columnas, índices, enums, FKs; resetear DB; troubleshooting de Prisma migrations; preparar deploy a Railway. Previene drift entre la DB local y lo que Railway replicará. |

## Cómo funcionan

Cada skill es una carpeta con (al menos) un archivo `SKILL.md` que tiene frontmatter YAML:

```yaml
---
name: nombre-en-kebab-case
description: Cuándo y cómo activarlo (lo lee Claude para decidir)
---

# Contenido del skill (procedimientos, reglas, cheat sheets)
```

Claude Code:

1. Al iniciar la sesión carga la lista de skills disponibles (nombre + descripción).
2. Cuando el usuario hace un pedido que matchea con el `description`, Claude invoca el skill y lee el contenido completo del `SKILL.md`.
3. El contenido del skill se vuelve guía obligatoria para esa interacción.

## Cómo agregar un nuevo skill

1. Crear `.claude/skills/<nombre>/SKILL.md`.
2. Escribir frontmatter con `name` y `description` claros (la `description` debe incluir palabras clave que el usuario probablemente use).
3. El cuerpo: procedimientos, reglas, ejemplos, cheat sheets.
4. Commitear todo (la carpeta y el SKILL.md) — no requiere reiniciar Claude, se detecta en la siguiente sesión.

## Convenciones de este proyecto

- Skills **específicos del proyecto** van aquí (`.claude/skills/`). Ej: cómo modificar la DB de GestionLotes.
- Skills **genéricos** (no específicos del proyecto) van en `~/.claude/skills/` (config personal del usuario) — esos NO se commitean.
- Si un skill tiene contenido auxiliar (ejemplos, plantillas), usar una subcarpeta `references/` dentro del skill.

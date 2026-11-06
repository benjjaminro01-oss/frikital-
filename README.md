# Frikital CG · v1.1.0

Sistema de gráficas en vivo para Frikital Fest 2026. HTML, CSS y JS puros: se publica tal cual, sin compilar.

- `panel.html` → panel de control (Control, Control + Visual, Botonera y configuración ⚙).
- `salida.html` → fuente de navegador para OBS (1920×1080, fondo transparente).

## 1. Publicar en GitHub Pages
1. Sube todo el contenido de esta carpeta a tu repositorio (incluida la carpeta `media/` y `fonts/`).
2. Settings → Pages → Branch `main`, carpeta `/ (root)`.
3. Tus enlaces serán `https://USUARIO.github.io/REPO/panel.html` y `.../salida.html`.

## 2. Sincronizar varios equipos (Firebase Realtime Database)
1. Firebase Console → tu proyecto → Realtime Database → pestaña **Reglas** → pega el contenido de `firebase-rules.json` → Publicar.
2. Copia la URL de la base (ej. `https://tu-proyecto-default-rtdb.firebaseio.com`).
3. Abre el panel → ⚙ → General → Conexión → **En línea**, pega la URL, elige un nombre de sala → *Guardar y recargar*.
4. En esa misma pantalla aparece el **enlace para OBS** ya armado. Los demás equipos (tablet, celular) abren `panel.html` con la misma URL y sala (o el enlace con `?sala=…&db=…`).
5. Opcional: escribe la URL en `js/firebase-config.js` para no tener que pegarla en cada equipo.

La URL de Firebase no es un secreto, pero las reglas son abiertas: quien conozca la URL y el nombre de sala puede controlar la salida. Usa un nombre de sala difícil de adivinar. No hay claves ni contraseñas en el código.

**Modo local** (sin internet, un solo computador): ⚙ → General → Conexión → Local. Panel y salida deben compartir el mismo navegador/perfil (por ejemplo, el panel como *dock de navegador personalizado* de OBS).

## 3. OBS
- Fuente → Navegador → pega el enlace de salida, ancho 1920, alto 1080.
- Marca **Controlar audio mediante OBS** (el motion de apertura trae SFX).
- Desmarca "Apagar fuente cuando no esté visible" y "Actualizar el navegador cuando la escena se active".
- El fondo es transparente: pon la fuente sobre tus cámaras.

## 4. Uso rápido
- **Control**: escaleta por streaming (Re Pág / Av Pág, también con las teclas) y tarjetas de gráficas. Edita texto y colores; **Mostrar** / **Ocultar** / **Actualizar** (envía los cambios al aire) / **Prev**.
- **Control + Visual**: agrega los monitores VISTA PREVIA (solo operador) y AL AIRE.
- **Botonera**: un toque muestra, otro oculta; en rojo = al aire. *Editar botonera* para cambiar gráfica, tecla (F13–F24 o cualquiera), texto y colores, y para ordenar (arrastrar o ◀ ▶).
- **Limpiar salida** oculta todo.
- Gráficas del mismo grupo no se superponen: la nueva reemplaza a la anterior.
- Todo texto con `PENDIENTE_` se ve en rojo en el panel y **nunca sale al aire**. Los lower thirds de personas con cargo por confirmar piden marcar "validados" antes de mostrarse.
- **Transiciones** (⚙ → Transiciones): sube MP4/WebM o crea cortinas; ajusta el punto de corte y pruébalas. Asígnalas en ⚙ → Gráficas ("Entra con" / "Sale con"): primero corre la transición y la gráfica cambia en el corte.
- **Videos con transparencia**: WebM con alfa funciona directo (Fondo: *Transparente*); para fondo verde elige *Fondo verde (chroma)*.
- Videos grandes (>24 MB): ponlos en `media/` del repositorio y regístralos; los más chicos se pueden subir desde el panel.

## 5. Pendientes de la ficha (marcados PENDIENTE_ en el panel)
Nombres y cargos de conductor/a y de representantes (Jedi, Ludopalooza, Red Bull, Muvix, BiMedia, Mume), ganadores y categorías, y los archivos de Motion cierre, Motion final y Cartón final.

## 6. Fuente
Todo usa `fonts/A4SPEED-Bold.ttf`. La fuente no trae tildes, Ñ, ¡ ¿ ni "·": esos caracteres salen con Saira de respaldo (se carga desde Google Fonts; sin internet saldrá una fuente genérica).

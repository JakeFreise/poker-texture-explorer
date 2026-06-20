# Texture Outs Nut Potential App

Static plot app for poker board texture and range analysis.

## Local run

From this directory:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8765/texture_outs_nut_potential_app/
```

## Repo layout

```text
texture_outs_nut_potential_app/  app shell and small bootstrap data
board_details/                   generated board-detail database
current_showdowns/               generated current-showdown database
future_showdowns/                generated future-showdown database
per_flop/                        generated exact contributor CSVs
```

`board_details/` and `future_showdowns/` are tracked so the public Pages app has the core interactive data it needs. `current_showdowns/`, `range_cells/`, and `per_flop/` are intentionally ignored because they push the site past GitHub Pages size limits; publish those to object storage/CDN if those exact showdown split details need to work online too.

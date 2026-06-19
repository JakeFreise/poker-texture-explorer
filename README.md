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

The large generated data folders are ignored by default so normal Git commits stay light. For production hosting, publish those folders to object storage/CDN, or deliberately remove the ignore rules if you want a large local-only Git history.

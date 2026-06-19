@echo off
cd /d "%~dp0.."
start "" "http://127.0.0.1:8765/texture_outs_nut_potential_app/"
python -m http.server 8765 --bind 127.0.0.1

#!/bin/sh
# Atualiza a versão (?v=) dos .js/.css referenciados nos HTML, para o cache do GitHub Pages
# nunca misturar um HTML novo com scripts antigos. Rode antes de cada commit que mexa em js/css.
v=$(date -u +%Y%m%d%H%M)
for f in index.html admin.html; do
  sed -i -E "s/((src|href)=\"[^\"h][^\"]*\.(js|css))(\?v=[0-9]+)?\"/\1?v=$v\"/g" "$f"
done
echo "versão $v aplicada"

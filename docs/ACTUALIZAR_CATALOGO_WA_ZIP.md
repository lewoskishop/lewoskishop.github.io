# Actualizar catálogo desde un export de WhatsApp (ZIP)

Este documento describe cómo actualizar los productos e imágenes de la tienda
(**LewoskiShop**, Astro + content collections) a partir de un **catálogo
exportado de WhatsApp** en formato ZIP.

A diferencia de la sincronización directa desde `wa.me/c/...` (que no es
accesible por HTTP, ver `scripts/sync-whatsapp-catalog.*`), este flujo trabaja
con un **archivo ZIP ya descargado/exportado** que contiene los datos y las
imágenes del catálogo.

---

## 1. Contenido esperado del ZIP

Al descomprimir el ZIP se obtiene una carpeta (p. ej. `catalog-gabi-lewoski/`)
con esta estructura:

```
catalog-gabi-lewoski/
├── items.json        # datos del catálogo (fuente principal)
├── items.csv         # alternativa/soporte
├── items.xlsx        # alternativa
├── index.html
├── logo.jpg
└── images/           # imágenes referenciadas por los ítems
    ├── producto-a.jpg
    └── ...
```

Formato relevante de `items.json` (raíz con `items`):

```json
{
  "items": [
    {
      "id": "cera-de-soja-bpf-reficen-el-kg",
      "title": "Cera de soja BPF REFICEN el kg",
      "description": "Descripción opcional",
      "price": "ARS 12,000.00",
      "collection": "Insumos Para Velas",
      "collections": ["Insumos Para Velas"],
      "image": "images/cera-de-soja-bpf-reficen-el-kg.jpg",
      "images": ["images/cera-de-soja-bpf-reficen-el-kg.jpg"]
    }
  ]
}
```

- `title` → nombre del producto.
- `description` → descripción (corta/larga según longitud; puede ser `null`).
- `price` → precio (se parsea; ej. `"ARS 12,000.00"` → `12000`).
- `collection`/`collections` → usado para inferir `category` y `grupo`.
- `image`/`images` → rutas relativas dentro de la carpeta extraída (se copian).

---

## 2. Descomprimir el ZIP

Ejemplo (destino recomendado en `/tmp/opencode`):

```bash
mkdir -p /tmp/opencode/catalog-gabi-lewoski
unzip -o catalog-gabi-lewoski.zip -d /tmp/opencode/catalog-gabi-lewoski
```

> Nota: si el ZIP ya incluye una carpeta raíz, la ruta útil quedará anidada, p. ej.
> `/tmp/opencode/catalog-gabi-lewoski/catalog-gabi-lewoski/` (es la que contiene
> `items.json` e `images/`).

---

## 3. Scripts

| Archivo | Rol |
|---|---|
| `scripts/actualizar-catalogo-wa-zip.sh` | Script principal (shell). Valida la fuente y ejecuta el importador (y opcionalmente el build). |
| `scripts/import-catalog-wa-zip.mjs` | Importador Node: lee `items.json`/`items.csv`, mapea campos, copia imágenes y genera los productos. |

---

## 4. Uso

```bash
# Ver qué haría, sin escribir nada (recomendado primero)
./scripts/actualizar-catalogo-wa-zip.sh [RUTA_EXTRAIDA] --mode merge --dry-run

# Importar conservando productos existentes (agrega los nuevos; omite slugs ya presentes)
./scripts/actualizar-catalogo-wa-zip.sh [RUTA_EXTRAIDA] --mode merge --build

# Dejar la tienda EXACTAMENTE como el ZIP (reemplaza todo el catálogo)
./scripts/actualizar-catalogo-wa-zip.sh [RUTA_EXTRAIDA] --mode replace --build
```

### Parámetros

- `[RUTA_EXTRAIDA]` (opcional): carpeta que contiene `items.json`/`items.csv` e
  `images/`.  
  **Por defecto:** `/tmp/opencode/catalog-gabi-lewoski/catalog-gabi-lewoski`
- `--mode merge|replace` (default `merge`)
  - `merge`: mantiene los productos actuales y agrega los del ZIP cuyo *slug* no
    exista (no borra ni sobreescribe los existentes).
  - `replace`: elimina `src/content/products/*.json` y genera el catálogo completo
    desde el ZIP.
- `--dry-run`: no escribe archivos ni copia imágenes; solo reporta.
- `--build`: ejecuta `npm run build` al finalizar (ignorado en `--dry-run`).
- `-h|--help`: muestra ayuda.

También puede invocarse el importador directo:

```bash
node scripts/import-catalog-wa-zip.mjs --src /ruta/extraida --mode merge [--dry-run]
```

---

## 5. Qué hace la importación

- **Destino de datos:** `src/content/products/<slug>.json` (content collection
  `products`, esquema `src/lib/product-schema.ts`).
- **Destino de imágenes:** copia las imágenes referenciadas a
  `public/images/products/<slug>-N.<ext>` y las vincula como
  `/images/products/<slug>-N.<ext>` (máx. 3 por producto).
- **Slug/ID:** se deriva de `id` (o del título) normalizado.
- **Precio:** parseado a número entero (ARS). Si falta/vale 0, se usa `1` (el
  esquema exige `price > 0`).
- **Campos generados:** `name`, `description` (y `longDescription` si aplica),
  `price`, `category`, `grupo`, `brand` (`LewoskiShop`), `images`, `featured: false`,
  `inStock: true`, `tags: []`.
- **`category` y `grupo` (`velas`|`jabones`|`ambos`):** se infieren desde la
  colección de WhatsApp (mapeo conocido) y, si no hay match, por reglas sobre el
  nombre/descripción (ceras, moldes, esencias, envases, pabilos, cosmética, etc.),
  con fallback a `General/ambos`.

### Mapeo de colecciones conocido

| Colección (WhatsApp) | category | grupo |
|---|---|---|
| Insumos Para Velas | Ceras | velas |
| Insumos Aromas | Esencias | ambos |
| Insumos Jabón / Insumos Jabon | Jabones y Cosmética | jabones |
| Cosmética / Cosmetica | Jabones y Cosmética | jabones |
| Envases Varios | Envases | ambos |
| Flores, brillos y decoración | Accesorios | ambos |
| Flores | Accesorios | ambos |
| Animales | Moldes | ambos |
| Navidad | Moldes | ambos |
| Moldes P Yeso/resina/concreto | Moldes | ambos |

> La inferencia es heurística: tras importar conviene revisar productos en
> `General/ambos` o con categoría/grupo dudosos y corregirlos (panel `/admin` o
> editando el JSON) y luego recompilar.

---

## 6. Ejemplo real (catálogo Gabi Lewoski)

Con el ZIP `catalog-gabi-lewoski.zip` descomprimido en
`/tmp/opencode/catalog-gabi-lewoski/catalog-gabi-lewoski/`:

```bash
./scripts/actualizar-catalogo-wa-zip.sh \
  /tmp/opencode/catalog-gabi-lewoski/catalog-gabi-lewoski \
  --mode merge --dry-run
# => 246 productos, 235 a escribir, 11 omitidos (slugs existentes), 0 fallos
```

Para dejar la tienda exactamente con ese catálogo:

```bash
./scripts/actualizar-catalogo-wa-zip.sh \
  /tmp/opencode/catalog-gabi-lewoski/catalog-gabi-lewoski \
  --mode replace --build
```

---

## 7. Publicar los cambios

La importación modifica archivos del repo (productos e imágenes) pero **no
commitea ni publica**. Para desplegar en GitHub Pages:

```bash
git add -A
git commit -m "Actualiza catálogo desde export WhatsApp (ZIP)"
git push origin main
```

(o `UP_MESSAGE="Actualiza catálogo desde export WhatsApp" ./up.sh`). El workflow
`.github/workflows/deploy.yml` compila y publica en el push a `main`.

---

## 8. Notas y límites

- La fuente es un **export estático** (ZIP): para reflejar cambios nuevos del
  catálogo de WhatsApp hay que volver a exportar/descomprimir y ejecutar el script.
- No requiere credenciales ni acceso a la API de WhatsApp; opera 100% local sobre
  los archivos descomprimidos.
- `--mode merge` **no actualiza** productos cuyo slug ya existe (solo agrega
  faltantes). Para refrescar todo con el contenido del ZIP, usar `--mode replace`.
- Si faltara alguna imagen referenciada, se informa por consola y el producto se
  genera con un path de imagen fallback; conviene revisar esos casos.

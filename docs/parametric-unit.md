# یونیت زمینی پارامتریک (Parametric floor unit)

Implementation of the technical reference drawing (see `debug/parts/standard.png`)
inside Cabinex: a floor unit whose every panel is derived from a small set of
construction parameters.

## Part naming / identification colours

| Colour (2D/3D identity mode) | Part | `PartRole` |
| --- | --- | --- |
| light cyan `#8ee8e8` | بدنه چپ | `leftBody` |
| dark blue `#2727d8` | بدنه راست | `rightBody` |
| red `#d92d2d` | کف | `bottom` |
| pink `#e2aab4` | پشت‌بند | `backRail` |
| gray `#8d8d8d` | تیرک (two top stretchers) | `stretcher` |
| green `#4caf27` | ورق سه میل | `sheet` |
| steel gray | پایه استوانه‌ای (4 pcs) | `foot` |

Colours are only an identification aid: `params.colorMode = "material"` renders the
unit with its project material instead.

## Construction rules (domain/parametric.ts)

Local frame: `+X` right, `+Y` up from the floor, `+Z` front. Origin = footprint centre
on the floor. Back = where the back rail sits; the front is open.

- **Default thickness** of all panels = 16 mm, sheet = 3 mm. Every panel can be
  edited individually, plus a collective "all panels" value (also across a
  multi-unit selection).
- **3 mm sheet** sits in a groove routed on the inner face of the left body, the
  inner face of the right body and the top face of the bottom.
  - groove depth is adjustable (`grooveDepth`), clamped to `panel − 2` mm;
  - the groove's back face is always **exactly the back-rail thickness away from
    the back of the parts**, so changing the back-rail thickness moves the groove;
  - the sheet cut width = inner width + 2 × groove depth (it enters both side grooves).
- **Height** from the bottom of the feet to the top edge is the envelope `height`;
  it can be set from top to bottom and the feet height is subtracted from it.
- **Width** can grow to the right, to the left or symmetrically; the anchored edge
  stays fixed while dragging the handles or typing a value.
- **Depth** grows towards the front, the back edge (back rail) never moves.
- **Stretchers**: two top rails, one over each body, spanning from the back rail to
  the front (with adjustable setback), adjustable section width and seating depth.
- **Feet**: four cylinders, diameter / height / inset adjustable, height measured
  upwards from the floor (0 = unit standing on the floor).
- Changing width / height / depth only changes the **length** of the panels; every
  cross-section (16 mm, 3 mm, stretcher section, back-rail section) is preserved.

## UI

- Library → category «یونیت پارامتریک» → «یونیت زمینی پارامتریک» (isometric thumbnail).
- Select the unit → properties panel shows: envelope, growth direction, thicknesses,
  groove, back rail, stretchers, feet, part identification list, computed metrics,
  a live cut list (BOM) and construction warnings.
- `Alt + click` a part in the 3D view to select individual parts (highlighted);
  clicking a role row in the panel selects all parts of that role.
- Multiple parametric units selected → collective thickness / groove / feet controls.

## Verification helpers (not part of the bundle)

```bash
npx esbuild src/features/designer/domain/parametric.ts --outfile=/tmp/build/parametric.js --format=esm
# geometry invariants: sections constant, no overlaps, groove offset, feet, cut list
node debug/check.mjs
# isometric renders of the assembly (software rasteriser, no browser needed)
node debug/render.mjs 600 720 500 6 100 /tmp/iso.png
```

`debug/check.mjs` verifies, for several envelopes and groove depths, that panels keep
their section, parts never overlap, all parts stay inside the envelope, the groove
offset equals the back-rail thickness, the sheet thickness is respected and the
height stack (`feet + body = total`) is exact.

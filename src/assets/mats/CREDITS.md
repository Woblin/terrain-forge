# Mat pictures

| File | Mat | Source |
| --- | --- | --- |
| `grass.webp` | Grass | Made by the project owner with an open-source image generator ("meadow") |
| `rocky-grass.webp` | Rocky grass | Made by the project owner with an open-source image generator ("Iberian plains") |
| `fields.webp` | Fields | Made by the project owner with an open-source image generator ("prairie") |
| `desert.webp` | Desert | Made by the project owner with an open-source image generator ("wild west") |
| `snow.webp` | Snow | Made by the project owner with an open-source image generator ("tundra") |
| `lava.webp` | Lava | Made by the project owner with an open-source image generator ("lava") |
| `rocky-ground.webp` | Rocky ground | Drawn from SVG noise filters (`feTurbulence` with lighting) for this project |

Each picture was made to repeat without visible edges by blending it with a copy of itself shifted
by half its width and height, then saved as WebP: the full size for the board (620 × 413 px, or
512 × 512 px for Rocky ground) and a `-small` copy 256 px wide for swatches and board cards.

To add a mat, add its two files here, its entry in `MATS` in `src/domain/mats.ts` and in
`src/components/matPictures.ts`.

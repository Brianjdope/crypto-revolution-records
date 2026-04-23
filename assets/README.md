# Assets

The hero flag (`flag-cr.svg`) is procedurally generated and ships in this repo.

The four cartoon images you shared are referenced in the HTML at the paths
below. Drop your files in this folder with these exact names and they'll
appear in the page automatically (the `<img>` tags use `loading="lazy"` and
will gracefully no-op if the file is missing):

| File                       | Where it shows up                          |
|----------------------------|--------------------------------------------|
| `assets/oz-protest.png`    | Manifesto background — the protest cartoon |
| `assets/oz-popart.png`     | Roster header — the pink/green pop-art     |
| `assets/oz-sunglasses.png` | Footer / about — the sunglasses goat       |
| `assets/dj-studio.png`     | Listen / Player — the DJ studio shot       |

Any image format works — keep the filename and the page will pick them up.

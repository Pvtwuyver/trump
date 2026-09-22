# Witte Huis met bouwput — 3D LEGO-set

Statische website met een interactief 3D-model: het Witte Huis als LEGO-set, met de West Wing
gesloopt en een bouwput op die plek. Te downloaden als OBJ + MTL of GLB.

## Bestanden

- `index.html` — de website (entrypoint)
- `three-d-stage.js` — 3D-viewer met licht, schaduw, orbit-besturing en export
- `white-house-model.js` — het model zelf (three.js, opgebouwd uit benoemde onderdelen)

three.js wordt via een CDN (unpkg) geladen, dus de pagina heeft internet nodig.

## Hosten op GitHub Pages

1. Maak een repository en zet deze drie bestanden in de root (`index.html` bovenaan).
2. Repository → **Settings → Pages**.
3. Bij *Source*: **Deploy from a branch**, branch `main`, folder `/ (root)`. Opslaan.
4. Na een minuut staat de site op `https://<gebruikersnaam>.github.io/<repo>/`.

Lokaal bekijken kan niet via dubbelklikken (ES-modules vereisen een server); gebruik bijvoorbeeld
`python3 -m http.server` in de map en open `http://localhost:8000`.

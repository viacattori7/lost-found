# Lost & Found — GitHub Pages + admin con password + update automatico

Questa versione è **tutta su GitHub Pages**, ma permette alla proprietaria di:
- entrare in `admin.html` con una **password semplice**
- inserire un **GitHub Personal Access Token (PAT)** (non salvato nel codice)
- caricare una foto + descrizione
- aggiornare automaticamente `uploads/...` e `data/items.json` con commit via GitHub API

## Limite importante (sicurezza)
GitHub Pages è hosting **statico**: non puoi nascondere segreti nel codice (token, password “vera”, ecc.).
Per questo:
- la password è solo un “filtro” per persone non tecniche
- **il token NON va mai messo in config.js**
- usa un token **fine-grained**, limitato a **solo questo repo** e permessi minimi (Contents read/write)

## Setup
1) Crea un repo (es. `lost-found-casa`) e carica questi file nella root.
2) Abilita GitHub Pages:
   - Settings → Pages → Deploy from branch → `main` / root
3) Modifica `config.js`:
   - `SITE_TITLE`, `SITE_SUBTITLE`
   - contatto WhatsApp/email
   - `GITHUB_OWNER`, `GITHUB_REPO` (e branch se diverso)
   - (la password è già impostata come hash)

## Crea il token (PAT)
Consigliato: **fine-grained token**, limitato a 1 repo.
Permessi minimi tipici:
- Repository permissions: **Contents: Read & write**
- (spesso serve anche **Metadata: Read**)

## Uso (proprietaria)
1) Apri `.../admin.html`
2) Inserisci la password
3) Incolla il token (puoi “Salva token per questa sessione”)
4) Compila e premi “Carica e pubblica”

## Note pratiche
- Per evitare repo enormi: il form rifiuta immagini oltre `MAX_IMAGE_MB` (config.js).
- Se vuoi nascondere il link “Admin” nella pagina pubblica, rimuovilo da `index.html`.

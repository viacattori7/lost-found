# Lost & Found — tutto su GitHub (solo statico)

Questa versione **non usa Supabase**: è un sito statico per **GitHub Pages**.
✅ Foto e dati stanno nel repository.
✅ Nessun database esterno.

⚠️ Limite importante: GitHub Pages è hosting **statico** (HTML/CSS/JS), quindi **non può gestire** in modo “vero” e sicuro:
- login lato server
- upload dal browser verso un backend
Senza un backend non esistono segreti “protetti” nel codice front-end. citeturn0search16

Però: per un regalo semplice, la soluzione più pratica è usare **GitHub come “area admin”**:
- solo chi ha accesso in scrittura al repo (la proprietaria) può caricare foto e modificare i dati.

---

## Struttura
- `index.html` → pagina pubblica con ricerca + filtri
- `data/items.json` → elenco oggetti (modificabile da GitHub web)
- `uploads/` → cartella dove caricare le foto
- `admin.html` → pagina “helper” (non fa upload automatico; ti guida e genera lo snippet JSON)

---

## Setup rapido (GitHub Pages)
1. Crea un repo (es. `lost-found-casa`)
2. Carica questi file (upload)
3. Settings → Pages → Deploy from branch → `main` / root
4. Apri l’URL `https://<user>.github.io/<repo>/`

---

## Come aggiungere un oggetto (workflow “admin” 100% GitHub)
### A) Carica la foto
1. Vai su GitHub → repo → cartella `uploads/`
2. “Add file” → “Upload files”
3. Carica la foto (es. `2025-12-17-chiavi.jpg`) e fai commit

### B) Aggiungi l’oggetto in `data/items.json`
1. Apri `data/items.json`
2. Click su “Edit” (icona matita)
3. Aggiungi una nuova voce nell’array, esempio:

```json
{
  "id": "chiavi-2025-12-17",
  "title": "Mazzo di chiavi",
  "description": "Con portachiavi rosso",
  "found_date": "2025-12-17",
  "status": "found",
  "photo": "uploads/2025-12-17-chiavi.jpg"
}
```

4. Commit

Dopo pochi secondi la pagina pubblica mostrerà l’oggetto.

---

## “Admin con login” (cosa è possibile senza backend)
- La pagina `admin.html` può essere **visibile** a tutti, ma **solo la proprietaria** (loggata su GitHub) può davvero modificare repo e foto.
- Se vuoi un vero login+upload in pagina, serve un backend o un servizio OAuth/proxy (es. Decap CMS richiede un OAuth proxy). citeturn0search1turn0search2turn0search5

---

## Personalizza
Apri `config.js` e modifica:
- titolo e sottotitolo
- link contatto (WhatsApp/email)

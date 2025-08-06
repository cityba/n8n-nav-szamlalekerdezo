# NAV Számla Lekérdező – n8n custom node 🇭🇺

Egy egyedi `n8n` node a NAV Online Számla rendszeréből történő lekérdezéshez (`inbound` / `outbound` számlák részletesen vagy fejlécekkel).

---

## 🧰 Funkciók

- NAV API elérés n8n-ből
- Bemenet: paraméterezhető JSON (időszak, irány, részletesség, adószám)
- Kimenet: JSON, ami továbbvihető Excel, SQL, stb. formátumokba
- Beépített hitelesítési adatkezelés
- Egyedi ikon támogatás (`icons/nav-logo.svg`)

---

## 📦 Telepítés

1. Klónozd a repót:

```bash
git clone https://github.com/<a-te-repod>/<repo-név>.git
cd <repo-név>
Függőségek telepítése:

bash
Másolás
Szerkesztés
npm install
Build:

bash
Másolás
Szerkesztés
npm run build
Másold a buildelt node-ot az n8n ~/.n8n/custom könyvtárba vagy használd saját csomagként dockeres deployhoz.

🧑‍💻 Használat
🎛️ Paraméterezés
A node egy string típusú paramétert vár inputként, ami egy JSON formátumú lekérdezés:

json
Másolás
Szerkesztés
{
  "datumTol": "2025-03-01",
  "datumIg": "2025-04-01",
  "tipus": "inbound",      // vagy "outbound"
  "reszletesseg": "reszletes", // vagy "fejlec"
  "adoszam": "12345678"
}
🗝️ Hitelesítés
A NAV Invoice API Credentials típusú credential tartalmazza:

Login név

Jelszó

Adószám

Aláírókulcs (signKey)

A node beolvassa és automatikusan használja ezeket.

🧪 Példafolyamat
Set node → beállítod a lekérdezési JSON-t

NAV Számla Lekérdező node → megadod az inputot expressionként:
{{ $json }}

Kimenet megy Spreadsheet File, Postgres, stb. node felé

🧾 Kimenet
A NAV API válasza teljes JSON formátumban visszaadódik, amit n8n feldolgoz.

📁 Fájlstruktúra
pgsql
Másolás
Szerkesztés
.
├── credentials/
│   └── NavInvoiceApi.credentials.ts
├── nodes/
│   └── navInvoiceQuery.node.ts
├── icons/
│   └── nav-logo.svg
├── package.json
├── tsconfig.json
└── README.md
🛠️ Build script (ajánlott)
A package.json-ba ezt add hozzá, hogy az ikonfájl is másolódjon:

json
Másolás
Szerkesztés
"scripts": {
  "build": "tsc && copyfiles -u 1 icons/* dist/icons"
}
Majd:

bash
Másolás
Szerkesztés
npm install --save-dev copyfiles
🐞 Hibakeresés
Ha nem jelenik meg az ikon: győződj meg róla, hogy icons/nav-logo.svg tényleg bemásolódik a dist/ könyvtárba

Fordítási hiba az icon mezőnél? Használd így:

ts
Másolás
Szerkesztés
icon = 'file:icons/nav-logo.svg';
🔐 Fejlesztői megjegyzés
Az ICredentialType interface icon mezője n8n verziótól függően változhat. A legnagyobb kompatibilitás érdekében stringként érdemes használni: 'file:icons/nav-logo.svg'

👤 Szerző
cityba – fejlesztő problémamegoldó

Ha tetszett vagy hasznos volt, ⭐️-zd a repót!

📜 Licenc
MIT

# NAV Invoice Query – n8n custom node 🇭🇺

A custom `n8n` node for querying the NAV Online Invoice system (`inbound` / `outbound` invoices in detail or with headers).

---

## 🧰 Functions

- NAV API access from n8n
- Input: parameterizable JSON (period, direction, detail, tax number)
- Output: JSON, which can be exported to Excel, SQL, etc. formats
- Built-in authentication
- Custom icon support (`icons/nav-logo.svg`)

---

## 📦 Installation

1. Clone the repo:

```bash
git clone https://github.com/<your-repo>/<repo-name>.git
cd <repo-name>
Install dependencies:

bash
Copy
Edit
npm install
Build:

bash
Copy
Edit
npm run build
Copy the built node to the n8n ~/.n8n/custom directory or use it as your own package for docker deployment.

🧑‍💻 Usage
🎛️ Parameterization
The node expects a string type parameter as input, which is a JSON format query:

json
Copy
Edit
{
"datumTol": "2025-03-01",
"datumIg": "2025-04-01",
"type": "inbound", // or "outbound"
"detail": "detail", // or "header"
"id": "12345678"
}
🗝️ Authentication
The NAV Invoice API Credentials type credential contains:

Login name

Password

Tax ID

Signing key (signKey)

The node reads and uses these automatically.

🧪 Example flow
Set node → set the query JSON

NAV Account Query node → enter the input as an expression:
{{ $json }}

Output goes to Spreadsheet File, Postgres, etc. node

🧾 Output
The NAV API response is returned in full JSON format, which is processed by n8n.

📁 File structure
pgsql
Copy
Edit
.
├── credentials/
│ └── NavInvoiceApi.credentials.ts
├── nodes/
│ └── navInvoiceQuery.node.ts
├── icons/
│ └── nav-logo.svg
├── package.json
├── tsconfig.json
└── README.md
🛠️ Build script (recommended)
Add this to package.json to copy the icon file:

json
Copy
Edit
"scripts": {
"build": "tsc && copyfiles -u 1 icons/* dist/icons"
}
Then:

bash
Copy
Edit
npm install --save-dev copyfiles
🐞 Troubleshooting
If the icon doesn't appear: make sure icons/nav-logo.svg is actually copied to the dist/ directory

Compile error with the icon field? Use it like this:

ts
Copy
Edit
icon = 'file:icons/nav-logo.svg';
🔐 Developer Note
The ICredentialType interface icon field may vary depending on the n8n version. For the best compatibility, use it as a string: 'file:icons/nav-logo.svg'

👤 Author
cityba – developer problem solver

If you liked it or found it useful, ⭐️ the repo!

📜 License
MIT

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


git clone https://github.com/cityba/n8n-nav-szamlalekerdezo
cd n8n-nav-szamlalekerdezo
Telepítsd az n8n custom node-ot:

Másold a dist mappa tartalmát az n8n custom node könyvtárába:

cp -r dist ~/.n8n/custom/
Vagy Docker esetén használd a saját buildelt csomagot.

🧑‍💻 Használat
🎛️ Paraméterezés
A node egy string típusú paramétert vár inputként, ami egy JSON formátumú lekérdezés:


{
  "datumTol": "2025-03-01",
  "datumIg": "2025-04-01",
  "tipus": "inbound",           // vagy "outbound"
  "reszletesseg": "reszletes",  // vagy "fejlec"
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

NAV Számla Lekérdező node → megadod az inputot expressionként: {{ $json }}

Kimenet megy Spreadsheet File, Postgres, stb. node felé

🧾 Kimenet
A NAV API válasza teljes JSON formátumban visszaadódik, amit az n8n feldolgoz.

📁 Fájlstruktúra a repóban

dist/
icons/
package.json
README.md
tsconfig.json
.gitignore
🐞 Hibakeresés
Ha nem jelenik meg az ikon: győződj meg róla, hogy icons/nav-logo.svg tényleg benne van a repóban és az ikonfájl másolódik a dist/icons könyvtárba.

Fordítási hiba az icon mezőnél? Használd így:


icon = 'file:icons/nav-logo.svg';
👤 Szerző
cityba – fejlesztő problémamegoldó

Ha tetszett vagy hasznos volt, ⭐️-zd a repót!

📜 Licenc
Ez a projekt szigorúan nem kereskedelmi célokra használható. Tilos a kód eladása, módosítása, újrahasznosítása.

A kód forrása és működése kizárólag személyes, oktatási vagy demonstrációs célokra használható.

Bármilyen más felhasználás vagy terjesztés kizárt, kivéve a szerző írásos engedélyét.
 

# NAV Invoice Query – n8n custom node 🇭🇺

A custom `n8n` node for querying the NAV Online Invoice system (`inbound` / `outbound` invoices in detail or with headers).

---

## 🧰 Functions

- NAV API access from n8n
- Input: parameterizable JSON (period, direction, detail, tax number)
- Output: JSON, which can be exported to Excel, SQL, etc. formats
- Built-in authentication data management
- Custom icon support (`icons/nav-logo.svg`)

---

## 📦 Installation

1. Clone the repo:

git clone https://github.com/cityba/n8n-nav-szamlalekerdezo
cd n8n-nav-szamlalekerdezo
Install the n8n custom node:

Copy the contents of the dist folder to the n8n custom node directory:

cp -r dist ~/.n8n/custom/
Or use your own built package for Docker.

🧑‍💻 Usage
🎛️ Parameterization
The node expects a string type parameter as input, which is a JSON format query:

{
"datumTol": "2025-03-01",
"datumIg": "2025-04-01",
"type": "inbound", // or "outbound"
"detail": "detail", // or "header"
"amount": "12345678"
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

NAV Invoice Query node → specify the input as an expression: {{ $json }}

Output goes to Spreadsheet File, Postgres, etc. to node

🧾 Output
The NAV API response is returned in full JSON format, which is processed by n8n.

📁 File structure in the repo

dist/
icons/
package.json
README.md
tsconfig.json
.gitignore
🐞 Troubleshooting
If the icon doesn't appear: make sure that icons/nav-logo.svg is actually in the repo and the icon file is copied to the dist/icons directory.

Translation error with the icon field? Use it like this:

icon = 'file:icons/nav-logo.svg';
👤 Author
cityba – developer troubleshooter

If you liked it or found it useful, ⭐️-zd the repo!

📜 License
This project is strictly for non-commercial use. Selling, modifying, or reusing the code is prohibited.

The source and functionality of the code can only be used for personal, educational, or demonstration purposes.

Any other use or distribution is prohibited except with the written permission of the author.

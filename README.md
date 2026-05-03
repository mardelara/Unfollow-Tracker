# 📸 Unfollow Tracker

> Drop your Instagram export and instantly find out who doesn't follow you back — no third-party apps, no login, everything runs on your machine.

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.1-black?logo=flask)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-3-88CE02?logo=greensock&logoColor=black)

---

## How it works

Drop your Instagram export (`.zip` or individual JSON files) onto the animated character. The app compares your followers and following sets using Python sets and returns the exact list of accounts that don't follow you back. **Nothing ever leaves your machine.**

---

## Requirements

| Tool | Minimum version |
|---|---|
| Python | 3.10 |
| Node.js | 18 |
| npm | 9 |

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/mardelara/Unfollow-Tracker.git
cd Unfollow-Tracker
```

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

The server starts at `http://localhost:5000`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## How to get your Instagram export

1. Go to **Instagram → Settings → Your activity → Download your information**
2. Select **JSON format** and request the download
3. You'll receive an email with a `.zip` file (may take a few minutes to a few hours)

The app supports **two ways** to upload your data:

### Option A — Drop the full ZIP *(recommended)*
Just drag and drop the `.zip` file Instagram sent you directly onto the app. No need to open or unzip anything.

### Option B — Drop the individual JSON files
Unzip the export and drag both files at once from `connections/followers_and_following/`:
- `followers_1.json` (or `followers_2.json`, etc. if your account has many followers)
- `following.json`

---

## Usage

1. With both servers running, open `http://localhost:5173`
2. Drag your `.zip` export (or both JSON files) onto the character
3. Wait for it to finish chewing your data 🐾
4. Browse the results — each username links directly to their Instagram profile

---

## ⚠️ About the results

The list shows accounts you follow that **did not appear in your followers export at the time of the download**. Keep the following in mind:

- **Deactivated accounts** may appear in the results. If you go to their profile and get a "User not found" message, their account is likely temporarily or permanently deactivated — Instagram won't let you unfollow them until they reactivate.
- **Deleted accounts** starting with `__deleted__` are automatically filtered out by the app.
- **Private accounts** that haven't accepted your follow request will also appear here.
- The data reflects the moment you requested your Instagram export, not real-time.

---

## Project structure

```
Unfollow-Tracker/
├── backend/
│   ├── main.py          # Flask API (/upload and /upload-zip endpoints)
│   ├── processor.py     # ZIP parsing + set comparison logic
│   ├── requirements.txt
│   └── venv/            # (not included in git)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                        # Main app + drag & drop logic
│   │   └── components/
│   │       ├── AnimatedCharacter.jsx      # Pixel-art Tamagotchi pet
│   │       ├── ResultsList.jsx            # Searchable results list
│   │       └── Shuffle.jsx               # GSAP letter-shuffle title animation
│   ├── package.json
│   └── vite.config.js
│
└── docs/
```

---

## Supported export formats

The parser automatically detects your file format. All known Instagram export variants are supported:

| Format | Structure |
|---|---|
| New (2024+) | `{"relationships_following": [{"title": "user", "string_list_data": [...]}]}` |
| Classic | `{"relationships_followers": [{"string_list_data": [{"value": "user"}]}]}` |
| Direct list | `[{"string_list_data": [{"value": "user"}]}]` |

Accounts starting with `__deleted__` are automatically excluded from results.

For large accounts, Instagram splits followers across multiple files (`followers_1.json`, `followers_2.json`, etc.). When uploading a ZIP, **all files are merged automatically** into a single comparison set.

---

## API

### `POST /upload`
Classic flow — accepts both JSON files via `multipart/form-data`.

| Field | Type | Description |
|---|---|---|
| `followers` | File | `followers.json` or `followers_1.json` |
| `following` | File | `following.json` |

### `POST /upload-zip`
New flow — accepts the full Instagram export ZIP.

| Field | Type | Description |
|---|---|---|
| `zip` | File | The `.zip` file downloaded from Instagram |

**Success response `200` (both endpoints):**
```json
{
  "followers_count": 312,
  "following_count": 401,
  "non_followers_count": 89,
  "non_followers": ["username1", "username2", "..."],
  "followers_files_merged": 2
}
```

`followers_files_merged` indicates how many `followers_*.json` files were combined (always `1` for the two-file flow).

### `GET /health`
```json
{ "status": "ok" }
```

---

## Privacy

- ✅ **Files are never stored** — processed in memory and discarded immediately
- ✅ **Everything runs locally** — no data leaves your machine
- ✅ **No login required** — works entirely with your exported data
- ✅ **Open source** — you can audit every line of code

---

## Tech stack

- **Backend:** Python · Flask · Flask-CORS · zipfile (stdlib)
- **Frontend:** React 19 · Vite 8 · Tailwind CSS v4 · Framer Motion · GSAP
- **Animation:** Pixel-art Tamagotchi character with eating/spitting states
- **Title:** GSAP SplitText letter-shuffle with Press Start 2P font

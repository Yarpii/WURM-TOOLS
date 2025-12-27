# WurmCalc

A crafting calculator for [WURM Online](https://www.wurmonline.com/) built with Next.js, TypeScript, and SQLite.

## Features

- **Material Calculator** - Calculate total base materials needed for any craftable item
- **Crafting Tree** - Visual breakdown of the complete crafting hierarchy
- **Reverse Lookup** - Find out what items you can craft with a specific material
- **Admin Panel** - Manage items and recipes with full CRUD operations
- **Data Management** - Import/export data as JSON for backup and sharing
- **Autocomplete Search** - Quick item search with keyboard navigation
- **Dark Theme** - Easy on the eyes with a custom dark color scheme

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **better-sqlite3** - Fast SQLite database
- **Tailwind CSS v4** - Utility-first styling

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main calculator page
│   ├── admin/page.tsx        # Admin panel
│   ├── data/page.tsx         # Data import/export
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   └── api/
│       ├── items/            # Items CRUD API
│       ├── calculate/        # Calculate materials API
│       ├── reverse/          # Reverse lookup API
│       ├── admin/recipes/    # Recipes CRUD API
│       └── data/             # Import/export API
└── lib/
    ├── database.ts           # SQLite database layer
    └── types.ts              # TypeScript interfaces
```

## Usage

### Calculator Mode

1. Search for an item using the autocomplete
2. Set the quantity you want to craft
3. View the total base materials and crafting tree

### Reverse Lookup Mode

1. Switch to "Reverse Lookup" mode
2. Search for a material
3. See all items that can be crafted using that material
4. Toggle "Include indirect uses" for full dependency tree

### Admin Panel

- Add, edit, and delete items
- Manage recipe ingredients with quantity
- Automatic circular dependency detection

### Data Management

- Export all data as JSON backup
- Import data from JSON files
- Clear all data (with confirmation)

## License

MIT

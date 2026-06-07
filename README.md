# SapuJagat Finance Tracker 🎯

SapuJagat Finance Tracker is a premium, client-side personal finance dashboard designed to streamline expense management and budget tracking. Boasting a modern, glassmorphic UI, fluid micro-animations, and hand-built reactive SVG visualizations, it helps users monitor their financial health with elegance and precision.

---

## ✨ Key Features

- **Intuitive Personal Dashboard (Beranda)**: Track overall balance, income, expenses, and net savings over 7-day or 30-day windows.
- **Smart Natural Language Input (NLP)**: Quickly record transactions by typing in casual Indonesian sentences (e.g., *"beli kopi 25rb tadi pagi"* or *"gaji bulanan 8.5 juta kemarin"*).
- **Interactive SVG Charts**:
  - **Balance Chart**: A beautiful area line graph showing your balance trend over time, complete with hover tooltips displaying date-specific balances.
  - **Cashflow Chart**: A visual comparison of income vs. expenses grouped by intervals.
  - **Expense Donut Chart**: A breakdown of category composition featuring live center-label focus on hover.
- **Limit Budget Engine**: Establish monthly limits for expense categories. Progress bars visually warn users (changing to a vibrant red gradient) when they exceed their limits (*Over Budget*).
- **Consolidated CRUD Operations**: Add, edit, or delete transactions on a dedicated Transactions tab, and manage categories in a clean, unified view.
- **Theme & Aesthetic Tweaker**: Personalize your workspace on-the-fly! Switch between dark/light mode, modify theme font families (Sora, Jakarta, Nunito, Bricolage), adjust corner roundness scales, and select your signature accent color.

---

## 🛠️ Technologies Used

- **Core & Logic**: HTML5, Vanilla CSS3 (Custom design tokens, glassmorphism UI, transitions), JavaScript (ES6+)
- **Libraries & Rendering**:
  - [React (v18.3.1)](https://react.dev/) - UI library for reactive component state management.
  - [ReactDOM (v18.3.1)](https://react.dev/reference/react-dom) - Virtual DOM rendering engine.
  - [Babel Standalone (v7.29.0)](https://babeljs.io/) - Browser-side compilation for JSX and ES6+ modules.
- **Iconography & Fonts**: Google Fonts (*Plus Jakarta Sans*, *Sora*, *Nunito*, *Bricolage Grotesque*), Native Emojis.

---

## 🚀 Getting Started & Setup

Since this application is fully serverless and runs on client-side React compiled on-the-fly in the browser, setting it up is extremely simple. 

> [!IMPORTANT]
> Because Babel Standalone loads modular JSX scripts dynamically, modern browsers block these requests under the **CORS (Cross-Origin Resource Sharing)** security policy when opened directly as a file (`file://` protocol). Therefore, **you must serve the project using a local HTTP server** instead of double-clicking the HTML file.

### Step-by-Step Launch

#### Option A: Using Node.js (Recommended)
If you have Node.js installed on your machine:
1. Open your terminal in the project directory.
2. Spin up a quick local web server using `npx`:
   ```bash
   npx serve .
   ```
3. Open your browser and navigate to the address shown (usually `http://localhost:3000` or `http://localhost:5000`).

#### Option B: VS Code Live Server Extension
If you are using Visual Studio Code:
1. Install the **Live Server** extension from the marketplace.
2. Right-click on `Finance Tracker.html` in the explorer panel.
3. Click **Open with Live Server**.

#### Option C: Python Simple HTTP Server
If you have Python installed:
1. Open your terminal in the project directory.
2. Run:
   ```bash
   python -m http.server 8000
   ```
3. Open your browser and go to `http://localhost:8000/Finance%20Tracker.html`.

---

## 📂 File Architecture

- **`Finance Tracker.html`**: The main page layout containing the stylesheet, external scripts, and application mount point.
- **`app.jsx`**: Manages top-level state, router navigation, tweaks wiring, and screen-specific views (Beranda, Transactions, Budget, Insights).
- **`components.jsx`**: Houses modular structural building blocks (Sidebar, Header, StatCards, Transaction List rows, NLP input box).
- **`charts.jsx`**: Fully customized, reactive SVG charting components (Area charts, Bar graphs, and Donut compositions).
- **`crud.jsx`**: Contains action modals and manager forms for transaction entries and category definitions.
- **`data.jsx`**: Seeds standard initial transactions/categories, formats currency representations, and manages NLP text parsing logic.
- **`tweaks-panel.jsx`**: Controls the style and configuration system for personalizing the aesthetic options on-the-fly.

# ⚽ FootballLab

![FootballLab Banner](docs/screenshots/%E2%80%8F%E2%80%8F%D7%A6%D7%99%D7%9C%D7%95%D7%9D%20%D7%9E%D7%A1%D7%9A%20%282%29.png)

> **The Ultimate Football Simulation Engine.**
> Manage teams, simulate seasons, track stats, and witness the evolution of the football world.

---

## 📖 Overview

**FootballLab** is a full-stack web application that brings the excitement of football management to your browser. It simulates entire seasons across major European leagues, tracks granular player statistics, and allows for deep analysis through head-to-head comparisons and historical data.

Whether you're analyzing the next top scorer or watching a young prodigy evolve into a legend, FootballLab provides the data and the tools to see it happen.

---

## ✨ Key Features

*   **🏟️ Advanced Simulation Engine**: Real-time match simulation across 5 major leagues (Premier League, La Liga, Bundesliga, Serie A, Ligue 1).
*   **🏆 Champions League**: Fully integrated European competition with group stages and knockout rounds.
*   **📊 Deep Analytics**:
    *   **Head-to-Head**: Compare any two players side-by-side (Goals, Assists, xG, Key Passes).
    *   **Leaderboards**: Top Scorers, Assists, Clean Sheets, Yellow/Red Cards.
*   **📈 Player Evolution**: Dynamic growth system where players improve or decline based on age, performance, and potential.
*   **📅 Seasonal Progression**: Automatic transition between seasons, including historical archiving and summer transfer windows.

---

## 🛠️ Tech Stack

### **Backend** (NestJS)
![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)

*   **Framework**: [NestJS](https://nestjs.com/) - Scalable Node.js framework.
*   **Database**: MongoDB with Mongoose ODM.
*   **Scheduler**: `@nestjs/schedule` for match simulations.

### **Frontend** (React + Vite)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

*   **Core**: React v19.
*   **Styling**: TailwindCSS for modern, responsive design.
*   **State & Fetching**: Axios & Context API.

---

## 🚀 Getting Started

You can run FootballLab in two ways: using **Docker** (recommended) or **Manually**.

### 🐳 Option A: Docker (Recommended)

Run the entire stack (Backend, Frontend, Database) with a single command.

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Itay4210/FootballLab.git
    cd FootballLab
    ```

2.  **Launch the App**
    ```bash
    docker-compose up --build
    ```

3.  **Explore**
    *   💻 **Frontend**: [http://localhost:8080](http://localhost:8080)
    *   ⚙️ **Backend API**: [http://localhost:3000](http://localhost:3000)

---

### 📦 Option B: Manual Installation (For Developers)

**Prerequisites:** Node.js (LTS), MongoDB (running locally on port `27017`).

1.  **Clone & Install Backend**
    ```bash
    git clone https://github.com/Itay4210/FootballLab.git
    cd FootballLab/backend
    npm install
    ```

2.  **Configure Environment**
    Create a `.env` file in `backend/`:
    ```env
    MONGODB_URI=mongodb://127.0.0.1:27017/footballab
    PORT=3000
    ```

3.  **Start Backend**
    ```bash
    npm run start:dev
    ```

4.  **Install & Start Frontend**
    Open a new terminal:
    ```bash
    cd ../frontend
    npm install
    npm run dev
    ```
    *Frontend will be available at `http://localhost:5173`.*

---

## 🖼️ Gallery

| **Player Comparison** | **Season Stats** |
|:---:|:---:|
| ![Comparison](docs/screenshots/%E2%80%8F%E2%80%8F%D7%A6%D7%99%D7%9C%D7%95%D7%9D%20%D7%9E%D7%A1%D7%9A%20%283%29.png) | ![Stats](docs/screenshots/%E2%80%8F%E2%80%8F%D7%A6%D7%99%D7%9C%D7%95%D7%9D%20%D7%9E%D7%A1%D7%9A%20%284%29.png) |

---

## 📂 Project Structure

```bash
FootballLab/
├── backend/            # NestJS API application
│   ├── src/
│   │   ├── modules/    # Domain modules (Leagues, Matches, Players, etc.)
│   │   ├── schemas/    # Mongoose models & schemas
│   │   └── common/     # Shared utilities & constants
│   ├── Dockerfile      # Backend container config
│   └── ...
├── frontend/           # React application
│   ├── src/
│   │   ├── components/ # Reusable UI blocks
│   │   ├── pages/      # Route components (Dashboard, Profile, etc.)
│   │   └── services/   # API integration logic
│   ├── Dockerfile      # Frontend container config
│   └── ...
├── docker-compose.yml  # Orchestration file
└── README.md
```

---

## 👤 Author

**Itay4210**
*   GitHub: [@Itay4210](https://github.com/Itay4210)

---

*Private Project - All Rights Reserved*

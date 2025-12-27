# FootbalLab

FootbalLab is a comprehensive football simulation and management platform. It allows users to simulate football seasons, track league standings, manage teams and players, and experience the evolution of a football world over time.

![League Table](docs/screenshots/league-table.png)
*Live League Standings across multiple European leagues*

## 🚀 Features

*   **Advanced Simulation Engine**: Automatically simulates matchdays, handling multiple leagues simultaneously (Premier League, La Liga, Bundesliga, Serie A, Ligue 1).
*   **Champions League Integration**: Supports both domestic leagues and European competitions with knockout logic.
*   **Head-to-Head Comparison**: Compare any two players side-by-side to analyze their performance (Goals, Assists, Key Passes, and more).
*   **Detailed Statistics Dashboard**: Track Top Scorers, Top Assisters, Clean Sheets, Cards, Tackles, and Key Passes.
*   **Season Evolution**: Teams and players evolve over seasons. Stats are tracked, archived, and reset for new seasons seamlessly.
*   **Summer Reports**: Get detailed summaries of season transitions and player growth.

## 🖼️ Screenshots

| Player Comparison | Season Stats |
|:-----------------:|:------------:|
| ![Comparison](docs/screenshots/comparison.png) | ![Stats](docs/screenshots/stats.png) |
| *Compare players head-to-head* | *Detailed season statistics* |

## 🛠️ Tech Stack

### Backend
*   **Framework**: [NestJS](https://nestjs.com/)
*   **Language**: TypeScript
*   **Database**: [MongoDB](https://www.mongodb.com/) with Mongoose
*   **Configuration**: `@nestjs/config` for environment management
*   **Scheduling**: `@nestjs/schedule` for automated match simulation

### Frontend
*   **Library**: [React](https://react.dev/) (v19)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Styling**: TailwindCSS
*   **HTTP Client**: Axios

## 📋 Prerequisites

Before running the project, ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (LTS version recommended)
*   [MongoDB](https://www.mongodb.com/try/download/community) (Running locally on default port `27017`)

## 📦 Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Itay4210/FootbalLab.git
    cd FootbalLab
    ```

2.  **Install Backend Dependencies**
    ```bash
    cd backend
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the `backend` directory based on the example below:
    ```bash
    # backend/.env
    MONGODB_URI=mongodb://127.0.0.1:27017/footballab
    PORT=3000
    ```

4.  **Install Frontend Dependencies**
    ```bash
    cd ../frontend
    npm install
    ```

## 🚀 Running the Application

### Start the Database
Ensure your MongoDB instance is running.
```bash
# If using local MongoDB service
net start MongoDB
# OR docker
docker run -d -p 27017:27017 mongo
```

### Start the Backend
Open a terminal in the `backend` directory:
```bash
cd backend
npm run start:dev
```
The backend server will start on `http://localhost:3000`.

### Start the Frontend
Open a new terminal in the `frontend` directory:
```bash
cd frontend
npm run dev
```
The frontend application will typically be available at `http://localhost:5173`.

## 📂 Project Structure

```
FootbalLab/
├── backend/            # NestJS API application
│   ├── src/
│   │   ├── modules/    # Feature modules (Leagues, Matches, Players, etc.)
│   │   ├── schemas/    # Database schemas
│   │   └── ...
│   ├── .env            # Environment variables (create this file)
│   └── ...
├── frontend/           # React + Vite application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Application pages (Comparison, Dashboard, Profiles)
│   │   └── ...
│   └── ...
└── ...
```

## 🤝 Contributing

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 👤 Author

**Itay4210**
*   GitHub: [@Itay4210](https://github.com/Itay4210)

## 📄 License

This project is private and unlicensed.

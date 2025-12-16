# SmartLearn AI 🎓

**SmartLearn AI** is a modern, AI-powered educational platform designed to revolutionize how students prepare for exams. It features a comprehensive dashboard with tools for exam checking, study planning, adaptive quizzing, and performance analytics.


## 🚀 Features

- **🏠 Landing Page**: A high-converting, modern landing page with a hero section and feature highlights.
- **📊 Student Dashboard**: A central hub showing syllabus progress, recent scores, and quick actions.
- **📝 AI Exam Checker**: Upload answer sheets (PDF/Image) for instant AI grading, feedback, and improvement tips.
- **📅 Smart Study Planner**: An interactive timeline view to manage study schedules and track daily goals.
- **🧠 Adaptive Quiz**: A dynamic quiz engine that adjusts difficulty (Easy/Medium/Hard) based on your performance.
- **💬 AI Doubt Solver**: A real-time chat interface to ask questions and get instant AI explanations.
- **📈 Performance Analytics**: Visual insights into your strengths, weaknesses, and study habits using interactive charts.

## 🛠️ Tech Stack

- **Framework**: [React](https://react.dev/) (v19) with [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Routing**: [React Router DOM](https://reactrouter.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Utilities**: `clsx`, `tailwind-merge`

## 📦 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/smartlearn-ai.git
    cd smartlearn-ai
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the development server**
    ```bash
    npm run dev
    ```
    The app will run at `http://localhost:5173`.

4.  **Build for production**
    ```bash
    npm run build
    ```

## 📂 Project Structure

```
├── frontend/           # React frontend application
│   ├── src/
│   ├── public/
│   └── vite.config.ts
├── backend/            # FastAPI backend application
│   ├── api/
│   ├── main.py
│   ├── models.py
│   └── requirements.txt
└── README.md
```

## 📦 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/smartlearn-ai.git
    cd smartlearn-ai
    ```

2.  **Backend Setup**
    ```bash
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload
    ```
    The backend will run at `http://localhost:8000`.

3.  **Frontend Setup**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    The app will run at `http://localhost:5173`.

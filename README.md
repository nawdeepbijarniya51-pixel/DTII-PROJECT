# 🛣️ PotholeGuard AI

**AI-Powered Pothole Detection, Segmentation & Road Safety Intelligence Platform**

Real-time pothole detection and segmentation in **images, videos, and live camera** using **YOLO Ultralytics**. Building smarter and safer roads for India.

---

## 📖 About The Project

PotholeGuard AI is an intelligent computer vision system designed to automatically **detect and segment potholes** on Indian roads. Developed as a **DTII Project**, it aims to reduce road accidents by helping drivers avoid dangerous potholes and assisting authorities in efficient road maintenance.

The system currently supports:
- High-accuracy pothole **detection + instance segmentation** using YOLO Ultralytics
- Works seamlessly on **single images**, **pre-recorded videos**, and **live webcam feed**
- Clean, modern and fully responsive web interface

---

## 🚀 Future Vision (Startup Roadmap)

We are evolving this project into a full-fledged **startup** with the following advanced features:

- **Pothole Volume & Depth Estimation** (to automatically calculate repair cost)
- **Smart Map Integration**  
  → User clicks any location on map → System scans **2 km radius** around it
- **Google Street View Analysis**  
  → Automatically runs our trained model on Street View images to detect potholes
- **Risk Visualization** on map using **size-based red dots** so people can easily avoid risky roads
- Drone-based large-scale road inspection support
- Mobile App for drivers

---

## 💰 Business & Monetization Strategy

We plan to monetize PotholeGuard AI through multiple revenue streams:

1. **B2B Road Inspection Service**  
   Road contractors, PWD departments, Municipal Corporations, and Smart City projects can use our AI + Drone solution for fast, accurate and cost-effective road inspection with approximate repair cost estimation. *(Premium paid service)*

2. **Anonymized User Mobility Data** (with explicit user consent)  
   Sell valuable location-based insights to businesses. For example, if a user frequently visits a bakery, relevant brands can show targeted offers.

3. **In-App & Website Advertising**  
   Display relevant ads on our web platform and future mobile application.

---

## 🛠 Tech Stack

- **AI/ML**: YOLO Ultralytics (Object Detection + Segmentation)
- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: Python
- **Testing**: Playwright, Vitest

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/nawdeepbijarniya51-pixel/DTII-PROJECT.git

# Navigate to project directory
cd DTII-PROJECT

# Install dependencies
npm install
# or
bun install

# Run the development server
npm run dev

📁 Project Structure
textDTII-PROJECT/
├── backend/          # Python scripts and YOLO model
├── src/              # React + TypeScript frontend source
├── public/           # Static assets
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── package.json
└── README.md

🤝 Contributing
Contributions, issues, and feature requests are welcome!
Feel free to check the issues page.
📄 License
This project is licensed under the MIT License.

👨‍💻 Author
Nawdeep Bijarniya
DTII Project → Building safer roads for India
Made with ❤️ for a pothole-free India

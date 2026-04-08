# Campus Lost & Found System

A full-stack web application that helps students report lost and found items on campus and automatically identify potential matches.

---

## 🚀 Live Backend

Backend is deployed on Render:

👉 https://lostandfound-app-y4r4.onrender.com/reports

---

## 🧠 Overview

This system allows users to:
- Report lost or found items
- View all reports in a dashboard
- Identify potential matches automatically
- Claim items

The application uses a static frontend and a REST API backend connected to a PostgreSQL database.

---
## 📸 Screenshots

### Dashboard
![Dashboard](https://github.com/user-attachments/assets/646100cf-98be-49ec-9c29-15f989ffc2dd)

### Report Item Form
![Report](https://github.com/user-attachments/assets/0f805fc9-f087-4a14-a70a-599daf0dc08b)

### Matches View
![Matches](https://github.com/user-attachments/assets/1502c101-1e45-491d-8e37-4d3793b126ee)

### Claim Item Form
![Claim](https://github.com/user-attachments/assets/afba72ad-17f5-4275-bdbc-43202337d585)

### Profile
![Profile](https://github.com/user-attachments/assets/3cd81a2a-e98f-4b28-b0b2-d5b2597977fa)



## ✨ Features

- Submit lost/found reports
- View reports in real-time dashboard
- Automatic matching based on:
  - Item name similarity
  - Location overlap
  - Category match
- Claim items
- Filter and search functionality
- Persistent data storage (PostgreSQL)

---

## 🛠 Tech Stack

**Frontend**
- HTML
- CSS
- JavaScript

**Backend**
- Node.js
- Express

**Database**
- PostgreSQL (Render)

---

## 🏗 Architecture
Frontend (Live Server / Browser)
↓
Backend API (Node.js + Express)
↓
PostgreSQL Database (Render)

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|--------|-------------|
| GET | /reports | Fetch all reports |
| POST | /reports | Create new report |
| PATCH | /reports/:id | Update report status |
| POST | /claims | Create claim |

---

## ⚙️ Running Locally

### 1. Clone repo

```bash
git clone https://github.com/AsishKunta/Lost-found-app.git
cd Lost-found-app

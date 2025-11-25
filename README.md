# Salon Appointment Scheduler

### 🔗 [Click Here to View Live Website](https://dilshu.github.io/booking)

A simple, frontend-only appointment booking system designed for salons. This project is built using **HTML, CSS, and JavaScript**, utilizing **Google Sheets** as a database to store booking details.

## Features
* Clean and responsive user interface.
* No server-side backend required (Serverless).
* Direct integration with Google Sheets for data storage.

## How to Setup & Use

If you want to copy and use this project for your own needs, please follow the steps below:

### 1. Download the Code
Clone or download this repository to your computer.

### 2. Google Sheets Setup (The Backend)
To make the booking form work, you need a Google Sheet to receive the data:
1.  Create a new **Google Sheet**.
2.  Add headers in the first row (e.g., `Name`, `Phone`, `Date`, `Time`, `Service`).
3.  Go to **Extensions** > **Apps Script**.
4.  Paste the required Google Apps Script code (the script that handles `doPost`).
5.  Click on **Deploy** > **New Deployment**.
6.  Select type as **Web App**.
7.  **Important:** Set 'Who has access' to **"Anyone"**.
8.  Copy the generated **Web App URL**.

### 3. Configuration
1.  Open the JavaScript file in this project (usually `script.js` or inside `index.html`).
2.  Locate the line where the script URL is defined. It usually looks like:
    ```javascript
    const scriptURL = 'YOUR_GOOGLE_SCRIPT_URL_HERE';
    ```
3.  Replace `'YOUR_GOOGLE_SCRIPT_URL_HERE'` with the Web App URL you copied in the previous step.
4.  Save the file.

Now, the appointment form will automatically save bookings to your Google Sheet!

---
*Created by Dilshad.*

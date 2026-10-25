# MindNest AI 🧠✨

A beginner-friendly AI study companion with a chat interface, college-note generator, step-by-step explanations, practice quizzes, and uploads for images, PDFs, text files, and Markdown files.

## Features

- Ask questions and get AI-powered answers.
- Create structured college notes from a topic or uploaded material.
- Explain a topic step by step or generate practice quizzes.
- Upload PNG, JPG/JPEG, WEBP, GIF, PDF, TXT, and Markdown files (maximum 10 MB per file).
- Analyze images using a vision-capable OpenAI model.
- Responsive dark interface for phones and computers.
- API key stays on the server; it is not placed in browser code.
- Basic security headers, request rate limiting, upload limits, and health check.

## Before you start

You need an OpenAI API key. ChatGPT subscriptions and OpenAI API billing are separate. Check your API billing/usage limits before using the app. Never put your API key in a public GitHub repository.

## Run it on your Windows computer

1. Install Node.js (LTS) from <https://nodejs.org/>. After installing, close and reopen Command Prompt.
2. Download this project ZIP and extract it. Open the extracted `mindnest-ai` folder.
3. In that folder, copy `.env.example` and rename the copy to `.env` (make sure Windows has not named it `.env.txt`).
4. Open `.env` in Notepad. Replace `put_your_api_key_here` with your real OpenAI API key. Save the file. Do not share or upload `.env`.
5. Open Command Prompt in the project folder. Tip: in File Explorer, open the folder, click the address bar, type `cmd`, and press Enter.
6. Run these commands one at a time:

   ```bash
   npm install
   npm start
   ```

7. When the terminal says MindNest AI is running, open <http://localhost:3000> in your browser.
8. Keep the terminal open while using the local app. Press `Ctrl+C` in the terminal to stop it.

## Upload the project to GitHub

1. Sign in to <https://github.com/> and create a new repository, for example `mindnest-ai`.
2. Extract the ZIP first. Upload the **contents** of the `mindnest-ai` folder, not the ZIP itself, using **Add file → Upload files**.
3. Confirm `.env` is not uploaded. `.gitignore` is included to help keep it out of Git when using Git locally. If you accidentally publish a key, revoke it immediately and create a new one.
4. Commit the files to the repository.

## Put it online with Render

The repository includes `render.yaml` for a Render Blueprint deployment. You can also deploy manually:

1. Push the project to your GitHub repository.
2. Go to <https://render.com/> and create a **New → Web Service** connected to your repository.
3. Use **Build Command** `npm install` and **Start Command** `npm start`.
4. In Environment Variables, add `OPENAI_API_KEY` with your secret key and `OPENAI_MODEL` with `gpt-4.1-mini`.
5. Deploy and wait for the build to finish. Open the public URL Render gives you.

A free hosting plan may sleep when idle, so the first visit after inactivity can take a little longer. API usage may cost money even if hosting is free.

## Supported uploads and limitations

- Images: PNG, JPG/JPEG, WEBP, GIF.
- Documents: PDF with selectable text, TXT, Markdown.
- Scanned PDFs may not work because this starter version does not include OCR. Upload screenshots of pages as images instead.
- DOCX, Excel, audio, video, account sign-in, chat history storage, and payments are not included in this starter version.
- Uploaded files are processed in memory for the request and are not saved as a file library. Do not upload confidential or sensitive documents.
- This is a starter project, not a fully audited production service. Before a public launch, consider user accounts, usage limits per user, privacy terms, stronger abuse prevention, monitoring, and a database if you want saved chats.

## Configuration

- `OPENAI_API_KEY` — required secret API key.
- `OPENAI_MODEL` — optional model name; defaults to `gpt-4.1-mini`.
- `PORT` — optional local port; defaults to `3000`. Hosting platforms usually set this automatically.

## Troubleshooting

- **“Add your API key” message:** check the `.env` file spelling and key value, then restart `npm start`.
- **401 / invalid key:** create a valid key in the OpenAI platform and update the environment variable.
- **429 / quota:** check API billing and usage limits in the OpenAI platform.
- **`node` is not recognized:** install Node.js LTS, then close and reopen Command Prompt.
- **PDF has no extracted text:** it may be scanned. Try uploading page images.

## Project structure

```text
mindnest-ai/
├── public/
│   ├── app.js
│   ├── index.html
│   ├── logo.svg
│   └── styles.css
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── render.yaml
└── server.js
```

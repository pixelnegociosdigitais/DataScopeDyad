<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/temp/4

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the API keys in [.env.local](.env.local):
   - `GEMINI_API_KEY` - Your Gemini API key
   - `REACT_APP_PERPLEXITY_API_KEY` - Your Perplexity API key
3. Run the app:
   `npm run dev`

## API Configuration

This app uses two AI services:

- **Gemini**: For general AI functionality
- **Perplexity**: For enhanced search and analysis capabilities

Make sure to obtain API keys from both services and add them to your `.env.local` file.

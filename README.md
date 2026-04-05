# COMP3122_GP_Group5

## Project Setup

Run the app from the `dse_app` folder:

```bash
cd /workspaces/COMP3122_GP_Group5/dse_app
npm install
npm run dev
```

Open: `http://localhost:3000`

### Environment Variables

Create `dse_app/.env` (or copy from `.env.example`) with:

- `GITHUB_MODEL_API_KEY_gpt5` (required): used by `/api/generate-math-question`.
- `NEXT_PUBLIC_XAI_API_KEY` (required for graph image generation): used when user clicks **Generate Graph**.
- `NEXT_PUBLIC_GITHUB_LLM_TOKEN` (required for practice questions page direct generation).

## DSE Math Question Generator

This feature lets users upload a math question image and generates:

- a similar new question
- the final answer
- step-by-step explanation
- math topic
- concept explanation
- graph metadata (`needsGraph`, `graphType`, `figureDescription`, `imagePrompt`)

When the generated question needs a graph/diagram illustration, the UI shows a **Generate Graph** button. The graph is generated only after user click (manual trigger).

### Function Flow

1. User uploads a question image (PNG/JPG/JPEG/WebP, max 5MB).
2. The system reads the question content from the image.
3. The system generates one similar question with similar difficulty.
4. The system provides:
   - generated question
   - answer
   - step-by-step solution
   - topic
   - concept explanation
5. Results are shown in a readable format with math expressions.

## How To Test The Generator

### A) UI Test (recommended)

1. Start app:

```bash
cd /workspaces/COMP3122_GP_Group5/dse_app
npm run dev
```

2. Open:

`http://localhost:3000/dse-math-generator`

3. Test with sample images:

- `dse_app/public/samples/testq1.png`
- `dse_app/public/samples/testq2.png`
- `dse_app/public/samples/testq3.png`

4. Click **Generate** and verify:

- generated question is shown
- answer section is shown
- explanation has multiple `Step N:` blocks with formulas
- topic and concept are shown

5. Verify behavior after another upload:

- upload one image, generate
- upload another image, ensure old output clears

### B) User Error Checks

1. Try clicking Generate without uploading an image.
Expected: the page asks user to upload an image first.

2. Try uploading an unsupported file type.
Expected: the page shows a validation message.

3. Try uploading an image larger than 5MB.
Expected: the page shows a size limit message.
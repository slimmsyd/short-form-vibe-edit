{
  "name": "{{projectName}}",
  "version": "1.0.0",
  "description": "Short-form vertical edit of {{sourceBasename}}",
  "type": "commonjs",
  "scripts": {
    "preview": "npx remotion preview src/index.tsx",
    "render": "node scripts/render.mjs"
  },
  "dependencies": {
    "remotion": "^4.0.0",
    "@remotion/cli": "^4.0.0",
    "@remotion/bundler": "^4.0.0",
    "@remotion/renderer": "^4.0.0",
    "@remotion/captions": "^4.0.0",
    "@remotion/google-fonts": "^4.0.0",
    "@remotion/shapes": "^4.0.0",
    "@remotion/transitions": "^4.0.0",
    "@remotion/paths": "^4.0.0",
    "@remotion/animation-utils": "^4.0.0",
    "@remotion/noise": "^4.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}

# RNNoise model — `mp.rnnn`

Used by the vet-captions web UI's **voice enhancement slider** (preview-only
denoise during caption verification — does NOT affect the final rendered mp4).

- **File:** `mp.rnnn` (~290 KB, ASCII weights)
- **Source:** [GregorR/rnnoise-models](https://github.com/GregorR/rnnoise-models)
- **Specific model:** `marathon-prescription-2018-08-29/mp.rnnn`
- **License:** BSD (matches upstream RNNoise)
- **Why this one:** Speech-tuned, well-tested with ffmpeg's `arnndn` filter,
  good general-purpose performance for spoken-word source clips.

## Refreshing

```sh
cd ~/.claude/skills/short-form-vibe-edit/assets/rnnoise
curl -fsSL -o mp.rnnn https://raw.githubusercontent.com/GregorR/rnnoise-models/master/marathon-prescription-2018-08-29/mp.rnnn
```

## How the skill uses it

`scripts/vet-captions.mjs` resolves this file at server startup. If it's
missing, the slider is hidden and the rest of the UI works normally.

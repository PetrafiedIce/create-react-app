# Create React App

This directory is a brief example of a [Create React App](https://github.com/facebook/create-react-app) site that can be deployed to Vercel with zero configuration.

## Deploy Your Own

Deploy your own Create React App project with Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel/examples/tree/main/framework-boilerplates/create-react-app&template=create-react-app)

_Live Example: https://create-react-template.vercel.app/_

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes. You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode. See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.

It correctly bundles React in production mode and optimizes the build for the best performance. The build is minified and the filenames include the hashes.

## Livestream + Embeddable Player

- Set your HLS playback URL in a `.env` file at the project root:
  - `REACT_APP_HLS_URL=https://your-cdn.example.com/live/index.m3u8`
- Start the app: `pnpm start` or build: `pnpm build`

### OBS Setup
- Service: Custom...
- Server: `rtmp://YOUR_INGEST/live`
- Stream key: `YOUR_KEY`
- Start streaming. Your backend should generate an HLS playback URL (`.m3u8`).

### Embedding
Use this iframe (replace YOUR_ENCODED_HLS_URL with `encodeURIComponent('https://...m3u8')`):

```html
<iframe
  src="https://your-domain.tld/#/embed?src=YOUR_ENCODED_HLS_URL&autoplay=1&muted=1"
  width="100%"
  height="100%"
  style="border:0; aspect-ratio:16/9;"
  allow="autoplay; fullscreen; picture-in-picture">
</iframe>
```

Optional query params: `controls=0|1`, `poster=https://...jpg`, `pip=0|1`.

If embedding cross-origin, ensure your hosting does not send `X-Frame-Options: DENY` and allows `Content-Security-Policy: frame-ancestors` per your needs.
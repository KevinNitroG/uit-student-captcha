/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  branches: ["main"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/npm",
      {
        npmPublish: false,
      },
    ],
    [
      "@semantic-release/exec",
      {
        prepareCmd: "pnpm run build",
      },
    ],
    [
      "@semantic-release/github",
      {
        assets: [
          {
            path: "dist/uit-student-captcha.user.js",
          },
        ],
      },
    ],
  ],
  preset: "conventionalcommits",
};

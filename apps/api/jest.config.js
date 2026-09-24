/** @type {import('jest').Config} */
module.exports = {
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/../tsconfig.json" }],
  },
  moduleFileExtensions: ["js", "json", "ts"],
  moduleNameMapper: {
    "^@ayinon/shared$": "<rootDir>/../../../packages/shared/src/index.ts",
  },
  testEnvironment: "node",
};

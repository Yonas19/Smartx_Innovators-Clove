/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  webpack: (config) => {
    // better-sqlite3 is a native module, don't bundle it
    config.externals.push("better-sqlite3");

    // On Windows, watchpack walks up the directory tree looking for
    // node_modules boundaries. If it reaches C:\ it tries to lstat
    // system files (pagefile.sys, hiberfil.sys, etc.) and throws
    // EINVAL. Force the watch context to the project cwd.
    if (config.watchOptions) {
      config.watchOptions.ignored = [
        "**/.next/**",
        "**/node_modules/**",
        // Windows system files at drive root
        "**/pagefile.sys",
        "**/hiberfil.sys",
        "**/swapfile.sys",
        "**/DumpStack.log.tmp",
        "**/System Volume Information/**",
      ];
    }

    return config;
  },
};

module.exports = nextConfig;
